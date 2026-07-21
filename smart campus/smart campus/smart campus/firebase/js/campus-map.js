// ═══════════════════════════════════════════════════════════════
//  campus-map.js — Animated Canvas Digital Twin Map
// ═══════════════════════════════════════════════════════════════

const LAYOUT = {
  buildings: [
    { id:"A", name:"Engineering Block", x:60,  y:60,  w:210, h:170,
      rooms:[
        { id:"A101", name:"Lab A101",   x:70,  y:75,  w:90, h:65 },
        { id:"A102", name:"Class A102", x:170, y:75,  w:90, h:65 },
        { id:"A103", name:"Lab A103",   x:70,  y:150, w:90, h:65 },
        { id:"A104", name:"Class A104", x:170, y:150, w:90, h:65 },
      ]},
    { id:"B", name:"Science Block", x:330, y:60,  w:210, h:170,
      rooms:[
        { id:"B101", name:"Lab B101",   x:340, y:75,  w:90, h:65 },
        { id:"B102", name:"Class B102", x:440, y:75,  w:90, h:65 },
        { id:"B103", name:"Lab B103",   x:340, y:150, w:90, h:65 },
        { id:"B104", name:"Class B104", x:440, y:150, w:90, h:65 },
      ]},
    { id:"C", name:"Admin Block", x:600, y:60,  w:170, h:170,
      rooms:[
        { id:"C101", name:"Server Room", x:610, y:75,  w:70, h:65 },
        { id:"C102", name:"Admin Office",x:690, y:75,  w:70, h:65 },
        { id:"C103", name:"Conference",  x:610, y:150, w:150,h:65 },
      ]},
    { id:"D", name:"Library", x:60,  y:295, w:210, h:150,
      rooms:[
        { id:"D101", name:"Reading Hall",x:70,  y:310, w:190,h:55 },
        { id:"D102", name:"Study Room",  x:70,  y:375, w:90, h:55 },
        { id:"D103", name:"Media Lab",   x:170, y:375, w:90, h:55 },
      ]},
    { id:"E", name:"Sports Complex", x:330, y:295, w:210, h:150,
      rooms:[
        { id:"E101", name:"Gymnasium",   x:340, y:310, w:190,h:55 },
        { id:"E102", name:"Fitness Ctr", x:340, y:375, w:90, h:55 },
        { id:"E103", name:"Pool Area",   x:440, y:375, w:90, h:55 },
      ]},
    { id:"F", name:"Cafeteria", x:600, y:295, w:170, h:150,
      rooms:[
        { id:"F101", name:"Main Dining", x:610, y:310, w:150,h:55 },
        { id:"F102", name:"Staff Lounge",x:610, y:375, w:150,h:55 },
      ]},
  ],
  wifi: [
    { id:"W1", x:165, y:230 }, { id:"W2", x:435, y:230 },
    { id:"W3", x:685, y:230 }, { id:"W4", x:165, y:460 },
    { id:"W5", x:435, y:460 }, { id:"W6", x:685, y:460 },
  ],
  paths: [
    [[270,145],[330,145]], [[540,145],[600,145]],
    [[165,230],[165,295]], [[435,230],[435,295]], [[685,230],[685,295]],
    [[270,370],[330,370]], [[540,370],[600,370]],
  ],
};

const STATUS_COL = {
  available: { fill:"rgba(0,255,136,0.16)", stroke:"#00ff88", glow:"rgba(0,255,136,0.5)" },
  busy:      { fill:"rgba(255,204,0,0.16)",  stroke:"#ffcc00", glow:"rgba(255,204,0,0.5)" },
  fault:     { fill:"rgba(255,51,102,0.16)", stroke:"#ff3366", glow:"rgba(255,51,102,0.5)" },
};

export class CampusMap {
  constructor(canvasId, onRoomClick) {
    this.canvas      = document.getElementById(canvasId);
    this.ctx         = this.canvas.getContext("2d");
    this.onRoomClick = onRoomClick;
    this.roomData    = {};   // id → { status, occupancy, capacity, openIssues }
    this.wifiData    = {};   // id → { signal, connected }
    this.hovered     = null;
    this.frame       = 0;
    this.tooltip     = document.getElementById("mapTooltip");
    this._bindEvents();
    this._loop();
  }

  setRooms(rooms) {
    this.roomData = {};
    rooms.forEach(r => { this.roomData[r.id] = r; });
  }

