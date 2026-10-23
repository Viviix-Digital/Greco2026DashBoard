import "./style.css";
import { installClay } from "./clay";
import { tickSprings, tickTweens } from "./anim";
import { loadConfig, type LiveConfig } from "./live/config";
import { MockFeed } from "./live/mock";
import { VisionSocket, type Feed } from "./live/socket";
import { LiveStore } from "./live/store";
import { createWorld } from "./scene/createScene";
import { PeopleStage } from "./scene/people/stage";
import { loadThemeId, saveThemeId, type ThemeId } from "./scene/themes";
import { RoomView } from "./scene/roomView";
import { mount } from "./ui/chrome";

const app = document.querySelector<HTMLElement>("#app");
if (!app) throw new Error("Missing #app");

installClay();

const canvas = document.createElement("canvas");
app.append(canvas);

const initialTheme = loadThemeId();
const world = createWorld(canvas, initialTheme);
const room = new RoomView(world, initialTheme);
const store = new LiveStore(loadConfig());
const stage = new PeopleStage(world, store, room);
stage.setTheme(initialTheme);

const applyTheme = (theme: ThemeId) => {
  saveThemeId(theme);
  room.setTheme(theme);
  stage.setTheme(theme);
};

let testing = new URLSearchParams(location.search).get("mock") === "1";
let live: Feed | null = null;
let mock: Feed | null = null;

/** Swap between the Vision Expo socket and the offline fake-people feed. */
const setTest = (on: boolean) => {
  testing = on;
  live?.stop();
  mock?.stop();
  store.mock = on;
  store.clear();
  if (on) {
    mock ??= new MockFeed(store);
    mock.start();
  } else {
    live ??= new VisionSocket(store);
    live.start();
  }
};

const applyConfig = (config: LiveConfig) => {
  store.setConfig(config);
  setTest(testing);
};

mount(app, { room, store, onConfig: applyConfig, onTest: setTest, theme: initialTheme, onTheme: applyTheme });

canvas.addEventListener("pointerdown", (e) => {
  const key = stage.pick(e);
  if (key) store.select(key);
  else if (store.selected) store.select(null);
});
canvas.addEventListener(
  "wheel",
  (e) => {
    e.preventDefault();
    room.stepZoom(e.deltaY > 0 ? -1 : 1);
  },
  { passive: false },
);

setTest(testing);

let last = performance.now();
const frame = (now: number) => {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  tickTweens(dt);
  tickSprings(dt);
  room.update(dt);
  stage.update(dt);
  world.renderer.render(world.scene, world.camera);
  if (room.ready) document.body.dataset.ready = "1";
  requestAnimationFrame(frame);
};
requestAnimationFrame(frame);

if (import.meta.env.DEV) {
  Object.assign(window, { __room: { world, room, store, stage } });
}
