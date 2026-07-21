// ── Admin Dashboard ──────────────────────────────────────────────────────────
let charts = {};

// ── KPIs ──────────────────────────────────────────────────────────────────────
async function loadKPIs() {
  const d = await fetch('/api/analytics/summary').then(r => r.json());
  animateCount('kpiRooms',     d.rooms.total);
  animateCount('kpiOccupancy', d.avg_occupancy_pct, '%');
  animateCount('kpiIssues',    d.issues.open);
  animateCount('kpiFaulty',    d.resources.faulty);
  document.getElementById('kpiAvailPct').textContent =
    Math.round(d.rooms.available / d.rooms.total * 100) + '% available';
  document.getElementById('kpiIssuesSub').textContent =
    d.issues.total + ' total · ' + d.issues.resolved + ' resolved';
}

function animateCount(id, target, suffix = '') {
  const el = document.getElementById(id);
  if (!el) return;
  const start = parseInt(el.textContent) || 0;
  const diff  = target - start;
  const steps = 20;
  let i = 0;
  const t = setInterval(() => {
    i++;
    el.textContent = Math.round(start + diff * (i / steps)) + suffix;
    if (i >= steps) clearInterval(t);
  }, 20);
}

// ── Occupancy Trend ───────────────────────────────────────────────────────────
async function loadOccupancyTrend() {
  const data = await fetch('/api/analytics/trends').then(r => r.json());
  if (charts.trend) { charts.trend.destroy(); }
  charts.trend = CyberCharts.area(
    'occupancyTrendChart',
    data.map(d => d.hour + ':00'),
    [{ label: 'Avg Occupancy %', data: data.map(d => d.avg_pct), color: 'blue' }],
    { yMax: 100, yLabel: 'Occupancy %' }
  );
}

// ── Room Status Donut ─────────────────────────────────────────────────────────
async function loadRoomStatusChart() {
  const d = await fetch('/api/analytics/summary').then(r => r.json());
  if (charts.roomStatus) charts.roomStatus.destroy();
  const fault = d.rooms.faults;
  const busy  = d.rooms.total - d.rooms.available - fault;
  charts.roomStatus = CyberCharts.doughnut(
    'roomStatusChart',
    ['Available', 'Busy', 'Fault'],
    [d.rooms.available, busy, fault],
    ['green', 'yellow', 'red'],
    { cutout: '65%', legendPos: 'bottom' }
  );
  document.getElementById('roomStatusLegend').innerHTML = `
    <div class="d-flex justify-content-around">
      <div class="text-center">
        <div style="font-size:20px;font-weight:700;color:var(--neon-green)">${d.rooms.available}</div>
        <div style="font-size:11px;color:var(--text-muted)">Available</div>
      </div>
      <div class="text-center">
        <div style="font-size:20px;font-weight:700;color:var(--neon-yellow)">${busy}</div>
        <div style="font-size:11px;color:var(--text-muted)">Busy</div>
      </div>
      <div class="text-center">
        <div style="font-size:20px;font-weight:700;color:var(--neon-red)">${fault}</div>
        <div style="font-size:11px;color:var(--text-muted)">Fault</div>
      </div>
    </div>`;
}

// ── Issue Category Chart ──────────────────────────────────────────────────────
async function loadIssueCategoryChart() {
  const issues = await fetch('/api/issues').then(r => r.json());
  const cats = {};
  issues.forEach(i => { cats[i.category] = (cats[i.category] || 0) + 1; });
  const labels = Object.keys(cats);
  const values = Object.values(cats);
  const palette = ['blue','purple','green','yellow','red','orange'];
  if (charts.issueCat) charts.issueCat.destroy();
  charts.issueCat = CyberCharts.bar(
    'issueCatChart', labels,
    [{
      label: 'Issues',
      data: values,
      colors: palette.slice(0, labels.length).map(c => CyberCharts.COLORS[c]?.solid),
      borderColors: palette.slice(0, labels.length).map(c => CyberCharts.COLORS[c]?.line),
    }],
    { horizontal: true }
  );
}

