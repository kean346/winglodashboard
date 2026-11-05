# Winglo Cleaning Services — interactive demo

A browser-local cleaning business demo customised from the existing Studio Admin / NOREVA dashboard. The original layout, UI primitives, calendar styling, typography, theme switcher and motion system are retained. No backend or messaging provider is connected.

## Inbox → Jobs handoff

**Enquiries / Inbox** is the incoming-request queue. Its default **Needs attention** view shows unquoted, open requests; **All enquiries** keeps handled and closed conversations accessible. The demo explicitly simulates WhatsApp and sends its collected request to this Inbox. It does not receive or send actual WhatsApp messages.

Choose **Review Enquiry** to complete missing details. **Prepare Quote** saves one linked draft using the existing quotation mutation and opens the connected workspace. Repeated handoff reuses the saved draft. The request leaves the attention queue and appears in **Jobs**, where review/send, customer acceptance, scheduling and completion continue. Customer details and collected conversation answers stay linked; nothing is manually copied or deleted.

Jobs lists bookings and quotations without bookings. Requests without quotations remain in the Inbox. The Jobs header links back to the Inbox; redundant simulator and demo-start buttons have been removed from these screens. The optional Help walkthrough includes separate Inbox and Jobs steps and explains the live handoff. Existing saved tour positions migrate to the expanded tour; business/demo progress stays independent.

Rollback before this change: `backup/pre-inbox-handoff-2026-11-05` at `9d47e4dd308eb8d1f5cc52a94e6008a5027707e8`.

## Premium cards and Jobs

The dashboard now uses a royal-blue brand accent in light/dark mode. Neutral grey selections with checkmarks distinguish answers from actions; count fields provide labelled − / + controls, direct numeric entry, a zero lower bound and integer steps. Measurements retain decimal input. Existing motion stays enabled, while the new card hover transitions respect reduced-motion preferences.

**Jobs** at `/dashboard/jobs` lists saved customer work using the existing record resolver: bookings and quotations without bookings; unquoted requests stay in the Inbox. Linked parents are not repeated as separate jobs. Multiple jobs for one customer and additional legacy quote/booking branches remain individually accessible. Search and stage/status filters open the existing connected job workspace; no second job dataset is created.

Enquiries, Quotations and Customers default to compact cards with a desktop **Table view** option. Profile, repeat booking, PDF, search, filters and demo-record highlighting remain available. The management calendar and business mutations are unchanged.

