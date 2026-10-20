// Walks routes that cut through furniture and reports penetration depth and progress.
import puppeteer from "puppeteer-core";

const browser = await puppeteer.launch({
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  headless: true,
  args: ["--use-angle=d3d11", "--enable-webgl", "--ignore-gpu-blocklist"],
  defaultViewport: { width: 900, height: 600, deviceScaleFactor: 1 },
});
const page = await browser.newPage();
const errors = [];
page.on("pageerror", (err) => errors.push(err.message));
await page.goto("http://localhost:5173/", { waitUntil: "networkidle0", timeout: 30000 });
await page.waitForFunction(() => document.body.dataset.ready === "1", { timeout: 15000 });
await new Promise((r) => setTimeout(r, 300));

const result = await page.evaluate(async () => {
  const ed = window.__room.editor;
  const p = ed.player;
  const routes = [
    [4.2, 1.2],
    [1.9, 2.3],
    [1.2, 4.4],
    [5.9, 2.1],
    [3.4, 4.9],
    [0.3, 0.3],
    [6.9, 6.1],
  ];
  const out = [];
  let worst = 0;
  const depth = () => {
    const env = ed.collisionEnv();
    let d = 0;
    for (const o of env.obstacles) {
      const dx = p.x - o.x;
      const dz = p.z - o.z;
      if (o.round) {
        d = Math.max(d, Math.max(o.hw, o.hd) + 0.2 - Math.hypot(dx, dz));
      } else {
        const c = Math.cos(o.rot);
        const s = Math.sin(o.rot);
        const lx = dx * c - dz * s;
        const lz = dx * s + dz * c;
        const ex = Math.max(0, Math.abs(lx) - o.hw);
        const ez = Math.max(0, Math.abs(lz) - o.hd);
        const dist = Math.hypot(ex, ez);
        const inside = Math.abs(lx) < o.hw && Math.abs(lz) < o.hd;
        d = Math.max(d, inside ? 0.2 + Math.min(o.hw - Math.abs(lx), o.hd - Math.abs(lz)) : 0.2 - dist);
      }
    }
    return d;
  };
  for (const [x, z] of routes) {
    const ok = p.walkTo(x, z);
    const tgt = p.target ? { ...p.target } : null;
    const t0 = performance.now();
    while (p.target && performance.now() - t0 < 20000) {
      await new Promise((r) => requestAnimationFrame(r));
      worst = Math.max(worst, depth());
    }
    out.push({ asked: [x, z], accepted: ok, tgt, end: [+p.x.toFixed(2), +p.z.toFixed(2)], ms: Math.round(performance.now() - t0) });
  }
  return { out, worstPenetration: +worst.toFixed(3) };
});
result.errors = errors;
console.log(JSON.stringify(result, null, 1));
await browser.close();
