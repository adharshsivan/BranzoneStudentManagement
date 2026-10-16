/* ==========================================================================
   Seed data — realistic sample studio so every screen has something to show.
   Settings → Data lets the office reset to this or start completely empty.
   Curriculum banks below are also used when creating a new course.
   ========================================================================== */
(function (A) {
  const U = A.util;

  /* [title, topics, assignment, goal] — 48 weeks per track; 3M uses 1–12, 6M uses 1–24, 12M uses all */
  const UX = [
    ["Design Thinking & the UX Process", "Empathise, define, ideate, prototype, test", "Map the design process for a food-delivery app", "Explain the five stages of design thinking"],
    ["Visual Design Fundamentals", "Balance, contrast, hierarchy, gestalt", "Redesign a cluttered landing hero using gestalt principles", "Apply core visual principles to a layout"],
    ["Typography for Interfaces", "Type scale, pairing, readability", "Build a type scale and specimen sheet", "Create a consistent type system"],
    ["Colour & Accessibility", "Palettes, contrast ratios, WCAG", "Create an accessible palette with contrast checks", "Produce WCAG AA-compliant palettes"],
    ["Figma Essentials", "Frames, auto layout, constraints", "Recreate three app screens pixel-perfect in Figma", "Work confidently with auto layout"],
    ["Components & Variants", "Components, variants, properties", "Build a button and input component set", "Build reusable component sets"],
    ["User Research Basics", "Interviews, surveys, personas", "Run three user interviews and write a persona", "Plan and run basic user research"],
    ["Information Architecture", "Card sorting, sitemaps, navigation", "Create a sitemap for an e-commerce site", "Structure content logically"],
    ["User Flows & Wireframes", "Task flows, low-fidelity wireframes", "Wireframe a checkout flow", "Translate flows into wireframes"],
    ["Prototyping & Interactions", "Smart animate, overlays, flows", "Prototype an onboarding flow", "Build clickable prototypes"],
    ["Usability Testing", "Test plans, moderated testing, synthesis", "Run a usability test on your prototype", "Run and synthesise usability tests"],
    ["Foundation Capstone", "Case study, presentation", "Present a complete mobile app case study", "Deliver an end-to-end mini case study"],
    ["Design Systems Foundations", "Tokens, foundations, documentation", "Set up colour and type tokens", "Understand design-system architecture"],
    ["Responsive Layouts", "Grids, breakpoints, fluid type", "Design a responsive dashboard for three breakpoints", "Design across breakpoints"],
    ["Web Design Patterns", "Navigation, forms, tables", "Design a SaaS settings page", "Apply proven web patterns"],
    ["Mobile Platforms", "Apple HIG, Material 3", "Design the same screen for iOS and Android", "Follow platform guidelines"],
    ["Micro-interactions", "Feedback, states, motion", "Animate five micro-interactions", "Design meaningful micro-interactions"],
    ["UX Writing", "Voice, tone, microcopy", "Rewrite microcopy for an error-heavy flow", "Write clear interface copy"],
    ["Accessibility in Practice", "Screen readers, focus order, ARIA basics", "Audit an app for accessibility", "Run an accessibility audit"],
    ["Data-heavy Interfaces", "Dashboards, charts, tables", "Design an analytics dashboard", "Design clear data displays"],
    ["Heuristics & Competitor Analysis", "Nielsen heuristics, benchmarking", "Heuristic review of two competitor apps", "Evaluate products with heuristics"],
    ["Design Handoff", "Dev mode, specs, annotations", "Prepare a developer handoff for a feature", "Hand off designs developers can build"],
    ["Portfolio Building", "Case-study structure, storytelling", "Write two portfolio case studies", "Tell compelling design stories"],
    ["Professional Capstone", "Real-world brief", "Ship a full product redesign", "Deliver a portfolio-ready product project"],
    ["Advanced Research Methods", "Diary studies, JTBD, analytics", "Run a jobs-to-be-done study", "Choose the right research method"],
    ["Service Design", "Blueprints, ecosystems", "Create a service blueprint for a clinic", "Map services end-to-end"],
    ["Advanced Prototyping", "Variables, conditional logic", "Build a logic-driven prototype", "Prototype complex logic"],
    ["Framer for Designers", "Framer sites, CMS, publishing", "Publish a portfolio site in Framer", "Ship live sites without code"],
    ["Motion for UI", "Principles, easing, Protopie", "Create an onboarding motion spec", "Specify UI motion precisely"],
    ["Design Systems at Scale", "Governance, versioning, libraries", "Ship a multi-brand component library", "Maintain scalable systems"],
    ["Product Thinking", "Metrics, OKRs, prioritisation", "Define success metrics for a feature", "Connect design to business outcomes"],
    ["Experimentation", "Hypotheses, A/B tests", "Design an A/B test plan", "Design measurable experiments"],
    ["Workshop Facilitation", "Design sprints, critiques", "Facilitate a mini design sprint", "Lead collaborative workshops"],
    ["HTML & CSS for Designers", "Box model, flexbox, grid", "Code a landing page", "Understand front-end constraints"],
    ["AI in the Design Workflow", "AI tools, prompting, ethics", "Use AI to accelerate a research synthesis", "Use AI tools responsibly"],
    ["Advanced Capstone", "Complex multi-platform product", "Design a multi-platform product", "Deliver an advanced product case study"],
    ["Specialisation: SaaS & B2B", "Enterprise UX, workflows", "Redesign an enterprise workflow", "Design for complex domains"],
    ["Specialisation: Fintech", "Trust, compliance, payments", "Design a payments flow", "Design trustworthy finance UX"],
    ["Specialisation: E-commerce", "Conversion, product pages", "Optimise a product detail page", "Design for conversion"],
    ["Specialisation: Ed-tech & Health", "Inclusive design", "Design a learning-app module", "Design inclusive experiences"],
    ["Leadership & Stakeholders", "Presenting, negotiation", "Pitch a design decision to stakeholders", "Communicate design decisions"],
    ["Freelancing & Business", "Pricing, contracts, clients", "Write a client proposal", "Run freelance projects"],
    ["Interview Preparation", "Whiteboard, portfolio review", "Complete a timed design challenge", "Perform in design interviews"],
    ["Industry Project — Discovery", "Live client brief", "Discovery and research for a client", "Run discovery on a live brief"],
    ["Industry Project — Design", "Design and iterate", "Design the solution and iterate", "Iterate with real feedback"],
    ["Industry Project — Delivery", "Test and deliver", "Test, refine and hand off", "Deliver to a real client"],
    ["Portfolio Polish", "Visual polish, portfolio site", "Final portfolio review", "Ship a hire-ready portfolio"],
    ["Graduation Showcase", "Presentation", "Present at the Branzone showcase", "Graduate industry-ready"],
  ];
  const GD = [
    ["Elements & Principles of Design", "Line, shape, form, space", "Create six compositions using design principles", "Apply principles to compositions"],
    ["Colour Theory", "Colour wheel, harmony, psychology", "Design three colour mood boards", "Build purposeful palettes"],
    ["Typography Fundamentals", "Anatomy, classification, kerning", "Typographic poster with one typeface", "Use type expressively"],
    ["Photoshop Essentials", "Layers, masks, selections", "Composite a product image", "Edit and composite in Photoshop"],
    ["Photo Retouching", "Healing, frequency separation, grading", "Retouch a portrait", "Retouch photos professionally"],
    ["Illustrator Essentials", "Pen tool, shapes, pathfinder", "Recreate five icons with the pen tool", "Draw clean vectors"],
    ["Vector Illustration", "Brushes, gradients, styles", "Illustrate a flat scene", "Create vector illustrations"],
    ["Layout & Grids", "Grids, margins, alignment", "Design a magazine spread", "Build grid-based layouts"],
    ["Social Media Design", "Formats, carousels, templates", "Design a six-post Instagram campaign", "Design platform-ready social posts"],
    ["Print Basics", "CMYK, bleed, DPI, paper", "Prepare a print-ready flyer", "Prepare files for print"],
    ["CorelDRAW for Print", "Interface, layouts, output", "Design a visiting card and letterhead", "Produce print collateral in CorelDRAW"],
    ["Foundation Portfolio", "Presentation, mockups", "Present a six-piece foundation portfolio", "Present work professionally"],
    ["Logo Design", "Concepts, sketching, marks", "Design three logo concepts for a café", "Develop logo concepts from a brief"],
    ["Brand Identity Systems", "Logos, palettes, type, imagery", "Build a mini brand identity", "Create cohesive identity systems"],
    ["Brand Guidelines", "Usage rules, documentation", "Write a twelve-page brand guideline", "Document brands clearly"],
    ["Packaging Design", "Dielines, materials, mockups", "Design packaging for a tea brand", "Design 3D packaging from dielines"],
    ["InDesign Essentials", "Master pages, paragraph styles", "Lay out an eight-page brochure", "Build multi-page documents"],
    ["Editorial Design", "Magazines, books, hierarchy", "Design a magazine cover and feature", "Design editorial layouts"],
    ["Advertising Design", "Concepts, copy, headlines", "Create a print ad campaign", "Craft persuasive ad concepts"],
    ["Infographics", "Data visualisation, icons", "Design an infographic", "Visualise information clearly"],
    ["Illustration Styles", "Line art, isometric, flat", "Illustrate in three different styles", "Work across illustration styles"],
    ["Mockups & Presentation", "Smart objects, scenes", "Present a brand on realistic mockups", "Present work convincingly"],
    ["Client Briefs & Process", "Briefing, revisions, feedback", "Respond to a mock client brief", "Manage a brief end-to-end"],
    ["Professional Capstone", "Full brand project", "Deliver a complete brand project", "Deliver a portfolio-ready brand"],
    ["Motion Graphics Basics", "After Effects, keyframes", "Animate a logo reveal", "Animate with keyframes"],
    ["Kinetic Typography", "Type animation, timing", "Create a twenty-second kinetic type piece", "Animate type with rhythm"],
    ["Social Video & Reels", "Templates, Premiere basics", "Edit three reels for a brand", "Produce social video content"],
    ["Photography for Designers", "Composition, lighting", "Shoot and edit a product set", "Create your own imagery"],
    ["Lightroom Workflow", "Presets, batch editing", "Grade a twenty-photo set", "Edit photo sets consistently"],
    ["Advanced Photoshop", "Matte painting, manipulation", "Create a surreal composite", "Create advanced composites"],
    ["Digital Painting", "Procreate, brushes", "Paint a character portrait", "Paint digitally with confidence"],
    ["Environmental Design", "Signage, wayfinding", "Design signage for an office", "Design for physical spaces"],
    ["Campaign Design", "360° campaigns", "Plan a product-launch campaign", "Design multi-channel campaigns"],
    ["Canva & Rapid Design", "Templates, brand kits", "Build a brand kit in Canva", "Produce fast on-brand content"],
    ["AI Tools for Designers", "Firefly, generative fill, ethics", "Create a campaign with AI assistance", "Use AI tools responsibly"],
    ["Advanced Capstone", "Multi-format project", "Deliver a campaign across print, social and motion", "Deliver an advanced campaign"],
    ["Specialisation: Branding Studio", "Strategy, naming", "Rebrand a local business", "Lead a brand strategy"],
    ["Specialisation: Packaging", "Structural design, print finishes", "Design a premium packaging range", "Design premium packaging"],
    ["Specialisation: Publication", "Books, annual reports", "Design an annual report", "Design long-form publications"],
    ["Specialisation: Motion", "Explainers, 2.5D", "Create a forty-five-second explainer", "Produce explainer animation"],
    ["Pre-press & Production", "Colour management, proofs", "Run a print production checklist", "Manage print production"],
    ["Freelancing & Pricing", "Contracts, quotes, clients", "Write a quote and contract", "Run a freelance practice"],
    ["Interview Preparation", "Portfolio reviews, tests", "Complete a timed design test", "Perform in design interviews"],
    ["Industry Project — Discovery", "Live client brief", "Research and concepts for a client", "Run discovery on a live brief"],
    ["Industry Project — Design", "Design and iterate", "Develop and refine the design", "Iterate with real feedback"],
    ["Industry Project — Delivery", "Finalise and deliver", "Final artwork and handoff", "Deliver to a real client"],
    ["Portfolio Polish", "Behance, presentation", "Publish a Behance portfolio", "Ship a hire-ready portfolio"],
    ["Graduation Showcase", "Exhibition", "Exhibit at the Branzone showcase", "Graduate industry-ready"],
  ];
  const PHASES = {
    "UI/UX": ["Foundations", "Professional Practice", "Advanced Product Design", "Specialisation & Career"],
    "Graphic Design": ["Foundations", "Brand & Print", "Motion & Imagery", "Specialisation & Career"],
  };

  A.curriculum = {
    build(track, weeks) {
      const bank = track === "UI/UX" ? UX : GD;
      return bank.slice(0, weeks).map((w, i) => ({
        id: U.uid("wk"), title: w[0], topics: w[1], assignment: w[2], goal: w[3],
        phase: PHASES[track][Math.floor(i / 12)],
        tasks: [`Attend studio sessions — ${w[1]}`, `In-class exercise on ${w[0].toLowerCase()}`, `Submit: ${w[2]}`],
      }));
    },
  };

  /* ---------- Deterministic random so the sample looks the same every reset ---------- */
  function rng(seed) { return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  A.seed = function () {
    const r = rng(20261016);
    const pick = (a) => a[Math.floor(r() * a.length)];
    const between = (a, b) => Math.floor(a + r() * (b - a + 1));
    const today = U.today();
    const L = A.schema.defaults.lists;
    const data = {}; A.schema.collections.forEach((c) => (data[c] = []));
    data.settings = { codeSeq: 100 };

    /* Courses */
    const courseDefs = [
      ["crs_ux3", "UI/UX Design — Foundation", "UI/UX", 3, "Foundation", 45000],
      ["crs_ux6", "UI/UX Design — Professional", "UI/UX", 6, "Professional", 85000],
      ["crs_ux12", "UI/UX Design — Master Program", "UI/UX", 12, "Master", 145000],
      ["crs_gd3", "Graphic Design — Foundation", "Graphic Design", 3, "Foundation", 35000],
      ["crs_gd6", "Graphic Design — Professional", "Graphic Design", 6, "Professional", 65000],
      ["crs_gd12", "Graphic Design — Master Program", "Graphic Design", 12, "Master", 120000],
    ];
    const desc = {
      "UI/UX": "Industry-led product design training — research, interaction, visual design and a portfolio that gets hired.",
      "Graphic Design": "Hands-on visual communication — branding, print, digital and motion with real client-style briefs.",
    };
    courseDefs.forEach(([id, name, track, months, level, fee]) => {
      const tools = track === "UI/UX" ? (months === 3 ? ["Figma", "FigJam", "Miro"] : months === 6 ? ["Figma", "FigJam", "Protopie", "Maze", "Miro"] : ["Figma", "FigJam", "Framer", "Protopie", "Maze", "Miro", "HTML/CSS"])
        : months === 3 ? ["Photoshop", "Illustrator", "CorelDRAW"] : months === 6 ? ["Photoshop", "Illustrator", "InDesign", "CorelDRAW", "Canva"] : ["Photoshop", "Illustrator", "InDesign", "CorelDRAW", "After Effects", "Premiere Pro", "Lightroom", "Procreate"];
      const goals = track === "UI/UX"
        ? ["Master the UX process end-to-end", "Design accessible, consistent interfaces", "Build " + (months === 3 ? "one" : months === 6 ? "three" : "five") + " portfolio case studies", ...(months >= 6 ? ["Run research and usability tests independently"] : []), ...(months === 12 ? ["Complete a live industry project", "Interview-ready for product design roles"] : [])]
        : ["Command the Adobe core toolkit", "Design print-ready and digital collateral", "Build a " + (months === 3 ? "six" : months === 6 ? "twelve" : "twenty") + "-piece portfolio", ...(months >= 6 ? ["Deliver complete brand identities"] : []), ...(months === 12 ? ["Produce motion graphics", "Freelance and studio-ready"] : [])];
      data.courses.push({ id, name, track, months, level, fee, hoursPerWeek: months === 12 ? 15 : 12, certificate: `${level} Certificate in ${track}`, description: desc[track], tools, goals, weeks: A.curriculum.build(track, months * 4), createdAt: Date.now() });
    });

    /* Batches */
    data.batches = [
      { id: "bat_m", name: "Morning", time: "09:30 – 12:30", days: "Mon – Sat", mentor: "Priya Raghavan" },
      { id: "bat_a", name: "Afternoon", time: "13:30 – 16:30", days: "Mon – Sat", mentor: "Karthik Selvam" },
      { id: "bat_e", name: "Evening", time: "18:00 – 20:30", days: "Mon – Fri", mentor: "Divya Menon" },
    ];

    /* Room & computers — the Creative Studio: 3 long tables, 5 computers on each side = 30 */
    data.rooms = [{ id: "room_a", name: "Creative Studio", type: "Design lab · 30 workstations", rows: 3, cols: 10, layout: "island" }];
    for (let row = 1; row <= 3; row++) for (let col = 1; col <= 10; col++) {
      const n = (row - 1) * 10 + col;
      const hi = row === 1;
      data.computers.push({
        id: "pc_" + n, roomId: "room_a", label: "WS-" + String(n).padStart(2, "0"), row, col,
        status: n === 18 ? "Maintenance" : "Active",
        cpu: hi ? "Intel Core i7-13700" : "Intel Core i5-12400", gpu: hi ? "NVIDIA RTX 4060 8GB" : "NVIDIA RTX 3050 6GB",
        ram: hi ? "32 GB DDR5" : "16 GB DDR4", storage: hi ? "1 TB NVMe SSD" : "512 GB NVMe SSD", os: "Windows 11 Pro",
        monitor: hi ? 'Dell UltraSharp 27" QHD' : 'Dell P2422H 24" FHD', assetTag: "BZ-IT-" + (100 + n), purchased: hi ? "2025-06-12" : "2023-07-01",
        mouse: n !== 23, keyboard: true, headset: n % 3 === 0, tablet: n % 4 === 0, notes: n === 18 ? "GPU fan noise — sent for service" : "",
      });
    }
    /* Inventory */
    data.inventory = [
      { id: "inv1", name: "Mouse (Logitech M331)", category: "Peripherals", qty: 34, faulty: 2, minSpare: 3, link: "mouse", vendor: "Logitech" },
      { id: "inv2", name: "Keyboard (Logitech K120)", category: "Peripherals", qty: 33, faulty: 1, minSpare: 2, link: "keyboard", vendor: "Logitech" },
      { id: "inv3", name: "Monitors", category: "Display", qty: 32, faulty: 1, minSpare: 1, link: "monitor", vendor: "Dell" },
      { id: "inv4", name: "Headphones (boAt Rockerz)", category: "Audio", qty: 12, faulty: 1, minSpare: 1, link: "headset", vendor: "boAt" },
      { id: "inv5", name: "Wacom One drawing tablet", category: "Creative hardware", qty: 10, faulty: 0, minSpare: 2, link: "tablet", vendor: "Wacom" },
      { id: "inv6", name: "Projector (Epson EB-X51)", category: "Display", qty: 1, faulty: 0, minSpare: 0, deployed: 1, vendor: "Epson" },
      { id: "inv7", name: "UPS 1kVA", category: "Power", qty: 12, faulty: 1, minSpare: 1, deployed: 10, vendor: "APC" },
      { id: "inv8", name: "Ergonomic chairs", category: "Furniture", qty: 34, faulty: 0, minSpare: 2, deployed: 31, vendor: "Featherlite" },
      { id: "inv9", name: "Wi-Fi access points", category: "Network", qty: 4, faulty: 0, minSpare: 0, deployed: 3, vendor: "TP-Link Omada" },
      { id: "inv10", name: "Graphics tablet pens (spare)", category: "Creative hardware", qty: 6, faulty: 0, minSpare: 3, deployed: 0, vendor: "Wacom" },
    ];

    /* Students */
    const people = [
      ["Aarthi", "Venkatesan", "Female"], ["Rahul", "Krishnan", "Male"], ["Sneha", "Ramesh", "Female"], ["Mohammed", "Irfan", "Male"],
      ["Keerthana", "Murali", "Female"], ["Vignesh", "Kumar", "Male"], ["Divya", "Shankar", "Female"], ["Arjun", "Prakash", "Male"],
      ["Nivetha", "Balaji", "Female"], ["Sanjay", "Raghunathan", "Male"], ["Harini", "Sundaram", "Female"], ["Pranav", "Iyer", "Male"],
      ["Fathima", "Begum", "Female"], ["Gokul", "Natarajan", "Male"], ["Lavanya", "Subramanian", "Female"], ["Ashwin", "Chandran", "Male"],
      ["Meera", "Nair", "Female"], ["Dinesh", "Babu", "Male"], ["Swetha", "Jayaraman", "Female"], ["Karthick", "Raja", "Male"],
      ["Janani", "Anand", "Female"], ["Surya", "Prasad", "Male"], ["Roshini", "Thomas", "Female"], ["Bharath", "Vasudevan", "Male"],
      ["Ananya", "Gopal", "Female"], ["Yuvaraj", "Mani", "Male"], ["Shruthi", "Elango", "Female"], ["Naveen", "Joseph", "Male"],
    ];
    const cities = ["Chennai", "Chennai", "Chennai", "Coimbatore", "Madurai", "Tiruchirappalli", "Salem", "Chennai", "Vellore"];
    const streets = ["Anna Nagar", "T. Nagar", "Velachery", "Adyar", "Tambaram", "Porur", "Mylapore", "Guindy", "Kodambakkam", "Perungudi"];
    const plan = [ // [courseId, monthsAgoStart, status]
      ["crs_ux6", 4.2, "Active"], ["crs_ux12", 7.5, "Active"], ["crs_gd6", 3.1, "Active"], ["crs_ux3", 1.6, "Active"],
      ["crs_gd12", 9.2, "Active"], ["crs_ux6", 2.4, "Active"], ["crs_gd3", 2.1, "Active"], ["crs_ux12", 5.3, "Active"],
      ["crs_ux6", 5.4, "Active"], ["crs_gd6", 4.6, "Active"], ["crs_ux3", 2.6, "Active"], ["crs_ux12", 10.4, "Active"],
      ["crs_gd6", 1.2, "Active"], ["crs_ux6", 0.9, "Active"], ["crs_gd12", 6.2, "Active"], ["crs_ux3", 0.6, "Active"],
      ["crs_ux6", 3.6, "Paused"], ["crs_gd3", 1.4, "Active"], ["crs_ux12", 2.2, "Active"], ["crs_gd6", 7.2, "Completed"],
      ["crs_ux3", 4.4, "Completed"], ["crs_ux6", 0.1, "Onboarding"], ["crs_gd6", 0.05, "Onboarding"], ["crs_ux12", 0.02, "Onboarding"],
      ["crs_gd3", 0.3, "Active"], ["crs_ux6", 1.9, "Active"], ["crs_gd12", 3.8, "Active"], ["crs_ux3", 2.9, "Dropped"],
    ];
    const batchIds = ["bat_m", "bat_a", "bat_e"];
    const seatsA = data.computers.filter((p) => p.roomId === "room_a" && p.status === "Active").map((p) => p.id);
    const seatsB = data.computers.filter((p) => p.roomId === "room_b").map((p) => p.id);
    const seatUse = {}; // batchId -> Set
    const takeSeat = (batch, ux) => {
      const pool = [...seatsA, ...seatsB].sort(() => r() - 0.5); // spread students around the studio
      seatUse[batch] = seatUse[batch] || new Set();
      const free = pool.find((id) => !seatUse[batch].has(id));
      if (free) seatUse[batch].add(free);
      return free || null;
    };
    const mentors = ["Priya Raghavan", "Karthik Selvam", "Divya Menon", "Studio Office"];

    people.forEach(([first, last, gender], i) => {
      const [courseId, ago, status] = plan[i];
      const c = data.courses.find((x) => x.id === courseId);
      const start = U.addDays(today, -Math.round(ago * 30.4));
      const batchId = batchIds[i % 3];
      const ux = c.track === "UI/UX";
      const id = "st_" + (i + 1);
      const dob = U.iso(new Date(1996 + between(0, 9), between(0, 11), between(1, 28)));
      const isOb = status === "Onboarding";
      const s = {
        id, code: `BZ-${String(2600 + i + 1)}`, firstName: first, lastName: last, gender, dob: isOb && i === 23 ? "" : dob,
        phone: `+91 ${pick(["98", "97", "94", "90", "88", "73", "63"])}${between(100, 999)} ${between(10000, 99999)}`,
        email: `${first.toLowerCase()}.${last.toLowerCase()}@${pick(["gmail.com", "gmail.com", "outlook.com", "yahoo.in"])}`,
        address: isOb && i === 22 ? "" : `${between(2, 140)}, ${pick(["2nd Street", "Main Road", "Cross Street", "4th Avenue"])}, ${pick(streets)}`,
        city: pick(cities), pincode: "600" + String(between(1, 120)).padStart(3, "0"),
        guardianName: `${pick(["R.", "S.", "K.", "M.", "V."])} ${last}`, guardianPhone: `+91 ${between(90000, 99999)} ${between(10000, 99999)}`,
        education: pick(["B.Sc", "B.Com", "BCA", "B.E / B.Tech", "BA", "Diploma", "MBA", "12th / HSC"]),
        occupation: pick(["Student", "Student", "Working professional", "Career switcher", "Freelancer"]),
        courseId, batchId: isOb && i === 23 ? null : batchId, startDate: start, status,
        source: pick(["Instagram", "Instagram", "Google search", "Referral", "Walk-in", "YouTube", "Website"]),
        goal: ux ? pick(["Product designer at a SaaS startup", "UX designer in a product company", "Freelance UI designer", "Move from development into UX"]) : pick(["Brand designer at an agency", "In-house graphic designer", "Freelance designer", "Start a design studio"]),
        notes: "", fee: null, discount: pick([0, 0, 0, 2500, 5000]), tools: {}, installments: [], computerId: null,
        createdAt: Date.now() - ago * 30 * 86400000,
      };
      if (!isOb || i === 21) s.computerId = status === "Active" || status === "Paused" || isOb ? takeSeat(batchId, ux) : null;
      const net = c.fee - s.discount;
      const nInst = c.months === 3 ? pick([1, 2]) : c.months === 6 ? pick([2, 3]) : pick([3, 4, 6]);
      const base = Math.floor(net / nInst / 500) * 500;
      for (let k = 0; k < nInst; k++) s.installments.push({ due: U.addMonths(start, Math.round((k * c.months) / nInst)), amount: k === nInst - 1 ? net - base * (nInst - 1) : base });
      c.tools.forEach((t) => (s.tools[t] = 0));
      data.students.push(s);

      /* Payments */
      let receipt = 5000 + i * 7;
      const behave = status === "Completed" ? "full" : status === "Dropped" ? "partial" : isOb ? (i === 21 ? "first" : "none") : pick(["ontime", "ontime", "ontime", "late", "late"]);
      s.installments.forEach((ins, k) => {
        if (behave === "none") return;
        if (behave === "first" && k > 0) return;
        if (behave === "partial" && k > 0) return;
        if (ins.due > today && behave !== "full") return;
        if (behave === "late" && k === s.installments.filter((x) => x.due <= today).length - 1 && k > 0) return;
        const d = ins.due > today ? U.addDays(today, -between(1, 10)) : U.addDays(ins.due, between(-3, 5));
        data.payments.push({ id: `pay_${id}_${k}`, studentId: id, amount: ins.amount, date: d > today ? today : d, method: pick(["UPI", "UPI", "UPI", "Bank transfer", "Cash", "Card"]), ref: "TXN" + between(100000, 999999), receipt: "RC-" + receipt++, note: k === 0 ? "Admission + first installment" : "" , createdAt: Date.now() });
      });

      /* Progress: submissions, tools */
      const weeksTotal = c.weeks.length;
      const daysIn = U.daysBetween(start, today);
      const curWeek = status === "Completed" ? weeksTotal : Math.min(weeksTotal, Math.max(0, Math.floor(daysIn / 7) + 1));
      const diligence = status === "Dropped" ? 0.4 : status === "Paused" ? 0.6 : 0.7 + r() * 0.3;
      const doneWeeks = status === "Completed" ? weeksTotal : Math.max(0, Math.floor((curWeek - 1) * diligence));
      for (let w = 0; w < Math.min(weeksTotal, doneWeeks + (status === "Active" ? 1 : 0)); w++) {
        const wk = c.weeks[w];
        const last = w >= doneWeeks;
        const st = last ? pick(["Submitted", "Submitted", "Needs revision"]) : "Approved";
        data.submissions.push({
          id: `sub_${id}_${w}`, studentId: id, courseId, weekId: wk.id, title: wk.assignment, status: st,
          grade: st === "Approved" ? pick(["A+", "A", "A", "B+", "B"]) : "", submittedAt: U.addDays(start, w * 7 + between(4, 8)) > today ? today : U.addDays(start, w * 7 + between(4, 8)),
          link: ux ? "https://www.figma.com/file/" + Math.random().toString(36).slice(2, 12) : "https://www.behance.net/gallery/" + between(100000, 999999),
          feedback: st === "Approved" ? pick(["Clean execution, good hierarchy.", "Strong concept — tighten the spacing.", "Great research depth.", "Well presented, keep it up."]) : st === "Needs revision" ? "Revisit the grid and contrast before resubmitting." : "",
          createdAt: Date.now(),
        });
      }
      const ratio = weeksTotal ? doneWeeks / weeksTotal : 0;
      c.tools.forEach((t, k) => (s.tools[t] = U.clamp(Math.round(ratio * 5 * (k < 2 ? 1.2 : 0.8) + (r() - 0.3)), 0, 5)));

      /* Projects */
      const projNames = ux ? ["Food delivery app redesign", "Banking dashboard", "Travel booking case study", "Ed-tech onboarding", "Healthcare appointment app", "SaaS analytics", "Portfolio website"] : ["Café brand identity", "Tea packaging range", "Music festival poster series", "Magazine editorial spread", "Social media campaign", "Real-estate brochure", "Logo reveal animation"];
      const nProj = Math.min(projNames.length, Math.floor(ratio * 6) + (status === "Onboarding" ? 0 : 1));
      for (let k = 0; k < nProj; k++) data.projects.push({ id: `prj_${id}_${k}`, studentId: id, title: projNames[k], type: ux ? pick(["Case study", "App design", "Website"]) : pick(["Branding", "Poster", "Packaging", "Social media", "Motion"]), tools: c.tools.slice(0, 2).join(", "), status: k < nProj - 1 || status === "Completed" ? "Completed" : "In progress", date: U.addDays(start, Math.round((k + 1) * (daysIn / (nProj + 1)))), link: "", notes: "" });

      /* Remarks & feedback */
      if (!isOb) {
        const goodR = ["Shows excellent attention to detail in layouts.", "Consistently participates in critiques — great energy.", "Portfolio is shaping up nicely; recommend for internship pool.", "Strong grasp of tools, quick learner."];
        const neutR = ["Needs to manage time better on weekly assignments.", "Discussed career goals — interested in product roles.", "Shifted batch timing on request."];
        const badR = ["Missed two consecutive sessions without notice.", "Assignments are delayed — follow up with guardian."];
        const nR = between(1, 3);
        for (let k = 0; k < nR; k++) {
          const tone = status === "Dropped" || status === "Paused" ? "concern" : pick(["positive", "positive", "neutral", "concern"]);
          data.remarks.push({ id: `rmk_${id}_${k}`, studentId: id, tone, tag: pick(L.remarkTags), text: pick(tone === "positive" ? goodR : tone === "neutral" ? neutR : badR), author: pick(mentors), date: U.addDays(today, -between(2, Math.max(3, daysIn))) });
        }
        const nF = ratio > 0.15 ? between(1, 2) : 0;
        const fbText = ["Mentors explain concepts patiently, loving the hands-on sessions.", "Would like more live project exposure.", "Lab systems are fast and comfortable.", "Pace is slightly fast in software sessions.", "Very happy with the portfolio guidance."];
        for (let k = 0; k < nF; k++) data.feedback.push({ id: `fb_${id}_${k}`, studentId: id, rating: pick([4, 5, 5, 4, 3]), category: pick(L.feedbackCategories), text: pick(fbText), date: U.addDays(today, -between(3, Math.max(4, daysIn))) });
      }

      /* Documents (metadata only for the sample) */
      const docTypes = isOb ? (i === 21 ? ["Photo", "ID Proof (Aadhaar)", "Education Certificate", "Admission Form"] : i === 22 ? ["Photo"] : []) : ["Photo", "ID Proof (Aadhaar)", "Education Certificate", "Admission Form"];
      docTypes.forEach((t, k) => data.documents.push({ id: `doc_${id}_${k}`, studentId: id, type: t, name: `${first}_${t.split(" ")[0]}.${t === "Photo" ? "jpg" : "pdf"}`, size: between(80, 1900) * 1024, mime: t === "Photo" ? "image/jpeg" : "application/pdf", uploadedAt: start, verified: !isOb, hasFile: false }));

      /* Attendance for last ~60 days */
      if (status === "Active" || status === "Paused" || status === "Completed" || status === "Dropped") {
        const until = status === "Completed" ? U.addDays(today, -40) : status === "Dropped" ? U.addDays(today, -25) : status === "Paused" ? U.addDays(today, -12) : today;
        const rel = status === "Dropped" ? 0.55 : i % 7 === 3 ? 0.68 : 0.82 + r() * 0.16;
        for (let d = 60; d >= 0; d--) {
          const date = U.addDays(today, -d);
          if (date < start || date > until || U.isSunday(date)) continue;
          if (batchId === "bat_e" && U.parse(date).getDay() === 6) continue;
          if (date === today && r() < 0.35) continue; // today partially marked
          const x = r();
          const st = x < rel ? "P" : x < rel + 0.05 ? "L" : x < rel + 0.08 ? "E" : "A";
          data.attendance.push({ id: `${date}_${id}`, date, studentId: id, status: st });
        }
      }
      data.activity.push({ id: "act_s" + i, text: `Enrolled in ${c.name}`, studentId: id, type: "students", at: Date.now() - ago * 30 * 86400000 });
    });

    /* A few recent activity entries */
    const recent = [
      ["Payment recorded — " + U.money(28000), "st_3", "payments", 2], ["Week 9 assignment approved", "st_1", "submissions", 5],
      ["Assigned to WS-07", "st_14", "computers", 26], ["Started onboarding", "st_22", "students", 50], ["Document uploaded — Photo", "st_23", "documents", 80],
      ["Remark added: Portfolio is shaping up nicely", "st_8", "remarks", 140], ["Attendance marked for Morning batch", null, "attendance", 190],
    ];
    recent.forEach(([text, sid, type, mins], k) => data.activity.push({ id: "act_r" + k, text, studentId: sid, type, at: Date.now() - mins * 60000 }));
    data.activity.sort((a, b) => b.at - a.at);
    return data;
  };
})(window.App);
