const assert = require("node:assert/strict");
const path = require("node:path");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const base = process.env.BASE_URL || "http://127.0.0.1:3000";
(async () => {
  const browser = await chromium.launch({ executablePath: "/usr/bin/chromium", args: ["--no-sandbox"] });
  const p = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  p.setDefaultTimeout(20000);
  const errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  const state = () => p.evaluate(() => JSON.parse(localStorage.getItem("winglo-demo-v1")).state);
  await p.goto(`${base}/dashboard/jobs`);
  const main = p.getByRole("main", { name: "Jobs workspace", exact: true });
  await main.getByRole("heading", { name: "Jobs", exact: true }).waitFor();
  const original = (await state()).data;
  const expected =
    original.bookings.length + original.quotes.filter((q) => !original.bookings.some((b) => b.quoteId === q.id)).length;
  assert.equal(await p.locator(".winglo-record-card").count(), expected);
  assert.ok(expected > 1);
  await p.waitForTimeout(1800);
  await p.screenshot({ path: path.resolve(__dirname, "../../artifacts/winglo-premium-jobs-desktop.png") });
  const first = original.bookings[0];
  await p.getByLabel("Search jobs", { exact: true }).fill(first.id);
  assert.equal(await p.locator(".winglo-record-card").count(), 1);
  await main.getByRole("link", { name: "Open Job", exact: true }).click();
  await p.getByRole("main", { name: "Customer job workspace", exact: true }).waitFor();
  await p.getByRole("button", { name: "All jobs", exact: true }).click();
  await main.getByRole("heading", { name: "Jobs", exact: true }).waitFor();
  await p.getByLabel("Job status", { exact: true }).selectOption("Completed");
  assert.equal(
    await p.locator(".winglo-record-card").count(),
    original.bookings.filter((b) => b.status === "Completed").length,
  );
  await p.getByLabel("Search jobs", { exact: true }).fill("No matching customer");
  await p.getByText("No matching records", { exact: true }).waitFor();
  await p.reload();
  assert.deepEqual((await state()).data, original);
  const sameCustomerJob = original.bookings.find((b) => b.id !== first.id && b.customerId === first.customerId);
  assert.ok(sameCustomerJob);
  for (const record of [first, sameCustomerJob]) {
    await p.goto(`${base}/dashboard/jobs`);
    await p.getByLabel("Search jobs", { exact: true }).fill(record.id);
    await p.getByRole("link", { name: "Open Job", exact: true }).click();
    await p.getByRole("main", { name: "Customer job workspace", exact: true }).waitFor();
    assert.ok(p.url().endsWith(record.id));
    await p.reload();
    await p
      .getByRole("heading", { name: original.customers.find((c) => c.id === record.customerId).name, exact: true })
      .waitFor();
  }
  assert.deepEqual((await state()).data, original);
  for (const [route, label] of [
    ["enquiries", "Mobile enquiries"],
    ["quotations", "Mobile quotations"],
    ["customers", "Mobile customers"],
  ]) {
    await p.goto(`${base}/dashboard/${route}`);
    await p.getByRole("region", { name: label, exact: true }).waitFor();
    await p.waitForTimeout(1800);
    await p.screenshot({ path: path.resolve(__dirname, `../../artifacts/winglo-premium-${route}.png`) });
    await p.getByRole("button", { name: "Table view", exact: true }).click();
    await p.getByRole("table").waitFor();
    await p.getByRole("button", { name: "Card view", exact: true }).click();
    assert.ok((await p.locator(".winglo-record-card:visible").count()) > 0);
  }
  await p.goto(`${base}/dashboard/demo`);
  await p.getByRole("button", { name: "Start Sample Job", exact: true }).click();
  const choice = p.getByRole("radio", { name: "Home Deep Cleaning", exact: true });
  // The existing Radix single ToggleGroup exposes radio semantics.
  await choice.click();
  assert.equal(await choice.getAttribute("data-state"), "on");
  assert.equal(
    await choice.locator("[data-selection-check]").evaluate((e) => getComputedStyle(e).visibility),
    "visible",
  );
  const selected = await choice.evaluate((e) => ({
    bg: getComputedStyle(e).backgroundColor,
    border: getComputedStyle(e).borderColor,
  }));
  assert.notEqual(selected.bg, "rgba(0, 0, 0, 0)");
  await p.getByRole("button", { name: "Continue", exact: true }).click();
  const bedrooms = p.getByLabel("Number of bedrooms", { exact: true });
  await bedrooms.fill("3");
  await p.getByRole("button", { name: "Increase number of bedrooms", exact: true }).click();
  assert.equal(await bedrooms.inputValue(), "4");
  await p.getByRole("button", { name: "Decrease number of bedrooms", exact: true }).click();
  assert.equal(await bedrooms.inputValue(), "3");
  await bedrooms.fill("-1");
  assert.equal(await bedrooms.evaluate((e) => e.checkValidity()), false);
  await bedrooms.fill("1.5");
  assert.equal(await bedrooms.evaluate((e) => e.checkValidity()), false);
  await bedrooms.fill("0");
  assert.equal(await p.getByRole("button", { name: "Decrease number of bedrooms", exact: true }).isDisabled(), true);
  await bedrooms.fill("3");
  await p.reload();
  assert.equal(await bedrooms.inputValue(), "3");
  await p.setViewportSize({ width: 390, height: 844 });
  await p.waitForTimeout(1800);
  await p.screenshot({ path: path.resolve(__dirname, "../../artifacts/winglo-premium-demo-mobile.png") });
  await p.getByRole("button", { name: "Continue", exact: true }).click();
  await p.getByLabel("Number of bathrooms", { exact: true }).fill("2");
  await p.getByRole("button", { name: "Continue", exact: true }).click();
  const size = p.getByLabel("Property size (m²)", { exact: true });
  await size.fill("120.5");
  assert.equal(await size.evaluate((e) => e.checkValidity()), true, "Measurements retain decimal input");
  await p.getByRole("button", { name: "Continue", exact: true }).click();
  const yes = p.getByRole("radio", { name: "Yes", exact: true });
  await yes.click();
  assert.equal(await yes.getAttribute("data-state"), "on");
  await yes.scrollIntoViewIfNeeded();
  await p.waitForTimeout(800);
  await p.screenshot({ path: path.resolve(__dirname, "../../artifacts/winglo-premium-demo-selection.png") });
  await p.getByRole("button", { name: /Current theme:/ }).click();
  await p.waitForTimeout(1200);
  assert.ok(await p.locator("html").evaluate((e) => e.classList.contains("dark")));
  await p.waitForTimeout(1800);
  await p.screenshot({ path: path.resolve(__dirname, "../../artifacts/winglo-premium-demo-dark.png") });
  for (const route of ["jobs", "enquiries", "quotations", "customers"]) {
    await p.goto(`${base}/dashboard/${route}`);
    await p.locator(".winglo-record-card").first().waitFor();
    assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), route);
    await p.waitForTimeout(1800);
    await p.screenshot({ path: path.resolve(__dirname, `../../artifacts/winglo-premium-${route}-mobile-dark.png`) });
  }
  assert.deepEqual((await state()).data, original);
  assert.deepEqual(errors, []);
  console.log(
    "PASS premium UI: Jobs grouping/filter/search/navigation, cards/table access, grey selection/checkmark, count typing/stepper/bounds, refresh, mobile/dark, preserved data.",
  );
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
