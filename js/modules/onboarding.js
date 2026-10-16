/* Onboarding — a five-step wizard plus a live checklist pipeline.
   The checklist reads documents, fees, batches and classroom seats, so a
   change in any of those modules ticks the box here automatically. */
(function (A) {
  const U = A.util, UI = A.ui, S = A.store, sel = A.sel, esc = U.esc, ic = UI.icon;
  const F = () => A.schema.fields.students;

  /* Build an installment plan */
  A.planInstallments = (net, start, months, kind) => {
    const n = kind === "full" ? 1 : kind === "two" ? 2 : kind === "three" ? 3 : Math.max(1, months);
    const base = Math.floor(net / n / 100) * 100;
    return Array.from({ length: n }, (_, k) => ({ due: U.addMonths(start, Math.round((k * months) / n)), amount: k === n - 1 ? net - base * (n - 1) : base }));
  };

  A.onboard = {
    open(prefill = {}) {
      const st = S.settings();
      const firstCourse = S.all("courses")[0];
      const draft = { status: "Onboarding", startDate: U.today(), courseId: firstCourse ? firstCourse.id : "", source: "", discount: 0, plan: "three", firstPayment: "", method: "UPI", ref: "", files: [], ...prefill };
      let step = 0;
      const steps = ["Personal", "Enrolment", "Fees", "Documents", "Review"];
      const personal = F().filter((f) => f.section === "Personal" || f.section === "Contact");
      const enrol = F().filter((f) => f.section === "Enrolment" && f.key !== "status");

      const m = UI.modal({
        title: "Onboard a new student", eyebrow: "Admissions", size: "lg", live: false,
        sub: "Five quick steps. Everything can be edited later from the student profile.",
        body: () => {
          const head = `<div class="steps">${steps.map((s, i) => `<div class="step ${i === step ? "on" : i < step ? "done" : ""}"><div class="line"></div><span><b>0${i + 1}</b>${s}</span></div>`).join("")}</div>`;
          return head + [stepPersonal, stepEnrol, stepFees, stepDocs, stepReview][step]();
        },
        onMount: (body) => bind(body),
        actions: () => [
          { label: "Back", kind: "ghost", left: true, onClick: () => { collect(); if (step > 0) { step--; repaint(); } return false; } },
          { label: "Cancel", kind: "ghost" },
          { label: "Continue", kind: "primary", onClick: () => next() },
        ],
      });
      const repaint = () => {
        m.body.innerHTML = `<div class="steps">${steps.map((s, i) => `<div class="step ${i === step ? "on" : i < step ? "done" : ""}"><div class="line"></div><span><b>0${i + 1}</b>${s}</span></div>`).join("")}</div>` + [stepPersonal, stepEnrol, stepFees, stepDocs, stepReview][step]();
        bind(m.body);
        const btns = m.foot.querySelectorAll(".btn");
        btns[0].style.visibility = step ? "visible" : "hidden";
        btns[2].textContent = step === 4 ? "Create student" : "Continue";
        m.body.scrollTop = 0;
      };
      setTimeout(repaint, 0);

      function collect() {
        if (step === 0) Object.assign(draft, UI.readForm(m.body, personal));
        if (step === 1) Object.assign(draft, UI.readForm(m.body, enrol));
        if (step === 2) {
          const g = (n) => m.body.querySelector(`[name="${n}"]`);
          draft.fee = g("fee").value === "" ? null : Number(g("fee").value);
          draft.discount = Number(g("discount").value) || 0;
          draft.plan = g("plan").value; draft.firstPayment = g("firstPayment").value; draft.method = g("method").value; draft.ref = g("ref").value.trim();
        }
      }
      function next() {
        collect();
        if (step === 0 && !UI.validate(m.body, personal, draft)) return false;
        if (step === 1 && !UI.validate(m.body, enrol, draft)) return false;
        if (step === 0) {
          const dup = S.find("students", (s) => (draft.phone && String(s.phone).replace(/\D/g, "").slice(-10) === String(draft.phone).replace(/\D/g, "").slice(-10)) || (draft.email && s.email && s.email.toLowerCase() === draft.email.toLowerCase()));
          if (dup && !draft._dupOk) { draft._dupOk = true; UI.toast(`Heads up: ${sel.name(dup)} (${dup.code}) has the same phone or email. Continue to proceed anyway.`, "warn"); return false; }
        }
        if (step < 4) { step++; repaint(); return false; }
        create(); return true;
      }

      function feeInfo() {
        const c = S.get("courses", draft.courseId);
        const gross = draft.fee != null && draft.fee !== "" ? Number(draft.fee) : c ? c.fee : 0;
        const net = Math.max(0, gross - (Number(draft.discount) || 0));
        return { c, gross, net, inst: A.planInstallments(net, draft.startDate || U.today(), c ? c.months : 3, draft.plan) };
      }

      function stepPersonal() { return UI.form(personal, draft); }
      function stepEnrol() {
        return UI.form(enrol, draft) + `<div class="banner mt">${ic("monitor", 18)}<div class="grow">Workstation seats are assigned from <b>Classroom</b> once a batch is chosen. You can pick one now on the review step.</div></div>`;
      }
      function stepFees() {
        const { c, gross, net, inst } = feeInfo();
        const lists = st.lists;
        return `<div class="form-grid">
          <div class="form-section">Fee</div>
          <label class="field"><span class="field-label">Course fee (₹)</span><input class="input" type="number" name="fee" value="${draft.fee != null ? draft.fee : ""}" placeholder="${c ? c.fee : ""} (course default)"></label>
          <label class="field"><span class="field-label">Discount (₹)</span><input class="input" type="number" name="discount" value="${draft.discount || 0}"></label>
          <label class="field span-2"><span class="field-label">Payment plan</span><select class="input" name="plan">${[["full", "Full payment"], ["two", "2 installments"], ["three", "3 installments"], ["monthly", "Monthly"]].map(([v, l]) => `<option value="${v}" ${draft.plan === v ? "selected" : ""}>${l}</option>`).join("")}</select></label>
          <div class="span-2 field"><div class="stat-list"><div><div class="s-label">Gross</div><div class="s-value">${U.money(gross)}</div></div><div><div class="s-label">Net payable</div><div class="s-value">${U.money(net)}</div></div><div><div class="s-label">Installments</div><div class="s-value">${inst.length}</div></div></div>
            <div class="tiny faint" style="margin-top:4px">${inst.map((i) => `${U.fmtShort(i.due)} — ${U.money(i.amount)}`).join("  ·  ")}</div></div>
          <div class="form-section">First payment (optional)</div>
          <label class="field"><span class="field-label">Amount received (₹)</span><input class="input" type="number" name="firstPayment" value="${esc(draft.firstPayment)}" placeholder="${inst[0] ? inst[0].amount : ""}"></label>
          <label class="field"><span class="field-label">Method</span><select class="input" name="method">${lists.paymentMethods.map((x) => `<option ${draft.method === x ? "selected" : ""}>${esc(x)}</option>`).join("")}</select></label>
          <label class="field span-2"><span class="field-label">Reference / UTR</span><input class="input" name="ref" value="${esc(draft.ref)}" placeholder="Optional"></label>
        </div>`;
      }
      function stepDocs() {
        const req = st.requiredDocs || [];
        return `<div class="dropzone" id="dz"><div class="dz-icon">${ic("upload", 22)}</div><div class="strong">Drop files here or click to browse</div><div class="small faint" style="margin-top:4px">Photo, ID proof, certificates — PDF, JPG, PNG, DOCX. Stored securely in this browser.</div><input type="file" id="fileIn" multiple hidden></div>
          <div class="mt" id="fileList">${draft.files.map((f, i) => `<div class="file-row">${UI.fileIcon(f.file.name)}<div class="grow"><div class="small strong truncate">${esc(f.file.name)}</div><div class="tiny faint">${U.bytes(f.file.size)}</div></div><select class="input sm" data-type="${i}" style="width:210px">${st.lists.documentTypes.map((t) => `<option ${t === f.type ? "selected" : ""}>${esc(t)}</option>`).join("")}</select><button class="icon-btn sm" data-rm="${i}">${ic("x", 14)}</button></div>`).join("")}</div>
          <div class="mt small muted">Required for onboarding: ${req.map((t) => { const has = draft.files.some((f) => f.type === t); return `<span class="chip ${has ? "ok" : "muted"}" style="margin:2px">${esc(t)}</span>`; }).join("")}</div>`;
      }
      function stepReview() {
        const { c, net, inst } = feeInfo(); const b = S.get("batches", draft.batchId);
        const pcs = S.filter("computers", (p) => p.status === "Active" && (!draft.batchId || !sel.seatTaken(p.id, draft.batchId)));
        return `<div class="grid g-2">
          <div class="card"><div class="person" style="margin-bottom:14px">${UI.avatar(`${draft.firstName} ${draft.lastName || ""}`, 44)}<div><div class="serif" style="font-size:19px;line-height:1.1">${esc(draft.firstName)} ${esc(draft.lastName || "")}</div><div class="small faint">${esc(draft.phone)} · ${esc(draft.email || "no email")}</div></div></div>
            <dl class="kv"><dt>Programme</dt><dd>${esc(c ? c.name : "—")}</dd><dt>Batch</dt><dd>${b ? esc(`${b.name} · ${b.time}`) : "Not assigned"}</dd><dt>Starts</dt><dd>${U.fmtDate(draft.startDate)}</dd><dt>Net fee</dt><dd>${U.money(net)} in ${U.plural(inst.length, "installment")}</dd><dt>First payment</dt><dd>${draft.firstPayment ? U.money(draft.firstPayment) + " via " + esc(draft.method) : "—"}</dd><dt>Documents</dt><dd>${draft.files.length} file(s)</dd></dl></div>
          <div class="card"><h3 class="mb" style="font-size:14.5px;font-weight:550">Assign a workstation</h3>
            ${draft.batchId ? `<select class="input" name="computerId"><option value="">Assign later</option>${S.all("rooms").map((r) => `<optgroup label="${esc(r.name)}">${pcs.filter((p) => p.roomId === r.id).map((p) => `<option value="${p.id}" ${draft.computerId === p.id ? "selected" : ""}>${esc(p.label)} — ${esc(p.cpu)}</option>`).join("")}</optgroup>`).join("")}</select><p class="tiny faint" style="margin-top:8px">Only seats free in the ${esc(b.name)} batch are listed.</p>` : `<p class="small muted">Choose a batch on the Enrolment step to assign a seat.</p>`}
            <div class="sep"></div>
            <label class="toggle"><input type="checkbox" name="activate"><span class="track"></span>Mark as Active immediately</label>
            <p class="tiny faint" style="margin-top:8px">Otherwise the student stays in the onboarding pipeline until the checklist is complete.</p>
          </div></div>`;
      }

      function bind(body) {
        const dz = body.querySelector("#dz");
        if (dz) {
          const input = body.querySelector("#fileIn");
          const add = (files) => { [...files].forEach((file) => draft.files.push({ file, type: guessType(file.name) })); repaint(); };
          dz.onclick = () => input.click();
          input.onchange = () => add(input.files);
          dz.ondragover = (e) => { e.preventDefault(); dz.classList.add("drag"); };
          dz.ondragleave = () => dz.classList.remove("drag");
          dz.ondrop = (e) => { e.preventDefault(); dz.classList.remove("drag"); add(e.dataTransfer.files); };
          body.querySelectorAll("[data-type]").forEach((s) => (s.onchange = () => { draft.files[+s.dataset.type].type = s.value; repaint(); }));
          body.querySelectorAll("[data-rm]").forEach((b) => (b.onclick = () => { draft.files.splice(+b.dataset.rm, 1); repaint(); }));
        }
        const pc = body.querySelector('[name="computerId"]'); if (pc) pc.onchange = () => (draft.computerId = pc.value);
        const act = body.querySelector('[name="activate"]'); if (act) act.onchange = () => (draft.activate = act.checked);
        ["plan", "fee", "discount"].forEach((n) => { const e = body.querySelector(`[name="${n}"]`); if (e) e.onchange = () => { collect(); repaint(); }; });
      }

      function guessType(name) {
        const n = name.toLowerCase();
        if (/photo|pic|passport|selfie/.test(n) || /\.(jpe?g|png|heic)$/.test(n) && !/aadh|id|cert/.test(n)) return "Photo";
        if (/aadh|pan|id|licen|voter/.test(n)) return "ID Proof (Aadhaar)";
        if (/cert|mark|degree|transcript|10th|12th/.test(n)) return "Education Certificate";
        if (/address|bill|rent/.test(n)) return "Address Proof";
        if (/form|admission|application/.test(n)) return "Admission Form";
        return "Other";
      }

      async function create() {
        const { c, inst } = feeInfo();
        let rec;
        S.batch(() => {
          const v = {}; [...personal, ...enrol].forEach((f) => (v[f.key] = draft[f.key] == null ? "" : draft[f.key]));
          const tools = {}; (c ? c.tools : []).forEach((t) => (tools[t] = 0));
          rec = S.insert("students", {
            ...v, code: S.nextCode(), batchId: draft.batchId || null, status: draft.activate ? "Active" : "Onboarding",
            fee: draft.fee, discount: Number(draft.discount) || 0, installments: inst, tools, computerId: draft.computerId || null,
            source: draft.source || "Walk-in",
          }, { log: `Started onboarding · ${c ? c.name : ""}`, type: "students" });
          if (Number(draft.firstPayment) > 0) A.fees.addPayment(rec.id, { amount: Number(draft.firstPayment), method: draft.method, ref: draft.ref, note: "Admission payment", date: U.today() });
        });
        if (!rec) return;
        for (const f of draft.files) await A.docs.save(rec.id, f.file, f.type);
        UI.toast(`${sel.name(rec)} created — ${rec.code}`, "ok");
        A.navigate("students/" + rec.id);
      }
    },
  };

  A.actions.newStudent = { label: "Onboard a new student", icon: "userPlus", perm: "students.edit", run: () => A.onboard.open() };

  A.register({
    id: "onboarding", label: "Onboarding", icon: "userPlus", group: "people", order: 21, route: "onboarding",
    badge: () => { const n = S.count("students", (s) => s.status === "Onboarding"); return n ? { n, hot: true } : null; },
    render(el) {
      const list = S.filter("students", (s) => s.status === "Onboarding").sort((a, b) => b.createdAt - a.createdAt);
      const recent = S.filter("students", (s) => s.status === "Active").sort((a, b) => (b.startDate > a.startDate ? 1 : -1)).slice(0, 6);
      el.innerHTML = `<div class="page">
        ${UI.pageHead({ eyebrow: "Admissions", title: "Onboarding <em>pipeline</em>", sub: "New students stay here until their checklist is complete. Each item ticks automatically as documents, fees, batch and seat are added.", actions: `<button class="btn btn-accent" data-act="newStudent" data-perm="students.edit">${ic("userPlus", 15)}Onboard student</button>` })}
        ${list.length ? `<div class="grid g-3">${list.map(card).join("")}</div>` : `<div class="card">${UI.empty("userPlus", "No one in onboarding", "Start a new admission and it will appear here with its checklist.", `<button class="btn btn-primary" data-act="newStudent">${ic("plus", 14)}Onboard student</button>`)}</div>`}
        <div class="card flush mt-lg"><div class="card-head"><div><h3>Recently activated</h3><div class="hint">Latest students who completed onboarding</div></div></div>
          ${UI.table({ cols: [
            { key: "n", label: "Student", render: (s) => UI.person(s) },
            { key: "c", label: "Programme", render: (s) => UI.track(sel.course(s)) },
            { key: "d", label: "Started", render: (s) => U.fmtDate(s.startDate) },
            { key: "b", label: "Batch / seat", render: (s) => `${esc((sel.batch(s) || {}).name || "—")} · <span class="mono">${esc(sel.seatLabel(s))}</span>` },
          ], rows: recent, rowAttr: (s) => `data-href="students/${s.id}"` })}
        </div></div>`;
      el.querySelectorAll("[data-activate]").forEach((b) => (b.onclick = () => A.students.setStatus(S.get("students", b.dataset.activate), "Active")));
      el.querySelectorAll("[data-fix]").forEach((b) => (b.onclick = () => fix(S.get("students", b.dataset.id), b.dataset.fix)));
    },
  });

  function card(s) {
    const ch = sel.checklist(s); const c = sel.course(s);
    return `<div class="card ob-card ${ch.complete ? "glow" : ""}">
      <div class="row between"><div class="person" data-href="students/${s.id}" style="cursor:pointer">${UI.avatar(sel.name(s), 40, s.id)}<div><div class="p-name">${esc(sel.name(s))}</div><div class="p-sub">${esc(s.code)} · joined ${U.relTime(s.createdAt)}</div></div></div>${UI.ring(ch.done / ch.total, 44, 4)}</div>
      <div class="row" style="gap:8px">${UI.track(c)}<span class="small muted truncate">${esc(c ? c.name : "")}</span></div>
      <div class="check-list">${ch.items.map((i) => `<div class="check ${i.done ? "done" : ""}"><span class="box">${i.done ? ic("check", 12) : ""}</span><div class="grow"><div>${esc(i.label)}</div><div class="tiny faint">${esc(i.detail)}</div></div>${i.done ? "" : `<button class="btn btn-xs act" data-fix="${i.key}" data-id="${s.id}">Fix</button>`}</div>`).join("")}</div>
      <button class="btn ${ch.complete ? "btn-accent" : ""}" data-activate="${s.id}" ${ch.complete ? "" : 'title="You can activate anyway — missing items stay visible on the profile."'}>${ic("check", 15)}${ch.complete ? "Activate student" : "Activate anyway"}</button>
    </div>`;
  }

  function fix(s, key) {
    if (key === "personal") return A.students.edit(s);
    if (key === "docs") return A.docs.upload(s);
    if (key === "fees") return (s.installments || []).length ? A.fees.recordPayment(s.id) : A.fees.editPlan(s);
    if (key === "batch") return A.students.edit(s, "Enrolment");
    if (key === "seat") return A.classroom.assignFor(s);
  }
})(window.App);
