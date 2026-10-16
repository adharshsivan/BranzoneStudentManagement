/* ==========================================================================
   Studio 3D — a realistic three.js model of the Branzone Creative Studio.

   Layout (room.layout = "island", the default):
     each room "row" is one long white table with an orange centre divider.
     Seats 1…n/2 sit on the back side facing the front wall, seats n/2+1…n
     sit opposite them, facing back.  3 tables × 10 seats = 30 computers.
     A freestanding shelf partition with wooden cubbies and plants runs behind the table ends.
   room.layout = "rows" gives classic single-sided rows (with optional aisle).

   Used by the Classroom module:  A.studio3d.mount(host, { room, pcs, occ, selected, onPick })
   Furniture is rebuilt only when the layout changes; occupancy / selection
   updates just swap screen textures, so it stays smooth.
   ========================================================================== */
(function (A) {
  const U = A.util;
  let R = null;

  const COL = { white: 0xf1f1ee, orange: 0xff5b22, black: 0x0d0d0d, fabric: 0x141414, wall: 0x121212, wood: 0xa97c4f, metal: 0x1a1a1a, mustard: 0xc79a2e };
  const SX = 1.25;          // seat pitch along a table
  const TOP_Y = 0.74;       // desk height
  const HALF_D = 0.75;      // depth of one side of a table
  const CHAIR_Z = 0.95;     // chair distance from the seat's desk centre

  /* ---------- Layout maths shared by build, plan and camera ---------- */
  function layout(room) {
    const rows = room.rows, cols = room.cols;
    if (room.layout !== "rows") {
      const per = Math.ceil(cols / 2), len = per * SX, tableD = HALF_D * 2, pitch = tableD + 2.3;
      const zT = (r) => (r - 1) * pitch;
      const seat = (row, col) => {
        const sideB = col > per, i = sideB ? col - per - 1 : col - 1;
        return { x: -len / 2 + SX / 2 + i * SX, z: zT(row) + (sideB ? -HALF_D / 2 : HALF_D / 2), yaw: sideB ? Math.PI : 0 };
      };
      const zFront = zT(1) - HALF_D - 1.3, zBack = zT(rows) + HALF_D + 1.3;
      return { island: true, rows, cols, per, len, tableD, zT, seat, W: len + 3.2, zFront, zBack, wallZ: zFront - 1.6, leftX: -len / 2 - 2.6, rightX: len / 2 + 1.8 };
    }
    const A_ = room.aisleAfter != null && room.aisleAfter !== "" ? Number(room.aisleAfter) : Math.ceil(cols / 2);
    const aisle = A_ > 0 && A_ < cols ? 1.6 : 0;
    const left = aisle ? A_ : cols, half = Math.max(left, cols - left) * SX + aisle / 2;
    const xOf = (c) => (!aisle ? -((cols * SX) / 2) + (c - 0.5) * SX : c <= A_ ? -aisle / 2 - (A_ - c + 0.5) * SX : aisle / 2 + (c - A_ - 0.5) * SX);
    const zOf = (r) => (r - 1) * 2.3;
    const seat = (row, col) => ({ x: xOf(col), z: zOf(row), yaw: 0 });
    const segs = aisle ? [[1, A_], [A_ + 1, cols]] : [[1, cols]];
    return { island: false, rows, cols, xOf, zOf, seat, segs, W: half * 2, zFront: -1, zBack: zOf(rows) + 1.6, wallZ: -3.1, leftX: -half - 1.9, rightX: half + 1.5 };
  }
  A.studioLayout = layout;

  /* ---------- Canvas textures ---------- */
  const canvasTex = (w, h, draw) => { const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d"), w, h); const t = new R.T.CanvasTexture(c); t.anisotropy = 4; return t; };
  const fontFam = () => getComputedStyle(document.body).fontFamily;
  function screenTex(key, label, name, sub) {
    if (R.tex[key]) return R.tex[key];
    const font = fontFam();
    return (R.tex[key] = canvasTex(512, 290, (g, w, h) => {
      if (name === "__off") {
        g.fillStyle = "#050505"; g.fillRect(0, 0, w, h);
        const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, "rgba(255,255,255,.07)"); gr.addColorStop(.45, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(0, 0, w, h);
        g.fillStyle = "rgba(255,255,255,.22)"; g.font = `600 30px ${font}`; g.textAlign = "center"; g.fillText(label, w / 2, h / 2 + 10);
        return;
      }
      if (name === "__maint") {
        g.fillStyle = "#121212"; g.fillRect(0, 0, w, h);
        g.fillStyle = "#fbbf24"; g.font = `700 30px ${font}`; g.textAlign = "center"; g.fillText("UNDER MAINTENANCE", w / 2, h / 2);
        g.fillStyle = "rgba(255,255,255,.4)"; g.font = `500 22px ${font}`; g.fillText(label, w / 2, h / 2 + 40);
        return;
      }
      const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, "#1b1b1b"); gr.addColorStop(1, "#0e0e0e"); g.fillStyle = gr; g.fillRect(0, 0, w, h);
      g.fillStyle = "#ff5b22"; g.beginPath(); g.moveTo(34, 64); g.lineTo(52, 22); g.lineTo(60, 22); g.lineTo(42, 64); g.fill();
      g.fillStyle = "#fff"; g.beginPath(); g.moveTo(62, 22); g.lineTo(70, 22); g.lineTo(88, 64); g.lineTo(80, 64); g.fill();
      g.fillStyle = "rgba(255,255,255,.5)"; g.font = `600 20px ${font}`; g.textAlign = "right"; g.fillText(label, w - 28, 50);
      g.fillStyle = "#fff"; g.textAlign = "left"; g.font = `700 46px ${font}`; g.fillText(name, 34, 160);
      g.fillStyle = "rgba(255,255,255,.55)"; g.font = `500 22px ${font}`; g.fillText(sub, 34, 198);
      g.fillStyle = "#ff5b22"; g.fillRect(34, 236, 140, 6); g.fillStyle = "rgba(255,255,255,.12)"; g.fillRect(180, 236, 300, 6);
    }));
  }
  /* Office carpet tile, as in the studio: dense charcoal loop pile with
     linear streaks in grey and a few Branzone-orange threads. */
  function carpetTex() {
    const t = canvasTex(512, 512, (g, w, h) => {
      g.fillStyle = "#26262a"; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 26000; i++) {                       // loop-pile fibres
        const v = Math.random();
        g.fillStyle = v < 0.5 ? `rgba(0,0,0,${0.12 + Math.random() * 0.2})` : `rgba(255,255,255,${0.03 + Math.random() * 0.06})`;
        g.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 2, 1);
      }
      const streak = (y, len, col, a) => { g.globalAlpha = a; g.fillStyle = col; g.fillRect(Math.random() * w, y, len, 2); g.globalAlpha = 1; };
      for (let i = 0; i < 260; i++) streak(Math.random() * h, 20 + Math.random() * 140, Math.random() < 0.6 ? "#4a4a50" : "#3a3a40", 0.7);
      for (let i = 0; i < 40; i++) streak(Math.random() * h, 15 + Math.random() * 80, "#ff5b22", 0.45);
      for (let i = 0; i < 25; i++) streak(Math.random() * h, 15 + Math.random() * 70, "#5a6a80", 0.35);
    });
    t.wrapS = t.wrapT = R.T.RepeatWrapping; t.repeat.set(5, 5); return t;
  }  function keysTex() {
    return canvasTex(512, 160, (g, w, h) => {
      g.fillStyle = "#111"; g.fillRect(0, 0, w, h);
      const rows = [14, 14, 13, 12], kw = 30, gap = 4;
      rows.forEach((n, r) => { let x = 10 + r * 6; for (let i = 0; i < n; i++) { const ww = (r === 3 && i === 5) ? kw * 5 : kw; g.fillStyle = "#262626"; g.fillRect(x, 10 + r * 36, ww, 30); g.fillStyle = "rgba(255,255,255,.06)"; g.fillRect(x, 10 + r * 36, ww, 3); x += ww + gap; if (x > w - 10) break; } });
    });
  }
  function meshTex() {
    const t = canvasTex(64, 64, (g, w, h) => { g.fillStyle = "#4a4a4a"; g.fillRect(0, 0, w, h); g.fillStyle = "#151515"; for (let i = 0; i < w; i += 4) { g.fillRect(i, 0, 2, h); g.fillRect(0, i, w, 2); } });
    t.wrapS = t.wrapT = R.T.RepeatWrapping; t.repeat.set(10, 10); return t;
  }
  function wordTex(text, size = 110, spacing = 28) {
    const font = fontFam();
    return canvasTex(1400, 200, (g, w, h) => { g.clearRect(0, 0, w, h); g.fillStyle = "#f5f5f5"; g.font = `700 ${size}px ${font}`; g.textAlign = "center"; g.textBaseline = "middle"; try { g.letterSpacing = spacing + "px"; } catch (e) {} g.fillText(text, w / 2, h / 2 + 6); });
  }

  /* Rounded box geometry (extruded rounded rectangle with bevel) */
  function rbox(w, h, d, r = 0.02) {
    const T = R.T, s = new T.Shape(), x = -w / 2, y = -d / 2, rr = Math.min(r, w / 2, d / 2);
    s.moveTo(x + rr, y); s.lineTo(x + w - rr, y); s.quadraticCurveTo(x + w, y, x + w, y + rr); s.lineTo(x + w, y + d - rr); s.quadraticCurveTo(x + w, y + d, x + w - rr, y + d);
    s.lineTo(x + rr, y + d); s.quadraticCurveTo(x, y + d, x, y + d - rr); s.lineTo(x, y + rr); s.quadraticCurveTo(x, y, x + rr, y);
    const bev = Math.min(rr * 0.6, h * 0.45);
    const g = new T.ExtrudeGeometry(s, { depth: Math.max(0.001, h - bev * 2), bevelEnabled: true, bevelThickness: bev, bevelSize: bev * 0.8, bevelSegments: 3, curveSegments: 6 });
    g.rotateX(-Math.PI / 2); g.center(); return g;
  }

  /* ---------- Init (once) ---------- */
  async function ensure() {
    await A.load(A.libs.three); await A.load(A.libs.orbit);
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
    if (R) return R;
    const T = window.THREE;
    const renderer = new T.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
    const scene = new T.Scene(); scene.background = new T.Color(0x0b0b0b); scene.fog = new T.Fog(0x0b0b0b, 30, 72);
    const camera = new T.PerspectiveCamera(42, 1, 0.1, 200);
    const controls = new T.OrbitControls(camera, renderer.domElement);
    Object.assign(controls, { enableDamping: true, dampingFactor: 0.08, maxPolarAngle: Math.PI / 2.06, minDistance: 1.6, maxDistance: 34, screenSpacePanning: false });

    scene.add(new T.HemisphereLight(0xffffff, 0x2a2a2a, 0.62));
    const key = new T.DirectionalLight(0xffffff, 0.55); key.position.set(-7, 13, 9); key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048); Object.assign(key.shadow.camera, { left: -16, right: 16, top: 16, bottom: -16, near: 1, far: 40 }); key.shadow.bias = -0.0004;
    scene.add(key, key.target, new T.AmbientLight(0xffffff, 0.12));

    R = { T, renderer, scene, camera, controls, tex: {}, group: null, layoutKey: null, stations: {}, pick: [], running: false, onPick: null, outline: null, anim: null };
    const mat = (color, o = {}) => new T.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0.02, ...o });
    R.M = {
      white: mat(COL.white, { roughness: 0.45 }), orange: mat(COL.orange, { roughness: 0.6 }), black: mat(COL.black, { roughness: 0.35, metalness: 0.2 }),
      bezel: mat(0x0a0a0a, { roughness: 0.3, metalness: 0.3 }), fabric: mat(COL.fabric, { roughness: 0.95 }), plastic: mat(0x111111, { roughness: 0.45, metalness: 0.1 }),
      mesh: new T.MeshStandardMaterial({ color: 0x2a2a2a, map: meshTex(), roughness: 1 }),
      chrome: mat(0x9a9a9a, { roughness: 0.25, metalness: 0.9 }), keyboard: mat(0x1a1a1a, { roughness: 0.5 }), keycaps: new T.MeshStandardMaterial({ map: keysTex(), roughness: 0.6 }),
      mouse: mat(0x151515, { roughness: 0.25, metalness: 0.15 }), pad: mat(0x161616, { roughness: 1 }),
      wall: mat(COL.wall, { roughness: 0.95 }), side: mat(0x1a1a1a, { roughness: 0.95 }), wood: mat(COL.wood, { roughness: 0.75 }), metal: mat(COL.metal, { roughness: 0.5, metalness: 0.5 }), mustard: mat(COL.mustard, { roughness: 0.8 }),
      glass: new T.MeshStandardMaterial({ color: 0x9fb4c4, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.12 }), trunk: mat(0x5a4330, { roughness: 0.9 }), soil: mat(0x2b2118, { roughness: 1 }),
      leaf: [mat(0x3d7a36, { flatShading: true }), mat(0x4e9443, { flatShading: true }), mat(0x2e6a2f, { flatShading: true })],
      offScreen: mat(0x050505, { roughness: 0.15, metalness: 0.4 }),
    };
    R.G = {
      box: new T.BoxGeometry(1, 1, 1), screen: new T.PlaneGeometry(0.53, 0.3), leaf: new T.IcosahedronGeometry(1, 0),
      seat: rbox(0.5, 0.07, 0.48, 0.06), arm: rbox(0.06, 0.03, 0.24, 0.02), keyboard: rbox(0.44, 0.022, 0.145, 0.012), pad: rbox(0.25, 0.004, 0.21, 0.02),
      keycaps: new T.PlaneGeometry(0.42, 0.125), mouse: new T.SphereGeometry(1, 20, 14), base: new T.CylinderGeometry(1, 1, 1, 24),
      starArm: new T.CylinderGeometry(0.016, 0.022, 0.31, 8), wheel: new T.CylinderGeometry(0.024, 0.024, 0.035, 12), cyl: new T.CylinderGeometry(1, 1, 1, 16),
      backFrame: rbox(0.5, 0.035, 0.6, 0.08).rotateX(Math.PI / 2), backPanel: rbox(0.44, 0.012, 0.52, 0.06).rotateX(Math.PI / 2), band: new T.TorusGeometry(0.085, 0.011, 8, 24, Math.PI),
    };
    R.G.starArm.rotateZ(Math.PI / 2); R.G.wheel.rotateZ(Math.PI / 2);

    const ray = new T.Raycaster(), v2 = new T.Vector2(); let down = null;
    const hit = (e) => { const r = renderer.domElement.getBoundingClientRect(); v2.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(v2, camera); const h = ray.intersectObjects(R.pick, false)[0]; return h ? h.object.userData : null; };
    renderer.domElement.addEventListener("pointerdown", (e) => (down = [e.clientX, e.clientY]));
    renderer.domElement.addEventListener("pointerup", (e) => { if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 5) return; const d = hit(e); if (d && d.pcId && R.onPick) R.onPick(d.pcId); });
    renderer.domElement.addEventListener("pointermove", (e) => {
      const tip = document.getElementById("tip"); if (!tip) return;
      const d = hit(e); renderer.domElement.style.cursor = d ? "pointer" : "grab";
      if (d) { const r = renderer.domElement.getBoundingClientRect(); tip.style.display = "block"; tip.style.left = e.clientX - r.left + "px"; tip.style.top = e.clientY - r.top + "px"; tip.innerHTML = `<b>${U.esc(d.label)}</b><div class="faint">${U.esc(d.who)}</div>`; }
      else tip.style.display = "none";
    });
    renderer.domElement.addEventListener("pointerleave", () => { const tip = document.getElementById("tip"); if (tip) tip.style.display = "none"; });
    return R;
  }

  /* ---------- Builders ---------- */
  function add(g, geo, m, sx, sy, sz, x, y, z, shadow = true) {
    const me = new R.T.Mesh(geo || R.G.box, m); me.scale.set(sx, sy, sz); me.position.set(x, y, z);
    me.castShadow = shadow; me.receiveShadow = true; g.add(me); return me;
  }

  /* Deterministic "random" so the studio looks identical every time it is built */
  let seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

  /* Office chair (as in the studio): five-star base with twin casters, gas lift, cushioned seat,
     solid black mesh backrest in a frame, lumbar support and armrests.
     Built facing −z (the sitter looks towards −z); the backrest sits at +z. */
  function chair(g, x, z, yaw) {
    const { T, M, G } = R; const c = new T.Group(); c.position.set(x, 0, z); c.rotation.y = yaw;
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + 0.3;
      const arm = new T.Mesh(G.starArm, M.plastic); arm.position.set(Math.cos(a) * 0.155, 0.075, Math.sin(a) * 0.155); arm.rotation.y = -a; arm.rotation.z = 0.08; c.add(arm);
      const w = new T.Mesh(G.wheel, M.black); w.position.set(Math.cos(a) * 0.3, 0.026, Math.sin(a) * 0.3); w.rotation.y = -a + Math.PI / 2; c.add(w);
    }
    add(c, G.cyl, M.plastic, 0.045, 0.06, 0.045, 0, 0.09, 0);                     // hub
    add(c, G.cyl, M.chrome, 0.022, 0.2, 0.022, 0, 0.22, 0);                       // gas lift
    add(c, G.cyl, M.plastic, 0.034, 0.1, 0.034, 0, 0.17, 0);                      // shroud
    add(c, null, M.plastic, 0.26, 0.05, 0.24, 0, 0.37, 0.01);                     // tilt mechanism
    add(c, G.seat, M.fabric, 1, 1, 1, 0, 0.44, 0);                                // seat cushion
    /* backrest: frame + mesh panel, gently reclined */
    const back = new T.Group(); back.position.set(0, 0.5, 0.25); back.rotation.x = -0.13; c.add(back);
    add(back, G.backFrame, M.plastic, 1, 1, 1, 0, 0.36, 0.012);                   // outer frame
    add(back, G.backPanel, M.mesh, 1, 1, 1, 0, 0.36, -0.004);                     // mesh
    add(back, null, M.plastic, 0.44, 0.05, 0.03, 0, 0.2, -0.02);                  // lumbar pad
    add(back, null, M.plastic, 0.06, 0.16, 0.04, 0, 0.04, 0.02);                  // spine to seat
    add(c, null, M.plastic, 0.06, 0.04, 0.24, 0, 0.42, 0.16);                     // spine under seat
    /* armrests */
    [-0.28, 0.28].forEach((ax) => { add(c, null, M.plastic, 0.035, 0.22, 0.035, ax, 0.56, 0.05); add(c, G.arm, M.fabric, 1, 1, 1, ax, 0.68, 0.02); add(c, null, M.plastic, 0.035, 0.03, 0.12, ax, 0.455, 0.05); });
    c.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    g.add(c); return c;
  }

  /* Freestanding shelf partition behind the ends of all tables: black metal grid with
     wooden cubbies, potted plants and trailing greens — as in the studio photos. */
  function shelfPartition(g, x, z0, z1) {
    const { M, G } = R; seed = 11;
    const H = 2.4, D = 0.42, cell = 0.6, levels = 4, len = z1 - z0, cols = Math.max(2, Math.round(len / cell)), cw = len / cols, lh = H / levels;
    for (let i = 0; i <= cols; i++) add(g, null, M.metal, D, H, 0.03, x, H / 2, z0 + i * cw);          // uprights
    for (let l = 0; l <= levels; l++) add(g, null, M.metal, D, 0.03, len, x, l * lh + 0.015, (z0 + z1) / 2); // shelves
    for (let i = 0; i < cols; i++) for (let l = 0; l < levels; l++) {
      const cz = z0 + (i + 0.5) * cw, y = l * lh + 0.03, k = (i * 3 + l * 2) % 5;
      if (k === 0 || k === 3) add(g, null, M.wood, D - 0.04, lh - 0.06, cw - 0.06, x, y + (lh - 0.06) / 2, cz);   // closed wooden cubby
      else if (k === 1 || k === 4) {                                                                            // plant box
        add(g, null, M.wood, D - 0.06, 0.16, cw - 0.12, x, y + 0.08, cz);
        for (let n = 0; n < 9; n++) { const r = 0.06 + rnd() * 0.06; const lf = add(g, G.leaf, M.leaf[n % 3], r, r * 1.2, r, x + (rnd() - 0.5) * 0.25, y + 0.2 + rnd() * 0.2, cz + (rnd() - 0.5) * (cw - 0.2)); lf.rotation.set(rnd() * 3, rnd() * 3, 0); }
        if (l > 0) for (let v = 0; v < 3; v++) { const lf = add(g, G.leaf, M.leaf[(v + 1) % 3], 0.035, 0.12, 0.035, x + (rnd() - 0.5) * 0.3, y - 0.06 - v * 0.1, cz + (rnd() - 0.5) * (cw - 0.25)); lf.rotation.set(rnd(), rnd(), 0); } // trailing
      }
    }
  }
  /* Shelf partition laid along x, behind the last row of seats, facing the CREATIVE wall */
  function backShelf(g, z, len) {
    const s = new R.T.Group(); s.position.set(0, 0, z); s.rotation.y = Math.PI / 2; g.add(s);
    shelfPartition(s, 0, -len / 2, len / 2);
  }
  /* One workstation, built in local space: desk centre at origin, sitter looking −z */
  function station(g, p, s) {
    const { T, M, G } = R; const w = new T.Group(); w.position.set(s.x, 0, s.z); w.rotation.y = s.yaw; g.add(w);
    const st = { p, x: s.x, z: s.z, yaw: s.yaw, group: w };
    if (p.status !== "Retired") {
      add(w, G.base, M.bezel, 0.11, 0.012, 0.08, 0, TOP_Y + 0.026, -0.2);           // oval stand base
      const neck = add(w, null, M.bezel, 0.045, 0.24, 0.025, 0, TOP_Y + 0.14, -0.23); neck.rotation.x = 0.08;
      add(w, null, M.bezel, 0.56, 0.335, 0.022, 0, TOP_Y + 0.37, -0.2);              // bezel
      add(w, null, M.bezel, 0.56, 0.03, 0.03, 0, TOP_Y + 0.2, -0.198);               // chin
      const screen = new T.Mesh(G.screen, M.offScreen); screen.position.set(0, TOP_Y + 0.375, -0.188); w.add(screen); st.screen = screen;
      add(w, G.keyboard, M.keyboard, 1, 1, 1, 0, TOP_Y + 0.032, 0.12);
      const caps = new T.Mesh(G.keycaps, M.keycaps); caps.rotation.x = -Math.PI / 2; caps.position.set(0, TOP_Y + 0.0445, 0.12); w.add(caps);
      if (p.mouse) { add(w, G.pad, M.pad, 1, 1, 1, 0.36, TOP_Y + 0.023, 0.12, false); const m = add(w, G.mouse, M.mouse, 0.032, 0.018, 0.055, 0.36, TOP_Y + 0.035, 0.12); m.rotation.y = -0.1; }
      if (p.tablet) { add(w, rbox(0.3, 0.012, 0.2, 0.015), M.bezel, 1, 1, 1, -0.38, TOP_Y + 0.027, 0.1); add(w, G.cyl, M.chrome, 0.004, 0.14, 0.004, -0.2, TOP_Y + 0.03, 0.1).rotation.z = Math.PI / 2; }
      if (p.headset) {                                                                // headphones hanging on the divider
        const hs = new T.Group(); hs.position.set(0.48, TOP_Y + 0.27, -0.345); w.add(hs);
        const band = new T.Mesh(G.band, M.plastic); hs.add(band);
        [-0.085, 0.085].forEach((ex) => { const cup = add(hs, G.cyl, M.plastic, 0.04, 0.035, 0.04, ex, -0.02, 0.012); cup.rotation.z = Math.PI / 2; });
      }
    }
    st.chair = chair(w, (U.hash(p.id) % 7 - 3) * 0.02, CHAIR_Z, ((U.hash(p.id) % 9) - 4) * 0.05);
    const hb = new T.Mesh(G.box, new T.MeshBasicMaterial({ visible: false })); hb.scale.set(SX - 0.05, 1.4, 1.8); hb.position.set(0, 0.7, 0.45); w.add(hb);
    hb.userData = { pcId: p.id, label: p.label, who: "" }; R.pick.push(hb); st.hit = hb;
    return st;
  }

  function table(g, xm, z, len, depth, twoSided) {
    const { M } = R;
    add(g, null, M.white, len, 0.04, depth, xm, TOP_Y, z);                                                   // desk top
    if (twoSided) {
      add(g, null, M.orange, len, 0.38, 0.03, xm, TOP_Y + 0.21, z);                                         // centre privacy divider
      add(g, null, M.orange, len - 0.1, 0.52, 0.02, xm, TOP_Y - 0.3, z);                                     // centre modesty panel
      add(g, null, M.metal, len - 0.3, 0.06, 0.16, xm, TOP_Y - 0.08, z);                                    // cable tray
    } else {
      add(g, null, M.orange, len, 0.38, 0.03, xm, TOP_Y + 0.21, z - depth / 2 + 0.02);
      add(g, null, M.orange, len, 0.5, 0.02, xm, TOP_Y - 0.3, z - depth / 2 + 0.06);
      add(g, null, M.metal, len - 0.2, 0.06, 0.12, xm, TOP_Y - 0.08, z - 0.18);
    }
    const legs = Math.max(2, Math.round(len / 2.4) + 1);
    for (let i = 0; i < legs; i++) add(g, null, M.white, 0.05, TOP_Y - 0.02, depth - 0.08, xm - len / 2 + 0.03 + (i * (len - 0.06)) / (legs - 1), (TOP_Y - 0.02) / 2, z);
  }

  function buildRoom(room, pcs) {
    const { T, M, scene } = R;
    const shared = new Set(Object.values(R.G));
    if (R.group) { scene.remove(R.group); R.group.traverse((o) => { if (o.geometry && !shared.has(o.geometry)) o.geometry.dispose(); }); }
    const g = new T.Group(); R.group = g; R.stations = {}; R.pick = []; scene.add(g);
    const L = layout(room); R.L = L;
    const depth = L.zBack - L.wallZ + 3, cz = (L.zBack + L.wallZ) / 2, width = L.rightX - L.leftX;

    /* floor + walls */
    const floor = new T.Mesh(new T.PlaneGeometry(width + 2, depth + 2), new T.MeshStandardMaterial({ map: carpetTex(), roughness: 1, metalness: 0 }));
    floor.rotation.x = -Math.PI / 2; floor.position.set((L.leftX + L.rightX) / 2, 0, cz); floor.receiveShadow = true; g.add(floor);
    add(g, null, M.wall, width + 0.3, 3.2, 0.16, (L.leftX + L.rightX) / 2, 1.6, L.wallZ, false);
    /* only the CREATIVE wall stands — side and back walls removed for a clear view */
    const word = new T.Mesh(new T.PlaneGeometry(4.2, 0.6), new T.MeshBasicMaterial({ map: wordTex("CREATIVE"), transparent: true }));
    word.position.set(0, 2.62, L.wallZ + 0.09); g.add(word);
    add(g, null, M.bezel, 2.5, 1.42, 0.06, 0, 1.55, L.wallZ + 0.12);
    add(g, null, new T.MeshBasicMaterial({ color: 0x0b0b0b }), 2.4, 1.32, 0.01, 0, 1.55, L.wallZ + 0.155, false);
    new T.TextureLoader().load("assets/branzone-logo.png", (t) => { const lg = new T.Mesh(new T.PlaneGeometry(1.5, 0.36), new T.MeshBasicMaterial({ map: t, transparent: true })); lg.position.set(0, 1.55, L.wallZ + 0.165); g.add(lg); });

    /* back wall (cut away when the camera is behind it) */



    R.cut = [];






    /* tables, with one shelf partition behind all the table ends */
    if (L.island) {
      for (let r = 1; r <= L.rows; r++) table(g, 0, L.zT(r), L.len + 0.1, L.tableD, true);
      backShelf(g, L.zBack + 0.5, L.len + 1.2);
    } else {
      for (let r = 1; r <= L.rows; r++) {
        L.segs.forEach(([a, b]) => { const x0 = L.xOf(a) - SX / 2 + 0.03, x1 = L.xOf(b) + SX / 2 - 0.03; table(g, (x0 + x1) / 2, L.zOf(r), x1 - x0, HALF_D, false); });
      }
      backShelf(g, L.zBack + 0.5, L.W);
    }

    /* workstations */
    pcs.forEach((p) => { if (p.row <= L.rows && p.col <= L.cols) R.stations[p.id] = station(g, p, L.seat(p.row, p.col)); });

    /* selection outline */
    R.outline = new T.LineSegments(new T.EdgesGeometry(new T.BoxGeometry(SX - 0.06, 1.3, 1.75)), new T.LineBasicMaterial({ color: COL.orange }));
    R.outline.visible = false; g.add(R.outline);

    /* soft downlights over each table */
    for (let r = 1; r <= L.rows; r++) { const pl = new T.PointLight(0xfff4ea, 0.4, 13, 2); pl.position.set(0, 3.1, L.island ? L.zT(r) : L.zOf(r)); g.add(pl); }
  }

  /* ---------- Dynamic update (cheap) ---------- */
  const mats = {};
  const matFor = (key, texFn) => mats[key] || (mats[key] = new R.T.MeshBasicMaterial({ map: texFn() }));
  function update(occ, selected, batchName) {
    Object.values(R.stations).forEach((st) => {
      const p = st.p, o = occ(p); let who;
      if (p.status === "Maintenance") { who = "Under maintenance"; if (st.screen) st.screen.material = matFor("m:" + p.label, () => screenTex("m:" + p.label, p.label, "__maint")); }
      else if (p.status === "Retired") who = "Retired";
      else if (o.length) {
        const name = o.length === 1 ? A.sel.name(o[0]) : `${o.length} students`;
        const sub = o.length === 1 ? `${(A.sel.batch(o[0]) || {}).name || ""} batch · ${A.sel.courseLabel(A.sel.course(o[0]))}` : o.map((s) => s.firstName).join(", ");
        who = o.map((s) => A.sel.name(s)).join(", ");
        const k = `on:${p.label}:${name}:${sub}`;
        if (st.screen) st.screen.material = matFor(k, () => screenTex(k, p.label, name, sub));
      } else { who = batchName ? `Free in ${batchName}` : "Free"; if (st.screen) st.screen.material = matFor("off:" + p.label, () => screenTex("off:" + p.label, p.label, "__off")); }
      st.hit.userData.who = who;
    });
    const s = selected && R.stations[selected];
    R.outline.visible = !!s;
    if (s) { const dz = Math.cos(s.yaw) * 0.45; R.outline.position.set(s.x, 0.66, s.z + dz); }
  }

  /* ---------- Camera presets ---------- */
  function preset(kind, instant) {
    const L = R.L; if (!L) return;
    const cz = (L.zFront + L.zBack) / 2;
    const P = {
      default: [[L.W * 0.5, 7.2, L.zBack + 5.5], [0, 0.4, cz - 0.8]],
      top: [[0, Math.max(L.W, L.zBack - L.wallZ) * 1.05 + 2, cz + 0.02], [0, 0, cz]],
      front: [[-L.W * 0.32, 2.3, L.wallZ + 0.8], [L.W * 0.08, 0.8, L.zBack]],
      back: [[0.4, 1.7, L.zBack + 0.9], [0, 1.0, L.zFront - 1]],
    }[kind];
    if (!P) return;
    const T = R.T, toP = new T.Vector3(...P[0]), toT = new T.Vector3(...P[1]);
    if (instant) { R.camera.position.copy(toP); R.controls.target.copy(toT); R.controls.update(); return; }
    R.anim = { fromP: R.camera.position.clone(), fromT: R.controls.target.clone(), toP, toT, t0: performance.now(), dur: 650 };
  }

  A.studio3d = {
    async mount(host, { room, pcs, occ, selected, batchName, onPick }) {
      try { await ensure(); } catch (e) { const l = host.querySelector(".loading"); if (l) l.innerHTML = `<div>${U.esc(e.message)}</div>`; return; }
      if (!host.isConnected) return;
      R.onPick = onPick;
      const loading = host.querySelector(".loading"); loading && loading.remove();
      host.insertBefore(R.renderer.domElement, host.firstChild);
      const resize = () => { const w = host.clientWidth, h = host.clientHeight; if (!w || !h) return; R.renderer.setSize(w, h, false); R.camera.aspect = w / h; R.camera.updateProjectionMatrix(); };
      resize(); if (R.ro) R.ro.disconnect(); R.ro = new ResizeObserver(resize); R.ro.observe(host);
      const key = JSON.stringify([room.id, room.rows, room.cols, room.layout, room.aisleAfter, pcs.map((p) => [p.id, p.row, p.col, p.status, p.mouse, p.tablet, p.headset])]);
      const fresh = key !== R.layoutKey;
      if (fresh) { buildRoom(room, pcs); R.layoutKey = key; }
      update(occ, selected, batchName);
      if (fresh && R.roomId !== room.id + room.layout) { R.roomId = room.id + room.layout; preset("default", true); }
      /* fly in behind the chair of a newly selected workstation */
      if (selected && selected !== R.lastSel && R.stations[selected]) {
        const s = R.stations[selected], dir = Math.cos(s.yaw), T = R.T;
        R.anim = { fromP: R.camera.position.clone(), fromT: R.controls.target.clone(), toP: new T.Vector3(s.x + 1.1, 2.0, s.z + dir * 2.9), toT: new T.Vector3(s.x, 0.95, s.z - dir * 0.1), t0: performance.now(), dur: 800 };
      }
      R.lastSel = selected || null;
      if (!R.running) {
        R.running = true;
        const loop = (now) => {
          if (!R.running) return;
          if (!R.renderer.domElement.isConnected) { R.running = false; return; }
          if (R.anim) { const a = R.anim, k = Math.min(1, (now - a.t0) / a.dur), e = 1 - Math.pow(1 - k, 3); R.camera.position.lerpVectors(a.fromP, a.toP, e); R.controls.target.lerpVectors(a.fromT, a.toT, e); if (k >= 1) R.anim = null; }
          R.controls.update();
          if (R.cut) R.cut.forEach((c) => (c.o.visible = c.show(R.camera.position)));
          R.renderer.render(R.scene, R.camera); requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
      }
    },
    view: (k) => R && preset(k),
    pause: () => { if (R) R.running = false; },
  };
})(window.App);