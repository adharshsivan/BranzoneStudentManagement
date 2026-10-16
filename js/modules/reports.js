/* Reports & export — every registered dataset as a one-click spreadsheet. */
(function (A) {
  const U = A.util, UI = A.ui, S = A.store, esc = U.esc, ic = UI.icon;
  const state = { month: U.today().slice(0, 7) };

  A.register({
    id: "reports", label: "Reports & Export", icon: "download", group: "data", order: 50, route: "reports", flag: "export",
    render(el) {
      const sets = A.datasets.all();
      const featured = sets.find((d) => d.featured);
      el.innerHTML = `<div class="page">
        ${UI.pageHead({ eyebrow: "Data", title: "Reports & <em>spreadsheets</em>", sub: "Download any part of the portal as an Excel workbook (.xlsx) or CSV. Files open in Excel, Google Sheets and Numbers." })}
        ${featured ? `<div class="card glow dataset mb" style="flex-direction:row;align-items:center;gap:20px;flex-wrap:wrap"><div class="d-icon" style="width:52px;height:52px">${ic(featured.icon, 22)}</div><div class="grow"><h3 class="serif" style="font-size:17px;font-weight:650">${esc(featured.label)}</h3><p class="small muted">${esc(featured.desc)}</p></div><button class="btn btn-accent" data-run="${featured.id}" data-fmt="xlsx">${ic("download", 15)}Download workbook</button></div>` : ""}
        <div class="grid g-3">${sets.filter((d) => !d.featured).map((d) => `<div class="card dataset">
          <div class="row between"><div class="d-icon">${ic(d.icon, 18)}</div>${d.hasMonth ? `<input type="month" class="input sm" data-month="${d.id}" value="${state.month}" style="width:160px">` : ""}</div>
          <div><h3>${esc(d.label)}</h3><p class="small muted" style="margin-top:6px">${esc(d.desc)}</p></div>
          <div class="row" style="margin-top:auto"><button class="btn btn-sm btn-primary" data-run="${d.id}" data-fmt="xlsx">${ic("sheet", 14)}Excel</button><button class="btn btn-sm" data-run="${d.id}" data-fmt="csv">CSV</button><span class="tiny faint" style="margin-left:auto">${d.sheets({ month: state.month }).map((s) => `${s.rows.length} rows`).join(" · ")}</span></div>
        </div>`).join("")}</div>
        <div class="banner mt-lg">${ic("puzzle", 18)}<div class="grow small">Need another report? Datasets are registered in <span class="mono">js/core/exporter.js</span> — each one appears here and can be reused by any module's Export button.</div></div>
      </div>`;
      el.querySelectorAll("[data-month]").forEach((i) => (i.onchange = () => { state.month = i.value || U.today().slice(0, 7); A.refresh(); }));
      el.querySelectorAll("[data-run]").forEach((b) => (b.onclick = async () => {
        b.disabled = true; const t = b.innerHTML; b.innerHTML = '<span class="spinner" style="width:14px;height:14px"></span>Preparing';
        await A.exporter.run(b.dataset.run, { month: state.month, suffix: A.datasets.get(b.dataset.run).hasMonth ? state.month : undefined }, b.dataset.fmt);
        b.disabled = false; b.innerHTML = t;
      }));
    },
  });
})(window.App);
