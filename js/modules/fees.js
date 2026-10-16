/* Fees — ledger, payments and dues. Fee status everywhere comes from sel.fee(). */
(function (A) {
  const U = A.util, UI = A.ui, S = A.store, sel = A.sel, esc = U.esc, ic = UI.icon;
  const state = { tab: "ledger", q: "", month: "", sort: "balance", dir: "desc", status: "" };

  const nextReceipt = () => {
    const nums = S.all("payments").map((p) => parseInt(String(p.receipt || "").replace(/\D/g, ""), 10)).filter((n) => !isNaN(n));
    return "RC-" + ((nums.length ? Math.max(...nums) : 5000) + 1);
  };

  A.fees = {
    addPayment(studentId, p) {
      return S.insert("payments", { studentId, receipt: nextReceipt(), date: U.today(), method: "UPI", ...p, amount: Number(p.amount) }, { log: `Payment recorded — ${U.money(p.amount)} via ${p.method || "UPI"}`, type: "payments" });
    },
    recordPayment(studentId) {
      const studs = S.filter("students", (s) => s.status !== "Dropped").sort((a, b) => sel.name(a).localeCompare(sel.name(b)));
      const s0 = studentId ? S.get("students", studentId) : null;
      const f0 = s0 ? sel.fee(s0) : null;
      const fields = [
        { key: "studentId", label: "Student", type: "select", required: true, span: 2, options: () => studs.map((s) => ({ value: s.id, label: `${sel.name(s)} · ${s.code} · ${U.money(sel.fee(s).balance)} due` })) },
        { key: "amount", label: "Amount (₹)", type: "number", required: true },
        { key: "date", label: "Date received", type: "date", required: true },
        { key: "method", label: "Method", type: "select", options: A.schema.opts.list("paymentMethods"), placeholder: false },
        { key: "ref", label: "Reference / UTR" },
        { key: "receipt", label: "Receipt number" },
        { key: "note", label: "Note", span: 2 },
      ];
      UI.formDrawer({
        title: "Record payment", eyebrow: "Fees", fields, saveLabel: "Record payment",
        values: { studentId: studentId || "", amount: f0 && f0.next ? f0.next.remaining : "", date: U.today(), method: "UPI", receipt: nextReceipt() },
        extra: `<div id="feeHint" class="banner mt" style="display:${s0 ? "flex" : "none"}">${ic("wallet", 18)}<div id="feeHintTxt" class="grow small"></div></div>`,
        onSave: (v) => {
          if (!(v.amount > 0)) { UI.toast("Enter an amount greater than zero", "warn"); return false; }
          const s = S.get("students", v.studentId); const f = sel.fee(s);
          if (v.amount > f.balance + 0.5 && f.balance > 0) UI.toast(`Note: this is ${U.money(v.amount - f.balance)} more than the balance.`, "warn");
          A.fees.addPayment(v.studentId, v);
          UI.toast(`${U.money(v.amount)} recorded for ${sel.name(s)}`, "ok");
        },
      });
      const hint = () => {
        const sel_ = document.querySelector('.drawer [name="studentId"]'); if (!sel_) return;
        const s = S.get("students", sel_.value); const box = document.getElementById("feeHint");
        if (!s) { box.style.display = "none"; return; }
        const f = sel.fee(s); box.style.display = "flex";
        document.getElementById("feeHintTxt").innerHTML = `<b>${esc(sel.name(s))}</b> — net ${U.money(f.net)}, paid ${U.money(f.paid)}, balance <b>${U.money(f.balance)}</b>${f.next ? ` · next installment ${U.money(f.next.remaining)} due ${U.fmtDate(f.next.due)}` : ""}`;
        const amt = document.querySelector('.drawer [name="amount"]'); if (amt && !amt.value && f.next) amt.value = f.next.remaining;
      };
      setTimeout(() => { const e = document.querySelector('.drawer [name="studentId"]'); if (e) e.onchange = () => { document.querySelector('.drawer [name="amount"]').value = ""; hint(); }; hint(); }, 0);
    },
    editPayment(p) {
      const s = S.get("students", p.studentId);
      UI.formDrawer({
        title: "Edit payment", eyebrow: sel.name(s), values: p,
        fields: [{ key: "amount", label: "Amount (₹)", type: "number", required: true }, { key: "date", label: "Date", type: "date", required: true }, { key: "method", label: "Method", type: "select", options: A.schema.opts.list("paymentMethods"), placeholder: false }, { key: "ref", label: "Reference" }, { key: "receipt", label: "Receipt number" }, { key: "note", label: "Note" }],
        onSave: (v) => { S.update("payments", p.id, v, { log: `Payment ${p.receipt || ""} edited` }); UI.toast("Payment updated", "ok"); },
        onDelete: () => { S.remove("payments", p.id, { log: `Payment ${p.receipt || ""} deleted (${U.money(p.amount)})` }); UI.toast("Payment deleted", "ok"); },
      });
    },
    editPlan(s) {
      const c = sel.course(s); const f = sel.fee(s);
      let rows = (s.installments || []).map((i) => ({ ...i }));
      const m = UI.drawer({
        title: "Fee plan", eyebrow: sel.name(s), size: "lg", live: false,
        sub: `Course fee ${U.money(c ? c.fee : 0)} · paid so far ${U.money(f.paid)}`,
        body: () => `<div class="form-grid">
            <label class="field"><span class="field-label">Fee override (₹)</span><input class="input" type="number" name="fee" value="${s.fee != null ? s.fee : ""}" placeholder="${c ? c.fee : ""} (course default)"></label>
            <label class="field"><span class="field-label">Discount (₹)</span><input class="input" type="number" name="discount" value="${s.discount || 0}"></label>
          </div>
          <div class="row between mt-lg mb"><div class="strong">Installments</div><div class="row">${["full", "two", "three", "monthly"].map((k) => `<button class="btn btn-xs" data-gen="${k}">${{ full: "Full", two: "2×", three: "3×", monthly: "Monthly" }[k]}</button>`).join("")}<button class="btn btn-xs" id="addRow">${ic("plus", 11)}Row</button></div></div>
          <div id="rows"></div><div id="tot" class="small mt"></div>`,
        onMount: (b) => {
          const net = () => Math.max(0, (b.querySelector('[name="fee"]').value === "" ? (c ? c.fee : 0) : Number(b.querySelector('[name="fee"]').value)) - (Number(b.querySelector('[name="discount"]').value) || 0));
          const draw = () => {
            b.querySelector("#rows").innerHTML = rows.map((r, i) => `<div class="row mb" style="gap:8px"><span class="mono faint" style="width:24px">${i + 1}</span><input type="date" class="input" data-i="${i}" data-k="due" value="${r.due}"><input type="number" class="input" data-i="${i}" data-k="amount" value="${r.amount}"><button class="icon-btn sm" data-del="${i}">${ic("x", 14)}</button></div>`).join("") || '<p class="small faint">No installments.</p>';
            const t = U.sum(rows, (r) => r.amount), n = net();
            b.querySelector("#tot").innerHTML = `Total scheduled <b>${U.money(t)}</b> of net <b>${U.money(n)}</b> ${Math.abs(t - n) > 1 ? `<span class="chip warn" style="margin-left:6px">Off by ${U.money(n - t)}</span>` : '<span class="chip ok" style="margin-left:6px">Balanced</span>'}`;
            b.querySelectorAll("[data-k]").forEach((x) => (x.onchange = () => { rows[+x.dataset.i][x.dataset.k] = x.dataset.k === "amount" ? Number(x.value) : x.value; draw(); }));
            b.querySelectorAll("[data-del]").forEach((x) => (x.onclick = () => { rows.splice(+x.dataset.del, 1); draw(); }));
          };
          b.querySelectorAll("[data-gen]").forEach((x) => (x.onclick = () => { rows = A.planInstallments(net(), s.startDate || U.today(), c ? c.months : 3, x.dataset.gen); draw(); }));
          b.querySelector("#addRow").onclick = () => { rows.push({ due: rows.length ? U.addMonths(rows[rows.length - 1].due, 1) : s.startDate || U.today(), amount: 0 }); draw(); };
          b.querySelectorAll('[name="fee"],[name="discount"]').forEach((x) => (x.oninput = draw));
          draw();
        },
        actions: [{ label: "Cancel", kind: "ghost" }, { label: "Save plan", kind: "primary", onClick: (api) => {
          const fee = api.body.querySelector('[name="fee"]').value; const discount = Number(api.body.querySelector('[name="discount"]').value) || 0;
          S.update("students", s.id, { fee: fee === "" ? null : Number(fee), discount, installments: rows.filter((r) => r.due && r.amount > 0).sort((a, b) => (a.due < b.due ? -1 : 1)) }, { log: "Fee plan updated" });
          UI.toast("Fee plan saved", "ok");
        } }],
      });
      return m;
    },
  };
  A.actions.recordPayment = { label: "Record a fee payment", icon: "wallet", perm: "fees.edit", run: () => A.fees.recordPayment() };

  A.register({
    id: "fees", label: "Fees", icon: "wallet", group: "people", order: 23, route: "fees",
    badge: () => { const n = S.all("students").filter((s) => s.status !== "Dropped" && sel.fee(s).overdue > 0).length; return n || null; },
    render(el, { query }) {
      if (query && query.tab) state.tab = query.tab;
      const studs = S.all("students").filter((s) => s.status !== "Dropped");
      const all = studs.map((s) => ({ s, f: sel.fee(s) }));
      const expected = U.sum(all, (x) => x.f.net), collected = U.sum(all, (x) => x.f.paid), outstanding = U.sum(all, (x) => x.f.balance), overdue = U.sum(all, (x) => x.f.overdue);
      const month = U.today().slice(0, 7);
      const months = []; for (let i = 5; i >= 0; i--) months.push(U.addMonths(month + "-01", -i).slice(0, 7));
      const monthly = months.map((m) => ({ label: U.MONTHS[+m.slice(5) - 1], value: U.sum(S.filter("payments", (p) => p.date.startsWith(m)), (p) => p.amount), tip: `${U.fmtMonth(m)} · ${U.money(U.sum(S.filter("payments", (p) => p.date.startsWith(m)), (p) => p.amount))}`, cls: m === month ? "today" : "" }));
      const tabs = [{ id: "ledger", label: "Student ledger", count: studs.length }, { id: "dues", label: "Dues", count: all.filter((x) => x.f.overdue > 0 || (x.f.next && U.daysBetween(U.today(), x.f.next.due) <= 30)).length }, { id: "payments", label: "Payments", count: S.all("payments").length }];
      el.innerHTML = `<div class="page">
        ${UI.pageHead({ eyebrow: "Students", title: "Fees & <em>collections</em>", sub: "Installment plans, receipts and dues. Recording a payment updates the student profile, onboarding checklist and dashboard together.",
          actions: `<button class="btn" id="exp" data-perm="export">${ic("download", 15)}Export ledger</button><button class="btn btn-primary" data-act="recordPayment" data-perm="fees.edit">${ic("plus", 15)}Record payment</button>` })}
        <section class="grid g-main">
          <div class="grid g-2">
            ${UI.kpi({ label: "Expected (net)", icon: "layers", value: U.moneyShort(expected), sub: `${studs.length} students, excluding dropped` })}
            ${UI.kpi({ label: "Collected", icon: "check", value: U.moneyShort(collected), sub: `${U.pct(expected ? collected / expected : 0)} of expected` })}
            ${UI.kpi({ label: "Outstanding", icon: "clock", value: U.moneyShort(outstanding), sub: "Future installments included" })}
            ${UI.kpi({ label: "Overdue", icon: "alert", value: `<span style="color:var(--bad)">${U.moneyShort(overdue)}</span>`, sub: `${all.filter((x) => x.f.overdue > 0).length} students past due date` })}
          </div>
          <div class="card"><div class="card-head"><div><h3>Collections · 6 months</h3><div class="hint">This month ${U.money(monthly[5].value)}</div></div></div>${UI.columns(monthly, { height: 196 })}</div>
        </section>
        <div class="mt-lg">${UI.tabs(tabs, state.tab)}</div>
        <div id="fbody">${state.tab === "ledger" ? ledger(all) : state.tab === "dues" ? dues(all) : payments()}</div>
      </div>`;
      UI.bindTabs(el, (t) => { state.tab = t; if (query && query.tab) A.navigate("fees"); else A.refresh(); });
      UI.bindSort(el, state, A.refresh);
      el.querySelector("#exp").onclick = () => A.exporter.run("fees");
      const q = el.querySelector("#fq"); if (q) q.oninput = U.debounce(() => { state.q = q.value; A.refresh(); setTimeout(() => { const n = document.getElementById("fq"); n && (n.focus(), n.setSelectionRange(n.value.length, n.value.length)); }); }, 180);
      const fs = el.querySelector("#fstatus"); if (fs) fs.onchange = () => { state.status = fs.value; A.refresh(); };
      const pm = el.querySelector("#pmonth"); if (pm) pm.onchange = () => { state.month = pm.value; A.refresh(); };
      el.querySelectorAll("[data-payid]").forEach((r) => (r.onclick = () => A.fees.editPayment(S.get("payments", r.dataset.payid))));
      el.querySelectorAll("[data-collect]").forEach((b) => (b.onclick = () => A.fees.recordPayment(b.dataset.collect)));
      const ep = el.querySelector("#expPay"); if (ep) ep.onclick = () => A.exporter.run("payments", { month: state.month, suffix: state.month || "all" });
    },
  });

  function ledger(all) {
    const n = U.norm(state.q);
    const rows = all.filter((x) => (!n || U.norm(sel.name(x.s) + " " + x.s.code).includes(n)) && (!state.status || x.f.status === state.status));
    return `<div class="filters"><div class="input-icon">${ic("search", 15)}<input class="input" id="fq" placeholder="Search student" value="${esc(state.q)}"></div>
        <select class="input" id="fstatus"><option value="">Any status</option>${["Paid", "Partial", "Pending", "Overdue"].map((x) => `<option ${state.status === x ? "selected" : ""}>${x}</option>`).join("")}</select></div>
      <div class="card flush">${UI.table({ state, rows, rowAttr: (x) => `data-href="students/${x.s.id}?tab=fees"`, cols: [
        { key: "name", label: "Student", sort: (x) => sel.name(x.s), render: (x) => UI.person(x.s, `${esc(x.s.code)} · ${esc(sel.courseLabel(sel.course(x.s)))}`) },
        { key: "net", label: "Net fee", align: "right", sort: (x) => x.f.net, render: (x) => U.money(x.f.net) },
        { key: "paid", label: "Paid", align: "right", sort: (x) => x.f.paid, render: (x) => U.money(x.f.paid) },
        { key: "balance", label: "Balance", align: "right", sort: (x) => x.f.balance, render: (x) => `<span class="strong">${U.money(x.f.balance)}</span>` },
        { key: "pct", label: "Collected", sort: (x) => x.f.pct, render: (x) => UI.barRow(x.f.pct, U.pct(x.f.pct), x.f.status === "Overdue" ? "bad" : x.f.status === "Paid" ? "ok" : ""), width: "160px" },
        { key: "next", label: "Next due", sort: (x) => (x.f.next ? x.f.next.due : "9999"), render: (x) => (x.f.next ? `${U.fmtShort(x.f.next.due)}<div class="tiny faint">${U.money(x.f.next.remaining)}</div>` : '<span class="faint">—</span>') },
        { key: "status", label: "Status", sort: (x) => x.f.status, render: (x) => UI.chip(x.f.status) },
      ] })}</div>`;
  }

  function dues(all) {
    const today = U.today();
    const over = all.filter((x) => x.f.overdue > 0).sort((a, b) => b.f.overdue - a.f.overdue);
    const soon = all.filter((x) => x.f.overdue === 0 && x.f.next && U.daysBetween(today, x.f.next.due) <= 30).sort((a, b) => (a.f.next.due < b.f.next.due ? -1 : 1));
    const row = (x, kind) => { const i = kind === "over" ? x.f.inst.find((i) => i.status === "Overdue") : x.f.next; const days = U.daysBetween(i.due, today);
      return `<div class="list-item">${UI.person(x.s, `${esc(x.s.phone || "")} · ${esc(sel.courseLabel(sel.course(x.s)))}`)}<div class="grow"></div>
        <div class="r" style="min-width:120px"><div class="strong" style="${kind === "over" ? "color:var(--bad)" : ""}">${U.money(kind === "over" ? x.f.overdue : i.remaining)}</div><div class="tiny faint">${kind === "over" ? `${days} days late · since ${U.fmtShort(i.due)}` : `due ${U.fmtDate(i.due)} · in ${-days} days`}</div></div>
        <a class="btn btn-sm btn-ghost" href="#/students/${x.s.id}?tab=fees">Ledger</a><button class="btn btn-sm" data-collect="${x.s.id}" data-perm="fees.edit">${ic("wallet", 14)}Collect</button></div>`; };
    return `<div class="grid g-2"><div class="card"><div class="card-head"><div><h3>Overdue</h3><div class="hint">${U.money(U.sum(over, (x) => x.f.overdue))} across ${over.length}</div></div></div><div class="list">${over.map((x) => row(x, "over")).join("") || UI.empty("check", "Nothing overdue", "Every installment due so far is paid.")}</div></div>
      <div class="card"><div class="card-head"><div><h3>Due in the next 30 days</h3><div class="hint">${U.money(U.sum(soon, (x) => x.f.next.remaining))} expected</div></div></div><div class="list">${soon.map((x) => row(x, "soon")).join("") || UI.empty("clock", "No upcoming dues", "Nothing falls due in the next 30 days.")}</div></div></div>`;
  }

  function payments() {
    const pays = S.all("payments").filter((p) => !state.month || p.date.startsWith(state.month)).slice().sort((a, b) => (a.date < b.date ? 1 : -1));
    const months = Array.from(new Set(S.all("payments").map((p) => p.date.slice(0, 7)))).sort().reverse();
    return `<div class="filters"><select class="input" id="pmonth"><option value="">All months</option>${months.map((m) => `<option value="${m}" ${state.month === m ? "selected" : ""}>${U.fmtMonth(m)}</option>`).join("")}</select><span class="faint small">${U.plural(pays.length, "payment")} · ${U.money(U.sum(pays, (p) => p.amount))}</span><div class="grow"></div><button class="btn btn-sm" id="expPay" data-perm="export">${ic("download", 14)}Download</button></div>
      <div class="card flush">${UI.table({ rows: pays, rowAttr: (p) => `data-payid="${p.id}"`, cols: [
        { key: "date", label: "Date", sortable: false, render: (p) => U.fmtDate(p.date) },
        { key: "receipt", label: "Receipt", sortable: false, render: (p) => `<span class="mono">${esc(p.receipt || "—")}</span>` },
        { key: "s", label: "Student", sortable: false, render: (p) => { const s = S.get("students", p.studentId); return s ? `<a href="#/students/${s.id}" class="strong">${esc(sel.name(s))}</a> <span class="tiny faint mono">${esc(s.code)}</span>` : "—"; } },
        { key: "method", label: "Method", sortable: false, render: (p) => esc(p.method) },
        { key: "ref", label: "Reference", sortable: false, render: (p) => `<span class="mono small">${esc(p.ref || "—")}</span>` },
        { key: "amount", label: "Amount", align: "right", sortable: false, render: (p) => `<span class="strong">${U.money(p.amount)}</span>` },
      ], empty: UI.empty("wallet", "No payments", "Recorded payments appear here.") })}</div>`;
  }
})(window.App);
