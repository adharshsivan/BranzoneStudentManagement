/* Attendance — one-click daily marking and a monthly register. */
(function (A) {
  const U = A.util, UI = A.ui, S = A.store, sel = A.sel, esc = U.esc, ic = UI.icon;
  const state = { view: "daily", date: U.today(), batch: "", month: U.today().slice(0, 7), q: "" };
  const LABEL = { P: "Present", A: "Absent", L: "Late", E: "Excused" };

  A.actions.markAttendance = { label: "Mark today's attendance", icon: "calendar", perm: "attendance.view", run: () => { state.view = "daily"; state.date = U.today(); A.navigate("attendance"); } };

  const roster = (date, batch) => S.filter("students", (s) => (s.status === "Active" || s.status === "Onboarding") && (!s.startDate || s.startDate <= date) && (!batch || s.batchId === batch)).sort((a, b) => sel.name(a).localeCompare(sel.name(b)));
  const mark = (studentId, date, status) => {
    const id = `${date}_${studentId}`; const cur = S.get("attendance", id);
    if (cur && cur.status === status) S.remove("attendance", id);
    else S.upsert("attendance", { id, date, studentId, status });
  };

  A.register({
    id: "attendance", label: "Attendance", icon: "calendar", group: "people", order: 22, route: "attendance",
    render(el) {
      if (!state.batch && S.all("batches").length) {
        const h = new Date().getHours(); const b = S.all("batches");
        state.batch = (h < 13 ? b[0] : h < 17 ? b[1] || b[0] : b[2] || b[b.length - 1]).id;
      }
      el.innerHTML = `<div class="page">
        ${UI.pageHead({ eyebrow: "Students", title: "Attendance", sub: "Tap P, A, L or E for each student. Rates feed into profiles, the dashboard and the attention list instantly.",
          actions: `${UI.seg("view", [{ value: "daily", label: "Daily", icon: "check" }, { value: "register", label: "Monthly register", icon: "sheet" }], state.view)}` })}
        ${state.view === "daily" ? daily() : register()}
      </div>`;
      UI.bindSeg(el, "view", (v) => { state.view = v; A.refresh(); });
      UI.bindSeg(el, "batch", (v) => { state.batch = v; A.refresh(); });
      const $ = (q) => el.querySelector(q);
      if (state.view === "daily") {
        $("#dtPrev").onclick = () => { state.date = U.addDays(state.date, -1); A.refresh(); };
        $("#dtNext").onclick = () => { state.date = U.addDays(state.date, 1); A.refresh(); };
        $("#dt").onchange = (e) => { state.date = e.target.value || U.today(); A.refresh(); };
        $("#todayBtn") && ($("#todayBtn").onclick = () => { state.date = U.today(); A.refresh(); });
        el.querySelectorAll("[data-mark]").forEach((b) => (b.onclick = () => mark(b.dataset.sid, state.date, b.dataset.mark)));
        $("#allP").onclick = () => {
          const list = roster(state.date, state.batch); const m = sel.attOn(state.date); let n = 0;
          S.batch(() => list.forEach((s) => { if (!m[s.id]) { S.upsert("attendance", { id: `${state.date}_${s.id}`, date: state.date, studentId: s.id, status: "P" }); n++; } }));
          const b = S.get("batches", state.batch);
          S.log(`Attendance marked for ${b ? b.name : "all"} batch — ${U.fmtShort(state.date)}`, null, "attendance");
          UI.toast(n ? `${n} marked present` : "Everyone is already marked", "ok");
        };
        $("#clr").onclick = async () => {
          if (!(await UI.confirm({ title: "Clear marks for this day?", text: "Removes attendance for the students shown.", danger: true, okLabel: "Clear" }))) return;
          const ids = new Set(roster(state.date, state.batch).map((s) => s.id));
          S.removeWhere("attendance", (a) => a.date === state.date && ids.has(a.studentId));
        };
      } else {
        $("#month").onchange = (e) => { state.month = e.target.value || U.today().slice(0, 7); A.refresh(); };
        $("#monthPrev").onclick = () => { state.month = U.addMonths(state.month + "-01", -1).slice(0, 7); A.refresh(); };
        $("#monthNext").onclick = () => { state.month = U.addMonths(state.month + "-01", 1).slice(0, 7); A.refresh(); };
        $("#expReg").onclick = () => A.exporter.run("attendance", { month: state.month, batchId: state.batch, suffix: state.month });
        el.querySelectorAll("[data-cell]").forEach((c) => (c.onclick = () => {
          const [sid, date] = c.dataset.cell.split("|"); const cur = (S.get("attendance", `${date}_${sid}`) || {}).status;
          const order = ["P", "A", "L", "E", null]; const nx = order[(order.indexOf(cur || null) + 1) % order.length];
          if (nx) S.upsert("attendance", { id: `${date}_${sid}`, date, studentId: sid, status: nx }); else S.remove("attendance", `${date}_${sid}`);
        }));
      }
    },
  });

  function batchSeg() {
    const opts = [...S.all("batches").map((b) => ({ value: b.id, label: b.name, count: S.count("students", (s) => s.batchId === b.id && (s.status === "Active" || s.status === "Onboarding")) })), { value: "", label: "All" }];
    return UI.seg("batch", opts, state.batch);
  }

  /* Compact date control: ‹ Fri, 16 Oct 2026 › — the label opens the native picker */
  const dateBar = (id, label, value, type) => `<div class="datebar"><button class="icon-btn sm" id="${id}Prev" title="Previous">${ic("chevL", 16)}</button>
    <label class="db-label">${ic("calendar", 14)}<span>${label}</span><input type="${type}" id="${id}" value="${value}"></label>
    <button class="icon-btn sm" id="${id}Next" title="Next">${ic("chevR", 16)}</button></div>`;

  function daily() {
    const list = roster(state.date, state.batch);
    const m = sel.attOn(state.date);
    const c = { P: 0, A: 0, L: 0, E: 0 }; list.forEach((s) => m[s.id] && c[m[s.id].status]++);
    const unmarked = list.filter((s) => !m[s.id]).length;
    const b = S.get("batches", state.batch);
    const sunday = U.isSunday(state.date), isToday = state.date === U.today();
    const d = U.parse(state.date);
    const counted = c.P + c.L + c.A;
    return `<div class="row between wrap mb" style="gap:12px">
        <div class="row" style="gap:8px">${dateBar("dt", `${U.DAYS[d.getDay()].slice(0, 3)}, ${U.fmtDate(state.date)}`, state.date, "date")}${isToday ? '<span class="chip accent plain">Today</span>' : `<button class="btn btn-sm btn-ghost" id="todayBtn">Back to today</button>`}</div>
        ${batchSeg()}
      </div>
      ${sunday ? `<div class="banner">${ic("alert", 18)}<div>Sunday — the studio is normally closed. Marks are still allowed for special sessions.</div></div>` : ""}
      <div class="card flush">
        <div class="card-head"><div><h3>${b ? esc(b.name) + " batch" : "All batches"}</h3><div class="hint">${b ? esc(b.time) + (b.mentor ? " · " + esc(b.mentor) : "") : U.plural(list.length, "student")}</div></div>
          <div class="row"><button class="btn btn-sm btn-ghost" id="clr">Clear</button><button class="btn btn-sm btn-primary" id="allP" data-perm="attendance.edit">${ic("check", 14)}Mark rest present</button></div></div>
        <div class="att-summary">
          <div class="as-bar">${list.length ? ["P", "L", "A", "E"].map((k) => (c[k] ? `<i class="${k}" style="flex:${c[k]}"></i>` : "")).join("") + (unmarked ? `<i class="U" style="flex:${unmarked}"></i>` : "") : ""}</div>
          <div class="as-legend">${["P", "L", "A", "E"].map((k) => `<span><i class="${k}"></i>${LABEL[k]} <b>${c[k]}</b></span>`).join("")}<span><i class="U"></i>Unmarked <b>${unmarked}</b></span><span class="as-rate">${counted ? Math.round(((c.P + c.L) / counted) * 100) + "% present" : "Nothing marked yet"}</span></div>
        </div>
        ${list.length ? UI.table({ cols: [
          { key: "n", label: "Student", sortable: false, render: (s) => `<a href="#/students/${s.id}">${UI.person(s, `${esc(s.code)} · ${esc(sel.courseLabel(sel.course(s)))}`)}</a>` },
          { key: "seat", label: "Seat", sortable: false, render: (s) => `<span class="small muted">${esc(sel.seatLabel(s))}</span>` },
          { key: "r", label: "30-day rate", sortable: false, render: (s) => { const a = sel.att30(s); return a.rate == null ? '<span class="faint small">—</span>' : UI.barRow(a.rate, U.pct(a.rate), UI.attTone(a.rate)); }, width: "170px" },
          { key: "m", label: "Mark", sortable: false, align: "right", render: (s) => { const cur = m[s.id] && m[s.id].status; return `<div class="att-seg">${["P", "A", "L", "E"].map((k) => `<button class="${k} ${cur === k ? "on" : ""}" data-mark="${k}" data-sid="${s.id}" title="${LABEL[k]}">${k}</button>`).join("")}</div>`; } },
        ], rows: list }) : UI.empty("users", "No students in this batch yet", "Students appear here once they're enrolled in this batch and their start date has passed.", `<button class="btn btn-primary btn-sm" data-act="newStudent" data-perm="students.edit">${ic("userPlus", 14)}Onboard a student</button><a class="btn btn-sm" href="#/students">View all students</a>`)}
      </div>`;
  }

  function register() {
    const [y, mo] = state.month.split("-").map(Number); const days = new Date(y, mo, 0).getDate();
    const today = U.today();
    const list = S.filter("students", (s) => s.status !== "Dropped" && (!state.batch || s.batchId === state.batch) && (!s.startDate || s.startDate.slice(0, 7) <= state.month)).sort((a, b) => sel.name(a).localeCompare(sel.name(b)));
    const map = {}; S.all("attendance").forEach((a) => { if (a.date.startsWith(state.month)) map[a.studentId + a.date] = a.status; });
    const isos = Array.from({ length: days }, (_, i) => `${state.month}-${String(i + 1).padStart(2, "0")}`);
    const colCls = (d) => [U.isSunday(d) ? "sun" : "", d === today ? "today" : "", d > today ? "future" : ""].join(" ");
    return `<div class="row between wrap mb" style="gap:12px">
        ${dateBar("month", U.fmtMonth(state.month), state.month, "month")}
        <div class="row">${batchSeg()}<button class="btn" id="expReg" data-perm="export">${ic("download", 15)}Download</button></div>
      </div>
      <div class="card flush">${list.length ? `<div class="tbl-wrap"><table class="tbl reg-tbl"><thead><tr><th>Student</th>${isos.map((d) => `<th class="${colCls(d)}" title="${U.fmtLong(d)}">${U.parse(d).getDate()}</th>`).join("")}<th class="sum">Present</th><th class="sum">Absent</th><th class="sum">Rate</th></tr></thead>
        <tbody>${list.map((s) => {
          let P = 0, Ab = 0, L = 0;
          const cells = isos.map((d) => { const v = map[s.id + d]; if (v === "P") P++; if (v === "A") Ab++; if (v === "L") L++; return `<td class="${colCls(d)}"><span class="rc ${v || ""}" data-cell="${s.id}|${d}" title="${U.fmtShort(d)}${v ? " · " + LABEL[v] : ""}"></span></td>`; }).join("");
          const t = P + Ab + L; const r = t ? (P + L) / t : null;
          return `<tr><td><a href="#/students/${s.id}" class="strong">${esc(sel.name(s))}</a></td>${cells}<td class="sum">${P + L}</td><td class="sum">${Ab}</td><td class="sum" style="color:var(--${UI.attTone(r) || "text-3"})">${r == null ? "—" : Math.round(r * 100) + "%"}</td></tr>`;
        }).join("")}</tbody></table></div>` : UI.empty("calendar", "No students to show", "Nobody in this batch was enrolled during this month.")}</div>
      <div class="row between wrap mt"><div class="as-legend">${["P", "L", "A", "E"].map((k) => `<span><i class="${k}"></i>${LABEL[k]}</span>`).join("")}<span><i class="U"></i>Not marked</span></div><span class="tiny faint">Click a cell to cycle Present → Absent → Late → Excused → blank</span></div>`;
  }
})(window.App);