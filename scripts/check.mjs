import puppeteer from "puppeteer-core";

const browser = await puppeteer.launch({
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  headless: true,
  args: ["--use-angle=d3d11", "--enable-webgl", "--ignore-gpu-blocklist"],
  defaultViewport: { width: 1440, height: 860, deviceScaleFactor: 1 },
});
const page = await browser.newPage();
const errors = [];
page.on("pageerror", (err) => errors.push(err.message));
await page.goto("http://localhost:5173/", { waitUntil: "networkidle0" });
await page.waitForFunction(() => document.body.dataset.ready === "1");
await new Promise((r) => setTimeout(r, 400));

const view = () => page.evaluate(() => window.__room.editor.view());
const count = () => page.evaluate(() => window.__room.editor.items.length);

const start = await view();
const startCount = await count();
await page.click('[data-act="zoom-in"]');
await new Promise((r) => setTimeout(r, 300));
const zoomed = await view();
await page.click('[data-act="day"]');
await new Promise((r) => setTimeout(r, 500));
const night = await view();
await page.click('[data-kind="cup"]');
await new Promise((r) => setTimeout(r, 100));
await page.mouse.click(860, 520);
await new Promise((r) => setTimeout(r, 400));
const placed = await count();
const placing = await view();
await page.keyboard.press("Delete");
await new Promise((r) => setTimeout(r, 400));
const afterDelete = await count();
await page.click('[data-act="undo"]');
await new Promise((r) => setTimeout(r, 200));
const afterUndo = await count();
await page.click('[data-act="grid"]');
const grid = await view();
await page.click('[data-act="home"]');
await new Promise((r) => setTimeout(r, 300));
const home = await view();

console.log(JSON.stringify({
  start,
  startCount,
  zoomed: zoomed.zoom,
  night: night.night,
  placed,
  placeKind: placing.placeKind,
  afterDelete,
  afterUndo,
  grid: grid.grid,
  home: home.zoom,
  errors,
}, null, 2));

await page.screenshot({ path: "shot-check.png" });
await browser.close();
