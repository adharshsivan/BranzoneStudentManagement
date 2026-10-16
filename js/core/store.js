/* ==========================================================================
   Store — one reactive source of truth.
   Every module reads from and writes to here; any write re-renders the
   current view, so a change in one module instantly reflects everywhere.
   Records persist to localStorage; uploaded files persist to IndexedDB.
   ========================================================================== */
(function (A) {
  const U = A.util;
  const S = (A.store = { version: 0 });
  /* Two separate workspaces: the real studio, and the sample-data test account */
  let WS = "main";
  try { WS = sessionStorage.getItem("bz.ws") === "demo" ? "demo" : "main"; } catch (e) {}
  const KEY = WS === "demo" ? "bz.studio.demo.v1" : "bz.studio.v2";
  S.workspace = WS;
  S.storageKey = KEY;
  const subs = new Set();
  let state, idx = {}, depth = 0, dirty = false, scheduled = false;

  const blank = () => { const s = { settings: {} }; A.schema.collections.forEach((c) => (s[c] = [])); return s; };
  const prefix = { students: "st", payments: "pay", attendance: "att", documents: "doc", submissions: "sub", projects: "prj", remarks: "rmk", feedback: "fb", activity: "act", computers: "pc", inventory: "inv", courses: "crs", batches: "bat", rooms: "room" };

  function index(col) { return idx[col] || (idx[col] = new Map((state[col] || []).map((r) => [r.id, r]))); }
  function touch(col) { S.version++; if (col) delete idx[col]; else idx = {}; dirty = true; }
  function persist() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); }
    catch (e) { console.error(e); A.ui && A.ui.toast("Browser storage is full — download a backup from Settings.", "bad"); }
  }
  function emit() {
    if (depth) return;
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      if (dirty) { persist(); dirty = false; }
      subs.forEach((fn) => { try { fn(); } catch (e) { console.error(e); } });
    });
  }
  window.addEventListener("beforeunload", () => { if (dirty) persist(); });

  S.load = () => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) { state = Object.assign(blank(), JSON.parse(raw)); migrate(); touch(); dirty = false; return true; }
    } catch (e) { console.error(e); }
    state = blank(); touch(); return false;
  };
  /* Small in-place upgrades for data saved by earlier versions */
  function migrate() {
    (state.rooms || []).forEach((r) => { if (!r.layout) { r.layout = r.id === "room_a" && r.cols === 10 ? "island" : "rows"; if (r.layout === "island") delete r.aisleAfter; } });
  }
  S.subscribe = (fn) => { subs.add(fn); return () => subs.delete(fn); };
  S.snapshot = () => JSON.parse(JSON.stringify(state));
  S.replace = (data) => { state = Object.assign(blank(), data || {}); touch(); persist(); dirty = false; emit(); };

  /* ---- reads ---- */
  S.all = (col) => state[col] || [];
  S.get = (col, id) => (id == null || id === "" ? null : index(col).get(id) || null);
  S.filter = (col, fn) => S.all(col).filter(fn);
  S.find = (col, fn) => S.all(col).find(fn);
  S.count = (col, fn) => (fn ? S.all(col).filter(fn).length : S.all(col).length);

  /* ---- settings ---- */
  S.settings = () => {
    const d = A.schema.defaults, s = state.settings || {};
    return { ...d, ...s, lists: { ...d.lists, ...(s.lists || {}) } };
  };
  S.setSettings = (patch, o = {}) => {
    if (!o.system && !allowed("__settings", "update")) return;
    const cur = state.settings || {};
    state.settings = { ...cur, ...patch, lists: { ...(cur.lists || {}), ...(patch.lists || {}) } };
    touch(); emit();
  };

  /* ---- activity log ---- */
  S.log = (text, studentId = null, type = "info") => {
    state.activity.unshift({ id: U.uid("act"), text, studentId, type, at: Date.now() });
    if (state.activity.length > 800) state.activity.length = 800;
    touch("activity"); emit();
  };

  /* ---- writes ---- */
  S.batch = (fn) => { depth++; try { fn(); } finally { depth--; } emit(); };

  /* Permission hook (set by auth.js). S.system() runs trusted internal writes. */
  S.guard = null; let sys = 0;
  const allowed = (col, op) => sys > 0 || !S.guard || S.guard(col, op);
  S.system = (fn) => { sys++; try { return fn(); } finally { sys--; } };

  S.insert = (col, obj, o = {}) => {
    if (!allowed(col, "insert")) return null;
    const rec = { id: obj.id || U.uid(prefix[col] || "id"), createdAt: Date.now(), ...obj };
    state[col].push(rec); touch(col);
    if (o.log) S.log(o.log, o.studentId !== undefined ? o.studentId : rec.studentId || (col === "students" ? rec.id : null), o.type || col);
    emit(); return rec;
  };
  S.update = (col, id, patch, o = {}) => {
    const r = S.get(col, id); if (!r) return null;
    if (!allowed(col, "update")) return null;
    Object.assign(r, patch, { updatedAt: Date.now() }); touch(col);
    if (o.log) S.log(o.log, o.studentId !== undefined ? o.studentId : r.studentId || (col === "students" ? r.id : null), o.type || col);
    emit(); return r;
  };
  S.upsert = (col, obj, o = {}) => (S.get(col, obj.id) ? S.update(col, obj.id, obj, o) : S.insert(col, obj, o));

  /* Remove with relation rules: cascade dependants, nullify links, or refuse (restrict). */
  S.canRemove = (col, id) => {
    for (const rel of A.schema.relations.filter((r) => r.ref === col && r.onDelete === "restrict")) {
      const n = state[rel.col].filter((x) => x[rel.key] === id).length;
      if (n) return { ok: false, reason: `${n} ${rel.label || rel.col} — reassign them first.` };
    }
    return { ok: true };
  };
  S.remove = (col, id, o = {}) => {
    if (!allowed(col, "remove")) return { ok: false, reason: "No permission" };
    const chk = S.canRemove(col, id); if (!chk.ok) return chk;
    const r = S.get(col, id); if (!r) return { ok: false, reason: "Not found" };
    S.batch(() => {
      for (const rel of A.schema.relations.filter((x) => x.ref === col)) {
        const deps = state[rel.col].filter((x) => x[rel.key] === id);
        if (!deps.length) continue;
        if (rel.onDelete === "cascade") deps.forEach((d) => S.remove(rel.col, d.id));
        else if (rel.onDelete === "nullify") { deps.forEach((d) => (d[rel.key] = null)); touch(rel.col); }
      }
      state[col] = state[col].filter((x) => x.id !== id); touch(col);
      if (col === "documents" && r.hasFile) A.files.del(id);
      if (o.log) S.log(o.log, col === "students" ? null : r.studentId || null, o.type || col);
    });
    return { ok: true };
  };
  S.removeWhere = (col, fn) => { if (!allowed(col, "remove")) return; state[col] = state[col].filter((x) => !fn(x)); touch(col); emit(); };

  /* Next student code, e.g. BZ-26104 */
  S.nextCode = () => {
    const st = S.settings(); const seq = (st.codeSeq || 100) + 1;
    S.setSettings({ codeSeq: seq }, { system: true });
    return `${st.codePrefix || "BZ"}-${String(new Date().getFullYear()).slice(2)}${String(seq).padStart(3, "0")}`;
  };

  /* ==========================================================================
     File store (IndexedDB) for uploaded documents
     ========================================================================== */
  A.files = (function () {
    let dbp;
    const db = () => dbp || (dbp = new Promise((res, rej) => {
      const r = indexedDB.open("bz-studio-files", 1);
      r.onupgradeneeded = () => r.result.createObjectStore("files");
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    }));
    const tx = (mode, fn) => db().then((d) => new Promise((res, rej) => {
      const t = d.transaction("files", mode); const req = fn(t.objectStore("files"));
      t.oncomplete = () => res(req && req.result); t.onerror = () => rej(t.error);
    }));
    return {
      put: (id, blob) => tx("readwrite", (s) => s.put(blob, id)),
      get: (id) => tx("readonly", (s) => s.get(id)),
      del: (id) => tx("readwrite", (s) => s.delete(id)).catch(() => {}),
      clear: () => tx("readwrite", (s) => s.clear()).catch(() => {}),
      async open(doc) {
        const blob = await this.get(doc.id);
        if (!blob) return A.ui.toast("No file stored for this record (metadata only).", "warn");
        const url = URL.createObjectURL(blob); window.open(url, "_blank"); setTimeout(() => URL.revokeObjectURL(url), 60000);
      },
      async download(doc) {
        const blob = await this.get(doc.id);
        if (!blob) return A.ui.toast("No file stored for this record (metadata only).", "warn");
        U.download(blob, doc.name);
      },
    };
  })();
})(window.App);
