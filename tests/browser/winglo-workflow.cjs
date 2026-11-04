/* Browser acceptance: existing-record migration, both entry points and a persistent linked journey. */
const assert = require("node:assert/strict");
const path = require("node:path");
const { mkdirSync } = require("node:fs");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const base = process.env.BASE_URL || "http://127.0.0.1:3000";
const saved = (p) => p.evaluate(() => JSON.parse(localStorage.getItem("winglo-demo-v1")).state);
(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
    args: ["--no-sandbox"],
  });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: "reduce" });
  const p = await context.newPage();
  p.setDefaultTimeout(15000);
  const errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  await p.goto(`${base}/dashboard/default`);
  await p.getByRole("button", { name: "Explore Dashboard", exact: true }).click();
  assert.equal((await saved(p)).journey, null);
  // Verify old version-0 data migrates without replacing an owner's edits.
  await p.evaluate(() => {
    const value = JSON.parse(localStorage.getItem("winglo-demo-v1"));
    value.version = 0;
    delete value.state.journey;
    delete value.state.activity;
    value.state.data.customers[0].notes = "Owner note retained from version 0";
    localStorage.setItem("winglo-demo-v1", JSON.stringify(value));
  });
  await p.reload();
  await p.getByRole("button", { name: "Start Interactive Demo", exact: true }).waitFor();
  assert.equal((await saved(p)).data.customers[0].notes, "Owner note retained from version 0");
  const original = (await saved(p)).data;
  console.log("PASS entry points and migration");
  await p.getByRole("button", { name: "Start Interactive Demo", exact: true }).click();
  await p.getByRole("heading", { name: "Interactive Demo", exact: true }).waitFor();
  const guide = p.getByRole("complementary", { name: "Guided demo progress" });
  await guide.getByRole("button", { name: "Next Step", exact: true }).click();
  await p.getByRole("radio", { name: "Home Deep Cleaning", exact: true }).click();
  await p.getByRole("button", { name: "Continue", exact: true }).click();
  const send = async (label, value) => {
    await p.getByLabel(label, { exact: true }).fill(value);
    await p.getByRole("button", { name: "Continue", exact: true }).click();
  };
  await send("How many bedrooms?", "3");
  await send("How many bathrooms?", "2");
  await p.reload();
  await p.getByLabel("Property size (m²)", { exact: true }).waitFor();
  assert.equal((await saved(p)).journey.draft.answers.bedrooms, "3");
  await send("Property size (m²)", "120");
  await p.getByRole("radio", { name: "Yes", exact: true }).click();
  await p.getByRole("button", { name: "Continue", exact: true }).click();
  await p.getByRole("radio", { name: "Windows", exact: true }).click();
  await p.getByRole("button", { name: "Continue", exact: true }).click();
  await send("Which suburb is the property in?", "Linden, Johannesburg");
  await p.getByRole("button", { name: "Continue", exact: true }).click();
  await send("What is your full name?", "Zanele Journey Test");
  await send("What is your contact number?", "+27 00 987 6543");
  await p.getByRole("button", { name: "Previous answer", exact: true }).click();
  assert.equal(await p.getByLabel("What is your contact number?", { exact: true }).inputValue(), "+27 00 987 6543");
  await p.getByRole("button", { name: "Continue", exact: true }).click();
  await guide.getByRole("button", { name: "Minimise demo", exact: true }).click();
  await p.goto(`${base}/dashboard/customers`);
  await p.reload();
  await guide.getByRole("button", { name: "Resume Demo", exact: true }).click();
  await p.getByRole("button", { name: "Create Enquiry & Continue", exact: true }).click();
  await p.getByRole("heading", { name: "Enquiries", exact: true }).waitFor();
  let state = await saved(p);
  const enquiry = state.data.enquiries.find((e) => e.id === state.journey.enquiryId);
  assert.equal(state.data.enquiries.length, original.enquiries.length + 1);
  assert.equal(enquiry.status, "Ready for Quote");
  assert.equal(state.journey.step, 2);
  assert.equal(await p.locator(`[id="${enquiry.id}"][data-tour-record="true"]`).count(), 1);
  // Manual page navigation must retain the same step and exact record links.
  await p.goto(`${base}/dashboard/default`);
  await p.getByText("Total Enquiries", { exact: true }).waitFor();
  const card = p.locator('[data-slot="card"]').filter({ has: p.getByText("Total Enquiries", { exact: true }) });
  await card.getByText(String(original.enquiries.length + 1), { exact: true }).waitFor();
  await p.goto(`${base}/dashboard/quotations`);
  assert.equal((await saved(p)).journey.step, 2);
  await guide.getByRole("button", { name: "Resume Demo", exact: true }).click();
  await p.getByRole("heading", { name: "Enquiries", exact: true }).waitFor();
  await guide.getByRole("button", { name: "Next Step", exact: true }).click();
  const dialog = p.getByRole("dialog");
  await dialog.getByRole("heading", { name: "Sample quotation", exact: true }).waitFor();
  assert.ok((await dialog.textContent()).includes("Zanele Journey Test"));
  await dialog.getByRole("button", { name: "Close", exact: true }).click();
  await guide.getByRole("button", { name: "Next Step", exact: true }).click();
  assert.equal((await saved(p)).journey.step, 3); // gate: no saved quote yet
  await dialog.getByLabel("Base cleaning price", { exact: true }).fill("1000");
  await dialog.getByRole("button", { name: "Save quotation", exact: true }).click();
  state = await saved(p);
  const quote = state.data.quotes.find((q) => q.id === state.journey.quoteId);
  assert.equal(quote.enquiryId, enquiry.id);
  assert.equal(quote.customerId, enquiry.customerId);
  assert.equal(quote.status, "Awaiting Approval");
  assert.equal(state.data.quotes.filter((q) => q.enquiryId === enquiry.id).length, 1);
  await p.goto(`${base}/dashboard/default`);
  const awaitingCard = p
    .locator('[data-slot="card"]')
    .filter({ has: p.getByText("Quotations Awaiting Approval", { exact: true }) });
  await awaitingCard
    .getByText(String(original.quotes.filter((q) => q.status === "Awaiting Approval").length + 1), { exact: true })
    .waitFor();
  await p.goto(`${base}/dashboard/quotations`);
  await p.reload();
  await guide.getByRole("button", { name: "Next Step", exact: true }).click();
  assert.equal((await saved(p)).journey.step, 4);
  await guide.getByRole("button", { name: "Next Step", exact: true }).click();
  assert.equal((await saved(p)).journey.step, 4); // acceptance gate
  const quoteRow = p.locator(`[id="${quote.id}"]`);
  await quoteRow.getByRole("button", { name: "Approve & simulate send", exact: true }).click();
  await quoteRow.getByRole("button", { name: "Simulate acceptance", exact: true }).click();
  await guide.getByRole("button", { name: "Next Step", exact: true }).click();
  await dialog.getByRole("heading", { name: "Cleaning appointment", exact: true }).waitFor();
  const date = new Date();
  date.setDate(1); // current month, different time from fictional seed bookings
  const start = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01T14:00`;
  await dialog.getByLabel("Date and start time", { exact: true }).fill(start);
  await dialog.getByRole("radio", { name: "Confirmed", exact: true }).click();
  await dialog.getByRole("button", { name: /^(Save booking|Confirm Booking & Continue)$/, exact: true }).click();
  state = await saved(p);
  const booking = state.data.bookings.find((b) => b.id === state.journey.bookingId);
  assert.equal(booking.quoteId, quote.id);
  assert.equal(booking.customerId, enquiry.customerId);
  assert.equal(booking.status, "Confirmed");
  await p.getByText("Zanele Journey Test · Confirmed", { exact: true }).first().waitFor();
  await p.reload();
  await p.getByRole("heading", { name: "Bookings", exact: true }).waitFor();
  assert.equal((await saved(p)).journey.bookingId, booking.id);
  assert.equal((await saved(p)).journey.step, 5);
  // Updating an accepted quote after conversion must preserve Converted enquiry status.
  await p.goto(`${base}/dashboard/quotations`);
  await quoteRow.getByRole("button", { name: "View / edit", exact: true }).click();
  await dialog.getByRole("button", { name: "Save quotation", exact: true }).click();
  assert.equal((await saved(p)).data.enquiries.find((e) => e.id === enquiry.id).status, "Converted");
  await quoteRow.getByRole("button", { name: "View booking", exact: true }).click();
  await dialog.getByRole("button", { name: "Close", exact: true }).click();
  assert.equal((await saved(p)).data.bookings.filter((b) => b.quoteId === quote.id).length, 1);
  await guide.getByRole("button", { name: "Resume Demo", exact: true }).click();
  await dialog.getByRole("button", { name: "Close", exact: true }).click();
  await guide.getByRole("button", { name: "Next Step", exact: true }).click();
  await p.getByRole("heading", { name: "Interactive Demo", exact: true }).waitFor();
  await p.getByRole("button", { name: "Simulate message", exact: true }).click();
  assert.equal((await saved(p)).journey.reminderPreviewed, true);
  assert.ok((await p.locator("blockquote").textContent()).includes("Zanele Journey Test"));
  await guide.getByRole("button", { name: "Next Step", exact: true }).click();
  await dialog.getByRole("radio", { name: "Completed", exact: true }).click();
  await dialog.getByRole("button", { name: /^(Save booking|Confirm Booking & Continue)$/, exact: true }).click();
  await guide.getByRole("button", { name: "Next Step", exact: true }).click();
  await p.getByText("Customer journey complete", { exact: true }).waitFor();
  state = await saved(p);
  assert.equal(state.journey.completed, true);
  const labels = state.activity.map((e) => e.label);
  for (const label of [
    "New enquiry created",
    "Quotation generated",
    "Quotation accepted (simulated)",
    "Booking confirmed",
    "Reminder previewed (simulation only)",
    "Cleaning job completed",
  ])
    assert.ok(labels.includes(label), label);
  await p.getByRole("button", { name: "View customer history", exact: true }).click();
  await dialog.getByText("Completed", { exact: true }).waitFor();
  await dialog.getByRole("button", { name: "Close", exact: true }).click();
  await p.goto(`${base}/dashboard/default`);
  await p.getByText("Completed cleaning jobs", { exact: true }).waitFor();
  const completedCard = p
    .locator('[data-slot="card"]')
    .filter({ has: p.getByText("Completed cleaning jobs", { exact: true }) });
  await completedCard
    .getByText(String(original.bookings.filter((b) => b.status === "Completed").length + 1), { exact: true })
    .waitFor();
  const newRevenue = (await saved(p)).data.bookings
    .filter((b) => b.status === "Completed" && b.start.startsWith(start.slice(0, 7)))
    .reduce((sum, b) => sum + b.amount, 0);
  const oldRevenue = original.bookings
    .filter((b) => b.status === "Completed" && b.start.startsWith(start.slice(0, 7)))
    .reduce((sum, b) => sum + b.amount, 0);
  assert.equal(newRevenue, oldRevenue + booking.amount);
  const revenueCard = p
    .locator('[data-slot="card"]')
    .filter({ has: p.getByText("Completed-job Revenue This Month", { exact: true }) });
  await revenueCard
    .getByText(new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" }).format(newRevenue), {
      exact: true,
    })
    .waitFor();
  // Explore pauses guidance without removing records or restarting it.
  await p.getByRole("button", { name: "Explore Dashboard", exact: true }).click();
  assert.equal((await saved(p)).journey.paused, true);
  await p.goto(`${base}/dashboard/settings`);
  assert.equal((await saved(p)).journey.paused, true);
  await guide.getByRole("button", { name: "Resume Demo", exact: true }).click();
  await p.getByText("Customer journey complete", { exact: true }).waitFor();
  const beforeRestart = (await saved(p)).data;
  await p.getByRole("button", { name: "Restart Demonstration", exact: true }).click();
  state = await saved(p);
  assert.equal(state.journey.step, 0);
  assert.notEqual(state.journey.scenarioId, enquiry.scenarioId);
  assert.deepEqual(state.data, beforeRestart);
  // Second scenario: sample answers, repeat-click protection, and mobile view switching.
  await p.getByRole("button", { name: "Use fictional example details", exact: true }).click();
  const button = p.getByRole("button", { name: "Create Enquiry & Continue", exact: true });
  await button.evaluate((el) => {
    el.click();
    el.click();
  });
  state = await saved(p);
  const scenario = state.journey.scenarioId;
  assert.equal(state.data.enquiries.filter((e) => e.scenarioId === scenario).length, 1);
  await p.goto(`${base}/dashboard/demo`);
  mkdirSync(path.resolve(__dirname, "../../artifacts"), { recursive: true });
  await guide.getByRole("button", { name: "Minimise demo", exact: true }).click();
  await p.screenshot({ path: path.resolve(__dirname, "../../artifacts/winglo-interactive-dark.png"), fullPage: true });
  while (await p.locator("html").evaluate((e) => e.classList.contains("dark"))) {
    await p.getByRole("button", { name: /Current theme:/ }).click();
    await p.waitForTimeout(100);
  }
  await p.screenshot({
    path: path.resolve(__dirname, "../../artifacts/winglo-interactive-desktop.png"),
    fullPage: true,
  });
  await p.setViewportSize({ width: 390, height: 844 });
  await p.getByRole("tab", { name: "Customer View", exact: true }).click();
  assert.equal(await p.getByRole("button", { name: "View saved enquiry", exact: true }).isVisible(), false);
  await p.screenshot({
    path: path.resolve(__dirname, "../../artifacts/winglo-interactive-mobile.png"),
    fullPage: true,
  });
  await p.getByRole("tab", { name: "Business View", exact: true }).click();
  await p.getByRole("button", { name: "View saved enquiry", exact: true }).waitFor();
  assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await p.getByRole("button", { name: "Toggle Sidebar", exact: true }).click();
  await p.getByRole("link", { name: "Customers", exact: true }).click();
  await p.getByRole("heading", { name: "Customers", exact: true }).waitFor();
  await p.goto(`${base}/dashboard/demo`);
  for (const [service, question] of [
    ["Carpet & Upholstery Cleaning", "Number of carpeted areas"],
    ["Move-In / Move-Out Cleaning", "Property size (m²)"],
    ["Post-Renovation Cleaning", "Property size (m²)"],
    ["Office Cleaning", "Office size (m²)"],
  ]) {
    await p.getByRole("tab", { name: "Customer View", exact: true }).click();
    await p.getByRole("button", { name: "Restart conversation", exact: true }).click();
    await p.getByRole("tab", { name: "Customer View", exact: true }).click();
    await p.getByRole("radio", { name: service, exact: true }).click();
    await p.getByRole("button", { name: "Continue", exact: true }).click();
    await p.getByLabel(question, { exact: true }).waitFor();
  }
  await p.goto(`${base}/dashboard/settings`);
  await p.getByRole("button", { name: "Reset Demo Data", exact: true }).click();
  await p.getByRole("button", { name: "Confirm reset", exact: true }).click();
  state = await saved(p);
  assert.equal(state.journey, null);
  assert.deepEqual(state.activity, []);
  assert.deepEqual(errors, []);
  console.log(
    "PASS persistent journey: conversation/back/edit, live preview, route changes, pause/minimise/resume, refresh, gates, quote/booking lineage, reminder, completion/history/KPIs/activity, isolated restart, idempotency, mobile tabs/navigation, themes, reset.",
  );
  await browser.close();
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
