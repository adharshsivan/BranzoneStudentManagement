/* Students — the master list. Every column is derived live from other modules. */
(function (A) {
  const U = A.util, UI = A.ui, S = A.store, sel = A.sel, esc = U.esc, ic = UI.icon;
  const state = { q: "", course: "", status: "enrolled", batch: "", fee: "", sort: "name", dir: "asc" };

  /* Shared student actions (used by profile, onboarding, palette) */
  A.students = {
    edit(s, section) {
      const fields = A.schema.fields.students.filter((f) => !section || f.section === section);
      UI.formDrawer({
        title: section ? `Edit ${section.toLowerCase()} details` : "Edit student", eyebrow: s.code, fields, values: s, size: "lg",
        onSave: (v) => {
          const courseChanged = v.courseId && v.courseId !== s.courseId;
          if (v.batchId !== undefined && v.batchId !== s.batchId && s.computerId) {
            const clash = sel.seatTaken(s.computerId, v.batchId || null, s.id);
            if (clash) { v.computerId = null; UI.toast(`Seat ${sel.seatLabel(s)} is taken in that batch — seat released.`, "warn"); }
          }
          S.update("students", s.id, { ...v, batchId: v.batchId === "" ? null : v.batchId }, { log: courseChanged ? `Moved to ${S.get("courses", v.courseId).name}` : "Profile details updated" });
          if (courseChanged) {
            const c = S.get("courses", v.courseId); const tools = {}; c.tools.forEach((t) => (tools[t] = (s.tools || {})[t] || 0));
            S.update("students", s.id, { tools: { ...(s.tools || {}), ...tools } });
            UI.toast("Course changed — fee plan kept. Review it in the Fees tab.", "warn");
          } else UI.toast("Saved", "ok");
        },
      });
    },
    async remove(s) {
      const ok = await UI.confirm({ title: `Delete ${sel.name(s)}?`, text: "This permanently removes the student with their payments, attendance, documents, submissions, remarks and feedback. Consider marking them Dropped instead.", danger: true, okLabel: "Delete permanently" });
      if (!ok) return;
      S.remove("students", s.id, { log: `Deleted student ${sel.name(s)} (${s.code})` });
      UI.toast("Student deleted", "ok"); A.navigate("students");
    },
    setStatus(s, status) { S.update("students", s.id, { status }, { log: `Status changed to ${status}` }); UI.toast(`Marked ${status}`, "ok"); },
  };

  function filtered() {
    const n = U.norm(state.q);
    return S.all("students").filter((s) => {
      if (state.status === "enrolled" ? !["Active", "Onboarding"].includes(s.status) : state.status && s.status !== state.status) return false;
      if (state.course && (state.course === "UI/UX" || state.course === "Graphic Design" ? (sel.course(s) || {}).track !== state.course : s.courseId !== state.course)) return false;
      if (state.batch && s.batchId !== state.batch) return false;
      if (state.fee && sel.fee(s).status !== state.fee) return false;
      if (n && !U.norm(`${sel.name(s)} ${s.code} ${String(s.phone || "").replace(/\D/g, "")} ${s.email} ${s.city}`).includes(n)) return false;
      return true;
    });
  }

  A.register({
    id: "students", label: "Students", icon: "users", group: "people", order: 20, route: "students",
    badge: () => S.count("students", (s) => s.status === "Active"),
    render(el) {
      const rows = filtered();
      const counts = {}; S.all("students").forEach((s) => (counts[s.status] = (counts[s.status] || 0) + 1));
      const statuses = [{ value: "enrolled", label: "Enrolled", count: (counts.Active || 0) + (counts.Onboarding || 0) }, ...S.settings().lists.statuses.map((x) => ({ value: x, label: x, count: counts[x] || 0 })), { value: "", label: "All", count: S.all("students").length }];
      const cols = [
        { key: "name", label: "Student", sort: (s) => sel.name(s), render: (s) => UI.person(s, `<span class="mono">${esc(s.code)}</span> · ${esc(s.phone || "")}`) },
        { key: "course", label: "Programme", sort: (s) => (sel.course(s) || {}).name, render: (s) => { const c = sel.course(s); return c ? `<div class="row" style="gap:8px">${UI.track(c)}<span class="small truncate" style="max-width:170px">${esc(c.level || "")}</span></div>` : "—"; } },
        { key: "batch", label: "Batch", sort: (s) => (sel.batch(s) || {}).name, render: (s) => { const b = sel.batch(s); return b ? `<div class="small">${esc(b.name)}</div><div class="tiny faint mono">${esc(sel.seatLabel(s))}</div>` : '<span class="faint">—</span>'; } },
        { key: "att", label: "Attendance", sort: (s) => sel.att30(s).rate || 0, render: (s) => { const a = sel.att30(s); return a.rate == null ? '<span class="faint small">No records</span>' : UI.barRow(a.rate, U.pct(a.rate), UI.attTone(a.rate)); }, width: "150px" },
        { key: "prog", label: "Progress", sort: (s) => sel.progress(s).pct, render: (s) => { const p = sel.progress(s); return `<div style="min-width:120px">${UI.barRow(p.pct, `${p.approvedCount}/${p.total}`)}<div class="tiny faint" style="margin-top:4px">Week ${p.currentWeek} · ${esc(p.standing)}</div></div>`; }, width: "170px" },
        { key: "fee", label: "Fees", sort: (s) => sel.fee(s).balance, render: (s) => { const f = sel.fee(s); return `${UI.chip(f.status)}<div class="tiny faint" style="margin-top:4px">${f.balance ? U.money(f.balance) + " due" : "Settled"}</div>`; } },
        { key: "status", label: "Status", sort: (s) => s.status, render: (s) => UI.chip(s.status) },
      ];
      el.innerHTML = `<div class="page">
        ${UI.pageHead({ eyebrow: "Students", title: "Student <em>directory</em>", sub: "Everyone who has enrolled with Branzone — attendance, progress and fees update live from their modules.",
          actions: `<button class="btn" id="exp" data-perm="export">${ic("download", 15)}Export view</button><button class="btn btn-primary" data-act="newStudent" data-perm="students.edit">${ic("userPlus", 15)}New student</button>` })}
        <div class="filters">
          <div class="input-icon">${ic("search", 15)}<input class="input" id="q" placeholder="Search name, ID, phone, email, city" value="${esc(state.q)}"></div>
          <select class="input" id="fCourse"><option value="">All programmes</option><option value="UI/UX" ${state.course === "UI/UX" ? "selected" : ""}>All UI/UX</option><option value="Graphic Design" ${state.course === "Graphic Design" ? "selected" : ""}>All Graphic Design</option>${S.all("courses").map((c) => `<option value="${c.id}" ${state.course === c.id ? "selected" : ""}>${esc(c.name)}</option>`).join("")}</select>
          <select class="input" id="fBatch"><option value="">All batches</option>${S.all("batches").map((b) => `<option value="${b.id}" ${state.batch === b.id ? "selected" : ""}>${esc(b.name)}</option>`).join("")}</select>
          <select class="input" id="fFee"><option value="">Any fee status</option>${["Paid", "Partial", "Pending", "Overdue"].map((x) => `<option ${state.fee === x ? "selected" : ""}>${x}</option>`).join("")}</select>
        </div>
        <div class="row between mb wrap">${UI.seg("status", statuses, state.status)}<span class="faint small">${U.plural(rows.length, "student")}</span></div>
        <div class="card flush">${UI.table({ cols, rows, state, rowAttr: (s) => `data-href="students/${s.id}"`, empty: UI.empty("users", "No students match", "Adjust the filters or onboard a new student.", `<button class="btn btn-primary" data-act="newStudent">${ic("plus", 14)}New student</button>`) })}</div>
      </div>`;
      const q = el.querySelector("#q");
      q.oninput = U.debounce(() => { state.q = q.value; A.refresh(); setTimeout(() => { const n = document.getElementById("q"); if (n) { n.focus(); n.setSelectionRange(n.value.length, n.value.length); } }); }, 180);
      el.querySelector("#fCourse").onchange = (e) => { state.course = e.target.value; A.refresh(); };
      el.querySelector("#fBatch").onchange = (e) => { state.batch = e.target.value; A.refresh(); };
      el.querySelector("#fFee").onchange = (e) => { state.fee = e.target.value; A.refresh(); };
      UI.bindSeg(el, "status", (v) => { state.status = v; A.refresh(); });
      UI.bindSort(el, state, A.refresh);
      el.querySelector("#exp").onclick = () => A.exporter.run("students", { rows: filtered(), suffix: "filtered_" + U.today() });
    },
  });
})(window.App);