// ── Resource Health Polar ─────────────────────────────────────────────────────
async function loadHealthChart() {
  const data = await fetch('/api/maintenance/predictions').then(r => r.json());
  const buckets = { Healthy: 0, Warning: 0, Critical: 0 };
  data.forEach(d => { buckets[d.label]++; });
  if (charts.health) charts.health.destroy();
  const ctx = document.getElementById('healthChart').getContext('2d');
  charts.health = new Chart(ctx, {
    type: 'polarArea',
    data: {
      labels: ['Healthy', 'Warning', 'Critical'],
      datasets: [{
        data: [buckets.Healthy, buckets.Warning, buckets.Critical],
        backgroundColor: ['rgba(0,255,136,0.6)', 'rgba(255,204,0,0.6)', 'rgba(255,51,102,0.6)'],
        borderColor:     ['#00ff88', '#ffcc00', '#ff3366'],
        borderWidth: 2,
      }],
    },
    options: {
      responsive: true,
      plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, padding: 10 } } },
      scales: { r: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { display: false } } },
    },
  });
}

// ── Building Occupancy ────────────────────────────────────────────────────────
async function loadBuildingOccChart() {
  const data = await fetch('/api/analytics/occupancy').then(r => r.json());
  const buildings = {};
  data.forEach(d => {
    if (!buildings[d.building]) buildings[d.building] = { total: 0, cap: 0 };
    buildings[d.building].total += d.current;
    buildings[d.building].cap   += d.capacity;
  });
  const labels = Object.keys(buildings);
  const values = labels.map(b => buildings[b].cap > 0
    ? Math.round(buildings[b].total / buildings[b].cap * 100) : 0);
  if (charts.buildingOcc) charts.buildingOcc.destroy();
  charts.buildingOcc = CyberCharts.bar(
    'buildingOccChart', labels,
    [{
      label: 'Occupancy %',
      data: values,
      colors:       values.map(v => v > 80 ? 'rgba(255,51,102,0.7)' : v > 50 ? 'rgba(255,204,0,0.7)' : 'rgba(0,255,136,0.7)'),
      borderColors: values.map(v => v > 80 ? '#ff3366' : v > 50 ? '#ffcc00' : '#00ff88'),
    }],
    { yMax: 100, yLabel: '%' }
  );
}

// ── Recent Issues Table ───────────────────────────────────────────────────────
async function loadRecentIssues() {
  const issues = await fetch('/api/issues').then(r => r.json());
  document.getElementById('recentIssuesTable').innerHTML = issues.slice(0, 6).map(i => `
    <tr>
      <td style="max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap"
          title="${i.title}">${i.title}</td>
      <td><span style="font-size:11px;color:var(--neon-blue)">${i.location}</span></td>
      <td><span class="priority-badge ${i.priority}">${i.priority}</span></td>
      <td><span class="status-badge ${i.status}">${i.status.replace('_',' ')}</span></td>
    </tr>
  `).join('');
}

// ── Maintenance Alerts ────────────────────────────────────────────────────────
async function loadMaintenanceAlerts() {
  const data = await fetch('/api/maintenance/predictions').then(r => r.json());
  const critical = data.filter(d => d.label !== 'Healthy').slice(0, 5);
  const c = document.getElementById('maintenanceAlerts');
  if (!critical.length) {
    c.innerHTML = '<div class="cyber-alert success"><i class="bi bi-check-circle"></i> All systems healthy</div>';
    return;
  }
  c.innerHTML = critical.map(d => `
    <div class="d-flex align-items-center justify-content-between py-2"
         style="border-bottom:1px solid rgba(255,255,255,0.04)">
      <div>
        <div style="font-size:13px;font-weight:500">${d.name}</div>
        <div style="font-size:11px;color:var(--text-muted)">${d.location} · ${d.days_since_maintenance}d ago</div>
      </div>
      <div style="text-align:right">
        <div style="font-size:13px;font-weight:700;color:${d.label==='Critical'?'var(--neon-red)':'var(--neon-yellow)'}">${d.risk}%</div>
        <div style="font-size:10px;color:var(--text-muted)">${d.label}</div>
      </div>
    </div>
  `).join('');
}

