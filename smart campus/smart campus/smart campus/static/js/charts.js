// ── Shared Chart Utilities — Smart Campus Digital Twin ───────────────────────
// This module provides reusable chart factory functions used across pages.

const CyberCharts = (() => {
  const GRID = 'rgba(255,255,255,0.05)';
  const FONT = { family: 'Segoe UI', size: 11 };
  const COLORS = {
    blue:   { line: '#00d4ff', fill: 'rgba(0,212,255,0.25)',   solid: 'rgba(0,212,255,0.7)'   },
    green:  { line: '#00ff88', fill: 'rgba(0,255,136,0.25)',   solid: 'rgba(0,255,136,0.7)'   },
    purple: { line: '#7b2fff', fill: 'rgba(123,47,255,0.25)',  solid: 'rgba(123,47,255,0.7)'  },
    yellow: { line: '#ffcc00', fill: 'rgba(255,204,0,0.25)',   solid: 'rgba(255,204,0,0.7)'   },
    red:    { line: '#ff3366', fill: 'rgba(255,51,102,0.25)',  solid: 'rgba(255,51,102,0.7)'  },
    orange: { line: '#ff6600', fill: 'rgba(255,102,0,0.25)',   solid: 'rgba(255,102,0,0.7)'   },
  };

  Chart.defaults.color = '#8892b0';
  Chart.defaults.font  = FONT;

  function gradient(ctx, color, h = 280) {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, COLORS[color]?.fill ?? 'rgba(0,212,255,0.25)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    return g;
  }

  function baseScales(yLabel = '', yMax = null) {
    const y = {
      grid: { color: GRID },
      ticks: { font: FONT },
    };
    if (yMax !== null) y.max = yMax;
    if (yLabel) y.title = { display: true, text: yLabel, font: FONT };
    return {
      x: { grid: { color: GRID }, ticks: { font: FONT } },
      y,
    };
  }

  // ── Area / Line chart ──────────────────────────────────────────────────────
  function area(canvasId, labels, datasets, opts = {}) {
    const el = document.getElementById(canvasId);
    if (!el) return null;
    const ctx = el.getContext('2d');
    return new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: datasets.map(ds => ({
          label: ds.label,
          data: ds.data,
          borderColor: COLORS[ds.color]?.line ?? ds.color ?? '#00d4ff',
          backgroundColor: ds.fill !== false ? gradient(ctx, ds.color) : 'transparent',
          borderWidth: ds.width ?? 2,
          fill: ds.fill !== false,
          tension: ds.tension ?? 0.4,
          pointBackgroundColor: COLORS[ds.color]?.line ?? '#00d4ff',
          pointRadius: ds.pointRadius ?? 3,
          pointHoverRadius: 6,
          yAxisID: ds.yAxisID,
        })),
      },
      options: {
        responsive: true,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: datasets.length > 1, position: 'top', labels: { boxWidth: 12, padding: 12 } },
          tooltip: { backgroundColor: 'rgba(5,5,20,0.95)', borderColor: 'rgba(0,212,255,0.3)', borderWidth: 1 },
        },
        scales: baseScales(opts.yLabel, opts.yMax),
        ...opts.extra,
      },
    });
  }

  // ── Bar chart ──────────────────────────────────────────────────────────────
  function bar(canvasId, labels, datasets, opts = {}) {
    const el = document.getElementById(canvasId);
    if (!el) return null;
    const ctx = el.getContext('2d');
    return new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: datasets.map(ds => ({
          label: ds.label,
          data: ds.data,
          backgroundColor: ds.colors ?? COLORS[ds.color]?.solid ?? 'rgba(0,212,255,0.7)',
          borderColor: ds.borderColors ?? COLORS[ds.color]?.line ?? '#00d4ff',
          borderWidth: 1,
          borderRadius: ds.radius ?? 4,
          indexAxis: opts.horizontal ? 'y' : 'x',
        })),
      },
      options: {
        responsive: true,
        indexAxis: opts.horizontal ? 'y' : 'x',
        plugins: {
          legend: { display: datasets.length > 1, position: 'top', labels: { boxWidth: 12 } },
          tooltip: { backgroundColor: 'rgba(5,5,20,0.95)', borderColor: 'rgba(0,212,255,0.3)', borderWidth: 1 },
        },
        scales: baseScales(opts.yLabel, opts.yMax),
      },
    });
  }

  // ── Doughnut chart ─────────────────────────────────────────────────────────
  function doughnut(canvasId, labels, data, colors, opts = {}) {
    const el = document.getElementById(canvasId);
    if (!el) return null;
    const ctx = el.getContext('2d');
    return new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: colors.map(c => COLORS[c]?.solid ?? c + 'bb'),
          borderColor:      colors.map(c => COLORS[c]?.line  ?? c),
          borderWidth: 2,
          hoverOffset: 8,
        }],
      },
      options: {
        responsive: true,
        cutout: opts.cutout ?? '65%',
        plugins: {
          legend: { position: opts.legendPos ?? 'bottom', labels: { boxWidth: 12, padding: 10 } },
          tooltip: { backgroundColor: 'rgba(5,5,20,0.95)', borderColor: 'rgba(0,212,255,0.3)', borderWidth: 1 },
        },
      },
    });
  }

  // ── Radar chart ───────────────────────────────────────────────────────────
  function radar(canvasId, labels, datasets) {
    const el = document.getElementById(canvasId);
    if (!el) return null;
    const ctx = el.getContext('2d');
    return new Chart(ctx, {
      type: 'radar',
      data: {
        labels,
        datasets: datasets.map(ds => ({
          label: ds.label,
          data: ds.data,
          borderColor: COLORS[ds.color]?.line ?? '#00d4ff',
          backgroundColor: COLORS[ds.color]?.fill ?? 'rgba(0,212,255,0.15)',
          pointBackgroundColor: COLORS[ds.color]?.line ?? '#00d4ff',
          borderWidth: 2,
        })),
      },
      options: {
        responsive: true,
        plugins: { legend: { position: 'top', labels: { boxWidth: 12 } } },
        scales: {
          r: {
            grid: { color: GRID },
            angleLines: { color: GRID },
            ticks: { display: false },
            pointLabels: { font: FONT, color: '#8892b0' },
          },
        },
      },
    });
  }

  // ── Gauge (arc) using doughnut trick ──────────────────────────────────────
  function gauge(canvasId, value, max = 100, color = 'blue') {
    const el = document.getElementById(canvasId);
    if (!el) return null;
    const ctx = el.getContext('2d');
    const pct = Math.min(value / max, 1);
    return new Chart(ctx, {
      type: 'doughnut',
      data: {
        datasets: [{
          data: [pct * 100, (1 - pct) * 100],
          backgroundColor: [COLORS[color]?.solid ?? '#00d4ff', 'rgba(255,255,255,0.05)'],
          borderWidth: 0,
          circumference: 180,
          rotation: -90,
        }],
      },
      options: {
        responsive: true,
        cutout: '75%',
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
      },
    });
  }

  return { area, bar, doughnut, radar, gauge, COLORS, gradient };
})();
