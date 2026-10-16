/* Reviews — the weekly assignment queue. Approving a submission marks that
   week's goal as achieved on the student profile and moves course progress. */
(function (A) {
  const U = A.util, UI = A.ui, S = A.store, sel = A.sel, esc = U.esc, ic = UI.icon;
  const state = { status: "Submitted", course: "", q: "" };

  A.reviews = {
    open(subOrNew) {
      const isNew = !subOrNew.id;
      const s = S.get("students", subOrNew.studentId);
      const c = isNew ? sel.course(s) : S.get("courses", subOrNew.courseId) || sel.course(s);
      const w = c && c.weeks.find((x) => x.id === subOrNew.weekId);
      const existing = isNew ? sel.progress(s).byWeek[subOrNew.weekId] : subOrNew;
      const sub = existing || { studentId: s.id, courseId: c ? c.id : null, weekId: subOrNew.weekId, title: w ? w.assignment : "", status: "Submitted", submittedAt: U.today() };
      const fields = [
        { key: "title", label: "Assignment", required: true, span: 2 },
        { key: "submittedAt", label: "Submitted on", type: "date", required: true },
        { key: "status", label: "Review status", type: "select", options: () => ["Submitted", "Needs revision", "Approved"], placeholder: false },
        { key: "link", label: "Link (Figma / Behance / Drive)", span: 2 },
        { key: "grade", label: "Grade", type: "select", options: A.schema.opts.list("grades") },
        { key: "reviewer", label: "Reviewed by" },
        { key: "feedback", label: "Mentor feedback", type: "textarea", span: 2, rows: 4 },
      ];
      UI.formDrawer({
        title: w ? `Week ${c.weeks.indexOf(w) + 1} · ${w.title}` : "Submission", eyebrow: `${sel.name(s)} · ${s.code}`, fields,
        values: { reviewer: S.settings().adminName, ...sub },
        sub: w ? `Goal: ${esc(w.goal)}` : "",
        saveLabel: existing ? "Save review" : "Log submission",
        extra: w ? `<div class="note neutral mt"><div class="n-head">${ic("inbox", 13)}Brief</div><p>${esc(w.assignment)}</p>${(w.tasks || []).length ? `<ul class="small muted" style="margin:8px 0 0;padding-left:18px">${w.tasks.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>` : ""}</div>` : "",
        onSave: (v) => {
          if (existing && existing.id) {
            const was = existing.status;
            S.update("submissions", existing.id, v, { log: was !== v.status ? `Week ${w ? c.weeks.indexOf(w) + 1 : ""} ${v.status.toLowerCase()}${v.status === "Approved" && w ? " — goal achieved: " + w.goal : ""}` : "Submission updated", type: "submissions" });
          } else {
            S.insert("submissions", { ...sub, ...v }, { log: `Week ${w ? c.weeks.indexOf(w) + 1 : ""} submission logged`, type: "submissions" });
          }
          UI.toast(v.status === "Approved" ? "Approved — goal marked achieved" : "Saved", "ok");
        },
        onDelete: existing && existing.id ? () => S.remove("submissions", existing.id) : null,
      });
    },
  };

  A.register({
    id: "submissions", label: "Reviews", icon: "inbox", group: "academics", order: 31, route: "submissions",
    badge: () => { const n = S.count("submissions", (x) => x.status === "Submitted"); return n ? { n, hot: false } : null; },
    render(el) {
      const counts = {}; S.all("submissions").forEach((x) => (counts[x.status] = (counts[x.status] || 0) + 1));
      const n = U.norm(state.q);
      const rows = S.all("submissions").filter((x) => (!state.status || x.status === state.status) && (!state.course || x.courseId === state.course))
        .map((x) => ({ x, s: S.get("students", x.studentId), c: S.get("courses", x.courseId) })).filter((r) => r.s && (!n || U.norm(sel.name(r.s) + " " + r.x.title).includes(n)))
        .sort((a, b) => ((a.x.submittedAt || "") < (b.x.submittedAt || "") ? (state.status === "Submitted" ? -1 : 1) : state.status === "Submitted" ? 1 : -1));
      el.innerHTML = `<div class="page">
        ${UI.pageHead({ eyebrow: "Academics", title: "Assignment <em>reviews</em>", sub: "Weekly submissions from every programme. Approving one marks the week's goal as achieved and updates the student's progress.", actions: `<button class="btn" id="exp" data-perm="export">${ic("download", 15)}Export</button>` })}
        <div class="filters">${UI.seg("st", [{ value: "Submitted", label: "Awaiting review", count: counts.Submitted || 0 }, { value: "Needs revision", label: "Needs revision", count: counts["Needs revision"] || 0 }, { value: "Approved", label: "Approved", count: counts.Approved || 0 }, { value: "", label: "All" }], state.status)}
          <div class="input-icon">${ic("search", 15)}<input class="input" id="q" placeholder="Search student or assignment" value="${esc(state.q)}"></div>
          <select class="input" id="fc"><option value="">All courses</option>${S.all("courses").map((c) => `<option value="${c.id}" ${state.course === c.id ? "selected" : ""}>${esc(c.name)}</option>`).join("")}</select></div>
        <div class="card flush">${UI.table({ rows: rows.slice(0, 300), rowAttr: (r) => `data-sid="${r.x.id}"`, cols: [
          { key: "s", label: "Student", sortable: false, render: (r) => UI.person(r.s, esc(sel.courseLabel(r.c))) },
          { key: "w", label: "Week", sortable: false, render: (r) => { const i = r.c ? r.c.weeks.findIndex((w) => w.id === r.x.weekId) : -1; return `<span class="mono">W${i + 1}</span>`; } },
          { key: "t", label: "Assignment", sortable: false, render: (r) => `<div class="strong truncate" style="max-width:360px">${esc(r.x.title)}</div>${r.x.feedback ? `<div class="tiny faint truncate" style="max-width:360px">${esc(r.x.feedback)}</div>` : ""}` },
          { key: "d", label: "Submitted", sortable: false, render: (r) => `${U.fmtShort(r.x.submittedAt)}<div class="tiny faint">${U.daysBetween(r.x.submittedAt, U.today())}d ago</div>` },
          { key: "g", label: "Grade", sortable: false, render: (r) => esc(r.x.grade || "—") },
          { key: "st", label: "Status", sortable: false, render: (r) => UI.chip(r.x.status) },
          { key: "a", label: "", sortable: false, align: "right", render: (r) => (r.x.status !== "Approved" ? `<button class="btn btn-xs" data-approve="${r.x.id}">${ic("check", 12)}Approve</button>` : "") },
        ], empty: UI.empty("inbox", state.status === "Submitted" ? "Inbox zero" : "Nothing here", state.status === "Submitted" ? "Every submission has been reviewed." : "No submissions match the filters.") })}</div>
      </div>`;
      UI.bindSeg(el, "st", (v) => { state.status = v; A.refresh(); });
      el.querySelector("#fc").onchange = (e) => { state.course = e.target.value; A.refresh(); };
      const q = el.querySelector("#q"); q.oninput = U.debounce(() => { state.q = q.value; A.refresh(); setTimeout(() => { const n = document.getElementById("q"); n && (n.focus(), n.setSelectionRange(n.value.length, n.value.length)); }); }, 180);
      el.querySelector("#exp").onclick = () => A.exporter.run("submissions");
      el.querySelectorAll("[data-sid]").forEach((r) => (r.onclick = (e) => { if (e.target.closest("button")) return; A.reviews.open(S.get("submissions", r.dataset.sid)); }));
      el.querySelectorAll("[data-approve]").forEach((b) => (b.onclick = () => {
        const x = S.get("submissions", b.dataset.approve); const c = S.get("courses", x.courseId); const w = c && c.weeks.find((w) => w.id === x.weekId);
        S.update("submissions", x.id, { status: "Approved", grade: x.grade || "A", reviewer: S.settings().adminName }, { log: `Week ${w ? c.weeks.indexOf(w) + 1 : ""} approved${w ? " — goal achieved: " + w.goal : ""}`, type: "submissions" });
        UI.toast("Approved", "ok");
      }));
    },
  });
})(window.App);
