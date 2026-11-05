# Winglo Cleaning Services — interactive demo

A browser-local cleaning business dashboard built on Studio Admin / NOREVA, using Next.js, React, TypeScript, Tailwind and existing shadcn components. The royal-blue theme, light/dark toggle, page animations, grey selected choices and clear count fields are retained. No authentication, database, messaging or payment provider is connected.

## One enquiry, everything connected

**Enquiries / Inbox** is the central workspace. Each request stays visible through its quotation, customer acceptance, booking, cleaning and completion. Cards show the current progress, payment status and next action. Search, progress/payment filters, a desktop table option and an explicit closed-enquiry view remain available.

Open an enquiry to:

1. Review the customer and collected conversation details.
2. Prepare and review its quote, then simulate sending it.
3. Simulate customer acceptance in the separate Demo controls area.
4. Record payment when received, including partial payments and an optional due date.
5. Schedule and confirm cleaning, start the work and confirm completion.

Quotations remains a focused management view for accepted/pending quotes and creating additional linked quotes. Bookings remains the calendar/schedule view. Customer profiles retain service history. Additional quotes and bookings are accessible from the same enquiry without replacing existing records. Legacy standalone quotes and bookings remain accessible through their directories.

The separate Jobs navigation/page has been removed. Existing `/dashboard/jobs` and `/dashboard/jobs/[id]` links redirect to the Inbox and the corresponding enquiry workspace, preserving old links. New links use `/dashboard/enquiries/[id]` and accept existing enquiry, quote and booking IDs.

## Payment and waiting

Acceptance, payment and cleaning progress are independent. An accepted quotation may remain **Awaiting payment** until the user updates it. Partial receipts show **Part paid** and the outstanding balance; full receipts show **Paid**. No timer or navigation automatically advances these states. Scheduling is allowed while payment is pending; no pay-before-booking policy is imposed.

Payment records are cumulative manual demo entries, not transactions or verified bank transfers. Accepted legacy records without payment history show **Payment not recorded**. No historical payments or timestamps are fabricated. New simulated acceptance starts with zero received. All records persist across refresh/navigation using the existing localStorage store; the payment property is optional so existing data does not require replacement.

**Completed-job revenue is the value of completed cleaning work, not cash received.** Payment entries do not change pricing, booking value or this revenue definition. Completion never implies payment. Payment updates produce activity only when actually saved.

Overlapping cleaner appointments are allowed throughout the demo. Duplicate quotation handoff and booking conversion remain guarded; explicitly creating an additional quote is supported. Completion still requires confirmation; routine booking actions retain safe Undo protection.

## Demo and Help walkthrough

Overview and Interactive Demo open the same persistent simulated WhatsApp conversation. Answer the questions or use fictional sample details, then **Send Enquiry to Inbox**. Open that enquiry to continue the whole workflow. Starting another sample preserves previous enquiries and customer records. The optional Help tour explains the unified enquiry view, independent acceptance/payment, quotation management, calendar and history. Its progress is separate from business-demo data.

Customer-facing `/enquire` and the administrative enquiry editor use the same service-specific questions. Customer matching, sample pricing, configurable VAT, printable quotations, settings, staff and automation previews remain local. Photos are temporary previews only. All contacts are fictional. Data is not shared between browsers/devices, and no real messages or payments are processed.

## Develop

Use Node 24 and npm:

```sh
npm ci
npm run dev
```

The root redirects to `/dashboard/default`. Feature components live in `src/app/(main)/dashboard/_components/winglo/`; the store is the single persistence/mutation boundary. Shared UI and calendar primitives are preserved. There are no new dependencies for the unified enquiry view or payment records.

## Validation

```sh
npm test
npx tsc --noEmit
npm run build
npm run lint
npm run check
```

Run Next.js first on a fresh checkout to generate its route declarations. Browser suites use an available Playwright installation and Chromium:

```sh
PLAYWRIGHT_MODULE=/path/to/playwright node tests/browser/winglo-workflow.cjs
PLAYWRIGHT_MODULE=/path/to/playwright node tests/browser/winglo-mobile-guided.cjs
PLAYWRIGHT_MODULE=/path/to/playwright node tests/browser/winglo-premium.cjs
PLAYWRIGHT_MODULE=/path/to/playwright node tests/browser/winglo-product-tour.cjs
```

The connected desktop/mobile suites cover request → quote → acceptance, saved waiting, partial/full payment, scheduling before payment, completion/revenue, directory return, additional quote isolation, old-link redirects and persistence. Other browser suites retain settings/PDF, booking Undo/confirmation, overlapping appointments, themes and separate tour progress. Unit tests cover sample pricing, links, primary enquiry selection and independent payment calculations. Screenshots for this update use `artifacts/winglo-unified-*`.

The repository-wide check has two inherited issues outside this work: map JSON formatting and regional test import order. Historical regional/motion browser scripts target older NOREVA screens.

## Rollback

Before unified enquiries: branch `backup/pre-unified-enquiries-2026-11-05` at `6210424`. Code backups are separate from browser-local records; changing code does not require deleting saved data.

## Licences

The original MIT notice remains in [LICENSE](LICENSE), with a distribution copy at `public/licenses/Studio-Admin-MIT.txt`. Geist fonts retain their SIL Open Font License at `public/licenses/Geist-OFL.txt`. Existing map-data notices remain. No original Dashboard 2 repository or deployment is changed.
