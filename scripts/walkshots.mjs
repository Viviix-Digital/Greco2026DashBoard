// Usage: node scripts/walkshots.mjs prefix tx tz frames intervalMs zoom [night]
import puppeteer from "puppeteer-core";

const [, , prefix = "walk", tx = "3", tz = "5.4", frames = "6", gap = "160", zoom = "3.6", night = "0"] = process.argv;

const browser = await puppeteer.launch({
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  headless: true,
  args: ["--use-angle=d3d11", "--enable-webgl", "--ignore-gpu-blocklist"],
  defaultViewport: { width: 760, height: 560, deviceScaleFactor: 1 },
});
const page = await browser.newPage();
page.on("console", (msg) => {
  if (msg.type() === "error" || msg.type() === "log") console.log("PAGE", msg.type(), msg.text());
});
page.on("pageerror", (err) => console.log("ERR", err.message));
await page.goto("http://localhost:5173/", { waitUntil: "networkidle0", timeout: 30000 });
await page.waitForFunction(() => document.body.dataset.ready === "1", { timeout: 15000 });
await new Promise((r) => setTimeout(r, 400));
if (night === "1") {
  await page.click('[data-act="day"]');
  await new Promise((r) => setTimeout(r, 700));
}
await page.evaluate((zm) => {
  const { camera, scene } = window.__room.world;
  const player = window.__room.editor.player;
  const yaw = (48 * Math.PI) / 180;
  const elev = (30 * Math.PI) / 180;
  const follow = () => {
    const tx = player.x;
    const tz = player.z;
    camera.position.set(
      tx + 32 * Math.cos(elev) * Math.sin(yaw),
      0.55 + 32 * Math.sin(elev),
      tz + 32 * Math.cos(elev) * Math.cos(yaw),
    );
    camera.lookAt(tx, 0.55, tz);
    camera.zoom = zm;
    camera.updateProjectionMatrix();
    requestAnimationFrame(follow);
  };
  follow();
  document.querySelectorAll("button, .hud, aside, header, nav").forEach(() => {});
}, Number(zoom));
await page.evaluate(
  (x, z) => {
    window.__room.editor.player.walkTo(x, z);
  },
  Number(tx),
  Number(tz),
);
for (let i = 0; i < Number(frames); i++) {
  await new Promise((r) => setTimeout(r, Number(gap)));
  await page.screenshot({ path: `${prefix}-${i}.png` });
  const info = await page.evaluate(() => {
    const p = window.__room.editor.player;
    return { x: +p.x.toFixed(2), z: +p.z.toFixed(2), h: +p.heading.toFixed(2), v: +p.speed.toFixed(2), tgt: !!p.target };
  });
  console.log(i, JSON.stringify(info));
}
await browser.close();
