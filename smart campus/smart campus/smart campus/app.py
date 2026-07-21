import os, json, random, sqlite3
from datetime import datetime, timedelta
from functools import wraps
from flask import Flask, render_template, request, jsonify, redirect, url_for, session
import numpy as np

app = Flask(__name__)
app.secret_key = "smartcampus_secret_2024"
DB = "campus.db"

# ── Demo users (role -> {username, password}) ────────────────────────────────
USERS = {
    "admin":   {"username": "admin",   "password": "admin123",   "role": "admin",   "name": "Admin User"},
    "student": {"username": "student", "password": "student123", "role": "student", "name": "Alex Student"},
    "faculty": {"username": "faculty", "password": "faculty123", "role": "faculty", "name": "Dr. Faculty"},
    "hod":     {"username": "hod",     "password": "hod123",     "role": "hod",     "name": "Prof. HOD"},
}

ROLE_PERMISSIONS = {
    "admin":   ["campus_map", "dashboard", "issues", "maintenance", "analytics", "resources"],
    "hod":     ["campus_map", "dashboard", "issues", "analytics", "resources"],
    "faculty": ["campus_map", "issues", "resources"],
    "student": ["campus_map", "resources"],
}

def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if "user" not in session:
            return redirect(url_for("login"))
        return f(*args, **kwargs)
    return decorated

def role_required(*roles):
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            if "user" not in session:
                return redirect(url_for("login"))
            if session["user"]["role"] not in roles:
                return redirect(url_for("role_dashboard"))
            return f(*args, **kwargs)
        return decorated
    return decorator

# ── DB helpers ──────────────────────────────────────────────────────────────
def get_db():
    conn = sqlite3.connect(DB)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    c = conn.cursor()
    c.executescript("""
    CREATE TABLE IF NOT EXISTS circulars (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT, content TEXT,
        posted_by TEXT, role TEXT,
        target TEXT DEFAULT 'all',
        created_at TEXT
    );
    CREATE TABLE IF NOT EXISTS attendance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        usn TEXT, student_name TEXT,
        subject TEXT, class_date TEXT,
        status TEXT DEFAULT 'present',
        marked_by TEXT, created_at TEXT
    );
    CREATE TABLE IF NOT EXISTS suggestions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        usn TEXT, student_name TEXT,
        subject TEXT, message TEXT,
        status TEXT DEFAULT 'pending',
        created_at TEXT
    );
    CREATE TABLE IF NOT EXISTS issues (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT, description TEXT, location TEXT,
        category TEXT, priority TEXT, department TEXT,
        eta TEXT, technician TEXT, status TEXT DEFAULT 'open',
        created_at TEXT, updated_at TEXT
    );
    CREATE TABLE IF NOT EXISTS resources (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT, type TEXT, location TEXT,
        status TEXT DEFAULT 'available',
        reserved_by TEXT, reserved_until TEXT,
        last_maintenance TEXT, health_score REAL DEFAULT 100.0
    );
    CREATE TABLE IF NOT EXISTS maintenance_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        resource_id INTEGER, action TEXT,
        performed_by TEXT, notes TEXT,
        performed_at TEXT, next_due TEXT
    );
    CREATE TABLE IF NOT EXISTS occupancy_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        room_id TEXT, occupancy INTEGER, capacity INTEGER,
        logged_at TEXT
    );
    CREATE TABLE IF NOT EXISTS room_status (
        id TEXT PRIMARY KEY,
        name TEXT, type TEXT, status TEXT,
        occupancy INTEGER DEFAULT 0, capacity INTEGER DEFAULT 30,
        building TEXT, last_updated TEXT
    );
    """)
    conn.commit()
    _seed(conn)
    conn.close()

