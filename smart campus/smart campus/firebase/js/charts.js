// ═══════════════════════════════════════════════════════════════
//  CyberCharts — Chart.js wrapper for Smart Campus
// ═══════════════════════════════════════════════════════════════

const GRID  = "rgba(255,255,255,0.05)";
const FONT  = { family:"Segoe UI, system-ui, sans-serif", size:11 };
const TIP   = { backgroundColor:"rgba(5,5,20,0.95)", borderColor:"rgba(0,212,255,0.3)", borderWidth:1, titleFont:FONT, bodyFont:FONT };

Chart.defaults.color = "#8892b0";
Chart.defaults.font  = FONT;

export const PALETTE = {
  blue:   { line:"#00d4ff", fill:"rgba(0,212,255,0.22)",  solid:"rgba(0,212,255,0.75)"  },
  green:  { line:"#00ff88", fill:"rgba(0,255,136,0.22)",  solid:"rgba(0,255,136,0.75)"  },
  purple: { line:"#7b2fff", fill:"rgba(123,47,255,0.22)", solid:"rgba(123,47,255,0.75)" },
  yellow: { line:"#ffcc00", fill:"rgba(255,204,0,0.22)",  solid:"rgba(255,204,0,0.75)"  },
  red:    { line:"#ff3366", fill:"rgba(255,51,102,0.22)", solid:"rgba(255,51,102,0.75)" },
  orange: { line:"#ff6600", fill:"rgba(255,102,0,0.22)",  solid:"rgba(255,102,0,0.75)"  },
};

function grad(ctx, color, h = 260) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, PALETTE[color]?.fill ?? "rgba(0,212,255,0.22)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  return g;
}

function baseScales(yMax = null, pct = false) {
  return {
    x: { grid:{ color:GRID }, ticks:{ font:FONT } },
    y: { grid:{ color:GRID }, ticks:{ font:FONT, callback: v => pct ? v+"%" : v },
         ...(yMax !== null ? { max:yMax } : {}) },
  };
}

// ── Area / Line ───────────────────────────────────────────────────────────────
export function areaChart(id, labels, datasets, { yMax=null, pct=false } = {}) {
  const el = document.getElementById(id); if (!el) return null;
  const ctx = el.getContext("2d");
  return new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: datasets.map(ds => ({
        label: ds.label,
        data:  ds.data,
        borderColor:      PALETTE[ds.color]?.line ?? ds.color ?? "#00d4ff",
        backgroundColor:  ds.fill !== false ? grad(ctx, ds.color) : "transparent",
        borderWidth: 2, fill: ds.fill !== false, tension: 0.4,
        pointBackgroundColor: PALETTE[ds.color]?.line ?? "#00d4ff",
        pointRadius: 3, pointHoverRadius: 6,
      })),
    },
    options: {
      responsive:true, maintainAspectRatio:true,
      interaction:{ mode:"index", intersect:false },
      plugins:{ legend:{ display:datasets.length>1, position:"top", labels:{ boxWidth:12, padding:12 } }, tooltip:TIP },
      scales: baseScales(yMax, pct),
    },
  });
}

// ── Bar ───────────────────────────────────────────────────────────────────────
export function barChart(id, labels, datasets, { yMax=null, pct=false, horizontal=false } = {}) {
  const el = document.getElementById(id); if (!el) return null;
  return new Chart(el.getContext("2d"), {
    type: "bar",
    data: {
      labels,
      datasets: datasets.map(ds => ({
        label: ds.label, data: ds.data,
        backgroundColor: ds.colors ?? PALETTE[ds.color]?.solid ?? "rgba(0,212,255,0.75)",
        borderColor:     ds.borders ?? PALETTE[ds.color]?.line  ?? "#00d4ff",
        borderWidth:1, borderRadius:4,
      })),
    },
    options: {
      responsive:true, maintainAspectRatio:true,
      indexAxis: horizontal ? "y" : "x",
      plugins:{ legend:{ display:datasets.length>1, position:"top", labels:{ boxWidth:12 } }, tooltip:TIP },
      scales: baseScales(yMax, pct),
    },
  });
}

// ── Doughnut ──────────────────────────────────────────────────────────────────
export function doughnutChart(id, labels, data, colors, { cutout="65%", legendPos="bottom" } = {}) {
  const el = document.getElementById(id); if (!el) return null;
  return new Chart(el.getContext("2d"), {
    type: "doughnut",
    data: {
      labels,
      datasets:[{
        data,
        backgroundColor: colors.map(c => PALETTE[c]?.solid ?? c+"bb"),
        borderColor:     colors.map(c => PALETTE[c]?.line  ?? c),
        borderWidth:2, hoverOffset:8,
      }],
    },
    options: {
      responsive:true, maintainAspectRatio:true, cutout,
      plugins:{ legend:{ position:legendPos, labels:{ boxWidth:12, padding:10 } }, tooltip:TIP },
    },
  });
}

// ── Polar Area ────────────────────────────────────────────────────────────────
export function polarChart(id, labels, data, colors) {
  const el = document.getElementById(id); if (!el) return null;
  return new Chart(el.getContext("2d"), {
    type: "polarArea",
    data: {
      labels,
      datasets:[{
        data,
        backgroundColor: colors.map(c => PALETTE[c]?.solid ?? c),
        borderColor:     colors.map(c => PALETTE[c]?.line  ?? c),
        borderWidth:2,
      }],
    },
    options: {
      responsive:true, maintainAspectRatio:true,
      plugins:{ legend:{ position:"bottom", labels:{ boxWidth:12, padding:10 } }, tooltip:TIP },
      scales:{ r:{ grid:{ color:GRID }, ticks:{ display:false } } },
    },
  });
}

// ── Radar ─────────────────────────────────────────────────────────────────────
export function radarChart(id, labels, datasets) {
  const el = document.getElementById(id); if (!el) return null;
  return new Chart(el.getContext("2d"), {
    type: "radar",
    data: {
      labels,
      datasets: datasets.map(ds => ({
        label: ds.label, data: ds.data,
        borderColor:      PALETTE[ds.color]?.line ?? "#00d4ff",
        backgroundColor:  PALETTE[ds.color]?.fill ?? "rgba(0,212,255,0.15)",
        pointBackgroundColor: PALETTE[ds.color]?.line ?? "#00d4ff",
        borderWidth:2,
      })),
    },
    options: {
      responsive:true, maintainAspectRatio:true,
      plugins:{ legend:{ position:"top", labels:{ boxWidth:12 } }, tooltip:TIP },
      scales:{ r:{ grid:{ color:GRID }, angleLines:{ color:GRID }, ticks:{ display:false },
                   pointLabels:{ font:FONT, color:"#8892b0" } } },
    },
  });
}
