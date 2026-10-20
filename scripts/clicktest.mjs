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
await page.goto("http://localhost:5173/", { waitUntil: "networkidle0", timeout: 30000 });
await page.waitForFunction(() => document.body.dataset.ready === "1", { timeout: 15000 });
await new Promise((r) => setTimeout(r, 400));

const state = () =>
  page.evaluate(() => {
    const p = window.__room.editor.player;
    return { x: +p.x.toFixed(2), z: +p.z.toFixed(2), target: p.target ? [+p.target.x.toFixed(2), +p.target.z.toFixed(2)] : null };
  });
// project a world point to screen
const toScreen = (x, y, z) =>
  page.evaluate(
    (x, y, z) => {
      const { camera, renderer } = window.__room.world;
      const v = new camera.position.constructor(x, y, z).project(camera);
      const r = renderer.domElement.getBoundingClientRect();
      return { x: r.left + ((v.x + 1) / 2) * r.width, y: r.top + ((1 - v.y) / 2) * r.height };
    },
    x,
    y,
    z,
  );
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const out = {};

out.start = await state();
let pt = await toScreen(3.2, 0.05, 5.6);
await page.mouse.click(pt.x, pt.y);
await wait(150);
out.afterFloorClick = await state();
await wait(2600);
out.arrived = await state();

// click on bench item: selection, no walk
pt = await toScreen(0.4, 0.3, 3.9);
const before = await state();
await page.mouse.click(pt.x, pt.y);
await wait(150);
out.afterBenchClick = { before, after: await state() };

// move tool: no walking
await page.click('[data-act="move"]');
pt = await toScreen(5.5, 0.05, 5.5);
await page.mouse.click(pt.x, pt.y);
await wait(150);
out.moveToolClick = await state();
await page.click('[data-act="move"]');

// place mode: click places, no walking
await page.click('[data-kind="cup"]');
await wait(100);
pt = await toScreen(6.0, 0.05, 5.0);
await page.mouse.move(pt.x, pt.y);
await page.mouse.click(pt.x, pt.y);
await wait(200);
out.placeClick = await state();
out.items = await page.evaluate(() => window.__room.editor.items.length);
await page.keyboard.press("Escape");

// click inside the table (blocked)
pt = await toScreen(4.25, 0.5, 2.4);
await page.mouse.click(pt.x, pt.y);
await wait(150);
out.tableClick = await state();

// cat edge: click right on the cat should select it
out.errors = errors;
console.log(JSON.stringify(out, null, 1));
await browser.close();
