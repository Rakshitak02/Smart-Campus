// ═══════════════════════════════════════════════════════════════
//  Firebase Configuration — Smart Campus Digital Twin
//  Replace firebaseConfig with YOUR project keys from:
//  https://console.firebase.google.com → Project Settings → General
// ═══════════════════════════════════════════════════════════════

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore, collection, doc, getDocs, getDoc,
  setDoc, addDoc, updateDoc, deleteDoc, onSnapshot,
  query, orderBy, limit, where, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ── 🔑 REPLACE THIS WITH YOUR FIREBASE CONFIG ────────────────────────────────
const firebaseConfig = {
  apiKey:            "AIzaSyDEMO_REPLACE_WITH_YOUR_KEY",
  authDomain:        "smart-campus-demo.firebaseapp.com",
  projectId:         "smart-campus-demo",
  storageBucket:     "smart-campus-demo.appspot.com",
  messagingSenderId: "123456789012",
  appId:             "1:123456789012:web:abcdef1234567890"
};
// ─────────────────────────────────────────────────────────────────────────────

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// Collection names
export const C = {
  ROOMS:      "rooms",
  ISSUES:     "issues",
  RESOURCES:  "resources",
  MAINT_LOGS: "maintenance_logs",
  OCC_LOGS:   "occupancy_logs",
  WIFI:       "wifi_nodes",
};

// Re-export Firestore helpers
export {
  collection, doc, getDocs, getDoc, setDoc, addDoc,
  updateDoc, deleteDoc, onSnapshot, query, orderBy,
  limit, where, serverTimestamp
};