def _seed(conn):
    c = conn.cursor()
    if c.execute("SELECT COUNT(*) FROM resources").fetchone()[0] > 0:
        return
    resources = [
        ("Projector A101","projector","A101","available",None,None,"2024-01-10",92.0),
        ("Projector A102","projector","A102","busy",None,None,"2024-02-15",78.0),
        ("Projector B101","projector","B101","available",None,None,"2024-03-01",88.0),
        ("PC Lab A101-1","pc","A101","available",None,None,"2024-01-20",95.0),
        ("PC Lab A101-2","pc","A101","fault",None,None,"2023-12-05",34.0),
        ("PC Lab B103-1","pc","B103","available",None,None,"2024-02-28",91.0),
        ("3D Printer B103","3d_printer","B103","busy",None,None,"2024-01-15",67.0),
        ("Server C101","server","C101","available",None,None,"2024-03-10",99.0),
        ("WiFi Node W1","wifi","A Block","available",None,None,"2024-02-01",95.0),
        ("WiFi Node W3","wifi","C Block","fault",None,None,"2023-11-20",41.0),
        ("Microscope B101","microscope","B101","available",None,None,"2024-01-05",85.0),
        ("Video Conf C103","av_system","C103","available",None,None,"2024-02-20",90.0),
    ]
    c.executemany(
        "INSERT INTO resources(name,type,location,status,reserved_by,reserved_until,last_maintenance,health_score) VALUES(?,?,?,?,?,?,?,?)",
        resources
    )

    issues = [
        ("Projector not working","Projector in A103 shows no signal","A103","equipment","high","IT","2h","Tech-01","open"),
        ("AC broken","Air conditioning unit making loud noise","B102","hvac","medium","Facilities","4h","Tech-02","in_progress"),
        ("WiFi down","WiFi node W3 not broadcasting","C Block","network","high","IT","1h","Tech-03","open"),
        ("PC crash loop","Multiple PCs in A101 stuck in boot loop","A101","equipment","high","IT","3h","Tech-01","in_progress"),
        ("Light flickering","Lights in D103 flickering intermittently","D103","electrical","low","Facilities","8h","Tech-04","open"),
        ("Door lock fault","Smart lock on B103 not responding","B103","security","medium","Security","2h","Tech-05","resolved"),
    ]
    now = datetime.now().isoformat()
    c.executemany(
        "INSERT INTO issues(title,description,location,category,priority,department,eta,technician,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)",
        [(i[0],i[1],i[2],i[3],i[4],i[5],i[6],i[7],i[8],now,now) for i in issues]
    )

    rooms = [
        ("A101","Lab A101","lab","available",12,30,"Engineering"),
        ("A102","Class A102","classroom","busy",38,40,"Engineering"),
        ("A103","Lab A103","lab","fault",0,25,"Engineering"),
        ("A104","Class A104","classroom","available",5,35,"Engineering"),
        ("B101","Lab B101","lab","available",18,28,"Science"),
        ("B102","Class B102","classroom","busy",42,45,"Science"),
        ("B103","Lab B103","lab","busy",19,20,"Science"),
        ("B104","Class B104","classroom","available",0,38,"Science"),
        ("C101","Server Room","server","available",2,5,"Admin"),
        ("C102","Admin Office","office","busy",8,10,"Admin"),
        ("C103","Conference","conference","available",0,20,"Admin"),
        ("D101","Reading Hall","library","busy",65,80,"Library"),
        ("D102","Study Room","study","available",4,15,"Library"),
        ("D103","Media Lab","lab","fault",0,20,"Library"),
        ("E101","Gymnasium","sports","available",15,100,"Sports"),
        ("E102","Fitness Center","sports","busy",22,30,"Sports"),
        ("E103","Pool Area","sports","available",8,40,"Sports"),
        ("F101","Main Dining","cafeteria","busy",120,150,"Facilities"),
        ("F102","Staff Lounge","lounge","available",5,25,"Facilities"),
    ]
    c.executemany(
        "INSERT OR IGNORE INTO room_status(id,name,type,status,occupancy,capacity,building,last_updated) VALUES(?,?,?,?,?,?,?,?)",
        [(r[0],r[1],r[2],r[3],r[4],r[5],r[6],now) for r in rooms]
    )

    # seed occupancy history
    for room_id, _, _, _, occ, cap, _ in rooms:
        for i in range(48):
            ts = (datetime.now() - timedelta(hours=i)).isoformat()
            noise = random.randint(-5, 5)
            c.execute("INSERT INTO occupancy_logs(room_id,occupancy,capacity,logged_at) VALUES(?,?,?,?)",
                      (room_id, max(0, min(cap, occ + noise)), cap, ts))

    # seed circulars
    circulars = [
        ("Mid-Term Exam Schedule", "Mid-term exams will be held from July 10–17. All students must carry ID cards. Syllabus: Units 1–3 for all subjects.", "Prof. HOD", "hod", "all"),
        ("Lab Safety Workshop", "Mandatory lab safety workshop on July 5, 2PM in B101. Attendance is compulsory for all lab students.", "Dr. Faculty", "faculty", "all"),
        ("Holiday Notice", "Campus will remain closed on July 4 (national holiday). All pending assignments due July 3.", "Prof. HOD", "hod", "all"),
        ("Internal Assessment Marks", "IA marks for Semester 4 have been uploaded to the portal. Last date to raise objections: July 8.", "Dr. Faculty", "faculty", "all"),
    ]
    for title, content, posted_by, role, target in circulars:
        c.execute("INSERT INTO circulars(title,content,posted_by,role,target,created_at) VALUES(?,?,?,?,?,?)",
                  (title, content, posted_by, role, target, (datetime.now() - timedelta(days=random.randint(0,5))).isoformat()))

    # seed attendance for demo students
    students = [
        ("1CS21001","Rahul Sharma"), ("1CS21002","Priya Nair"), ("1CS21003","Arun Kumar"),
        ("1CS21004","Sneha Patel"),  ("1CS21005","Kiran Reddy"),("1CS21006","Deepa Singh"),
    ]
    subjects = ["Data Structures","DBMS","Operating Systems","Computer Networks","Software Engineering"]
    for day_offset in range(10):
        date = (datetime.now() - timedelta(days=day_offset)).strftime("%Y-%m-%d")
        for usn, name in students:
            for subject in subjects:
                # make 1CS21003 and 1CS21005 frequently absent
                if usn in ("1CS21003","1CS21005"):
                    status = "absent" if random.random() < 0.7 else "present"
                else:
                    status = "absent" if random.random() < 0.1 else "present"
                c.execute(
                    "INSERT INTO attendance(usn,student_name,subject,class_date,status,marked_by,created_at) VALUES(?,?,?,?,?,?,?)",
                    (usn, name, subject, date, status, "Dr. Faculty", datetime.now().isoformat())
                )

    # seed suggestions
    suggestions = [
        ("1CS21001","Rahul Sharma","Data Structures","More practical sessions on trees and graphs would help us understand better."),
        ("1CS21002","Priya Nair","DBMS","Could we have more SQL query practice problems before the exam?"),
        ("1CS21004","Sneha Patel","Operating Systems","The deadlock topic needs one more lecture with examples."),
    ]
    for usn, name, subject, message in suggestions:
        c.execute("INSERT INTO suggestions(usn,student_name,subject,message,status,created_at) VALUES(?,?,?,?,?,?)",
                  (usn, name, subject, message, "pending", (datetime.now()-timedelta(days=random.randint(0,3))).isoformat()))

    conn.commit()


