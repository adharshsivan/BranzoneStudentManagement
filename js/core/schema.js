/* ==========================================================================
   Schema — the single place that describes data.
   - collections: every table the store keeps
   - relations:   how tables link (drives cascade / restrict / nullify on delete)
   - fields:      form + export definitions per entity (add a field here and
                  it appears in forms, profile details and spreadsheets)
   - defaults:    editable option lists (Settings → Lists)
   ========================================================================== */
(function (A) {
  const S = () => A.store;

  A.schema = {};

  A.schema.collections = [
    "courses", "batches", "students", "payments", "attendance", "documents",
    "submissions", "projects", "remarks", "feedback", "activity",
    "rooms", "computers", "inventory", "users", "roles",
  ];

  A.schema.relations = [
    { col: "payments", key: "studentId", ref: "students", onDelete: "cascade" },
    { col: "attendance", key: "studentId", ref: "students", onDelete: "cascade" },
    { col: "documents", key: "studentId", ref: "students", onDelete: "cascade" },
    { col: "submissions", key: "studentId", ref: "students", onDelete: "cascade" },
    { col: "projects", key: "studentId", ref: "students", onDelete: "cascade" },
    { col: "remarks", key: "studentId", ref: "students", onDelete: "cascade" },
    { col: "feedback", key: "studentId", ref: "students", onDelete: "cascade" },
    { col: "activity", key: "studentId", ref: "students", onDelete: "nullify" },
    { col: "students", key: "courseId", ref: "courses", onDelete: "restrict", label: "students enrolled" },
    { col: "students", key: "batchId", ref: "batches", onDelete: "nullify" },
    { col: "students", key: "computerId", ref: "computers", onDelete: "nullify" },
    { col: "computers", key: "roomId", ref: "rooms", onDelete: "cascade" },
  ];

  A.schema.defaults = {
    orgName: "Branzone Creative",
    orgTagline: "Design School",
    adminName: "Studio Office",
    codePrefix: "BZ",
    codeSeq: 100,
    attendanceThreshold: 0.75,
    disabledModules: [],
    requiredDocs: ["Photo", "ID Proof (Aadhaar)", "Education Certificate"],
    lists: {
      statuses: ["Onboarding", "Active", "Paused", "Completed", "Dropped"],
      genders: ["Female", "Male", "Other", "Prefer not to say"],
      education: ["12th / HSC", "Diploma", "B.Sc", "B.Com", "BA", "BCA", "B.E / B.Tech", "B.Des", "M.Sc", "MBA", "MCA", "Other"],
      occupations: ["Student", "Working professional", "Career switcher", "Freelancer", "Business owner", "Other"],
      sources: ["Instagram", "Google search", "Website", "Referral", "Walk-in", "YouTube", "Workshop", "Legacy import", "Other"],
      documentTypes: ["Photo", "ID Proof (Aadhaar)", "Education Certificate", "Address Proof", "Admission Form", "Fee Receipt", "Agreement", "Other"],
      paymentMethods: ["UPI", "Cash", "Card", "Bank transfer", "Cheque", "EMI"],
      remarkTags: ["Progress", "Behaviour", "Attendance", "Portfolio", "Placement", "General"],
      feedbackCategories: ["Course content", "Mentor", "Facilities", "Pace", "Overall"],
      projectTypes: ["Case study", "App design", "Website", "Branding", "Poster", "Packaging", "Illustration", "Motion", "Social media", "Other"],
      grades: ["A+", "A", "B+", "B", "C", "Resubmit"],
      inventoryCategories: ["Peripherals", "Display", "Audio", "Creative hardware", "Power", "Furniture", "Network", "Other"],
      tools_UIUX: ["Figma", "FigJam", "Framer", "Adobe XD", "Protopie", "Miro", "Maze", "Notion", "Webflow", "HTML/CSS"],
      tools_Graphic: ["Photoshop", "Illustrator", "InDesign", "CorelDRAW", "After Effects", "Premiere Pro", "Lightroom", "Canva", "Procreate", "Blender"],
    },
  };

  /* Helpers to build option lists lazily (so they always reflect current data) */
  const list = (name) => () => (S().settings().lists[name] || []);
  const courses = () => S().all("courses").map((c) => ({ value: c.id, label: c.name }));
  const batches = () => S().all("batches").map((b) => ({ value: b.id, label: `${b.name} · ${b.time}` }));
  A.schema.opts = { list, courses, batches };

  A.schema.fields = {
    students: [
      { key: "firstName", label: "First name", required: true, section: "Personal" },
      { key: "lastName", label: "Last name", section: "Personal" },
      { key: "gender", label: "Gender", type: "select", options: list("genders"), section: "Personal" },
      { key: "dob", label: "Date of birth", type: "date", section: "Personal" },
      { key: "education", label: "Highest education", type: "select", options: list("education"), section: "Personal" },
      { key: "occupation", label: "Current occupation", type: "select", options: list("occupations"), section: "Personal" },
      { key: "phone", label: "Mobile", type: "tel", required: true, section: "Contact", placeholder: "+91 98xxx xxxxx" },
      { key: "email", label: "Email", type: "email", section: "Contact" },
      { key: "address", label: "Address", type: "textarea", span: 2, section: "Contact", rows: 2 },
      { key: "city", label: "City", section: "Contact" },
      { key: "pincode", label: "PIN code", section: "Contact" },
      { key: "guardianName", label: "Parent / guardian", section: "Contact" },
      { key: "guardianPhone", label: "Guardian mobile", type: "tel", section: "Contact" },
      { key: "courseId", label: "Course", type: "select", options: courses, required: true, section: "Enrolment" },
      { key: "batchId", label: "Batch", type: "select", options: batches, section: "Enrolment" },
      { key: "startDate", label: "Start date", type: "date", required: true, section: "Enrolment" },
      { key: "status", label: "Status", type: "select", options: list("statuses"), section: "Enrolment", placeholder: false },
      { key: "source", label: "How they found us", type: "select", options: list("sources"), section: "Enrolment" },
      { key: "goal", label: "Career goal", section: "Enrolment", placeholder: "e.g. Product designer at a startup" },
      { key: "notes", label: "Internal notes", type: "textarea", span: 2, section: "Enrolment", rows: 2 },
    ],
    courses: [
      { key: "name", label: "Course name", required: true, span: 2 },
      { key: "track", label: "Track", type: "select", options: () => ["UI/UX", "Graphic Design"], required: true, placeholder: false },
      { key: "months", label: "Duration (months)", type: "select", options: () => [{ value: 3, label: "3 months" }, { value: 6, label: "6 months" }, { value: 12, label: "12 months" }], required: true, placeholder: false, number: true },
      { key: "level", label: "Level label", placeholder: "Foundation / Professional / Master" },
      { key: "fee", label: "Course fee (₹)", type: "number", required: true },
      { key: "hoursPerWeek", label: "Hours per week", type: "number" },
      { key: "certificate", label: "Certificate awarded" },
      { key: "description", label: "Description", type: "textarea", span: 2 },
    ],
    week: [
      { key: "title", label: "Week title", required: true, span: 2 },
      { key: "phase", label: "Phase / module" },
      { key: "topics", label: "Topics covered" },
      { key: "assignment", label: "Weekly assignment", type: "textarea", span: 2, rows: 2 },
      { key: "tasksText", label: "Tasks (one per line)", type: "textarea", span: 2, rows: 4 },
      { key: "goal", label: "Learning goal", span: 2 },
    ],
    computers: [
      { key: "label", label: "Workstation label", required: true },
      { key: "status", label: "Status", type: "select", options: () => ["Active", "Maintenance", "Retired"], placeholder: false },
      { key: "row", label: "Row", type: "number", required: true },
      { key: "col", label: "Column", type: "number", required: true },
      { key: "cpu", label: "Processor", section: "Specification" },
      { key: "gpu", label: "Graphics" },
      { key: "ram", label: "Memory" },
      { key: "storage", label: "Storage" },
      { key: "os", label: "Operating system" },
      { key: "monitor", label: "Monitor" },
      { key: "assetTag", label: "Asset tag", section: "Asset" },
      { key: "purchased", label: "Purchased on", type: "date" },
      { key: "mouse", label: "Mouse attached", type: "toggle", section: "Peripherals" },
      { key: "keyboard", label: "Keyboard attached", type: "toggle" },
      { key: "headset", label: "Headset attached", type: "toggle" },
      { key: "tablet", label: "Drawing tablet attached", type: "toggle" },
      { key: "notes", label: "Notes", type: "textarea", span: 2, rows: 2 },
    ],
    inventory: [
      { key: "name", label: "Item", required: true },
      { key: "category", label: "Category", type: "select", options: list("inventoryCategories") },
      { key: "qty", label: "Total quantity", type: "number", required: true },
      { key: "faulty", label: "Faulty / under repair", type: "number" },
      { key: "minSpare", label: "Minimum spares", type: "number", hint: "Flags low stock below this" },
      { key: "link", label: "Auto-count from workstations", type: "select", options: () => [{ value: "mouse", label: "Mouse attached" }, { value: "keyboard", label: "Keyboard attached" }, { value: "headset", label: "Headset attached" }, { value: "tablet", label: "Drawing tablet attached" }, { value: "monitor", label: "Every workstation" }], hint: "Deployed count follows the classroom" },
      { key: "deployed", label: "Deployed (manual)", type: "number", hint: "Used only when not auto-counted" },
      { key: "vendor", label: "Vendor" },
      { key: "notes", label: "Notes", type: "textarea", span: 2, rows: 2 },
    ],
    batches: [
      { key: "name", label: "Batch name", required: true },
      { key: "time", label: "Timing", required: true, placeholder: "09:30 – 12:30" },
      { key: "days", label: "Days", placeholder: "Mon – Sat" },
      { key: "mentor", label: "Mentor" },
    ],
    rooms: [
      { key: "name", label: "Room name", required: true },
      { key: "type", label: "Type", placeholder: "Windows lab / Mac lab" },
      { key: "layout", label: "Seating layout", type: "select", placeholder: false, span: 2, options: () => [{ value: "island", label: "Two-sided tables — seats face each other across a divider" }, { value: "rows", label: "Single-sided rows — everyone faces the front" }] },
      { key: "rows", label: "Tables / rows", type: "number", required: true },
      { key: "cols", label: "Computers per table / row", type: "number", required: true, hint: "Two-sided tables split these half on each side" },
      { key: "aisleAfter", label: "Aisle after computer # (rows only)", type: "number", hint: "Blank = middle, 0 = no aisle" },
    ],
  };
})(window.App);
