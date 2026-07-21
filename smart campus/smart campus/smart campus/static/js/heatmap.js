// ── Analytics & Heatmaps ─────────────────────────────────────────────────────
let charts = {};

// ── Tab switching ─────────────────────────────────────────────────────────────
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content-panel').forEach(p => p.style.display = 'none');
    btn.classList.add('active');
    const tab = btn.dataset.tab;
    document.getElementById('tab-' + tab).style.display = 'block';
    if (tab === 'heatmap')    renderHeatmaps();
    if (tab === 'predictions') renderPredictions();
    if (tab === 'congestion') loadCongestion();
  });
});

// ── Occupancy Tab ─────────────────────────────────────────────────────────────
async function loadOccupancy() {
  const data = await fetch('/api/analytics/occupancy').then(r => r.json());

  if (charts.occBar) charts.occBar.destroy();
  charts.occBar = CyberCharts.bar(
    'occupancyBarChart',
    data.map(d => d.room_id),
    [
      {
        label: 'Current %',
        data: data.map(d => d.pct),
        colors:       data.map(d => d.pct > 80 ? 'rgba(255,51,102,0.7)' : d.pct > 50 ? 'rgba(255,204,0,0.7)' : 'rgba(0,255,136,0.7)'),
        borderColors: data.map(d => d.pct > 80 ? '#ff3366' : d.pct > 50 ? '#ffcc00' : '#00ff88'),
      },
      {
        label: 'Predicted %',
        data: data.map(d => d.capacity > 0 ? Math.round(d.predicted_next / d.capacity * 100) : 0),
        colors:       data.map(() => 'rgba(0,212,255,0.3)'),
        borderColors: data.map(() => '#00d4ff'),
      },
    ],
    { yMax: 100, yLabel: 'Occupancy %' }
  );

  // Building summary
  const buildings = {};
  data.forEach(d => {
    if (!buildings[d.building]) buildings[d.building] = { total: 0, cap: 0, rooms: 0 };
    buildings[d.building].total += d.current;
    buildings[d.building].cap   += d.capacity;
    buildings[d.building].rooms++;
  });
  document.getElementById('buildingSummary').innerHTML = Object.entries(buildings).map(([name, b]) => {
    const pct = b.cap > 0 ? Math.round(b.total / b.cap * 100) : 0;
    return `
      <div class="mb-3">
        <div class="d-flex justify-content-between mb-1">
          <span style="font-size:13px;font-weight:500">${name}</span>
          <span style="font-size:12px;color:${pct>80?'var(--neon-red)':pct>50?'var(--neon-yellow)':'var(--neon-green)'}">${pct}%</span>
        </div>
        <div class="cyber-progress">
          <div class="cyber-progress-bar ${pct>80?'red':pct>50?'yellow':'green'}" style="width:${pct}%"></div>
        </div>
        <div style="font-size:11px;color:var(--text-muted)">${b.total}/${b.cap} · ${b.rooms} rooms</div>
      </div>`;
  }).join('');

  // Table
  document.getElementById('occupancyTable').innerHTML = data.map(d => `
    <tr>
      <td style="font-weight:500">${d.name}</td>
      <td style="color:var(--neon-blue);font-size:12px">${d.building}</td>
      <td>${d.current}</td>
      <td>${d.capacity}</td>
      <td>
        <div class="d-flex align-items-center gap-2">
          <div class="cyber-progress" style="width:80px">
            <div class="cyber-progress-bar ${d.pct>80?'red':d.pct>50?'yellow':'green'}" style="width:${d.pct}%"></div>
          </div>
          <span style="font-size:12px">${d.pct}%</span>
        </div>
      </td>
      <td style="color:var(--neon-blue);font-size:12px">${d.predicted_next} people</td>
    </tr>
  `).join('');
}

