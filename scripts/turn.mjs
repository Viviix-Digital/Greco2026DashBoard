// Usage: node scripts/turn.mjs out.png zoom [night] [who]
// Turnaround contact sheet: the player (or a resident) at four headings, cropped around the figure.
import puppeteer from "puppeteer-core";

const [, , out = "turn.png", zoom = "9", night = "0", who = "player"] = process.argv;

const browser = await puppeteer.launch({
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  headless: true,
  args: ["--use-angle=d3d11", "--enable-webgl", "--ignore-gpu-blocklist"],
  defaultViewport: { width: 1000, height: 700, deviceScaleFactor: 1 },
});
const page = await browser.newPage();
page.on("pageerror", (err) => console.log("ERR", err.message));
await page.goto("http://localhost:5173/", { waitUntil: "networkidle0", timeout: 30000 });
await page.waitForFunction(() => document.body.dataset.ready === "1", { timeout: 15000 });
await new Promise((r) => setTimeout(r, 400));
if (night === "1") {
  await page.click('[data-act="day"]');
  await new Promise((r) => setTimeout(r, 700));
}
const shots = [];
const headings = [0.84, 0.84 + Math.PI / 2, 0.84 + Math.PI, 0.84 - Math.PI / 2];
for (const h of headings) {
  await page.evaluate(
    (hh, zm, who) => {
      const room = window.__room;
      const p = room.editor.player;
      p.heading = hh;
      const { camera } = room.world;
      const yaw = (48 * Math.PI) / 180;
      const elev = (30 * Math.PI) / 180;
      const d = 32;
      const tx = p.x;
      const ty = 0.5;
      const tz = p.z;
      camera.position.set(
        tx + d * Math.cos(elev) * Math.sin(yaw),
        ty + d * Math.sin(elev),
        tz + d * Math.cos(elev) * Math.cos(yaw),
      );
      camera.lookAt(tx, ty, tz);
      camera.zoom = zm;
      camera.updateProjectionMatrix();
    },
    h,
    Number(zoom),
    who,
  );
  await new Promise((r) => setTimeout(r, 450));
  shots.push((await page.screenshot({ encoding: "base64", clip: { x: 300, y: 30, width: 400, height: 640 } })));
}
const sheet = await browser.newPage();
await sheet.setViewport({ width: 1600, height: 640 });
await sheet.setContent(
  `<body style="margin:0;background:#222;display:flex">${shots
    .map((s) => `<img style="width:400px;height:640px" src="data:image/png;base64,${s}">`)
    .join("")}</body>`,
);
await sheet.screenshot({ path: out });
await browser.close();


