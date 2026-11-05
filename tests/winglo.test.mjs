import {
  estimate,
  overlaps,
  seed,
  serviceQuestions,
  total,
} from "../src/app/(main)/dashboard/_components/winglo/model.ts";
import assert from "node:assert/strict";
import test from "node:test";

test("sample quote calculation applies adjustments, capped discount and configurable VAT", () => {
  const q = { base: 1000, size: 120, extras: 150, travel: 80, discount: 50, vat: 0 };
  assert.equal(total(q), 1300);
  assert.equal(total({ ...q, vat: 15 }), 1495);
  assert.equal(total({ ...q, discount: 9000 }), 0);
  const d = seed();
  const e = { ...d.enquiries[0], answers: { size: "120", extras: "Windows" } };
  const priced = estimate(e, d.settings);
  assert.equal(priced.size, 120);
  assert.equal(priced.vat, 0);
  assert.equal(priced.extras, 150);
  assert.equal(estimate(e, { ...d.settings, sizeRate: 5 }).size, 200);
});
test("cleaner conflicts distinguish overlapping, adjacent, cancelled and other staff bookings", () => {
  const a = { ...seed().bookings[0], id: "a", start: "2026-11-04T09:00", duration: 3, staffId: "s" };
  const b = { ...a, id: "b", start: "2026-11-04T11:00" };
  assert.ok(overlaps(a, b));
  assert.ok(!overlaps(a, { ...b, start: "2026-11-04T12:00" }));
  assert.ok(!overlaps(a, { ...b, status: "Cancelled" }));
  assert.ok(!overlaps(a, { ...b, staffId: "other" }));
  assert.ok(!overlaps(a, { ...b, id: "a" }));
});
test("fictional demo relations and service-specific question sets are coherent", () => {
  const d = seed();
  for (const record of [...d.enquiries, ...d.quotes, ...d.bookings]) {
    assert.ok(d.customers.some((c) => c.id === record.customerId));
    assert.ok(d.settings.services.some((s) => s.id === record.serviceId));
  }
  for (const b of d.bookings.filter((b) => b.quoteId)) {
    const q = d.quotes.find((q) => q.id === b.quoteId);
    assert.equal(q.customerId, b.customerId);
    assert.equal(q.serviceId, b.serviceId);
    assert.equal(total(q), b.amount);
  }
  const sets = Object.values(serviceQuestions).map((q) => q.map((v) => v.key).join(","));
  assert.equal(new Set(sets).size, 5);
});

test("job workspace resolves each existing linked record without another dataset", async () => {
  const { resolveJob } = await import("../src/app/(main)/dashboard/_components/winglo/job-model.ts");
  const d = seed();
  const b = d.bookings.find((b) => b.quoteId);
  const q = d.quotes.find((q) => q.id === b.quoteId);
  for (const ref of [q.enquiryId, q.id, b.id]) {
    const job = resolveJob(d, ref);
    assert.equal(job.enquiry.id, q.enquiryId);
    assert.equal(job.quote.id, q.id);
    assert.equal(job.booking.id, b.id);
    assert.equal(job.customer.id, q.customerId);
  }
  assert.equal(resolveJob(d, "missing").customer, undefined);
});

test("workspace progress follows saved state, including independent legacy bookings", async () => {
  const { resolveJob } = await import("../src/app/(main)/dashboard/_components/winglo/job-model.ts");
  const d = seed();
  const enquiry = d.enquiries[0];
  const clean = { ...d, quotes: [], bookings: [] };
  assert.equal(resolveJob(clean, enquiry.id).stage, 0);
  const quote = { ...d.quotes[0], enquiryId: enquiry.id };
  clean.quotes = [quote];
  assert.equal(resolveJob(clean, enquiry.id).stage, 1);
  const booking = { ...d.bookings[0], quoteId: quote.id, status: "Confirmed" };
  clean.bookings = [booking];
  assert.equal(resolveJob(clean, enquiry.id).stage, 2);
  clean.bookings = [{ ...booking, status: "Completed" }];
  assert.equal(resolveJob(clean, enquiry.id).stage, 3);
  const legacy = { ...booking, quoteId: undefined };
  const job = resolveJob({ ...clean, bookings: [legacy] }, legacy.id);
  assert.equal(job.enquiry, undefined);
  assert.equal(job.quote, undefined);
  assert.equal(job.customer.id, legacy.customerId);
  assert.equal(job.stage, 2);
});

test("Jobs lists each linked branch once and preserves multiple jobs for one customer", async () => {
  const { listJobs, jobNextAction } = await import("../src/app/(main)/dashboard/_components/winglo/job-model.ts");
  const d = seed();
  const customer = d.customers[0];
  const e = { ...d.enquiries[0], customerId: customer.id };
  const q = { ...d.quotes[0], enquiryId: e.id, customerId: customer.id };
  const b = { ...d.bookings[0], quoteId: q.id, customerId: customer.id, status: "Confirmed" };
  const data = {
    ...d,
    enquiries: [e, { ...e, id: "request-only" }],
    quotes: [q, { ...q, id: "second-quote", status: "Sent (Simulated)" }],
    bookings: [b, { ...b, id: "second-booking" }, { ...b, id: "legacy-booking", quoteId: undefined }],
  };
  const jobs = listJobs(data);
  assert.equal(jobs.length, 4);
  assert.equal(new Set(jobs.map((j) => j.ref)).size, 4);
  assert.ok(jobs.every((j) => j.customer.id === customer.id));
  assert.equal(
    jobs.filter((j) => j.quote?.id === q.id).length,
    2,
    "Two existing bookings must remain separately accessible",
  );
  assert.equal(jobs.filter((j) => j.ref === q.id || j.ref === e.id).length, 0, "No duplicate parent entries");
  assert.equal(jobNextAction(jobs.find((j) => j.ref === b.id)), "Start Cleaning");
  assert.equal(jobNextAction(jobs.find((j) => j.ref === "second-quote")), "Waiting for Customer");
  assert.equal(jobs.find((j) => j.ref === "legacy-booking").enquiry, undefined);
});

test("Inbox attention queue excludes quoted and closed requests without deleting conversations", async () => {
  const { inboxEnquiries, listJobs } = await import("../src/app/(main)/dashboard/_components/winglo/job-model.ts");
  const data = seed();
  const request = { ...data.enquiries[0], id: "new-request", status: "Ready for Quote" };
  data.enquiries.push(request, { ...request, id: "closed-request", status: "Closed" });
  assert.ok(inboxEnquiries(data).some((e) => e.id === request.id));
  assert.ok(!listJobs(data).some((j) => j.ref === request.id));
  data.quotes.push({
    ...data.quotes[0],
    id: "prepared-draft",
    enquiryId: request.id,
    customerId: request.customerId,
    serviceId: request.serviceId,
    status: "Draft",
  });
  assert.ok(!inboxEnquiries(data).some((e) => e.id === request.id));
  assert.ok(listJobs(data).some((j) => j.ref === "prepared-draft"));
  assert.ok(!inboxEnquiries(data).some((e) => e.id === "closed-request"));
  assert.equal(inboxEnquiries(data, true).length, data.enquiries.length);
});