  setWifi(nodes) {
    this.wifiData = {};
    nodes.forEach(w => { this.wifiData[w.id] = w; });
  }

  _loop() {
    this.frame++;
    this._draw();
    requestAnimationFrame(() => this._loop());
  }

  _draw() {
    const { ctx, canvas } = this;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    this._drawGrid();
    this._drawPaths();
    LAYOUT.buildings.forEach(b => this._drawBuilding(b));
    LAYOUT.wifi.forEach(w => this._drawWifi(w));
  }

  _drawGrid() {
    const { ctx, canvas } = this;
    ctx.strokeStyle = "rgba(0,212,255,0.04)";
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += 40) {
      ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,canvas.height); ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += 40) {
      ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(canvas.width,y); ctx.stroke();
    }
  }

  _drawPaths() {
    const { ctx } = this;
    ctx.strokeStyle = "rgba(0,212,255,0.14)";
    ctx.lineWidth = 3; ctx.setLineDash([8,6]);
    LAYOUT.paths.forEach(([a,b]) => {
      ctx.beginPath(); ctx.moveTo(a[0],a[1]); ctx.lineTo(b[0],b[1]); ctx.stroke();
    });
    ctx.setLineDash([]);
  }

  _drawBuilding(b) {
    const { ctx } = this;
    ctx.fillStyle = "rgba(8,12,35,0.65)";
    ctx.strokeStyle = "rgba(0,212,255,0.18)";
    ctx.lineWidth = 1;
    this._rr(b.x, b.y, b.w, b.h, 10); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "rgba(0,212,255,0.65)";
    ctx.font = "bold 11px Inter, sans-serif"; ctx.textAlign = "center";
    ctx.fillText(b.name, b.x + b.w/2, b.y + 13);
    b.rooms.forEach(r => this._drawRoom(r));
  }

  _drawRoom(room) {
    const { ctx, frame } = this;
    const data    = this.roomData[room.id] || {};
    const status  = data.status || "available";
    const col     = STATUS_COL[status] || STATUS_COL.available;
    const hovered = this.hovered === room.id;

    if (hovered) { ctx.shadowColor = col.glow; ctx.shadowBlur = 22; }

    ctx.fillStyle = col.fill;
    this._rr(room.x, room.y, room.w, room.h, 6); ctx.fill();

    ctx.strokeStyle = hovered ? col.stroke : col.stroke + "88";
    ctx.lineWidth   = hovered ? 2 : 1;
    this._rr(room.x, room.y, room.w, room.h, 6); ctx.stroke();
    ctx.shadowBlur = 0;

    // Fault pulse ring
    if (status === "fault") {
      const p = 0.5 + 0.5 * Math.sin(frame * 0.09);
      ctx.strokeStyle = `rgba(255,51,102,${p * 0.65})`;
      ctx.lineWidth = 2;
      this._rr(room.x-2, room.y-2, room.w+4, room.h+4, 8); ctx.stroke();
    }

    // Room label
    ctx.fillStyle = hovered ? "#fff" : "rgba(255,255,255,0.88)";
    ctx.font = `${hovered?"bold ":""}10px Inter, sans-serif`;
    ctx.textAlign = "center";
    const label = room.name.length > 11 ? room.name.slice(0,10)+"…" : room.name;
    ctx.fillText(label, room.x + room.w/2, room.y + room.h/2 - 5);

    // Occupancy mini-bar
    if (data.capacity > 0) {
      const pct = data.occupancy / data.capacity;
      const bw  = room.w - 10;
      ctx.fillStyle = "rgba(255,255,255,0.08)";
      this._rr(room.x+5, room.y+room.h-10, bw, 4, 2); ctx.fill();
      ctx.fillStyle = pct > 0.8 ? "#ff3366" : pct > 0.5 ? "#ffcc00" : "#00ff88";
      this._rr(room.x+5, room.y+room.h-10, bw*pct, 4, 2); ctx.fill();
    }

    // Issue badge
    if (data.openIssues > 0) {
      ctx.fillStyle = "#ff3366";
      ctx.beginPath(); ctx.arc(room.x+room.w-7, room.y+7, 6, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = "#fff"; ctx.font = "bold 7px Inter"; ctx.textAlign = "center";
      ctx.fillText(data.openIssues, room.x+room.w-7, room.y+10);
    }
  }

  _drawWifi(w) {
    const { ctx, frame } = this;
    const data  = this.wifiData[w.id] || { signal:80, connected:0 };
    const sig   = data.signal ?? 80;
    const color = sig > 80 ? "#00ff88" : sig > 60 ? "#ffcc00" : "#ff3366";
    const pulse = 0.4 + 0.6 * Math.abs(Math.sin(frame * 0.05 + w.x * 0.01));

    // Ripple
    ctx.strokeStyle = color + Math.floor(pulse*80).toString(16).padStart(2,"0");
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(w.x, w.y, 18+pulse*9, 0, Math.PI*2); ctx.stroke();

    // Node circle
    ctx.fillStyle = "rgba(0,212,255,0.18)";
    ctx.strokeStyle = "#00d4ff"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(w.x, w.y, 11, 0, Math.PI*2); ctx.fill(); ctx.stroke();

    ctx.fillStyle = "#00d4ff"; ctx.font = "bold 9px Inter"; ctx.textAlign = "center";
    ctx.fillText(w.id, w.x, w.y+3);
    ctx.fillStyle = color; ctx.font = "9px Inter";
    ctx.fillText(sig+"%", w.x, w.y+22);
  }

  _rr(x, y, w, h, r) {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.moveTo(x+r, y);
    ctx.lineTo(x+w-r, y); ctx.quadraticCurveTo(x+w, y, x+w, y+r);
    ctx.lineTo(x+w, y+h-r); ctx.quadraticCurveTo(x+w, y+h, x+w-r, y+h);
    ctx.lineTo(x+r, y+h); ctx.quadraticCurveTo(x, y+h, x, y+h-r);
    ctx.lineTo(x, y+r); ctx.quadraticCurveTo(x, y, x+r, y);
    ctx.closePath();
  }

  _hitRoom(mx, my) {
    for (const b of LAYOUT.buildings)
      for (const r of b.rooms)
        if (mx>=r.x && mx<=r.x+r.w && my>=r.y && my<=r.y+r.h) return r.id;
    return null;
  }

  _bindEvents() {
    const scale = () => ({
      sx: this.canvas.width  / this.canvas.getBoundingClientRect().width,
      sy: this.canvas.height / this.canvas.getBoundingClientRect().height,
    });

    this.canvas.addEventListener("mousemove", e => {
      const rect = this.canvas.getBoundingClientRect();
      const { sx, sy } = scale();
      const mx = (e.clientX - rect.left) * sx;
      const my = (e.clientY - rect.top)  * sy;
      const hit = this._hitRoom(mx, my);
      this.hovered = hit;
      this.canvas.style.cursor = hit ? "pointer" : "crosshair";

      if (hit && this.tooltip) {
        const d = this.roomData[hit] || {};
        const pct = d.capacity > 0 ? Math.round(d.occupancy/d.capacity*100) : 0;
        this.tooltip.innerHTML = `
          <div style="font-weight:600;color:#00d4ff;margin-bottom:4px">${d.name||hit}</div>
          <div style="font-size:11px;color:#8892b0">${d.building||""} · ${d.type||""}</div>
          <div style="margin-top:6px"><span class="status-badge ${d.status||"available"}">${d.status||"available"}</span></div>
          <div style="margin-top:6px;font-size:11px">
            👥 ${d.occupancy||0}/${d.capacity||0} (${pct}%)
            ${d.openIssues>0?`<span style="color:#ff3366;margin-left:8px">⚠ ${d.openIssues} issue${d.openIssues>1?"s":""}</span>`:""}
          </div>`;
        this.tooltip.style.left = (e.clientX+14)+"px";
        this.tooltip.style.top  = (e.clientY-10)+"px";
        this.tooltip.classList.add("show");
      } else if (this.tooltip) {
        this.tooltip.classList.remove("show");
      }
    });

    this.canvas.addEventListener("mouseleave", () => {
      this.hovered = null;
      if (this.tooltip) this.tooltip.classList.remove("show");
    });

    this.canvas.addEventListener("click", e => {
      const rect = this.canvas.getBoundingClientRect();
      const { sx, sy } = scale();
      const mx = (e.clientX - rect.left) * sx;
      const my = (e.clientY - rect.top)  * sy;
      const hit = this._hitRoom(mx, my);
      if (hit && this.onRoomClick) this.onRoomClick(hit);
    });
  }
}
