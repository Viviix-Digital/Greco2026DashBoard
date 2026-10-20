import "./style.css";
import { installClay } from "./clay";
import { tickSprings, tickTweens } from "./anim";
import { Editor } from "./editor/editor";
import { createWorld } from "./scene/createScene";
import { mount } from "./ui/chrome";

const app = document.querySelector<HTMLElement>("#app");
if (!app) throw new Error("Missing #app");

installClay();

const canvas = document.createElement("canvas");
app.append(canvas);

const world = createWorld(canvas);
const editor = new Editor(world);
mount(app, editor);

let last = performance.now();
const frame = (now: number) => {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  tickTweens(dt);
  tickSprings(dt);
  editor.update(dt);
  world.renderer.render(world.scene, world.camera);
  if (editor.ready) document.body.dataset.ready = "1";
  requestAnimationFrame(frame);
};
requestAnimationFrame(frame);

if (import.meta.env.DEV) {
  Object.assign(window, { __room: { world, editor } });
}