# ── AI Issue Engine ──────────────────────────────────────────────────────────
CATEGORIES = {
    "projector": "equipment", "screen": "equipment", "pc": "equipment",
    "computer": "equipment", "printer": "equipment", "server": "equipment",
    "wifi": "network", "internet": "network", "network": "network", "cable": "network",
    "ac": "hvac", "air": "hvac", "heating": "hvac", "cooling": "hvac",
    "light": "electrical", "power": "electrical", "socket": "electrical",
    "door": "security", "lock": "security", "camera": "security",
    "leak": "plumbing", "water": "plumbing", "pipe": "plumbing",
    "clean": "housekeeping", "trash": "housekeeping",
}
DEPARTMENTS = {
    "equipment": "IT", "network": "IT", "hvac": "Facilities",
    "electrical": "Facilities", "security": "Security",
    "plumbing": "Facilities", "housekeeping": "Housekeeping",
}
TECHNICIANS = {
    "IT": ["Tech-01", "Tech-03"], "Facilities": ["Tech-02", "Tech-04"],
    "Security": ["Tech-05"], "Housekeeping": ["Tech-06"],
}
ETA_MAP = {"high": "1-2h", "medium": "4-6h", "low": "8-24h"}

def ai_analyze_issue(title, description):
    text = (title + " " + description).lower()
    category = "general"
    for kw, cat in CATEGORIES.items():
        if kw in text:
            category = cat
            break
    priority = "high" if any(w in text for w in ["urgent","critical","broken","down","fail","crash","not working"]) \
               else "medium" if any(w in text for w in ["slow","intermittent","flickering","noise"]) \
               else "low"
    department = DEPARTMENTS.get(category, "Facilities")
    techs = TECHNICIANS.get(department, ["Tech-01"])
    technician = random.choice(techs)
    eta = ETA_MAP[priority]
    return {"category": category, "priority": priority, "department": department,
            "technician": technician, "eta": eta}

# ── ML: Predictive Maintenance ───────────────────────────────────────────────
def predict_failure_risk(health_score, days_since_maintenance, usage_hours=None):
    """Simple rule-based + linear model for failure probability."""
    if usage_hours is None:
        usage_hours = random.uniform(100, 2000)
    # Normalize features
    h = health_score / 100.0
    d = min(days_since_maintenance / 365.0, 1.0)
    u = min(usage_hours / 2000.0, 1.0)
    # Weighted risk score
    risk = (1 - h) * 0.5 + d * 0.3 + u * 0.2
    risk = max(0.0, min(1.0, risk + random.uniform(-0.05, 0.05)))
    if risk > 0.7:
        label = "Critical"
    elif risk > 0.4:
        label = "Warning"
    else:
        label = "Healthy"
    days_to_failure = max(1, int((1 - risk) * 180))
    return {"risk": round(risk * 100, 1), "label": label, "days_to_failure": days_to_failure}

