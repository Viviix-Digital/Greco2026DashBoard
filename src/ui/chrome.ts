import { bindSpring, enableSprings } from "../anim";
import { saveConfig, splitList, type LiveConfig } from "../live/config";
import { beepAlert } from "../live/sound";
import type { LiveStore } from "../live/store";
import { formatDuration } from "../live/time";
import type { CompletedVisit, FeedEvent, PersonView } from "../live/types";
import type { RoomView } from "../scene/roomView";
import { ALERT_COLOR, SIDE_COLOR, SIDE_TEXT, itemNames, personTitle } from "../scene/people/label";
import { THEME_LIST, type ThemeId } from "../scene/themes";
import { mountAnalytics } from "./analytics";
import { backdropMarkup } from "./backdrop";
import { ICONS } from "./icons";
import { mountPreview } from "./preview";

const CAMERA_STATUS: Record<string, string> = {
  running: "Đang chạy",
  starting: "Đang khởi động",
  "loading model": "Đang tải mô hình",
  connecting: "Đang kết nối camera",
  reconnecting: "Đang nối lại",
  offline: "Mất tín hiệu",
  error: "Lỗi",
  disabled: "Đã tắt",
  stopped: "Đã dừng",
  online: "Trực tuyến",
};

const CATEGORY_TEXT: Record<string, string> = {
  headwear: "Nón & mũ",
  face: "Kính & khẩu trang",
  bags: "Túi",
  accessories: "Phụ kiện",
  devices: "Điện thoại",
  weapons: "Vũ khí",
  custom: "Tự thêm",
};

const BANNER_MS = 6000;

export interface HudOptions {
  room: RoomView;
  store: LiveStore;
  onConfig: (config: LiveConfig) => void;
  /** Turn the offline fake-people feed on or off. */
  onTest: (on: boolean) => void;
  theme: ThemeId;
  onTheme: (theme: ThemeId) => void;
}

