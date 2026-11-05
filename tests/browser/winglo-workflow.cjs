const assert = require("node:assert/strict");
const path = require("node:path");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const base = process.env.BASE_URL || "http://127.0.0.1:3000";
async function runConnectedJob({ mobile = false } = {}) {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
    args: ["--no-sandbox"],
  });
  const p = await browser.newPage({ viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 } });
  p.setDefaultTimeout(15000);
  const errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  const state = () => p.evaluate(() => JSON.parse(localStorage.getItem("winglo-demo-v1")).state);
  await p.goto(`${base}/dashboard/default`);
  await p.getByRole("button", { name: "Try a Sample Job", exact: true }).click();
  await p.getByRole("heading", { name: "Tell us about your clean.", exact: true }).waitFor();
  const original = (await state()).data;
  await p.getByRole("button", { name: "Use Sample Details", exact: true }).click();
  await p.reload();
  await p.getByRole("button", { name: "Submit Request & Open Job", exact: true }).click();
  const job = p.getByRole("main", { name: "Customer job workspace", exact: true });
  await job.getByRole("button", { name: "Prepare Quote", exact: true }).waitFor();
  let s = await state();
  const e = s.data.enquiries.find((e) => e.id === s.journey.enquiryId);
  assert.ok(e);
  assert.equal(s.data.enquiries.length, original.enquiries.length + 1);
  assert.equal(await p.getByRole("tab", { name: /Business View/ }).count(), 0);
  assert.equal(await p.getByRole("complementary", { name: "Guided demo progress" }).count(), 0);
  await job.getByRole("button", { name: "Prepare Quote", exact: true }).click();
  await job.getByLabel("Base cleaning price", { exact: true }).fill("1000");
  assert.equal(await job.getByLabel("Quote status", { exact: true }).count(), 0);
  await job.getByRole("button", { name: "Review & Send Quote", exact: true }).evaluate((el) => {
    el.click();
    el.click();
  });
  await job.getByText("Waiting for customer", { exact: true }).waitFor();
  s = await state();
  const q = s.data.quotes.find((q) => q.enquiryId === e.id);
  assert.equal(q.status, "Sent (Simulated)");
  assert.equal(q.customerId, e.customerId);
  assert.equal(s.data.quotes.filter((q) => q.enquiryId === e.id).length, 1);
  assert.equal(q.base, 1000);
  await p.reload();
  await job.getByRole("button", { name: "Simulate Customer Acceptance", exact: true }).click();
  await job.getByRole("button", { name: "Schedule Cleaning", exact: true }).click();
  const seed = original.bookings[0];
  await job.getByLabel("Date and start time", { exact: true }).fill(seed.start);
  await job.getByLabel("Assign cleaner", { exact: true }).selectOption(seed.staffId);
  assert.equal(await job.getByRole("alert").count(), 0);
  await job.getByRole("button", { name: "Confirm Booking", exact: true }).evaluate((el) => {
    el.click();
    el.click();
  });
  await job.getByRole("button", { name: "Start Cleaning", exact: true }).waitFor();
  s = await state();
  const b = s.data.bookings.find((b) => b.quoteId === q.id);
  assert.equal(b.status, "Confirmed");
  assert.equal(b.customerId, e.customerId);
  assert.equal(s.data.bookings.filter((b) => b.quoteId === q.id).length, 1);
  assert.equal(s.data.enquiries.find((v) => v.id === e.id).status, "Converted");
  const expectedCustomer = s.data.customers.find((c) => c.id === e.customerId).name;
  for (const [route, id, region] of [
    ["enquiries", e.id, "Mobile enquiries"],
    ["quotations", q.id, "Mobile quotations"],
    ["bookings", b.id, "Mobile cleaning appointments"],
  ]) {
    await p.goto(`${base}/dashboard/${route}`);
    await p.getByLabel(`Search ${route}`, { exact: true }).fill(expectedCustomer);
    if (mobile)
      await p
        .getByRole("region", { name: region, exact: true })
        .getByRole("button", { name: "Open Job", exact: true })
        .first()
        .click();
    else await p.locator(`[id="${id}"]`).getByRole("button", { name: "Open Job", exact: true }).click();
    await job.getByRole("heading", { name: expectedCustomer, exact: true }).waitFor();
    assert.equal((await state()).data.bookings.find((v) => v.id === b.id).quoteId, q.id);
  }
  await job.getByRole("button", { name: "Start Cleaning", exact: true }).click();
  await job.getByRole("button", { name: "Complete Job", exact: true }).click();
  const confirm = p.getByRole("dialog");
  await confirm.getByRole("button", { name: "Confirm Completion", exact: true }).click();
  await job.getByRole("button", { name: "View Customer History", exact: true }).waitFor();
  s = await state();
  assert.equal(s.data.bookings.find((v) => v.id === b.id).status, "Completed");
  assert.equal(
    s.data.bookings.filter((v) => v.status === "Completed").reduce((sum, v) => sum + v.amount, 0),
    original.bookings.filter((v) => v.status === "Completed").reduce((sum, v) => sum + v.amount, 0) + b.amount,
  );
  await job.getByRole("button", { name: "View Customer History", exact: true }).click();
  await job.getByRole("link", { name: /Completed/ }).waitFor();
  await job.getByRole("button", { name: "Back to job", exact: true }).click();
  await p.reload();
  await job.getByRole("button", { name: "View Customer History", exact: true }).waitFor();
  assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await p.waitForTimeout(800);
  await p.screenshot({
    path: path.resolve(__dirname, `../../artifacts/winglo-connected-${mobile ? "mobile" : "desktop"}.png`),
  });
  await job.getByText("More options", { exact: true }).click();
  await job.getByRole("button", { name: "View conversation", exact: true }).click();
  await job.getByText("Collected conversation details", { exact: true }).waitFor();
  await job.getByRole("button", { name: "Back to job", exact: true }).click();
  await job.getByText("More options", { exact: true }).click();
  const popupPromise = p.waitForEvent("popup");
  await job.getByRole("button", { name: "Print / PDF", exact: true }).click();
  const popup = await popupPromise;
  await popup.getByText("SAMPLE ESTIMATE · DEMO DATA · NOT BUSINESS APPROVED", { exact: true }).waitFor();
  await popup.close();
  await job.getByRole("button", { name: "Advanced booking corrections / Cancel", exact: true }).click();
  assert.equal(await job.getByLabel("Customer", { exact: true }).count(), 0);
  assert.equal(await job.getByLabel("Service", { exact: true }).count(), 0);
  await job.getByRole("radio", { name: "Cancelled", exact: true }).click();
  await job.getByRole("button", { name: /^(Save booking|Confirm Booking & Continue)$/, exact: true }).click();
  await job.getByRole("button", { name: "Reschedule Cleaning", exact: true }).click();
  await job.getByRole("button", { name: "Save Booking Changes", exact: true }).click();
  assert.equal((await state()).data.bookings.filter((v) => v.quoteId === q.id).length, 1);
  assert.equal((await state()).data.bookings.find((v) => v.id === b.id).status, "Confirmed");
  assert.deepEqual(errors, []);
  console.log(
    `PASS ${mobile ? "mobile" : "desktop"} connected job: request→review/send→accept→book→complete, exact links, duplicate guards, refresh, directory return, revenue/history, PDF, corrections and rescheduling.`,
  );
  await browser.close();
}
module.exports = { runConnectedJob };
if (require.main === module)
  runConnectedJob().catch((e) => {
    console.error(e);
    process.exit(1);
  });
