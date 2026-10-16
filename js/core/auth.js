/* ==========================================================================
   Auth — staff accounts, roles and permissions.

   • Who can log in     → users with an active account and a password
   • Who can access     → role.perms[moduleId].view   (hidden from nav + router)
   • Who can edit       → role.perms[moduleId].edit / .delete (enforced in the store)
   • Who can download   → role.export   (enforced in the exporter)
   • Legacy import      → role.import
   • Team & access      → role.team

   Permissions are enforced centrally (store writes, exporter, router), and
   buttons marked data-perm="module.edit" / "export" are hidden automatically.
   NOTE: this runs in the browser. It keeps honest staff in their lane, but a
   real security boundary needs the shared backend (see README).
   ========================================================================== */
(function (A) {
  const U = A.util, S = A.store, esc = U.esc;
  const SESSION = S.workspace === "demo" ? "bz.session.demo" : "bz.session";

  /* Which module owns each table (for edit / delete checks) */
  const MODULE_OF = {
    students: "students", documents: "students", projects: "students", remarks: "students", feedback: "students",
    payments: "fees", attendance: "attendance", courses: "courses", submissions: "submissions",
    rooms: "classroom", computers: "classroom", inventory: "inventory", batches: "settings", __settings: "settings",
  };
  /* Modules that appear in the permission matrix (dashboard is always visible) */
  const permModules = () => A.modules.filter((m) => m.nav !== false && m.id !== "dashboard");

  const full = () => Object.fromEntries(permModules().map((m) => [m.id, { view: true, edit: true, delete: true }]));
  const pick = (spec) => Object.fromEntries(Object.entries(spec).map(([k, v]) => [k, { view: v.includes("v"), edit: v.includes("e"), delete: v.includes("d") }]));
  function defaultRoles() {
    return [
      { id: "role_founder", name: "Founder", desc: "Everything, including team & access", locked: true, all: true, export: true, import: true, team: true },
      { id: "role_ceo", name: "CEO", desc: "Full access to every area and the team", perms: full(), export: true, import: true, team: true },
      { id: "role_admin", name: "Admin", desc: "Runs the office: every area, data and staff accounts", perms: full(), export: true, import: true, team: true },
      { id: "role_pm", name: "Project Manager", desc: "Courses, reviews, attendance and the classroom", export: true, import: false, team: false,
        perms: pick({ students: "ve", onboarding: "v", attendance: "ve", fees: "v", courses: "ved", submissions: "ved", classroom: "ve", inventory: "ve", reports: "v" }) },
      { id: "role_hr", name: "HR", desc: "Admissions, student records, documents and attendance", export: true, import: true, team: false,
        perms: pick({ students: "ved", onboarding: "ve", attendance: "ve", fees: "ve", courses: "v", submissions: "v", classroom: "ve", reports: "v", legacy: "ve" }) },
      { id: "role_mentor", name: "Mentor", desc: "Teaching, attendance, reviews and remarks", export: false, import: false, team: false,
        perms: pick({ students: "ve", onboarding: "v", attendance: "ve", courses: "ve", submissions: "ve", classroom: "v" }) },
    ];
  }
  const OLD_ROLE = { role_owner: "role_founder", role_manager: "role_admin", role_front: "role_hr", role_accounts: "role_admin", role_viewer: "role_mentor", role_mentor: "role_mentor" };
  /* The Branzone team. Passwords are set on first run (Founder / CEO) and then in Team & access. */
  const TEAM = [
    { id: "usr_suman", name: "Suman", username: "suman", roleId: "role_founder" },
    { id: "usr_gokul", name: "Gokul", username: "gokul", roleId: "role_ceo" },
    { id: "usr_sanjana", name: "Sanjana", username: "sanjana", roleId: "role_hr" },
    { id: "usr_owner", name: "Adharsh", username: "adharsh", roleId: "role_pm" },
  ];
  const TEAM_VERSION = 2;
  function defaultUsers() {
    const team = TEAM.map((u) => ({ ...u, email: "", active: true }));
    if (S.workspace === "demo") return [{ id: "usr_test", name: "Test Account", username: "test", email: "", roleId: "role_founder", active: true, test: true }, ...team];
    return team;
  }
  /* Bring an existing team list in line with TEAM (runs once per TEAM_VERSION) */
  function syncTeam() {
    if ((S.settings().teamVersion || 0) >= TEAM_VERSION) return;
    TEAM.forEach((t) => {
      const u = S.find("users", (x) => x.id === t.id || x.username === t.username);
      if (u) S.update("users", u.id, { name: t.name, username: t.username, roleId: t.roleId });
      else S.insert("users", { ...t, email: "", active: true });
    });
    /* placeholder staff from earlier builds that never got a password */
    S.removeWhere("users", (u) => ["usr_priya", "usr_karthik", "usr_divya"].includes(u.id) && !u.pass && S.workspace !== "demo");
    S.setSettings({ teamVersion: TEAM_VERSION }, { system: true });
  }
  const canManage = (u) => { const r = u && S.get("roles", u.roleId); return !!(r && (r.all || r.team)); };
  /* ---------- Hashing (SHA-256 with a per-user salt) ---------- */
  async function hash(pw, salt) {
    const data = new TextEncoder().encode(salt + ":" + pw);
    if (window.crypto && crypto.subtle) { const buf = await crypto.subtle.digest("SHA-256", data); return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join(""); }
    let h = 5381; for (const b of data) h = ((h << 5) + h + b) | 0; return "f" + (h >>> 0).toString(16);
  }

  /* ---------- Session ---------- */
  let current = null;
  const readSession = () => { try { return JSON.parse(sessionStorage.getItem(SESSION) || localStorage.getItem(SESSION) || "null"); } catch (e) { return null; } };
  const writeSession = (uid, remember) => { const v = JSON.stringify({ uid, at: Date.now() }); try { sessionStorage.setItem(SESSION, v); if (remember) localStorage.setItem(SESSION, v); } catch (e) {} };
  const clearSession = () => { try { sessionStorage.removeItem(SESSION); localStorage.removeItem(SESSION); } catch (e) {} };

  const auth = (A.auth = {
    MODULE_OF, permModules, defaultRoles,
    user: () => current,
    role: (u = current) => (u ? S.get("roles", u.roleId) : null),
    firstName: () => (!current ? "there" : current.test ? "explorer" : current.name.split(" ")[0]),
    can(mod, act = "view") {
      const r = auth.role(); if (!r) return false;
      if (r.all) return true;
      const p = (r.perms || {})[mod]; return !!(p && p[act]);
    },
    flag(name) { const r = auth.role(); return !!(r && (r.all || r[name])); },

    /* Create default roles / users the first time (and for older saved data) */
    init() {
      S.system(() => {
        /* upgrade roles saved by earlier versions (Owner / Front office / …) to the Branzone set */
        if (S.all("roles").some((r) => OLD_ROLE[r.id] && r.id !== "role_mentor")) {
          S.all("users").forEach((u) => { if (OLD_ROLE[u.roleId]) S.update("users", u.id, { roleId: OLD_ROLE[u.roleId] }); });
          S.removeWhere("roles", () => true);
        }
        if (!S.all("roles").length) defaultRoles().forEach((r) => S.insert("roles", r));
        if (!S.all("users").length) defaultUsers().forEach((u) => S.insert("users", u));
        syncTeam();
        if (S.workspace !== "demo") S.removeWhere("users", (u) => u.test);
      });
      const ses = readSession();
      const u = ses && S.get("users", ses.uid);
      current = u && u.active && u.pass ? u : null;
      S.guard = guard;
      return current;
    },
    /* First run: until a Founder / CEO / Admin has a password, nobody can manage the team */
    needsSetup: () => !S.all("users").some((u) => u.pass && u.active && canManage(u)),

    async login(username, password, remember) {
      const n = U.norm(username);
      const u = S.find("users", (x) => U.norm(x.username) === n || (x.email && x.email.toLowerCase() === String(username).toLowerCase()));
      if (!u || !u.pass) return { ok: false, msg: "No account with that username has a password yet." };
      if (!u.active) return { ok: false, msg: "This account is switched off. Ask an admin to enable it." };
      if ((await hash(password, u.salt)) !== u.pass) return { ok: false, msg: "That password doesn't match." };
      S.system(() => S.update("users", u.id, { lastLogin: Date.now() }));
      writeSession(u.id, remember); current = u;
      S.log(`${u.name} signed in`, null, "auth");
      return { ok: true };
    },
    verify: async (u, password) => !!(u && u.pass) && (await hash(password, u.salt)) === u.pass,
    async setPassword(userId, password) {
      const salt = U.uid("s");
      const pass = await hash(password, salt);
      S.system(() => S.update("users", userId, { salt, pass }));
    },
    signOut() { if (current) S.log(`${current.name} signed out`, null, "auth"); clearSession(); try { sessionStorage.removeItem("bz.ws"); } catch (e) {} location.reload(); },
    isTest: () => S.workspace === "demo",
    /* The test account lives in its own sample-data workspace and needs no password */
    openTestAccount() { try { sessionStorage.setItem("bz.ws", "demo"); } catch (e) {} location.reload(); },
    loginTest() {
      const u = S.find("users", (x) => x.test) || S.system(() => S.insert("users", defaultUsers()[0]));
      writeSession(u.id, false); current = u; return u;
    },

    /* Hide any element marked data-perm the current user may not use */
    applyPermStyles() {
      let st = document.getElementById("permStyle"); if (!st) { st = document.createElement("style"); st.id = "permStyle"; document.head.appendChild(st); }
      const deny = [];
      permModules().forEach((m) => ["view", "edit", "delete"].forEach((a) => { if (!auth.can(m.id, a)) deny.push(`[data-perm="${m.id}.${a}"]`); }));
      ["export", "import", "team"].forEach((f) => { if (!auth.flag(f)) deny.push(`[data-perm="${f}"]`); });
      st.textContent = deny.length ? `${deny.join(",")}{display:none!important}` : "";
    },

    /* ---------- Login / first-run gate ---------- */
    gate(onReady) {
      const setup = auth.needsSetup();
      const managers = S.filter("users", canManage).sort((a, b) => (auth.role(b).all ? 1 : 0) - (auth.role(a).all ? 1 : 0));
      const root = document.getElementById("app");
      root.innerHTML = `<div class="gate"><div class="gate-card">
          <img class="gate-logo" src="assets/branzone-logo.png" alt="Branzone Design School">
          <h1>${setup ? "Welcome to Studio Office" : "Sign in to Studio Office"}</h1>
          <p class="muted">${setup ? "First, the Founder or CEO sets a password. They then add passwords for the rest of the team in Settings → Team & access." : "Staff access only. Use the username your admin gave you."}</p>
          <form id="gateForm" class="stack" style="gap:14px;margin-top:22px" autocomplete="off">
            ${setup ? `<label class="field"><span class="field-label">Account</span><select class="input" name="account">${managers.map((u) => `<option value="${u.id}">${esc(u.name)} — ${esc(auth.role(u).name)} (@${esc(u.username)})</option>`).join("")}</select></label>`
              : `<label class="field"><span class="field-label">Username</span><input class="input" name="username" required autocomplete="username"></label>`}
            <label class="field"><span class="field-label">Password</span><input class="input" type="password" name="password" required autocomplete="${setup ? "new-password" : "current-password"}" minlength="${setup ? 8 : 1}"></label>
            ${setup ? `<label class="field"><span class="field-label">Confirm password</span><input class="input" type="password" name="confirm" required autocomplete="new-password"></label><p class="tiny faint">At least 8 characters. Keep it safe — it can't be recovered, only reset by another admin or by restoring a backup.</p>`
              : `<label class="toggle small"><input type="checkbox" name="remember"><span class="track"></span>Keep me signed in on this computer</label>`}
            <div class="gate-err" id="gateErr"></div>
            <button class="btn btn-primary" style="height:42px" type="submit">${setup ? "Set password & continue" : "Sign in"}</button>
          </form>
          <div class="gate-test">Just exploring? <a href="#" id="testAcc">Open the test account</a><span>Sample students, fees and attendance, kept separate from your real data.</span></div>
        </div><div class="gate-foot">Branzone Creative · Studio Office</div></div>`;
      const f = root.querySelector("#gateForm"), err = root.querySelector("#gateErr");
      root.querySelector("#testAcc").onclick = (e) => { e.preventDefault(); auth.openTestAccount(); };
      setTimeout(() => { const first = f.querySelector(setup ? "[name=password]" : "[name=username]"); first && first.focus(); }, 50);
      f.onsubmit = async (e) => {
        e.preventDefault(); err.textContent = "";
        const v = Object.fromEntries(new FormData(f));
        if (setup) {
          if (v.password.length < 8) { err.textContent = "Use at least 8 characters."; return; }
          if (v.password !== v.confirm) { err.textContent = "The two passwords don't match."; return; }
          const acc = S.get("users", v.account);
          S.system(() => S.update("users", acc.id, { active: true }));
          await auth.setPassword(acc.id, v.password);
          await auth.login(acc.username, v.password, true);
        } else {
          const r = await auth.login(v.username, v.password, !!v.remember);
          if (!r.ok) { err.textContent = r.msg; f.querySelector("[name=password]").select(); return; }
        }
        onReady();
      };
    },
  });

  /* ---------- Store guard: every write is checked here ---------- */
  let lastDeny = 0;
  function guard(col, op) {
    if (!current) return true;                         // boot / seeding
    if (col === "users" || col === "roles") return ok(auth.flag("team"), "manage the team");
    const mod = MODULE_OF[col]; if (!mod) return true;
    const act = op === "remove" ? "delete" : "edit";
    const label = (A.modules.find((m) => m.id === mod) || { label: mod }).label;
    return ok(auth.can(mod, act), `${act} ${label}`);
  }
  function ok(allowed, what) {
    if (!allowed && Date.now() - lastDeny > 1500) { lastDeny = Date.now(); A.ui && A.ui.toast(`Your role can't ${what}. Ask an admin for access.`, "warn"); }
    return allowed;
  }
})(window.App);
