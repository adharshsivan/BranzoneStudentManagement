/* Team & access — staff accounts and role permissions (rendered inside Settings).
   Decide who can sign in, which areas each role can see, edit or delete in,
   and who can download spreadsheets or import legacy records. */
(function (A) {
  const U = A.util, UI = A.ui, S = A.store, esc = U.esc, ic = UI.icon;
  const state = { role: null };

  const owners = () => S.filter("users", (u) => { const r = S.get("roles", u.roleId); return r && r.all && u.active; });
  const roleOpts = () => S.all("roles").map((r) => ({ value: r.id, label: r.name }));

  function passwordModal(title, sub, onSave, needCurrent) {
    UI.modal({
      title, sub, size: "sm",
      body: `<div class="stack" style="gap:12px">${needCurrent ? `<label class="field"><span class="field-label">Current password</span><input class="input" type="password" name="cur" autocomplete="current-password"></label>` : ""}
        <label class="field"><span class="field-label">New password</span><input class="input" type="password" name="pw" autocomplete="new-password"></label>
        <label class="field"><span class="field-label">Confirm new password</span><input class="input" type="password" name="pw2" autocomplete="new-password"></label>
        <p class="tiny faint">At least 8 characters.</p></div>`,
      actions: [{ label: "Cancel", kind: "ghost" }, { label: "Save password", kind: "primary", onClick: async (m) => {
        const g = (n) => (m.body.querySelector(`[name="${n}"]`) || {}).value || "";
        if (g("pw").length < 8) { UI.toast("Use at least 8 characters.", "warn"); return false; }
        if (g("pw") !== g("pw2")) { UI.toast("The passwords don't match.", "warn"); return false; }
        return onSave(g("pw"), g("cur"));
      } }],
    });
  }

  A.team = {
    changeOwnPassword() {
      const me = A.auth.user();
      passwordModal("Change my password", esc(me.name), async (pw, cur) => {
        if (!(await A.auth.verify(S.get("users", me.id), cur))) { UI.toast("Current password is incorrect.", "bad"); return false; }
        await A.auth.setPassword(me.id, pw); UI.toast("Password changed", "ok");
      }, true);
    },
    editMember(u) {
      const fields = [
        { key: "name", label: "Full name", required: true, span: 2 },
        { key: "username", label: "Username (for sign-in)", required: true },
        { key: "email", label: "Email", type: "email" },
        { key: "roleId", label: "Role", type: "select", options: roleOpts, placeholder: false, required: true },
        { key: "active", label: "Allowed to sign in", type: "toggle" },
      ];
      UI.formDrawer({
        title: u ? u.name : "Add team member", eyebrow: "Team & access", fields, values: u || { roleId: "role_front", active: true },
        extra: u ? "" : `<div class="form-grid mt"><label class="field span-2"><span class="field-label">Starting password (optional)</span><input class="input" type="password" id="np" autocomplete="new-password" placeholder="At least 8 characters — or set it later"></label></div>`,
        onSave: async (v, m) => {
          v.username = v.username.toLowerCase().replace(/\s+/g, "");
          const clash = S.find("users", (x) => x.username === v.username && (!u || x.id !== u.id));
          if (clash) { UI.toast("That username is already taken.", "warn"); return false; }
          if (u && (u.id === A.auth.user().id) && (!v.active || !S.get("roles", v.roleId).all) && owners().length <= 1 && S.get("roles", u.roleId).all) { UI.toast("You're the only founder — keep at least one active full-access account.", "warn"); return false; }
          if (u) { S.update("users", u.id, v, { log: `Team: ${v.name} updated`, studentId: null }); UI.toast("Saved", "ok"); return; }
          const pw = m.body.querySelector("#np").value;
          if (pw && pw.length < 8) { UI.toast("Passwords need at least 8 characters.", "warn"); return false; }
          const rec = S.insert("users", v, { log: `Team: ${v.name} added as ${S.get("roles", v.roleId).name}`, studentId: null });
          if (rec && pw) await A.auth.setPassword(rec.id, pw);
          UI.toast(rec ? `${v.name} added` : "Not saved", rec ? "ok" : "warn");
        },
        onDelete: u && u.id !== A.auth.user().id ? () => S.remove("users", u.id, { log: `Team: ${u.name} removed` }) : null,
      });
    },
    setPassword(u) { passwordModal(`Set password for ${u.name}`, "Share it with them in person; they can change it after signing in.", async (pw) => { await A.auth.setPassword(u.id, pw); S.log(`Team: password set for ${u.name}`, null, "auth"); UI.toast("Password set", "ok"); }); },

    render() {
      const me = A.auth.user();
      const roles = S.all("roles");
      if (!state.role || !S.get("roles", state.role)) state.role = (roles.find((r) => !r.locked) || roles[0]).id;
      const role = S.get("roles", state.role);
      const mods = A.auth.permModules();
      const members = S.all("users").slice().sort((a, b) => (S.get("roles", a.roleId) || {}).all ? -1 : 1);
      const status = (u) => (!u.active ? UI.chip("Switched off", "muted") : !u.pass ? UI.chip("Password not set", "warn") : UI.chip("Can sign in", "ok"));
      return `<div class="banner">${ic("users", 18)}<div class="grow small">Decide <b>who can sign in</b>, which areas each role can <b>see</b>, <b>edit</b> or <b>delete</b> in, and who can <b>download</b> data. Changes apply the next time a screen loads.</div></div>
        <div class="card flush"><div class="card-head"><div><h3>Team members</h3><div class="hint">${U.plural(members.filter((u) => u.active && u.pass).length, "person")} can sign in</div></div><button class="btn btn-primary btn-sm" id="addMember">${ic("userPlus", 14)}Add member</button></div>
          ${UI.table({ rows: members, cols: [
            { key: "n", label: "Member", sortable: false, render: (u) => `<div class="person">${UI.avatar(u.name, 34)}<div><div class="p-name">${esc(u.name)}${u.id === me.id ? ' <span class="tiny faint">(you)</span>' : ""}</div><div class="p-sub">@${esc(u.username)}${u.email ? " · " + esc(u.email) : ""}</div></div></div>` },
            { key: "r", label: "Role", sortable: false, render: (u) => `<select class="input sm" data-urole="${u.id}" style="width:170px" ${u.id === me.id ? "disabled title=\"You can't change your own role\"" : ""}>${roles.map((r) => `<option value="${r.id}" ${u.roleId === r.id ? "selected" : ""}>${esc(r.name)}</option>`).join("")}</select>` },
            { key: "s", label: "Sign-in", sortable: false, render: status },
            { key: "l", label: "Last sign-in", sortable: false, render: (u) => `<span class="small muted">${u.lastLogin ? U.relTime(u.lastLogin) : "Never"}</span>` },
            { key: "a", label: "", sortable: false, align: "right", render: (u) => `<div class="row" style="justify-content:flex-end;gap:6px"><button class="btn btn-xs" data-upw="${u.id}">${u.pass ? "Reset password" : "Set password"}</button>${u.id === me.id ? "" : `<button class="btn btn-xs" data-uact="${u.id}">${u.active ? "Switch off" : "Switch on"}</button>`}<button class="icon-btn sm" data-uedit="${u.id}" title="Edit">${ic("edit", 14)}</button></div>` },
          ] })}</div>

        <div class="card-head mt-lg"><div><h3 style="font-size:16px">Roles & permissions</h3><div class="hint">Pick a role to see exactly what it allows</div></div><button class="btn btn-sm" id="addRole">${ic("plus", 14)}New role</button></div>
        <div class="row wrap mb" style="gap:8px">${UI.seg("role", roles.map((r) => ({ value: r.id, label: r.name, count: S.count("users", (u) => u.roleId === r.id) })), state.role)}</div>
        <div class="grid g-side">
          <div class="card flush"><div class="card-head"><div><h3>${esc(role.name)}</h3><div class="hint">${esc(role.desc || "")}</div></div>${role.locked ? '<span class="chip accent plain">Full access · locked</span>' : ""}</div>
            <div class="tbl-wrap"><table class="tbl perm-tbl"><thead><tr><th>Area</th><th class="c">Can see</th><th class="c">Can edit</th><th class="c">Can delete</th></tr></thead><tbody>
              ${mods.map((m) => { const p = role.all ? { view: 1, edit: 1, delete: 1 } : (role.perms || {})[m.id] || {}; const box = (a) => `<label class="pbox"><input type="checkbox" data-perm-mod="${m.id}" data-perm-act="${a}" ${p[a] ? "checked" : ""} ${role.locked ? "disabled" : ""}><span>${ic("check", 12)}</span></label>`;
                return `<tr><td><div class="row" style="gap:10px">${ic(m.icon, 15)}<span class="strong">${esc(m.label)}</span>${m.flag ? `<span class="tiny faint">needs “${m.flag === "export" ? "Download" : "Import"}”</span>` : ""}</div></td><td class="c">${box("view")}</td><td class="c">${box("edit")}</td><td class="c">${box("delete")}</td></tr>`; }).join("")}
            </tbody></table></div></div>
          <div class="stack">
            <div class="card"><div class="card-head"><h3>Special permissions</h3></div>
              ${[["export", "Download & export", "Spreadsheets, backups and profile exports"], ["import", "Legacy import", "Bring in old spreadsheets, PDFs and scans"], ["team", "Team & access", "Add staff, set passwords, change roles"]].map(([k, l, h]) => `<div class="list-item"><div class="grow"><div class="small strong">${l}</div><div class="tiny faint">${h}</div></div><label class="toggle"><input type="checkbox" data-flag="${k}" ${role.all || role[k] ? "checked" : ""} ${role.locked ? "disabled" : ""}><span class="track"></span></label></div>`).join("")}
            </div>
            ${role.locked ? "" : `<div class="card"><div class="card-head"><h3>Role details</h3></div><div class="stack" style="gap:12px">
              <label class="field"><span class="field-label">Name</span><input class="input" id="roleName" value="${esc(role.name)}"></label>
              <label class="field"><span class="field-label">Description</span><input class="input" id="roleDesc" value="${esc(role.desc || "")}"></label>
              <button class="btn btn-danger btn-sm" id="delRole" style="align-self:flex-start">${ic("trash", 14)}Delete role</button></div></div>`}
          </div>
        </div>`;
    },

    bind(el) {
      const $ = (q) => el.querySelector(q);
      $("#addMember").onclick = () => A.team.editMember(null);
      el.querySelectorAll("[data-uedit]").forEach((b) => (b.onclick = () => A.team.editMember(S.get("users", b.dataset.uedit))));
      el.querySelectorAll("[data-upw]").forEach((b) => (b.onclick = () => A.team.setPassword(S.get("users", b.dataset.upw))));
      el.querySelectorAll("[data-uact]").forEach((b) => (b.onclick = () => { const u = S.get("users", b.dataset.uact); S.update("users", u.id, { active: !u.active }, { log: `Team: ${u.name} ${u.active ? "switched off" : "switched on"}`, studentId: null }); }));
      el.querySelectorAll("[data-urole]").forEach((s) => (s.onchange = () => { const u = S.get("users", s.dataset.urole); S.update("users", u.id, { roleId: s.value }, { log: `Team: ${u.name} is now ${S.get("roles", s.value).name}`, studentId: null }); }));
      UI.bindSeg(el, "role", (v) => { state.role = v; A.refresh(); });
      const role = S.get("roles", state.role);
      el.querySelectorAll("[data-perm-mod]").forEach((c) => (c.onchange = () => {
        const perms = JSON.parse(JSON.stringify(role.perms || {})); const m = c.dataset.permMod, a = c.dataset.permAct;
        perms[m] = perms[m] || { view: false, edit: false, delete: false }; perms[m][a] = c.checked;
        if (a !== "view" && c.checked) perms[m].view = true;                 // editing implies seeing
        if (a === "view" && !c.checked) { perms[m].edit = false; perms[m].delete = false; }
        S.update("roles", role.id, { perms }, { log: `Role ${role.name}: ${m} ${a} ${c.checked ? "allowed" : "removed"}`, studentId: null });
      }));
      el.querySelectorAll("[data-flag]").forEach((c) => (c.onchange = () => S.update("roles", role.id, { [c.dataset.flag]: c.checked }, { log: `Role ${role.name}: ${c.dataset.flag} ${c.checked ? "allowed" : "removed"}`, studentId: null })));
      $("#roleName") && ($("#roleName").onchange = (e) => S.update("roles", role.id, { name: e.target.value.trim() || role.name }));
      $("#roleDesc") && ($("#roleDesc").onchange = (e) => S.update("roles", role.id, { desc: e.target.value.trim() }));
      $("#delRole") && ($("#delRole").onclick = async () => {
        const n = S.count("users", (u) => u.roleId === role.id);
        if (n) return UI.toast(`${n} member(s) still have this role — move them first.`, "warn");
        if (await UI.confirm({ title: `Delete the ${role.name} role?`, danger: true, okLabel: "Delete" })) { S.remove("roles", role.id); state.role = null; }
      });
      $("#addRole").onclick = () => {
        const rec = S.insert("roles", { name: "New role", desc: "", perms: {}, export: false, import: false, team: false }, { log: "Role created", studentId: null });
        if (rec) { state.role = rec.id; A.refresh(); }
      };
    },
  };
})(window.App);