def predict_occupancy(room_id, hour=None):
    """Predict occupancy for next hour using historical average + time pattern."""
    if hour is None:
        hour = datetime.now().hour
    conn = get_db()
    rows = conn.execute(
        "SELECT occupancy, capacity FROM occupancy_logs WHERE room_id=? ORDER BY logged_at DESC LIMIT 48",
        (room_id,)
    ).fetchall()
    conn.close()
    if not rows:
        return {"predicted": 0, "confidence": 0}
    avg = sum(r["occupancy"] for r in rows) / len(rows)
    cap = rows[0]["capacity"]
    # Time-of-day pattern
    if 8 <= hour <= 10 or 13 <= hour <= 15:
        factor = 1.3
    elif 11 <= hour <= 12 or 16 <= hour <= 18:
        factor = 1.1
    elif hour < 7 or hour > 20:
        factor = 0.1
    else:
        factor = 0.8
    predicted = min(cap, int(avg * factor + random.uniform(-3, 3)))
    confidence = min(95, 60 + len(rows))
    return {"predicted": max(0, predicted), "capacity": cap,
            "pct": round(predicted / cap * 100, 1) if cap else 0,
            "confidence": confidence}


# ── Auth Routes ───────────────────────────────────────────────────────────────
@app.route("/login", methods=["GET", "POST"])
def login():
    error = None
    if request.method == "POST":
        username = request.form.get("username", "").strip()
        password = request.form.get("password", "").strip()
        role     = request.form.get("role", "").strip()
        user = USERS.get(role)
        if user and user["username"] == username and user["password"] == password:
            session["user"] = {"username": username, "role": role, "name": user["name"]}
            return redirect(url_for("role_dashboard"))
        error = "Invalid credentials. Please try again."
    return render_template("login.html", error=error)

@app.route("/logout")
def logout():
    session.clear()
    return redirect(url_for("login"))

@app.route("/dashboard/home")
@login_required
def role_dashboard():
    role = session["user"]["role"]
    if role == "admin":
        return redirect(url_for("dashboard"))
    elif role == "hod":
        return redirect(url_for("hod_dashboard"))
    elif role == "faculty":
        return redirect(url_for("faculty_dashboard"))
    else:
        return redirect(url_for("student_dashboard"))

# ── Role Dashboards ───────────────────────────────────────────────────────────
@app.route("/dashboard/hod")
@role_required("hod")
def hod_dashboard():
    return render_template("dashboard_hod.html", user=session["user"])

@app.route("/dashboard/faculty")
@role_required("faculty")
def faculty_dashboard():
    return render_template("dashboard_faculty.html", user=session["user"])

@app.route("/dashboard/student")
@role_required("student")
def student_dashboard():
    return render_template("dashboard_student.html", user=session["user"])

# ── Routes ───────────────────────────────────────────────────────────────────
@app.route("/")
@login_required
def index():
    return render_template("index.html", user=session["user"])

@app.route("/dashboard")
@role_required("admin")
def dashboard():
    return render_template("dashboard.html", user=session["user"])

@app.route("/issues")
@login_required
def issues():
    return render_template("issues.html", user=session["user"])

@app.route("/maintenance")
@role_required("admin")
def maintenance():
    return render_template("maintenance.html", user=session["user"])

@app.route("/analytics")
@role_required("admin", "hod")
def analytics():
    return render_template("analytics.html", user=session["user"])

@app.route("/resources")
@login_required
def resources():
    return render_template("resources.html", user=session["user"])

# ── API: Campus Status ────────────────────────────────────────────────────────
@app.route("/api/campus/status")
def api_campus_status():
    conn = get_db()
    rooms = [dict(r) for r in conn.execute("SELECT * FROM room_status").fetchall()]
    issues = conn.execute("SELECT location, COUNT(*) as cnt FROM issues WHERE status!='resolved' GROUP BY location").fetchall()
    conn.close()
    issue_map = {r["location"]: r["cnt"] for r in issues}
    for room in rooms:
        room["open_issues"] = issue_map.get(room["id"], 0)
    stats = {
        "available": sum(1 for r in rooms if r["status"] == "available"),
        "busy": sum(1 for r in rooms if r["status"] == "busy"),
        "fault": sum(1 for r in rooms if r["status"] == "fault"),
        "total": len(rooms),
    }
    return jsonify({"rooms": rooms, "stats": stats})

