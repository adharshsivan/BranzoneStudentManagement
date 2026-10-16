/* ==========================================================================
   UI kit — icons, chips, avatars, charts, tables, forms, modals, drawers,
   toasts, menus. Modules compose screens from these pieces only, which keeps
   every screen visually consistent.
   ========================================================================== */
(function (A) {
  const U = A.util, esc = U.esc;
  const UI = (A.ui = {});

  /* ---------- Icons (24px stroke set) ---------- */
  const I = (A.icons = {
    dashboard: '<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    userPlus: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6M22 11h-6"/>',
    calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/><path d="m9 16 2 2 4-4"/>',
    wallet: '<path d="M19 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0 0 4h14a2 2 0 0 1 2 2v3"/><path d="M3 5v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-3"/><path d="M17 12h4v4h-4a2 2 0 0 1 0-4z"/>',
    book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z"/><path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5"/>',
    inbox: '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
    monitor: '<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>',
    box: '<path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="m3 8 9 5 9-5M12 13v8"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5M12 15V3"/>',
    upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m17 8-5-5-5 5M12 3v12"/>',
    scan: '<path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"/><path d="M7 12h10M7 8h6M7 16h8"/>',
    sliders: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    chevR: '<path d="m9 18 6-6-6-6"/>', chevL: '<path d="m15 18-6-6 6-6"/>', chevD: '<path d="m6 9 6 6 6-6"/>',
    arrowR: '<path d="M5 12h14M13 5l7 7-7 7"/>',
    edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"/>',
    trash: '<path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>',
    file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/>',
    phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/>',
    mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/>',
    star: '<path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z"/>',
    message: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
    activity: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
    cube: '<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><path d="M3.3 7 12 12l8.7-5M12 22V12"/>',
    grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    more: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
    eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    sparkle: '<path d="M12 3l1.9 5.6 5.6 1.9-5.6 1.9L12 18l-1.9-5.6L4.5 10.5l5.6-1.9z"/>',
    layers: '<path d="m12 2 10 5-10 5L2 7z"/><path d="m2 17 10 5 10-5M2 12l10 5 10-5"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    alert: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
    link: '<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
    menu: '<path d="M3 6h18M3 12h18M3 18h18"/>',
    tool: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.8-3.8a6 6 0 0 1-7.9 7.9l-6.9 6.9a2.1 2.1 0 0 1-3-3l6.9-6.9a6 6 0 0 1 7.9-7.9z"/>',
    folder: '<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>',
    refresh: '<path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/>',
    copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
    sheet: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18"/>',
    pin: '<path d="M12 22s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/>',
    award: '<circle cx="12" cy="8" r="6"/><path d="M8.2 13.3 7 22l5-3 5 3-1.2-8.7"/>',
    briefcase: '<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>',
    cpu: '<rect x="5" y="5" width="14" height="14" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
    puzzle: '<path d="M19.4 14.6a2 2 0 1 0 0-3.2V8a1 1 0 0 0-1-1h-3.4a2 2 0 1 0-3.2 0H8a1 1 0 0 0-1 1v3.4a2 2 0 1 0 0 3.2V18a1 1 0 0 0 1 1h3.8a2 2 0 1 1 3.2 0h3.4a1 1 0 0 0 1-1z"/>',
  });
  UI.icon = (name, size = 16) =>
    `<svg class="ic" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${I[name] || ""}</svg>`;
  const ic = UI.icon;

  /* ---------- Atoms ---------- */
  const TONES = {
    Active: "ok", Onboarding: "info", Paused: "warn", Completed: "accent", Dropped: "muted",
    Paid: "ok", Partial: "info", Pending: "muted", Overdue: "bad", Upcoming: "muted", "Written off": "muted",
    Approved: "ok", Submitted: "info", "Needs revision": "warn", "Not submitted": "muted",
    Maintenance: "warn", Retired: "muted", OK: "ok", Low: "bad",
    "On track": "ok", "Slightly behind": "warn", Behind: "bad", "Not started": "muted",
    positive: "ok", neutral: "muted", concern: "bad",
  };
  UI.tone = (v) => TONES[v] || "muted";
  UI.chip = (text, tone) => `<span class="chip ${tone || UI.tone(text)}">${esc(text)}</span>`;
  UI.tag = (text) => `<span class="tag">${esc(text)}</span>`;
  UI.track = (c) => (c ? `<span class="track-badge ${A.sel.trackClass(c)}">${c.track === "UI/UX" ? "UI/UX" : "Graphic"} · ${c.months}M</span>` : "");

  UI.avatar = (name, size = 34) =>
    `<span class="avatar" style="width:${size}px;height:${size}px;font-size:${Math.round(size * 0.36)}px">${esc(U.initials(name))}</span>`;
  UI.person = (s, sub) => {
    const n = A.sel.name(s);
    return `<div class="person">${UI.avatar(n, 34, s.id)}<div style="min-width:0"><div class="p-name truncate">${esc(n)}</div><div class="p-sub truncate">${sub != null ? sub : esc(s.code || "")}</div></div></div>`;
  };
  UI.bar = (pct, tone = "") => `<div class="bar ${tone}"><i style="width:${U.clamp((pct || 0) * 100, 0, 100).toFixed(1)}%"></i></div>`;
  UI.barRow = (pct, label, tone) => `<div class="bar-row">${UI.bar(pct, tone)}<span class="v">${label != null ? label : U.pct(pct)}</span></div>`;
  UI.attTone = (rate) => (rate == null ? "" : rate >= 0.85 ? "ok" : rate >= (A.store.settings().attendanceThreshold || 0.75) ? "warn" : "bad");
  UI.stars = (n) => `<span class="stars">${[1, 2, 3, 4, 5].map((i) => (i <= n ? "★" : '<span class="off">★</span>')).join("")}</span>`;

  /* Empty state with an Open Doodles illustration (falls back to the icon while loading/offline) */
  UI.empty = (icon, title, text, action = "") =>
    `<div class="empty"><div class="e-art" data-doodle="${A.doodleFor ? A.doodleFor(icon) : "PlantDoodle"}"><div class="e-icon">${ic(icon, 22)}</div></div><h4>${esc(title)}</h4><p>${esc(text)}</p>${action ? `<div class="e-actions">${action}</div>` : ""}</div>`;

  UI.kpi = ({ label, value, unit, sub, icon, href, cls = "" }) =>
    `<div class="card kpi ${href ? "clickable" : ""} ${cls}" ${href ? `data-href="${href}"` : ""}>
      <div class="k-label">${icon ? ic(icon, 15) : ""}${esc(label)}</div>
      <div class="k-value">${value}${unit ? `<small>${unit}</small>` : ""}</div>
      ${sub ? `<div class="k-sub">${sub}</div>` : ""}
    </div>`;

  UI.pageHead = ({ eyebrow, title, sub, actions = "" }) =>
    `<header class="page-head"><div>${eyebrow ? `<div class="eyebrow">${eyebrow}</div>` : ""}<h1>${title}</h1>${sub ? `<p class="sub">${sub}</p>` : ""}</div><div class="actions">${actions}</div></header>`;

  UI.seg = (name, options, value) =>
    `<div class="seg" data-seg="${name}">${options.map((o) => {
      const v = o.value != null ? o.value : o, l = o.label != null ? o.label : o;
      return `<button type="button" data-v="${esc(v)}" class="${String(v) === String(value) ? "on" : ""}">${o.icon ? ic(o.icon, 14) : ""}${esc(l)}${o.count != null ? ` <span class="count">${o.count}</span>` : ""}</button>`;
    }).join("")}</div>`;
  UI.bindSeg = (root, name, fn) => root.querySelectorAll(`[data-seg="${name}"] button`).forEach((b) => (b.onclick = () => fn(b.dataset.v)));

  UI.tabs = (items, active) =>
    `<nav class="tabs">${items.map((t) => `<button class="tab ${t.id === active ? "on" : ""}" data-tab="${t.id}">${esc(t.label)}${t.count != null ? `<span class="count">${t.count}</span>` : ""}</button>`).join("")}</nav>`;
  UI.bindTabs = (root, fn) => root.querySelectorAll("[data-tab]").forEach((b) => (b.onclick = () => fn(b.dataset.tab)));

  /* ---------- Charts (pure HTML/SVG, no library) ---------- */
  UI.columns = (data, { height = 180 } = {}) => {
    const max = Math.max(1, ...data.map((d) => d.value || 0));
    return `<div class="cols-chart" style="height:${height}px">${data.map((d) => `<div class="col ${d.cls || ""}"><div class="pillar" data-tip="${esc(d.tip || d.value)}" style="height:${Math.max(2, ((d.value || 0) / max) * (height - 28))}px"></div><div class="lbl">${esc(d.label)}</div></div>`).join("")}</div>`;
  };
  UI.hbars = (data) => {
    const max = Math.max(1, ...data.map((d) => d.value));
    return `<div class="hbars">${data.map((d) => `<div class="hbar"><div class="top"><span>${d.label}</span><span>${esc(d.display != null ? d.display : d.value)}</span></div>${UI.bar(d.value / max, d.tone)}</div>`).join("")}</div>`;
  };
  UI.donut = (segs, { size = 132, stroke = 14, center = "" } = {}) => {
    const total = U.sum(segs, (s) => s.value) || 1, r = (size - stroke) / 2, C = 2 * Math.PI * r;
    let off = 0;
    const arcs = segs.map((s) => {
      const len = (s.value / total) * C;
      const el = `<circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${s.color}" stroke-width="${stroke}" stroke-dasharray="${Math.max(0, len - 2)} ${C}" stroke-dashoffset="${-off}" stroke-linecap="round"/>`;
      off += len; return el;
    }).join("");
    return `<div class="donut-wrap"><div style="position:relative;width:${size}px;height:${size}px;flex:none"><svg width="${size}" height="${size}" style="transform:rotate(-90deg)"><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="rgba(255,255,255,.05)" stroke-width="${stroke}"/>${arcs}</svg><div style="position:absolute;inset:0;display:grid;place-items:center;text-align:center">${center}</div></div>
      <div class="legend grow">${segs.map((s) => `<div class="li"><span class="sw" style="background:${s.color}"></span>${esc(s.label)}<span class="lv">${esc(s.display != null ? s.display : s.value)}</span></div>`).join("")}</div></div>`;
  };
  UI.ring = (pct, size = 56, stroke = 5) => {
    const r = (size - stroke) / 2, C = 2 * Math.PI * r;
    return `<svg width="${size}" height="${size}" style="transform:rotate(-90deg);flex:none"><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="rgba(255,255,255,.08)" stroke-width="${stroke}"/><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="#ff5b22" stroke-width="${stroke}" stroke-linecap="round" stroke-dasharray="${C * U.clamp(pct || 0, 0, 1)} ${C}"/></svg>`;
  };

  /* ---------- Table ---------- */
  UI.table = (cfg) => {
    const st = cfg.state || {};
    let rows = cfg.rows.slice();
    if (st.sort) {
      const col = cfg.cols.find((c) => c.key === st.sort);
      if (col) {
        const f = col.sort || ((r) => r[col.key]);
        rows.sort((a, b) => { let x = f(a), y = f(b); if (x == null) x = ""; if (y == null) y = ""; if (typeof x === "string") x = x.toLowerCase(); if (typeof y === "string") y = y.toLowerCase(); return (x > y ? 1 : x < y ? -1 : 0) * (st.dir === "desc" ? -1 : 1); });
      }
    }
    if (!rows.length) return cfg.empty || UI.empty("search", "Nothing here yet", "Try changing the filters.");
    return `<div class="tbl-wrap"><table class="tbl ${cfg.cls || ""}"><thead><tr>${cfg.cols.map((c) => `<th ${c.sortable === false ? "" : `data-sort="${c.key}"`} class="${c.align === "right" ? "r" : ""} ${st.sort === c.key ? "sorted " + (st.dir || "asc") : ""}" ${c.width ? `style="width:${c.width}"` : ""}>${esc(c.label)}</th>`).join("")}</tr></thead>
      <tbody>${rows.map((r) => `<tr ${cfg.rowAttr ? cfg.rowAttr(r) : ""}>${cfg.cols.map((c) => `<td class="${c.align === "right" ? "r" : ""} ${c.cls || ""}">${c.render ? c.render(r) : esc(r[c.key] != null ? r[c.key] : "—")}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
  };
  UI.bindSort = (root, state, rerender) => root.querySelectorAll("th[data-sort]").forEach((th) => (th.onclick = () => {
    const k = th.dataset.sort; if (state.sort === k) state.dir = state.dir === "asc" ? "desc" : "asc"; else { state.sort = k; state.dir = "asc"; } rerender();
  }));

  /* ---------- Forms (schema-driven) ---------- */
  const optsOf = (f) => (typeof f.options === "function" ? f.options() : f.options || []);
  UI.field = (f, v) => {
    const name = esc(f.key), val = v == null ? "" : v;
    let input;
    if (f.type === "select") {
      const ph = f.placeholder === false ? "" : `<option value="">${esc(f.placeholder || "Select…")}</option>`;
      input = `<select class="input" name="${name}">${ph}${optsOf(f).map((o) => { const ov = o && o.value != null ? o.value : o, ol = o && o.label != null ? o.label : o; return `<option value="${esc(ov)}" ${String(ov) === String(val) ? "selected" : ""}>${esc(ol)}</option>`; }).join("")}</select>`;
    } else if (f.type === "textarea") {
      input = `<textarea class="input" name="${name}" rows="${f.rows || 3}" placeholder="${esc(f.placeholder || "")}">${esc(val)}</textarea>`;
    } else if (f.type === "toggle") {
      return `<div class="field ${f.span === 2 ? "span-2" : ""}"><label class="toggle"><input type="checkbox" name="${name}" ${val ? "checked" : ""}><span class="track"></span>${esc(f.label)}</label></div>`;
    } else {
      input = `<input class="input" type="${f.type || "text"}" name="${name}" value="${esc(val)}" placeholder="${esc(f.placeholder || "")}" ${f.type === "number" ? 'step="any"' : ""} ${f.readonly ? "readonly" : ""}>`;
    }
    return `<label class="field ${f.span === 2 ? "span-2" : ""}" data-field="${name}"><span class="field-label">${esc(f.label)}${f.required ? "<em>*</em>" : ""}</span>${input}${f.hint ? `<span class="field-hint">${esc(f.hint)}</span>` : ""}</label>`;
  };
  UI.form = (fields, values = {}, { sections = true, cols = 2 } = {}) => {
    let last = null, out = "";
    fields.forEach((f) => {
      if (sections && f.section && f.section !== last) { out += `<div class="form-section">${esc(f.section)}</div>`; last = f.section; }
      out += UI.field(f, values[f.key]);
    });
    return `<div class="form-grid ${cols === 3 ? "cols-3" : ""}">${out}</div>`;
  };
  UI.readForm = (root, fields) => {
    const o = {};
    fields.forEach((f) => {
      const el = root.querySelector(`[name="${f.key}"]`); if (!el) return;
      if (f.type === "toggle") o[f.key] = el.checked;
      else if (f.type === "number" || f.number) o[f.key] = el.value === "" ? null : Number(el.value);
      else o[f.key] = el.value.trim();
    });
    return o;
  };
  UI.validate = (root, fields, values) => {
    let ok = true;
    root.querySelectorAll(".field.invalid").forEach((e) => e.classList.remove("invalid"));
    fields.forEach((f) => {
      const v = values[f.key];
      const bad = (f.required && (v == null || v === "")) || (f.type === "email" && v && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v));
      if (bad) { ok = false; const el = root.querySelector(`[data-field="${f.key}"]`); el && el.classList.add("invalid"); }
    });
    if (!ok) { UI.toast("Please complete the highlighted fields.", "warn"); const first = root.querySelector(".field.invalid .input"); first && first.focus(); }
    return ok;
  };

  /* ---------- Overlays ---------- */
  const stack = [];
  UI.openOverlays = stack;
  UI.modal = (o) => {
    const wrap = document.createElement("div");
    wrap.className = "overlay" + (o.drawer ? " is-drawer" : "");
    wrap.innerHTML = `<div class="${o.drawer ? "drawer" : "modal"} ${o.size || ""}" role="dialog" aria-modal="true">
      <header class="modal-head"><div>${o.eyebrow ? `<div class="eyebrow">${o.eyebrow}</div>` : ""}<h2>${esc(o.title || "")}</h2>${o.sub ? `<p class="muted">${o.sub}</p>` : ""}</div><button class="icon-btn" data-close aria-label="Close">${ic("x", 18)}</button></header>
      <div class="modal-body"></div>${o.actions ? '<footer class="modal-foot"></footer>' : ""}</div>`;
    document.body.appendChild(wrap);
    const body = wrap.querySelector(".modal-body"), foot = wrap.querySelector(".modal-foot");
    const api = { el: wrap, body, foot, close, refresh, live: !!o.live, data: o.data || {} };
    function paint() { body.innerHTML = typeof o.body === "function" ? o.body(api) : o.body || ""; o.onMount && o.onMount(body, api); }
    function refresh() { if (o.live) paint(); }
    function close() { const i = stack.indexOf(api); if (i >= 0) stack.splice(i, 1); wrap.classList.remove("open"); setTimeout(() => wrap.remove(), 220); o.onClose && o.onClose(); }
    if (foot) {
      const acts = typeof o.actions === "function" ? o.actions(api) : o.actions;
      acts.forEach((a) => {
        const b = document.createElement("button");
        b.className = `btn ${a.kind ? "btn-" + a.kind : ""} ${a.left ? "left" : ""}`;
        b.innerHTML = (a.icon ? ic(a.icon, 15) : "") + esc(a.label);
        b.onclick = async () => { if (!a.onClick) return close(); b.disabled = true; try { const r = await a.onClick(api); if (r !== false) close(); } finally { b.disabled = false; } };
        foot.appendChild(b);
      });
    }
    wrap.addEventListener("mousedown", (e) => { if (e.target === wrap) close(); });
    wrap.querySelector("[data-close]").onclick = close;
    paint(); stack.push(api);
    requestAnimationFrame(() => wrap.classList.add("open"));
    setTimeout(() => { const f = body.querySelector("input:not([type=checkbox]):not([readonly]),select,textarea"); if (f && !o.noFocus) f.focus(); }, 60);
    return api;
  };
  UI.drawer = (o) => UI.modal({ ...o, drawer: true });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && stack.length) { e.preventDefault(); stack[stack.length - 1].close(); } });

  /* Form in a drawer — the standard "edit anything" pattern */
  UI.formDrawer = ({ title, eyebrow, sub, fields, values = {}, onSave, onDelete, saveLabel = "Save", size, extra = "" }) => {
    const acts = [];
    if (onDelete) acts.push({ label: "Delete", kind: "ghost btn-danger", left: true, icon: "trash", onClick: async (m) => { const ok = await UI.confirm({ title: "Delete this record?", text: "This cannot be undone.", danger: true }); if (!ok) return false; return onDelete(m); } });
    acts.push({ label: "Cancel", kind: "ghost" });
    acts.push({ label: saveLabel, kind: "primary", onClick: (m) => { const v = UI.readForm(m.body, fields); if (!UI.validate(m.body, fields, v)) return false; return onSave(v, m); } });
    return UI.drawer({ title, eyebrow, sub, size, body: UI.form(fields, values) + extra, actions: acts });
  };

  UI.confirm = ({ title, text = "", okLabel = "Confirm", danger = false }) => new Promise((res) => {
    let done = false;
    UI.modal({
      title, size: "sm", body: `<p class="muted">${esc(text)}</p>`, noFocus: true,
      onClose: () => { if (!done) res(false); },
      actions: [{ label: "Cancel", kind: "ghost" }, { label: okLabel, kind: danger ? "ghost btn-danger" : "primary", onClick: () => { done = true; res(true); } }],
    });
  });

  let toastBox;
  UI.toast = (msg, tone = "") => {
    if (!toastBox) { toastBox = document.createElement("div"); toastBox.className = "toasts"; document.body.appendChild(toastBox); }
    const t = document.createElement("div"); t.className = "toast " + tone;
    t.innerHTML = `<span class="dot"></span><span>${esc(msg)}</span>`;
    toastBox.appendChild(t);
    setTimeout(() => { t.style.transition = "opacity .3s"; t.style.opacity = "0"; setTimeout(() => t.remove(), 300); }, 3200);
  };

  UI.menu = (anchor, items) => {
    document.querySelectorAll(".menu-pop").forEach((m) => m.remove());
    const m = document.createElement("div"); m.className = "menu-pop";
    m.innerHTML = items.map((it, i) => (it === "-" ? "<hr>" : `<button data-i="${i}" class="${it.danger ? "danger" : ""}">${it.icon ? ic(it.icon, 15) : ""}${esc(it.label)}</button>`)).join("");
    document.body.appendChild(m);
    const r = anchor.getBoundingClientRect();
    m.style.top = Math.min(window.innerHeight - m.offsetHeight - 8, r.bottom + 6) + "px";
    m.style.left = Math.max(8, Math.min(window.innerWidth - m.offsetWidth - 8, r.right - m.offsetWidth)) + "px";
    m.onclick = (e) => { const b = e.target.closest("button[data-i]"); if (!b) return; m.remove(); items[+b.dataset.i].onClick(); };
    setTimeout(() => document.addEventListener("mousedown", function off(e) { if (!m.contains(e.target)) { m.remove(); document.removeEventListener("mousedown", off); } }), 0);
  };

  /* Chip editor (for option lists, tools, goals) */
  UI.chipEditor = (name, values = [], placeholder = "Type and press Enter") =>
    `<div class="chip-editor" data-chips="${esc(name)}">${values.map((v) => `<span class="tag" data-val="${esc(v)}">${esc(v)}<span class="x">${ic("x", 12)}</span></span>`).join("")}<input placeholder="${esc(placeholder)}"></div>`;
  UI.bindChipEditor = (root, name, onChange) => {
    const box = root.querySelector(`[data-chips="${name}"]`); if (!box) return;
    const input = box.querySelector("input");
    const read = () => [...box.querySelectorAll(".tag")].map((t) => t.dataset.val);
    box.addEventListener("click", (e) => { const x = e.target.closest(".x"); if (x) { x.parentElement.remove(); onChange && onChange(read()); } else input.focus(); });
    input.addEventListener("keydown", (e) => {
      if ((e.key === "Enter" || e.key === ",") && input.value.trim()) {
        e.preventDefault(); const v = input.value.trim().replace(/,$/, "");
        if (!read().includes(v)) { const t = document.createElement("span"); t.className = "tag"; t.dataset.val = v; t.innerHTML = `${esc(v)}<span class="x">${ic("x", 12)}</span>`; box.insertBefore(t, input); onChange && onChange(read()); }
        input.value = "";
      } else if (e.key === "Backspace" && !input.value) { const last = box.querySelector(".tag:last-of-type"); if (last) { last.remove(); onChange && onChange(read()); } }
    });
    return read;
  };
  UI.readChips = (root, name) => [...root.querySelectorAll(`[data-chips="${name}"] .tag`)].map((t) => t.dataset.val);

  UI.fileIcon = (name) => `<span class="file-ic">${esc(U.ext(name).slice(0, 4) || "file")}</span>`;
})(window.App);
