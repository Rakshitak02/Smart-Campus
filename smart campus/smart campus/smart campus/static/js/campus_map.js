// ── Smart Campus Digital Twin — Interactive Map ──────────────────────────────
const canvas = document.getElementById('campusCanvas');
const ctx = canvas.getContext('2d');
let campusData = null;
let roomStatusMap = {};
let hoveredRoom = null;
let animFrame = 0;

const STATUS_COLORS = {
  available: { fill: 'rgba(0,255,136,0.18)', stroke: '#00ff88', glow: 'rgba(0,255,136,0.4)' },
  busy:      { fill: 'rgba(255,204,0,0.18)',  stroke: '#ffcc00', glow: 'rgba(255,204,0,0.4)' },
  fault:     { fill: 'rgba(255,51,102,0.18)', stroke: '#ff3366', glow: 'rgba(255,51,102,0.4)' },
};
const TYPE_ICONS = {
  lab: '⚗', classroom: '📚', server: '🖥', office: '💼',
  conference: '📡', library: '📖', study: '✏', sports: '🏃',
  cafeteria: '🍽', lounge: '☕',
};

async function loadCampusData() {
  const r = await fetch('/static/data/campus_layout.json');
  campusData = await r.json();
}

async function loadRoomStatus() {
  const r = await fetch('/api/campus/status');
  const d = await r.json();
  roomStatusMap = {};
  d.rooms.forEach(room => { roomStatusMap[room.id] = room; });
  document.getElementById('statAvail').textContent = d.stats.available;
  document.getElementById('statBusy').textContent = d.stats.busy;
  document.getElementById('statFault').textContent = d.stats.fault;
  document.getElementById('statTotal').textContent = d.stats.total;
  renderRoomList(d.rooms);
}

function renderRoomList(rooms) {
  const c = document.getElementById('roomListContainer');
  c.innerHTML = rooms.map(r => `
    <div class="d-flex align-items-center justify-content-between py-2"
         style="border-bottom:1px solid rgba(255,255,255,0.04);cursor:pointer"
         onclick="showRoomDetail('${r.id}')">
      <div>
        <div style="font-size:13px;font-weight:500">${r.name}</div>
        <div style="font-size:11px;color:var(--text-muted)">${r.building} · ${r.occupancy}/${r.capacity}</div>
      </div>
      <span class="status-badge ${r.status}">${r.status}</span>
    </div>
  `).join('');
}

