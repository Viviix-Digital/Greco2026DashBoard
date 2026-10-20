import puppeteer from "puppeteer-core";

const browser = await puppeteer.launch({
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  headless: true,
  args: ["--use-angle=d3d11", "--enable-webgl", "--ignore-gpu-blocklist"],
  defaultViewport: { width: 1440, height: 860, deviceScaleFactor: 1 },
});
const page = await browser.newPage();
page.on("console", (msg) => console.log("PAGE", msg.type(), msg.text()));
page.on("pageerror", (err) => console.log("ERR", err.message));
await page.goto("http://localhost:5173/", { waitUntil: "networkidle0", timeout: 30000 });
await page.waitForFunction(() => document.body.dataset.ready === "1", { timeout: 15000 });
await new Promise((r) => setTimeout(r, 500));
const zoom = Number(process.argv[3] || "1");
if (zoom !== 1) {
  await page.evaluate((z) => {
    const cam = window.__room.world.camera;
    cam.zoom = z;
    cam.updateProjectionMatrix();
  }, zoom);
  await new Promise((r) => setTimeout(r, 250));
}
await page.screenshot({ path: process.argv[2] || "shot.png" });
await browser.close();
