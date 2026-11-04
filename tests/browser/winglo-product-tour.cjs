const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const path = require("node:path");
const assert = require("node:assert/strict");
(async () => {
  const b = await chromium.launch({ executablePath: "/usr/bin/chromium", args: ["--no-sandbox"] });
  const p = await b.newPage({ reducedMotion: "reduce" });
  p.setDefaultTimeout(15000);
  await p.goto("http://127.0.0.1:3000/dashboard/default");
  await p.getByRole("button", { name: "Take a Guided Tour", exact: true }).click();
  const panel = p.getByRole("region", { name: "Product tour", exact: true });
  await p.locator("[data-product-spotlight]").waitFor();
  await p.screenshot({ path: path.resolve(__dirname, "../../artifacts/winglo-product-tour-desktop.png") });
  await panel.getByRole("button", { name: "Next", exact: true }).click();
  await panel.getByRole("button", { name: "Back", exact: true }).click();
  await panel.getByRole("button", { name: "Restart Tour", exact: true }).click();
  await panel.getByRole("button", { name: "Next", exact: true }).click();
  await panel.getByRole("button", { name: "Next", exact: true }).click();
  await panel.getByRole("button", { name: "Try it now", exact: true }).click();
  await p.getByRole("heading", { name: "Interactive Demo", exact: true }).waitFor();
  await p.getByRole("button", { name: "Use fictional example details", exact: true }).click();
  await p.getByRole("button", { name: "Create Enquiry & Continue", exact: true }).click();
  await p.getByRole("heading", { name: "Enquiries", exact: true }).waitFor();
  const before = await p.evaluate(() => JSON.parse(localStorage.getItem("winglo-demo-v1")).state);
  await panel.getByRole("button", { name: "Continue the tour", exact: true }).click();
  await panel.getByRole("button", { name: "Skip", exact: true }).click();
  await p.reload();
  assert.equal(await panel.count(), 0);
  const after = await p.evaluate(() => JSON.parse(localStorage.getItem("winglo-demo-v1")).state);
  assert.equal(before.journey.scenarioId, after.journey.scenarioId);
  assert.equal(before.journey.enquiryId, after.journey.enquiryId);
  assert.equal(before.journey.step, after.journey.step);
  assert.deepEqual(before.data, after.data);
  await p.setViewportSize({ width: 390, height: 844 });
  await p.getByRole("button", { name: "Take a Guided Tour", exact: true }).click();
  await panel.getByRole("button", { name: "Restart Tour", exact: true }).click();
  assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await p.waitForTimeout(800);
  await p.screenshot({ path: path.resolve(__dirname, "../../artifacts/winglo-product-tour-mobile.png") });
  console.log(
    "PASS tour navigation, highlight, back/restart, live transition, skip/refresh, demo/data preservation and phone width",
  );
  await b.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
