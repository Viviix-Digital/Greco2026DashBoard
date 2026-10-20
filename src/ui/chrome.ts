import { bindSpring, enableSprings } from "../anim";
import type { Editor } from "../editor/editor";
import type { Kind } from "../scene/objects";
import { backdropMarkup } from "./backdrop";
import { ICONS, type IconName } from "./icons";

const CATALOG: { kind: Kind; name: string; cat: "seat" | "build" | "decor"; icon: IconName }[] = [
  { kind: "books", name: "Books", cat: "decor", icon: "books" },
  { kind: "armchair", name: "Armchair", cat: "seat", icon: "armchair" },
  { kind: "book", name: "Book", cat: "decor", icon: "book" },
  { kind: "frame", name: "Frame", cat: "decor", icon: "frame" },
  { kind: "chair", name: "Chair", cat: "seat", icon: "chair" },
  { kind: "box", name: "Box", cat: "build", icon: "box" },
  { kind: "monitor", name: "Monitor", cat: "build", icon: "monitor" },
  { kind: "lamp", name: "Lamp", cat: "decor", icon: "lamp" },
  { kind: "cup", name: "Cup", cat: "decor", icon: "cup" },
  { kind: "document", name: "Document", cat: "decor", icon: "doc" },
  { kind: "cabinet", name: "Cabinet", cat: "build", icon: "cabinet" },
  { kind: "acorn", name: "Acorn", cat: "decor", icon: "acorn" },
  { kind: "carrot", name: "Carrot", cat: "decor", icon: "carrot" },
  { kind: "stool", name: "Stool", cat: "seat", icon: "stool" },
  { kind: "cylinder", name: "Canister", cat: "decor", icon: "can" },
  { kind: "sofa", name: "Sofa", cat: "seat", icon: "sofa" },
  { kind: "bench", name: "Bench", cat: "seat", icon: "bench" },
  { kind: "ring", name: "Ring", cat: "decor", icon: "ring" },
  { kind: "paper", name: "Paper", cat: "decor", icon: "paper" },
  { kind: "purplebook", name: "Journal", cat: "decor", icon: "journal" },
];

