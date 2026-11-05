const assert = require("node:assert/strict");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const base = process.env.BASE_URL || "http://127.0.0.1:3000";
(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
    args: ["--no-sandbox"],
  });
  const p = await browser.newPage();
  p.setDefaultTimeout(15000);
  const errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  await p.goto(`${base}/dashboard/settings`);
  await p.getByLabel("Default travel charge (R)", { exact: true }).fill("125");
  await p.getByLabel("VAT (%) · 0 means VAT is not applied", { exact: true }).fill("15");
  await p.getByRole("button", { name: "Add cleaner", exact: true }).click();
  await p.getByLabel("Cleaner name", { exact: true }).last().fill("Test Demo Cleaner");
  await p.getByRole("button", { name: "Save settings", exact: true }).click();
  await p.reload();
  assert.equal(await p.getByLabel("Default travel charge (R)", { exact: true }).inputValue(), "125");
  await p.goto(`${base}/dashboard/quotations`);
  await p.getByRole("button", { name: "New quotation", exact: true }).click();
  const dialog = p.getByRole("dialog");
  assert.equal(await dialog.getByLabel("Travel charge", { exact: true }).inputValue(), "125");
  assert.equal(await dialog.getByLabel("VAT (%) · 0 = no VAT", { exact: true }).inputValue(), "15");
  await dialog.getByRole("button", { name: "Save quotation", exact: true }).click();
  await p.getByText("More options", { exact: true }).click();
  const popupPromise = p.waitForEvent("popup");
  await p.getByRole("button", { name: "Print / PDF", exact: true }).first().click();
  const popup = await popupPromise;
  await popup.getByText("SAMPLE ESTIMATE · DEMO DATA · NOT BUSINESS APPROVED", { exact: true }).waitFor();
  await popup.close();
  await p.goto(`${base}/dashboard/bookings`);
  await p.getByLabel("Calendar view", { exact: true }).selectOption("timeGridWeek");
  await p.getByRole("button", { name: "New booking", exact: true }).click();
  const data = await p.evaluate(() => JSON.parse(localStorage.getItem("winglo-demo-v1")).state.data);
  await dialog.getByLabel("Date and start time", { exact: true }).fill(data.bookings[0].start);
  await dialog.getByLabel("Assign cleaner", { exact: true }).selectOption(data.bookings[0].staffId);
  assert.equal(await dialog.getByText(/Cleaner conflict/).count(), 0);
  await dialog.getByRole("button", { name: /^(Save booking|Confirm Booking & Continue)$/, exact: true }).click();
  await dialog.waitFor({ state: "hidden" });
  await p.goto(`${base}/dashboard/enquiries`);
  await p.getByRole("button", { name: "Review Enquiry", exact: true }).first().click();
  await p.getByText("More options", { exact: true }).click();
  await p.getByRole("button", { name: "Advanced request corrections", exact: true }).click();
  await p.getByLabel("Enquiry status", { exact: true }).selectOption("Closed");
  await p.goto(`${base}/dashboard/enquiries`);
  await p.getByLabel("Inbox view", { exact: true }).selectOption("All enquiries");
  await p.getByLabel("Filter status", { exact: true }).selectOption("Closed");
  assert.equal(await p.getByRole("button", { name: "Review Enquiry", exact: true }).count(), 1);
  assert.deepEqual(errors, []);
  console.log(
    "PASS: persisted pricing/VAT/staff settings; estimate prefill; printable/PDF document; week view; overlapping demo booking accepted; enquiry status/filter.",
  );
  await browser.close();
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
