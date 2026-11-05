const assert = require("node:assert/strict");
const path = require("node:path");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
(async () => {
  const browser = await chromium.launch({ executablePath: "/usr/bin/chromium", args: ["--no-sandbox"] });
  const p = await browser.newPage({ viewport: { width: 390, height: 844 } });
  p.setDefaultTimeout(15000);
  const errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  await p.goto("http://127.0.0.1:3000/dashboard/default");
  await p.getByRole("button", { name: "Help · Product Tour", exact: true }).last().click();
  const tour = p.getByRole("region", { name: "Product tour", exact: true });
  await tour.getByRole("button", { name: "Next", exact: true }).click();
  await tour.getByRole("button", { name: "Next", exact: true }).click();
  await tour.getByRole("button", { name: "Try it now", exact: true }).click();
  await p.getByRole("heading", { name: "Tell us about your clean.", exact: true }).waitFor();
  const demo = p.getByRole("complementary", { name: "Guided demo progress" });
  assert.equal(await demo.count(), 0);
  assert.equal(await tour.count(), 1);
  await p.getByRole("button", { name: "Use Sample Details", exact: true }).click();
  await p.getByRole("button", { name: "Send Enquiry to Inbox", exact: true }).click();
  await p.getByRole("heading", { name: "Enquiries / Inbox", exact: true }).waitFor();
  const arrived = await p.evaluate(() => JSON.parse(localStorage.getItem("winglo-demo-v1")).state);
  await p
    .locator(`[id="mobile-${arrived.journey.enquiryId}"]`)
    .getByRole("button", { name: "Prepare Quote", exact: true })
    .click();
  await p
    .getByRole("main", { name: "Customer job workspace", exact: true })
    .getByRole("button", { name: "Review & Send Quote", exact: true })
    .waitFor();
  const before = await p.evaluate(() => JSON.parse(localStorage.getItem("winglo-demo-v1")).state);
  await p.reload();
  await tour.waitFor();
  assert.equal(await demo.count(), 0);
  await p.waitForTimeout(600);
  await p.screenshot({ path: path.resolve(__dirname, "../../artifacts/winglo-mobile-combined-guide.png") });
  await tour.getByRole("button", { name: "Continue the tour", exact: true }).click();
  await tour.getByRole("heading", { name: "Enquiries / Inbox: respond to requests", exact: true }).waitFor();
  await tour.getByRole("button", { name: "Next", exact: true }).click();
  await tour.getByRole("heading", { name: "Jobs: manage the cleaning work", exact: true }).waitFor();
  assert.equal(await demo.count(), 0);
  const after = await p.evaluate(() => JSON.parse(localStorage.getItem("winglo-demo-v1")).state);
  assert.equal(before.journey.step, after.journey.step);
  assert.equal(before.journey.enquiryId, after.journey.enquiryId);
  assert.deepEqual(before.data, after.data);
  await tour.getByRole("button", { name: "Skip", exact: true }).click();
  assert.equal(await demo.count(), 0);
  assert.equal(await tour.count(), 0);
  assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  assert.deepEqual(errors, []);
  console.log(
    "PASS single mobile guide, live participation, refresh, return to product tour, skip, record/stage preservation and phone width",
  );
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
