import {
  fetchEvents,
  fetchHourly,
  fetchTopItems,
  fetchTracks,
  rangeWindow,
  type HistoryRange,
  type HourlyBucket,
  type TopItem,
} from "../live/history";
import type { LiveStore } from "../live/store";
import { formatDuration } from "../live/time";
import type { CompletedVisit, FeedEvent } from "../live/types";
import { renderAreaChart, renderBarChart, renderSparkline } from "./charts";

const CAMERA_STATUS: Record<string, string> = {
  running: "Đang chạy",
  offline: "Mất tín hiệu",
  error: "Lỗi",
  disabled: "Đã tắt",
  stopped: "Đã dừng",
};

function esc(text: unknown) {
  return String(text).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

function clock(ts: number) {
  return new Date(ts * 1000).toLocaleString("vi-VN", { hour12: false });
}

export interface AnalyticsPanel {
  open(): void;
  close(): void;
  destroy(): void;
}

type Tab = "events" | "tracks";

export function mountAnalytics(hud: HTMLElement, store: LiveStore): AnalyticsPanel {
  const root = document.createElement("div");
  root.className = "analytics-overlay";
  root.hidden = true;
  root.innerHTML = `
    <div class="analytics-sheet card">
      <div class="analytics-head">
        <div>
          <h2>Thống kê &amp; lịch sử</h2>
          <p class="muted">Dữ liệu live + nhật ký Vision Expo</p>
        </div>
        <button type="button" class="btn" data-act="close-analytics" title="Đóng">×</button>
      </div>
      <div class="analytics-filters">
        <label>Camera
          <select data-a="camera"></select>
        </label>
        <label>Khoảng thời gian
          <select data-a="range">
            <option value="today">Hôm nay</option>
            <option value="24h" selected>24 giờ</option>
            <option value="7d">7 ngày</option>
          </select>
        </label>
        <button type="button" class="wide primary" data-act="reload-analytics">Làm mới</button>
      </div>
      <div class="analytics-kpis" data-a="kpis"></div>
      <div class="analytics-grid">
        <section class="analytics-block">
          <div class="stat-head"><strong>Lượt vào / ra theo giờ</strong></div>
          <div data-a="hourly"></div>
        </section>
        <section class="analytics-block">
          <div class="stat-head"><strong>Top vật phẩm</strong></div>
          <div data-a="items"></div>
        </section>
        <section class="analytics-block">
          <div class="stat-head"><strong>Occupancy (phiên này)</strong></div>
          <div data-a="spark"></div>
        </section>
        <section class="analytics-block analytics-table-block">
          <div class="stat-head">
            <div class="analytics-tabs">
              <button type="button" class="chip tab on" data-tab="events">Sự kiện</button>
              <button type="button" class="chip tab" data-tab="tracks">Lượt người</button>
            </div>
            <span class="chip" data-a="tab-count">0</span>
          </div>
          <div class="analytics-table-wrap" data-a="table"></div>
          <div class="analytics-pager">
            <button type="button" class="wide" data-act="page-prev">← Trước</button>
            <span data-a="page-label">1</span>
            <button type="button" class="wide" data-act="page-next">Sau →</button>
          </div>
        </section>
      </div>
      <div class="analytics-error muted" data-a="error" hidden></div>
    </div>
  `;
  hud.append(root);

  const $ = <T extends HTMLElement>(sel: string) => root.querySelector(sel) as T;
  const camSel = $<HTMLSelectElement>('[data-a="camera"]');
  const rangeSel = $<HTMLSelectElement>('[data-a="range"]');
  const kpisEl = $('[data-a="kpis"]');
  const hourlyEl = $('[data-a="hourly"]');
  const itemsEl = $('[data-a="items"]');
  const sparkEl = $('[data-a="spark"]');
  const tableEl = $('[data-a="table"]');
  const tabCount = $('[data-a="tab-count"]');
  const pageLabel = $('[data-a="page-label"]');
  const errorEl = $('[data-a="error"]');

  let tab: Tab = "events";
  let page = 0;
  const pageSize = 12;
  let events: FeedEvent[] = [];
  let tracks: CompletedVisit[] = [];
  let loading = false;
  let openState = false;

  const fillCameras = () => {
    const cams = store.cameras;
    const cur = camSel.value;
    const opts = [`<option value="">Tất cả camera</option>`].concat(
      cams.map((c) => `<option value="${esc(c.id)}">${esc(c.name || c.id)}</option>`),
    );
    camSel.innerHTML = opts.join("");
    if (cur && [...camSel.options].some((o) => o.value === cur)) camSel.value = cur;
    else if (store.activeCamera) camSel.value = store.activeCamera;
  };

  const renderKpis = () => {
    const s = store.stats();
    const n = (v: number | null | undefined) => (v == null ? "–" : String(v));
    const status = CAMERA_STATUS[s.status] ?? s.status;
    kpisEl.innerHTML = `
      <div class="kpi"><b>${n(s.persons)}</b><span>Đang thấy</span></div>
      <div class="kpi"><b>${n(s.inside)}</b><span>Trong vùng</span></div>
      <div class="kpi"><b>${n(s.outside)}</b><span>Ngoài vùng</span></div>
      <div class="kpi"><b>${n(s.entries)}</b><span>Lượt vào</span></div>
      <div class="kpi"><b>${n(s.exits)}</b><span>Lượt ra</span></div>
      <div class="kpi ${s.alerts > 0 ? "danger" : ""}"><b>${n(s.alerts)}</b><span>Cảnh báo</span></div>
      <div class="kpi"><b>${s.fps != null ? s.fps.toFixed(0) : "–"}</b><span>FPS</span></div>
      <div class="kpi"><b>${esc(status)}</b><span>Trạng thái</span></div>`;
  };

  const renderHourly = (rows: HourlyBucket[]) => {
    hourlyEl.innerHTML = renderAreaChart({
      labels: rows.map((r) => r.label),
      series: [
        { name: "Vào", color: "#3faa78", values: rows.map((r) => r.entries) },
        { name: "Ra", color: "#e07a5f", values: rows.map((r) => r.exits) },
      ],
      emptyText: "Chưa có thống kê theo giờ",
    });
  };

  const renderItems = (rows: TopItem[]) => {
    itemsEl.innerHTML = renderBarChart({
      items: rows.map((r) => ({
        label: r.vi || store.viOf(r.label) || r.label,
        value: r.count,
        color: "#6d8ad8",
      })),
      emptyText: "Chưa có top vật phẩm",
    });
  };

  const renderSpark = () => {
    sparkEl.innerHTML = renderSparkline(store.occupancySamples());
  };

  const eventRow = (e: FeedEvent) => {
    const cam = esc(store.cameraName(e.camera_id));
    const t = clock(e.ts);
    if (e.type === "crossing") {
      const id = e.track_id == null ? "#?" : `#${e.track_id}`;
      const dwell = e.direction === "out" && typeof e.dwell_s === "number" ? ` · ${Math.round(e.dwell_s)}s` : "";
      return `<tr><td>${t}</td><td>${e.direction === "in" ? "VÀO" : "RA"}</td><td>${id} · ${cam}${esc(dwell)}</td></tr>`;
    }
    if (e.type === "alert") {
      const id = e.track_id == null ? "#?" : `#${e.track_id}`;
      const names = (e.items ?? []).map((l) => store.viOf(l)).join(", ");
      return `<tr class="row-alert"><td>${t}</td><td>CẢNH BÁO</td><td>${id} · ${esc(names)} · ${cam}</td></tr>`;
    }
    if (e.type === "camera") {
      const st = CAMERA_STATUS[e.status] ?? e.status;
      return `<tr><td>${t}</td><td>CAMERA</td><td>${cam}: ${esc(st)}</td></tr>`;
    }
    return `<tr><td>${t}</td><td>RESET</td><td>${cam}</td></tr>`;
  };

  const trackRow = (v: CompletedVisit) => {
    const id = v.trackId == null ? "#?" : `#${v.trackId}`;
    const items = Object.entries(v.items)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([l]) => store.viOf(l))
      .join(", ");
    const dwell = v.dwellS != null ? formatDuration(v.dwellS) : "—";
    return `<tr class="${v.alert ? "row-alert" : ""}">
      <td>${clock(v.lastTs)}</td>
      <td>${esc(id)}</td>
      <td>${esc(store.cameraName(v.cameraId))}</td>
      <td>${esc(formatDuration(v.duration))}</td>
      <td>${esc(dwell)}</td>
      <td>${esc(items || "—")}</td>
    </tr>`;
  };

  const renderTable = () => {
    const list = tab === "events" ? events : tracks;
    const totalPages = Math.max(1, Math.ceil(list.length / pageSize));
    if (page >= totalPages) page = totalPages - 1;
    const slice = list.slice(page * pageSize, page * pageSize + pageSize);
    tabCount.textContent = String(list.length);
    pageLabel.textContent = `${page + 1} / ${totalPages}`;

    if (!slice.length) {
      const fallback =
        tab === "events"
          ? store.feed.slice().reverse().slice(0, pageSize)
          : store.recentVisits(pageSize);
      if (fallback.length && !events.length && !tracks.length) {
        // show live ring when REST empty
        if (tab === "events") {
          tableEl.innerHTML = `<table class="analytics-table"><thead><tr><th>Thời gian</th><th>Loại</th><th>Chi tiết</th></tr></thead><tbody>${(fallback as FeedEvent[]).map(eventRow).join("")}</tbody></table>
            <p class="muted tiny">Đang hiện bộ nhớ phiên (REST trống hoặc lỗi)</p>`;
        } else {
          tableEl.innerHTML = `<table class="analytics-table"><thead><tr><th>Thời gian</th><th>ID</th><th>Camera</th><th>Thấy</th><th>Trong vùng</th><th>Vật phẩm</th></tr></thead><tbody>${(fallback as CompletedVisit[]).map(trackRow).join("")}</tbody></table>
            <p class="muted tiny">Đang hiện bộ nhớ phiên (REST trống hoặc lỗi)</p>`;
        }
        tabCount.textContent = String(fallback.length);
        return;
      }
      tableEl.innerHTML = `<div class="empty-note">Chưa có ${tab === "events" ? "sự kiện" : "lượt người"}</div>`;
      return;
    }

    if (tab === "events") {
      tableEl.innerHTML = `<table class="analytics-table"><thead><tr><th>Thời gian</th><th>Loại</th><th>Chi tiết</th></tr></thead><tbody>${(slice as FeedEvent[]).map(eventRow).join("")}</tbody></table>`;
    } else {
      tableEl.innerHTML = `<table class="analytics-table"><thead><tr><th>Thời gian</th><th>ID</th><th>Camera</th><th>Thấy</th><th>Trong vùng</th><th>Vật phẩm</th></tr></thead><tbody>${(slice as CompletedVisit[]).map(trackRow).join("")}</tbody></table>`;
    }
  };

  const load = async () => {
    if (loading) return;
    loading = true;
    errorEl.hidden = true;
    fillCameras();
    renderKpis();
    renderSpark();
    const range = rangeSel.value as HistoryRange;
    const { from, to } = rangeWindow(range, store.now());
    const cameraId = camSel.value || null;
    const q = { from, to, cameraId, limit: 200 };

    hourlyEl.innerHTML = `<div class="empty-note">Đang tải…</div>`;
    itemsEl.innerHTML = `<div class="empty-note">Đang tải…</div>`;

    const errors: string[] = [];
    const [hourly, items, ev, tr] = await Promise.all([
      fetchHourly(store.config, q).catch((e) => {
        errors.push(e instanceof Error ? e.message : "hourly lỗi");
        return [] as HourlyBucket[];
      }),
      fetchTopItems(store.config, { ...q, limit: 12 }).catch((e) => {
        errors.push(e instanceof Error ? e.message : "top_items lỗi");
        return [] as TopItem[];
      }),
      fetchEvents(store.config, q).catch((e) => {
        errors.push(e instanceof Error ? e.message : "events lỗi");
        return [] as FeedEvent[];
      }),
      fetchTracks(store.config, q).catch((e) => {
        errors.push(e instanceof Error ? e.message : "tracks lỗi");
        return [] as CompletedVisit[];
      }),
    ]);

    events = ev;
    tracks = tr;
    page = 0;
    renderHourly(hourly);
    renderItems(items);
    renderTable();

    if (errors.length) {
      errorEl.hidden = false;
      errorEl.textContent = `REST: ${errors.join(" · ")} — vẫn dùng dữ liệu phiên nếu có.`;
    }
    loading = false;
  };

  root.addEventListener("click", (e) => {
    const t = e.target as HTMLElement;
    if (t === root || t.closest("[data-act='close-analytics']")) {
      close();
      return;
    }
    const tabBtn = t.closest<HTMLElement>("[data-tab]");
    if (tabBtn?.dataset.tab) {
      tab = tabBtn.dataset.tab as Tab;
      page = 0;
      root.querySelectorAll("[data-tab]").forEach((el) => el.classList.toggle("on", el === tabBtn));
      renderTable();
      return;
    }
    const act = t.closest<HTMLElement>("[data-act]")?.dataset.act;
    if (act === "reload-analytics") void load();
    if (act === "page-prev") {
      page = Math.max(0, page - 1);
      renderTable();
    }
    if (act === "page-next") {
      page += 1;
      renderTable();
    }
  });

  camSel.addEventListener("change", () => void load());
  rangeSel.addEventListener("change", () => void load());

  const unsub = store.subscribe(() => {
    if (!openState) return;
    renderKpis();
    renderSpark();
  });

  const open = () => {
    openState = true;
    root.hidden = false;
    void load();
  };

  const close = () => {
    openState = false;
    root.hidden = true;
  };

  return {
    open,
    close,
    destroy() {
      unsub();
      root.remove();
    },
  };
}
