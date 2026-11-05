const assert = require("node:assert/strict");
const path = require("node:path");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const base = process.env.BASE_URL || "http://127.0.0.1:3000";
async function runConnectedJob({ mobile = false } = {}) {
  const browser = await chromium.launch({ executablePath: "/usr/bin/chromium", args: ["--no-sandbox"] });
  const p = await browser.newPage({ viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 } });
  p.setDefaultTimeout(20000);
  const errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  const state = () => p.evaluate(() => JSON.parse(localStorage.getItem("winglo-demo-v1")).state);
  const job = p.getByRole("main", { name: "Enquiry workspace", exact: true });
  await p.goto(`${base}/dashboard/default`);
  await p.getByRole("button", { name: "Try a Sample Job", exact: true }).click();
  await p.getByRole("heading", { name: "Tell us about your clean.", exact: true }).waitFor();
  const original = (await state()).data;
  await p.getByRole("button", { name: "Use Sample Details", exact: true }).click();
  await p.getByRole("button", { name: "Send Enquiry to Inbox", exact: true }).click();
  await p.getByRole("heading", { name: "Enquiries / Inbox", exact: true }).waitFor();
  let s = await state();
  const e = s.data.enquiries.find((e) => e.id === s.journey.enquiryId);
  assert.equal(s.data.quotes.length, original.quotes.length);
  assert.equal(await p.getByRole("link", { name: "Jobs", exact: true }).count(), 0);
  const card = p.locator(`[id="mobile-${e.id}"]`);
  await card.getByRole("button", { name: "Open Enquiry", exact: true }).click();
  await job.getByRole("button", { name: "Prepare Quote", exact: true }).evaluate((el) => {
    el.click();
    el.click();
  });
  await job.getByLabel("Base cleaning price", { exact: true }).fill("1000");
  await job.getByRole("button", { name: "Review & Send Quote", exact: true }).click();
  s = await state();
  const q = s.data.quotes.find((q) => q.enquiryId === e.id);
  assert.equal(s.data.quotes.filter((q) => q.enquiryId === e.id).length, 1);
  assert.equal(q.status, "Sent (Simulated)");
  await p.goto(`${base}/dashboard/enquiries`);
  await card.getByText("Waiting for acceptance", { exact: true }).waitFor();
  await card.getByRole("button", { name: "Open Enquiry", exact: true }).click();
  await job.getByRole("button", { name: "Simulate Customer Acceptance", exact: true }).click();
  await job.getByText("Awaiting payment", { exact: true }).waitFor();
  s = await state();
  assert.equal(s.data.quotes.find((v) => v.id === q.id).payment.amountReceived, 0);
  await p.reload();
  await job.getByText("Awaiting payment", { exact: true }).waitFor();
  await p.locator(`[id="payment-${q.id}"]`).scrollIntoViewIfNeeded();
  await p.waitForTimeout(1100);
  await p.screenshot({
    path: path.resolve(__dirname, `../../artifacts/winglo-unified-awaiting-${mobile ? "mobile" : "desktop"}.png`),
  });
  await p.goto(`${base}/dashboard/enquiries`);
  await p.getByLabel("Filter status", { exact: true }).selectOption("Awaiting payment");
  await card.getByText("Awaiting payment", { exact: true }).waitFor();
  await card.getByRole("button", { name: "Open Enquiry", exact: true }).click();

  // Schedule before payment: no invented pay-before-booking policy.
  await job.getByRole("button", { name: "Schedule Cleaning", exact: true }).click();
  await job.getByLabel("Date and start time", { exact: true }).fill(original.bookings[0].start);
  await job.getByLabel("Assign cleaner", { exact: true }).selectOption(original.bookings[0].staffId);
  await job.getByRole("button", { name: "Confirm Booking", exact: true }).click();
  s = await state();
  const b = s.data.bookings.find((b) => b.quoteId === q.id);
  assert.equal(b.status, "Confirmed");
  assert.equal(b.customerId, e.customerId);
  await job.getByRole("button", { name: "Record / Update Payment", exact: true }).click();
  await job.getByLabel("Total received to date (R)", { exact: true }).fill("-1");
  await job.getByRole("button", { name: "Save Payment Record", exact: true }).click();
  assert.equal(
    (await state()).data.quotes.find((v) => v.id === q.id).payment.amountReceived,
    0,
    "Invalid payment cannot advance saved state",
  );
  await job.getByLabel("Total received to date (R)", { exact: true }).fill("100");
  await job.getByLabel("Payment due date (optional)", { exact: true }).fill("2026-12-10");
  await job.getByRole("button", { name: "Save Payment Record", exact: true }).click();
  await job.getByText("Part paid", { exact: true }).waitFor();
  await p.reload();
  await job.getByText("Part paid", { exact: true }).waitFor();
  for (const route of ["enquiries", "quotations", "bookings"]) {
    await p.goto(`${base}/dashboard/${route}`);
    await p
      .getByLabel(`Search ${route}`, { exact: true })
      .fill(s.data.customers.find((c) => c.id === e.customerId).name);
    const region = route === "bookings" ? "Mobile cleaning appointments" : `Mobile ${route}`;
    if (mobile)
      await p
        .getByRole("region", { name: region, exact: true })
        .getByRole("button", { name: "Open Enquiry", exact: true })
        .first()
        .click();
    else {
      if (route !== "bookings") await p.getByRole("button", { name: "Table view", exact: true }).click();
      const recordId = { enquiries: e.id, quotations: q.id, bookings: b.id }[route];
      await p.locator(`[id="${recordId}"]`).getByRole("button", { name: "Open Enquiry", exact: true }).click();
    }
    await job.getByRole("button", { name: "Start Cleaning", exact: true }).waitFor();
  }
  await job.getByRole("button", { name: "Start Cleaning", exact: true }).click();
  await job.getByRole("button", { name: "Complete Job", exact: true }).click();
  await p.getByRole("dialog").getByRole("button", { name: "Confirm Completion", exact: true }).click();
  await job.getByRole("button", { name: "View Customer History", exact: true }).waitFor();
  await job.getByText("Part paid", { exact: true }).waitFor();
  s = await state();
  assert.equal(s.data.bookings.find((v) => v.id === b.id).status, "Completed");
  assert.equal(
    s.data.bookings.filter((v) => v.status === "Completed").reduce((a, v) => a + v.amount, 0),
    original.bookings.filter((v) => v.status === "Completed").reduce((a, v) => a + v.amount, 0) + b.amount,
  );
  const quoteTotal =
    Math.round(Math.max(0, q.base + q.size + q.extras + q.travel - q.discount) * (1 + q.vat / 100) * 100) / 100;
  await job.getByRole("button", { name: "Record / Update Payment", exact: true }).click();
  await job.getByLabel("Total received to date (R)", { exact: true }).fill(String(quoteTotal));
  await job.getByRole("button", { name: "Save Payment Record", exact: true }).click();
  await job.getByText("Paid", { exact: true }).waitFor();
  await p.goto(`${base}/dashboard/enquiries`);
  await card.getByText("Completed", { exact: true }).waitFor();
  await card.getByText("Paid", { exact: true }).waitFor();
  await p.getByLabel("Filter status", { exact: true }).selectOption("Paid");
  await card.getByRole("button", { name: "Open Enquiry", exact: true }).click();
  await p.waitForTimeout(1400);
  await p.screenshot({
    path: path.resolve(__dirname, `../../artifacts/winglo-unified-${mobile ? "mobile" : "desktop"}.png`),
  });
  assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  // Additional quotes are intentional and never replace the original quote/payment/booking.
  await job.getByRole("button", { name: "Create Additional Quote", exact: true }).click();
  await p.getByRole("dialog").getByRole("button", { name: "Save quotation", exact: true }).click();
  await job.waitFor();
  s = await state();
  assert.equal(s.data.quotes.filter((v) => v.enquiryId === e.id).length, 2);
  assert.equal(s.data.quotes.find((v) => v.id === q.id).payment.amountReceived, quoteTotal);
  assert.equal(s.data.bookings.filter((v) => v.quoteId === q.id).length, 1);
  await p.goto(`${base}/dashboard/jobs/${q.id}`);
  await job.waitFor();
  assert.ok(p.url().includes(`/dashboard/enquiries/${q.id}`));
  await p.goto(`${base}/dashboard/jobs`);
  await p.getByRole("heading", { name: "Enquiries / Inbox", exact: true }).waitFor();
  assert.deepEqual(errors, []);
  console.log(
    `PASS ${mobile ? "mobile" : "desktop"} unified enquiry: quote/acceptance, saved waiting, partial/full payment, booking before payment, completion/revenue, directory return, additional quote isolation, redirects and persistence.`,
  );
  await browser.close();
}
module.exports = { runConnectedJob };
if (require.main === module)
  runConnectedJob().catch((e) => {
    console.error(e);
    process.exit(1);
  });
