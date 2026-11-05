const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const assert = require("node:assert/strict");
const path = require("node:path");
(async () => {
  const b = await chromium.launch({ executablePath: "/usr/bin/chromium", args: ["--no-sandbox"] });
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
  p.setDefaultTimeout(15000);
  await p.goto("http://127.0.0.1:3000/dashboard/default");
  await p.getByRole("button", { name: "Try a Sample Job", exact: true }).waitFor();
  assert.equal(await p.locator("html").getAttribute("data-theme-mode"), "light");
  assert.equal(await p.locator("html").getAttribute("data-motion-preference"), "full");
  await p.getByRole("button", { name: /Current theme:/ }).click();
  await p.waitForTimeout(1300);
  assert.ok(await p.locator("html").evaluate((e) => e.classList.contains("dark")));
  await p.reload();
  assert.ok(await p.locator("html").evaluate((e) => e.classList.contains("dark")));
  await p.getByRole("button", { name: "Appearance settings", exact: true }).click();
  assert.equal(await p.getByLabel("Animation preference", { exact: true }).count(), 0);
  await p.keyboard.press("Escape");
  await p.evaluate(() => localStorage.setItem("noreva-motion", "reduced"));
  await p.reload();
  assert.equal(await p.locator("html").getAttribute("data-motion-preference"), "full");
  await p.locator("[data-motion-run]").first().waitFor();
  for (const route of ["default", "enquiries", "quotations", "bookings", "customers", "settings", "demo"]) {
    await p.goto(`http://127.0.0.1:3000/dashboard/${route}`);
    await p.waitForTimeout(700);
    assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), route);
  }
  await p.goto("http://127.0.0.1:3000/dashboard/enquiries");
  await p.getByRole("button", { name: "New enquiry", exact: true }).click();
  const dialog = p.getByRole("dialog");
  await dialog.getByRole("button", { name: "Use fictional details", exact: true }).click();
  await dialog.getByRole("button", { name: "Submit enquiry", exact: true }).click();
  const job = p.getByRole("main", { name: "Customer job workspace", exact: true });
  await job.getByRole("button", { name: "Prepare Quote", exact: true }).waitFor();
  await p.screenshot({ path: path.resolve(__dirname, "../../artifacts/winglo-mobile-ready.png") });
  await b.close();
  console.log(
    "PASS light default, saved dark toggle, always-full motion including legacy reduced setting, seven mobile routes, mobile booking details and width",
  );
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