export function mount(app: HTMLElement, editor: Editor) {
  app.insertAdjacentHTML("afterbegin", backdropMarkup());
  const hud = document.createElement("div");
  hud.id = "hud";
  hud.innerHTML = `
    <div class="cluster top-left">
      <button class="btn" data-act="menu" title="Menu">${ICONS.menu}</button>
      <button class="btn" data-act="camera" title="Save image">${ICONS.camera}</button>
      <button class="btn" data-act="home" title="Home">${ICONS.home}</button>
      <button class="btn" data-act="undo" title="Undo">${ICONS.undo}</button>
      <div class="panel" data-panel="menu" hidden>
        <h3>Default</h3>
        <p>The reference room. Reset puts every figure, the cat, and the furniture back on the grid.</p>
        <button class="wide" data-act="reset">Reset room</button>
      </div>
    </div>
    <div class="cluster top-right">
      <div class="zoom">
        <button class="btn" data-act="zoom-out" title="Zoom out">${ICONS.minus}</button>
        <div class="label" data-zoom>Default</div>
        <button class="btn" data-act="zoom-in" title="Zoom in">${ICONS.plus}</button>
      </div>
      <button class="btn" data-act="eye" title="Hide scatter">${ICONS.eye}</button>
      <button class="btn" data-act="delete" title="Delete">${ICONS.trash}</button>
      <button class="btn" data-act="record" title="Record marker">${ICONS.record}<i class="dot"></i></button>
      <button class="btn" data-act="help" title="Help">${ICONS.help}</button>
      <button class="btn" data-act="settings" title="Settings">${ICONS.settings}</button>
      <div class="panel" data-panel="help" hidden>
        <h3>How to use the room</h3>
        <p>Pick a catalog icon, then click the floor to place it. The move tool drags a selection on the grid. Arrow keys nudge. Delete lifts an object away. Day and night crossfade the window and the lamp, then the shadows settle.</p>
      </div>
      <div class="panel" data-panel="settings" hidden>
        <h3>Shadows</h3>
        <p>The shadow map stays frozen between changes so the frame does not shimmer.</p>
        <div class="row">
          <button class="wide" data-act="map-2k">Soft 2K</button>
          <button class="wide" data-act="map-4k">Soft 4K</button>
        </div>
      </div>
    </div>
    <div class="rail">
      <div class="tool-row">
        <button class="cell" data-act="search" title="Search">${ICONS.search}</button>
        <button class="cell" data-act="filter-build" title="Furniture">${ICONS.hammer}</button>
        <button class="cell" data-act="filter-seat" title="Seating">${ICONS.seatTool}</button>
      </div>
      <input class="search" data-search placeholder="Search the drawer" />
      <div class="catalog" data-catalog></div>
    </div>
    <div class="cluster bottom-center">
      <button class="btn" data-act="grid" title="Grid">${ICONS.grid}</button>
      <button class="btn" data-act="move" title="Move">${ICONS.move}</button>
      <button class="btn" data-act="day" title="Day and night">${ICONS.sun}</button>
      <button class="btn" data-act="mute" title="Volume">${ICONS.volume}</button>
    </div>
  `;
  app.append(hud);

  const catalog = hud.querySelector("[data-catalog]") as HTMLElement;
  for (const item of CATALOG) {
    const btn = document.createElement("button");
    btn.className = "cell";
    btn.dataset.kind = item.kind;
    btn.dataset.cat = item.cat;
    btn.dataset.name = item.name.toLowerCase();
    btn.title = item.name;
    btn.innerHTML = ICONS[item.icon];
    btn.addEventListener("click", () => editor.beginPlace(item.kind));
    catalog.append(btn);
  }
  const empty = document.createElement("div");
  empty.className = "empty";
  empty.innerHTML = `<strong>Nothing in this drawer</strong><span>Try another filter or clear the search.</span>`;
  catalog.append(empty);

  hud.querySelectorAll("button").forEach((btn) => bindSpring(btn as HTMLElement));

  let filter: "all" | "seat" | "build" = "all";
  let query = "";
  const search = hud.querySelector("[data-search]") as HTMLInputElement;
  const cells = [...catalog.querySelectorAll<HTMLButtonElement>(".cell")];

  const restagger = () => {
    let i = 0;
    for (const cell of cells) {
      if (cell.classList.contains("gone")) continue;
      cell.style.animation = "none";
      void cell.offsetWidth;
      cell.style.animation = "rise 0.28s cubic-bezier(.2,.8,.2,1) both";
      cell.style.animationDelay = `${i * 26}ms`;
      i += 1;
    }
  };

  const applyFilter = () => {
    let shown = 0;
    const q = query.trim().toLowerCase();
    for (const cell of cells) {
      const catOk = filter === "all" || cell.dataset.cat === filter;
      const textOk = !q || (cell.dataset.name ?? "").includes(q);
      cell.classList.toggle("gone", !(catOk && textOk));
      if (catOk && textOk) shown += 1;
    }
    empty.classList.toggle("show", shown === 0);
    restagger();
  };

  const setOpen = (name: string | null) => {
    for (const panel of hud.querySelectorAll<HTMLElement>("[data-panel]")) {
      panel.hidden = panel.dataset.panel !== name;
    }
  };

  hud.addEventListener("click", (event) => {
    const target = (event.target as HTMLElement).closest<HTMLElement>("[data-act]");
    if (!target) return;
    const act = target.dataset.act;
    if (act === "menu" || act === "help" || act === "settings") {
      const panel = hud.querySelector<HTMLElement>(`[data-panel="${act}"]`);
      setOpen(panel && !panel.hidden ? null : act);
      return;
    }
    setOpen(null);
    if (act === "camera") editor.screenshot();
    if (act === "home") editor.home();
    if (act === "undo") editor.undo();
    if (act === "reset") editor.reset();
    if (act === "zoom-in") editor.stepZoom(1);
    if (act === "zoom-out") editor.stepZoom(-1);
    if (act === "eye") editor.toggleEye();
    if (act === "delete") editor.deleteSelection();
    if (act === "record") editor.toggleRecord();
    if (act === "grid") editor.toggleGrid();
    if (act === "move") editor.toggleMove();
    if (act === "day") editor.toggleDay();
    if (act === "mute") editor.toggleMute();
    if (act === "map-2k") editor.setShadowSize(2048);
    if (act === "map-4k") editor.setShadowSize(4096);
    if (act === "search") {
      search.classList.toggle("show", !search.classList.contains("show"));
      if (search.classList.contains("show")) search.focus();
      else {
        query = "";
        search.value = "";
        applyFilter();
      }
    }
    if (act === "filter-build") {
      filter = filter === "build" ? "all" : "build";
      applyFilter();
    }
    if (act === "filter-seat") {
      filter = filter === "seat" ? "all" : "seat";
      applyFilter();
    }
  });

  search.addEventListener("input", () => {
    query = search.value;
    applyFilter();
  });

  const refresh = () => {
    const view = editor.view();
    const zoom = hud.querySelector("[data-zoom]");
    if (zoom) zoom.textContent = view.zoom;
    mark("grid", view.grid);
    mark("move", view.move);
    mark("day", view.night);
    mark("eye", view.hidden);
    mark("mute", view.mute);
    mark("record", view.record);
    mark("filter-build", filter === "build");
    mark("filter-seat", filter === "seat");
    mark("search", search.classList.contains("show"));
    const undo = hud.querySelector<HTMLButtonElement>('[data-act="undo"]');
    if (undo) undo.disabled = !view.canUndo;
    const eye = hud.querySelector('[data-act="eye"]');
    if (eye) eye.innerHTML = view.hidden ? ICONS.eyeOff : ICONS.eye;
    const day = hud.querySelector('[data-act="day"]');
    if (day) day.innerHTML = view.night ? ICONS.moon : ICONS.sun;
    const mute = hud.querySelector('[data-act="mute"]');
    if (mute) mute.innerHTML = view.mute ? ICONS.mute : ICONS.volume;
    const rec = hud.querySelector('[data-act="record"]');
    rec?.classList.toggle("armed", view.record);
    if (rec && !rec.querySelector(".dot")) rec.insertAdjacentHTML("beforeend", `<i class="dot"></i>`);
    for (const cell of cells) cell.classList.toggle("selected", cell.dataset.kind === view.placeKind);
  };

  const mark = (act: string, on: boolean) => {
    hud.querySelector(`[data-act="${act}"]`)?.classList.toggle("active", on);
  };

  editor.subscribe(refresh);
  refresh();

  let delay = 0;
  for (const el of hud.querySelectorAll<HTMLElement>(".btn, .zoom, .cell")) {
    el.classList.add("enter");
    el.style.animationDelay = `${delay}ms`;
    delay += 18;
  }
  window.setTimeout(() => {
    for (const el of hud.querySelectorAll<HTMLElement>(".enter")) el.style.animation = "none";
    enableSprings();
  }, 1100);
}