@app.route("/api/campus/room/<room_id>")
def api_room_detail(room_id):
    conn = get_db()
    room = conn.execute("SELECT * FROM room_status WHERE id=?", (room_id,)).fetchone()
    issues = conn.execute("SELECT * FROM issues WHERE location=? ORDER BY created_at DESC LIMIT 5", (room_id,)).fetchall()
    resources = conn.execute("SELECT * FROM resources WHERE location=?", (room_id,)).fetchall()
    conn.close()
    if not room:
        return jsonify({"error": "Room not found"}), 404
    occ_pred = predict_occupancy(room_id)
    return jsonify({
        "room": dict(room),
        "issues": [dict(i) for i in issues],
        "resources": [dict(r) for r in resources],
        "occupancy_prediction": occ_pred,
    })

@app.route("/api/campus/room/<room_id>/status", methods=["POST"])
def api_update_room_status(room_id):
    data = request.json
    status = data.get("status")
    if status not in ("available", "busy", "fault"):
        return jsonify({"error": "Invalid status"}), 400
    conn = get_db()
    conn.execute("UPDATE room_status SET status=?, last_updated=? WHERE id=?",
                 (status, datetime.now().isoformat(), room_id))
    conn.commit()
    conn.close()
    return jsonify({"ok": True})

# ── API: Issues ───────────────────────────────────────────────────────────────
@app.route("/api/issues", methods=["GET"])
def api_get_issues():
    conn = get_db()
    rows = conn.execute("SELECT * FROM issues ORDER BY created_at DESC").fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])

@app.route("/api/issues", methods=["POST"])
def api_create_issue():
    data = request.json
    title = data.get("title", "")
    description = data.get("description", "")
    location = data.get("location", "")
    ai = ai_analyze_issue(title, description)
    now = datetime.now().isoformat()
    conn = get_db()
    cur = conn.execute(
        "INSERT INTO issues(title,description,location,category,priority,department,eta,technician,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)",
        (title, description, location, ai["category"], ai["priority"],
         ai["department"], ai["eta"], ai["technician"], "open", now, now)
    )
    issue_id = cur.lastrowid
    conn.commit()
    conn.close()
    return jsonify({"id": issue_id, "ai_analysis": ai, "ok": True})

@app.route("/api/issues/<int:issue_id>/status", methods=["POST"])
def api_update_issue(issue_id):
    data = request.json
    status = data.get("status")
    conn = get_db()
    conn.execute("UPDATE issues SET status=?, updated_at=? WHERE id=?",
                 (status, datetime.now().isoformat(), issue_id))
    conn.commit()
    conn.close()
    return jsonify({"ok": True})

# ── API: Resources ────────────────────────────────────────────────────────────
@app.route("/api/resources", methods=["GET"])
def api_get_resources():
    conn = get_db()
    rows = conn.execute("SELECT * FROM resources ORDER BY location").fetchall()
    conn.close()
    result = []
    for r in rows:
        d = dict(r)
        lm = r["last_maintenance"]
        if lm:
            try:
                days = (datetime.now() - datetime.fromisoformat(lm)).days
            except Exception:
                days = 30
        else:
            days = 90
        pred = predict_failure_risk(r["health_score"], days)
        d["failure_prediction"] = pred
        result.append(d)
    return jsonify(result)

@app.route("/api/resources/<int:res_id>/reserve", methods=["POST"])
def api_reserve_resource(res_id):
    data = request.json
    user = data.get("user", "Anonymous")
    hours = int(data.get("hours", 1))
    until = (datetime.now() + timedelta(hours=hours)).isoformat()
    conn = get_db()
    conn.execute("UPDATE resources SET status='busy', reserved_by=?, reserved_until=? WHERE id=?",
                 (user, until, res_id))
    conn.commit()
    conn.close()
    return jsonify({"ok": True, "reserved_until": until})

@app.route("/api/resources/<int:res_id>/release", methods=["POST"])
def api_release_resource(res_id):
    conn = get_db()
    conn.execute("UPDATE resources SET status='available', reserved_by=NULL, reserved_until=NULL WHERE id=?",
                 (res_id,))
    conn.commit()
    conn.close()
    return jsonify({"ok": True})

