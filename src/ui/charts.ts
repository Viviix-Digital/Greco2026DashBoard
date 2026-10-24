export interface AreaChartOpts {
  width?: number;
  height?: number;
  series: { name: string; color: string; values: number[] }[];
  labels: string[];
  emptyText?: string;
}

export interface BarChartOpts {
  width?: number;
  height?: number;
  items: { label: string; value: number; color?: string }[];
  emptyText?: string;
}

function esc(text: unknown) {
  return String(text).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

function niceMax(n: number) {
  if (n <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(n)));
  const m = Math.ceil(n / p);
  return m * p;
}

/** Dual (or multi) series area/line chart as inline SVG. */
export function renderAreaChart(opts: AreaChartOpts): string {
  const w = opts.width ?? 520;
  const h = opts.height ?? 180;
  const pad = { t: 16, r: 12, b: 28, l: 36 };
  const iw = w - pad.l - pad.r;
  const ih = h - pad.t - pad.b;
  const labels = opts.labels;
  const series = opts.series;
  const n = Math.max(labels.length, ...series.map((s) => s.values.length), 0);

  if (!n || series.every((s) => s.values.every((v) => v === 0))) {
    return `<div class="chart-empty">${esc(opts.emptyText ?? "Chưa có dữ liệu")}</div>`;
  }

  const maxY = niceMax(Math.max(1, ...series.flatMap((s) => s.values)));
  const xAt = (i: number) => pad.l + (n <= 1 ? iw / 2 : (i / (n - 1)) * iw);
  const yAt = (v: number) => pad.t + ih - (v / maxY) * ih;

  const grid: string[] = [];
  for (let g = 0; g <= 4; g++) {
    const y = pad.t + (ih * g) / 4;
    const val = Math.round(maxY * (1 - g / 4));
    grid.push(
      `<line x1="${pad.l}" y1="${y}" x2="${w - pad.r}" y2="${y}" class="chart-grid"/>`,
      `<text x="${pad.l - 6}" y="${y + 3}" class="chart-axis" text-anchor="end">${val}</text>`,
    );
  }

  const paths = series
    .map((s) => {
      const pts = s.values.slice(0, n).map((v, i) => `${xAt(i).toFixed(1)},${yAt(v).toFixed(1)}`);
      if (!pts.length) return "";
      const line = `M${pts.join(" L")}`;
      const area = `${line} L${xAt(Math.min(s.values.length, n) - 1).toFixed(1)},${(pad.t + ih).toFixed(1)} L${xAt(0).toFixed(1)},${(pad.t + ih).toFixed(1)} Z`;
      const gid = `g-${s.color.replace(/[^a-z0-9]/gi, "")}`;
      return `
        <defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${s.color}" stop-opacity="0.35"/>
          <stop offset="100%" stop-color="${s.color}" stop-opacity="0"/>
        </linearGradient></defs>
        <path d="${area}" fill="url(#${gid})"/>
        <path d="${line}" fill="none" stroke="${s.color}" stroke-width="2" stroke-linejoin="round"/>`;
    })
    .join("");

  const step = Math.max(1, Math.ceil(n / 6));
  const xLabels = labels
    .map((lab, i) =>
      i % step === 0 || i === n - 1
        ? `<text x="${xAt(i)}" y="${h - 8}" class="chart-axis" text-anchor="middle">${esc(lab)}</text>`
        : "",
    )
    .join("");

  const legend = series
    .map(
      (s) =>
        `<span class="chart-leg"><i style="background:${s.color}"></i>${esc(s.name)}</span>`,
    )
    .join("");

  return `
    <div class="chart-wrap">
      <div class="chart-legend">${legend}</div>
      <svg class="chart-svg" viewBox="0 0 ${w} ${h}" width="100%" height="${h}" role="img">
        ${grid.join("")}
        ${paths}
        ${xLabels}
      </svg>
    </div>`;
}

/** Horizontal bar chart as inline SVG. */
export function renderBarChart(opts: BarChartOpts): string {
  const items = opts.items.slice(0, 10);
  if (!items.length) {
    return `<div class="chart-empty">${esc(opts.emptyText ?? "Chưa có dữ liệu")}</div>`;
  }
  const w = opts.width ?? 520;
  const rowH = 22;
  const pad = { t: 8, r: 48, b: 8, l: 110 };
  const h = pad.t + pad.b + items.length * rowH;
  const iw = w - pad.l - pad.r;
  const max = niceMax(Math.max(1, ...items.map((i) => i.value)));

  const rows = items
    .map((it, i) => {
      const y = pad.t + i * rowH;
      const bw = Math.max(2, (it.value / max) * iw);
      const color = it.color ?? "#6d8ad8";
      const name = it.label.length > 16 ? `${it.label.slice(0, 15)}…` : it.label;
      return `
        <text x="${pad.l - 8}" y="${y + 14}" class="chart-axis" text-anchor="end">${esc(name)}</text>
        <rect x="${pad.l}" y="${y + 4}" width="${bw.toFixed(1)}" height="12" rx="4" fill="${color}" opacity="0.9"/>
        <text x="${pad.l + bw + 6}" y="${y + 14}" class="chart-axis">${it.value}</text>`;
    })
    .join("");

  return `
    <div class="chart-wrap">
      <svg class="chart-svg" viewBox="0 0 ${w} ${h}" width="100%" height="${h}" role="img">${rows}</svg>
    </div>`;
}

/** Compact sparkline for occupancy samples. */
export function renderSparkline(
  points: { persons: number; inside: number }[],
  opts?: { width?: number; height?: number },
): string {
  const w = opts?.width ?? 520;
  const h = opts?.height ?? 100;
  if (points.length < 2) {
    return `<div class="chart-empty">Đang thu thập… sẽ hiện sau vài mẫu</div>`;
  }
  return renderAreaChart({
    width: w,
    height: h,
    labels: points.map((_, i) => (i === 0 || i === points.length - 1 ? "" : "")),
    series: [
      { name: "Đang thấy", color: "#6d8ad8", values: points.map((p) => p.persons) },
      { name: "Trong vùng", color: "#3faa78", values: points.map((p) => p.inside) },
    ],
  });
}
