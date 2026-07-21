// ═══════════════════════════════════════════════════════════════
//  AI Issue Engine + ML Predictive Maintenance
//  Pure JS — no backend required
// ═══════════════════════════════════════════════════════════════

// ── Keyword maps ──────────────────────────────────────────────────────────────
const CATEGORY_KEYWORDS = {
  equipment:    ["projector","screen","pc","computer","printer","server","monitor","keyboard","mouse","scanner"],
  network:      ["wifi","internet","network","cable","router","switch","ethernet","connection","bandwidth"],
  hvac:         ["ac","air","heating","cooling","ventilation","temperature","fan","thermostat"],
  electrical:   ["light","power","socket","outlet","electricity","circuit","breaker","wiring","lamp"],
  security:     ["door","lock","camera","cctv","access","badge","alarm","security"],
  plumbing:     ["leak","water","pipe","drain","flood","tap","toilet","sink"],
  housekeeping: ["clean","trash","garbage","dirty","spill","waste","hygiene"],
};

const DEPARTMENTS = {
  equipment: "IT", network: "IT", hvac: "Facilities",
  electrical: "Facilities", security: "Security",
  plumbing: "Facilities", housekeeping: "Housekeeping", general: "Facilities",
};

const TECHNICIANS = {
  IT: ["Tech-01","Tech-03"], Facilities: ["Tech-02","Tech-04"],
  Security: ["Tech-05"], Housekeeping: ["Tech-06"],
};

const HIGH_PRIORITY_WORDS   = ["urgent","critical","broken","down","fail","crash","not working","dead","emergency","severe"];
const MEDIUM_PRIORITY_WORDS = ["slow","intermittent","flickering","noise","unstable","degraded","partial"];

// ── analyzeIssue ──────────────────────────────────────────────────────────────
export function analyzeIssue(title, description) {
  const text = (title + " " + description).toLowerCase();

  // Category detection
  let category = "general";
  let maxMatches = 0;
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    const matches = keywords.filter(kw => text.includes(kw)).length;
    if (matches > maxMatches) { maxMatches = matches; category = cat; }
  }

  // Priority detection
  let priority = "low";
  if (HIGH_PRIORITY_WORDS.some(w => text.includes(w)))        priority = "high";
  else if (MEDIUM_PRIORITY_WORDS.some(w => text.includes(w))) priority = "medium";

  // Department + technician
  const department = DEPARTMENTS[category] || "Facilities";
  const techs      = TECHNICIANS[department] || ["Tech-01"];
  const technician = techs[Math.floor(Math.random() * techs.length)];

  // ETA
  const eta = priority === "high" ? "1-2h" : priority === "medium" ? "4-6h" : "8-24h";

  // Confidence score (0–100)
  const confidence = Math.min(95, 50 + maxMatches * 15 + (priority !== "low" ? 10 : 0));

  return { category, priority, department, technician, eta, confidence };
}

// ── predictFailureRisk ────────────────────────────────────────────────────────
// Weighted linear model: health(50%) + age(30%) + usage(20%)
export function predictFailureRisk(healthScore, daysSinceMaintenance, usageHours = null) {
  if (usageHours === null) usageHours = 200 + Math.random() * 1800;

  const h = healthScore / 100;
  const d = Math.min(daysSinceMaintenance / 365, 1);
  const u = Math.min(usageHours / 2000, 1);

  let risk = (1 - h) * 0.50 + d * 0.30 + u * 0.20;
  // Small random jitter to simulate real-world variance
  risk = Math.max(0, Math.min(1, risk + (Math.random() - 0.5) * 0.08));

  const riskPct = Math.round(risk * 100 * 10) / 10;
  const label   = risk > 0.70 ? "Critical" : risk > 0.40 ? "Warning" : "Healthy";
  const daysToFailure = Math.max(1, Math.round((1 - risk) * 180));
  const nextMaintenance = daysToFailure < 30 ? "Immediate" :
                          daysToFailure < 90 ? "Within 30 days" : "Within 90 days";

  return { risk: riskPct, label, daysToFailure, nextMaintenance, usageHours: Math.round(usageHours) };
}

// ── predictOccupancy ──────────────────────────────────────────────────────────
// Time-of-day pattern model
export function predictOccupancy(currentOccupancy, capacity, roomType = "classroom") {
  const hour = new Date().getHours();

  // Base time factor
  let factor;
  if (hour < 7 || hour > 21)        factor = 0.05;
  else if (hour >= 8  && hour <= 10) factor = 1.30;
  else if (hour >= 11 && hour <= 12) factor = 1.10;
  else if (hour >= 13 && hour <= 15) factor = 1.25;
  else if (hour >= 16 && hour <= 18) factor = 0.90;
  else                               factor = 0.60;

  // Room-type modifier
  const typeModifiers = {
    cafeteria: hour >= 11 && hour <= 14 ? 1.5 : 0.4,
    library:   hour >= 9  && hour <= 20 ? 1.1 : 0.2,
    sports:    hour >= 16 && hour <= 20 ? 1.4 : 0.5,
    server:    0.8,
    lounge:    hour >= 10 && hour <= 16 ? 1.0 : 0.3,
  };
  const typeMod = typeModifiers[roomType] ?? 1.0;

  const predicted = Math.max(0, Math.min(capacity,
    Math.round(currentOccupancy * factor * typeMod + (Math.random() - 0.5) * 4)
  ));
  const pct        = capacity > 0 ? Math.round(predicted / capacity * 100) : 0;
  const confidence = Math.min(92, 55 + Math.abs(currentOccupancy - predicted) * 0.5);

  return { predicted, pct, confidence: Math.round(confidence) };
}

// ── generateHeatmapColor ──────────────────────────────────────────────────────
export function heatColor(value, max = 100) {
  const pct = Math.min(value / max, 1);
  if (pct < 0.33) {
    const t = pct / 0.33;
    return `rgba(0,${Math.round(200*t+80*(1-t))},${Math.round(136*t)},${0.25+pct*0.5})`;
  } else if (pct < 0.66) {
    const t = (pct - 0.33) / 0.33;
    return `rgba(${Math.round(255*t)},${Math.round(200*(1-t)+200*t)},0,${0.45+pct*0.3})`;
  } else {
    const t = (pct - 0.66) / 0.34;
    return `rgba(255,${Math.round(80*(1-t))},${Math.round(80*(1-t))},${0.55+t*0.35})`;
  }
}

// ── congestionLevel ───────────────────────────────────────────────────────────
export function congestionLevel(pct) {
  if (pct > 85) return { label:"Critical", color:"#ff3366", bg:"rgba(255,51,102,0.2)" };
  if (pct > 65) return { label:"High",     color:"#ff6600", bg:"rgba(255,102,0,0.15)" };
  if (pct > 35) return { label:"Medium",   color:"#ffcc00", bg:"rgba(255,204,0,0.15)" };
  return              { label:"Low",      color:"#00ff88", bg:"rgba(0,255,136,0.12)" };
}