# ── API: Maintenance ──────────────────────────────────────────────────────────
@app.route("/api/maintenance/predictions")
def api_maintenance_predictions():
    conn = get_db()
    resources = conn.execute("SELECT * FROM resources").fetchall()
    conn.close()
    predictions = []
    for r in resources:
        lm = r["last_maintenance"]
        try:
            days = (datetime.now() - datetime.fromisoformat(lm)).days if lm else 90
        except Exception:
            days = 90
        pred = predict_failure_risk(r["health_score"], days)
        predictions.append({
            "id": r["id"], "name": r["name"], "type": r["type"],
            "location": r["location"], "health_score": r["health_score"],
            "days_since_maintenance": days, "status": r["status"],
            **pred
        })
    predictions.sort(key=lambda x: x["risk"], reverse=True)
    return jsonify(predictions)

@app.route("/api/maintenance/log", methods=["POST"])
def api_log_maintenance():
    data = request.json
    now = datetime.now().isoformat()
    next_due = (datetime.now() + timedelta(days=90)).isoformat()
    conn = get_db()
    conn.execute(
        "INSERT INTO maintenance_logs(resource_id,action,performed_by,notes,performed_at,next_due) VALUES(?,?,?,?,?,?)",
        (data["resource_id"], data.get("action","inspection"),
         data.get("performed_by","Tech"), data.get("notes",""), now, next_due)
    )
    conn.execute("UPDATE resources SET last_maintenance=?, health_score=MIN(100, health_score+20) WHERE id=?",
                 (now, data["resource_id"]))
    conn.commit()
    conn.close()
    return jsonify({"ok": True})

# ── API: Analytics ────────────────────────────────────────────────────────────
@app.route("/api/analytics/occupancy")
def api_occupancy():
    conn = get_db()
    rooms = conn.execute("SELECT * FROM room_status").fetchall()
    conn.close()
    result = []
    for r in rooms:
        pred = predict_occupancy(r["id"])
        result.append({
            "room_id": r["id"], "name": r["name"],
            "current": r["occupancy"], "capacity": r["capacity"],
            "pct": round(r["occupancy"] / r["capacity"] * 100, 1) if r["capacity"] else 0,
            "predicted_next": pred["predicted"],
            "building": r["building"],
        })
    return jsonify(result)

@app.route("/api/analytics/heatmap")
def api_heatmap():
    conn = get_db()
    issues = conn.execute("SELECT location, COUNT(*) as cnt FROM issues GROUP BY location").fetchall()
    rooms = conn.execute("SELECT id, occupancy, capacity FROM room_status").fetchall()
    conn.close()
    issue_heat = [{"room": r["location"], "value": r["cnt"]} for r in issues]
    occ_heat = [{"room": r["id"], "value": round(r["occupancy"]/r["capacity"]*100,1) if r["capacity"] else 0} for r in rooms]
    return jsonify({"issue_density": issue_heat, "occupancy": occ_heat})

@app.route("/api/analytics/summary")
def api_summary():
    conn = get_db()
    total_issues = conn.execute("SELECT COUNT(*) FROM issues").fetchone()[0]
    open_issues = conn.execute("SELECT COUNT(*) FROM issues WHERE status='open'").fetchone()[0]
    resolved = conn.execute("SELECT COUNT(*) FROM issues WHERE status='resolved'").fetchone()[0]
    total_rooms = conn.execute("SELECT COUNT(*) FROM room_status").fetchone()[0]
    available = conn.execute("SELECT COUNT(*) FROM room_status WHERE status='available'").fetchone()[0]
    faults = conn.execute("SELECT COUNT(*) FROM room_status WHERE status='fault'").fetchone()[0]
    total_res = conn.execute("SELECT COUNT(*) FROM resources").fetchone()[0]
    faulty_res = conn.execute("SELECT COUNT(*) FROM resources WHERE health_score < 50").fetchone()[0]
    avg_occ = conn.execute("SELECT AVG(CAST(occupancy AS REAL)/capacity*100) FROM room_status WHERE capacity>0").fetchone()[0]
    conn.close()
    return jsonify({
        "issues": {"total": total_issues, "open": open_issues, "resolved": resolved},
        "rooms": {"total": total_rooms, "available": available, "faults": faults},
        "resources": {"total": total_res, "faulty": faulty_res},
        "avg_occupancy_pct": round(avg_occ or 0, 1),
    })

@app.route("/api/analytics/trends")
def api_trends():
    conn = get_db()
    rows = conn.execute("""
        SELECT strftime('%H', logged_at) as hour, AVG(CAST(occupancy AS REAL)/capacity*100) as avg_pct
        FROM occupancy_logs WHERE capacity > 0
        GROUP BY hour ORDER BY hour
    """).fetchall()
    conn.close()
    return jsonify([{"hour": int(r["hour"]), "avg_pct": round(r["avg_pct"], 1)} for r in rows])

