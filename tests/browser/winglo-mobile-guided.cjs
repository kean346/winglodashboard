const assert = require("node:assert/strict");
const path = require("node:path");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
(async () => {
  const b = await chromium.launch({ executablePath: "/usr/bin/chromium", args: ["--no-sandbox"] });
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  p.setDefaultTimeout(15000);
  const errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  const saved = () => p.evaluate(() => JSON.parse(localStorage.getItem("winglo-demo-v1")).state);
  await p.goto("http://127.0.0.1:3000/dashboard/default");
  await p.getByRole("button", { name: "Start Interactive Demo", exact: true }).click();
  await p.getByText("1. You are the customer", { exact: true }).waitFor();
  await p.getByRole("button", { name: "Use fictional example details", exact: true }).click();
  await p.getByText("2. You are Winglo Business", { exact: true }).waitFor();
  assert.equal((await saved()).journey.view, "business");
  await p.reload();
  await p.getByRole("button", { name: "Create Enquiry & Continue", exact: true }).waitFor();
  await p.waitForTimeout(1000);
  await p.locator("#demo-views").scrollIntoViewIfNeeded();
  await p.screenshot({ path: path.resolve(__dirname, "../../artifacts/winglo-mobile-handoff.png") });
  await p.getByRole("button", { name: "Create Enquiry & Continue", exact: true }).click();
  await p.getByRole("heading", { name: "Enquiries", exact: true }).waitFor();
  const guide = p.getByRole("complementary", { name: "Guided demo progress" });
  await guide.getByRole("button", { name: "Next Step", exact: true }).click();
  const dialog = p.getByRole("dialog");
  await dialog.getByRole("button", { name: "Save quotation", exact: true }).click();
  await guide.getByRole("button", { name: "Next Step", exact: true }).click();
  await guide.getByRole("button", { name: "Approve Quotation", exact: true }).click();
  await guide.getByRole("button", { name: "Simulate Customer Acceptance", exact: true }).click();
  await guide.getByRole("button", { name: "Next Step", exact: true }).click();
  const state = await saved();
  const existing = state.data.bookings[0];
  await dialog.getByLabel("Date and start time", { exact: true }).fill(existing.start);
  await dialog.getByLabel("Assign cleaner", { exact: true }).selectOption(existing.staffId);
  assert.equal(await dialog.getByRole("alert").count(), 0);
  assert.equal(
    await dialog.getByRole("radio", { name: "Confirmed", exact: true }).getAttribute("aria-checked"),
    "true",
  );
  assert.equal(
    await dialog
      .locator("select")
      .filter({ has: p.locator('option[value="In Progress"]') })
      .count(),
    0,
  );
  await dialog.getByRole("radio", { name: "Pending", exact: true }).click();
  await dialog.getByRole("radio", { name: "Confirmed", exact: true }).click();
  await dialog.getByRole("button", { name: "Confirm Booking & Continue", exact: true }).scrollIntoViewIfNeeded();
  await p.screenshot({ path: path.resolve(__dirname, "../../artifacts/winglo-mobile-booking-status.png") });
  await dialog.getByRole("button", { name: "Confirm Booking & Continue", exact: true }).click();
  const next = await saved();
  const booking = next.data.bookings.find((v) => v.id === next.journey.bookingId);
  assert.equal(booking.start, existing.start);
  assert.equal(booking.staffId, existing.staffId);
  assert.equal(booking.status, "Confirmed");
  await guide.getByRole("button", { name: "Next Step", exact: true }).click();
  await p.getByRole("tab", { name: "Business View", exact: true }).waitFor();
  await p.waitForFunction(
    () => document.querySelector('[role="tab"][aria-label="Business View"]')?.getAttribute("aria-selected") === "true",
  );
  await guide.getByRole("button", { name: "Preview Customer Reminder", exact: true }).click();
  await p.getByRole("heading", { name: "Customer Reminder Preview", exact: true }).waitFor();
  assert.deepEqual(errors, []);
  assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  console.log(
    "PASS mobile role explanation, automatic/persisted business handoff, sample shortcut, guided quote acceptance, bottom status buttons, confirmed default, overlapping guided booking, automatic reminder business view.",
  );
  await b.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
