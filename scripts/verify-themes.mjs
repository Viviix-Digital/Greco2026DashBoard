// Screenshot + sanity-check all themes (day & night, mock people) via headless Chrome.
// Usage: node scripts/verify-themes.mjs [outDir]
import { mkdirSync } from "node:fs";
import puppeteer from "puppeteer-core";

const outDir = process.argv[2] || "shots-themes";
mkdirSync(outDir, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  headless: true,
  args: ["--use-angle=d3d11", "--enable-webgl", "--ignore-gpu-blocklist"],
  defaultViewport: { width: 1440, height: 860, deviceScaleFactor: 1 },
});
const page = await browser.newPage();
const errors = [];
page.on("pageerror", (err) => errors.push(err.message));
page.on("console", (msg) => { if (msg.type() === "error" && !msg.text().includes("Failed to load resource")) errors.push(msg.text()); });

await page.evaluateOnNewDocument(() => {
  if (!sessionStorage.getItem("__themeTestCleared")) {
    localStorage.removeItem("vision-expo-theme");
    sessionStorage.setItem("__themeTestCleared", "1");
  }
});
await page.goto("http://localhost:5173/?mock=1", { waitUntil: "domcontentloaded", timeout: 30000 });
await page.waitForFunction(() => document.body.dataset.ready === "1", { timeout: 15000 });
await new Promise((r) => setTimeout(r, 1200));

const themes = ["room", "construction", "store", "booth"];
for (const theme of themes) {
  await page.evaluate((t) => {
    const sel = document.querySelector("select[data-theme]");
    sel.value = t;
    sel.dispatchEvent(new Event("change", { bubbles: true }));
  }, theme);
  await new Promise((r) => setTimeout(r, 900));
  const info = await page.evaluate(() => {
    const { world, room, stage } = window.__room;
    let meshes = 0;
    world.scene.traverse((o) => { if (o.isMesh) meshes++; });
    return {
      theme: room.view().theme,
      stored: localStorage.getItem("vision-expo-theme"),
      backdropTheme: document.body.dataset.theme,
      people: stage.count,
      meshes,
      drawCalls: world.renderer.info.render.calls,
    };
  });
  console.log(theme, JSON.stringify(info));
  if (info.theme !== theme) errors.push(`${theme}: room theme mismatch ${info.theme}`);
  if (info.stored !== theme) errors.push(`${theme}: localStorage mismatch ${info.stored}`);
  if (info.people === 0) errors.push(`${theme}: no mock people rendered`);
  await page.screenshot({ path: `${outDir}/${theme}-day.png` });

  // Night
  await page.evaluate(() => document.querySelector('[data-act="day"]').click());
  await new Promise((r) => setTimeout(r, 700));
  await page.screenshot({ path: `${outDir}/${theme}-night.png` });
  await page.evaluate(() => document.querySelector('[data-act="day"]').click());
  await new Promise((r) => setTimeout(r, 500));
}

// Persistence: reload keeps the last theme (booth)
await page.reload({ waitUntil: "domcontentloaded" });
await page.waitForFunction(() => document.body.dataset.ready === "1", { timeout: 15000 });
const persisted = await page.evaluate(() => window.__room.room.view().theme);
console.log("persisted after reload:", persisted);
if (persisted !== "booth") errors.push(`persistence failed: ${persisted}`);

await browser.close();
if (errors.length) {
  console.error("ERRORS:\n" + [...new Set(errors)].join("\n"));
  process.exit(1);
}
console.log("OK: all themes verified");