# ── API: Live Activity Feed ───────────────────────────────────────────────────
@app.route("/api/feed")
def api_feed():
    conn = get_db()
    issues = conn.execute(
        "SELECT 'issue' as type, title as msg, location, priority, created_at as ts FROM issues ORDER BY created_at DESC LIMIT 5"
    ).fetchall()
    maint = conn.execute(
        "SELECT 'maintenance' as type, action||' on resource #'||resource_id as msg, performed_by as location, 'low' as priority, performed_at as ts FROM maintenance_logs ORDER BY performed_at DESC LIMIT 5"
    ).fetchall()
    conn.close()
    events = [dict(r) for r in issues] + [dict(r) for r in maint]
    events.sort(key=lambda x: x["ts"], reverse=True)
    # inject some simulated real-time events
    now = datetime.now()
    simulated = [
        {"type": "status", "msg": "Room A102 occupancy updated", "location": "A102", "priority": "low", "ts": (now - timedelta(minutes=2)).isoformat()},
        {"type": "ok",     "msg": "WiFi Node W1 signal stable at 95%", "location": "A Block", "priority": "low", "ts": (now - timedelta(minutes=5)).isoformat()},
        {"type": "status", "msg": "Projector B101 health check passed", "location": "B101", "priority": "low", "ts": (now - timedelta(minutes=8)).isoformat()},
    ]
    events = (events + simulated)
    events.sort(key=lambda x: x["ts"], reverse=True)
    return jsonify(events[:12])

# ── API: Simulate occupancy tick ──────────────────────────────────────────────
@app.route("/api/campus/simulate", methods=["POST"])
def api_simulate():
    """Randomly nudge occupancy values to simulate live campus activity."""
    conn = get_db()
    rooms = conn.execute("SELECT id, occupancy, capacity FROM room_status").fetchall()
    now = datetime.now().isoformat()
    for r in rooms:
        delta = random.randint(-4, 4)
        new_occ = max(0, min(r["capacity"], r["occupancy"] + delta))
        conn.execute("UPDATE room_status SET occupancy=?, last_updated=? WHERE id=?",
                     (new_occ, now, r["id"]))
        conn.execute("INSERT INTO occupancy_logs(room_id,occupancy,capacity,logged_at) VALUES(?,?,?,?)",
                     (r["id"], new_occ, r["capacity"], now))
    conn.commit()
    conn.close()
    return jsonify({"ok": True, "simulated_at": now})

# ── API: Maintenance history ──────────────────────────────────────────────────
@app.route("/api/maintenance/history")
def api_maintenance_history():
    conn = get_db()
    rows = conn.execute("""
        SELECT ml.*, r.name as resource_name, r.type as resource_type, r.location
        FROM maintenance_logs ml
        JOIN resources r ON ml.resource_id = r.id
        ORDER BY ml.performed_at DESC LIMIT 50
    """).fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])

# ── API: Campus congestion ────────────────────────────────────────────────────
@app.route("/api/analytics/congestion")
def api_congestion():
    conn = get_db()
    rooms = conn.execute("SELECT id, name, occupancy, capacity, building, type FROM room_status").fetchall()
    conn.close()
    result = []
    for r in rooms:
        pct = round(r["occupancy"] / r["capacity"] * 100, 1) if r["capacity"] else 0
        level = "critical" if pct > 85 else "high" if pct > 65 else "medium" if pct > 35 else "low"
        result.append({
            "id": r["id"], "name": r["name"], "building": r["building"],
            "type": r["type"], "occupancy": r["occupancy"],
            "capacity": r["capacity"], "pct": pct, "level": level,
        })
    result.sort(key=lambda x: x["pct"], reverse=True)
    return jsonify(result)

# ── API: Circulars ────────────────────────────────────────────────────────────
@app.route("/api/circulars", methods=["GET"])
@login_required
def api_get_circulars():
    conn = get_db()
    rows = conn.execute("SELECT * FROM circulars ORDER BY created_at DESC").fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])

@app.route("/api/circulars", methods=["POST"])
@role_required("hod", "faculty")
def api_post_circular():
    data = request.json
    user = session["user"]
    now = datetime.now().isoformat()
    conn = get_db()
    conn.execute(
        "INSERT INTO circulars(title,content,posted_by,role,target,created_at) VALUES(?,?,?,?,?,?)",
        (data.get("title",""), data.get("content",""), user["name"], user["role"], data.get("target","all"), now)
    )
    conn.commit()
    conn.close()
    return jsonify({"ok": True})

@app.route("/api/circulars/<int:cid>", methods=["DELETE"])
@role_required("hod", "faculty", "admin")
def api_delete_circular(cid):
    conn = get_db()
    conn.execute("DELETE FROM circulars WHERE id=?", (cid,))
    conn.commit()
    conn.close()
    return jsonify({"ok": True})