Rollback before this update: [`backup/pre-premium-jobs-2026-11-05`](https://github.com/kean346/winglodashboard/tree/backup/pre-premium-jobs-2026-11-05), commit `dff5bc5319e104a6bd8df277066456d5125b24c5`. Code backup does not replace browser-local records.

`tests/browser/winglo-premium.cjs` covers Jobs grouping/filter/search, switching jobs for the same customer, directory cards/table access, selected choices, count controls and bounds, decimal measurements, persistence, mobile and dark mode. Review screenshots use `artifacts/winglo-premium-*`.

## Visual workflow upgrade and rollback point

The original pre-upgrade version is preserved at commit `538bcab191ddf22e9faa16365c4b872f441abcc0` on GitHub branch [`backup/pre-visual-upgrade-2026-11-04`](https://github.com/kean346/winglodashboard/tree/backup/pre-visual-upgrade-2026-11-04). This is a code rollback point; browser-local records are stored separately. Returning to this version does not require deleting records or changing database services.

Booking screens now show the actual Pending → Confirmed → In Progress → Completed sequence. **Confirm Booking**, **Start Cleaning**, and **Complete Job** use the existing booking mutation, including its accepted-quotation checks. Cancelled/completed records have no forward quick action. Administrative status controls remain available in the existing editor.

Routine confirmation/start actions offer a short Undo window. Undo refuses to overwrite later booking changes and preserves the demo scheduling rules. Completion requires a confirmation showing the saved job value because it affects demo revenue. Status corrections and staff assignments produce activity only when the actual record changes; seeded bookings do not acquire fabricated historical timestamps.

Overview retains its original KPI and chart sections while adding a compact next-actions panel and a live booking-status breakdown. Booking details combine saved customer, service, date/time, cleaner, amount, a responsive workflow stepper and recorded activity. Existing calendar views are retained with a status legend, pending-state styling and cleaner/duration tooltips. Shared primitives, fonts, themes and navigation remain unchanged.

The demo now starts in light mode; choosing dark mode remains saved. Full animation is permanently enabled, including when a device or older saved preference requested reduced motion; there is no animation control. At phone widths the management tables adapt to enquiry, quotation, booking and customer cards with visible actions. Desktop tables remain available at larger widths.

## Connected customer jobs

The pre-change rollback point is `1eb0c73d226a2e2f409dc57714f2ffbd628a0cbb` on [`backup/pre-connected-jobs-2026-11-05`](https://github.com/kean346/winglodashboard/tree/backup/pre-connected-jobs-2026-11-05). Browser-local data is separate from this code backup.

Each existing enquiry, quotation or booking opens the same linked workspace at `/dashboard/jobs/[id]`. A compact **Request → Quote → Booking → Complete** tracker derives from saved records. Customer, service and location remain visible; one primary action explains the next valid step. Editors stay inline, with secondary Edit, PDF, administrative corrections, cancellation and customer history under **More options**.

The owner prepares and reviews the quote, then **Review & Send Quote** saves its simulated sent status. The separately labelled **Demo controls** area offers **Simulate Customer Acceptance**. Acceptance unlocks scheduling and **Confirm Booking**, followed by **Start Cleaning** and confirmed **Complete Job**. No real message is delivered. Existing pricing, completion confirmation, Undo and revenue rules remain in use. Overlapping cleaner assignments are allowed throughout this browser-local demo.

Customer questions use the existing persistent conversation draft. Submission opens the Inbox. Prepare Quote carries the saved request into Jobs automatically, without switching roles or copying records. **View conversation** shows the saved answers for that specific request. The job view replaces the persistent floating workflow guide; optional product discovery remains under Help.

## Develop

Use Node 24 (validated with 24.19.0) and npm:

```sh
npm ci
npm run dev
```

The application root redirects to `/dashboard/default`. The sidebar retains Overview, Enquiries, Quotations, Bookings, Customers and Settings, adds Jobs at `/dashboard/jobs`, and includes Interactive Demo at `/dashboard/demo`. `/enquire` is a separate customer-facing demo form.

Overview offers **Try a Sample Job**, which starts or resumes the existing conversation, and **Explore Dashboard**, which opens the management sections without starting a sample. The sidebar also retains Interactive Demo. Once submitted, **Resume Customer Job** returns to the same saved records.

**Start Another Sample Job** creates an isolated scenario without deleting records. Repeated submission within a scenario reuses its enquiry. **Reset Demo Data** remains a separate destructive action with confirmation.

## Demo behaviour

- A Zustand store persists linked customers, enquiries, quotes, bookings, settings, activity and journey state under `winglo-demo-v1` in localStorage, using schema version 1. Existing version-0 business data is migrated without replacement. A hydration gate avoids server/client mismatches. Storage failures display a warning. Settings includes a confirmed reset action.
- Five central service-specific question sets power both the simulator and customer form. Customers are matched by normalised contact number or email where possible. Photo attachments are previews only (three images up to 5 MB each); they are never uploaded or retained.
- Central sample pricing: base + size adjustment + extras package + travel − discount, floored at zero, then configurable VAT. VAT starts at 0%; no Winglo VAT registration or real price approval is assumed. Settings affect new estimates; saved quotes retain their reviewed values.
- Quote status, owner approval, send and customer acceptance are simulations. Accepted quotes convert once into linked bookings. Print / PDF opens a printable quotation; choose **Save as PDF** in the browser print dialog. No PDF service or additional dependency is used.
- Bookings support month/week calendar views, editing, rescheduling, cleaner assignment, duration, job value and status. Overlapping assignments are allowed in this demo; cleaner availability does not block bookings. Completed jobs update customer history and the revenue chart/KPI.
- Dates are relative to initial demo creation/reset. Times use the browser's local timezone. All seed identities and contacts are fictional. Revenue means the value of completed demo jobs, not verified payments or accounting revenue.
- All six editable automation templates support `{name}`, `{service}` and `{date}`. Previews and simulations send nothing. There are no application calls to WhatsApp, email, SMS or paid services.
- Customer submissions from another browser/device do **not** reach an owner elsewhere. This is local storage, not shared business infrastructure.

## Architecture

Feature code lives in `src/app/(main)/dashboard/_components/winglo/`. `model.ts` owns domain types, seed data, question sets, pricing and overlap calculations. `store.ts` is the single persistence/mutation boundary. `journey.ts` owns conversation validation, eight stage gates, safe sample responses and activity derivation. `job-model.ts` resolves existing linked record IDs without adding a job dataset. `job-workspace.tsx` derives the next action from those saved records. The shared layout mounts only the optional product tour; editor visibility and unsaved forms remain page-local. Forms, editors, overview, booking calendar and settings compose the existing shared primitives. Route pages remain small server components.

This demonstration intentionally remains browser-local. No database, authentication, credentials, messaging provider or paid integration is required. Sharing records between devices or delivering real messages is outside this demo’s scope.

Overview counts **Total Enquiries** regardless of workflow status. New estimates default to Awaiting Approval; sent and accepted changes preserve a Converted enquiry. **Completed-job Revenue This Month** counts only completed bookings by appointment month. Confirmed bookings contribute no completed revenue. The separate completed-job count includes all dates. All values derive from the same records.

**Demo Activity** records actual enquiry creation, quotation generation/send/acceptance, booking creation/confirmation/completion and reminder previews. Initial seed records do not create fabricated activity events.

## Validation

```sh
npm test
npx tsc --noEmit
npm run build
npm run lint
npm run check
```

Run Next.js once before a standalone type check on a fresh checkout so its image and route declarations are generated. Browser tests use an available Playwright installation and Chromium, without adding application dependencies:

```sh
BASE_URL=http://127.0.0.1:3000 PLAYWRIGHT_MODULE=/path/to/playwright node tests/browser/winglo-workflow.cjs
BASE_URL=http://127.0.0.1:3000 PLAYWRIGHT_MODULE=/path/to/playwright node tests/browser/winglo-actions.cjs
```

The visual workflow suite (`tests/browser/winglo-visual-workflow.cjs`, run with the same Playwright variables) covers single-action confirmation, double-click protection, Undo/stale-Undo safety, starting work, completion confirmation/cancellation, persisted status/revenue/history, overlapping demo appointments, filtering, mobile stepper width and theme screenshots. Visual review images use the `artifacts/winglo-visual-*` prefix.

The connected workflow tests (`winglo-workflow.cjs` on desktop, `winglo-mobile-guided.cjs` on phones) cover request submission, review/send, simulated acceptance, scheduling, completion, exact linked IDs, duplicate submissions, refresh persistence, return from all three directories, customer history, revenue, PDF, corrections and rescheduling. Screenshots are `artifacts/winglo-connected-desktop.png` and `artifacts/winglo-connected-mobile.png`. The actions suite retains settings, pricing, overlapping demo booking and enquiry-status checks; the mobile suite checks routes, default light/saved dark and always-on motion. The product-tour and combined-guide suites verify independent tour navigation and business-data preservation.

The inherited regional/motion browser scripts target the previous NOREVA screens and are historical verification artifacts, not Winglo acceptance tests. Existing repository-wide formatting issues in the world map JSON and regional data test are outside this feature.

## Licences

The original MIT notice remains in [LICENSE](LICENSE), with a distribution copy at `public/licenses/Studio-Admin-MIT.txt`. Bundled Geist fonts retain their SIL Open Font License at `public/licenses/Geist-OFL.txt`. The existing map data and licensing notices are retained. No original Dashboard 2 repository or deployment is changed by this work.

## Optional product tour

**Help · Product Tour** in the sidebar and page header opens product discovery. It stores its position and visibility separately in `winglo-product-tour`; Back, Skip and Restart never reset business records or the active sample. It never starts automatically for a new visitor. The optional live step opens the same working conversation and connected job workspace, with an explicit **Continue the tour** action afterward.

Only one tour panel is rendered; no floating demo guide competes with job controls. The panel stays above calendar content, wraps at phone widths, has keyboard-focusable controls and Escape dismissal, and respects reduced motion when scrolling. Missing targets show an explanation and an action to open the appropriate section.
