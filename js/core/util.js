/* Small, dependency-free helpers shared by every module. */
window.App = window.App || {};
(function (A) {
  const U = (A.util = {});
  const pad = (n) => String(n).padStart(2, "0");

  U.uid = (p = "id") => p + "_" + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);
  U.esc = (s) =>
    s == null ? "" : String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  /* ---- Dates (always ISO yyyy-mm-dd strings in storage) ---- */
  U.iso = (d) => {
    d = d instanceof Date ? d : U.parse(d);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };
  U.parse = (s) => {
    if (s instanceof Date) return new Date(s);
    if (typeof s === "string" && /^\d{4}-\d{2}-\d{2}/.test(s)) {
      const [y, m, d] = s.slice(0, 10).split("-").map(Number);
      return new Date(y, m - 1, d);
    }
    return new Date(s);
  };
  U.today = () => U.iso(new Date());
  U.addDays = (iso, n) => { const d = U.parse(iso); d.setDate(d.getDate() + n); return U.iso(d); };
  U.addMonths = (iso, n) => {
    const d = U.parse(iso); const day = d.getDate();
    d.setDate(1); d.setMonth(d.getMonth() + n);
    const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    d.setDate(Math.min(day, last));
    return U.iso(d);
  };
  U.daysBetween = (a, b) => Math.round((U.parse(b) - U.parse(a)) / 86400000);
  U.isSunday = (iso) => U.parse(iso).getDay() === 0;
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const MONTHS_L = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  U.MONTHS = MONTHS; U.MONTHS_L = MONTHS_L; U.DAYS = DAYS;
  U.fmtDate = (iso) => { if (!iso) return "—"; const d = U.parse(iso); return isNaN(d) ? "—" : `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`; };
  U.fmtShort = (iso) => { if (!iso) return "—"; const d = U.parse(iso); return `${d.getDate()} ${MONTHS[d.getMonth()]}`; };
  U.fmtLong = (iso) => { const d = U.parse(iso); return `${DAYS[d.getDay()]}, ${d.getDate()} ${MONTHS_L[d.getMonth()]} ${d.getFullYear()}`; };
  U.fmtMonth = (ym) => { const [y, m] = ym.split("-").map(Number); return `${MONTHS_L[m - 1]} ${y}`; };
  U.relTime = (ts) => {
    const s = Math.round((Date.now() - ts) / 1000);
    if (s < 60) return "just now";
    if (s < 3600) return Math.floor(s / 60) + "m ago";
    if (s < 86400) return Math.floor(s / 3600) + "h ago";
    if (s < 86400 * 7) return Math.floor(s / 86400) + "d ago";
    return U.fmtDate(U.iso(new Date(ts)));
  };
  U.age = (dob) => { if (!dob) return null; const d = U.parse(dob), t = new Date(); let a = t.getFullYear() - d.getFullYear(); if (t < new Date(t.getFullYear(), d.getMonth(), d.getDate())) a--; return a; };

  /* Lenient date parser for legacy data: 12/03/2001, 12-3-01, 12 March 2001, 2001-03-12, Excel serials */
  U.looseDate = (v) => {
    if (v == null || v === "") return null;
    if (v instanceof Date && !isNaN(v)) return U.iso(v);
    if (typeof v === "number" && v > 20000 && v < 80000) { const d = new Date(Math.round((v - 25569) * 86400000)); return U.iso(new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())); }
    const s = String(v).trim();
    let m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
    if (m) return `${m[1]}-${pad(+m[2])}-${pad(+m[3])}`;
    m = s.match(/^(\d{1,2})[-/. ](\d{1,2})[-/. ](\d{2,4})/);
    if (m) { let y = +m[3]; if (y < 100) y += y > 50 ? 1900 : 2000; return `${y}-${pad(+m[2])}-${pad(+m[1])}`; }
    m = s.match(/^(\d{1,2})(?:st|nd|rd|th)?[\s-]+([A-Za-z]{3,})[\s,-]+(\d{4})/);
    if (m) { const mi = MONTHS.findIndex((x) => m[2].toLowerCase().startsWith(x.toLowerCase())); if (mi >= 0) return `${m[3]}-${pad(mi + 1)}-${pad(+m[1])}`; }
    m = s.match(/^([A-Za-z]{3,})[\s-]+(\d{1,2}),?[\s-]+(\d{4})/);
    if (m) { const mi = MONTHS.findIndex((x) => m[1].toLowerCase().startsWith(x.toLowerCase())); if (mi >= 0) return `${m[3]}-${pad(mi + 1)}-${pad(+m[2])}`; }
    return null;
  };

  /* ---- Numbers ---- */
  const inr = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });
  U.money = (n) => "₹" + inr.format(Math.round(Number(n) || 0));
  U.moneyShort = (n) => {
    n = Number(n) || 0;
    if (Math.abs(n) >= 1e7) return "₹" + (n / 1e7).toFixed(2).replace(/\.?0+$/, "") + "Cr";
    if (Math.abs(n) >= 1e5) return "₹" + (n / 1e5).toFixed(2).replace(/\.?0+$/, "") + "L";
    if (Math.abs(n) >= 1e3) return "₹" + (n / 1e3).toFixed(1).replace(/\.0$/, "") + "k";
    return "₹" + Math.round(n);
  };
  U.num = (v) => { if (v == null || v === "") return null; const n = Number(String(v).replace(/[^0-9.-]/g, "")); return isNaN(n) ? null : n; };
  U.pct = (v, digits = 0) => (v == null || isNaN(v) ? "—" : (v * 100).toFixed(digits) + "%");
  U.sum = (arr, f = (x) => x) => arr.reduce((s, x) => s + (Number(f(x)) || 0), 0);
  U.clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  /* ---- Strings ---- */
  U.initials = (name) => (name || "?").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");
  U.hash = (str) => { let h = 0; for (const c of String(str)) h = (h * 31 + c.charCodeAt(0)) | 0; return Math.abs(h); };
  U.norm = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  U.cap = (s) => String(s || "").replace(/\b\w/g, (c) => c.toUpperCase());
  U.titleCase = (s) => String(s || "").toLowerCase().replace(/\b[a-z]/g, (c) => c.toUpperCase());
  U.plural = (n, w, p) => `${n} ${n === 1 ? w : p || w + "s"}`;
  U.bytes = (b) => (b > 1048576 ? (b / 1048576).toFixed(1) + " MB" : Math.max(1, Math.round(b / 1024)) + " KB");
  U.phone = (s) => { const d = String(s || "").replace(/\D/g, ""); const t = d.length > 10 ? d.slice(-10) : d; return t.length === 10 ? `+91 ${t.slice(0, 5)} ${t.slice(5)}` : String(s || "").trim(); };
  U.ext = (name) => (String(name).split(".").pop() || "").toLowerCase();

  /* ---- Functions ---- */
  U.debounce = (fn, ms = 200) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
  U.groupBy = (arr, f) => arr.reduce((m, x) => { const k = f(x); (m[k] = m[k] || []).push(x); return m; }, {});
  U.download = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement("a"), { href: url, download: filename });
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };
  U.readAsDataURL = (file) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(file); });

  /* Lazy loader for CDN libraries — only fetched when a feature needs them. */
  const loaded = {};
  A.load = (url) =>
    loaded[url] || (loaded[url] = new Promise((res, rej) => {
      const s = document.createElement("script");
      s.src = url; s.async = true;
      s.onload = () => res();
      s.onerror = () => { delete loaded[url]; rej(new Error("Could not load " + url + " — check the internet connection.")); };
      document.head.appendChild(s);
    }));
  A.libs = {
    xlsx: "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js",
    three: "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js",
    orbit: "https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js",
    tesseract: "https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js",
    pdf: "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js",
    pdfWorker: "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js",
    mammoth: "https://cdn.jsdelivr.net/npm/mammoth@1.6.0/mammoth.browser.min.js",
  };
})(window.App);