// ── Heatmaps ──────────────────────────────────────────────────────────────────
function heatColor(value, max) {
  const pct = max > 0 ? Math.min(value / max, 1) : 0;
  if (pct < 0.33) {
    const t = pct / 0.33;
    return `rgba(0,${Math.round(200*t + 100*(1-t))},${Math.round(136*t)},${0.25 + pct * 0.5})`;
  } else if (pct < 0.66) {
    const t = (pct - 0.33) / 0.33;
    return `rgba(${Math.round(255*t)},${Math.round(204*(1-t) + 200*t)},0,${0.45 + pct * 0.3})`;
  } else {
    const t = (pct - 0.66) / 0.34;
    return `rgba(255,${Math.round(102*(1-t))},${Math.round(102*(1-t))},${0.55 + t * 0.35})`;
  }
}

async function renderHeatmaps() {
  const data = await fetch('/api/analytics/heatmap').then(r => r.json());

  const rooms = ['A101','A102','A103','A104','B101','B102','B103','B104',
                 'C101','C102','C103','D101','D102','D103','E101','E102','E103','F101','F102'];

  const maxIssue = Math.max(...data.issue_density.map(d => d.value), 1);
  const issueMap = Object.fromEntries(data.issue_density.map(d => [d.room, d.value]));
  const occMap   = Object.fromEntries(data.occupancy.map(d => [d.room, d.value]));

  document.getElementById('issueDensityHeatmap').innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px">
      ${rooms.map(id => {
        const v = issueMap[id] || 0;
        return `<div class="heatmap-cell" style="background:${heatColor(v, maxIssue)};border:1px solid rgba(255,255,255,0.08)"
                     title="${id}: ${v} issues">
          <div style="font-size:11px;font-weight:700;color:rgba(255,255,255,0.7)">${id}</div>
          <div style="font-size:20px;font-weight:800;color:${v>2?'#ff3366':v>0?'#ffcc00':'#00ff88'};line-height:1.2">${v}</div>
          <div style="font-size:9px;color:rgba(255,255,255,0.4)">issues</div>
        </div>`;
      }).join('')}
    </div>`;

  document.getElementById('occupancyHeatmap').innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px">
      ${rooms.map(id => {
        const v = occMap[id] || 0;
        return `<div class="heatmap-cell" style="background:${heatColor(v, 100)};border:1px solid rgba(255,255,255,0.08)"
                     title="${id}: ${v}% occupied">
          <div style="font-size:11px;font-weight:700;color:rgba(255,255,255,0.7)">${id}</div>
          <div style="font-size:20px;font-weight:800;color:${v>80?'#ff3366':v>50?'#ffcc00':'#00ff88'};line-height:1.2">${v}%</div>
          <div style="font-size:9px;color:rgba(255,255,255,0.4)">occupied</div>
        </div>`;
      }).join('')}
    </div>`;
}