// ── Live Activity Feed ────────────────────────────────────────────────────────
async function loadFeed() {
  const events = await fetch('/api/feed').then(r => r.json());
  const typeMap = {
    issue:       { dot: 'issue',  icon: 'bi-exclamation-circle-fill', color: 'var(--neon-red)' },
    maintenance: { dot: 'maint',  icon: 'bi-wrench-fill',             color: 'var(--neon-purple)' },
    status:      { dot: 'status', icon: 'bi-arrow-repeat',            color: 'var(--neon-blue)' },
    ok:          { dot: 'ok',     icon: 'bi-check-circle-fill',       color: 'var(--neon-green)' },
  };
  document.getElementById('liveFeed').innerHTML = events.map(e => {
    const t = typeMap[e.type] || typeMap.status;
    const ago = timeAgo(e.ts);
    return `
      <div class="feed-item">
        <div class="feed-dot ${t.dot}"></div>
        <div style="flex:1;min-width:0">
          <div style="font-size:12px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
            <i class="bi ${t.icon}" style="color:${t.color};margin-right:4px"></i>${e.msg}
          </div>
          <div style="font-size:10px;color:var(--text-muted)">${e.location} · ${ago}</div>
        </div>
      </div>`;
  }).join('');
}

function timeAgo(iso) {
  const diff = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (diff < 60)   return diff + 's ago';
  if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
  return Math.floor(diff / 3600) + 'h ago';
}

// ── Resource Utilization Bars ─────────────────────────────────────────────────
async function loadResourceUtil() {
  const data = await fetch('/api/analytics/resource-utilization').then(r => r.json());
  document.getElementById('resourceUtilBars').innerHTML = `
    <div class="row g-3">
      ${data.map(r => `
        <div class="col-6 col-md-4 col-lg-2">
          <div style="font-size:12px;font-weight:600;margin-bottom:6px;text-transform:capitalize">
            ${r.type.replace('_',' ')}
          </div>
          <div class="d-flex justify-content-between mb-1">
            <span style="font-size:11px;color:var(--text-muted)">Utilization</span>
            <span style="font-size:11px;font-weight:700;color:${r.util_pct>80?'var(--neon-red)':r.util_pct>50?'var(--neon-yellow)':'var(--neon-green)'}">${r.util_pct}%</span>
          </div>
          <div class="cyber-progress mb-2">
            <div class="cyber-progress-bar ${r.util_pct>80?'red':r.util_pct>50?'yellow':'green'}" style="width:${r.util_pct}%"></div>
          </div>
          <div style="font-size:10px;color:var(--text-muted)">
            ${r.busy||0} busy · ${r.available||0} free · ${r.fault||0} fault
          </div>
        </div>
      `).join('')}
    </div>`;
}

// ── Simulate tick ─────────────────────────────────────────────────────────────
async function simulateTick() {
  await fetch('/api/campus/simulate', { method: 'POST' });
  await Promise.all([loadKPIs(), loadOccupancyTrend(), loadBuildingOccChart(), loadFeed()]);
  showToast('Campus simulation tick applied', 'success');
}

function showToast(msg, type = 'info') {
  let c = document.getElementById('toastContainer');
  if (!c) { c = document.createElement('div'); c.id = 'toastContainer'; document.body.appendChild(c); }
  const t = document.createElement('div');
  t.className = `toast-msg ${type}`;
  const icons = { success: 'check-circle-fill', error: 'x-circle-fill', info: 'info-circle-fill' };
  t.innerHTML = `<i class="bi bi-${icons[type]||'info-circle-fill'}"></i> ${msg}`;
  c.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}

// ── Init ──────────────────────────────────────────────────────────────────────
async function initDashboard() {
  await Promise.all([
    loadKPIs(), loadOccupancyTrend(), loadRoomStatusChart(),
    loadIssueCategoryChart(), loadHealthChart(), loadBuildingOccChart(),
    loadRecentIssues(), loadMaintenanceAlerts(), loadFeed(), loadResourceUtil(),
  ]);
  // Auto-refresh every 30s
  setInterval(() => {
    loadKPIs(); loadRecentIssues(); loadMaintenanceAlerts(); loadFeed(); loadResourceUtil();
  }, 30000);
}
initDashboard();
