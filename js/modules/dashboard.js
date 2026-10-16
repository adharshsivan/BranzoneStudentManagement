/* Dashboard — a calm overview built entirely from shared selectors. */
(function (A) {
  const U = A.util, UI = A.ui, S = A.store, sel = A.sel, esc = U.esc, ic = UI.icon;

  A.register({
    id: "dashboard", label: "Dashboard", icon: "dashboard", group: "overview", order: 10, route: "dashboard", required: true,
    render(el) {
      const today = U.today();
      const all = S.all("students");
      const enrolled = sel.enrolled();
      const active = all.filter((s) => s.status === "Active");
      const onboarding = all.filter((s) => s.status === "Onboarding");

      /* Attendance today */
      const attToday = sel.attOn(today);
      const expected = active.filter((s) => s.startDate <= today);
      const marked = expected.filter((s) => attToday[s.id]);
      const present = marked.filter((s) => ["P", "L"].includes(attToday[s.id].status)).length;

      /* Fees */
      const fees = all.filter((s) => s.status !== "Dropped").map((s) => ({ s, f: sel.fee(s) }));
      const outstanding = U.sum(fees, (x) => x.f.balance);
      const overdueList = fees.filter((x) => x.f.overdue > 0).sort((a, b) => b.f.overdue - a.f.overdue);
      const month = today.slice(0, 7);
      const collected = U.sum(S.filter("payments", (p) => p.date.startsWith(month)), (p) => p.amount);
      const lastMonth = U.addMonths(month + "-01", -1).slice(0, 7);
      const collectedLast = U.sum(S.filter("payments", (p) => p.date.startsWith(lastMonth)), (p) => p.amount);

      /* Seats */
      const pcs = S.filter("computers", (p) => p.status === "Active");
      const seated = enrolled.filter((s) => s.computerId).length;
      const seatCapacity = pcs.length * Math.max(1, S.all("batches").length);

      /* Trend: last 14 studio days */
      const days = []; let d = today;
      while (days.length < 14) { if (!U.isSunday(d)) days.unshift(d); d = U.addDays(d, -1); }
      const trend = days.map((day) => {
        const c = { P: 0, L: 0, A: 0, E: 0 }; Object.values(sel.attOn(day)).forEach((r) => c[r.status]++);
        const counted = c.P + c.L + c.A;
        return { day, ...c, total: counted, rate: counted ? (c.P + c.L) / counted : null };
      });
      const withData = trend.filter((t) => t.rate != null);
      const avgRate = withData.length ? Math.round((U.sum(withData, (t) => t.rate) / withData.length) * 100) : 0;
      const best = withData.slice().sort((a, b) => b.rate - a.rate)[0], worst = withData.slice().sort((a, b) => a.rate - b.rate)[0];
      const absences = U.sum(trend, (t) => t.A);

      /* Enrolment by course */
      const byCourse = S.all("courses").map((c) => ({ c, n: enrolled.filter((s) => s.courseId === c.id).length })).sort((a, b) => b.n - a.n);
      const ux = enrolled.filter((s) => (sel.course(s) || {}).track === "UI/UX").length;

      /* Attention */
      const attention = enrolled.map((s) => ({ s, flags: sel.flags(s) })).filter((x) => x.flags.length).sort((a, b) => b.flags.length - a.flags.length).slice(0, 6);
      const pendingReviews = S.count("submissions", (x) => x.status === "Submitted");
      const activity = S.all("activity").slice(0, 8);
      const upcoming = fees.filter((x) => x.f.next && x.f.next.status === "Upcoming" && U.daysBetween(today, x.f.next.due) <= 14).sort((a, b) => (a.f.next.due < b.f.next.due ? -1 : 1)).slice(0, 4);

      const h = new Date().getHours();
      const greet = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";

      el.innerHTML = `<div class="page">
        ${UI.pageHead({
          title: `${greet}, <em>${esc(A.auth ? A.auth.firstName() : "there")}.</em>`,
          sub: `${U.fmtLong(today)} · ${U.plural(active.length, "active student")}${pendingReviews ? ` · ${pendingReviews} submissions to review` : ""}`,
          actions: `<button class="btn" data-act="recordPayment" data-perm="fees.edit">${ic("wallet", 15)}Record payment</button><button class="btn btn-accent" data-act="newStudent" data-perm="students.edit">${ic("userPlus", 15)}Onboard student</button>`,
        })}

        <section class="grid g-5">
          ${UI.kpi({ label: "Active students", icon: "users", value: active.length, sub: `${onboarding.length} onboarding · ${all.filter((s) => s.status === "Completed").length} graduated`, href: "students" })}
          ${UI.kpi({ label: "Present today", icon: "calendar", value: marked.length ? Math.round((present / marked.length) * 100) : "—", unit: marked.length ? "%" : "", sub: `${present} of ${marked.length} marked · ${expected.length - marked.length} unmarked`, href: "attendance" })}
          ${UI.kpi({ label: "Collected this month", icon: "wallet", value: U.moneyShort(collected), sub: `${collectedLast ? (collected >= collectedLast ? "▲ " : "▼ ") + U.moneyShort(Math.abs(collected - collectedLast)) + " vs last month" : "First month"}`, href: "fees" })}
          ${UI.kpi({ label: "Outstanding fees", icon: "alert", value: U.moneyShort(outstanding), sub: `<span style="color:var(--bad)">${U.money(U.sum(overdueList, (x) => x.f.overdue))} overdue</span> · ${overdueList.length} students`, href: "fees?tab=dues" })}
          ${UI.kpi({ label: "Seats assigned", icon: "monitor", value: seated, unit: `/ ${seatCapacity}`, sub: `${pcs.length} active workstations × ${S.all("batches").length} batches`, href: "classroom" })}
        </section>

        <section class="grid g-main mt">
          <div class="card fill-card">
            <div class="card-head"><div><h3>Attendance</h3><div class="hint">Last 14 studio days · students marked per day</div></div>
              <div class="row" style="gap:14px"><div class="legend-inline"><span><i style="background:var(--accent)"></i>Present</span><span><i style="background:rgba(255,91,34,.45)"></i>Late</span><span><i style="background:#3a3a3a"></i>Absent</span></div><a class="card-link" href="#/attendance">Register ${ic("chevR", 13)}</a></div></div>
            ${attChart(trend, today)}
            <div class="stat-list mt">
              <div><div class="s-label">Average present</div><div class="s-value">${avgRate}%</div></div>
              <div><div class="s-label">Best day</div><div class="s-value">${best ? Math.round(best.rate * 100) + "%" : "—"}</div><div class="tiny faint">${best ? U.fmtShort(best.day) : ""}</div></div>
              <div><div class="s-label">Lowest day</div><div class="s-value">${worst ? Math.round(worst.rate * 100) + "%" : "—"}</div><div class="tiny faint">${worst ? U.fmtShort(worst.day) : ""}</div></div>
              <div><div class="s-label">Absences</div><div class="s-value">${absences}</div><div class="tiny faint">in 14 days</div></div>
            </div>
          </div>
          <div class="card">
            <div class="card-head"><div><h3>Enrolment by programme</h3><div class="hint">${enrolled.length} currently enrolled</div></div><a class="card-link" href="#/courses">Courses ${ic("chevR", 13)}</a></div>
            ${UI.donut([
              { label: "UI/UX Design", value: ux, color: "#ff5b22" },
              { label: "Graphic Design", value: enrolled.length - ux, color: "#e5e5e5" },
            ], { center: `<div><div class="serif" style="font-size:23px;line-height:1">${enrolled.length}</div><div class="tiny faint">enrolled</div></div>` })}
            <div class="sep"></div>
            ${UI.hbars(byCourse.map((x) => ({ label: `${esc(x.c.name.replace(" Design", "").replace("Program", "").trim())}`, value: x.n, tone: "" })))}
          </div>
        </section>

        <section class="grid g-3 mt">
          <div class="card">
            <div class="card-head"><div><h3>Needs attention</h3><div class="hint">Attendance, fees and progress signals</div></div></div>
            ${attention.length ? `<div class="list">${attention.map(({ s, flags }) => `<div class="list-item link" data-href="students/${s.id}">${UI.person(s, esc(sel.courseLabel(sel.course(s))))}<div class="row wrap" style="margin-left:auto;justify-content:flex-end;gap:5px">${flags.map((f) => `<span class="chip ${f.tone}">${esc(f.text)}</span>`).join("")}</div></div>`).join("")}</div>` : UI.empty("check", "All clear", "No students need attention right now.")}
          </div>
          <div class="card">
            <div class="card-head"><div><h3>Fee watch</h3><div class="hint">Overdue and due in the next 14 days</div></div><a class="card-link" href="#/fees?tab=dues">All dues ${ic("chevR", 13)}</a></div>
            <div class="list">
              ${overdueList.slice(0, 4).map(({ s, f }) => `<div class="list-item link" data-href="students/${s.id}">${UI.person(s, `Overdue since ${U.fmtShort((f.inst.find((i) => i.status === "Overdue") || {}).due)}`)}<div class="r" style="margin-left:auto"><div class="strong" style="color:var(--bad)">${U.money(f.overdue)}</div><div class="tiny faint">overdue</div></div></div>`).join("")}
              ${upcoming.map(({ s, f }) => `<div class="list-item link" data-href="students/${s.id}">${UI.person(s, `Due ${U.fmtShort(f.next.due)}`)}<div class="r" style="margin-left:auto"><div class="strong">${U.money(f.next.remaining)}</div><div class="tiny faint">upcoming</div></div></div>`).join("")}
              ${!overdueList.length && !upcoming.length ? UI.empty("wallet", "Nothing due", "No overdue or upcoming installments.") : ""}
            </div>
          </div>
          <div class="card">
            <div class="card-head"><div><h3>Recent activity</h3><div class="hint">Across every module</div></div></div>
            <div class="timeline">${activity.map((a) => { const s = S.get("students", a.studentId); return `<div class="tl-item">${s ? UI.avatar(sel.name(s), 26, s.id) : `<span class="tl-dot">${ic(typeIcon(a.type), 13)}</span>`}<div class="tl-body"><div class="t">${s ? `<a href="#/students/${s.id}" class="strong">${esc(sel.name(s))}</a> · ` : ""}${esc(a.text)}</div><div class="m">${U.relTime(a.at)}</div></div></div>`; }).join("") || UI.empty("activity", "Quiet so far", "Activity appears here as the team works.")}</div>
          </div>
        </section>
      </div>`;
    },
  });

  /* Stacked attendance columns (present / late / absent) with a scaled y-axis */
  function attChart(trend, today) {
    const max = Math.max(4, ...trend.map((t) => t.total));
    const step = Math.ceil(max / 4), top = step * 4;
    const ticks = [4, 3, 2, 1, 0].map((i) => i * step);
    return `<div class="att-chart"><div class="ac-y">${ticks.map((v) => `<span>${v}</span>`).join("")}</div>
      <div class="ac-plot"><div class="ac-grid">${ticks.map(() => "<i></i>").join("")}</div>
        <div class="ac-bars">${trend.map((t) => { const d = A.util.parse(t.day); const seg = (n, cls) => (n ? `<i class="${cls}" style="height:${(n / top) * 100}%"></i>` : "");
          return `<div class="ac-col ${t.day === today ? "today" : ""}" title="${A.util.fmtLong(t.day)} — ${t.P} present, ${t.L} late, ${t.A} absent${t.E ? `, ${t.E} excused` : ""}${t.rate != null ? ` · ${Math.round(t.rate * 100)}%` : ""}">
            <div class="ac-stack">${seg(t.A, "a")}${seg(t.L, "l")}${seg(t.P, "p")}</div>
            <div class="ac-x"><b>${d.getDate()}</b><span>${A.util.DAYS[d.getDay()].slice(0, 3)}</span></div></div>`; }).join("")}</div></div></div>`;
  }

  const typeIcon = (t) => ({ students: "users", payments: "wallet", attendance: "calendar", documents: "file", submissions: "inbox", remarks: "message", computers: "monitor", courses: "book", inventory: "box", import: "scan" }[t] || "activity");
  A.typeIcon = typeIcon;
})(window.App);