# ── API: Attendance ───────────────────────────────────────────────────────────
@app.route("/api/attendance", methods=["GET"])
@login_required
def api_get_attendance():
    subject = request.args.get("subject")
    date    = request.args.get("date")
    conn = get_db()
    query = "SELECT * FROM attendance WHERE 1=1"
    params = []
    if subject:
        query += " AND subject=?"; params.append(subject)
    if date:
        query += " AND class_date=?"; params.append(date)
    rows = conn.execute(query + " ORDER BY class_date DESC, usn", params).fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])

@app.route("/api/attendance", methods=["POST"])
@role_required("faculty", "hod", "admin")
def api_mark_attendance():
    data = request.json
    records = data.get("records", [])
    user = session["user"]
    now = datetime.now().isoformat()
    conn = get_db()
    for rec in records:
        conn.execute("DELETE FROM attendance WHERE usn=? AND subject=? AND class_date=?",
                     (rec["usn"], rec["subject"], rec["class_date"]))
        conn.execute(
            "INSERT INTO attendance(usn,student_name,subject,class_date,status,marked_by,created_at) VALUES(?,?,?,?,?,?,?)",
            (rec["usn"], rec.get("student_name",""), rec["subject"], rec["class_date"],
             rec.get("status","present"), user["name"], now)
        )
    conn.commit()
    conn.close()
    return jsonify({"ok": True, "count": len(records)})

@app.route("/api/attendance/absent-alert")
@role_required("faculty", "hod", "admin")
def api_absent_alert():
    conn = get_db()
    rows = conn.execute("""
        SELECT usn, student_name, subject, COUNT(*) as absent_days
        FROM attendance WHERE status='absent'
        GROUP BY usn, subject
        HAVING absent_days > 2
        ORDER BY absent_days DESC
    """).fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])

@app.route("/api/attendance/summary")
@login_required
def api_attendance_summary():
    conn = get_db()
    rows = conn.execute("""
        SELECT usn, student_name,
               COUNT(*) as total,
               SUM(CASE WHEN status='present' THEN 1 ELSE 0 END) as present_days,
               ROUND(SUM(CASE WHEN status='present' THEN 1 ELSE 0 END)*100.0/COUNT(*),1) as pct
        FROM attendance
        GROUP BY usn
        ORDER BY pct ASC
    """).fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])

# ── API: Suggestions ──────────────────────────────────────────────────────────
@app.route("/api/suggestions", methods=["GET"])
@role_required("faculty", "hod", "admin")
def api_get_suggestions():
    conn = get_db()
    rows = conn.execute("SELECT * FROM suggestions ORDER BY created_at DESC").fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])

@app.route("/api/suggestions", methods=["POST"])
@role_required("student")
def api_post_suggestion():
    data = request.json
    user = session["user"]
    now = datetime.now().isoformat()
    conn = get_db()
    conn.execute(
        "INSERT INTO suggestions(usn,student_name,subject,message,status,created_at) VALUES(?,?,?,?,?,?)",
        (data.get("usn",""), user["name"], data.get("subject",""), data.get("message",""), "pending", now)
    )
    conn.commit()
    conn.close()
    return jsonify({"ok": True})

@app.route("/api/suggestions/<int:sid>/status", methods=["POST"])
@role_required("faculty", "hod", "admin")
def api_update_suggestion(sid):
    status = request.json.get("status","reviewed")
    conn = get_db()
    conn.execute("UPDATE suggestions SET status=? WHERE id=?", (status, sid))
    conn.commit()
    conn.close()
    return jsonify({"ok": True})

# ── API: Resource utilization heatmap ────────────────────────────────────────
@app.route("/api/analytics/resource-utilization")
def api_resource_utilization():
    conn = get_db()
    resources = conn.execute("SELECT type, status, COUNT(*) as cnt FROM resources GROUP BY type, status").fetchall()
    conn.close()
    types = {}
    for r in resources:
        if r["type"] not in types:
            types[r["type"]] = {"available": 0, "busy": 0, "fault": 0, "total": 0}
        types[r["type"]][r["status"]] = types[r["type"]].get(r["status"], 0) + r["cnt"]
        types[r["type"]]["total"] += r["cnt"]
    result = []
    for t, counts in types.items():
        util = round((counts["busy"] / counts["total"]) * 100, 1) if counts["total"] else 0
        result.append({"type": t, "util_pct": util, **counts})
    return jsonify(result)

if __name__ == "__main__":
    init_db()
    app.run(debug=True, port=5000)
