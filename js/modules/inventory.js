/* Inventory — hardware stock. Items linked to workstations (mouse, keyboard,
   monitors, headsets, tablets) count "deployed" straight from the classroom. */
(function (A) {
  const U = A.util, UI = A.ui, S = A.store, sel = A.sel, esc = U.esc, ic = UI.icon;
  const state = { cat: "", sort: "name", dir: "asc" };

  function edit(item) {
    UI.formDrawer({
      title: item ? item.name : "Add inventory item", eyebrow: "Inventory", fields: A.schema.fields.inventory, values: item || { qty: 1, faulty: 0, minSpare: 0 },
      onSave: (v) => { item ? S.update("inventory", item.id, v, { log: `Inventory updated — ${v.name}`, studentId: null }) : S.insert("inventory", v, { log: `Inventory item added — ${v.name}`, studentId: null }); UI.toast("Saved", "ok"); },
      onDelete: item ? () => S.remove("inventory", item.id, { log: `Inventory item removed — ${item.name}` }) : null,
    });
  }

  A.register({
    id: "inventory", label: "Inventory", icon: "box", group: "campus", order: 41, route: "inventory",
    badge: () => { const n = S.all("inventory").filter((i) => sel.invSpare(i) < (Number(i.minSpare) || 0)).length; return n ? { n, hot: true } : null; },
    render(el) {
      const items = S.all("inventory").filter((i) => !state.cat || i.category === state.cat);
      const cats = Array.from(new Set(S.all("inventory").map((i) => i.category).filter(Boolean)));
      const pcs = S.filter("computers", (p) => p.status !== "Retired");
      const low = S.all("inventory").filter((i) => sel.invSpare(i) < (Number(i.minSpare) || 0));
      const per = [["mouse", "Mouse"], ["keyboard", "Keyboard"], ["headset", "Headset"], ["tablet", "Drawing tablet"]];
      const rooms = S.all("rooms");
      el.innerHTML = `<div class="page">
        ${UI.pageHead({ eyebrow: "Campus", title: "Inventory", sub: "Peripherals, displays and studio hardware. Linked items count what's deployed directly from the classroom workstations.",
          actions: `<button class="btn" id="exp" data-perm="export">${ic("download", 15)}Export</button><button class="btn btn-primary" id="add" data-perm="inventory.edit">${ic("plus", 15)}Add item</button>` })}
        <section class="grid g-4">
          ${UI.kpi({ label: "Item types", icon: "box", value: S.all("inventory").length, sub: `${U.sum(S.all("inventory"), (i) => i.qty)} units in total` })}
          ${UI.kpi({ label: "Workstations", icon: "monitor", value: pcs.length, sub: `${pcs.filter((p) => p.status === "Maintenance").length} under maintenance`, href: "classroom" })}
          ${UI.kpi({ label: "Faulty units", icon: "tool", value: U.sum(S.all("inventory"), (i) => i.faulty), sub: "Under repair or replacement" })}
          ${UI.kpi({ label: "Low stock", icon: "alert", value: low.length ? `<span style="color:var(--bad)">${low.length}</span>` : 0, sub: low.length ? esc(low.map((i) => i.name.split(" (")[0]).join(", ")) : "All spares above minimum" })}
        </section>
        <section class="grid g-side mt">
          <div><div class="filters">${UI.seg("cat", [{ value: "", label: "All" }, ...cats.map((c) => ({ value: c, label: c }))], state.cat)}</div>
            <div class="card flush">${UI.table({ state, rows: items, rowAttr: (i) => `data-inv="${i.id}"`, cols: [
              { key: "name", label: "Item", render: (i) => `<div class="strong">${esc(i.name)}</div><div class="tiny faint">${esc(i.category || "")}${i.vendor ? " · " + esc(i.vendor) : ""}</div>` },
              { key: "qty", label: "Total", align: "right", sort: (i) => Number(i.qty) },
              { key: "dep", label: "Deployed", align: "right", sort: (i) => sel.invDeployed(i), render: (i) => `${sel.invDeployed(i)}${i.link ? ` <span title="Auto-counted from workstations" style="color:var(--accent)">${ic("link", 11)}</span>` : ""}` },
              { key: "faulty", label: "Faulty", align: "right", sort: (i) => Number(i.faulty) || 0, render: (i) => (Number(i.faulty) ? `<span style="color:var(--warn)">${i.faulty}</span>` : "0") },
              { key: "spare", label: "Spare", align: "right", sort: (i) => sel.invSpare(i), render: (i) => `<span class="strong">${sel.invSpare(i)}</span>` },
              { key: "use", label: "Utilisation", sortable: false, render: (i) => UI.bar(i.qty ? sel.invDeployed(i) / i.qty : 0, sel.invSpare(i) < (i.minSpare || 0) ? "bad" : ""), width: "140px" },
              { key: "st", label: "Status", sort: (i) => (sel.invSpare(i) < (i.minSpare || 0) ? 0 : 1), render: (i) => UI.chip(sel.invSpare(i) < (i.minSpare || 0) ? "Low" : "OK") },
            ], empty: UI.empty("box", "No items", "Add the hardware you want to track.") })}</div></div>
          <div class="stack">
            <div class="card"><div class="card-head"><div><h3>Peripherals per room</h3><div class="hint">From workstation records</div></div><a class="card-link" href="#/classroom">Classroom ${ic("chevR", 13)}</a></div>
              ${UI.table({ cls: "compact", cols: [{ key: "r", label: "Room", sortable: false, render: (r) => esc(r.name) }, { key: "pc", label: "PCs", align: "right", sortable: false, render: (r) => S.count("computers", (p) => p.roomId === r.id && p.status !== "Retired") }, ...per.map(([k, l]) => ({ key: k, label: l.split(" ")[0], align: "right", sortable: false, render: (r) => S.count("computers", (p) => p.roomId === r.id && p.status !== "Retired" && p[k]) }))], rows: rooms })}
              ${(() => { const missing = pcs.filter((p) => !p.mouse || !p.keyboard); return missing.length ? `<div class="banner mt" style="margin-bottom:0">${ic("alert", 16)}<div class="small">${missing.map((p) => `<b>${esc(p.label)}</b> missing ${[!p.mouse && "mouse", !p.keyboard && "keyboard"].filter(Boolean).join(" & ")}`).join(" · ")}</div></div>` : ""; })()}
            </div>
            <div class="card"><div class="card-head"><h3>System specifications</h3></div>
              <div class="list">${Object.entries(U.groupBy(pcs, (p) => [p.cpu, p.gpu, p.ram].join("|"))).map(([k, list]) => { const [cpu, gpu, ram] = k.split("|"); return `<div class="list-item"><span class="file-ic">${ic("cpu", 15)}</span><div class="grow small"><div class="strong">${esc(cpu || "Unspecified")}</div><div class="tiny faint">${esc(gpu || "")} · ${esc(ram || "")} · ${esc(list[0].storage || "")}</div></div><span class="mono small">×${list.length}</span></div>`; }).join("")}</div></div>
          </div>
        </section></div>`;
      UI.bindSeg(el, "cat", (v) => { state.cat = v; A.refresh(); });
      UI.bindSort(el, state, A.refresh);
      el.querySelector("#add").onclick = () => edit(null);
      el.querySelector("#exp").onclick = () => A.exporter.run("inventory");
      el.querySelectorAll("[data-inv]").forEach((r) => (r.onclick = () => edit(S.get("inventory", r.dataset.inv))));
    },
  });
})(window.App);
