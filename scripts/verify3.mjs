import { createRequire } from "node:module";
import puppeteer from "puppeteer-core";

/** Real WebSocket path: fake Vision Expo server with token check, sample JSON from the API doc, forced drop. */
const require = createRequire(import.meta.url);
const { WebSocketServer } = require("ws");

const PORT = 8123;
const TOKEN = "abc";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let connections = 0;
let lastUrl = "";

const wss = new WebSocketServer({ port: PORT, path: "/ws" });
wss.on("connection", (ws, req) => {
  lastUrl = req.url;
  const q = new URL(req.url, "http://x").searchParams;
  if (q.get("token") !== TOKEN) return ws.close(1008, "bad token");
  connections += 1;
  const n = connections;
  ws.send(JSON.stringify({ type: "hello", client_id: n, version: "1.0.0", server_time: Date.now() / 1000, topics: ["events", "people", "status"], cameras: [{ id: "camera_1", name: "Cổng chính", enabled: true }, { id: "camera_2", name: "Sảnh", enabled: false }] }));
  ws.send(JSON.stringify({ type: "status", ts: Date.now() / 1000, totals: { persons: 1, inside: 1, outside: 0, entries: 4, exits: 3, objects: 2, alerts: 0 }, cameras: [{ id: "camera_1", name: "Cổng chính", status: "running", fps: 14.9, persons: 1, inside: 1, outside: 0, mode: "zone", entries: 4, exits: 3, alerts: 0, objects: { backpack: 1, glasses: 1 } }] }));
  const people = () => JSON.stringify({ type: "people", ts: Date.now() / 1000, extra_field: 1, cameras: [{ id: "camera_1", frame_size: [1920, 1080], people: [{ track_id: 27, side: "in", alert: false, items: ["backpack", "glasses"], objects: [{ label: "backpack", vi: "ba lô", category: "bags", conf: 0.82, alert: false, box: [0.43, 0.38, 0.51, 0.6] }, { label: "glasses", vi: "kính mắt", category: "face", conf: 0.71, alert: false, box: [0.45, 0.31, 0.48, 0.33] }], conf: 0.88, box: [0.41, 0.3, 0.52, 0.86], foot: [0.47, 0.85] }] }] });
  ws.send(people());
  ws.send(JSON.stringify({ type: "crossing", ts: Date.now() / 1000, camera_id: "camera_1", track_id: 27, direction: "out", mode: "zone", dwell_s: 42.5 }));
  const t = setInterval(() => ws.readyState === 1 && ws.send(people()), 200);
  ws.on("close", () => clearInterval(t));
  if (n === 1) setTimeout(() => ws.terminate(), 3500);
});

const browser = await puppeteer.launch({
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  headless: true,
  args: ["--use-angle=d3d11", "--enable-webgl", "--ignore-gpu-blocklist"],
  defaultViewport: { width: 1440, height: 860, deviceScaleFactor: 1 },
});
const out = {};

async function open(token) {
  const page = await browser.newPage();
  page.on("pageerror", (e) => (out.pageError = e.message));
  await page.evaluateOnNewDocument((cfg) => localStorage.setItem("vision-expo-config", JSON.stringify(cfg)), { host: "127.0.0.1", port: PORT, token, cameras: ["camera_1"] });
  await page.goto("http://localhost:5173/", { waitUntil: "networkidle0" });
  await page.waitForFunction(() => document.body.dataset.ready === "1");
  return page;
}
const snap = (page) =>
  page.evaluate(() => ({
    conn: document.querySelector("[data-conn-text]").textContent,
    stats: document.querySelector("[data-stats]").textContent.replace(/\s+/g, " ").trim(),
    people: document.querySelector("[data-people]").textContent.replace(/\s+/g, " ").trim(),
    feed: document.querySelector("[data-feed]").textContent.replace(/\s+/g, " ").trim(),
    avatars: window.__room.stage.count,
    camera: window.__room.store.activeCamera,
  }));

// wrong token -> 1008 note
let page = await open("wrong");
await wait(1200);
out.wrongToken = (await snap(page)).conn;
await page.close();

// right token -> live data, then drop and reconnect
page = await open(TOKEN);
await wait(1500);
out.query = lastUrl;
out.live = await snap(page);
await page.screenshot({ path: "shots/live-ws.png" });
await wait(2800);
out.afterDrop = await snap(page);
await wait(2500);
out.afterReconnect = await snap(page);
out.connections = connections;

console.log(JSON.stringify(out, null, 1));
await browser.close();
wss.close();
