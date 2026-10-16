/* ==========================================================================
   Selectors — derived data shared by all modules.
   Fee status, attendance %, course progress, seats and onboarding checklists
   are computed here from the raw records, so every screen agrees.
   Results are memoised per store version (recomputed after any change).
   ========================================================================== */
(function (A) {
  const U = A.util, S = A.store;
  const sel = (A.sel = {});
  let cacheV = -1, cache = new Map();
  const memo = (name, fn) => (arg, ...rest) => {
    if (cacheV !== S.version) { cache = new Map(); cacheV = S.version; }
    const k = name + ":" + (arg && arg.id ? arg.id : arg) + ":" + rest.join("|");
    if (!cache.has(k)) cache.set(k, fn(arg, ...rest));
    return cache.get(k);
  };
  const byStudent = memo("byStudent", (col) => U.groupBy(S.all(col), (x) => x.studentId));
  sel.of = (col, studentId) => byStudent(col)[studentId] || [];

  sel.name = (s) => (s ? `${s.firstName || ""} ${s.lastName || ""}`.trim() || "Unnamed" : "—");
  sel.course = (s) => (s ? S.get("courses", s.courseId) : null);
  sel.batch = (s) => (s ? S.get("batches", s.batchId) : null);
  sel.computer = (s) => (s ? S.get("computers", s.computerId) : null);
  sel.room = (pc) => (pc ? S.get("rooms", pc.roomId) : null);
  sel.enrolled = () => S.filter("students", (s) => s.status === "Active" || s.status === "Onboarding");
  sel.courseLabel = (c) => (c ? `${c.track === "UI/UX" ? "UI/UX" : "Graphic"} · ${c.months}M` : "—");
  sel.trackClass = (c) => (c && c.track === "UI/UX" ? "ux" : "gd");
  sel.toolsFor = (c) => { const l = S.settings().lists; return c && c.track === "Graphic Design" ? l.tools_Graphic : l.tools_UIUX; };
  sel.seatLabel = (s) => { const pc = sel.computer(s); return pc ? pc.label : "—"; };

  /* ---- Fees ---- */
  sel.fee = memo("fee", (s) => {
    const c = sel.course(s);
    const gross = s.fee != null && s.fee !== "" ? Number(s.fee) : c ? Number(c.fee) || 0 : 0;
    const discount = Number(s.discount) || 0;
    const net = Math.max(0, gross - discount);
    const pays = sel.of("payments", s.id).slice().sort((a, b) => (a.date < b.date ? -1 : 1));
    const paid = U.sum(pays, (p) => p.amount);
    const balance = Math.max(0, net - paid);
    const today = U.today();
    let cum = 0;
    const inst = (s.installments || []).slice().sort((a, b) => (a.due < b.due ? -1 : 1)).map((i, n) => {
      const amt = Number(i.amount) || 0; cum += amt;
      const covered = paid >= cum - 0.5;
      const part = !covered && paid > cum - amt;
      const status = covered ? "Paid" : i.due < today ? "Overdue" : part ? "Partial" : "Upcoming";
      return { ...i, n: n + 1, amount: amt, cum, status, remaining: covered ? 0 : Math.min(amt, cum - paid) };
    });
    const dueToDate = inst.filter((i) => i.due < today).reduce((m, i) => Math.max(m, i.cum), 0);
    const overdue = Math.max(0, Math.min(dueToDate, net) - paid);
    const next = inst.find((i) => i.status !== "Paid") || null;
    let status;
    if (s.status === "Dropped" && balance > 0) status = "Written off";
    else if (net === 0 || balance <= 0) status = "Paid";
    else if (overdue > 0) status = "Overdue";
    else if (paid > 0) status = "Partial";
    else status = "Pending";
    return { gross, discount, net, paid, balance, pays, inst, overdue, next, status, pct: net ? Math.min(1, paid / net) : 1 };
  });

  /* ---- Attendance ---- */
  sel.attendance = memo("att", (s, from = "", to = "") => {
    const recs = sel.of("attendance", s.id).filter((a) => (!from || a.date >= from) && (!to || a.date <= to));
    const c = { P: 0, A: 0, L: 0, E: 0 };
    recs.forEach((r) => (c[r.status] = (c[r.status] || 0) + 1));
    const counted = c.P + c.A + c.L;
    return { ...c, total: recs.length, rate: counted ? (c.P + c.L) / counted : null, recs };
  });
  sel.att30 = (s) => sel.attendance(s, U.addDays(U.today(), -30), U.today());
  sel.attOn = memo("attOn", (date) => { const m = {}; S.all("attendance").forEach((a) => { if (a.date === date) m[a.studentId] = a; }); return m; });

  /* ---- Course progress ---- */
  sel.weeks = (c) => (c && c.weeks) || [];
  sel.progress = memo("prog", (s) => {
    const c = sel.course(s); const weeks = sel.weeks(c); const total = weeks.length;
    const subs = sel.of("submissions", s.id).filter((x) => !c || x.courseId === c.id);
    const byWeek = {}; subs.forEach((x) => { const cur = byWeek[x.weekId]; if (!cur || (x.submittedAt || "") > (cur.submittedAt || "")) byWeek[x.weekId] = x; });
    const approved = weeks.filter((w) => byWeek[w.id] && byWeek[w.id].status === "Approved");
    let currentWeek = 0;
    if (s.startDate && total) {
      const d = U.daysBetween(s.startDate, U.today());
      currentWeek = s.status === "Completed" ? total : d < 0 ? 0 : U.clamp(Math.floor(d / 7) + 1, 1, total);
    }
    const lag = currentWeek - approved.length;
    const pending = subs.filter((x) => x.status === "Submitted").length;
    return {
      total, currentWeek, approvedCount: approved.length, pct: total ? approved.length / total : 0,
      expectedPct: total ? currentWeek / total : 0, byWeek, subs, pending,
      goals: approved.map((w) => ({ week: weeks.indexOf(w) + 1, goal: w.goal, title: w.title })),
      current: currentWeek ? weeks[currentWeek - 1] : null,
      standing: s.status === "Completed" ? "Completed" : !currentWeek ? "Not started" : lag >= 4 ? "Behind" : lag >= 2 ? "Slightly behind" : "On track",
    };
  });

  /* ---- Tools ---- */
  sel.toolLevels = ["Not started", "Aware", "Beginner", "Working", "Proficient", "Expert"];
  sel.toolScore = (s) => { const t = s.tools || {}; const v = Object.values(t).map(Number).filter((x) => x > 0); return v.length ? U.sum(v) / v.length : 0; };

  /* ---- Seats ---- */
  sel.occupants = memo("occ", (pcId) => S.filter("students", (s) => s.computerId === pcId && s.status !== "Dropped" && s.status !== "Completed"));
  sel.seatTaken = (pcId, batchId, exceptId) => sel.occupants(pcId).find((s) => s.batchId === batchId && s.id !== exceptId) || null;

  /* ---- Onboarding checklist (pulls from documents, fees, batches, classroom) ---- */
  sel.checklist = memo("chk", (s) => {
    const st = S.settings();
    const docs = sel.of("documents", s.id);
    const req = st.requiredDocs || [];
    const have = req.filter((t) => docs.some((d) => d.type === t));
    const pays = sel.of("payments", s.id);
    const items = [
      { key: "personal", label: "Personal & contact details", done: !!(s.firstName && s.phone && s.email && s.dob && s.address), detail: "Name, mobile, email, DOB, address" },
      { key: "docs", label: "Required documents", done: have.length >= req.length, detail: `${have.length} of ${req.length} uploaded` },
      { key: "fees", label: "Fee plan & first payment", done: (s.installments || []).length > 0 && pays.length > 0, detail: pays.length ? U.money(U.sum(pays, (p) => p.amount)) + " received" : "No payment yet" },
      { key: "batch", label: "Batch assigned", done: !!s.batchId, detail: sel.batch(s) ? sel.batch(s).name : "Not assigned" },
      { key: "seat", label: "Workstation assigned", done: !!s.computerId, detail: sel.seatLabel(s) },
    ];
    return { items, done: items.filter((i) => i.done).length, total: items.length, complete: items.every((i) => i.done) };
  });

  /* ---- Attention flags for dashboard ---- */
  sel.flags = (s) => {
    const f = [];
    const a = sel.att30(s); const th = S.settings().attendanceThreshold || 0.75;
    if (a.rate != null && a.total >= 5 && a.rate < th) f.push({ tone: "bad", text: `Attendance ${U.pct(a.rate)}` });
    const fe = sel.fee(s); if (fe.overdue > 0) f.push({ tone: "warn", text: `${U.money(fe.overdue)} overdue` });
    const p = sel.progress(s); if (p.standing === "Behind") f.push({ tone: "info", text: `${p.currentWeek - p.approvedCount} weeks behind` });
    return f;
  };

  /* ---- Inventory deployed counts follow the classroom ---- */
  sel.invDeployed = (item) => {
    if (!item.link) return Number(item.deployed) || 0;
    const pcs = S.filter("computers", (p) => p.status !== "Retired");
    if (item.link === "monitor") return pcs.length;
    return pcs.filter((p) => p[item.link]).length;
  };
  sel.invSpare = (item) => Math.max(0, (Number(item.qty) || 0) - sel.invDeployed(item) - (Number(item.faulty) || 0));
})(window.App);
