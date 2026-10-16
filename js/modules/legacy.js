/* Legacy import — bring old records in from spreadsheets, PDFs, Word files
   and scanned images (OCR). Tables get a column-mapping step; free text
   (forms, scans) gets automatic field extraction you can correct before saving.
   Libraries (SheetJS, pdf.js, mammoth, Tesseract) load only when needed. */
(function (A) {
  const U = A.util, UI = A.ui, S = A.store, sel = A.sel, esc = U.esc, ic = UI.icon;
  const queue = []; // in-memory work list for this session

  /* ---------- Targets & column synonyms ---------- */
  const TARGETS = {
    students: { label: "Students", fields: {
      fullName: ["name", "student name", "full name", "student", "candidate name", "name of the student"],
      firstName: ["first name", "fname", "given name"], lastName: ["last name", "surname", "lname", "initial"],
      code: ["student id", "id", "roll no", "reg no", "register no", "admission no", "enrollment no", "enrolment no", "student code"],
      phone: ["phone", "mobile", "contact", "whatsapp", "phone number", "mobile no", "contact no", "cell"],
      email: ["email", "e mail", "mail id", "email id", "mail"], gender: ["gender", "sex"],
      dob: ["dob", "date of birth", "birth date", "d o b"], address: ["address", "residential address", "permanent address"],
      city: ["city", "town", "location"], pincode: ["pincode", "pin", "pin code", "postal code", "zip"],
      guardianName: ["father name", "guardian", "guardian name", "parent name", "father s name", "mother name"],
      guardianPhone: ["parent phone", "father mobile", "guardian contact", "guardian phone", "parent mobile", "parent contact"],
      education: ["qualification", "education", "degree", "highest qualification"], occupation: ["occupation", "profession", "working"],
      course: ["course", "program", "programme", "course name", "course enrolled"], batch: ["batch", "timing", "slot", "batch time"],
      startDate: ["joining date", "admission date", "start date", "doj", "date of joining", "date of admission", "joined"],
      status: ["status", "current status"], fee: ["fee", "total fee", "course fee", "fees", "total fees"], discount: ["discount", "concession", "scholarship"],
      paid: ["paid", "amount paid", "fee paid", "fees paid", "received"], source: ["source", "lead source", "how did you hear"], notes: ["notes", "remarks", "comments"],
    }, labels: { fullName: "Full name (auto-split)", code: "Student ID", guardianName: "Guardian name", guardianPhone: "Guardian phone", course: "Course (matched by name)", batch: "Batch (matched by name)", startDate: "Start / joining date", paid: "Amount already paid → payment", dob: "Date of birth" } },
    payments: { label: "Payments", fields: {
      student: ["student", "name", "student id", "roll no", "student name", "phone", "mobile"], amount: ["amount", "paid", "fee paid", "amount paid", "received"],
      date: ["date", "paid on", "payment date", "received on"], method: ["mode", "method", "payment mode", "payment method"], ref: ["ref", "reference", "txn id", "transaction id", "utr"],
      receipt: ["receipt", "receipt no", "bill no", "invoice"], note: ["note", "remarks", "notes"],
    }, labels: { student: "Student (ID, name or phone)" } },
    inventory: { label: "Inventory", fields: {
      name: ["item", "name", "product", "item name", "description"], category: ["category", "type", "group"], qty: ["qty", "quantity", "count", "total", "nos", "units"],
      faulty: ["faulty", "damaged", "not working", "repair"], vendor: ["vendor", "supplier", "brand"], notes: ["notes", "remarks"],
    }, labels: { qty: "Quantity" } },
  };
  const label = (t, k) => (TARGETS[t].labels || {})[k] || U.cap(k.replace(/([A-Z])/g, " $1"));

  function guess(target, headers) {
    const map = {}, used = new Set();
    const f = TARGETS[target].fields;
    headers.forEach((h, i) => {
      const n = U.norm(h); if (!n) return;
      let best = Object.keys(f).find((k) => !used.has(k) && f[k].includes(n));
      if (!best) { let len = 0; Object.keys(f).forEach((k) => { if (used.has(k)) return; f[k].forEach((s) => { if (s.length > 2 && (n.includes(s) || (n.length > 3 && s.includes(n))) && s.length > len) { best = k; len = s.length; } }); }); }
      if (best) { map[i] = best; used.add(best); }
    });
    return map;
  }

  /* ---------- Matching helpers ---------- */
  function matchCourse(v) {
    if (!v) return null; const n = U.norm(v); const cs = S.all("courses");
    const exact = cs.find((c) => U.norm(c.name) === n); if (exact) return exact;
    const track = /\bui\b|\bux\b|ui ux|product|web design|app design/.test(n) ? "UI/UX" : /graphic|\bgd\b|print|brand|visual|dtp|photoshop/.test(n) ? "Graphic Design" : null;
    let months = Number((n.match(/(\d+)\s*(?:m\b|mo\b|mon|month)/) || [])[1]) || null;
    if (!months) { if (/foundation|basic|beginner|short/.test(n)) months = 3; else if (/professional|advanced|\bpro\b/.test(n)) months = 6; else if (/master|diploma|1 ?y|one year|year/.test(n)) months = 12; }
    const pool = cs.filter((c) => !track || c.track === track);
    return pool.find((c) => !months || c.months === months) || (track ? pool[0] : null);
  }
  const matchBatch = (v) => { if (!v) return null; const n = U.norm(v); return S.find("batches", (b) => n.includes(U.norm(b.name)) || U.norm(b.time).includes(n)) || null; };
  const last10 = (p) => String(p || "").replace(/\D/g, "").slice(-10);
  const findStudent = (v) => {
    if (!v) return null; const s = String(v).trim(), n = U.norm(s), d = last10(s);
    return S.find("students", (x) => x.code && U.norm(x.code) === n) || (d.length === 10 && S.find("students", (x) => last10(x.phone) === d)) || S.find("students", (x) => U.norm(sel.name(x)) === n) || null;
  };
  const normGender = (v) => { const n = U.norm(v); return /^(f|female|girl|woman)/.test(n) ? "Female" : /^(m|male|boy|man)/.test(n) ? "Male" : v ? "Other" : ""; };
  const normStatus = (v, dflt) => { const l = S.settings().lists.statuses; const n = U.norm(v); return l.find((x) => U.norm(x) === n) || (/complet|finish|pass|graduat|done/.test(n) ? "Completed" : /drop|left|discontinu|cancel/.test(n) ? "Dropped" : /active|ongoing|current|studying/.test(n) ? "Active" : dflt); };

  /* ---------- Text → fields (forms, scans) ---------- */
  function extract(text) {
    const t = String(text || "").replace(/\r/g, "").replace(/[ \t]+/g, " ");
    const out = {};
    const lab = (re) => { const m = t.match(new RegExp("(?:^|\\n)\\s*(?:" + re + ")\\s*[:\\-–.]*\\s*([^\\n]+)", "i")); if (!m) return null; return m[1].split(/\s{2,}|\t|\s(?=[A-Z][A-Za-z' ]{1,22}\s?:)/)[0].trim().replace(/[_.]{3,}/g, "").trim() || null; };
    const email = t.match(/[\w.+-]+@[\w-]+\.[\w.]+/); if (email) out.email = email[0].toLowerCase();
    const phones = (t.match(/(?:\+?91[\s-]?)?[6-9]\d{4}[\s-]?\d{5}\b/g) || []).map(U.phone);
    const gp = lab("father'?s? (?:mobile|phone|contact)(?: no)?|parent'?s? (?:mobile|phone|contact)(?: no)?|guardian'?s? (?:mobile|phone|contact)(?: no)?");
    if (gp) out.guardianPhone = U.phone(gp);
    const sp = lab("mobile(?: no| number)?|phone(?: no| number)?|contact(?: no| number)?|whatsapp(?: no)?");
    out.phone = sp && /\d{10}/.test(sp.replace(/\D/g, "")) ? U.phone(sp) : phones.find((p) => p !== out.guardianPhone) || "";
    if (!out.guardianPhone && phones.length > 1) out.guardianPhone = phones.find((p) => p !== out.phone) || "";
    const name = lab("student'?s? name|name of the (?:student|candidate|applicant)|candidate'?s? name|full name|applicant name|name");
    if (name) { const clean = name.replace(/^(mr|ms|mrs|miss)\.?\s+/i, "").replace(/[^A-Za-z .'-]/g, "").trim(); const parts = clean.split(/\s+/); out.firstName = U.titleCase(parts[0] || ""); out.lastName = U.titleCase(parts.slice(1).join(" ")); }
    const g = lab("father'?s? name|guardian'?s? name|parent'?s? name|mother'?s? name|s\\/o|d\\/o"); if (g) out.guardianName = U.titleCase(g.replace(/[^A-Za-z .'-]/g, "").trim());
    const dob = lab("d\\.?\\s?o\\.?\\s?b\\.?|date of birth|birth date"); if (dob) out.dob = U.looseDate(dob) || "";
    const addr = lab("residential address|permanent address|present address|address"); if (addr) out.address = addr;
    const city = lab("city|town|district"); if (city) out.city = U.titleCase(city);
    const pin = t.match(/\b[1-9]\d{2}\s?\d{3}\b/); if (pin) out.pincode = pin[0].replace(/\s/, "");
    const edu = lab("qualification|highest qualification|education(?:al qualification)?|degree"); if (edu) { const l = S.settings().lists.education; out.education = l.find((x) => U.norm(edu).includes(U.norm(x).split(" ")[0])) || edu; }
    const course = lab("course(?: name| enrolled| applied)?|program(?:me)?"); const c = matchCourse(course || t.slice(0, 600)); if (c) out.courseId = c.id;
    const doj = lab("date of (?:joining|admission)|joining date|admission date|doj|start date"); if (doj) out.startDate = U.looseDate(doj) || "";
    const gen = t.match(/\b(male|female)\b/i); if (gen) out.gender = normGender(gen[1]);
    const fee = lab("total fees?|course fees?|fees?(?: amount)?"); if (fee && U.num(fee)) out.fee = U.num(fee);
    return out;
  }

  /* ---------- File processing ---------- */
  const TABLE_EXT = ["xlsx", "xls", "csv", "ods", "tsv"], IMG_EXT = ["png", "jpg", "jpeg", "webp", "bmp", "tif", "tiff", "gif"];
  function add(files) {
    [...files].forEach((file) => { const it = { id: U.uid("imp"), file, status: "queued", progress: 0, msg: "Waiting…", target: "students", mode: null, opts: { status: "Completed", skipDup: true, courseId: "" }, fields: {}, docType: "Admission Form", attachTo: "" }; queue.unshift(it); process(it); });
    A.refresh();
  }
  const set = (it, patch) => { Object.assign(it, patch); A.current() && A.current().m.id === "legacy" && A.refresh(); };

  async function process(it) {
    const ext = U.ext(it.file.name);
    try {
      set(it, { status: "processing", msg: "Reading file…", progress: 0.05 });
      if (TABLE_EXT.includes(ext)) {
        await A.load(A.libs.xlsx);
        // CSV/TSV stay raw text so dd/mm/yyyy dates are parsed Indian-style by U.looseDate (SheetJS would assume US mm/dd)
        const wb = ext === "csv" || ext === "tsv"
          ? XLSX.read(await it.file.text(), { type: "string", raw: true, FS: ext === "tsv" ? "\t" : undefined })
          : XLSX.read(await it.file.arrayBuffer(), { type: "array", cellDates: true });
        it.wb = wb; it.sheetNames = wb.SheetNames; useSheet(it, wb.SheetNames[0]);
        set(it, { status: "ready", mode: "table", msg: `${wb.SheetNames.length} sheet(s)`, progress: 1 });
      } else if (ext === "pdf") {
        await A.load(A.libs.pdf);
        pdfjsLib.GlobalWorkerOptions.workerSrc = A.libs.pdfWorker;
        const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(await it.file.arrayBuffer()) }).promise;
        let text = "";
        for (let p = 1; p <= pdf.numPages; p++) {
          const page = await pdf.getPage(p); const tc = await page.getTextContent();
          let lastY = null; tc.items.forEach((x) => { const y = Math.round(x.transform[5]); text += lastY !== null && Math.abs(y - lastY) > 3 ? "\n" : lastY !== null ? " " : ""; text += x.str; lastY = y; });
          text += "\n\n"; set(it, { msg: `Reading page ${p} of ${pdf.numPages}`, progress: 0.1 + (0.4 * p) / pdf.numPages });
        }
        if (text.replace(/\s/g, "").length < 40) {
          set(it, { msg: "Scanned PDF detected — running OCR…" });
          text = "";
          for (let p = 1; p <= Math.min(pdf.numPages, 10); p++) {
            const page = await pdf.getPage(p); const vp = page.getViewport({ scale: 2 });
            const cv = document.createElement("canvas"); cv.width = vp.width; cv.height = vp.height;
            await page.render({ canvasContext: cv.getContext("2d"), viewport: vp }).promise;
            text += (await ocr(cv, it, `OCR page ${p} of ${Math.min(pdf.numPages, 10)}`)) + "\n\n";
          }
          it.ocr = true;
        }
        textReady(it, text);
      } else if (ext === "docx") {
        await A.load(A.libs.mammoth);
        const buf = await it.file.arrayBuffer();
        const [{ value: text }, { value: html }] = await Promise.all([mammoth.extractRawText({ arrayBuffer: buf }), mammoth.convertToHtml({ arrayBuffer: buf.slice(0) })]);
        const doc = new DOMParser().parseFromString(html, "text/html");
        const tables = [...doc.querySelectorAll("table")].map((t) => [...t.querySelectorAll("tr")].map((tr) => [...tr.querySelectorAll("td,th")].map((td) => td.textContent.trim()))).filter((t) => t.length >= 2 && t[0].length >= 2);
        if (tables.length) { it.docTables = tables; it.sheetNames = tables.map((_, i) => `Table ${i + 1}`); }
        textReady(it, text);
        if (tables.length && tables[0].length > 3) { useSheet(it, it.sheetNames[0]); it.mode = "table"; A.refresh(); }
      } else if (IMG_EXT.includes(ext)) {
        textReady(it, await ocr(it.file, it, "Recognising text"), true);
      } else if (ext === "txt") {
        textReady(it, await it.file.text());
      } else if (ext === "doc") {
        throw new Error("Old .doc format — open it in Word and save as .docx or PDF, then drop it here.");
      } else throw new Error("Unsupported file type ." + ext);
    } catch (e) { console.error(e); set(it, { status: "error", msg: e.message || "Could not read this file" }); }
  }
  async function ocr(image, it, label) {
    await A.load(A.libs.tesseract);
    const res = await Tesseract.recognize(image, "eng", { logger: (m) => { if (m.status === "recognizing text") set(it, { msg: `${label} · ${Math.round(m.progress * 100)}%`, progress: 0.5 + m.progress * 0.5 }); else set(it, { msg: `${U.cap(m.status)}…` }); } });
    return res.data.text;
  }
  function textReady(it, text, ocrd) {
    it.text = text.trim(); it.fields = extract(it.text); if (ocrd) it.ocr = true;
    set(it, { status: "ready", mode: it.mode || "text", progress: 1, msg: `${it.ocr ? "OCR · " : ""}${it.text.split(/\s+/).filter(Boolean).length} words` });
  }
  function useSheet(it, name) {
    let rows;
    if (it.docTables) rows = it.docTables[it.sheetNames.indexOf(name)] || [];
    else rows = XLSX.utils.sheet_to_json(it.wb.Sheets[name], { header: 1, defval: "", raw: true, blankrows: false });
    let h = rows.findIndex((r, i) => i < 15 && r.filter((c) => typeof c === "string" && c.trim()).length >= 2);
    if (h < 0) h = 0;
    it.sheet = name; it.headers = (rows[h] || []).map((x) => String(x).trim());
    it.rows = rows.slice(h + 1).filter((r) => r.some((c) => String(c).trim() !== ""));
    it.map = guess(it.target, it.headers);
  }

  /* ---------- Import actions ---------- */
  function rowObj(it, r) { const o = {}; Object.entries(it.map).forEach(([i, k]) => { if (k) o[k] = r[i] instanceof Date ? r[i] : String(r[i] == null ? "" : r[i]).trim(); }); return o; }
  function importTable(it) {
    let ok = 0, skip = 0, fail = 0;
    S.batch(() => {
      it.rows.forEach((r) => {
        const o = rowObj(it, r);
        try {
          if (it.target === "students") {
            let first = o.firstName, lastN = o.lastName;
            if (o.fullName && !first) { const p = String(o.fullName).replace(/^(mr|ms|mrs|miss)\.?\s+/i, "").split(/\s+/); first = p[0]; lastN = lastN || p.slice(1).join(" "); }
            if (!first) { fail++; return; }
            const phone = o.phone ? U.phone(o.phone) : "";
            if (it.opts.skipDup && ((phone && S.find("students", (x) => last10(x.phone) === last10(phone))) || (o.email && S.find("students", (x) => (x.email || "").toLowerCase() === String(o.email).toLowerCase())) || (o.code && S.find("students", (x) => x.code === o.code)))) { skip++; return; }
            const c = matchCourse(o.course) || S.get("courses", it.opts.courseId);
            const b = matchBatch(o.batch);
            const start = U.looseDate(o.startDate) || U.today();
            // Old registers often record only what was paid — treat that as the agreed fee rather than flagging a false balance
            const paidIn = U.num(o.paid);
            const fee = U.num(o.fee) != null ? U.num(o.fee) : paidIn > 0 ? paidIn : null, discount = U.num(o.discount) || 0;
            const net = Math.max(0, (fee != null ? fee : c ? c.fee : 0) - discount);
            const tools = {}; (c ? c.tools : []).forEach((t) => (tools[t] = 0));
            const rec = S.insert("students", {
              code: o.code || S.nextCode(), firstName: U.titleCase(first), lastName: U.titleCase(lastN || ""), phone, email: o.email ? String(o.email).toLowerCase() : "",
              gender: normGender(o.gender), dob: U.looseDate(o.dob) || "", address: o.address || "", city: o.city ? U.titleCase(o.city) : "", pincode: o.pincode || "",
              guardianName: o.guardianName ? U.titleCase(o.guardianName) : "", guardianPhone: o.guardianPhone ? U.phone(o.guardianPhone) : "", education: o.education || "", occupation: o.occupation || "",
              courseId: c ? c.id : null, batchId: b ? b.id : null, startDate: start, status: normStatus(o.status, it.opts.status), source: o.source || "Legacy import", notes: o.notes || "",
              fee: fee, discount, installments: net ? [{ due: start, amount: net }] : [], tools, computerId: null, legacy: it.file.name,
            });
            if (paidIn > 0) A.fees.addPayment(rec.id, { amount: paidIn, date: start, method: "Cash", note: "Imported from legacy records" });
            ok++;
          } else if (it.target === "payments") {
            const s = findStudent(o.student); const amt = U.num(o.amount);
            if (!s || !(amt > 0)) { fail++; return; }
            S.insert("payments", { studentId: s.id, amount: amt, date: U.looseDate(o.date) || U.today(), method: S.settings().lists.paymentMethods.find((m) => U.norm(o.method).includes(U.norm(m))) || o.method || "Cash", ref: o.ref || "", receipt: o.receipt || "", note: o.note || "Legacy import" });
            ok++;
          } else if (it.target === "inventory") {
            if (!o.name) { fail++; return; }
            const ex = S.find("inventory", (x) => U.norm(x.name) === U.norm(o.name));
            const rec = { name: o.name, category: o.category || "Other", qty: U.num(o.qty) || 0, faulty: U.num(o.faulty) || 0, vendor: o.vendor || "", notes: o.notes || "" };
            if (ex && it.opts.skipDup) { S.update("inventory", ex.id, rec); } else S.insert("inventory", { ...rec, minSpare: 0 });
            ok++;
          }
        } catch (e) { console.error(e); fail++; }
      });
    });
    S.log(`Legacy import · ${it.file.name}: ${ok} ${TARGETS[it.target].label.toLowerCase()} imported${skip ? `, ${skip} duplicates skipped` : ""}${fail ? `, ${fail} rows not usable` : ""}`, null, "import");
    it.status = "imported"; it.msg = `${ok} imported · ${skip} skipped · ${fail} not usable`;
    UI.toast(`${ok} ${TARGETS[it.target].label.toLowerCase()} imported`, ok ? "ok" : "warn");
    A.refresh();
  }

  async function importText(it) {
    const f = it.fields;
    if (it.attachTo) {
      const s = S.get("students", it.attachTo);
      const patch = {}; Object.entries(f).forEach(([k, v]) => { if (v && !s[k] && k !== "courseId") patch[k] = v; });
      S.update("students", s.id, patch, { log: `Legacy record merged from ${it.file.name} (${Object.keys(patch).length} fields filled)` });
      await A.docs.save(s.id, it.file, it.docType);
      it.status = "imported"; it.msg = `Merged into ${sel.name(s)}`; UI.toast(`Merged into ${sel.name(s)}`, "ok"); A.refresh(); return;
    }
    if (!f.firstName) return UI.toast("A first name is needed to create a student.", "warn");
    const c = S.get("courses", f.courseId);
    const start = f.startDate || U.today();
    const fee = f.fee != null && f.fee !== "" ? Number(f.fee) : null;
    const net = Math.max(0, (fee != null ? fee : c ? c.fee : 0));
    const tools = {}; (c ? c.tools : []).forEach((t) => (tools[t] = 0));
    const rec = S.insert("students", { ...f, fee, code: S.nextCode(), startDate: start, status: f.status || "Completed", source: "Legacy import", discount: 0, installments: net ? [{ due: start, amount: net }] : [], tools, computerId: null, batchId: f.batchId || null, legacy: it.file.name }, { log: `Created from legacy ${it.ocr ? "scan" : "document"} ${it.file.name}` });
    await A.docs.save(rec.id, it.file, it.docType);
    it.status = "imported"; it.msg = `Created ${sel.name(rec)} (${rec.code})`; it.createdId = rec.id;
    UI.toast(`${sel.name(rec)} created`, "ok"); A.refresh();
  }

  /* ---------- Page ---------- */
  A.register({
    id: "legacy", label: "Legacy Import", icon: "scan", group: "data", order: 51, route: "legacy", flag: "import",
    badge: () => { const n = queue.filter((q) => q.status === "processing").length; return n ? { n, hot: true } : null; },
    render(el) {
      el.innerHTML = `<div class="page">
        ${UI.pageHead({ eyebrow: "Data", title: "Legacy <em>import</em>", sub: "Bring old admission registers, fee books and scanned forms into the portal. Spreadsheets are mapped column by column; PDFs, Word files and photos are read with OCR and turned into editable fields." })}
        <div class="dropzone" id="dz" style="padding:44px 20px"><div class="dz-icon">${ic("scan", 22)}</div><div class="serif" style="font-size:20px">Drop old records here</div><div class="small faint" style="margin-top:6px">or click to choose files — several at once is fine</div>
          <div class="row wrap" style="justify-content:center;gap:6px;margin-top:16px">${["Excel .xlsx / .xls", "CSV", "PDF (text or scanned)", "Word .docx", "JPG / PNG photos", "Text .txt"].map((x) => `<span class="tag">${x}</span>`).join("")}</div><input type="file" id="fi" multiple hidden accept=".xlsx,.xls,.csv,.ods,.tsv,.pdf,.docx,.doc,.txt,image/*"></div>
        <p class="tiny faint mt">Files are processed inside this browser — nothing is uploaded to a server. OCR downloads its language model (~10 MB) the first time.</p>
        <div class="stack mt-lg">${queue.map(itemCard).join("")}</div>
      </div>`;
      const dz = el.querySelector("#dz"), fi = el.querySelector("#fi");
      dz.onclick = () => fi.click(); fi.onchange = () => add(fi.files);
      dz.ondragover = (e) => { e.preventDefault(); dz.classList.add("drag"); }; dz.ondragleave = () => dz.classList.remove("drag");
      dz.ondrop = (e) => { e.preventDefault(); dz.classList.remove("drag"); add(e.dataTransfer.files); };
      queue.forEach((it) => bindItem(el.querySelector(`[data-item="${it.id}"]`), it));
    },
  });

  function itemCard(it) {
    const head = `<div class="row" style="gap:12px">${UI.fileIcon(it.file.name)}<div class="grow" style="min-width:0"><div class="strong truncate">${esc(it.file.name)}</div><div class="tiny faint">${U.bytes(it.file.size)} · ${esc(it.msg)}</div></div>
      ${it.status === "processing" ? `<div style="width:160px">${UI.bar(it.progress)}</div>` : it.status === "error" ? UI.chip("Error", "bad") : it.status === "imported" ? UI.chip("Imported", "ok") : it.status === "ready" ? UI.chip("Ready to review", "info") : UI.chip("Queued", "muted")}
      ${it.mode && it.status === "ready" && it.text && it.sheetNames ? UI.seg("mode-" + it.id, [{ value: "table", label: "Table" }, { value: "text", label: "Text" }], it.mode) : ""}
      ${it.createdId ? `<a class="btn btn-sm" href="#/students/${it.createdId}">Open profile</a>` : ""}<button class="icon-btn sm" data-rm title="Remove from list">${ic("x", 15)}</button></div>`;
    let body = "";
    if (it.status === "ready") body = it.mode === "table" ? tableBody(it) : textBody(it);
    return `<div class="card" data-item="${it.id}">${head}${body ? `<div class="sep"></div>${body}` : ""}</div>`;
  }

  function tableBody(it) {
    const t = TARGETS[it.target];
    const mapped = Object.values(it.map).filter(Boolean);
    const preview = it.rows.slice(0, 5).map((r) => rowObj(it, r));
    const keys = Array.from(new Set(mapped));
    return `<div class="row wrap mb" style="gap:10px">
        <label class="field" style="width:200px"><span class="field-label">Import as</span><select class="input sm" data-target>${Object.entries(TARGETS).map(([k, v]) => `<option value="${k}" ${it.target === k ? "selected" : ""}>${v.label}</option>`).join("")}</select></label>
        ${it.sheetNames && it.sheetNames.length > 1 ? `<label class="field" style="width:200px"><span class="field-label">Sheet / table</span><select class="input sm" data-sheet>${it.sheetNames.map((s) => `<option ${s === it.sheet ? "selected" : ""}>${esc(s)}</option>`).join("")}</select></label>` : ""}
        ${it.target === "students" ? `<label class="field" style="width:170px"><span class="field-label">Default status</span><select class="input sm" data-opt="status">${S.settings().lists.statuses.map((s) => `<option ${it.opts.status === s ? "selected" : ""}>${s}</option>`).join("")}</select></label>
          <label class="field" style="width:240px"><span class="field-label">Course when not matched</span><select class="input sm" data-opt="courseId"><option value="">Leave blank</option>${S.all("courses").map((c) => `<option value="${c.id}" ${it.opts.courseId === c.id ? "selected" : ""}>${esc(c.name)}</option>`).join("")}</select></label>` : ""}
        <label class="toggle small" style="margin-top:20px"><input type="checkbox" data-opt="skipDup" ${it.opts.skipDup ? "checked" : ""}><span class="track"></span>${it.target === "inventory" ? "Update items with the same name" : "Skip duplicates (phone / email / ID)"}</label>
      </div>
      <div class="grid g-2">
        <div><div class="field-label mb">Column mapping · ${U.plural(it.rows.length, "row")} found</div>
          ${it.headers.map((h, i) => `<div class="map-row"><div class="src truncate">${esc(h || `Column ${i + 1}`)}<small class="truncate">${esc(String((it.rows[0] || [])[i] instanceof Date ? U.iso(it.rows[0][i]) : (it.rows[0] || [])[i] || ""))}</small></div><span class="faint">${ic("arrowR", 14)}</span><select class="input sm" data-map="${i}"><option value="">— Skip —</option>${Object.keys(t.fields).map((k) => `<option value="${k}" ${it.map[i] === k ? "selected" : ""}>${esc(label(it.target, k))}</option>`).join("")}</select></div>`).join("")}</div>
        <div><div class="field-label mb">Preview (first 5 rows, as they will be imported)</div>
          <div class="card flush">${keys.length ? `<div class="tbl-wrap"><table class="tbl compact"><thead><tr>${keys.map((k) => `<th>${esc(label(it.target, k))}</th>`).join("")}</tr></thead><tbody>${preview.map((o) => `<tr>${keys.map((k) => `<td class="small">${esc(o[k] instanceof Date ? U.iso(o[k]) : k === "course" ? ((matchCourse(o[k]) || {}).name || o[k] + " (no match)") : o[k])}</td>`).join("")}</tr>`).join("")}</tbody></table></div>` : UI.empty("sheet", "Map at least one column", "Choose a target field for each column you want to keep.")}</div>
          <button class="btn btn-accent mt" data-import ${keys.length ? "" : "disabled"}>${ic("check", 15)}Import ${U.plural(it.rows.length, "row")} as ${t.label.toLowerCase()}</button></div>
      </div>`;
  }

  function textBody(it) {
    const fields = A.schema.fields.students.filter((f) => !["notes", "goal", "source"].includes(f.key));
    const vals = { status: "Completed", ...it.fields };
    const found = Object.values(it.fields).filter(Boolean).length;
    return `<div class="grid g-2">
        <div><div class="row between mb"><span class="field-label">Extracted text ${it.ocr ? "(OCR — correct anything misread)" : ""}</span><button class="btn btn-xs" data-reextract>${ic("refresh", 12)}Re-read fields</button></div>
          <textarea class="input raw-text" data-text style="min-height:420px">${esc(it.text)}</textarea></div>
        <div><div class="banner" style="margin-bottom:14px">${ic("sparkle", 18)}<div class="small grow">${found} field${found === 1 ? "" : "s"} detected automatically. Review, fill the gaps and save.</div></div>
          <div class="row wrap mb" style="gap:10px"><label class="field grow"><span class="field-label">Save as</span><select class="input sm" data-attach><option value="">Create a new student</option>${S.all("students").slice().sort((a, b) => sel.name(a).localeCompare(sel.name(b))).map((s) => `<option value="${s.id}" ${it.attachTo === s.id ? "selected" : ""}>Merge into ${esc(sel.name(s))} (${esc(s.code)})</option>`).join("")}</select></label>
            <label class="field" style="width:200px"><span class="field-label">Keep original as</span><select class="input sm" data-doctype>${S.settings().lists.documentTypes.map((t) => `<option ${it.docType === t ? "selected" : ""}>${esc(t)}</option>`).join("")}</select></label></div>
          <div data-fields style="${it.attachTo ? "opacity:.55" : ""}">${UI.form(fields, vals)}</div>
          <button class="btn btn-accent mt" data-save>${ic("check", 15)}${it.attachTo ? "Merge & attach document" : "Create student & attach document"}</button></div>
      </div>`;
  }

  function bindItem(card, it) {
    if (!card) return;
    const q = (s) => card.querySelector(s);
    q("[data-rm]").onclick = () => { queue.splice(queue.indexOf(it), 1); A.refresh(); };
    UI.bindSeg(card, "mode-" + it.id, (v) => { it.mode = v; if (v === "table" && !it.headers) useSheet(it, it.sheetNames[0]); A.refresh(); });
    if (it.status !== "ready") return;
    if (it.mode === "table") {
      q("[data-target]").onchange = (e) => { it.target = e.target.value; it.map = guess(it.target, it.headers); A.refresh(); };
      q("[data-sheet]") && (q("[data-sheet]").onchange = (e) => { useSheet(it, e.target.value); A.refresh(); });
      card.querySelectorAll("[data-opt]").forEach((x) => (x.onchange = () => { it.opts[x.dataset.opt] = x.type === "checkbox" ? x.checked : x.value; A.refresh(); }));
      card.querySelectorAll("[data-map]").forEach((x) => (x.onchange = () => { const v = x.value; Object.keys(it.map).forEach((k) => { if (it.map[k] === v && v) delete it.map[k]; }); if (v) it.map[x.dataset.map] = v; else delete it.map[x.dataset.map]; A.refresh(); }));
      q("[data-import]").onclick = () => importTable(it);
    } else {
      const fields = A.schema.fields.students;
      q("[data-text]").oninput = (e) => (it.text = e.target.value);
      q("[data-reextract]").onclick = () => { it.fields = extract(it.text); A.refresh(); UI.toast("Fields re-read from text", "ok"); };
      q("[data-attach]").onchange = (e) => { it.attachTo = e.target.value; A.refresh(); };
      q("[data-doctype]").onchange = (e) => (it.docType = e.target.value);
      q("[data-fields]").addEventListener("change", () => Object.assign(it.fields, UI.readForm(q("[data-fields]"), fields)));
      q("[data-fields]").addEventListener("input", () => Object.assign(it.fields, UI.readForm(q("[data-fields]"), fields)));
      q("[data-save]").onclick = () => { Object.assign(it.fields, UI.readForm(q("[data-fields]"), fields)); importText(it); };
    }
  }

  A.legacy = { extract, matchCourse }; // exposed for testing / reuse
})(window.App);
