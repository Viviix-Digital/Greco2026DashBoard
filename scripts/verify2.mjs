import puppeteer from "puppeteer-core";

/** Edge states: people leaving the frame, a lost connection, a dead server. `node scripts/verify2.mjs` */
const browser = await puppeteer.launch({
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  headless: true,
  args: ["--use-angle=d3d11", "--enable-webgl", "--ignore-gpu-blocklist"],
  defaultViewport: { width: 1440, height: 860, deviceScaleFactor: 1 },
});
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const out = {};

// 1) mock: empty frame removes avatars after the grace period
{
  const page = await browser.newPage();
  const bad = [];
  page.on("response", (r) => r.status() >= 400 && bad.push(`${r.status()} ${r.url()}`));
  await page.goto("http://localhost:5173/?mock=1", { waitUntil: "networkidle0" });
  await page.waitForFunction(() => document.body.dataset.ready === "1");
  await wait(2500);
  out.before = await page.evaluate(() => window.__room.stage.count);
  await page.evaluate(() => {
    const { store } = window.__room;
    // stop mock traffic, then send an empty frame
    for (let i = 1; i < 10000; i++) clearInterval(i);
    store.ingest({ type: "people", ts: Date.now() / 1000, cameras: [{ id: "camera_1", frame_size: [1920, 1080], people: [] }] });
  });
  await wait(150);
  out.at150ms = await page.evaluate(() => window.__room.stage.count);
  await wait(500);
  out.at650ms = await page.evaluate(() => window.__room.stage.count);
  out.emptyList = await page.$eval("[data-people]", (el) => el.textContent.trim().replace(/\s+/g, " "));
  out.badResponses = bad;
  await page.screenshot({ path: "shots/live-empty.png" });
  await page.close();
}

// 2) real socket, nothing listening: retry countdown shows, no crash
{
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("http://localhost:5173/", { waitUntil: "networkidle0" });
  await page.waitForFunction(() => document.body.dataset.ready === "1");
  await wait(1500);
  out.deadServerConn = await page.$eval("[data-conn-text]", (el) => el.textContent);
  out.deadServerPeople = await page.$eval("[data-people]", (el) => el.textContent.trim().replace(/\s+/g, " "));
  await page.screenshot({ path: "shots/live-offline.png" });

  // settings persist and reconnect
  await page.click('[data-act="settings"]');
  await page.$eval('[data-f="host"]', (el) => (el.value = ""));
  await page.type('[data-f="host"]', "127.0.0.1");
  await page.$eval('[data-f="port"]', (el) => (el.value = ""));
  await page.type('[data-f="port"]', "8123");
  await page.click('[data-act="save-config"]');
  await wait(300);
  out.saved = await page.evaluate(() => localStorage.getItem("vision-expo-config"));
  out.panelClosed = await page.$eval('[data-panel="settings"]', (el) => el.hidden);
  out.errors = errors;
  await page.close();
}

console.log(JSON.stringify(out, null, 1));
await browser.close();