// ── Seed Firestore on first run ───────────────────────────────────────────────
export async function seedIfEmpty() {
  const snap = await getDocs(collection(db, C.ROOMS));
  if (!snap.empty) return;
  console.log("🌱 Seeding Firestore…");

  const rooms = [
    { id:"A101", name:"Lab A101",       type:"lab",        status:"available", occupancy:12,  capacity:30,  building:"Engineering", equipment:["projector","PCs","whiteboard"] },
    { id:"A102", name:"Class A102",     type:"classroom",  status:"busy",      occupancy:38,  capacity:40,  building:"Engineering", equipment:["projector","whiteboard"] },
    { id:"A103", name:"Lab A103",       type:"lab",        status:"fault",     occupancy:0,   capacity:25,  building:"Engineering", equipment:["projector","PCs"] },
    { id:"A104", name:"Class A104",     type:"classroom",  status:"available", occupancy:5,   capacity:35,  building:"Engineering", equipment:["projector"] },
    { id:"B101", name:"Lab B101",       type:"lab",        status:"available", occupancy:18,  capacity:28,  building:"Science",     equipment:["projector","PCs","microscopes"] },
    { id:"B102", name:"Class B102",     type:"classroom",  status:"busy",      occupancy:42,  capacity:45,  building:"Science",     equipment:["projector","whiteboard"] },
    { id:"B103", name:"Lab B103",       type:"lab",        status:"busy",      occupancy:19,  capacity:20,  building:"Science",     equipment:["PCs","3D printer"] },
    { id:"B104", name:"Class B104",     type:"classroom",  status:"available", occupancy:0,   capacity:38,  building:"Science",     equipment:["projector"] },
    { id:"C101", name:"Server Room",    type:"server",     status:"available", occupancy:2,   capacity:5,   building:"Admin",       equipment:["servers","network"] },
    { id:"C102", name:"Admin Office",   type:"office",     status:"busy",      occupancy:8,   capacity:10,  building:"Admin",       equipment:["PCs"] },
    { id:"C103", name:"Conference",     type:"conference", status:"available", occupancy:0,   capacity:20,  building:"Admin",       equipment:["projector","video conf"] },
    { id:"D101", name:"Reading Hall",   type:"library",    status:"busy",      occupancy:65,  capacity:80,  building:"Library",     equipment:["PCs","WiFi"] },
    { id:"D102", name:"Study Room",     type:"study",      status:"available", occupancy:4,   capacity:15,  building:"Library",     equipment:["whiteboard"] },
    { id:"D103", name:"Media Lab",      type:"lab",        status:"fault",     occupancy:0,   capacity:20,  building:"Library",     equipment:["PCs","projector"] },
    { id:"E101", name:"Gymnasium",      type:"sports",     status:"available", occupancy:15,  capacity:100, building:"Sports",      equipment:["scoreboard"] },
    { id:"E102", name:"Fitness Center", type:"sports",     status:"busy",      occupancy:22,  capacity:30,  building:"Sports",      equipment:["equipment"] },
    { id:"E103", name:"Pool Area",      type:"sports",     status:"available", occupancy:8,   capacity:40,  building:"Sports",      equipment:["WiFi"] },
    { id:"F101", name:"Main Dining",    type:"cafeteria",  status:"busy",      occupancy:120, capacity:150, building:"Facilities",  equipment:["WiFi","TV"] },
    { id:"F102", name:"Staff Lounge",   type:"lounge",     status:"available", occupancy:5,   capacity:25,  building:"Facilities",  equipment:["WiFi","TV"] },
  ];
  for (const r of rooms) {
    const { id, ...data } = r;
    await setDoc(doc(db, C.ROOMS, id), { ...data, lastUpdated: serverTimestamp() });
  }

  const resources = [
    { name:"Projector A101",  type:"projector",  location:"A101",    status:"available", healthScore:92, lastMaintenance:"2024-01-10", reservedBy:null, reservedUntil:null },
    { name:"Projector A102",  type:"projector",  location:"A102",    status:"busy",      healthScore:78, lastMaintenance:"2024-02-15", reservedBy:"Dr. Smith", reservedUntil:null },
    { name:"Projector B101",  type:"projector",  location:"B101",    status:"available", healthScore:88, lastMaintenance:"2024-03-01", reservedBy:null, reservedUntil:null },
    { name:"PC Lab A101-1",   type:"pc",         location:"A101",    status:"available", healthScore:95, lastMaintenance:"2024-01-20", reservedBy:null, reservedUntil:null },
    { name:"PC Lab A101-2",   type:"pc",         location:"A101",    status:"fault",     healthScore:34, lastMaintenance:"2023-12-05", reservedBy:null, reservedUntil:null },
    { name:"PC Lab B103-1",   type:"pc",         location:"B103",    status:"available", healthScore:91, lastMaintenance:"2024-02-28", reservedBy:null, reservedUntil:null },
    { name:"3D Printer B103", type:"3d_printer", location:"B103",    status:"busy",      healthScore:67, lastMaintenance:"2024-01-15", reservedBy:"Prof. Lee", reservedUntil:null },
    { name:"Server C101",     type:"server",     location:"C101",    status:"available", healthScore:99, lastMaintenance:"2024-03-10", reservedBy:null, reservedUntil:null },
    { name:"WiFi Node W1",    type:"wifi",       location:"A Block", status:"available", healthScore:95, lastMaintenance:"2024-02-01", reservedBy:null, reservedUntil:null },
    { name:"WiFi Node W3",    type:"wifi",       location:"C Block", status:"fault",     healthScore:41, lastMaintenance:"2023-11-20", reservedBy:null, reservedUntil:null },
    { name:"Microscope B101", type:"microscope", location:"B101",    status:"available", healthScore:85, lastMaintenance:"2024-01-05", reservedBy:null, reservedUntil:null },
    { name:"Video Conf C103", type:"av_system",  location:"C103",    status:"available", healthScore:90, lastMaintenance:"2024-02-20", reservedBy:null, reservedUntil:null },
  ];
  for (const r of resources) {
    await addDoc(collection(db, C.RESOURCES), { ...r, createdAt: serverTimestamp() });
  }

  const issues = [
    { title:"Projector not working", description:"Projector in A103 shows no signal",       location:"A103",    category:"equipment",  priority:"high",   department:"IT",         eta:"1-2h",  technician:"Tech-01", status:"open" },
    { title:"AC broken",             description:"Air conditioning making loud noise",        location:"B102",    category:"hvac",       priority:"medium", department:"Facilities", eta:"4-6h",  technician:"Tech-02", status:"in_progress" },
    { title:"WiFi down",             description:"WiFi node W3 not broadcasting",            location:"C Block", category:"network",    priority:"high",   department:"IT",         eta:"1-2h",  technician:"Tech-03", status:"open" },
    { title:"PC crash loop",         description:"Multiple PCs in A101 stuck in boot loop",  location:"A101",    category:"equipment",  priority:"high",   department:"IT",         eta:"1-2h",  technician:"Tech-01", status:"in_progress" },
    { title:"Light flickering",      description:"Lights in D103 flickering intermittently", location:"D103",    category:"electrical", priority:"low",    department:"Facilities", eta:"8-24h", technician:"Tech-04", status:"open" },
    { title:"Door lock fault",       description:"Smart lock on B103 not responding",        location:"B103",    category:"security",   priority:"medium", department:"Security",   eta:"4-6h",  technician:"Tech-05", status:"resolved" },
  ];
  for (const i of issues) {
    await addDoc(collection(db, C.ISSUES), { ...i, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  }

  const wifi = [
    { id:"W1", x:180, y:160, signal:95, connected:23, building:"Engineering" },
    { id:"W2", x:440, y:160, signal:88, connected:31, building:"Science" },
    { id:"W3", x:680, y:160, signal:72, connected:18, building:"Admin" },
    { id:"W4", x:180, y:380, signal:91, connected:45, building:"Library" },
    { id:"W5", x:440, y:380, signal:85, connected:28, building:"Sports" },
    { id:"W6", x:680, y:380, signal:79, connected:12, building:"Facilities" },
  ];
  for (const w of wifi) {
    await setDoc(doc(db, C.WIFI, w.id), w);
  }

  console.log("✅ Firestore seeded!");
}