// ── Congestion Tab ────────────────────────────────────────────────────────────
async function loadCongestion() {
  const data = await fetch('/api/analytics/congestion').then(r => r.json());

  const levelColors = {
    low:      { bg: 'rgba(0,255,136,0.15)',  border: 'rgba(0,255,136,0.3)',  text: '#00ff88' },
    medium:   { bg: 'rgba(255,204,0,0.15)',  border: 'rgba(255,204,0,0.3)',  text: '#ffcc00' },
    high:     { bg: 'rgba(255,102,0,0.2)',   border: 'rgba(255,102,0,0.4)',  text: '#ff6600' },
    critical: { bg: 'rgba(255,51,102,0.25)', border: 'rgba(255,51,102,0.5)', text: '#ff3366' },
  };

  document.getElementById('congestionGrid').innerHTML = data.map(r => {
    const c = levelColors[r.level];
    return `
      <div class="congestion-cell"
           style="background:${c.bg};border-color:${c.border}"
           title="${r.name}: ${r.occupancy}/${r.capacity}">
        <div class="room-id" style="color:rgba(255,255,255,0.6)">${r.id}</div>
        <div class="room-pct" style="color:${c.text}">${r.pct}%</div>
        <div class="room-name">${r.name.replace(/^(Lab|Class|Room)\s/,'')}</div>
      </div>`;
  }).join('');

  // Building congestion chart
  const buildings = {};
  data.forEach(d => {
    if (!buildings[d.building]) buildings[d.building] = { total: 0, cap: 0 };
    buildings[d.building].total += d.occupancy;
    buildings[d.building].cap   += d.capacity;
  });
  const bLabels = Object.keys(buildings);
  const bValues = bLabels.map(b => buildings[b].cap > 0 ? Math.round(buildings[b].total / buildings[b].cap * 100) : 0);

  if (charts.congBuilding) charts.congBuilding.destroy();
  charts.congBuilding = CyberCharts.bar(
    'congestionBuildingChart', bLabels,
    [{
      label: 'Congestion %',
      data: bValues,
      colors:       bValues.map(v => v > 80 ? 'rgba(255,51,102,0.7)' : v > 65 ? 'rgba(255,102,0,0.7)' : v > 35 ? 'rgba(255,204,0,0.7)' : 'rgba(0,255,136,0.7)'),
      borderColors: bValues.map(v => v > 80 ? '#ff3366' : v > 65 ? '#ff6600' : v > 35 ? '#ffcc00' : '#00ff88'),
    }],
    { yMax: 100 }
  );

  // Top congested
  document.getElementById('topCongested').innerHTML = data.slice(0, 5).map((r, i) => `
    <div class="d-flex align-items-center justify-content-between py-2"
         style="border-bottom:1px solid rgba(255,255,255,0.04)">
      <div class="d-flex align-items-center gap-2">
        <span style="font-size:11px;color:var(--text-muted);width:16px">#${i+1}</span>
        <div>
          <div style="font-size:13px;font-weight:500">${r.name}</div>
          <div style="font-size:11px;color:var(--text-muted)">${r.building}</div>
        </div>
      </div>
      <div style="text-align:right">
        <div style="font-size:14px;font-weight:700;color:${levelColors[r.level].text}">${r.pct}%</div>
        <div style="font-size:10px;color:var(--text-muted)">${r.occupancy}/${r.capacity}</div>
      </div>
    </div>
  `).join('');
}

// ── Predictions Tab ───────────────────────────────────────────────────────────
async function renderPredictions() {
  const [trendData, occData] = await Promise.all([
    fetch('/api/analytics/trends').then(r => r.json()),
    fetch('/api/analytics/occupancy').then(r => r.json()),
  ]);

  if (charts.hourly) charts.hourly.destroy();
  charts.hourly = CyberCharts.area(
    'hourlyTrendChart',
    trendData.map(d => d.hour + ':00'),
    [{ label: 'Avg Occupancy %', data: trendData.map(d => d.avg_pct), color: 'green' }],
    { yMax: 100, yLabel: 'Occupancy %' }
  );

  document.getElementById('nextHourPredictions').innerHTML = occData.slice(0, 8).map(d => `
    <div class="d-flex align-items-center justify-content-between py-2"
         style="border-bottom:1px solid rgba(255,255,255,0.04)">
      <div>
        <div style="font-size:13px;font-weight:500">${d.name}</div>
        <div style="font-size:11px;color:var(--text-muted)">Now: ${d.current}/${d.capacity}</div>
      </div>
      <div style="text-align:right">
        <div style="font-size:15px;font-weight:700;color:var(--neon-blue)">${d.predicted_next}</div>
        <div style="font-size:10px;color:var(--text-muted)">predicted</div>
      </div>
    </div>
  `).join('');

  const peakHours = trendData.filter(d => d.avg_pct > 55).sort((a, b) => b.avg_pct - a.avg_pct).slice(0, 6);
  document.getElementById('peakHoursAnalysis').innerHTML = peakHours.map(d => `
    <div class="col-6 col-md-4 col-lg-2">
      <div class="glass-card text-center" style="padding:14px">
        <div style="font-size:24px;font-weight:700;color:var(--neon-yellow)">${d.hour}:00</div>
        <div style="font-size:14px;font-weight:600;color:${d.avg_pct>80?'var(--neon-red)':'var(--neon-yellow)'}">${d.avg_pct}%</div>
        <div style="font-size:10px;color:var(--text-muted);margin-bottom:6px">avg occupancy</div>
        <div class="cyber-progress">
          <div class="cyber-progress-bar ${d.avg_pct>80?'red':'yellow'}" style="width:${d.avg_pct}%"></div>
        </div>
      </div>
    </div>
  `).join('');
}

loadOccupancy();
