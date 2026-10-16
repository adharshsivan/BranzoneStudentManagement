/* Settings — student IDs, batches, option lists, onboarding rules,
   module visibility and data (backup / restore / reset). */
(function (A) {
  const U = A.util, UI = A.ui, S = A.store, sel = A.sel, esc = U.esc, ic = UI.icon;
  const state = { tab: "general" };
  const LISTS = [
    ["sources", "Lead sources"], ["documentTypes", "Document types"], ["paymentMethods", "Payment methods"], ["education", "Education levels"],
    ["occupations", "Occupations"], ["remarkTags", "Remark topics"], ["feedbackCategories", "Feedback categories"], ["projectTypes", "Project types"],
    ["grades", "Grades"], ["inventoryCategories", "Inventory categories"], ["tools_UIUX", "UI/UX tools"], ["tools_Graphic", "Graphic Design tools"],
  ];

  function editBatch(b) {
    UI.formDrawer({
      title: b ? `Edit ${b.name} batch` : "Add batch", eyebrow: "Settings", fields: A.schema.fields.batches, values: b || { days: "Mon – Sat" },
      onSave: (v) => { b ? S.update("batches", b.id, v, { log: `Batch ${v.name} updated`, studentId: null }) : S.insert("batches", v, { log: `Batch ${v.name} added`, studentId: null }); UI.toast("Saved", "ok"); },
      onDelete: b ? () => { const n = S.count("students", (s) => s.batchId === b.id); S.remove("batches", b.id, { log: `Batch ${b.name} removed${n ? ` — ${n} students now unassigned` : ""}` }); if (n) UI.toast(`${n} students are now without a batch`, "warn"); } : null,
    });
  }

  A.register({
    id: "settings", label: "Settings", icon: "sliders", group: "system", order: 90, route: "settings", required: true,
    render(el) {
      const st = S.settings();
      if (A.settingsTab) { state.tab = A.settingsTab; A.settingsTab = null; }
      const canTeam = A.auth.flag("team");
      const tabs = [{ id: "general", label: "General" }, ...(canTeam ? [{ id: "team", label: "Team & access", count: S.all("users").length }] : []), { id: "batches", label: "Batches", count: S.all("batches").length }, { id: "lists", label: "Lists" }, { id: "modules", label: "Modules" }, { id: "data", label: "Data & backup" }];
      if (state.tab === "team" && !canTeam) state.tab = "general";
      let body = "";
      if (state.tab === "team") body = A.team.render();
      if (state.tab === "general") body = `<div class="grid g-2"><div class="card"><div class="card-head"><h3>Organisation</h3></div>
          <div class="form-grid">
            <label class="field span-2"><span class="field-label">Organisation name</span><input class="input" data-set="orgName" value="${esc(st.orgName)}"></label>
            <label class="field"><span class="field-label">Office user name</span><input class="input" data-set="adminName" value="${esc(st.adminName)}"></label>
            <label class="field"><span class="field-label">Student ID prefix</span><input class="input" data-set="codePrefix" value="${esc(st.codePrefix)}"></label>
            <label class="field"><span class="field-label">Attendance alert below (%)</span><input class="input" type="number" data-set="attendanceThreshold" data-pct value="${Math.round((st.attendanceThreshold || 0.75) * 100)}"></label>
            <label class="field"><span class="field-label">Next ID number</span><input class="input" type="number" data-set="codeSeq" data-int value="${(st.codeSeq || 100) + 1}"></label>
          </div><p class="tiny faint mt">Changes save automatically.</p></div>
        <div class="card"><div class="card-head"><div><h3>Onboarding checklist</h3><div class="hint">Documents required before a student is fully onboarded</div></div></div>
          ${UI.chipEditor("requiredDocs", st.requiredDocs, "Add a document type…")}
          <p class="tiny faint mt">Use the exact names from the Document types list. ${st.requiredDocs.filter((d) => !st.lists.documentTypes.includes(d)).length ? `<span style="color:var(--warn)">Not in list: ${esc(st.requiredDocs.filter((d) => !st.lists.documentTypes.includes(d)).join(", "))}</span>` : ""}</p></div></div>`;
      if (state.tab === "batches") body = `<div class="card flush"><div class="card-head"><div><h3>Batches</h3><div class="hint">Time slots used by attendance and seat assignment</div></div><button class="btn btn-primary btn-sm" id="addB">${ic("plus", 14)}Add batch</button></div>
          ${UI.table({ rows: S.all("batches"), rowAttr: (b) => `data-b="${b.id}"`, cols: [{ key: "name", label: "Batch", render: (b) => `<span class="strong">${esc(b.name)}</span>` }, { key: "time", label: "Timing" }, { key: "days", label: "Days" }, { key: "mentor", label: "Mentor" }, { key: "n", label: "Students", align: "right", render: (b) => S.count("students", (s) => s.batchId === b.id && (s.status === "Active" || s.status === "Onboarding")) }] })}</div>`;
      if (state.tab === "lists") body = `<p class="muted small mb">These lists power every dropdown in the portal. Add with Enter, remove with ×. Existing records keep their values.</p><div class="grid g-2">${LISTS.map(([k, l]) => `<div class="card"><div class="card-head"><h3>${esc(l)}</h3><span class="tiny faint">${st.lists[k].length}</span></div>${UI.chipEditor("list_" + k, st.lists[k])}</div>`).join("")}</div>`;
      if (state.tab === "modules") body = `<p class="muted small mb">Hide modules the office doesn't use. Data is kept and the module returns when switched back on. Developers add new modules in <span class="mono">js/modules/</span> — see README.</p>
        <div class="card flush">${UI.table({ rows: A.modules.filter((m) => m.nav !== false), cols: [
          { key: "l", label: "Module", render: (m) => `<div class="row">${ic(m.icon, 16)}<span class="strong">${esc(m.label)}</span></div>` },
          { key: "g", label: "Section", render: (m) => esc((A.groups.find((g) => g.id === m.group) || {}).label || "") },
          { key: "r", label: "Route", render: (m) => `<span class="mono small">#/${esc(m.route)}</span>` },
          { key: "on", label: "Visible", align: "right", render: (m) => (m.required ? '<span class="tiny faint">Always on</span>' : `<label class="toggle"><input type="checkbox" data-mod="${m.id}" ${A.enabled(m) ? "checked" : ""}><span class="track"></span></label>`) },
        ] })}</div>`;
      if (state.tab === "data") {
        const size = (() => { try { return (localStorage.getItem(S.storageKey) || "").length; } catch (e) { return 0; } })();
        body = `<div class="grid g-2">
          <div class="card"><div class="card-head"><div><h3>Backup</h3><div class="hint">Everything except uploaded files, as one JSON file</div></div></div><button class="btn btn-primary" id="bk">${ic("download", 15)}Download backup</button><button class="btn" id="xl" style="margin-left:8px">${ic("sheet", 15)}Full Excel workbook</button>
            <p class="tiny faint mt">Data lives in this browser (${U.bytes(size * 2)} used). Download a backup weekly, and before clearing browser data.</p></div>
          <div class="card"><div class="card-head"><div><h3>Restore</h3><div class="hint">Replace current data with a backup file</div></div></div><button class="btn" id="rs">${ic("upload", 15)}Restore from backup…</button><input type="file" id="rsf" accept=".json" hidden></div>
          <div class="card"><div class="card-head"><div><h3>Sample studio</h3><div class="hint">Reload the demo students, courses and classroom</div></div></div><button class="btn" id="seed">${ic("refresh", 15)}Reset to sample data</button></div>
          <div class="card"><div class="card-head"><div><h3>Start fresh</h3><div class="hint">Keeps courses, batches, rooms and settings — clears all students and records</div></div></div><button class="btn btn-danger" id="wipe">${ic("trash", 15)}Clear student records</button></div>
        </div>`;
      }
      el.innerHTML = `<div class="page">${UI.pageHead({ eyebrow: "System", title: "Settings", sub: "Shape the portal around how the office works." })}${UI.tabs(tabs, state.tab)}${body}</div>`;
      UI.bindTabs(el, (t) => { state.tab = t; A.refresh(); });
      if (state.tab === "team") A.team.bind(el);

      el.querySelectorAll("[data-set]").forEach((i) => (i.onchange = () => {
        let v = i.value; if (i.dataset.pct !== undefined) v = U.clamp(Number(v) / 100, 0, 1); if (i.dataset.int !== undefined) v = Math.max(0, Number(v) - 1);
        S.setSettings({ [i.dataset.set]: v }); UI.toast("Saved", "ok");
        if (i.dataset.set === "orgName") setTimeout(() => location.reload(), 300);
      }));
      UI.bindChipEditor(el, "requiredDocs", (v) => { state.focus = "requiredDocs"; S.setSettings({ requiredDocs: v }); });
      LISTS.forEach(([k]) => UI.bindChipEditor(el, "list_" + k, (v) => { state.focus = "list_" + k; S.setSettings({ lists: { [k]: v } }); }));
      if (state.focus) { const i = el.querySelector(`[data-chips="${state.focus}"] input`); i && i.focus(); state.focus = null; }
      el.querySelectorAll("[data-mod]").forEach((c) => (c.onchange = () => { const d = new Set(st.disabledModules || []); c.checked ? d.delete(c.dataset.mod) : d.add(c.dataset.mod); S.setSettings({ disabledModules: [...d] }); }));
      el.querySelectorAll("[data-b]").forEach((r) => (r.onclick = () => editBatch(S.get("batches", r.dataset.b))));
      const $ = (q) => el.querySelector(q);
      $("#addB") && ($("#addB").onclick = () => editBatch(null));
      $("#bk") && ($("#bk").onclick = () => { U.download(new Blob([JSON.stringify({ app: "branzone-studio-office", version: 1, exportedAt: new Date().toISOString(), data: S.snapshot() }, null, 1)], { type: "application/json" }), `Branzone_backup_${U.today()}.json`); UI.toast("Backup downloaded", "ok"); });
      $("#xl") && ($("#xl").onclick = () => A.exporter.run("everything"));
      $("#rs") && ($("#rs").onclick = () => $("#rsf").click());
      $("#rsf") && ($("#rsf").onchange = async (e) => {
        const f = e.target.files[0]; if (!f) return;
        try { const j = JSON.parse(await f.text()); const data = j.data || j; if (!data.students || !data.courses) throw new Error("Not a Branzone backup file");
          if (!(await UI.confirm({ title: "Restore this backup?", text: `${data.students.length} students from ${j.exportedAt ? U.fmtDate(j.exportedAt.slice(0, 10)) : "an earlier export"}. Current data will be replaced.`, danger: true, okLabel: "Restore" }))) return;
          if (!data.users || !data.users.length) { data.users = S.all("users"); data.roles = S.all("roles"); } S.replace(data); UI.toast("Backup restored", "ok"); setTimeout(() => location.reload(), 600);
        } catch (err) { UI.toast(err.message, "bad"); }
      });
      $("#seed") && ($("#seed").onclick = async () => { if (await UI.confirm({ title: "Reset to sample data?", text: "All records will be replaced by the demo studio. Team accounts and roles are kept.", danger: true, okLabel: "Reset" })) { await A.files.clear(); S.replace({ ...A.seed(), users: S.all("users"), roles: S.all("roles") }); UI.toast("Sample studio loaded", "ok"); } });
      $("#wipe") && ($("#wipe").onclick = async () => {
        if (!(await UI.confirm({ title: "Clear all student records?", text: "Students, payments, attendance, documents, submissions, projects, remarks, feedback and activity will be deleted. Download a backup first.", danger: true, okLabel: "Clear everything" }))) return;
        const snap = S.snapshot(); ["students", "payments", "attendance", "documents", "submissions", "projects", "remarks", "feedback", "activity"].forEach((c) => (snap[c] = []));
        await A.files.clear(); S.replace(snap); UI.toast("Student records cleared", "ok");
      });
    },
  });
})(window.App);
