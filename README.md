# Branzone Studio Office

Student management portal for **Branzone Creative**, built for the office team (staff use only, not for students). It covers UI/UX and Graphic Design programmes of 3, 6 and 12 months.

## Run it

You don't need to install anything. Either:

- **Double-click `index.html`.** It opens in Chrome or Edge.
- **Or run the local server.** Then open http://localhost:5173:

```bash
powershell -ExecutionPolicy Bypass -File serve.ps1
```

You need internet the first time a feature loads its library: fonts, Excel export, 3D, PDF reading or OCR. Everything else runs offline.

## Signing in & access

The team is **Suman (Founder)**, **Gokul (CEO)**, **Sanjana (HR)** and **Adharsh (Project Manager)**. On first launch, Suman or Gokul sets a password. They then give everyone else a password and manage access under **Settings → Team & access**:

- **Who can sign in:** add members, set or reset their passwords, and switch accounts on or off.
- **Who can access:** each role chooses which areas it can *see*, *edit* and *delete* in. Hidden areas disappear from the menu and search.
- **Who can download:** the "Download & export" permission covers every spreadsheet, backup and profile export.
- **Legacy import** and **Team & access** are separate permissions.

The roles are Founder (full access, locked), CEO, Admin, Project Manager, HR and Mentor. You can edit them or add your own.

**Test account:** the sign-in screen has an "Open the test account" link. It opens a separate workspace full of sample students, fees and attendance, with no password needed. It never touches the real studio data. Use **Exit** in the top bar to leave it. Permissions are checked centrally, on every save and every download, in `js/core/auth.js`.

Note that this is browser-side protection: it keeps staff within their roles on the office PCs. Once you move to a shared online database, the same roles should also be enforced on that server.

## Modules

| Area | What it does |
|---|---|
| Dashboard | Shows KPIs, a 14-day attendance trend, enrolment by programme, students who need attention, fee watch and live activity |
| Students | Directory with search and filters. Attendance %, progress and fee status come live from their modules |
| Onboarding | Five-step admission wizard (personal → enrolment → fees → documents → review). A pipeline checklist ticks itself as documents, payments, batch and seat are added |
| Student profile | Tabs for Overview, Progress & goals, Projects & submissions, Attendance heat-map, Fees, Documents, Tool knowledge, Remarks & feedback, Activity |
| Attendance | One-click P/A/L/E daily marking per batch, plus a monthly register you can edit and download |
| Fees | Installment plans, payments with receipts, a ledger, and overdue and upcoming dues |
| Courses | Programme catalogue and a week-by-week curriculum. Each week has topics, an assignment, tasks and a goal |
| Reviews | Queue of weekly submissions. Approving one marks that week's goal as achieved and moves the student's progress |
| Classroom | Realistic 3D model of the Creative Studio (`js/modules/classroom3d.js`), plus a seat plan. It has 3 long two-sided tables with orange dividers: 5 PCs on each side, 30 in total, with a planter at the end of each table. Seats are assigned per batch (Morning, Afternoon, Evening), and each workstation has its specs and peripherals |
| Inventory | Hardware stock. Mouse, keyboard, monitor, headset and tablet counts follow the classroom automatically |
| Reports & Export | Download any dataset, or the complete workbook, as `.xlsx` or CSV |
| Legacy Import | Import old Excel/CSV files through column mapping. PDF, Word, images and scanned PDFs are read with OCR, fields are extracted, and you review them before saving |
| Settings | Organisation details, batches, every dropdown list, required onboarding documents, module on/off, backup/restore and reset |

## How everything stays connected

- `js/core/store.js` holds **one store**. Every write re-renders the current screen, so a change in one module shows up everywhere straight away.
- `js/core/selectors.js` computes fee status, attendance %, course progress, seats and onboarding checklists **in one place**. Every screen reads from it, so they always agree.
- `js/core/schema.js` defines how tables relate. For example, deleting a student cascades to their payments and attendance; deleting a computer releases its seats; a course with enrolled students cannot be deleted.

## Extending it

- **Add a field.** Add one line to `A.schema.fields.students` (or another entity). It appears in the forms automatically.
- **Add a dropdown option.** Use Settings → Lists. No code needed.
- **Add a module.** Create `js/modules/my-module.js` with:

  ```js
  App.register({ id: "alumni", label: "Alumni", icon: "award", group: "people", order: 25, route: "alumni",
    render(el) { el.innerHTML = `<div class="page">…</div>`; } });
  ```

  Then add a `<script>` line in `index.html`. The module shows up in the sidebar, the router and the Ctrl K palette.
- **Add a spreadsheet.** Call `App.datasets.register({ id, label, desc, icon, sheets() })` in `js/core/exporter.js`.
- **Change the look.** Edit the colour, type and radius tokens in `:root` at the top of `css/app.css`. The brand is black + Branzone orange (`--accent`) with one sans-serif family (Plus Jakarta Sans). The logo is `assets/branzone-logo.png`.

## Data & backups

All data is stored **in this browser**: records in localStorage, uploaded files in IndexedDB. Every computer and browser keeps its own copy. Download a backup from **Settings → Data & backup** every week and before clearing browser data. If several office PCs need the same live data, the next step is a small backend (for example Supabase or Firebase) behind `store.js`. The rest of the app doesn't need to change.
