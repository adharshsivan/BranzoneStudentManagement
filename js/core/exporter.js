/* ==========================================================================
   Exporter — every downloadable dataset is registered here once and reused
   by the Reports page and by "Export" buttons on each module.
   To add a dataset: A.datasets.register({ id, label, desc, icon, sheets() })
   ========================================================================== */
(function (A) {
  const U = A.util, S = A.store, sel = A.sel;

  A.exporter = {
    allowed() { if (A.auth && A.auth.user() && !A.auth.flag("export")) { A.ui.toast("Your role can't download data. Ask an admin for access.", "warn"); return false; } return true; },
    async xlsx(filename, sheets) {
      if (!this.allowed()) return;
      await A.load(A.libs.xlsx);
      const wb = XLSX.utils.book_new();
      sheets.forEach((sh) => {
        const rows = sh.rows.length ? sh.rows : [{ Note: "No records" }];
        const ws = XLSX.utils.json_to_sheet(rows);
        const keys = Object.keys(rows[0] || {});
        ws["!cols"] = keys.map((k) => ({ wch: Math.min(48, Math.max(k.length, ...rows.slice(0, 200).map((r) => String(r[k] == null ? "" : r[k]).length)) + 2) }));
        XLSX.utils.book_append_sheet(wb, ws, sh.name.replace(/[\\/?*[\]:]/g, " ").slice(0, 31));
      });
      XLSX.writeFile(wb, filename);
    },
    csv(filename, rows) {
      if (!this.allowed()) return;
      if (!rows.length) return A.ui.toast("Nothing to export", "warn");
      const keys = Object.keys(rows[0]);
      const q = (v) => { const s = v == null ? "" : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
      const csv = [keys.join(","), ...rows.map((r) => keys.map((k) => q(r[k])).join(","))].join("\n");
      U.download(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }), filename);
    },
    async run(id, opts = {}, format = "xlsx") {
      const d = A.datasets.get(id); if (!d || !this.allowed()) return;
      try {
        const sheets = d.sheets(opts);
        const stamp = U.today();
        const base = `Branzone_${d.file || d.id}_${opts.suffix || stamp}`;
        if (format === "csv") this.csv(base + ".csv", sheets[0].rows);
        else await this.xlsx(base + ".xlsx", sheets);
        A.ui.toast(`${d.label} downloaded`, "ok");
      } catch (e) { console.error(e); A.ui.toast(e.message || "Export failed", "bad"); }
    },
  };

  const list = [];
  A.datasets = { register: (d) => { list.push(d); }, all: () => list, get: (id) => list.find((d) => d.id === id) };

  /* ---------- Row builders ---------- */
  const studentRow = (s) => {
    const c = sel.course(s), b = sel.batch(s), f = sel.fee(s), a = sel.att30(s), p = sel.progress(s), at = sel.attendance(s);
    return {
      "Student ID": s.code, "First name": s.firstName, "Last name": s.lastName || "", Status: s.status,
      Course: c ? c.name : "", Track: c ? c.track : "", "Duration (months)": c ? c.months : "",
      Batch: b ? `${b.name} (${b.time})` : "", Workstation: sel.seatLabel(s), "Start date": s.startDate || "",
      Mobile: s.phone || "", Email: s.email || "", Gender: s.gender || "", "Date of birth": s.dob || "",
      Education: s.education || "", Occupation: s.occupation || "", Address: s.address || "", City: s.city || "", "PIN code": s.pincode || "",
      Guardian: s.guardianName || "", "Guardian mobile": s.guardianPhone || "", Source: s.source || "", "Career goal": s.goal || "",
      "Net fee": f.net, Paid: f.paid, Balance: f.balance, Overdue: f.overdue, "Fee status": f.status,
      "Attendance (overall)": at.rate == null ? "" : Math.round(at.rate * 100) + "%", "Attendance (30 days)": a.rate == null ? "" : Math.round(a.rate * 100) + "%",
      "Current week": p.currentWeek, "Weeks approved": p.approvedCount, "Progress": Math.round(p.pct * 100) + "%", Standing: p.standing,
      "Tool score (0-5)": +sel.toolScore(s).toFixed(1),
    };
  };
  A.exporter.studentRow = studentRow;

  A.datasets.register({
    id: "students", file: "Students", label: "Students master", icon: "users",
    desc: "Every student with contact, enrolment, fee, attendance and progress columns.",
    sheets: (o = {}) => [{ name: "Students", rows: (o.rows || S.all("students")).map(studentRow) }],
  });

  A.datasets.register({
    id: "fees", file: "Fee_Ledger", label: "Fee ledger", icon: "wallet",
    desc: "Net fee, paid, balance and next due per student, plus installment schedule and payments.",
    sheets: () => {
      const st = S.all("students");
      return [
        { name: "Ledger", rows: st.map((s) => { const f = sel.fee(s); const c = sel.course(s); return { "Student ID": s.code, Name: sel.name(s), Course: c ? c.name : "", Status: s.status, "Gross fee": f.gross, Discount: f.discount, "Net fee": f.net, Paid: f.paid, Balance: f.balance, Overdue: f.overdue, "Next due date": f.next ? f.next.due : "", "Next due amount": f.next ? f.next.remaining : "", "Fee status": f.status }; }) },
        { name: "Installments", rows: st.flatMap((s) => sel.fee(s).inst.map((i) => ({ "Student ID": s.code, Name: sel.name(s), "#": i.n, "Due date": i.due, Amount: i.amount, Status: i.status }))) },
        { name: "Payments", rows: paymentRows() },
      ];
    },
  });
  const paymentRows = (month) => S.all("payments").filter((p) => !month || p.date.startsWith(month)).slice().sort((a, b) => (a.date < b.date ? 1 : -1)).map((p) => { const s = S.get("students", p.studentId); return { Date: p.date, "Receipt no": p.receipt || "", "Student ID": s ? s.code : "", Name: s ? sel.name(s) : "", Amount: p.amount, Method: p.method, Reference: p.ref || "", Note: p.note || "" }; });

  A.datasets.register({
    id: "payments", file: "Payments", label: "Payments", icon: "wallet",
    desc: "All fee transactions with receipt numbers and methods.",
    sheets: (o = {}) => [{ name: "Payments", rows: paymentRows(o.month) }],
  });

  A.datasets.register({
    id: "attendance", file: "Attendance_Register", label: "Attendance register", icon: "calendar", hasMonth: true,
    desc: "Monthly register — one row per student, one column per day (P / A / L / E).",
    sheets: (o = {}) => {
      const month = o.month || U.today().slice(0, 7);
      const [y, m] = month.split("-").map(Number); const days = new Date(y, m, 0).getDate();
      const map = {}; S.all("attendance").forEach((a) => { if (a.date.startsWith(month)) map[a.studentId + a.date] = a.status; });
      const studs = S.all("students").filter((s) => s.status !== "Dropped").filter((s) => !o.batchId || s.batchId === o.batchId).sort((a, b) => sel.name(a).localeCompare(sel.name(b)));
      const rows = studs.map((s) => {
        const r = { "Student ID": s.code, Name: sel.name(s), Batch: sel.batch(s) ? sel.batch(s).name : "" };
        let P = 0, Ab = 0, L = 0;
        for (let d = 1; d <= days; d++) { const iso = `${month}-${String(d).padStart(2, "0")}`; const v = map[s.id + iso] || ""; r[String(d)] = v; if (v === "P") P++; if (v === "A") Ab++; if (v === "L") L++; }
        r.Present = P; r.Absent = Ab; r.Late = L; r["%"] = P + Ab + L ? Math.round(((P + L) / (P + Ab + L)) * 100) + "%" : "";
        return r;
      });
      return [{ name: U.fmtMonth(month), rows }];
    },
  });

  A.datasets.register({
    id: "submissions", file: "Submissions", label: "Assignments & submissions", icon: "inbox",
    desc: "Weekly assignment submissions with status, grade and mentor feedback.",
    sheets: () => [{ name: "Submissions", rows: S.all("submissions").map((x) => { const s = S.get("students", x.studentId), c = S.get("courses", x.courseId); const w = c && c.weeks.find((w) => w.id === x.weekId); return { "Student ID": s ? s.code : "", Name: s ? sel.name(s) : "", Course: c ? c.name : "", Week: w ? c.weeks.indexOf(w) + 1 : "", Assignment: x.title || (w ? w.assignment : ""), Status: x.status, Grade: x.grade || "", Submitted: x.submittedAt || "", Link: x.link || "", Feedback: x.feedback || "" }; }) }],
  });

  A.datasets.register({
    id: "courses", file: "Courses", label: "Courses & curriculum", icon: "book",
    desc: "Course catalogue and the full week-by-week curriculum with assignments and goals.",
    sheets: () => [
      { name: "Courses", rows: S.all("courses").map((c) => ({ Course: c.name, Track: c.track, Months: c.months, Level: c.level || "", Fee: c.fee, Weeks: c.weeks.length, "Hours / week": c.hoursPerWeek || "", Enrolled: S.count("students", (s) => s.courseId === c.id && (s.status === "Active" || s.status === "Onboarding")), Tools: (c.tools || []).join(", "), Goals: (c.goals || []).join(" | ") })) },
      { name: "Curriculum", rows: S.all("courses").flatMap((c) => c.weeks.map((w, i) => ({ Course: c.name, Week: i + 1, Phase: w.phase || "", Title: w.title, Topics: w.topics || "", Assignment: w.assignment || "", Tasks: (w.tasks || []).join(" | "), Goal: w.goal || "" }))) },
    ],
  });

  A.datasets.register({
    id: "workstations", file: "Workstations", label: "Classroom & workstations", icon: "monitor",
    desc: "Every workstation with room, position, specification, peripherals and assigned students.",
    sheets: () => [{ name: "Workstations", rows: S.all("computers").map((p) => { const r = sel.room(p); const occ = sel.occupants(p.id); return { Room: r ? r.name : "", Label: p.label, Row: p.row, Column: p.col, Status: p.status, CPU: p.cpu, GPU: p.gpu, RAM: p.ram, Storage: p.storage, OS: p.os, Monitor: p.monitor, Mouse: p.mouse ? "Yes" : "No", Keyboard: p.keyboard ? "Yes" : "No", Headset: p.headset ? "Yes" : "No", Tablet: p.tablet ? "Yes" : "No", "Asset tag": p.assetTag || "", "Assigned students": occ.map((s) => `${sel.name(s)} (${sel.batch(s) ? sel.batch(s).name : "—"})`).join("; ") }; }) }],
  });

  A.datasets.register({
    id: "inventory", file: "Inventory", label: "Inventory", icon: "box",
    desc: "Hardware stock with deployed, faulty and spare counts.",
    sheets: () => [{ name: "Inventory", rows: S.all("inventory").map((i) => ({ Item: i.name, Category: i.category || "", Total: i.qty, Deployed: sel.invDeployed(i), Faulty: i.faulty || 0, Spare: sel.invSpare(i), "Min spares": i.minSpare || 0, Status: sel.invSpare(i) < (i.minSpare || 0) ? "Low" : "OK", Vendor: i.vendor || "", Notes: i.notes || "" })) }],
  });

  A.datasets.register({
    id: "feedback", file: "Remarks_Feedback", label: "Remarks & feedback", icon: "message",
    desc: "Mentor remarks and student feedback with ratings.",
    sheets: () => [
      { name: "Remarks", rows: S.all("remarks").map((r) => { const s = S.get("students", r.studentId); return { Date: r.date, "Student ID": s ? s.code : "", Name: s ? sel.name(s) : "", Tag: r.tag || "", Tone: r.tone, Author: r.author || "", Remark: r.text }; }) },
      { name: "Feedback", rows: S.all("feedback").map((r) => { const s = S.get("students", r.studentId); return { Date: r.date, "Student ID": s ? s.code : "", Name: s ? sel.name(s) : "", Category: r.category, Rating: r.rating, Feedback: r.text }; }) },
    ],
  });

  A.datasets.register({
    id: "everything", file: "Full_Workbook", label: "Complete workbook", icon: "layers", featured: true,
    desc: "One workbook with every sheet above — ideal for monthly archiving.",
    sheets: () => ["students", "fees", "attendance", "submissions", "courses", "workstations", "inventory", "feedback"].flatMap((id) => A.datasets.get(id).sheets({})),
  });
})(window.App);