function drawMap() {
  if (!campusData) return;
  animFrame++;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Background grid
  ctx.strokeStyle = 'rgba(0,212,255,0.04)';
  ctx.lineWidth = 1;
  for (let x = 0; x < canvas.width; x += 40) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
  }
  for (let y = 0; y < canvas.height; y += 40) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
  }

  // Pathways
  ctx.strokeStyle = 'rgba(0,212,255,0.15)';
  ctx.lineWidth = 3;
  ctx.setLineDash([8, 6]);
  campusData.pathways.forEach(p => {
    ctx.beginPath();
    ctx.moveTo(p.from[0], p.from[1]);
    ctx.lineTo(p.to[0], p.to[1]);
    ctx.stroke();
  });
  ctx.setLineDash([]);

  // Buildings
  campusData.buildings.forEach(b => {
    ctx.fillStyle = 'rgba(10,15,40,0.6)';
    ctx.strokeStyle = 'rgba(0,212,255,0.2)';
    ctx.lineWidth = 1;
    roundRect(ctx, b.x, b.y, b.w, b.h, 8);
    ctx.fill(); ctx.stroke();

    // Building label
    ctx.fillStyle = 'rgba(0,212,255,0.7)';
    ctx.font = 'bold 11px Segoe UI';
    ctx.textAlign = 'center';
    ctx.fillText(b.name, b.x + b.w / 2, b.y + 14);

    // Rooms
    b.rooms.forEach(room => {
      const rs = roomStatusMap[room.id];
      const status = rs ? rs.status : room.status;
      const col = STATUS_COLORS[status] || STATUS_COLORS.available;
      const isHovered = hoveredRoom === room.id;

      if (isHovered) {
        ctx.shadowColor = col.glow;
        ctx.shadowBlur = 20;
      }

      // Room fill
      ctx.fillStyle = col.fill;
      roundRect(ctx, room.x, room.y, room.w, room.h, 5);
      ctx.fill();

      // Room border
      ctx.strokeStyle = isHovered ? col.stroke : col.stroke + '99';
      ctx.lineWidth = isHovered ? 2 : 1;
      roundRect(ctx, room.x, room.y, room.w, room.h, 5);
      ctx.stroke();

      ctx.shadowBlur = 0;

      // Fault pulse animation
      if (status === 'fault') {
        const pulse = 0.5 + 0.5 * Math.sin(animFrame * 0.08);
        ctx.strokeStyle = `rgba(255,51,102,${pulse * 0.6})`;
        ctx.lineWidth = 2;
        roundRect(ctx, room.x - 2, room.y - 2, room.w + 4, room.h + 4, 7);
        ctx.stroke();
      }

      // Room text
      ctx.fillStyle = isHovered ? '#fff' : 'rgba(255,255,255,0.85)';
      ctx.font = `${isHovered ? 'bold ' : ''}10px Segoe UI`;
      ctx.textAlign = 'center';
      const label = room.name.length > 12 ? room.name.substring(0, 11) + '…' : room.name;
      ctx.fillText(label, room.x + room.w / 2, room.y + room.h / 2 - 4);

      // Occupancy bar
      if (rs) {
        const pct = rs.capacity > 0 ? rs.occupancy / rs.capacity : 0;
        const bw = room.w - 10;
        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        roundRect(ctx, room.x + 5, room.y + room.h - 10, bw, 4, 2);
        ctx.fill();
        ctx.fillStyle = pct > 0.8 ? '#ff3366' : pct > 0.5 ? '#ffcc00' : '#00ff88';
        roundRect(ctx, room.x + 5, room.y + room.h - 10, bw * pct, 4, 2);
        ctx.fill();
      }

      // Issue indicator
      if (rs && rs.open_issues > 0) {
        ctx.fillStyle = '#ff3366';
        ctx.beginPath();
        ctx.arc(room.x + room.w - 6, room.y + 6, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 7px Segoe UI';
        ctx.textAlign = 'center';
        ctx.fillText(rs.open_issues, room.x + room.w - 6, room.y + 9);
      }
    });
  });

  // WiFi nodes
  campusData.wifi_nodes.forEach(w => {
    const pulse = 0.4 + 0.6 * Math.abs(Math.sin(animFrame * 0.05 + w.x * 0.01));
    const signalColor = w.signal > 80 ? '#00ff88' : w.signal > 60 ? '#ffcc00' : '#ff3366';

    // Ripple
    ctx.strokeStyle = signalColor + Math.floor(pulse * 80).toString(16).padStart(2, '0');
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(w.x, w.y, 18 + pulse * 8, 0, Math.PI * 2);
    ctx.stroke();

    // Node
    ctx.fillStyle = 'rgba(0,212,255,0.2)';
    ctx.strokeStyle = '#00d4ff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(w.x, w.y, 10, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();

    // WiFi icon text
    ctx.fillStyle = '#00d4ff';
    ctx.font = '10px Segoe UI';
    ctx.textAlign = 'center';
    ctx.fillText('W', w.x, w.y + 4);

    // Signal label
    ctx.fillStyle = signalColor;
    ctx.font = '9px Segoe UI';
    ctx.fillText(w.signal + '%', w.x, w.y + 22);
  });

  requestAnimationFrame(drawMap);
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// Hit detection + tooltip
const tooltip = document.getElementById('mapTooltip');

canvas.addEventListener('mousemove', e => {
  const rect = canvas.getBoundingClientRect();
  const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
  const my = (e.clientY - rect.top) * (canvas.height / rect.height);
  hoveredRoom = null;
  if (!campusData) return;
  for (const b of campusData.buildings) {
    for (const room of b.rooms) {
      if (mx >= room.x && mx <= room.x + room.w && my >= room.y && my <= room.y + room.h) {
        hoveredRoom = room.id;
        canvas.style.cursor = 'pointer';
        const rs = roomStatusMap[room.id];
        if (rs) {
          const pct = rs.capacity > 0 ? Math.round(rs.occupancy / rs.capacity * 100) : 0;
          tooltip.innerHTML = `
            <div style="font-weight:600;color:var(--neon-blue);margin-bottom:4px">${rs.name}</div>
            <div style="font-size:11px;color:var(--text-muted)">${rs.building} · ${rs.type}</div>
            <div style="margin-top:6px;font-size:12px">
              <span class="status-badge ${rs.status}">${rs.status}</span>
            </div>
            <div style="margin-top:6px;font-size:11px">
              👥 ${rs.occupancy}/${rs.capacity} (${pct}%)
              ${rs.open_issues > 0 ? `<span style="color:var(--neon-red);margin-left:8px">⚠ ${rs.open_issues} issue${rs.open_issues>1?'s':''}</span>` : ''}
            </div>`;
          tooltip.style.left = (e.clientX + 14) + 'px';
          tooltip.style.top  = (e.clientY - 10) + 'px';
          tooltip.classList.add('visible');
        }
        return;
      }
    }
  }
  canvas.style.cursor = 'crosshair';
  tooltip.classList.remove('visible');
});

canvas.addEventListener('mouseleave', () => {
  hoveredRoom = null;
  tooltip.classList.remove('visible');
});

canvas.addEventListener('click', e => {
  const rect = canvas.getBoundingClientRect();
  const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
  const my = (e.clientY - rect.top) * (canvas.height / rect.height);
  if (!campusData) return;
  for (const b of campusData.buildings) {
    for (const room of b.rooms) {
      if (mx >= room.x && mx <= room.x + room.w && my >= room.y && my <= room.y + room.h) {
        showRoomDetail(room.id);
        return;
      }
    }
  }
});

async function showRoomDetail(roomId) {
  const panel = document.getElementById('roomPanel');
  const overlay = document.getElementById('panelOverlay');
  const content = document.getElementById('roomPanelContent');
  content.innerHTML = '<div class="text-center py-5"><div class="spinner-border text-info" style="width:24px;height:24px"></div></div>';
  panel.classList.add('open');
  overlay.style.display = 'block';

  const r = await fetch(`/api/campus/room/${roomId}`);
  const d = await r.json();
  const room = d.room;
  const pred = d.occupancy_prediction;
  const pct = room.capacity > 0 ? Math.round(room.occupancy / room.capacity * 100) : 0;

  content.innerHTML = `
    <div class="mb-3">
      <div style="font-size:18px;font-weight:700;color:var(--neon-blue)">${room.name}</div>
      <div style="font-size:12px;color:var(--text-muted)">${room.building} Block · ${room.type}</div>
    </div>
    <span class="status-badge ${room.status} mb-3 d-inline-block">${room.status.toUpperCase()}</span>

    <div class="glass-card mb-3" style="padding:14px">
      <div class="d-flex justify-content-between mb-2">
        <span style="font-size:12px;color:var(--text-secondary)">Occupancy</span>
        <span style="font-size:12px;font-weight:600">${room.occupancy} / ${room.capacity}</span>
      </div>
      <div class="cyber-progress mb-2">
        <div class="cyber-progress-bar ${pct>80?'red':pct>50?'yellow':'green'}" style="width:${pct}%"></div>
      </div>
      <div style="font-size:11px;color:var(--text-muted)">
        Predicted next hour: <strong style="color:var(--neon-blue)">${pred.predicted}</strong> people
      </div>
    </div>

    ${d.resources.length ? `
    <div class="mb-3">
      <div class="section-title mb-2"><i class="bi bi-box-seam"></i> Equipment</div>
      ${d.resources.map(res => `
        <div class="d-flex justify-content-between align-items-center py-1"
             style="border-bottom:1px solid rgba(255,255,255,0.04);font-size:12px">
          <span>${res.name}</span>
          <span class="status-badge ${res.status}">${res.status}</span>
        </div>
      `).join('')}
    </div>` : ''}

    ${d.issues.length ? `
    <div class="mb-3">
      <div class="section-title mb-2"><i class="bi bi-exclamation-triangle"></i> Open Issues</div>
      ${d.issues.map(i => `
        <div class="cyber-alert ${i.priority==='high'?'error':i.priority==='medium'?'warning':'info'} mb-1" style="padding:8px 12px;font-size:12px">
          <i class="bi bi-dot"></i> ${i.title}
          <span class="priority-badge ${i.priority} ms-auto">${i.priority}</span>
        </div>
      `).join('')}
    </div>` : '<div class="cyber-alert success" style="font-size:12px"><i class="bi bi-check-circle"></i> No open issues</div>'}

    <div class="d-flex gap-2 mt-3">
      <button class="btn-cyber outline sm flex-fill" onclick="changeStatus('${room.id}','available')">
        <i class="bi bi-check-circle"></i> Available
      </button>
      <button class="btn-cyber sm flex-fill" style="background:rgba(255,204,0,0.2);color:#ffcc00;border:1px solid #ffcc00"
              onclick="changeStatus('${room.id}','busy')">
        <i class="bi bi-clock"></i> Busy
      </button>
      <button class="btn-cyber danger sm flex-fill" onclick="changeStatus('${room.id}','fault')">
        <i class="bi bi-x-circle"></i> Fault
      </button>
    </div>
    <a href="/issues" class="btn-cyber primary sm w-100 mt-2 justify-content-center">
      <i class="bi bi-plus-circle"></i> Report Issue
    </a>
  `;
}

async function changeStatus(roomId, status) {
  await fetch(`/api/campus/room/${roomId}/status`, {
    method: 'POST', headers: {'Content-Type':'application/json'},
    body: JSON.stringify({status})
  });
  await loadRoomStatus();
  showToast(`Room status updated to ${status}`, 'success');
  showRoomDetail(roomId);
}

function closePanel() {
  document.getElementById('roomPanel').classList.remove('open');
  document.getElementById('panelOverlay').style.display = 'none';
}

function renderWifiStatus() {
  if (!campusData) return;
  const c = document.getElementById('wifiStatus');
  c.innerHTML = campusData.wifi_nodes.map(w => {
    const color = w.signal > 80 ? 'var(--neon-green)' : w.signal > 60 ? 'var(--neon-yellow)' : 'var(--neon-red)';
    return `
      <div class="d-flex align-items-center justify-content-between py-2"
           style="border-bottom:1px solid rgba(255,255,255,0.04)">
        <div>
          <div style="font-size:13px;font-weight:500">Node ${w.id}</div>
          <div style="font-size:11px;color:var(--text-muted)">${w.connected} devices</div>
        </div>
        <div style="text-align:right">
          <div style="font-size:14px;font-weight:700;color:${color}">${w.signal}%</div>
          <div class="cyber-progress" style="width:60px">
            <div class="cyber-progress-bar ${w.signal>80?'green':w.signal>60?'yellow':'red'}"
                 style="width:${w.signal}%"></div>
          </div>
        </div>
      </div>`;
  }).join('');
}

function showToast(msg, type='info') {
  const c = document.getElementById('toastContainer');
  const t = document.createElement('div');
  t.className = `toast-msg ${type}`;
  const icons = {success:'check-circle-fill', error:'x-circle-fill', info:'info-circle-fill'};
  t.innerHTML = `<i class="bi bi-${icons[type]||'info-circle-fill'}" style="color:var(--neon-${type==='success'?'green':type==='error'?'red':'blue'})"></i> ${msg}`;
  c.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}

async function refreshMap() {
  await loadRoomStatus();
  showToast('Campus data refreshed', 'success');
}

async function init() {
  await loadCampusData();
  await loadRoomStatus();
  renderWifiStatus();
  drawMap();
  setInterval(loadRoomStatus, 30000);
}
init();
