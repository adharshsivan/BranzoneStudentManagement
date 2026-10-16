/* ==========================================================================
   Empty-state illustrations — "Open Doodles" by Pablo Stanley (CC0 public
   domain, free for commercial use, no attribution required).
   https://www.opendoodles.com · loaded via the react-open-doodles package.

   Any element with data-doodle="ReadingDoodle" is filled automatically,
   recoloured to the Branzone palette (white ink, orange accent).
   If the CDN is unreachable the element keeps its icon fallback.
   ========================================================================== */
(function (A) {
  const CDN = {
    react: "https://esm.sh/react@18.3.1",
    server: "https://esm.sh/react-dom@18.3.1/server?deps=react@18.3.1",
    doodles: "https://esm.sh/react-open-doodles@1.0.5?deps=react@18.3.1",
  };
  const INK = "#e8e8e8", ACCENT = "#ff5b22";
  const cache = {};
  let libs = null;

  /* Which doodle suits which empty state (keyed by the state's icon) */
  A.doodleFor = (icon) => ({
    users: "ReadingDoodle", userPlus: "UnboxingDoodle", calendar: "SittingReadingDoodle", wallet: "CoffeeDoodle",
    check: "MeditatingDoodle", inbox: "ChillingDoodle", book: "ReadingSideDoodle", monitor: "SittingDoodle",
    box: "UnboxingDoodle", folder: "PlantDoodle", message: "LovingDoodle", star: "DancingDoodle", activity: "StrollingDoodle",
    briefcase: "SelfieDoodle", search: "LayingDoodle", sheet: "SittingReadingDoodle", clock: "FloatDoodle", alert: "LevitateDoodle",
  }[icon] || "PlantDoodle");

  async function load() {
    if (!libs) libs = Promise.all([import(CDN.react), import(CDN.server), import(CDN.doodles)]).catch((e) => { libs = null; throw e; });
    return libs;
  }
  async function svg(name) {
    if (cache[name]) return cache[name];
    const [React, Server, D] = await load();
    const C = D[name] || D.PlantDoodle;
    return (cache[name] = Server.renderToStaticMarkup(React.createElement(C, { ink: INK, accent: ACCENT })));
  }
  async function fill(root) {
    const els = (root || document).querySelectorAll("[data-doodle]:not([data-filled])");
    for (const el of els) {
      el.setAttribute("data-filled", "1");
      try { const s = await svg(el.dataset.doodle); el.innerHTML = s; el.classList.add("ready"); } catch (e) { el.removeAttribute("data-filled"); }
    }
  }
  A.doodles = { fill };
  new MutationObserver(() => fill()).observe(document.documentElement, { childList: true, subtree: true });
})(window.App);
