/* ==========================================================================
   App shell — module registry, router, sidebar, command palette.

   Adding a module:
     1. create js/modules/your-module.js
     2. call App.register({ id, label, icon, group, order, route, render(el, params) })
     3. add a <script> line in index.html
   It appears in the sidebar, the router and the command palette automatically.
   Modules can be hidden without deleting code in Settings → Modules.
   ========================================================================== */
(function (A) {
  const U = A.util, UI = A.ui, S = A.store, esc = U.esc, ic = UI.icon;

  A.groups = [
    { id: "overview", label: "Overview" },
    { id: "people", label: "Students" },
    { id: "academics", label: "Academics" },
    { id: "campus", label: "Campus" },
    { id: "data", label: "Data" },
    { id: "system", label: "System" },
  ];
  A.modules = [];
  A.register = (m) => { A.modules.push(m); A.modules.sort((a, b) => (a.order || 0) - (b.order || 0)); };
  A.enabled = (m) => !(S.settings().disabledModules || []).includes(m.id) || m.required;
  /* Visible to the signed-in user: enabled in Settings and allowed by their role */
  A.allowed = (m) => m.id === "dashboard" || !A.auth || !A.auth.user() || (A.auth.can(m.permId || m.navParent || m.id) && (!m.flag || A.auth.flag(m.flag)));
  A.visible = (m) => A.enabled(m) && A.allowed(m);
  A.actionAllowed = (a) => !a.perm || !A.auth || (a.perm.includes(".") ? A.auth.can(...a.perm.split(".")) : A.auth.flag(a.perm));
  A.navigate = (path) => { const h = "#/" + String(path).replace(/^#?\/?/, ""); if (location.hash === h) A.refresh(); else location.hash = h; };

  /* Global actions any module can call (keeps modules decoupled) */
  A.actions = {};

  /* ---------- Router ---------- */
  function match(route, path) {
    const rp = route.split("/"), pp = path.split("/");
    if (rp.length !== pp.length) return null;
    const params = {};
    for (let i = 0; i < rp.length; i++) {
      if (rp[i].startsWith(":")) params[rp[i].slice(1)] = decodeURIComponent(pp[i]);
      else if (rp[i] !== pp[i]) return null;
    }
    return params;
  }
  function resolve() {
    const raw = location.hash.replace(/^#\/?/, "") || "dashboard";
    const [path, qs] = raw.split("?");
    const query = Object.fromEntries(new URLSearchParams(qs || ""));
    for (const m of A.modules) {
      if (!A.enabled(m)) continue;
      for (const r of [m.route, ...(m.routes || [])]) { const p = match(r, path); if (p) return { m, params: { ...p, query }, path, key: raw }; }
    }
    return { m: A.modules.find((x) => x.id === "dashboard"), params: { query: {} }, path: "dashboard", key: "dashboard" };
  }

  let current = null;
  function render(fromStore) {
    const r = resolve();
    const main = document.getElementById("main");
    const view = document.getElementById("view");
    const sameRoute = current && current.key === r.key;
    const scroll = main.scrollTop;
    if (current && current.m !== r.m && current.m.destroy) current.m.destroy();
    current = r;
    try {
      if (!A.allowed(r.m)) view.innerHTML = `<div class="page">${UI.empty("alert", "No access", "Your role doesn't include this area. Ask an admin if you need it.", `<a class="btn" href="#/dashboard">Back to dashboard</a>`)}</div>`;
      else r.m.render(view, r.params);
    }
    catch (e) { console.error(e); view.innerHTML = `<div class="page">${UI.empty("alert", "Something went wrong", e.message)}</div>`; }
    if (fromStore || sameRoute) { main.scrollTop = scroll; view.querySelector(".page") && (view.querySelector(".page").style.animation = "none"); }
    else main.scrollTop = 0;
    renderNav();
    document.querySelector(".shell").classList.remove("nav-open");
    const title = r.m.label ? `${r.m.label} · ` : "";
    document.title = title + (S.settings().orgName || "Branzone") + " Studio Office";
  }
  A.refresh = () => render(true);
  A.current = () => current;

  /* ---------- Shell ---------- */
  function shell() {
    const st = S.settings();
    const me = (A.auth && A.auth.user()) || { name: st.adminName || "Studio Office" };
    const meRole = A.auth && A.auth.role() ? A.auth.role().name : "Administrator";
    let collapsed = true; // nav starts collapsed; the choice is remembered per browser
    try { collapsed = localStorage.getItem("bz.nav") !== "open"; } catch (e) {}
    document.getElementById("app").innerHTML = `
      <div class="shell ${collapsed ? "collapsed" : ""}">
        <aside class="sidebar">
          <a class="brand" href="#/dashboard" title="Branzone Design School"><span class="brand-full"><img class="brand-logo" src="assets/branzone-logo.png" alt="Branzone Design School"><span class="brand-tag">Student Portal</span></span><svg class="brand-mark" viewBox="0 0 64 64" aria-hidden="true"><path d="M17 50 30 14h5L22 50z" fill="#FF5B22"/><path d="M35 14h5l12 36h-5z" fill="#fff"/></svg></a>
          <nav id="nav"></nav>
          <div class="sidebar-foot">
            <button class="collapse-btn" id="collapseBtn" data-tip="Expand menu">${ic("chevL", 16)}<span>Collapse menu</span></button>
            <button class="profile-chip" id="meBtn" title="Your account">${UI.avatar(me.name, 30)}<div class="grow"><div class="t1 truncate">${esc(me.name)}</div><div class="t2 truncate">${esc(meRole)}</div></div>${ic("more", 15)}</button>
          </div>
        </aside>
        <main class="main" id="main">
          <div class="topbar">
            <button class="icon-btn menu-btn" id="menuBtn" aria-label="Menu">${ic("menu", 18)}</button>
            <label class="search-trigger" id="searchBtn">${ic("search", 15)}<input id="topSearch" placeholder="Search students, pages, actions…" autocomplete="off"><span class="kbd">Ctrl K</span></label>
            <div class="spacer"></div>
            ${A.auth.isTest() ? `<span class="test-pill" title="You are exploring sample data. Nothing here touches the real studio.">Test account · sample data<button id="exitTest">Exit</button></span>` : ""}
            <button class="btn btn-sm hide-sm" data-act="markAttendance" data-perm="attendance.view">${ic("calendar", 14)}Attendance</button>
            <button class="btn btn-primary btn-sm" data-act="newStudent" data-perm="students.edit">${ic("plus", 14)}New student</button>
          </div>
          <div class="view" id="view"></div>
        </main>
      </div>`;
    const ts = document.getElementById("topSearch");
    ts.addEventListener("focus", () => { const v = ts.value; ts.value = ""; ts.blur(); openPalette(v); });
    ts.addEventListener("input", () => { const v = ts.value; ts.value = ""; ts.blur(); openPalette(v); });
    document.getElementById("menuBtn").onclick = () => (window.innerWidth <= 860 ? document.querySelector(".shell").classList.toggle("nav-open") : document.getElementById("collapseBtn").click());
    document.getElementById("collapseBtn").onclick = () => {
      const sh = document.querySelector(".shell"); const c = sh.classList.toggle("collapsed");
      try { localStorage.setItem("bz.nav", c ? "closed" : "open"); } catch (e) {}
      hideTip(); setTimeout(() => window.dispatchEvent(new Event("resize")), 260);
    };
    /* Tooltips for the collapsed icon rail */
    const sb = document.querySelector(".sidebar");
    sb.addEventListener("mouseover", (e) => {
      const it = e.target.closest(".nav-item, .collapse-btn"); if (!it || !document.querySelector(".shell.collapsed")) return hideTip();
      const label = it.dataset.tip || (it.querySelector("span") || {}).textContent; if (!label) return;
      let tip = document.querySelector(".nav-tip"); if (!tip) { tip = document.createElement("div"); tip.className = "nav-tip"; document.body.appendChild(tip); }
      const r = it.getBoundingClientRect(); tip.textContent = label; tip.style.left = r.right + 10 + "px"; tip.style.top = r.top + r.height / 2 - 15 + "px";
    });
    sb.addEventListener("mouseleave", hideTip);
    const ex = document.getElementById("exitTest"); if (ex) ex.onclick = () => A.auth.signOut();
    document.getElementById("meBtn").onclick = (e) => UI.menu(e.currentTarget, [
      ...(A.auth && A.auth.user() ? [{ label: "Change my password", icon: "sliders", onClick: () => A.team && A.team.changeOwnPassword() }] : []),
      ...(A.auth && A.auth.flag("team") ? [{ label: "Team & access", icon: "users", onClick: () => { A.settingsTab = "team"; A.navigate("settings"); } }] : []),
      "-",
      { label: "Sign out", icon: "logout", danger: true, onClick: () => A.auth.signOut() },
    ]);
  }
  function hideTip() { const t = document.querySelector(".nav-tip"); if (t) t.remove(); }

  function renderNav() {
    const nav = document.getElementById("nav"); if (!nav) return;
    const active = current && (current.m.navParent || current.m.id);
    nav.innerHTML = A.groups.map((g) => {
      const items = A.modules.filter((m) => m.group === g.id && m.nav !== false && A.visible(m));
      if (!items.length) return "";
      return `<div class="nav-group"><div class="nav-label">${esc(g.label)}</div>${items.map((m) => {
        const b = m.badge ? m.badge() : null;
        return `<a class="nav-item ${active === m.id ? "active" : ""}" href="#/${m.route}">${ic(m.icon, 17)}<span>${esc(m.label)}</span>${b ? `<span class="nav-badge ${b.hot ? "hot" : ""}">${b.n != null ? b.n : b}</span>` : ""}</a>`;
      }).join("")}</div>`;
    }).join("");
  }

  /* ---------- Command palette ---------- */
  function openPalette(initial) {
    if (document.querySelector(".palette")) return;
    let q = typeof initial === "string" ? initial : "", on = 0, items = [];
    const m = UI.modal({ title: "", body: "", noFocus: true });
    const box = m.el.querySelector(".modal");
    box.className = "palette";
    box.innerHTML = `<div class="palette-input">${ic("search", 18)}<input placeholder="Search students by name, ID or phone — or jump to a page"><span class="kbd">Esc</span></div><div class="palette-list"></div>`;
    const input = box.querySelector("input"), listEl = box.querySelector(".palette-list");
    const build = () => {
      const n = U.norm(q);
      const pages = A.modules.filter((x) => x.nav !== false && A.visible(x)).filter((x) => !n || U.norm(x.label).includes(n)).map((x) => ({ g: "Pages", icon: x.icon, label: x.label, run: () => A.navigate(x.route) }));
      const acts = Object.values(A.actions).filter((a) => a.label && A.actionAllowed(a) && (!n || U.norm(a.label).includes(n))).map((a) => ({ g: "Actions", icon: a.icon || "sparkle", label: a.label, run: a.run }));
      const studs = (A.auth && A.auth.user() && !A.auth.can("students")) ? [] : S.all("students").filter((s) => !n || U.norm(A.sel.name(s) + " " + s.code + " " + (s.phone || "").replace(/\D/g, "") + " " + (s.email || "")).includes(n)).slice(0, n ? 8 : 5)
        .map((s) => ({ g: "Students", avatar: A.sel.name(s), seed: s.id, label: A.sel.name(s), sub: `${s.code} · ${A.sel.courseLabel(A.sel.course(s))}`, run: () => A.navigate("students/" + s.id) }));
      items = n ? [...studs, ...pages, ...acts] : [...acts, ...pages, ...studs];
      on = Math.min(on, Math.max(0, items.length - 1));
      let last = "";
      listEl.innerHTML = items.length ? items.map((it, i) => {
        const head = it.g !== last ? `<div class="palette-group">${it.g}</div>` : ""; last = it.g;
        return head + `<div class="palette-item ${i === on ? "on" : ""}" data-i="${i}">${it.avatar ? UI.avatar(it.avatar, 26, it.seed) : ic(it.icon, 16)}<span>${esc(it.label)}</span>${it.sub ? `<span class="pi-sub">${esc(it.sub)}</span>` : ""}</div>`;
      }).join("") : `<div class="empty" style="padding:30px">No matches for “${esc(q)}”</div>`;
      const el = listEl.querySelector(".palette-item.on"); el && el.scrollIntoView({ block: "nearest" });
    };
    const run = (i) => { const it = items[i]; if (!it) return; m.close(); setTimeout(it.run, 30); };
    input.oninput = () => { q = input.value; on = 0; build(); };
    input.onkeydown = (e) => {
      if (e.key === "ArrowDown") { e.preventDefault(); on = Math.min(items.length - 1, on + 1); build(); }
      else if (e.key === "ArrowUp") { e.preventDefault(); on = Math.max(0, on - 1); build(); }
      else if (e.key === "Enter") { e.preventDefault(); run(on); }
    };
    listEl.onclick = (e) => { const it = e.target.closest(".palette-item"); if (it) run(+it.dataset.i); };
    listEl.onmousemove = (e) => { const it = e.target.closest(".palette-item"); if (it && +it.dataset.i !== on) { on = +it.dataset.i; listEl.querySelectorAll(".palette-item").forEach((x, i) => x.classList.toggle("on", i === on)); } };
    input.value = q; build(); setTimeout(() => { input.focus(); input.setSelectionRange(q.length, q.length); }, 30);
  }
  A.openPalette = openPalette;

  /* ---------- Boot ---------- */
  A.boot = () => {
    if (!S.load()) {
      const data = A.seed();
      /* The real studio starts clean (courses, batches, classroom, inventory); the test account gets full sample data */
      if (S.workspace !== "demo") ["students", "payments", "attendance", "documents", "submissions", "projects", "remarks", "feedback", "activity"].forEach((c) => (data[c] = []));
      S.replace(data);
    }
    A.auth.init();
    if (!A.auth.user() && A.auth.isTest()) A.auth.loginTest();
    if (!A.auth.user()) return A.auth.gate(start);
    start();
  };
  function start() {
    shell();
    A.auth.applyPermStyles();
    window.addEventListener("hashchange", () => render(false));
    S.subscribe(() => { A.auth.applyPermStyles(); render(true); UI.openOverlays.forEach((o) => o.refresh()); });

    document.addEventListener("click", (e) => {
      const db = e.target.closest(".db-label"); if (db) { const i = db.querySelector("input"); try { i.showPicker(); } catch (err) { i.focus(); } return; }
      const act = e.target.closest("[data-act]");
      if (act && A.actions[act.dataset.act]) { e.preventDefault(); const a = A.actions[act.dataset.act]; if (!A.actionAllowed(a)) return UI.toast("Your role doesn't allow that.", "warn"); a.run(act.dataset.arg); return; }
      const href = e.target.closest("[data-href]");
      if (href && !e.target.closest("button, a, input, select, textarea, label, .no-row")) { A.navigate(href.dataset.href); }
    });
    document.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); openPalette(); }
    });
    render(false);
  }
})(window.App);
