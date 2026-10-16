/* Courses — catalogue and week-by-week curriculum (assignments, tasks, goals).
   Editing a week updates every enrolled student's progress view. */
(function (A) {
  const U = A.util, UI = A.ui, S = A.store, sel = A.sel, esc = U.esc, ic = UI.icon;
  const state = { track: "", open: new Set() };

  A.courses = {
    edit(c) {
      const fields = A.schema.fields.courses;
      UI.formDrawer({
        title: c ? "Edit course" : "New course", eyebrow: "Courses", fields, size: "lg",
        values: c || { track: "UI/UX", months: 3, hoursPerWeek: 12 },
        extra: `<div class="form-grid mt"><div class="form-section">Tools taught</div><div class="field span-2">${UI.chipEditor("tools", c ? c.tools : [], "Add a tool and press Enter")}</div>
          <div class="form-section">Programme goals</div><div class="field span-2">${UI.chipEditor("goals", c ? c.goals : [], "Add an outcome and press Enter")}</div>
          ${c ? "" : `<div class="field span-2"><label class="toggle"><input type="checkbox" id="genCur" checked><span class="track"></span>Generate the standard Branzone curriculum (4 weeks per month)</label></div>`}</div>`,
        onSave: (v, m) => {
          v.months = Number(v.months); v.tools = UI.readChips(m.body, "tools"); v.goals = UI.readChips(m.body, "goals");
          if (c) {
            S.update("courses", c.id, v, { log: `Course updated — ${v.name}`, studentId: null });
            UI.toast("Course saved", "ok");
          } else {
            const gen = m.body.querySelector("#genCur").checked;
            const rec = S.insert("courses", { ...v, weeks: gen ? A.curriculum.build(v.track, v.months * 4) : [] }, { log: `Course created — ${v.name}`, studentId: null });
            if (!v.tools.length) S.update("courses", rec.id, { tools: sel.toolsFor(rec).slice(0, 4) });
            UI.toast("Course created", "ok"); A.navigate("courses/" + rec.id);
          }
        },
      });
    },
    duplicate(c) {
      const copy = JSON.parse(JSON.stringify(c)); delete copy.id;
      copy.name = c.name + " (copy)"; copy.weeks = copy.weeks.map((w) => ({ ...w, id: U.uid("wk") }));
      const rec = S.insert("courses", copy, { log: `Course duplicated — ${c.name}`, studentId: null });
      UI.toast("Course duplicated", "ok"); A.navigate("courses/" + rec.id);
    },
    async remove(c) {
      const chk = S.canRemove("courses", c.id);
      if (!chk.ok) return UI.toast(`Can't delete: ${chk.reason}`, "bad");
      if (!(await UI.confirm({ title: `Delete ${c.name}?`, text: "The course and its curriculum will be removed. Past submissions keep their history.", danger: true, okLabel: "Delete" }))) return;
      S.remove("courses", c.id, { log: `Course deleted — ${c.name}` }); A.navigate("courses");
    },
    editWeek(c, w, insertAt) {
      const fields = A.schema.fields.week;
      const idx = w ? c.weeks.indexOf(w) : insertAt != null ? insertAt : c.weeks.length;
      UI.formDrawer({
        title: w ? `Week ${idx + 1}` : "Add week", eyebrow: c.name, fields,
        values: w ? { ...w, tasksText: (w.tasks || []).join("\n") } : { phase: (c.weeks[idx - 1] || c.weeks[0] || {}).phase || "" },
        onSave: (v) => {
          const rec = { title: v.title, phase: v.phase, topics: v.topics, assignment: v.assignment, goal: v.goal, tasks: v.tasksText.split("\n").map((t) => t.trim()).filter(Boolean) };
          const weeks = c.weeks.slice();
          if (w) weeks[idx] = { ...w, ...rec }; else weeks.splice(idx, 0, { id: U.uid("wk"), ...rec });
          S.update("courses", c.id, { weeks }, { log: `${c.name}: week ${idx + 1} ${w ? "updated" : "added"}`, studentId: null });
          UI.toast("Curriculum saved", "ok");
        },
        onDelete: w ? () => { S.update("courses", c.id, { weeks: c.weeks.filter((x) => x !== w) }, { log: `${c.name}: week removed — ${w.title}`, studentId: null }); } : null,
      });
    },
  };

  A.register({
    id: "courses", label: "Courses", icon: "book", group: "academics", order: 30, route: "courses", routes: ["courses/:id"],
    render(el, params) { return params.id ? detail(el, params.id) : catalogue(el); },
  });

  function catalogue(el) {
    const courses = S.all("courses").filter((c) => !state.track || c.track === state.track).sort((a, b) => (a.track === b.track ? a.months - b.months : a.track < b.track ? 1 : -1));
    const groups = U.groupBy(courses, (c) => c.track);
    el.innerHTML = `<div class="page">
      ${UI.pageHead({ eyebrow: "Academics", title: "Programmes & <em>curriculum</em>", sub: "Three, six and twelve-month tracks in UI/UX and Graphic Design. Open a course to edit weekly assignments, tasks and goals.",
        actions: `${UI.seg("track", [{ value: "", label: "All" }, { value: "UI/UX", label: "UI/UX" }, { value: "Graphic Design", label: "Graphic" }], state.track)}<button class="btn" data-exp data-perm="export">${ic("download", 15)}Export</button><button class="btn btn-primary" id="newC" data-perm="courses.edit">${ic("plus", 15)}New course</button>` })}
      ${Object.entries(groups).map(([track, list]) => `<div class="phase-head mt-lg"><h4 style="font-size:20px">${esc(track)}</h4><span>${U.plural(list.length, "programme")}</span></div>
        <div class="grid g-3">${list.map((c) => {
          const enrolled = sel.enrolled().filter((s) => s.courseId === c.id);
          const avg = enrolled.length ? U.sum(enrolled, (s) => sel.progress(s).pct) / enrolled.length : 0;
          return `<div class="card course-card" data-href="courses/${c.id}">
            <div class="row between">${UI.track(c)}<span class="mono small faint">${U.money(c.fee)}</span></div>
            <div><div class="c-dur">${c.months}<small>months</small></div><h3 class="mt" style="margin-top:12px">${esc(c.name)}</h3><p class="small muted" style="margin-top:6px">${esc(c.description || "")}</p></div>
            <div class="row wrap" style="gap:6px">${(c.tools || []).slice(0, 5).map((t) => `<span class="tag">${esc(t)}</span>`).join("")}${(c.tools || []).length > 5 ? `<span class="tag">+${c.tools.length - 5}</span>` : ""}</div>
            <div class="stat-list"><div><div class="s-label">Weeks</div><div class="s-value">${c.weeks.length}</div></div><div><div class="s-label">Enrolled</div><div class="s-value">${enrolled.length}</div></div><div><div class="s-label">Avg progress</div><div class="s-value">${Math.round(avg * 100)}%</div></div></div>
          </div>`; }).join("")}</div>`).join("") || `<div class="card">${UI.empty("book", "No courses", "Create your first programme.")}</div>`}
    </div>`;
    UI.bindSeg(el, "track", (v) => { state.track = v; A.refresh(); });
    el.querySelector("#newC").onclick = () => A.courses.edit(null);
    el.querySelector("[data-exp]").onclick = () => A.exporter.run("courses");
  }

  function detail(el, id) {
    const c = S.get("courses", id);
    if (!c) { el.innerHTML = `<div class="page">${UI.empty("book", "Course not found", "It may have been deleted.", '<a class="btn" href="#/courses">All courses</a>')}</div>`; return; }
    const enrolled = S.filter("students", (s) => s.courseId === c.id && s.status !== "Dropped");
    const phases = U.groupBy(c.weeks.map((w, i) => ({ w, i })), (x) => x.w.phase || "Curriculum");
    const subs = S.filter("submissions", (x) => x.courseId === c.id);
    const weekStats = (w) => { const xs = subs.filter((x) => x.weekId === w.id); return { approved: xs.filter((x) => x.status === "Approved").length, pending: xs.filter((x) => x.status === "Submitted").length }; };
    const onWeek = (w) => enrolled.filter((s) => { const p = sel.progress(s); return p.current && p.current.id === w.id && s.status === "Active"; }).length;
    el.innerHTML = `<div class="page">
      <div class="eyebrow"><a href="#/courses">Courses</a> ${ic("chevR", 12)} <span>${esc(c.track)}</span></div>
      ${UI.pageHead({ title: esc(c.name), sub: esc(c.description || ""), actions: `<button class="btn" id="dup" data-perm="courses.edit">${ic("copy", 15)}Duplicate</button><button class="btn" id="ed" data-perm="courses.edit">${ic("edit", 15)}Edit course</button><button class="icon-btn" id="del" title="Delete" data-perm="courses.delete">${ic("trash", 16)}</button>` })}
      <section class="grid g-4">
        ${UI.kpi({ label: "Duration", icon: "clock", value: c.months, unit: "months", sub: `${c.weeks.length} weeks · ${c.hoursPerWeek || "—"} hrs/week` })}
        ${UI.kpi({ label: "Course fee", icon: "wallet", value: U.moneyShort(c.fee), sub: esc(c.certificate || "") })}
        ${UI.kpi({ label: "Enrolled now", icon: "users", value: enrolled.filter((s) => s.status === "Active" || s.status === "Onboarding").length, sub: `${enrolled.filter((s) => s.status === "Completed").length} graduated` })}
        ${UI.kpi({ label: "Awaiting review", icon: "inbox", value: subs.filter((x) => x.status === "Submitted").length, sub: `${subs.filter((x) => x.status === "Approved").length} approved so far`, href: "submissions" })}
      </section>
      <section class="grid g-side mt">
        <div class="card"><div class="card-head"><div><h3>Curriculum</h3><div class="hint">Click a week to expand · edit to change assignments, tasks and goals</div></div><button class="btn btn-sm" id="addW" data-perm="courses.edit">${ic("plus", 14)}Add week</button></div>
          ${Object.entries(phases).map(([ph, list]) => `<div class="phase-head"><h4>${esc(ph)}</h4><span>Weeks ${list[0].i + 1}–${list[list.length - 1].i + 1}</span></div>
            ${list.map(({ w, i }) => { const st = weekStats(w), here = onWeek(w); return `<details class="week" data-wid="${w.id}" ${state.open.has(w.id) ? "open" : ""}><summary><div class="week-no">Week<b>${i + 1}</b></div><div style="min-width:0"><div class="w-title strong">${esc(w.title)}</div><div class="small faint truncate">${esc(w.assignment || "")}</div></div>
              <div class="row" style="gap:6px">${here ? `<span class="chip accent">${here} here now</span>` : ""}${st.pending ? `<span class="chip info">${st.pending} to review</span>` : ""}<span class="chip ok plain" title="Approved submissions">${st.approved}</span><button class="icon-btn sm" data-ew="${w.id}" title="Edit week">${ic("edit", 14)}</button></div></summary>
              <div class="w-body"><div><h5>Topics</h5><p>${esc(w.topics || "—")}</p><h5 style="margin-top:14px">Assignment</h5><p>${esc(w.assignment || "—")}</p></div><div><h5>Tasks</h5>${(w.tasks || []).length ? `<ul>${w.tasks.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>` : "<p>—</p>"}<h5 style="margin-top:14px">Goal</h5><p>${ic("target", 12)} ${esc(w.goal || "—")}</p></div>
              <div class="row" style="grid-column:1/-1;gap:6px"><button class="btn btn-xs" data-ins="${i}">${ic("plus", 11)}Insert week before</button><button class="btn btn-xs" data-ins="${i + 1}">${ic("plus", 11)}Insert after</button></div></div></details>`; }).join("")}`).join("") || UI.empty("book", "No weeks yet", "Add the first week of this curriculum.")}
        </div>
        <div class="stack">
          <div class="card"><div class="card-head"><h3>Programme goals</h3></div>${(c.goals || []).length ? `<div class="list">${c.goals.map((g) => `<div class="list-item small">${ic("target", 14)}${esc(g)}</div>`).join("")}</div>` : '<p class="small faint">No goals yet — add them via Edit course.</p>'}</div>
          <div class="card"><div class="card-head"><h3>Tools taught</h3></div><div class="row wrap" style="gap:6px">${(c.tools || []).map((t) => `<span class="tag">${esc(t)}</span>`).join("") || '<span class="small faint">None</span>'}</div></div>
          <div class="card flush"><div class="card-head"><h3>Students</h3><span class="small faint">${enrolled.length}</span></div>
            <div style="padding:6px 20px 16px">${enrolled.map((s) => { const p = sel.progress(s); return `<div class="list-item link" data-href="students/${s.id}">${UI.person(s, `Week ${p.currentWeek} · ${esc(s.status)}`)}<div style="margin-left:auto;width:110px">${UI.barRow(p.pct)}</div></div>`; }).join("") || '<p class="small faint">No students enrolled.</p>'}</div></div>
        </div>
      </section></div>`;
    el.querySelector("#ed").onclick = () => A.courses.edit(c);
    el.querySelector("#dup").onclick = () => A.courses.duplicate(c);
    el.querySelector("#del").onclick = () => A.courses.remove(c);
    el.querySelector("#addW").onclick = () => A.courses.editWeek(c, null);
    el.querySelectorAll("[data-ew]").forEach((b) => (b.onclick = (e) => { e.preventDefault(); e.stopPropagation(); A.courses.editWeek(c, c.weeks.find((w) => w.id === b.dataset.ew)); }));
    el.querySelectorAll("details[data-wid]").forEach((d) => d.addEventListener("toggle", () => (d.open ? state.open.add(d.dataset.wid) : state.open.delete(d.dataset.wid))));
    el.querySelectorAll("[data-ins]").forEach((b) => (b.onclick = () => A.courses.editWeek(c, null, +b.dataset.ins)));
  }
})(window.App);
