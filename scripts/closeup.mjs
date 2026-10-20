// Usage: node scripts/closeup.mjs out.png x y z zoom [night] [js to run first]
import puppeteer from "puppeteer-core";

const [, , out = "closeup.png", x = "4.3", y = "0.6", z = "5.2", zoom = "3.4", night = "0", pre = ""] = process.argv;

const browser = await puppeteer.launch({
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  headless: true,
  args: ["--use-angle=d3d11", "--enable-webgl", "--ignore-gpu-blocklist"],
  defaultViewport: { width: 1000, height: 700, deviceScaleFactor: 1 },
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
if (pre) {
  await page.evaluate(pre);
  await new Promise((r) => setTimeout(r, 900));
}
await page.evaluate(
  (tx, ty, tz, zm) => {
    const { camera } = window.__room.world;
    const yaw = (48 * Math.PI) / 180;
    const elev = (30 * Math.PI) / 180;
    const d = 32;
    camera.position.set(
      tx + d * Math.cos(elev) * Math.sin(yaw),
      ty + d * Math.sin(elev),
      tz + d * Math.cos(elev) * Math.cos(yaw),
    );
    camera.lookAt(tx, ty, tz);
    camera.zoom = zm;
    camera.updateProjectionMatrix();
  },
  Number(x),
  Number(y),
  Number(z),
  Number(zoom),
);
await new Promise((r) => setTimeout(r, 300));
await page.screenshot({ path: out });
await browser.close();