function esc(text: unknown) {
  return String(text).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

function clock(ts: number) {
  return new Date(ts * 1000).toLocaleTimeString("vi-VN", { hour12: false });
}

export function mount(app: HTMLElement, { room, store, onConfig, onTest, theme, onTheme }: HudOptions) {
  app.insertAdjacentHTML("afterbegin", backdropMarkup(theme));
  const hud = document.createElement("div");
  hud.id = "hud";
  hud.innerHTML = `
    <div class="cluster top-left">
      <div class="conn card" data-conn><i class="led"></i><span data-conn-text>Chưa kết nối</span></div>
      <button class="btn test" data-act="test" title="Chế độ test: người và dữ liệu giả">Test</button>
      <select class="cam-select card theme-select" data-theme title="Theme 3D">
        ${THEME_LIST.map((t) => `<option value="${t.id}"${t.id === theme ? " selected" : ""}>${t.label}</option>`).join("")}
      </select>
      <select class="cam-select card" data-camera title="Camera"></select>
    </div>
    <div class="cluster top-right">
      <div class="zoom">
        <button class="btn" data-act="zoom-out" title="Thu nhỏ">${ICONS.minus}</button>
        <div class="label" data-zoom>Default</div>
        <button class="btn" data-act="zoom-in" title="Phóng to">${ICONS.plus}</button>
      </div>
      <button class="btn" data-act="home" title="Về mặc định">${ICONS.home}</button>
      <button class="btn" data-act="day" title="Ngày / đêm">${ICONS.sun}</button>
      <button class="btn" data-act="mute" title="Âm thanh cảnh báo">${ICONS.volume}</button>
      <button class="btn" data-act="camera" title="Lưu ảnh">${ICONS.camera}</button>
      <button class="btn" data-act="settings" title="Cài đặt kết nối">${ICONS.settings}</button>
      <div class="panel" data-panel="settings" hidden>
        <h3>Kết nối Vision Expo</h3>
        <label class="field">Địa chỉ máy<input data-f="host" autocomplete="off" spellcheck="false" /></label>
        <label class="field">Cổng<input data-f="port" inputmode="numeric" autocomplete="off" /></label>
        <label class="field">Token<input data-f="token" type="password" autocomplete="off" placeholder="để trống nếu không đặt" /></label>
        <label class="field">Camera (id, cách nhau dấu phẩy)<input data-f="cameras" autocomplete="off" spellcheck="false" placeholder="trống = mọi camera" /></label>
        <label class="field">URL stream MediaMTX<input data-f="streamUrl" autocomplete="off" spellcheck="false" placeholder="http://127.0.0.1:8888/{camera}/index.m3u8" /></label>
        <p class="muted tiny">Dùng <code>{camera}</code> để thay bằng id camera đang chọn. HLS mặc định cổng 8888.</p>
        <button class="wide primary" data-act="save-config">Lưu và kết nối lại</button>
        <h3 class="sub">Bóng đổ</h3>
        <div class="row">
          <button class="wide" data-act="map-2k">Soft 2K</button>
          <button class="wide" data-act="map-4k">Soft 4K</button>
        </div>
      </div>
    </div>
    <div class="banner" data-banner hidden></div>
    <div class="rail left-rail">
      <div class="card people" data-people></div>
    </div>
    <div class="rail right-rail">
      <div class="card stats" data-stats></div>
      <div class="card detail" data-detail hidden></div>
      <div class="card visits" data-visits></div>
      <div class="card feed" data-feed></div>
    </div>
  `;
  app.append(hud);

  hud.querySelectorAll<HTMLElement>(".btn").forEach((btn) => bindSpring(btn));

  const $ = <T extends HTMLElement>(sel: string) => hud.querySelector(sel) as T;
  const connEl = $("[data-conn]");
  const connText = $("[data-conn-text]");
  const testBtn = $('[data-act="test"]');
  const camSelect = $<HTMLSelectElement>("[data-camera]");
  const statsEl = $("[data-stats]");
  const peopleEl = $("[data-people]");
  const detailEl = $("[data-detail]");
  const visitsEl = $("[data-visits]");
  const feedEl = $("[data-feed]");
  const banner = $("[data-banner]");
  const fields = {
    host: $<HTMLInputElement>('[data-f="host"]'),
    port: $<HTMLInputElement>('[data-f="port"]'),
    token: $<HTMLInputElement>('[data-f="token"]'),
    cameras: $<HTMLInputElement>('[data-f="cameras"]'),
    streamUrl: $<HTMLInputElement>('[data-f="streamUrl"]'),
  };

  const fillFields = () => {
    const c = store.config;
    fields.host.value = c.host;
    fields.port.value = String(c.port);
    fields.token.value = c.token;
    fields.cameras.value = c.cameras.join(", ");
    fields.streamUrl.value = c.streamUrl;
  };
  fillFields();

  const preview = mountPreview(hud, store);
  const analytics = mountAnalytics(hud, store);

  const setOpen = (name: string | null) => {
    for (const panel of hud.querySelectorAll<HTMLElement>("[data-panel]")) {
      panel.hidden = panel.dataset.panel !== name;
    }
  };

  hud.addEventListener("click", (event) => {
    const target = event.target as HTMLElement;
    const visit = target.closest<HTMLElement>("[data-visit-key]");
    if (visit?.dataset.visitKey) {
      const key = visit.dataset.visitKey;
      if (store.people().some((p) => p.key === key)) store.select(key);
      return;
    }
    const person = target.closest<HTMLElement>("[data-key]");
    if (person?.dataset.key) {
      store.select(person.dataset.key);
      return;
    }
    const btn = target.closest<HTMLElement>("[data-act]");
    if (!btn) return;
    const act = btn.dataset.act;
    if (act === "settings") {
      const panel = hud.querySelector<HTMLElement>('[data-panel="settings"]');
      const open = !!panel && panel.hidden;
      if (open) fillFields();
      setOpen(open ? "settings" : null);
      return;
    }
    if (act === "save-config") {
      const port = Number(fields.port.value);
      const next: LiveConfig = {
        host: fields.host.value.trim() || store.config.host,
        port: port > 0 && port < 65536 ? port : store.config.port,
        token: fields.token.value,
        cameras: splitList(fields.cameras.value),
        streamUrl: fields.streamUrl.value.trim() || store.config.streamUrl,
      };
      saveConfig(next);
      onConfig(next);
      preview.sync();
      setOpen(null);
      return;
    }
    if (act === "open-analytics") {
      analytics.open();
      return;
    }
    if (act === "close-detail") {
      store.select(null);
      return;
    }
    if (act === "test") {
      onTest(!store.mock);
      return;
    }
    if (act !== "map-2k" && act !== "map-4k") setOpen(null);
    if (act === "camera") room.screenshot();
    if (act === "home") room.home();
    if (act === "zoom-in") room.stepZoom(1);
    if (act === "zoom-out") room.stepZoom(-1);
    if (act === "day") room.toggleDay();
    if (act === "mute") room.toggleMute();
    if (act === "map-2k") room.setShadowSize(2048);
    if (act === "map-4k") room.setShadowSize(4096);
  });

  camSelect.addEventListener("change", () => store.selectCamera(camSelect.value));

  const themeSelect = $<HTMLSelectElement>("[data-theme]");
  themeSelect.addEventListener("change", () => {
    const next = themeSelect.value as ThemeId;
    const old = app.querySelector("[data-backdrop]");
    if (old) {
      const tpl = document.createElement("template");
      tpl.innerHTML = backdropMarkup(next).trim();
      old.replaceWith(tpl.content.firstElementChild as Element);
    }
    document.body.dataset.theme = next;
    onTheme(next);
  });
  document.body.dataset.theme = theme;

  // --- renderers: each rebuilds its DOM only when its signature changes -------------------------

  const sigs = new Map<string, string>();
  const changed = (name: string, sig: string) => {
    if (sigs.get(name) === sig) return false;
    sigs.set(name, sig);
    return true;
  };

  const renderConn = () => {
    const c = store.conn;
    let text = "Chưa kết nối";
    if (c.state === "connecting") text = "Đang kết nối…";
    else if (c.state === "open") {
      const cam = store.activeCamera ? store.cameraName(store.activeCamera) : "";
      text = cam ? `Đã kết nối · ${cam}` : "Đã kết nối";
    } else if (c.state === "retrying") text = `${c.note ?? "Mất kết nối"} · thử lại sau ${c.retryIn ?? 0}s`;
    else if (c.state === "closed") text = c.note ?? "Đã ngắt";
    if (store.lastError && c.state === "open") text += ` · ${store.lastError}`;
    connText.textContent = store.mock ? `Test · ${text}` : text;
    connEl.dataset.state = c.state;
    testBtn.classList.toggle("active", store.mock);
    testBtn.title = store.mock ? "Tắt chế độ test, nối máy thật" : "Chế độ test: người và dữ liệu giả";
  };

  const renderCameras = () => {
    const cams = store.cameras;
    const sig = `${store.activeCamera}|${cams.map((c) => `${c.id}:${c.name}:${c.enabled}`).join(",")}`;
    if (!changed("cams", sig)) return;
    if (!cams.length) {
      camSelect.innerHTML = `<option>Chưa có camera</option>`;
      camSelect.disabled = true;
      return;
    }
    camSelect.disabled = false;
    camSelect.innerHTML = cams
      .map(
        (c) =>
          `<option value="${esc(c.id)}"${c.id === store.activeCamera ? " selected" : ""}>${esc(c.name || c.id)}${c.enabled ? "" : " (tắt)"}</option>`,
      )
      .join("");
  };

  const renderStats = () => {
    const s = store.stats();
    const n = (v: number | null) => (v === null || v === undefined ? "–" : String(v));
    const status = CAMERA_STATUS[s.status] ?? s.status;
    const fps = s.fps !== null ? ` · ${s.fps.toFixed(0)} fps` : "";
    const sig = [s.persons, s.inside, s.outside, s.objects, s.alerts, s.entries, s.exits, s.status, s.fps?.toFixed(0)].join("|");
    if (!changed("stats", sig)) return;
    statsEl.innerHTML = `
      <div class="stat-head"><strong>Tổng quan</strong><span class="chip ${s.status === "running" ? "ok" : "warn"}">${esc(status)}${esc(fps)}</span></div>
      <div class="stat-grid">
        <div><b>${n(s.persons)}</b><span>Đang thấy</span></div>
        <div><b>${n(s.inside)}</b><span>Trong vùng</span></div>
        <div><b>${n(s.outside)}</b><span>Ngoài vùng</span></div>
        <div><b>${n(s.entries)}</b><span>Lượt vào</span></div>
        <div><b>${n(s.exits)}</b><span>Lượt ra</span></div>
        <div><b>${n(s.objects)}</b><span>Vật phẩm</span></div>
        <div class="${s.alerts > 0 ? "danger" : ""}"><b>${n(s.alerts)}</b><span>Cảnh báo</span></div>
      </div>
      <button type="button" class="wide primary stats-detail" data-act="open-analytics">Chi tiết &amp; lịch sử</button>`;
  };

  const personTimeChip = (p: PersonView) => {
    if (p.track_id === null || p.track_id === undefined) return "";
    const elapsed = store.primaryElapsed(p.key, p.side);
    if (elapsed === null) return "";
    const label = p.side === "in" ? "vùng" : "thấy";
    return `<em class="time-chip" title="${label}">${esc(formatDuration(elapsed))}</em>`;
  };

  const personRow = (p: PersonView) => {
    const items = itemNames(p);
    const chips = items.length
      ? items
          .map((name, i) => {
            const bad = p.objects[i]?.alert;
            return `<span class="chip item${bad ? " bad" : ""}">${esc(name)}</span>`;
          })
          .join("")
      : `<span class="muted">Không có vật phẩm</span>`;
    const color = p.alert ? ALERT_COLOR : SIDE_COLOR[p.side];
    return `
      <button class="person${p.alert ? " alert" : ""}${p.key === store.selected ? " selected" : ""}" data-key="${esc(p.key)}">
        <span class="person-head"><i class="led" style="background:${color}"></i><strong>${esc(personTitle(p))}</strong>${personTimeChip(p)}<em>${esc(SIDE_TEXT[p.side])}</em></span>
        <span class="chips">${chips}</span>
      </button>`;
  };

  const peopleTimeSig = () => {
    const at = store.now();
    return store
      .people()
      .map((p) => `${p.key}:${Math.round(store.primaryElapsed(p.key, p.side, at) ?? -1)}`)
      .join(";");
  };

  const renderPeople = () => {
    const people = store.people();
    const sig = `${store.conn.state}|${store.selected}|${people
      .map((p) => `${p.key}:${p.side}:${p.alert}:${itemNames(p).join("+")}`)
      .join(";")}|${peopleTimeSig()}`;
    if (!changed("people", sig)) return;
    const body = people.length
      ? people.map(personRow).join("")
      : `<div class="empty-note">${store.conn.state === "open" ? "Chưa thấy ai trong khung" : "Chưa có dữ liệu"}</div>`;
    peopleEl.innerHTML = `<div class="stat-head"><strong>Người trong khung</strong><span class="chip">${people.length}</span></div><div class="list">${body}</div>`;
  };

  const detailTimeBlock = (p: PersonView) => {
    if (p.track_id === null || p.track_id === undefined) {
      return `<div class="time-block"><div class="time-row"><span>Thời gian</span><b>—</b></div></div>`;
    }
    const sess = store.session(p.key);
    const visible = store.visibleElapsed(p.key);
    const zone = store.zoneElapsed(p.key);
    const seenAt = sess ? clock(sess.firstSeenTs) : "—";
    const zoneAt = sess?.zoneEnterTs != null ? clock(sess.zoneEnterTs) : null;
    const zoneLabel =
      zone !== null
        ? formatDuration(zone)
        : sess?.lastDwellS != null
          ? formatDuration(sess.lastDwellS)
          : "—";
    const zoneHint =
      zone !== null && sess?.zoneEstimated
        ? `<span class="muted time-hint">ước lượng</span>`
        : zone === null && sess?.lastDwellS != null
          ? `<span class="muted time-hint">lần trước</span>`
          : "";
    const steps = [
      `<span class="tl-step on">Vào khung · ${esc(seenAt)}</span>`,
      zoneAt
        ? `<span class="tl-step on">Vào vùng · ${esc(zoneAt)}${sess?.zoneEstimated ? " ~" : ""}</span>`
        : `<span class="tl-step">Chưa vào vùng</span>`,
      sess?.alertTs != null || p.alert
        ? `<span class="tl-step alert">Cảnh báo</span>`
        : `<span class="tl-step">Không cảnh báo</span>`,
      `<span class="tl-step on">Đang theo dõi</span>`,
    ];
    return `
      <div class="time-block">
        <div class="time-row"><span>Đang thấy</span><b data-live-visible>${esc(visible !== null ? formatDuration(visible) : "—")}</b></div>
        <div class="time-row"><span>Trong vùng</span><b data-live-zone>${esc(zoneLabel)}</b>${zoneHint}</div>
        <div class="time-row muted"><span>Xuất hiện lúc</span><span>${esc(seenAt)}</span></div>
        <div class="time-line">${steps.join("")}</div>
      </div>`;
  };

  const renderDetail = () => {
    const p = store.selectedPerson();
    const at = store.now();
    const vis = p ? Math.round(store.visibleElapsed(p.key, at) ?? -1) : -1;
    const zon = p ? Math.round(store.zoneElapsed(p.key, at) ?? -1) : -1;
    const sig = p
      ? `${p.key}|${p.side}|${p.alert}|${p.conf}|${p.objects.map((o) => `${o.label}:${o.conf.toFixed(2)}`).join(",")}|${vis}|${zon}|${store.session(p.key)?.zoneEstimated ? 1 : 0}|${store.session(p.key)?.lastDwellS ?? ""}`
      : "";
    if (!changed("detail", sig)) return;
    if (!p) {
      detailEl.hidden = true;
      return;
    }
    detailEl.hidden = false;
    const rows = p.objects.length
      ? p.objects
          .map(
            (o) => `
        <div class="obj${o.alert ? " bad" : ""}">
          <span><strong>${esc(o.vi || o.label)}</strong><em>${esc(CATEGORY_TEXT[o.category] ?? o.category)}</em></span>
          <b>${Math.round((o.conf ?? 0) * 100)}%</b>
        </div>`,
          )
          .join("")
      : `<div class="empty-note">Không có vật phẩm</div>`;
    detailEl.innerHTML = `
      <div class="stat-head">
        <strong>${esc(personTitle(p))}</strong>
        <button class="x" data-act="close-detail" title="Đóng">×</button>
      </div>
      <div class="detail-meta">
        <span class="chip" style="background:${SIDE_COLOR[p.side]}22;color:${SIDE_COLOR[p.side]}">${esc(SIDE_TEXT[p.side])}</span>
        ${p.alert ? `<span class="chip bad">Cảnh báo vũ khí</span>` : ""}
        <span class="muted">Độ tin cậy ${Math.round((p.conf ?? 0) * 100)}%</span>
      </div>
      ${detailTimeBlock(p)}
      <div class="objs">${rows}</div>`;
  };

  const visitItems = (v: CompletedVisit) => {
    const entries = Object.entries(v.items);
    if (!entries.length) return "không có vật";
    const frames = v.frames && v.frames > 0 ? v.frames : null;
    return entries
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([label, n]) => {
        const name = store.viOf(label);
        if (frames) return `${name} ~${Math.round((n / frames) * 100)}%`;
        return name;
      })
      .join(", ");
  };

  const visitLine = (v: CompletedVisit) => {
    const id = v.trackId === null ? "#?" : `#${v.trackId}`;
    const key = v.trackId !== null ? `${v.cameraId}:${v.trackId}` : "";
    const live = key && store.people().some((p) => p.key === key);
    const dwell = v.dwellS != null ? ` · ở trong ${esc(formatDuration(v.dwellS))}` : "";
    const alert = v.alert ? ` <span class="chip bad tiny">alert</span>` : "";
    return `
      <button class="visit${live ? " live" : ""}" type="button" data-visit-key="${esc(key)}" ${key ? "" : "disabled"}>
        <span class="visit-main"><strong>${esc(id)}</strong> · ${esc(formatDuration(v.duration))} thấy${dwell}${alert}</span>
        <span class="visit-sub">${esc(visitItems(v))} · ${esc(clock(v.lastTs))}</span>
      </button>`;
  };

  const renderVisits = () => {
    const list = store.recentVisits(10);
    const sig = `${store.activeCamera}|${list.map((v) => `${v.id}:${v.dwellS ?? ""}`).join(";")}|${store.people()
      .map((p) => p.key)
      .join(",")}`;
    if (!changed("visits", sig)) return;
    const body = list.length
      ? list.map(visitLine).join("")
      : `<div class="empty-note">Chưa có lượt hoàn tất</div>`;
    visitsEl.innerHTML = `<div class="stat-head"><strong>Lượt gần đây</strong><span class="chip">${list.length}</span></div><div class="visit-list">${body}</div>`;
  };

  const feedLine = (e: FeedEvent) => {
    const cam = esc(store.cameraName(e.camera_id));
    const t = clock(e.ts);
    if (e.type === "crossing") {
      const id = e.track_id === null ? "#?" : `#${e.track_id}`;
      const dwell = e.direction === "out" && typeof e.dwell_s === "number" ? ` · ở trong ${Math.round(e.dwell_s)}s` : "";
      return `<div class="ev ${e.direction}"><span class="tag">${e.direction === "in" ? "VÀO" : "RA"}</span><span>${id} · ${cam}${esc(dwell)}</span><time>${t}</time></div>`;
    }
    if (e.type === "alert") {
      const id = e.track_id === null ? "#?" : `#${e.track_id}`;
      const names = (e.items ?? []).map((l) => store.viOf(l)).join(", ");
      return `<div class="ev alert"><span class="tag">CẢNH BÁO</span><span>${id} · ${esc(names)} · ${cam}</span><time>${t}</time></div>`;
    }
    if (e.type === "camera") {
      const st = CAMERA_STATUS[e.status] ?? e.status;
      return `<div class="ev cam"><span class="tag">CAMERA</span><span>${cam}: ${esc(st)}${e.error ? ` (${esc(e.error)})` : ""}</span><time>${t}</time></div>`;
    }
    return `<div class="ev cam"><span class="tag">RESET</span><span>Đặt lại bộ đếm · ${cam}</span><time>${t}</time></div>`;
  };

  const renderFeed = () => {
    const sig = store.feed.map((e) => `${e.type}${e.ts}${e.camera_id}`).join("|");
    if (!changed("feed", sig)) return;
    const lines = [...store.feed].reverse().slice(0, 10).map(feedLine).join("");
    feedEl.innerHTML = `<div class="stat-head"><strong>Sự kiện gần đây</strong></div>${
      lines || `<div class="empty-note">Chưa có sự kiện</div>`
    }`;
  };

  const renderRoomButtons = () => {
    const view = room.view();
    if (themeSelect.value !== view.theme) themeSelect.value = view.theme;
    const zoom = hud.querySelector("[data-zoom]");
    if (zoom) zoom.textContent = view.zoom;
    const day = hud.querySelector('[data-act="day"]');
    if (day) {
      day.innerHTML = view.night ? ICONS.moon : ICONS.sun;
      day.classList.toggle("active", view.night);
    }
    const mute = hud.querySelector('[data-act="mute"]');
    if (mute) {
      mute.innerHTML = view.mute ? ICONS.mute : ICONS.volume;
      mute.classList.toggle("active", view.mute);
    }
  };

  const refresh = () => {
    renderConn();
    renderCameras();
    renderStats();
    renderPeople();
    renderDetail();
    renderVisits();
    renderFeed();
  };

  store.subscribe(refresh);
  room.subscribe(renderRoomButtons);
  refresh();
  renderRoomButtons();

  /** Keep live clocks ticking even when people frames are quiet. */
  window.setInterval(() => {
    if (store.people().length || store.selected) {
      renderPeople();
      renderDetail();
    }
  }, 1000);

  let bannerTimer = 0;
  store.onEvent((e) => {
    if (e.type !== "alert") return;
    const names = (e.items ?? []).map((l) => store.viOf(l)).join(", ");
    const id = e.track_id === null ? "#?" : `#${e.track_id}`;
    banner.textContent = `CẢNH BÁO · ${store.cameraName(e.camera_id)} · ${id} mang ${names}`;
    banner.hidden = false;
    window.clearTimeout(bannerTimer);
    bannerTimer = window.setTimeout(() => {
      banner.hidden = true;
    }, BANNER_MS);
    if (!room.isMuted) beepAlert();
  });

  let delay = 0;
  for (const el of hud.querySelectorAll<HTMLElement>(".btn, .zoom, .conn, .cam-select")) {
    el.classList.add("enter");
    el.style.animationDelay = `${delay}ms`;
    delay += 18;
  }
  window.setTimeout(() => {
    for (const el of hud.querySelectorAll<HTMLElement>(".enter")) el.style.animation = "none";
    enableSprings();
  }, 1100);
}
