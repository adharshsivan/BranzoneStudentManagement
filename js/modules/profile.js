/* Student profile — one place for everything about a student.
   Tabs read from attendance, fees, courses, submissions, classroom and
   documents, so edits made anywhere show up here instantly. */
(function (A) {
  const U = A.util, UI = A.ui, S = A.store, sel = A.sel, esc = U.esc, ic = UI.icon;
  const tabState = {};

  /* ---------- Documents ---------- */
  A.docs = {
    async save(studentId, file, type) {
      const rec = S.insert("documents", { studentId, type, name: file.name, size: file.size, mime: file.type, uploadedAt: U.today(), verified: false, hasFile: true }, { log: `Document uploaded — ${type}` });
      try { await A.files.put(rec.id, file); } catch (e) { UI.toast("Could not store the file in this browser.", "bad"); }
      return rec;
    },
    upload(s, presetType) {
      const types = S.settings().lists.documentTypes;
      const missing = (S.settings().requiredDocs || []).find((t) => !sel.of("documents", s.id).some((d) => d.type === t));
      let files = [];
      const m = UI.modal({
        title: "Upload documents", eyebrow: sel.name(s), size: "",
        body: () => `<div class="field mb"><span class="field-label">Document type</span><select class="input" id="dt">${types.map((t) => `<option ${t === (presetType || missing) ? "selected" : ""}>${esc(t)}</option>`).join("")}</select></div>
          <div class="dropzone" id="dz"><div class="dz-icon">${ic("upload", 22)}</div><div class="strong">Drop files or click to browse</div><div class="small faint" style="margin-top:4px">PDF, images or Office documents</div><input type="file" id="fi" multiple hidden></div><div id="fl" class="mt"></div>`,
        onMount: (b) => {
          const dz = b.querySelector("#dz"), fi = b.querySelector("#fi"), fl = b.querySelector("#fl");
          const show = () => (fl.innerHTML = files.map((f) => `<div class="file-row">${UI.fileIcon(f.name)}<div class="grow small truncate">${esc(f.name)}</div><span class="tiny faint">${U.bytes(f.size)}</span></div>`).join(""));
          dz.onclick = () => fi.click(); fi.onchange = () => { files = [...files, ...fi.files]; show(); };
          dz.ondragover = (e) => { e.preventDefault(); dz.classList.add("drag"); }; dz.ondragleave = () => dz.classList.remove("drag");
          dz.ondrop = (e) => { e.preventDefault(); dz.classList.remove("drag"); files = [...files, ...e.dataTransfer.files]; show(); };
        },
        actions: [{ label: "Cancel", kind: "ghost" }, { label: "Upload", kind: "primary", onClick: async (api) => { if (!files.length) { UI.toast("Choose at least one file", "warn"); return false; } const t = api.body.querySelector("#dt").value; for (const f of files) await A.docs.save(s.id, f, t); UI.toast(`${files.length} document(s) uploaded`, "ok"); } }],
      });
      return m;
    },
  };

  /* ---------- Small editors ---------- */
  const remarkFields = () => [
    { key: "tone", label: "Tone", type: "select", options: () => [{ value: "positive", label: "Positive" }, { value: "neutral", label: "Neutral" }, { value: "concern", label: "Concern" }], placeholder: false },
    { key: "tag", label: "Topic", type: "select", options: A.schema.opts.list("remarkTags") },
    { key: "author", label: "Author", required: true },
    { key: "date", label: "Date", type: "date", required: true },
    { key: "text", label: "Remark", type: "textarea", span: 2, required: true, rows: 4 },
  ];
  const feedbackFields = () => [
    { key: "rating", label: "Rating", type: "select", options: () => [5, 4, 3, 2, 1].map((n) => ({ value: n, label: "★".repeat(n) + " " + n })), placeholder: false, number: true },
    { key: "category", label: "About", type: "select", options: A.schema.opts.list("feedbackCategories"), placeholder: false },
    { key: "date", label: "Date", type: "date", required: true },
    { key: "text", label: "What the student said", type: "textarea", span: 2, required: true, rows: 4 },
  ];
  const projectFields = () => [
    { key: "title", label: "Project title", required: true, span: 2 },
    { key: "type", label: "Type", type: "select", options: A.schema.opts.list("projectTypes") },
    { key: "status", label: "Status", type: "select", options: () => ["In progress", "Completed", "Showcased"], placeholder: false },
    { key: "tools", label: "Tools used" },
    { key: "date", label: "Date", type: "date" },
    { key: "link", label: "Link (Figma / Behance / Drive)", span: 2 },
    { key: "notes", label: "Notes", type: "textarea", span: 2, rows: 2 },
  ];
  A.profile = {
    remark(s, r) { UI.formDrawer({ title: r ? "Edit remark" : "Add remark", eyebrow: sel.name(s), fields: remarkFields(), values: r || { tone: "positive", author: S.settings().adminName, date: U.today() }, onSave: (v) => { r ? S.update("remarks", r.id, v) : S.insert("remarks", { ...v, studentId: s.id }, { log: `Remark added: ${v.text.slice(0, 60)}` }); UI.toast("Saved", "ok"); }, onDelete: r ? () => S.remove("remarks", r.id) : null }); },
    feedback(s, r) { UI.formDrawer({ title: r ? "Edit feedback" : "Log student feedback", eyebrow: sel.name(s), fields: feedbackFields(), values: r || { rating: 5, category: "Overall", date: U.today() }, onSave: (v) => { r ? S.update("feedback", r.id, v) : S.insert("feedback", { ...v, studentId: s.id }, { log: `Feedback logged (${v.rating}★)` }); UI.toast("Saved", "ok"); }, onDelete: r ? () => S.remove("feedback", r.id) : null }); },
    project(s, p) { UI.formDrawer({ title: p ? "Edit project" : "Add project", eyebrow: sel.name(s), fields: projectFields(), values: p || { status: "In progress", date: U.today(), tools: (sel.course(s) || { tools: [] }).tools.slice(0, 2).join(", ") }, onSave: (v) => { p ? S.update("projects", p.id, v) : S.insert("projects", { ...v, studentId: s.id }, { log: `Project added — ${v.title}` }); UI.toast("Saved", "ok"); }, onDelete: p ? () => S.remove("projects", p.id) : null }); },
  };

  /* ---------- Page ---------- */
  A.register({
    id: "profile", label: "Student", icon: "users", group: "people", nav: false, navParent: "students", route: "students/:id",
    render(el, { id, query }) {
      const s = S.get("students", id);
      if (!s) { el.innerHTML = `<div class="page">${UI.empty("users", "Student not found", "They may have been deleted.", `<a class="btn" href="#/students">Back to students</a>`)}</div>`; return; }
      const c = sel.course(s), b = sel.batch(s), pc = sel.computer(s), room = sel.room(pc);
      const f = sel.fee(s), a = sel.attendance(s), a30 = sel.att30(s), p = sel.progress(s), ch = sel.checklist(s);
      const docs = sel.of("documents", s.id), projects = sel.of("projects", s.id), remarks = sel.of("remarks", s.id), fb = sel.of("feedback", s.id);
      const tab = (query && query.tab) || tabState[id] || "overview";
      tabState[id] = tab;
      const tabs = [
        { id: "overview", label: "Overview" }, { id: "progress", label: "Progress & goals", count: `${p.approvedCount}/${p.total}` },
        { id: "work", label: "Projects & submissions", count: projects.length + p.subs.length }, { id: "attendance", label: "Attendance" },
        { id: "fees", label: "Fees" }, { id: "documents", label: "Documents", count: docs.length }, { id: "tools", label: "Tools" },
        { id: "notes", label: "Remarks & feedback", count: remarks.length + fb.length }, { id: "activity", label: "Activity" },
      ];
      el.innerHTML = `<div class="page">
        <div class="eyebrow"><a href="#/students">Students</a> ${ic("chevR", 12)} <span>${esc(s.code)}</span></div>
        <section class="card hero">
          ${UI.avatar(sel.name(s), 84, s.id)}
          <div class="grow" style="position:relative">
            <div class="row wrap" style="gap:8px;margin-bottom:8px">${UI.chip(s.status)}${UI.track(c)}${s.status === "Onboarding" ? `<span class="chip info">Checklist ${ch.done}/${ch.total}</span>` : ""}</div>
            <h1>${esc(sel.name(s))}</h1>
            <div class="meta">
              <span>${ic("book", 14)}${esc(c ? c.name : "No course")}</span>
              <span>${ic("clock", 14)}${b ? esc(`${b.name} · ${b.time}`) : "No batch"}</span>
              <span>${ic("monitor", 14)}${pc ? `<a href="#/classroom?pc=${pc.id}">${esc(pc.label)} · ${esc(room ? room.name : "")}</a>` : "No seat"}</span>
              <span>${ic("phone", 14)}${esc(s.phone || "—")}</span>
              ${s.email ? `<span>${ic("mail", 14)}<a href="mailto:${esc(s.email)}">${esc(s.email)}</a></span>` : ""}
            </div>
          </div>
          <div class="actions" style="position:relative">
            <button class="btn" id="edit" data-perm="students.edit">${ic("edit", 15)}Edit</button>
            <button class="btn btn-primary" id="pay" data-perm="fees.edit">${ic("wallet", 15)}Record payment</button>
            <button class="icon-btn" id="more" data-perm="students.edit">${ic("more", 18)}</button>
          </div>
        </section>
        <section class="grid g-4 mt">
          ${UI.kpi({ label: "Attendance · 30 days", icon: "calendar", value: a30.rate == null ? "—" : Math.round(a30.rate * 100), unit: a30.rate == null ? "" : "%", sub: `Overall ${U.pct(a.rate)} · ${a.P} present, ${a.A} absent` })}
          ${UI.kpi({ label: "Course progress", icon: "target", value: Math.round(p.pct * 100), unit: "%", sub: `Week ${p.currentWeek} of ${p.total} · ${esc(p.standing)}` })}
          ${UI.kpi({ label: "Goals achieved", icon: "award", value: p.goals.length, unit: `/ ${p.total}`, sub: p.goals.length ? esc(p.goals[p.goals.length - 1].goal) : "First goal pending" })}
          ${UI.kpi({ label: "Fee balance", icon: "wallet", value: U.moneyShort(f.balance), sub: `${UI.chip(f.status)} <span style="margin-left:6px">${U.money(f.paid)} of ${U.money(f.net)} paid</span>` })}
        </section>
        <div class="mt-lg">${UI.tabs(tabs, tab)}</div>
        <div id="tabBody">${TABS[tab](s, { c, b, pc, room, f, a, a30, p, ch, docs, projects, remarks, fb })}</div>
      </div>`;

      UI.bindTabs(el, (t) => { tabState[id] = t; if (query && query.tab) A.navigate("students/" + id); else A.refresh(); });
      el.querySelector("#edit").onclick = () => A.students.edit(s);
      el.querySelector("#pay").onclick = () => A.fees.recordPayment(s.id);
      el.querySelector("#more").onclick = (e) => UI.menu(e.currentTarget, [
        { label: "Edit fee plan", icon: "wallet", onClick: () => A.fees.editPlan(s) },
        { label: "Assign workstation", icon: "monitor", onClick: () => A.classroom.assignFor(s) },
        { label: "Upload documents", icon: "upload", onClick: () => A.docs.upload(s) },
        { label: "Add remark", icon: "message", onClick: () => A.profile.remark(s) },
        "-",
        ...S.settings().lists.statuses.filter((x) => x !== s.status).map((x) => ({ label: `Mark ${x}`, icon: "refresh", onClick: () => A.students.setStatus(s, x) })),
        "-",
        { label: "Export profile (.xlsx)", icon: "download", onClick: () => exportProfile(s) },
        { label: "Delete student", icon: "trash", danger: true, onClick: () => A.students.remove(s) },
      ]);
      bindTab(el, s, tab);
    },
  });

  /* ---------- Tabs ---------- */
  const TABS = {
    overview(s, d) {
      const st = S.settings();
      const latestRemark = d.remarks.slice().sort((x, y) => (x.date < y.date ? 1 : -1))[0];
      const tools = Object.entries(s.tools || {}).sort((x, y) => y[1] - x[1]).slice(0, 5);
      return `<div class="grid g-main">
        <div class="stack">
          ${s.status === "Onboarding" ? `<div class="card"><div class="card-head"><h3>Onboarding checklist</h3><span class="small faint">${d.ch.done} of ${d.ch.total} complete</span></div><div class="check-list">${d.ch.items.map((i) => `<div class="check ${i.done ? "done" : ""}"><span class="box">${i.done ? ic("check", 12) : ""}</span><div class="grow">${esc(i.label)} <span class="tiny faint">· ${esc(i.detail)}</span></div></div>`).join("")}</div>${d.ch.complete ? `<button class="btn btn-accent mt" data-status="Active">${ic("check", 15)}Activate student</button>` : ""}</div>` : ""}
          <div class="card"><div class="card-head"><div><h3>This week</h3><div class="hint">${d.p.current ? `Week ${d.p.currentWeek} · ${esc(d.p.current.phase || "")}` : "Course not started"}</div></div><a class="card-link" data-tabgo="progress">Full curriculum ${ic("chevR", 13)}</a></div>
            ${d.p.current ? `<div class="serif" style="font-size:20px;line-height:1.15">${esc(d.p.current.title)}</div><p class="muted mt small">${esc(d.p.current.topics || "")}</p>
              <div class="grid g-2 mt"><div class="note neutral"><div class="n-head">${ic("inbox", 13)}Assignment</div><p>${esc(d.p.current.assignment)}</p></div><div class="note positive"><div class="n-head">${ic("target", 13)}Goal</div><p>${esc(d.p.current.goal)}</p></div></div>
              <div class="row mt">${subChip(d.p.byWeek[d.p.current.id])}<button class="btn btn-sm" data-sub="${d.p.current.id}">${ic("inbox", 14)}${d.p.byWeek[d.p.current.id] ? "Update submission" : "Log submission"}</button></div>` : UI.empty("clock", "Starts " + U.fmtDate(s.startDate), "The weekly plan appears once the course begins.")}
          </div>
          <div class="card"><div class="card-head"><h3>Latest remark</h3><a class="card-link" data-tabgo="notes">All remarks ${ic("chevR", 13)}</a></div>
            ${latestRemark ? noteHtml(latestRemark) : UI.empty("message", "No remarks yet", "Mentor notes about this student appear here.", `<button class="btn btn-sm" data-add="remark">${ic("plus", 14)}Add remark</button>`)}</div>
        </div>
        <div class="stack">
          <div class="card"><div class="card-head"><h3>Details</h3><button class="btn btn-xs" data-editsec="Personal">${ic("edit", 12)}Edit</button></div>
            <dl class="kv">
              <dt>Student ID</dt><dd class="mono">${esc(s.code)}</dd>
              <dt>Gender · Age</dt><dd>${esc(s.gender || "—")}${s.dob ? ` · ${U.age(s.dob)} yrs` : ""}</dd>
              <dt>Date of birth</dt><dd>${U.fmtDate(s.dob)}</dd>
              <dt>Education</dt><dd>${esc(s.education || "—")}</dd>
              <dt>Occupation</dt><dd>${esc(s.occupation || "—")}</dd>
              <dt>Address</dt><dd>${esc([s.address, s.city, s.pincode].filter(Boolean).join(", ") || "—")}</dd>
              <dt>Guardian</dt><dd>${esc(s.guardianName || "—")}${s.guardianPhone ? ` · ${esc(s.guardianPhone)}` : ""}</dd>
              <dt>Started</dt><dd>${U.fmtDate(s.startDate)}</dd>
              <dt>Source</dt><dd>${esc(s.source || "—")}</dd>
              <dt>Career goal</dt><dd>${esc(s.goal || "—")}</dd>
              ${s.notes ? `<dt>Notes</dt><dd>${esc(s.notes)}</dd>` : ""}
            </dl></div>
          <div class="card"><div class="card-head"><h3>Tool knowledge</h3><a class="card-link" data-tabgo="tools">Edit ${ic("chevR", 13)}</a></div>
            ${tools.length ? UI.hbars(tools.map(([t, v]) => ({ label: esc(t), value: v, display: sel.toolLevels[v] }))) : '<p class="small faint">No tools tracked.</p>'}</div>
          <div class="card"><div class="card-head"><h3>Fee summary</h3><a class="card-link" data-tabgo="fees">Ledger ${ic("chevR", 13)}</a></div>
            ${UI.barRow(d.f.pct, U.pct(d.f.pct))}
            <dl class="kv mt"><dt>Net fee</dt><dd>${U.money(d.f.net)}</dd><dt>Paid</dt><dd>${U.money(d.f.paid)}</dd><dt>Balance</dt><dd>${U.money(d.f.balance)}</dd><dt>Next due</dt><dd>${d.f.next ? `${U.money(d.f.next.remaining)} on ${U.fmtDate(d.f.next.due)} ${UI.chip(d.f.next.status)}` : "—"}</dd></dl></div>
        </div></div>`;
    },

    progress(s, d) {
      const weeks = sel.weeks(d.c);
      if (!weeks.length) return UI.empty("book", "No curriculum", "Assign a course with a curriculum to track progress.");
      const phases = U.groupBy(weeks.map((w, i) => ({ w, i })), (x) => x.w.phase || "Curriculum");
      return `<div class="grid g-side"><div class="card">
          ${Object.entries(phases).map(([ph, list]) => `<div class="phase-head"><h4>${esc(ph)}</h4><span>Weeks ${list[0].i + 1}–${list[list.length - 1].i + 1}</span></div>
            ${list.map(({ w, i }) => { const sub = d.p.byWeek[w.id]; return `<div class="week-row ${i + 1 === d.p.currentWeek && s.status !== "Completed" ? "current" : ""}"><div class="week-no">Week<b>${i + 1}</b></div><div style="min-width:0"><div class="w-title">${esc(w.title)}</div><div class="w-sub truncate">${ic("target", 11)} ${esc(w.goal || "")}</div></div><div class="row">${subChip(sub, i + 1 > d.p.currentWeek)}<button class="icon-btn sm" data-sub="${w.id}" title="Log / review submission">${ic(sub ? "edit" : "plus", 14)}</button></div></div>`; }).join("")}`).join("")}
        </div>
        <div class="stack"><div class="card"><div class="card-head"><h3>Goals achieved</h3><span class="small faint">${d.p.goals.length} of ${weeks.length}</span></div>
          <div class="row" style="gap:16px;margin-bottom:16px">${UI.ring(d.p.pct, 64, 6)}<div><div class="serif" style="font-size:23px;line-height:1">${Math.round(d.p.pct * 100)}%</div><div class="small faint">Expected by now: ${Math.round(d.p.expectedPct * 100)}%</div></div></div>
          ${d.p.goals.length ? `<div class="check-list">${d.p.goals.slice().reverse().slice(0, 12).map((g) => `<div class="check done"><span class="box">${ic("check", 12)}</span><div><div>${esc(g.goal)}</div><div class="tiny faint">Week ${g.week} · ${esc(g.title)}</div></div></div>`).join("")}</div>` : '<p class="small faint">Goals are achieved when a week\'s assignment is approved.</p>'}
        </div>
        ${d.c && d.c.goals && d.c.goals.length ? `<div class="card"><div class="card-head"><h3>Programme outcomes</h3></div><div class="list">${d.c.goals.map((g) => `<div class="list-item small">${ic("sparkle", 14)}${esc(g)}</div>`).join("")}</div></div>` : ""}
        </div></div>`;
    },

    work(s, d) {
      const subs = d.p.subs.slice().sort((x, y) => ((x.submittedAt || "") < (y.submittedAt || "") ? 1 : -1));
      const weeks = sel.weeks(d.c);
      return `<div class="card-head"><h3 style="font-size:16px" class="serif">Projects</h3><button class="btn btn-sm" data-add="project">${ic("plus", 14)}Add project</button></div>
        ${d.projects.length ? `<div class="proj-grid">${d.projects.map((p) => { return `<div class="proj" data-proj="${p.id}" style="cursor:pointer"><div class="cover ${p.status === "In progress" ? "" : "done"}"><span>${esc(p.type || "Project")}</span></div><div class="p-body"><div class="p-title">${esc(p.title)}</div><div class="row between mt" style="margin-top:8px"><span class="tiny faint">${esc(p.tools || "")}</span>${UI.chip(p.status, p.status === "In progress" ? "info" : "ok")}</div></div></div>`; }).join("")}</div>` : `<div class="card">${UI.empty("briefcase", "No projects yet", "Portfolio projects the student builds will appear here.")}</div>`}
        <div class="card-head mt-lg"><h3 style="font-size:16px" class="serif">Weekly submissions</h3><a class="btn btn-sm" href="#/submissions">${ic("inbox", 14)}Review queue</a></div>
        <div class="card flush">${UI.table({ cols: [
          { key: "w", label: "Week", render: (x) => { const w = weeks.find((w) => w.id === x.weekId); return `<span class="mono">${w ? "W" + (weeks.indexOf(w) + 1) : "—"}</span>`; } },
          { key: "t", label: "Assignment", render: (x) => `<span class="strong">${esc(x.title)}</span>` },
          { key: "d", label: "Submitted", render: (x) => U.fmtDate(x.submittedAt) },
          { key: "g", label: "Grade", render: (x) => esc(x.grade || "—") },
          { key: "st", label: "Status", render: (x) => UI.chip(x.status) },
          { key: "l", label: "", render: (x) => (x.link ? `<a class="icon-btn sm" href="${esc(x.link)}" target="_blank" rel="noopener">${ic("link", 14)}</a>` : "") },
        ], rows: subs, rowAttr: (x) => `data-subid="${x.id}"`, empty: UI.empty("inbox", "No submissions", "Log a submission from the Progress tab.") })}</div>`;
    },

    attendance(s, d) {
      const today = U.today(); let start = U.addDays(today, -7 * 26);
      while (U.parse(start).getDay() !== 0) start = U.addDays(start, -1);
      const map = {}; d.a.recs.forEach((r) => (map[r.date] = r.status));
      let cells = ""; for (let x = start; x <= today; x = U.addDays(x, 1)) cells += `<i class="${map[x] || (x < s.startDate ? "x" : "")}" title="${U.fmtDate(x)}${map[x] ? " · " + map[x] : ""}"></i>`;
      const months = {}; d.a.recs.forEach((r) => { const k = r.date.slice(0, 7); months[k] = months[k] || { P: 0, A: 0, L: 0, E: 0 }; months[k][r.status]++; });
      return `<div class="grid g-main"><div class="card"><div class="card-head"><div><h3>Last six months</h3><div class="hint">Each square is a day</div></div><div class="row small faint" style="gap:12px"><span class="row" style="gap:5px"><i class="reg-cell P" style="width:10px;height:10px"></i>Present</span><span class="row" style="gap:5px"><i class="reg-cell L" style="width:10px;height:10px"></i>Late</span><span class="row" style="gap:5px"><i class="reg-cell A" style="width:10px;height:10px"></i>Absent</span><span class="row" style="gap:5px"><i class="reg-cell E" style="width:10px;height:10px"></i>Excused</span></div></div>
          <div class="heat">${cells}</div>
          <div class="stat-list mt"><div><div class="s-label">Present</div><div class="s-value">${d.a.P}</div></div><div><div class="s-label">Late</div><div class="s-value">${d.a.L}</div></div><div><div class="s-label">Absent</div><div class="s-value">${d.a.A}</div></div><div><div class="s-label">Excused</div><div class="s-value">${d.a.E}</div></div><div><div class="s-label">Rate</div><div class="s-value">${U.pct(d.a.rate)}</div></div></div></div>
        <div class="card flush"><div class="card-head"><h3>By month</h3><a class="card-link" href="#/attendance">Mark attendance ${ic("chevR", 13)}</a></div>${UI.table({ cls: "compact", cols: [
          { key: "m", label: "Month", render: (r) => U.fmtMonth(r[0]) }, { key: "p", label: "P", align: "right", render: (r) => r[1].P + r[1].L }, { key: "a", label: "A", align: "right", render: (r) => r[1].A },
          { key: "r", label: "Rate", render: (r) => { const t = r[1].P + r[1].L + r[1].A; const v = t ? (r[1].P + r[1].L) / t : null; return UI.barRow(v, U.pct(v), UI.attTone(v)); } },
        ], rows: Object.entries(months).sort((x, y) => (x[0] < y[0] ? 1 : -1)), empty: UI.empty("calendar", "No attendance", "Records appear once attendance is marked.") })}</div></div>`;
    },

    fees(s, d) {
      const f = d.f;
      return `<div class="grid g-main"><div class="stack">
          <div class="card"><div class="card-head"><div><h3>Installment schedule</h3><div class="hint">${U.plural(f.inst.length, "installment")} · net ${U.money(f.net)}${f.discount ? ` after ${U.money(f.discount)} discount` : ""}</div></div><button class="btn btn-sm" id="plan">${ic("edit", 14)}Edit plan</button></div>
            ${UI.table({ cls: "compact", cols: [{ key: "n", label: "#", render: (i) => `<span class="mono">${i.n}</span>` }, { key: "d", label: "Due", render: (i) => U.fmtDate(i.due) }, { key: "a", label: "Amount", align: "right", render: (i) => U.money(i.amount) }, { key: "r", label: "Remaining", align: "right", render: (i) => (i.remaining ? U.money(i.remaining) : "—") }, { key: "s", label: "Status", render: (i) => UI.chip(i.status) }], rows: f.inst, empty: UI.empty("wallet", "No plan yet", "Create an installment plan to track dues.") })}</div>
          <div class="card flush"><div class="card-head"><h3>Payments received</h3><button class="btn btn-primary btn-sm" id="pay2">${ic("plus", 14)}Record payment</button></div>
            ${UI.table({ cols: [{ key: "d", label: "Date", render: (p) => U.fmtDate(p.date) }, { key: "r", label: "Receipt", render: (p) => `<span class="mono">${esc(p.receipt || "—")}</span>` }, { key: "m", label: "Method", render: (p) => esc(p.method) }, { key: "ref", label: "Reference", render: (p) => `<span class="mono small">${esc(p.ref || "—")}</span>` }, { key: "a", label: "Amount", align: "right", render: (p) => `<span class="strong">${U.money(p.amount)}</span>` }], rows: f.pays.slice().reverse(), rowAttr: (p) => `data-payid="${p.id}"`, empty: UI.empty("wallet", "No payments yet", "Recorded payments update the fee status everywhere.") })}</div>
        </div>
        <div class="card"><div class="card-head"><h3>Summary</h3>${UI.chip(f.status)}</div>
          <div class="row" style="gap:16px">${UI.ring(f.pct, 72, 7)}<div><div class="serif" style="font-size:27px;line-height:1">${U.pct(f.pct)}</div><div class="small faint">collected</div></div></div>
          <dl class="kv mt"><dt>Gross fee</dt><dd>${U.money(f.gross)}</dd><dt>Discount</dt><dd>${U.money(f.discount)}</dd><dt>Net fee</dt><dd class="strong">${U.money(f.net)}</dd><dt>Paid</dt><dd style="color:var(--ok)">${U.money(f.paid)}</dd><dt>Balance</dt><dd>${U.money(f.balance)}</dd><dt>Overdue</dt><dd style="color:${f.overdue ? "var(--bad)" : "inherit"}">${U.money(f.overdue)}</dd></dl></div></div>`;
    },

    documents(s, d) {
      const req = S.settings().requiredDocs || [];
      return `<div class="grid g-side"><div class="card flush"><div class="card-head"><h3>Files</h3><button class="btn btn-primary btn-sm" id="upl">${ic("upload", 14)}Upload</button></div>
          ${d.docs.length ? `<div style="padding:8px 20px 20px">${d.docs.map((x) => `<div class="file-row">${UI.fileIcon(x.name)}<div class="grow" style="min-width:0"><div class="small strong truncate">${esc(x.name)}</div><div class="tiny faint">${esc(x.type)} · ${U.bytes(x.size || 0)} · ${U.fmtDate(x.uploadedAt)}${x.hasFile ? "" : " · metadata only"}</div></div>
            <label class="toggle tiny" title="Verified by office"><input type="checkbox" data-verify="${x.id}" ${x.verified ? "checked" : ""}><span class="track"></span>Verified</label>
            <button class="icon-btn sm" data-view="${x.id}" title="Open">${ic("eye", 15)}</button><button class="icon-btn sm" data-dl="${x.id}" title="Download">${ic("download", 15)}</button><button class="icon-btn sm" data-del="${x.id}" title="Delete">${ic("trash", 15)}</button></div>`).join("")}</div>` : UI.empty("folder", "No documents", "Upload ID proof, certificates and forms.")}</div>
        <div class="card"><div class="card-head"><h3>Required documents</h3></div><div class="check-list">${req.map((t) => { const has = d.docs.find((x) => x.type === t); return `<div class="check ${has ? "done" : ""}"><span class="box">${has ? ic("check", 12) : ""}</span><div class="grow">${esc(t)}</div>${has ? (has.verified ? '<span class="chip ok">Verified</span>' : '<span class="chip warn">Unverified</span>') : `<button class="btn btn-xs" data-req="${esc(t)}">Upload</button>`}</div>`; }).join("")}</div>
          <p class="tiny faint mt">Change the required list in Settings → Onboarding.</p></div></div>`;
    },

    tools(s, d) {
      const list = Array.from(new Set([...(d.c ? d.c.tools : []), ...Object.keys(s.tools || {})]));
      const all = sel.toolsFor(d.c).filter((t) => !list.includes(t));
      return `<div class="grid g-side"><div class="card"><div class="card-head"><div><h3>Tool knowledge</h3><div class="hint">Click a level to update — saved instantly</div></div></div>
          ${list.map((t) => { const v = (s.tools || {})[t] || 0; return `<div class="tool-row"><div class="strong small">${esc(t)}${d.c && d.c.tools.includes(t) ? "" : ' <span class="tiny faint">· extra</span>'}</div><div class="dots" data-tool="${esc(t)}">${[1, 2, 3, 4, 5].map((n) => `<button class="${n <= v ? "on" : ""}" data-lv="${n}" title="${sel.toolLevels[n]}"></button>`).join("")}</div><div class="small muted r">${sel.toolLevels[v]}</div></div>`; }).join("")}
          ${all.length ? `<div class="row wrap mt" style="gap:6px"><span class="small faint">Add tool:</span>${all.map((t) => `<button class="btn btn-xs" data-addtool="${esc(t)}">${ic("plus", 11)}${esc(t)}</button>`).join("")}</div>` : ""}</div>
        <div class="card"><div class="card-head"><h3>Currently using</h3></div><p class="small muted mb">Tools the student actively uses in their projects.</p>${UI.chipEditor("using", s.toolsUsing || (d.c ? d.c.tools.filter((t) => (s.tools || {})[t] >= 2) : []), "Add a tool…")}
          <div class="sep"></div><div class="small faint">Average level</div><div class="serif" style="font-size:27px">${sel.toolScore(s).toFixed(1)}<span class="small faint"> / 5</span></div></div></div>`;
    },

    notes(s, d) {
      const rs = d.remarks.slice().sort((x, y) => (x.date < y.date ? 1 : -1)), fs = d.fb.slice().sort((x, y) => (x.date < y.date ? 1 : -1));
      const avg = fs.length ? U.sum(fs, (x) => x.rating) / fs.length : 0;
      return `<div class="grid g-2"><div><div class="card-head"><div><h3 class="serif" style="font-size:16px">Mentor remarks</h3><div class="hint">Internal notes — never shared with the student</div></div><button class="btn btn-sm" data-add="remark">${ic("plus", 14)}Add remark</button></div>
          ${rs.length ? rs.map(noteHtml).join("") : `<div class="card">${UI.empty("message", "No remarks", "Track behaviour, progress and placement notes.")}</div>`}</div>
        <div><div class="card-head"><div><h3 class="serif" style="font-size:16px">Student feedback</h3><div class="hint">${fs.length ? `Average ${avg.toFixed(1)} ★ from ${fs.length}` : "What the student tells us"}</div></div><button class="btn btn-sm" data-add="feedback">${ic("plus", 14)}Log feedback</button></div>
          ${fs.length ? fs.map((x) => `<div class="note neutral" data-fb="${x.id}" style="cursor:pointer"><div class="n-head">${UI.stars(x.rating)}<span>· ${esc(x.category)}</span><span style="margin-left:auto">${U.fmtDate(x.date)}</span></div><p>${esc(x.text)}</p></div>`).join("") : `<div class="card">${UI.empty("star", "No feedback yet", "Log feedback from reviews and check-ins.")}</div>`}</div></div>`;
    },

    activity(s) {
      const acts = S.filter("activity", (a) => a.studentId === s.id);
      return `<div class="card" style="max-width:760px"><div class="timeline">${acts.map((a) => `<div class="tl-item"><span class="tl-dot">${ic(A.typeIcon(a.type), 13)}</span><div class="tl-body"><div class="t">${esc(a.text)}</div><div class="m">${new Date(a.at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</div></div></div>`).join("") || UI.empty("activity", "No activity", "Changes to this student are logged here automatically.")}</div></div>`;
    },
  };

  const subChip = (sub, future) => (sub ? UI.chip(sub.status) : future ? '<span class="chip muted plain">Upcoming</span>' : UI.chip("Not submitted"));
  const noteHtml = (r) => `<div class="note ${r.tone}" data-remark="${r.id}" style="cursor:pointer"><div class="n-head">${UI.chip(r.tone === "positive" ? "Positive" : r.tone === "concern" ? "Concern" : "Neutral", UI.tone(r.tone))}${r.tag ? `<span>${esc(r.tag)}</span>` : ""}<span style="margin-left:auto">${esc(r.author || "")} · ${U.fmtDate(r.date)}</span></div><p>${esc(r.text)}</p></div>`;

  function bindTab(el, s, tab) {
    const $ = (q) => el.querySelectorAll(q);
    $("[data-tabgo]").forEach((b) => (b.onclick = () => { tabState[s.id] = b.dataset.tabgo; A.refresh(); }));
    $("[data-status]").forEach((b) => (b.onclick = () => A.students.setStatus(s, b.dataset.status)));
    $("[data-editsec]").forEach((b) => (b.onclick = () => A.students.edit(s)));
    $("[data-sub]").forEach((b) => (b.onclick = () => A.reviews.open({ studentId: s.id, weekId: b.dataset.sub })));
    $("[data-subid]").forEach((r) => (r.onclick = () => A.reviews.open(S.get("submissions", r.dataset.subid))));
    $("[data-add]").forEach((b) => (b.onclick = () => A.profile[b.dataset.add](s)));
    $("[data-remark]").forEach((n) => (n.onclick = () => A.profile.remark(s, S.get("remarks", n.dataset.remark))));
    $("[data-fb]").forEach((n) => (n.onclick = () => A.profile.feedback(s, S.get("feedback", n.dataset.fb))));
    $("[data-proj]").forEach((n) => (n.onclick = () => A.profile.project(s, S.get("projects", n.dataset.proj))));
    $("[data-payid]").forEach((r) => (r.onclick = () => A.fees.editPayment(S.get("payments", r.dataset.payid))));
    const plan = el.querySelector("#plan"); if (plan) plan.onclick = () => A.fees.editPlan(s);
    const pay2 = el.querySelector("#pay2"); if (pay2) pay2.onclick = () => A.fees.recordPayment(s.id);
    const upl = el.querySelector("#upl"); if (upl) upl.onclick = () => A.docs.upload(s);
    $("[data-req]").forEach((b) => (b.onclick = () => A.docs.upload(s, b.dataset.req)));
    $("[data-verify]").forEach((c) => (c.onchange = () => S.update("documents", c.dataset.verify, { verified: c.checked }, { log: `Document ${c.checked ? "verified" : "unverified"}`, studentId: s.id })));
    $("[data-view]").forEach((b) => (b.onclick = () => A.files.open(S.get("documents", b.dataset.view))));
    $("[data-dl]").forEach((b) => (b.onclick = () => A.files.download(S.get("documents", b.dataset.dl))));
    $("[data-del]").forEach((b) => (b.onclick = async () => { const d = S.get("documents", b.dataset.del); if (await UI.confirm({ title: "Delete document?", text: d.name, danger: true, okLabel: "Delete" })) S.remove("documents", d.id, { log: `Document deleted — ${d.type}` }); }));
    $("[data-tool] button").forEach((b) => (b.onclick = () => {
      const t = b.parentElement.dataset.tool; const lv = +b.dataset.lv; const cur = (s.tools || {})[t] || 0;
      const v = cur === lv ? lv - 1 : lv;
      S.update("students", s.id, { tools: { ...(s.tools || {}), [t]: v } }, { log: `${t} knowledge → ${sel.toolLevels[v]}` });
    }));
    $("[data-addtool]").forEach((b) => (b.onclick = () => S.update("students", s.id, { tools: { ...(s.tools || {}), [b.dataset.addtool]: 1 } })));
    UI.bindChipEditor(el, "using", (vals) => S.update("students", s.id, { toolsUsing: vals }));
  }

  function exportProfile(s) {
    const f = sel.fee(s), c = sel.course(s), weeks = sel.weeks(c), p = sel.progress(s);
    A.exporter.xlsx(`Branzone_${s.code}_${sel.name(s).replace(/\s+/g, "_")}.xlsx`, [
      { name: "Profile", rows: Object.entries(A.exporter.studentRow(s)).map(([k, v]) => ({ Field: k, Value: v })) },
      { name: "Progress", rows: weeks.map((w, i) => { const x = p.byWeek[w.id]; return { Week: i + 1, Title: w.title, Goal: w.goal, Status: x ? x.status : "", Grade: x ? x.grade : "", Submitted: x ? x.submittedAt : "" }; }) },
      { name: "Payments", rows: f.pays.map((x) => ({ Date: x.date, Receipt: x.receipt, Amount: x.amount, Method: x.method, Reference: x.ref })) },
      { name: "Attendance", rows: sel.attendance(s).recs.slice().sort((a, b) => (a.date < b.date ? -1 : 1)).map((r) => ({ Date: r.date, Status: r.status })) },
      { name: "Tools", rows: Object.entries(s.tools || {}).map(([t, v]) => ({ Tool: t, Level: v, Label: sel.toolLevels[v] })) },
      { name: "Remarks", rows: sel.of("remarks", s.id).map((r) => ({ Date: r.date, Tone: r.tone, Author: r.author, Remark: r.text })) },
    ]).then(() => UI.toast("Profile exported", "ok"));
  }
})(window.App);
