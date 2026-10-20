// Measures foot lock error, pelvis bob, and stance slip while the player walks a route.
import puppeteer from "puppeteer-core";

const browser = await puppeteer.launch({
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  headless: true,
  args: ["--use-angle=d3d11", "--enable-webgl", "--ignore-gpu-blocklist"],
  defaultViewport: { width: 900, height: 600, deviceScaleFactor: 1 },
});
const page = await browser.newPage();
page.on("pageerror", (err) => console.log("ERR", err.message));
await page.goto("http://localhost:5173/", { waitUntil: "networkidle0", timeout: 30000 });
await page.waitForFunction(() => document.body.dataset.ready === "1", { timeout: 15000 });
await new Promise((r) => setTimeout(r, 300));

const result = await page.evaluate(async () => {
  const ed = window.__room.editor;
  const p = ed.player;
  const route = [
    [3.2, 5.7],
    [6.2, 5.9],
    [6.2, 4.3],
    [3.9, 4.6],
  ];
  const stats = { frames: 0, maxLock: 0, maxSlip: 0, minPelvis: 9, maxPelvis: 0, maxStep: 0, stuck: 0, maxJump: 0 };
  const lastPlant = [null, null];
  const lastFoot = [null, null];
  let lastPelvis = null;
  const sample = () => {
    const w = p.walker;
    const a = p.avatar;
    a.root.updateMatrixWorld(true);
    for (let i = 0; i < 2; i++) {
      const f = w.feet[i];
      const v = a.ankle[i].getWorldPosition(new f.pos.constructor());
      const err = Math.hypot(v.x - f.pos.x, v.y - (f.pos.y + 0.08), v.z - f.pos.z);
      stats.maxLock = Math.max(stats.maxLock, err);
      if (!f.swing && lastFoot[i] && !lastFoot[i].swing) {
        const slip = Math.hypot(f.pos.x - lastFoot[i].x, f.pos.z - lastFoot[i].z);
        stats.maxSlip = Math.max(stats.maxSlip, slip);
      }
      lastFoot[i] = { x: f.pos.x, z: f.pos.z, swing: f.swing };
    }
    const py = w.pelvisY;
    stats.minPelvis = Math.min(stats.minPelvis, py);
    stats.maxPelvis = Math.max(stats.maxPelvis, py);
    if (lastPelvis !== null) stats.maxJump = Math.max(stats.maxJump, Math.abs(py - lastPelvis));
    lastPelvis = py;
    stats.frames++;
  };
  for (const [x, z] of route) {
    p.walkTo(x, z);
    const t0 = performance.now();
    while (p.target && performance.now() - t0 < 9000) {
      await new Promise((r) => requestAnimationFrame(r));
      sample();
    }
    if (p.target) stats.stuck++;
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => requestAnimationFrame(r));
      sample();
    }
  }
  return { stats, end: { x: p.x, z: p.z } };
});
console.log(JSON.stringify(result, null, 1));
await browser.close();
