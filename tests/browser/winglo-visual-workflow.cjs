const assert = require("node:assert/strict");
const path = require("node:path");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const base = process.env.BASE_URL || "http://127.0.0.1:3000";
const state = (p) => p.evaluate(() => JSON.parse(localStorage.getItem("winglo-demo-v1")).state);
(async () => {
  const b = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
    args: ["--no-sandbox"],
  });
  const p = await b.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: "reduce" });
  p.setDefaultTimeout(15000);
  const errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  await p.goto(`${base}/dashboard/bookings`);
  await p.getByRole("heading", { name: "Bookings", exact: true }).waitFor();
  const initial = (await state(p)).data;
  const booking = initial.bookings.find((v) => v.status === "Pending");
  const row = p.locator(`[id="${booking.id}"]`);
  await row.getByRole("button", { name: "Confirm Booking", exact: true }).evaluate((el) => {
    el.click();
    el.click();
  });
  let saved = await state(p);
  assert.equal(saved.data.bookings.find((v) => v.id === booking.id).status, "Confirmed");
  assert.equal(saved.activity.filter((e) => e.recordId === booking.id && e.label === "Booking confirmed").length, 1);
  await p.getByRole("button", { name: "Undo", exact: true }).click();
  assert.equal((await state(p)).data.bookings.find((v) => v.id === booking.id).status, "Pending");
  await row.getByRole("button", { name: "Confirm Booking", exact: true }).click();
  await row.getByRole("button", { name: "Start Cleaning", exact: true }).click();
  assert.equal((await state(p)).data.bookings.find((v) => v.id === booking.id).status, "In Progress");
  await p.locator('[data-sonner-toast][data-front="true"]').hover();
  await p
    .locator("[data-sonner-toast]")
    .filter({ hasText: "Booking confirmed" })
    .getByRole("button", { name: "Undo", exact: true })
    .click(); // stale confirmation undo must not rewind work already started
  assert.equal((await state(p)).data.bookings.find((v) => v.id === booking.id).status, "In Progress");
  await row.getByRole("button", { name: "Complete Job", exact: true }).click();
  const modal = p.getByRole("dialog");
  await modal.getByRole("heading", { name: "Complete this cleaning job?", exact: true }).waitFor();
  assert.equal((await state(p)).data.bookings.find((v) => v.id === booking.id).status, "In Progress");
  await modal.getByRole("button", { name: "Keep In Progress", exact: true }).click();
  await row.getByRole("button", { name: "Complete Job", exact: true }).click();
  await modal.getByRole("button", { name: "Confirm Completion", exact: true }).click();
  saved = await state(p);
  assert.equal(saved.data.bookings.find((v) => v.id === booking.id).status, "Completed");
  assert.equal(
    saved.data.bookings.filter((v) => v.status === "Completed").length,
    initial.bookings.filter((v) => v.status === "Completed").length + 1,
  );
  assert.equal(
    saved.data.bookings.filter((v) => v.status === "Completed").reduce((sum, v) => sum + v.amount, 0),
    initial.bookings.filter((v) => v.status === "Completed").reduce((sum, v) => sum + v.amount, 0) + booking.amount,
  );
  await p.reload();
  await row.getByRole("button", { name: "View / reschedule", exact: true }).click();
  await modal.getByRole("list", { name: "Booking workflow", exact: true }).waitFor();
  assert.equal(await modal.getByRole("button", { name: "Complete Job", exact: true }).count(), 0);
  await modal.getByText("Cleaning started", { exact: true }).waitFor();
  await modal.getByText("Cleaning job completed", { exact: true }).waitFor();
  await modal.getByRole("button", { name: "Close", exact: true }).click();
  // Existing conflicting records must still be rejected by the central booking mutation.
  const pending = saved.data.bookings.find((v) => v.status === "Pending");
  await p.evaluate((id) => {
    const v = JSON.parse(localStorage.getItem("winglo-demo-v1"));
    const source = v.state.data.bookings.find((b) => b.id === id);
    v.state.data.bookings.push({ ...source, id: "TEST-CONFLICT", quoteId: undefined });
    localStorage.setItem("winglo-demo-v1", JSON.stringify(v));
  }, pending.id);
  await p.reload();
  await p.locator(`[id="${pending.id}"]`).getByRole("button", { name: "Confirm Booking", exact: true }).click();
  assert.equal((await state(p)).data.bookings.find((v) => v.id === pending.id).status, "Pending");
  await p
    .getByText("Choose another cleaner or time; this assignment overlaps an existing job.", { exact: true })
    .waitFor();
  await p.evaluate(() => {
    const v = JSON.parse(localStorage.getItem("winglo-demo-v1"));
    v.state.data.bookings = v.state.data.bookings.filter((b) => b.id !== "TEST-CONFLICT");
    localStorage.setItem("winglo-demo-v1", JSON.stringify(v));
  });
  await p.reload();
  await p.goto(`${base}/dashboard/default`);
  await p.getByText("Booking status at a glance", { exact: true }).waitFor();
  await p.waitForTimeout(1200);
  await p.screenshot({
    path: path.resolve(__dirname, "../../artifacts/winglo-visual-overview-dark.png"),
    fullPage: false,
  });
  while (await p.locator("html").evaluate((e) => e.classList.contains("dark"))) {
    await p.getByRole("button", { name: /Current theme:/ }).click();
    await p.waitForTimeout(100);
  }
  await p.waitForTimeout(500);
  await p.screenshot({ path: path.resolve(__dirname, "../../artifacts/winglo-visual-overview.png"), fullPage: false });
  await p.goto(`${base}/dashboard/bookings`);
  await p.locator(`[id="${booking.id}"]`).getByRole("button", { name: "View / reschedule", exact: true }).click();
  await modal.getByRole("list", { name: "Booking workflow", exact: true }).waitFor();
  await p.screenshot({ path: path.resolve(__dirname, "../../artifacts/winglo-visual-booking.png") });
  await p.setViewportSize({ width: 390, height: 844 });
  await p.screenshot({ path: path.resolve(__dirname, "../../artifacts/winglo-visual-booking-mobile.png") });
  assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  assert.ok(await modal.evaluate((e) => e.scrollWidth <= e.clientWidth + 1));
  await modal.getByRole("button", { name: "Close", exact: true }).click();
  await p.getByLabel("Filter status", { exact: true }).selectOption("Completed");
  await row.waitFor();
  assert.deepEqual(errors, []);
  console.log(
    "PASS visual booking workflow: confirm, double-click guard, undo/stale undo, start, completion confirmation/cancel, persisted completion/revenue/history, conflict rejection, status filter, overview, mobile stepper and themes.",
  );
  await b.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
