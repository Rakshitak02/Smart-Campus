// ═══════════════════════════════════════════════════════════════
//  app.js — Shared utilities, state, and UI helpers
// ═══════════════════════════════════════════════════════════════

// ── Global state ──────────────────────────────────────────────────────────────
export const State = {
  rooms:     [],
  resources: [],
  issues:    [],
  wifi:      [],
};

// ── Toast notifications ───────────────────────────────────────────────────────
export function showToast(message, type = "info", duration = 3500) {
  let container = document.getElementById("toastContainer");
  if (!container) {
    container = document.createElement("div");
    container.id = "toastContainer";
    document.body.appendChild(container);
  }
  const icons = { success:"check-circle-fill", error:"x-circle-fill",
                  info:"info-circle-fill", warning:"exclamation-triangle-fill" };
  const toast = document.createElement("div");
  toast.className = `toast-msg ${type}`;
  toast.innerHTML = `<i class="bi bi-${icons[type]||"info-circle-fill"}"></i><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => { toast.style.opacity = "0"; setTimeout(() => toast.remove(), 300); }, duration);
}

// ── Animate counter ───────────────────────────────────────────────────────────
export function animateCount(el, target, suffix = "", duration = 600) {
  if (!el) return;
  const start = parseInt(el.textContent) || 0;
  const steps = 25;
  const step  = (target - start) / steps;
  let current = start, i = 0;
  const t = setInterval(() => {
    i++;
    current += step;
    el.textContent = Math.round(i < steps ? current : target) + suffix;
    if (i >= steps) clearInterval(t);
  }, duration / steps);
}

// ── Time ago ──────────────────────────────────────────────────────────────────
export function timeAgo(ts) {
  if (!ts) return "just now";
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  const diff = Math.floor((Date.now() - date) / 1000);
  if (diff < 60)   return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
  if (diff < 86400)return `${Math.floor(diff/3600)}h ago`;
  return date.toLocaleDateString();
}

// ── Format date ───────────────────────────────────────────────────────────────
export function fmtDate(ts) {
  if (!ts) return "–";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleString();
}

// ── Status badge HTML ─────────────────────────────────────────────────────────
export function statusBadge(status) {
  return `<span class="status-badge ${status}">${status.replace("_"," ")}</span>`;
}

// ── Priority badge HTML ───────────────────────────────────────────────────────
export function priorityBadge(priority) {
  return `<span class="priority-badge ${priority}">${priority.toUpperCase()}</span>`;
}

// ── Progress bar HTML ─────────────────────────────────────────────────────────
export function progressBar(pct, color = null) {
  const c = color ?? (pct > 80 ? "red" : pct > 50 ? "yellow" : "green");
  return `<div class="cyber-progress"><div class="cyber-progress-bar ${c}" style="width:${pct}%"></div></div>`;
}

// ── Risk bar HTML ─────────────────────────────────────────────────────────────
export function riskBar(risk, label) {
  const c = label === "Critical" ? "critical" : label === "Warning" ? "warning" : "healthy";
  return `<div class="risk-bar"><div class="risk-fill ${c}" style="width:${risk}%"></div></div>`;
}

// ── Sidebar clock ─────────────────────────────────────────────────────────────
export function startClock(elId) {
  const el = document.getElementById(elId);
  if (!el) return;
  const tick = () => {
    const now = new Date();
    el.textContent = now.toLocaleTimeString("en-US", { hour:"2-digit", minute:"2-digit", second:"2-digit" });
  };
  tick();
  setInterval(tick, 1000);
}

// ── Sidebar toggle ────────────────────────────────────────────────────────────
export function initSidebar() {
  const btn  = document.getElementById("sidebarToggle");
  const side = document.getElementById("sidebar");
  const main = document.getElementById("mainContent");
  if (!btn) return;
  btn.addEventListener("click", () => {
    side.classList.toggle("collapsed");
    main.classList.toggle("expanded");
  });
}

// ── Active nav link ───────────────────────────────────────────────────────────
export function setActiveNav() {
  const path = window.location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".sidebar-nav .nav-link").forEach(a => {
    const href = a.getAttribute("href")?.split("/").pop() || "";
    a.classList.toggle("active", href === path || (path === "" && href === "index.html"));
  });
}

// ── Topbar stats updater ──────────────────────────────────────────────────────
export function updateTopbar(rooms, issues) {
  const avail  = rooms.filter(r => r.status === "available").length;
  const faults = rooms.filter(r => r.status === "fault").length;
  const open   = issues.filter(i => i.status === "open").length;

  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set("tbAvail",  avail);
  set("tbIssues", open);
  set("tbFaults", faults);
  const badge = document.getElementById("openIssuesBadge");
  if (badge) badge.textContent = open;
  const nb = document.getElementById("notifBadge");
  if (nb) nb.textContent = open;
}

// ── Skeleton loader ───────────────────────────────────────────────────────────
export function skeleton(lines = 3) {
  return Array.from({ length: lines }, () =>
    `<div class="skeleton" style="height:18px;margin-bottom:8px;border-radius:4px"></div>`
  ).join("");
}
