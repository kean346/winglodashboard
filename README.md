# Winglo Cleaning Services — interactive demo

A browser-local cleaning business demo customised from the existing Studio Admin / NOREVA dashboard. The original layout, UI primitives, calendar styling, typography, theme switcher and motion system are retained. No backend or messaging provider is connected.

## Visual workflow upgrade and rollback point

The original pre-upgrade version is preserved at commit `538bcab191ddf22e9faa16365c4b872f441abcc0` on GitHub branch [`backup/pre-visual-upgrade-2026-11-04`](https://github.com/kean346/winglodashboard/tree/backup/pre-visual-upgrade-2026-11-04). This is a code rollback point; browser-local records are stored separately. Returning to this version does not require deleting records or changing database services.

Booking screens now show the actual Pending → Confirmed → In Progress → Completed sequence. **Confirm Booking**, **Start Cleaning**, and **Complete Job** use the existing booking mutation, including its cleaner conflict and accepted-quotation checks. Cancelled/completed records have no forward quick action. Administrative status controls remain available in the existing editor.

Routine confirmation/start actions offer a short Undo window. Undo refuses to overwrite later booking changes and reruns conflict validation. Completion requires a confirmation showing the saved job value because it affects demo revenue. Status corrections and staff assignments produce activity only when the actual record changes; seeded bookings do not acquire fabricated historical timestamps.

Overview retains its original KPI and chart sections while adding a compact next-actions panel and a live booking-status breakdown. Booking details combine saved customer, service, date/time, cleaner, amount, a responsive workflow stepper and recorded activity. Existing calendar views are retained with a status legend, pending-state styling and cleaner/duration tooltips. Shared primitives, fonts, themes and navigation remain unchanged.

The demo now starts in light mode; choosing dark mode remains saved. Full animation is permanently enabled, including when a device or older saved preference requested reduced motion; there is no animation control. At phone widths the management tables adapt to enquiry, quotation, booking and customer cards with visible actions. Desktop tables remain available at larger widths, and the floating journey panel is height-limited on phones.

On phones the interactive demo explains which role you are playing, brings each next question into view, and switches automatically from Customer View to Winglo Business when the answers are complete. The selected role survives refresh. Booking status is chosen with buttons at the bottom of the form; guided bookings default to Confirmed with a **Confirm Booking & Continue** action. Cleaner availability does not block scenario-linked presentation bookings, and those simulated appointments do not reserve availability for ordinary management bookings. Ordinary booking conflict validation remains in place.

## Develop

Use Node 24 (validated with 24.19.0) and npm:

```sh
npm ci
npm run dev
```

The application root redirects to `/dashboard/default`. The sidebar retains the six management sections — Overview, Enquiries, Quotations, Bookings, Customers and Settings — and adds Interactive Demo at `/dashboard/demo`. `/enquire` is a separate customer-facing demo form.

Overview provides two entry points using the existing button styles:

- **Start Interactive Demo** opens `/dashboard/demo` and starts or resumes the guided customer journey.
- **Explore Dashboard** keeps ordinary management tools available without starting guidance. An already-active tour is paused, with its progress retained.

The demo has a customer messaging panel and live business preview, with Customer View / Business View tabs on mobile. The persistent progress panel survives route changes, refreshes, pausing and minimising. It routes to the correct linked enquiry, quotation, booking or customer; required actions gate progression. The journey ends with a reminder preview, completed job and linked-record summary. Messages are simulated locally.

**Restart Demo / Restart conversation** starts a fresh isolated scenario without deleting any records. Repeated submission within a scenario creates just one enquiry; duplicate quote and booking conversion is guarded. **Reset Demo Data** remains the separate destructive action with confirmation.

## Demo behaviour

- A Zustand store persists linked customers, enquiries, quotes, bookings, settings, activity and journey state under `winglo-demo-v1` in localStorage, using schema version 1. Existing version-0 business data is migrated without replacement. A hydration gate avoids server/client mismatches. Storage failures display a warning. Settings includes a confirmed reset action.
- Five central service-specific question sets power both the simulator and customer form. Customers are matched by normalised contact number or email where possible. Photo attachments are previews only (three images up to 5 MB each); they are never uploaded or retained.
- Central sample pricing: base + size adjustment + extras package + travel − discount, floored at zero, then configurable VAT. VAT starts at 0%; no Winglo VAT registration or real price approval is assumed. Settings affect new estimates; saved quotes retain their reviewed values.
- Quote status, owner approval, send and customer acceptance are simulations. Accepted quotes convert once into linked bookings. Print / PDF opens a printable quotation; choose **Save as PDF** in the browser print dialog. No PDF service or additional dependency is used.
- Bookings support month/week calendar views, editing, rescheduling, cleaner assignment, duration, job value and status. Overlapping non-cancelled assignments to the same cleaner are rejected; adjacent jobs are allowed. Completed jobs update customer history and the revenue chart/KPI.
- Dates are relative to initial demo creation/reset. Times use the browser's local timezone. All seed identities and contacts are fictional. Revenue means the value of completed demo jobs, not verified payments or accounting revenue.
- All six editable automation templates support `{name}`, `{service}` and `{date}`. Previews and simulations send nothing. There are no application calls to WhatsApp, email, SMS or paid services.
- Customer submissions from another browser/device do **not** reach an owner elsewhere. This is local storage, not shared business infrastructure.

## Architecture

Feature code lives in `src/app/(main)/dashboard/_components/winglo/`. `model.ts` owns domain types, seed data, question sets, pricing and overlap calculations. `store.ts` is the single persistence/mutation boundary. `journey.ts` owns conversation validation, eight stage gates, safe sample responses and activity derivation. The shared layout mounts `JourneyPanel`; only modal visibility and unsaved ordinary forms remain page-local. Forms, editors, overview, booking calendar and settings compose the existing shared primitives. Route pages remain small server components.

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

The visual workflow suite (`tests/browser/winglo-visual-workflow.cjs`, run with the same Playwright variables) covers single-action confirmation, double-click protection, Undo/stale-Undo safety, starting work, completion confirmation/cancellation, persisted status/revenue/history, conflicts, filtering, mobile stepper width and theme screenshots. Visual review images use the `artifacts/winglo-visual-*` prefix.

The workflow test covers both entry points, existing-data migration, all eight guided stages, route/refresh persistence, required-action gates, answer editing, all five service question sets, record linkage, duplicate guards, reminder previews, completed-job KPIs/history, pause/minimise/resume, isolated restart, reset, theme switching and mobile tabs/navigation/width. The actions test covers editable pricing/VAT/staff, quotation prefilling, printable output, week calendar view, cleaner conflicts and enquiry status filters. Updated demo images are `artifacts/winglo-interactive-desktop.png`, `artifacts/winglo-interactive-dark.png` and `artifacts/winglo-interactive-mobile.png`. Earlier overview images are retained.

The inherited regional/motion browser scripts target the previous NOREVA screens and are historical verification artifacts, not Winglo acceptance tests. Existing repository-wide formatting issues in the world map JSON and regional data test are outside this feature.

## Licences

The original MIT notice remains in [LICENSE](LICENSE), with a distribution copy at `public/licenses/Studio-Admin-MIT.txt`. Bundled Geist fonts retain their SIL Open Font License at `public/licenses/Geist-OFL.txt`. The existing map data and licensing notices are retained. No original Dashboard 2 repository or deployment is changed by this work.

## Optional product tour

**Take Live Tour** opens an independent tour of the real dashboard. **Try the Interactive Demo** opens the existing live workflow. The tour stores only its own position/visibility in `winglo-product-tour`; Back, Skip and Restart never reset business records or guided-demo progress. An optional live-demo step explains the handoff and lets you return to the product tour afterward. Missing targets show a fallback action; phone layouts wrap the compact controls, and tour scrolling respects reduced-motion preferences. The tour is never started automatically for a fresh visitor.

Run `tests/browser/winglo-product-tour.cjs` with the same Playwright environment variables as the other browser suites.

Fresh visitors see a prominent **Start with a live tour** welcome card. The left sidebar also provides **Take Live Tour**. After the tour is opened or the visitor chooses to explore, the large welcome prompt is dismissed locally. The tour stays above calendar content, whose stacking context is isolated so scheduling elements cannot hide Step 6 controls.
