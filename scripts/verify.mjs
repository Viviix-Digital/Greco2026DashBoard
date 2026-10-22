import { mkdirSync } from "node:fs";
import puppeteer from "puppeteer-core";

/** End-to-end check of the live view against the mock feed: `node scripts/verify.mjs [url]`. */
const url = process.argv[2] || "http://localhost:5173/?mock=1";
mkdirSync("shots", { recursive: true });

const browser = await puppeteer.launch({
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  headless: true,
  args: ["--use-angle=d3d11", "--enable-webgl", "--ignore-gpu-blocklist"],
  defaultViewport: { width: 1440, height: 860, deviceScaleFactor: 1 },
});
const page = await browser.newPage();
const errors = [];
page.on("pageerror", (err) => errors.push(err.message));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const text = (sel) => page.$eval(sel, (el) => el.textContent.trim().replace(/\s+/g, " "));
const out = {};

await page.goto(url, { waitUntil: "networkidle0", timeout: 30000 });
await page.waitForFunction(() => document.body.dataset.ready === "1", { timeout: 15000 });
await wait(2500);
await page.screenshot({ path: "shots/live-1.png" });

out.conn = await text("[data-conn-text]");
out.stats = await text("[data-stats]");
out.peopleCount = await page.$$eval(".person", (els) => els.length);
out.avatars = await page.evaluate(() => window.__room.stage.count);

// select the first person from the list
await page.click(".person");
await wait(200);
out.detailVisible = await page.$eval("[data-detail]", (el) => !el.hidden);
out.detail = await text("[data-detail]");
out.selectedRing = await page.evaluate(() => window.__room.store.selected);
await page.screenshot({ path: "shots/live-2.png" });

// select via 3D click: project the first avatar head to the screen
const pt = await page.evaluate(() => {
  const { store, world } = window.__room;
  const p = store.people()[1] ?? store.people()[0];
  const stage = window.__room.stage;
  const a = stage.avatars.get(p.key);
  const v = a.hit.getWorldPosition(new a.hit.position.constructor()).project(world.camera);
  const r = world.renderer.domElement.getBoundingClientRect();
  return { key: p.key, x: r.left + ((v.x + 1) / 2) * r.width, y: r.top + ((1 - v.y) / 2) * r.height };
});
await page.mouse.click(pt.x, pt.y);
await wait(150);
out.pickedByCanvas = await page.evaluate((k) => window.__room.store.selected === k, pt.key);

// camera switch
const options = await page.$$eval("[data-camera] option", (els) => els.map((o) => o.value));
out.cameraOptions = options;
await page.select("[data-camera]", "camera_2");
await wait(1200);
out.cam2People = await page.$$eval(".person", (els) => els.length);
out.cam2Avatars = await page.evaluate(() => window.__room.stage.count);
await page.screenshot({ path: "shots/live-3.png" });
await page.select("[data-camera]", "camera_1");
await wait(800);

// day / night, zoom, settings
await page.click('[data-act="day"]');
await wait(700);
await page.screenshot({ path: "shots/live-night.png" });
await page.click('[data-act="day"]');
await page.click('[data-act="zoom-in"]');
await wait(400);
out.zoom = await text("[data-zoom]");
await page.click('[data-act="home"]');
await page.click('[data-act="settings"]');
await wait(200);
out.settingsOpen = await page.$eval('[data-panel="settings"]', (el) => !el.hidden);
await page.screenshot({ path: "shots/live-settings.png" });
await page.click('[data-act="settings"]');

// wait for a weapon alert from the mock
try {
  await page.waitForFunction(() => !document.querySelector("[data-banner]").hidden, { timeout: 20000 });
  out.banner = await text("[data-banner]");
  await page.screenshot({ path: "shots/live-alert.png" });
} catch {
  out.banner = "no alert banner within 20s";
}
out.feed = await text("[data-feed]");

// a person leaving the frame has to lose its avatar and list row
out.avatarsEnd = await page.evaluate(() => window.__room.stage.count);

// narrow viewport
await page.setViewport({ width: 700, height: 800, deviceScaleFactor: 1 });
await wait(500);
await page.screenshot({ path: "shots/live-narrow.png" });

out.errors = errors;
console.log(JSON.stringify(out, null, 1));
await browser.close();
