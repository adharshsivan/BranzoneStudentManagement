/* Classroom — rooms, workstations and seat assignment, as a 2D plan or a
   realistic 3D studio (see classroom3d.js). Seats are per batch: one computer can host one student
   in each batch. Assigning here updates profiles, onboarding and inventory. */
(function (A) {
  const U = A.util, UI = A.ui, S = A.store, sel = A.sel, esc = U.esc, ic = UI.icon;
  const state = { room: "", batch: "", view: "3d", pc: null };

  A.classroom = {
    assignFor(s) {
      if (!s.batchId) { UI.toast("Assign a batch first — seats are per batch.", "warn"); return A.students.edit(s, "Enrolment"); }
      const b = sel.batch(s);
      const opts = S.filter("computers", (p) => p.status === "Active" && (!sel.seatTaken(p.id, s.batchId, s.id)));
      UI.modal({
        title: "Assign workstation", eyebrow: `${sel.name(s)} · ${b.name} batch`, size: "sm",
        body: `<label class="field"><span class="field-label">Workstation free in the ${esc(b.name)} batch</span><select class="input" id="pcSel"><option value="">No seat</option>${S.all("rooms").map((r) => `<optgroup label="${esc(r.name)}">${opts.filter((p) => p.roomId === r.id).map((p) => `<option value="${p.id}" ${s.computerId === p.id ? "selected" : ""}>${esc(p.label)} — ${esc(p.cpu)} · ${esc(p.ram)}</option>`).join("")}</optgroup>`).join("")}</select></label>`,
        actions: [{ label: "Cancel", kind: "ghost" }, { label: "Assign", kind: "primary", onClick: (m) => { const v = m.body.querySelector("#pcSel").value || null; assign(s.id, v); } }],
      });
    },
  };
  function assign(studentId, pcId) {
    const s = S.get("students", studentId); const pc = S.get("computers", pcId);
    S.update("students", studentId, { computerId: pcId }, { log: pc ? `Assigned to ${pc.label}` : `Seat released${s.computerId ? " (" + sel.seatLabel(s) + ")" : ""}`, type: "computers" });
    UI.toast(pc ? `${sel.name(s)} → ${pc.label}` : "Seat released", "ok");
  }

  function editPc(pc, roomId) {
    const room = S.get("rooms", pc ? pc.roomId : roomId);
    const taken = new Set(S.filter("computers", (p) => p.roomId === room.id && (!pc || p.id !== pc.id)).map((p) => p.row + ":" + p.col));
    let slot = null; for (let r = 1; r <= room.rows && !slot; r++) for (let c = 1; c <= room.cols && !slot; c++) if (!taken.has(r + ":" + c)) slot = { row: r, col: c };
    const tpl = S.find("computers", (p) => p.roomId === room.id) || {};
    const n = S.count("computers", (p) => p.roomId === room.id) + 1;
    UI.formDrawer({
      title: pc ? pc.label : "Add workstation", eyebrow: room.name, fields: A.schema.fields.computers,
      values: pc || { label: (tpl.label || "WS-").replace(/\d+$/, "") + String(n).padStart(2, "0"), status: "Active", ...(slot || { row: room.rows + 1, col: 1 }), cpu: tpl.cpu, gpu: tpl.gpu, ram: tpl.ram, storage: tpl.storage, os: tpl.os, monitor: tpl.monitor, mouse: true, keyboard: true },
      onSave: (v) => {
        if (taken.has(v.row + ":" + v.col)) { UI.toast(`Row ${v.row}, column ${v.col} already has a workstation.`, "warn"); return false; }
        if (v.row > room.rows || v.col > room.cols) S.update("rooms", room.id, { rows: Math.max(room.rows, v.row), cols: Math.max(room.cols, v.col) });
        if (pc) { S.update("computers", pc.id, v, { log: `${v.label} updated`, studentId: null }); if (v.status !== "Active" && sel.occupants(pc.id).length) UI.toast(`${v.label} is ${v.status} — its students keep the seat until you reassign them.`, "warn"); }
        else { const rec = S.insert("computers", { ...v, roomId: room.id }, { log: `Workstation ${v.label} added to ${room.name}`, studentId: null }); state.pc = rec.id; }
        UI.toast("Saved", "ok");
      },
      onDelete: pc ? () => { S.remove("computers", pc.id, { log: `Workstation ${pc.label} removed` }); state.pc = null; } : null,
    });
  }
  function editRoom(room) {
    UI.formDrawer({
      title: room ? `Edit ${room.name}` : "Add room", eyebrow: "Classroom", fields: A.schema.fields.rooms, values: room || { rows: 3, cols: 10, layout: "island", type: "Design lab" },
      extra: room ? "" : `<div class="field mt"><label class="toggle"><input type="checkbox" id="fill" checked><span class="track"></span>Fill the grid with workstations</label></div>`,
      onSave: (v, m) => {
        if (room) {
          const outside = S.filter("computers", (p) => p.roomId === room.id && (p.row > v.rows || p.col > v.cols));
          if (outside.length) { UI.toast(`${outside.length} workstation(s) sit outside that size — move them first.`, "warn"); return false; }
          S.update("rooms", room.id, v, { log: `Room ${v.name} updated`, studentId: null });
        } else {
          const rec = S.insert("rooms", v, { log: `Room ${v.name} added`, studentId: null });
          if (m.body.querySelector("#fill").checked) {
            const code = v.name.replace(/[^A-Za-z]/g, "").slice(-1).toUpperCase() || "X";
            S.batch(() => { for (let r = 1; r <= v.rows; r++) for (let c = 1; c <= v.cols; c++) S.insert("computers", { roomId: rec.id, label: `WS-${code}${String((r - 1) * v.cols + c).padStart(2, "0")}`, row: r, col: c, status: "Active", mouse: true, keyboard: true, os: "Windows 11 Pro" }); });
          }
          state.room = rec.id;
        }
        UI.toast("Saved", "ok");
      },
      onDelete: room ? () => { const n = S.count("computers", (p) => p.roomId === room.id); S.remove("rooms", room.id, { log: `Room ${room.name} removed (${n} workstations)` }); state.room = ""; } : null,
    });
  }

  A.register({
    id: "classroom", label: "Classroom", icon: "monitor", group: "campus", order: 40, route: "classroom",
    destroy() { A.studio3d && A.studio3d.pause(); state.lastQ = null; },
    render(el, { query }) {
      const rooms = S.all("rooms");
      if (query && query.pc && query.pc !== state.lastQ && S.get("computers", query.pc)) { state.pc = query.pc; state.room = S.get("computers", query.pc).roomId; }
      state.lastQ = query && query.pc;
      if (!rooms.find((r) => r.id === state.room)) state.room = rooms[0] ? rooms[0].id : "";
      const room = S.get("rooms", state.room);
      const pcs = room ? S.filter("computers", (p) => p.roomId === room.id) : [];
      const pc = S.get("computers", state.pc);
      if (pc && room && pc.roomId !== room.id) state.pc = null;
      const batches = S.all("batches");
      const occ = (p) => sel.occupants(p.id).filter((s) => !state.batch || s.batchId === state.batch);
      const active = pcs.filter((p) => p.status === "Active");
      const seatsTotal = active.length * (state.batch ? 1 : batches.length);
      const seatsUsed = U.sum(active, (p) => occ(p).length);

      el.innerHTML = `<div class="page">
        ${UI.pageHead({ eyebrow: "Campus", title: "Classroom <em>layout</em>", sub: "Who sits where, in every batch. Click a workstation to see its specification and assign students.",
          actions: `${UI.seg("view", [{ value: "3d", label: "3D studio", icon: "cube" }, { value: "plan", label: "Seat plan", icon: "grid" }], state.view)}<button class="btn" id="expW" data-perm="export">${ic("download", 15)}Export</button>` })}
        <div class="row between wrap mb" style="gap:12px">
          <div class="row wrap" style="gap:8px">${rooms.length > 1 ? UI.seg("room", rooms.map((r) => ({ value: r.id, label: r.name, count: S.count("computers", (p) => p.roomId === r.id) })), state.room) : room ? `<div class="room-title"><b>${esc(room.name)}</b><span>${esc(room.type || "")}</span></div>` : ""}</div>
          ${UI.seg("batch", [{ value: "", label: "All batches" }, ...batches.map((b) => ({ value: b.id, label: `${b.name}` }))], state.batch)}
        </div>
        ${room ? `<section class="grid g-side">
          <div>${state.view === "3d" ? `<div class="scene-wrap card flush" id="scene"><div class="loading"><div class="spinner"></div>Building the studio…</div><div class="scene-tip" id="tip"></div>
              <div class="scene-tools">${[["default", "Overview"], ["top", "Top"], ["front", "Instructor"], ["back", "Back"]].map(([k, l]) => `<button class="btn btn-xs" data-cam="${k}">${l}</button>`).join("")}</div>
              <div class="scene-legend"><span><i style="background:#ff5b22"></i>Screen on — occupied</span><span><i style="background:#2a2a2a;border:1px solid #444"></i>Free</span><span><i style="background:#fbbf24"></i>Maintenance</span></div><div class="scene-hint">Drag to orbit · right-drag to pan · scroll to zoom</div></div>`
            : `<div class="card room-plan"><div class="room-front">${ic("monitor", 14)}Front wall · Screen</div>
              ${planHtml(room, pcs, occ, batches)}</div>`}
            <div class="row small faint mt" style="gap:16px"><span>${U.plural(pcs.length, "workstation")} · ${active.length} active</span><span>${seatsUsed} of ${seatsTotal} seats used${state.batch ? " in this batch" : " across batches"}</span><button class="btn btn-xs" id="addPc" data-perm="classroom.edit">${ic("plus", 11)}Add workstation</button></div>
          </div>
          <div class="stack">${pc ? pcPanel(pc, batches) : roomPanel(room, pcs, batches, occ)}</div>
        </section>` : `<div class="card">${UI.empty("monitor", "No classroom set up", "The Creative Studio layout loads with the portal. Restore a backup or reset sample data in Settings if it is missing.")}</div>`}
      </div>`;

      UI.bindSeg(el, "view", (v) => { state.view = v; A.refresh(); });
      UI.bindSeg(el, "room", (v) => { state.room = v; state.pc = null; A.refresh(); });
      UI.bindSeg(el, "batch", (v) => { state.batch = v; A.refresh(); });
      const $ = (q) => el.querySelector(q);
      $("#expW") && ($("#expW").onclick = () => A.exporter.run("workstations"));
      $("#addRoom") && ($("#addRoom").onclick = () => editRoom(null));
      $("#addRoom2") && ($("#addRoom2").onclick = () => editRoom(null));
      $("#edRoom") && ($("#edRoom").onclick = () => editRoom(room));
      $("#addPc") && ($("#addPc").onclick = () => editPc(null, room.id));
      el.querySelectorAll("[data-pc]").forEach((t) => (t.onclick = () => { state.pc = state.pc === t.dataset.pc ? null : t.dataset.pc; A.refresh(); }));
      el.querySelectorAll("[data-slot]").forEach((t) => (t.ondblclick = () => editPc(null, room.id)));
      $("#closePc") && ($("#closePc").onclick = () => { state.pc = null; A.refresh(); });
      $("#editPc") && ($("#editPc").onclick = () => editPc(pc));
      el.querySelectorAll("[data-assign]").forEach((s) => (s.onchange = () => { if (s.value) assign(s.value, s.dataset.assign); }));
      el.querySelectorAll("[data-release]").forEach((b) => (b.onclick = () => assign(b.dataset.release, null)));
      el.querySelectorAll("[data-pstatus]").forEach((b) => (b.onclick = () => S.update("computers", pc.id, { status: b.dataset.pstatus }, { log: `${pc.label} marked ${b.dataset.pstatus}`, studentId: null })));
      el.querySelectorAll("[data-cam]").forEach((b) => (b.onclick = () => A.studio3d.view(b.dataset.cam)));
      if (room && state.view === "3d") A.studio3d.mount($("#scene"), { room, pcs, occ, selected: state.pc, batchName: (S.get("batches", state.batch) || {}).name, onPick: (id) => { state.pc = state.pc === id ? null : id; A.refresh(); } });
    },
  });

  const aisleOf = (room) => { const a = room.aisleAfter != null && room.aisleAfter !== "" ? Number(room.aisleAfter) : Math.ceil(room.cols / 2); return a > 0 && a < room.cols ? a : 0; };
  const planCols = (room) => { const a = aisleOf(room); return a ? `repeat(${a}, minmax(0,1fr)) 40px repeat(${room.cols - a}, minmax(0,1fr))` : `repeat(${room.cols}, minmax(0,1fr))`; };
  function seatTile(p, occ, batches, r, c) {
    if (!p) return `<div class="ws empty-slot" data-slot="${r}:${c}" title="Empty — double-click to add"><div class="ws-label">Seat ${c}</div></div>`;
    const o = occ(p);
    const cls = p.status !== "Active" ? "maint" : o.length ? "occ" : "";
    const label = state.batch ? (o[0] ? esc(sel.name(o[0])) : `<span class="faint">Free</span>`) : o.length ? esc(o.map((s) => s.firstName).join(", ")) : `<span class="faint">Free</span>`;
    const dots = state.batch ? "" : `<div class="occ-dots">${batches.map((b) => `<i class="${sel.occupants(p.id).some((s) => s.batchId === b.id) ? "on" : ""}" title="${esc(b.name)}"></i>`).join("")}</div>`;
    return `<div class="ws ${cls} ${state.pc === p.id ? "sel" : ""}" data-pc="${p.id}"><div class="ws-label"><span>${esc(p.label)}</span>${p.status !== "Active" ? ic("tool", 12) : dots}</div><div class="ws-name">${p.status !== "Active" ? `<span class="muted">${esc(p.status)}</span>` : label}</div><div class="ws-screen"></div></div>`;
  }
  /* Plan view: two-sided tables (island) or classic rows */
  function planHtml(room, pcs, occ, batches) {
    const at = {}; pcs.forEach((p) => (at[p.row + ":" + p.col] = p));
    if (room.layout !== "rows") {
      const per = Math.ceil(room.cols / 2), side = (r, from, to) => { let s = ""; for (let c = from; c <= to; c++) s += seatTile(at[r + ":" + c], occ, batches, r, c); return s; };
      let out = "";
      for (let r = 1; r <= room.rows; r++) out += `<div class="table-plan"><div class="tp-end" title="Planter">${ic("sparkle", 14)}</div><div class="tp-body">
          <div class="tp-label">Table ${r}<span>${per} seats each side</span></div>
          <div class="plan-grid" style="grid-template-columns:repeat(${per}, minmax(0,1fr))">${side(r, per + 1, room.cols)}</div>
          <div class="tp-divider"></div>
          <div class="plan-grid" style="grid-template-columns:repeat(${per}, minmax(0,1fr))">${side(r, 1, per)}</div></div></div>`;
      return out;
    }
    const aisle = aisleOf(room); let out = "";
    for (let r = 1; r <= room.rows; r++) for (let c = 1; c <= room.cols; c++) { if (aisle && c === aisle + 1) out += `<div class="aisle" title="Aisle"></div>`; out += seatTile(at[r + ":" + c], occ, batches, r, c); }
    return `<div class="plan-grid" style="grid-template-columns:${planCols(room)}">${out}</div>`;
  }
  function roomPanel(room, pcs, batches, occ) {
    const unseated = sel.enrolled().filter((s) => !s.computerId && (!state.batch || s.batchId === state.batch));
    const specs = U.groupBy(pcs, (p) => `${p.cpu || "Unknown CPU"} · ${p.ram || ""}`);
    return `<div class="card"><div class="card-head"><div><h3>${esc(room.name)}</h3><div class="hint">${esc(room.type || "")} · ${room.layout !== "rows" ? `${room.rows} tables × ${room.cols} seats` : `${room.rows} rows × ${room.cols} seats`}</div></div></div>
        ${UI.hbars(batches.map((b) => { const used = pcs.filter((p) => p.status === "Active" && sel.occupants(p.id).some((s) => s.batchId === b.id)).length; return { label: `${esc(b.name)} <span class="faint tiny">${esc(b.time)}</span>`, value: used, display: `${used} / ${pcs.filter((p) => p.status === "Active").length}` }; }))}
        <div class="stat-list mt"><div><div class="s-label">Active</div><div class="s-value">${pcs.filter((p) => p.status === "Active").length}</div></div><div><div class="s-label">Maintenance</div><div class="s-value">${pcs.filter((p) => p.status === "Maintenance").length}</div></div><div><div class="s-label">Tablets</div><div class="s-value">${pcs.filter((p) => p.tablet).length}</div></div></div></div>
      <div class="card"><div class="card-head"><h3>Hardware profiles</h3></div><div class="list">${Object.entries(specs).map(([k, list]) => `<div class="list-item"><span class="file-ic">${ic("cpu", 15)}</span><div class="grow small"><div class="strong">${esc(k)}</div><div class="tiny faint">${esc(list[0].gpu || "")} · ${esc(list[0].monitor || "")}</div></div><span class="mono small">×${list.length}</span></div>`).join("")}</div></div>
      <div class="card"><div class="card-head"><div><h3>Without a seat</h3><div class="hint">${state.batch ? "In this batch" : "All batches"}</div></div><span class="chip ${unseated.length ? "warn" : "ok"}">${unseated.length}</span></div>
        <div class="list">${unseated.slice(0, 8).map((s) => `<div class="list-item">${UI.person(s, esc((sel.batch(s) || {}).name || "No batch"))}<button class="btn btn-xs" style="margin-left:auto" data-act="seatFor" data-arg="${s.id}">Assign</button></div>`).join("") || '<p class="small faint">Everyone enrolled has a workstation.</p>'}</div></div>`;
  }
  A.actions.seatFor = { perm: "classroom.edit", run: (id) => A.classroom.assignFor(S.get("students", id)) };

  function pcPanel(pc, batches) {
    const occ = sel.occupants(pc.id);
    const spec = [["Processor", pc.cpu], ["Graphics", pc.gpu], ["Memory", pc.ram], ["Storage", pc.storage], ["OS", pc.os], ["Monitor", pc.monitor], ["Asset tag", pc.assetTag], ["Purchased", pc.purchased ? U.fmtDate(pc.purchased) : ""]];
    const per = ["mouse", "keyboard", "headset", "tablet"];
    return `<div class="card glow"><div class="card-head"><div><div class="eyebrow" style="margin-bottom:6px">${esc((sel.room(pc) || {}).name || "")} · ${(S.get("rooms", pc.roomId) || {}).layout !== "rows" ? `Table ${pc.row}, seat ${pc.col}` : `Row ${pc.row}, seat ${pc.col}`}</div><h3 class="serif" style="font-size:18px;font-weight:650">${esc(pc.label)}</h3></div><button class="icon-btn" id="closePc">${ic("x", 16)}</button></div>
        <div class="row mb" style="gap:6px">${["Active", "Maintenance", "Retired"].map((s) => `<button class="btn btn-xs ${pc.status === s ? "btn-primary" : ""}" data-pstatus="${s}">${s}</button>`).join("")}<div class="grow"></div><button class="btn btn-xs" id="editPc" data-perm="classroom.edit">${ic("edit", 12)}Edit</button></div>
        <dl class="kv">${spec.map(([k, v]) => `<dt>${k}</dt><dd>${esc(v || "—")}</dd>`).join("")}</dl>
        <div class="row wrap mt" style="gap:6px">${per.map((k) => `<span class="chip ${pc[k] ? "ok" : "muted"}">${U.cap(k)}</span>`).join("")}</div>
        ${pc.notes ? `<div class="note neutral mt"><p class="small">${esc(pc.notes)}</p></div>` : ""}</div>
      <div class="card"><div class="card-head"><div><h3>Seat assignments</h3><div class="hint">One student per batch</div></div></div>
        ${batches.map((b) => { const s = occ.find((x) => x.batchId === b.id);
          const cand = sel.enrolled().filter((x) => x.batchId === b.id && x.computerId !== pc.id).sort((a, z) => (a.computerId ? 1 : 0) - (z.computerId ? 1 : 0) || sel.name(a).localeCompare(sel.name(z)));
          return `<div class="list-item"><div style="width:96px"><div class="small strong">${esc(b.name)}</div><div class="tiny faint mono">${esc(b.time)}</div></div>
            ${s ? `<div class="grow"><a href="#/students/${s.id}">${UI.person(s, esc(sel.courseLabel(sel.course(s))))}</a></div><button class="icon-btn sm" data-release="${s.id}" title="Release seat">${ic("x", 14)}</button>`
              : pc.status !== "Active" ? '<span class="small faint grow">Unavailable</span>' : `<select class="input sm grow" data-assign="${pc.id}"><option value="">Assign a student…</option>${cand.map((x) => `<option value="${x.id}">${esc(sel.name(x))}${x.computerId ? ` (moves from ${esc(sel.seatLabel(x))})` : ""}</option>`).join("")}</select>`}</div>`; }).join("")}</div>`;
  }

})(window.App);
