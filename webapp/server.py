"""
Web server for the Hospital & Healthcare Information Management System.
Uses Python's built-in ThreadingHTTPServer and serves both the JSON API
and the vanilla JS single-page application in webapp/static/.
"""

import json
import mimetypes
import os
import re
import sqlite3
import sys
from datetime import date, datetime, timedelta
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

WEBAPP_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(WEBAPP_DIR)
STATIC_DIR = os.path.join(WEBAPP_DIR, "static")

if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

import hospital


def rows_to_dicts(rows):
    return [dict(r) for r in rows]


def build_weekly_series(conn, weeks=8):
    """Build weekly buckets (last 8 weeks) for dashboard/analytics charts."""
    # Anchor around latest appointment/bill date if data is in Oct/Nov 2026, or today
    latest_row = conn.execute(
        "SELECT MAX(d) AS max_d FROM ("
        "  SELECT MAX(appt_date) AS d FROM appointments "
        "  UNION ALL "
        "  SELECT MAX(bill_date) AS d FROM bills"
        ")"
    ).fetchone()
    anchor_str = latest_row["max_d"] if latest_row and latest_row["max_d"] else date.today().isoformat()
    anchor = datetime.strptime(anchor_str, "%Y-%m-%d").date()
    # Snap anchor to Monday of its week
    end_week_start = anchor - timedelta(days=anchor.weekday())
    buckets = []
    for i in range(weeks - 1, -1, -1):
        start_d = end_week_start - timedelta(days=7 * i)
        end_d = start_d + timedelta(days=6)
        buckets.append({
            "label": start_d.strftime("%d %b"),
            "start": start_d.isoformat(),
            "end": end_d.isoformat(),
            "billed": 0.0,
            "collected": 0.0,
            "appointments": 0,
        })

    bills = conn.execute("SELECT bill_date, amount, paid_amount FROM bills").fetchall()
    for b in bills:
        for bucket in buckets:
            if bucket["start"] <= b["bill_date"] <= bucket["end"]:
                bucket["billed"] += b["amount"]
                bucket["collected"] += b["paid_amount"]
                break

    appts = conn.execute("SELECT appt_date FROM appointments").fetchall()
    for a in appts:
        for bucket in buckets:
            if bucket["start"] <= a["appt_date"] <= bucket["end"]:
                bucket["appointments"] += 1
                break

    return buckets


class HospitalHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        # Keep console output clean and readable
        sys.stdout.write(f"[{self.log_date_time_string()}] {format % args}\n")

    def send_json(self, data, status=200):
        body = json.dumps(data).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def read_json_body(self):
        length = int(self.headers.get("Content-Length", 0))
        if length == 0:
            return {}
        raw = self.rfile.read(length)
        return json.loads(raw.decode("utf-8"))

    def serve_static(self, rel_path):
        if rel_path in ("", "/"):
            rel_path = "/index.html"
        rel_path = rel_path.lstrip("/")
        full_path = os.path.normpath(os.path.join(STATIC_DIR, rel_path))
        if not full_path.startswith(STATIC_DIR) or not os.path.isfile(full_path):
            self.send_error(404, "File not found")
            return

        mime, _ = mimetypes.guess_type(full_path)
        if full_path.endswith(".js"):
            mime = "application/javascript; charset=utf-8"
        elif full_path.endswith(".css"):
            mime = "text/css; charset=utf-8"
        elif full_path.endswith(".svg"):
            mime = "image/svg+xml"

        with open(full_path, "rb") as f:
            data = f.read()
        self.send_response(200)
        self.send_header("Content-Type", mime or "application/octet-stream")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    # ------------------------------------------------------------------
    # GET routes
    # ------------------------------------------------------------------
    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path
        qs = parse_qs(parsed.query)

        if not path.startswith("/api/"):
            return self.serve_static(path)

        conn = hospital.get_connection()
        try:
            if path == "/api/overview":
                return self.handle_overview(conn)
            if path == "/api/patients":
                return self.send_json(rows_to_dicts(hospital.get_patient_records(conn)))

            m = re.fullmatch(r"/api/patients/(\d+)/profile", path)
            if m:
                return self.handle_patient_profile(conn, int(m.group(1)))

            m = re.fullmatch(r"/api/patients/(\d+)/history", path)
            if m:
                return self.handle_patient_history(conn, int(m.group(1)))

            if path == "/api/doctors":
                rows = conn.execute(
                    """
                    SELECT d.doctor_id, d.doctor_name, d.specialization,
                           dep.dept_id, dep.dept_name,
                           COUNT(a.appt_id) AS total_appointments,
                           SUM(CASE WHEN a.status = 'completed' THEN 1 ELSE 0 END) AS completed_appointments,
                           SUM(CASE WHEN a.status = 'scheduled' THEN 1 ELSE 0 END) AS scheduled_appointments
                    FROM doctors d
                    JOIN departments dep ON dep.dept_id = d.dept_id
                    LEFT JOIN appointments a ON a.doctor_id = d.doctor_id
                    GROUP BY d.doctor_id
                    ORDER BY total_appointments DESC, d.doctor_id
                    """
                ).fetchall()
                return self.send_json(rows_to_dicts(rows))

            if path == "/api/departments":
                rows = conn.execute(
                    """
                    SELECT dep.*, COUNT(d.doctor_id) AS doctor_count
                    FROM departments dep
                    LEFT JOIN doctors d ON d.dept_id = dep.dept_id
                    GROUP BY dep.dept_id
                    ORDER BY dep.dept_id
                    """
                ).fetchall()
                return self.send_json(rows_to_dicts(rows))

            if path == "/api/appointments":
                return self.handle_appointments(conn)

            if path == "/api/bills":
                return self.handle_bills(conn)

            if path == "/api/analytics":
                return self.handle_analytics(conn)

            if path == "/api/search":
                q = (qs.get("q", [""])[0]).strip()
                return self.handle_search(conn, q)

            if path == "/api/database":
                return self.handle_database_info(conn)

            if path == "/api/database/table":
                name = (qs.get("name", [""])[0]).strip()
                return self.handle_database_table(conn, name)

            self.send_json({"error": "Endpoint not found"}, 404)
        except Exception as exc:
            self.send_json({"error": str(exc)}, 500)
        finally:
            conn.close()

    # ------------------------------------------------------------------
    # POST routes
    # ------------------------------------------------------------------
    def do_POST(self):
        parsed = urlparse(self.path)
        path = parsed.path

        conn = hospital.get_connection()
        try:
            body = self.read_json_body()

            if path == "/api/patients":
                for field in ("full_name", "dob", "gender"):
                    if not (body.get(field) or "").strip():
                        return self.send_json({"error": f"{field} is required."}, 400)
                pid = hospital.register_patient(
                    conn,
                    body["full_name"],
                    body["dob"],
                    body["gender"],
                    body.get("phone", ""),
                    body.get("email"),
                )
                return self.send_json({"patient_id": pid}, 201)

            if path == "/api/appointments":
                pid = int(body["patient_id"])
                did = int(body["doctor_id"])
                adate = (body.get("appt_date") or "").strip()
                if not adate:
                    return self.send_json({"error": "appt_date is required."}, 400)
                aid = hospital.book_appointment(conn, pid, did, adate)
                return self.send_json({"appt_id": aid}, 201)

            m = re.fullmatch(r"/api/appointments/(\d+)/(complete|cancel)", path)
            if m:
                aid = int(m.group(1))
                action = m.group(2)
                new_status = "completed" if action == "complete" else "cancelled"
                updated = hospital.update_appointment_status(conn, aid, new_status)
                if not updated:
                    return self.send_json({"error": "Appointment not found."}, 404)
                return self.send_json({"appt_id": aid, "status": new_status})

            if path == "/api/records":
                aid = int(body["appt_id"])
                cond = (body.get("condition") or "").strip()
                if not cond:
                    return self.send_json({"error": "Diagnosis condition is required."}, 400)
                hospital.save_medical_record(
                    conn,
                    aid,
                    cond,
                    body.get("medicines", []),
                    body.get("tests", []),
                    body.get("record_date"),
                )
                return self.send_json({"status": "saved", "appt_id": aid}, 201)

            if path == "/api/bills":
                aid = int(body["appt_id"])
                paid = float(body.get("paid_amount", 0) or 0)
                bdate = (body.get("bill_date") or "").strip() or None
                bid, amount = hospital.create_bill(conn, aid, paid, bdate)
                return self.send_json({"bill_id": bid, "amount": amount}, 201)

            m = re.fullmatch(r"/api/bills/(\d+)/pay", path)
            if m:
                bid = int(m.group(1))
                amount = float(body.get("payment_amount", 0))
                new_paid = hospital.pay_bill(conn, bid, amount)
                return self.send_json({"bill_id": bid, "paid_amount": new_paid})

            if path == "/api/database/query":
                sql_text = (body.get("sql") or "").strip()
                return self.handle_readonly_query(conn, sql_text)

            self.send_json({"error": "Endpoint not found"}, 404)
        except (sqlite3.IntegrityError, ValueError) as exc:
            self.send_json({"error": str(exc)}, 400)
        except Exception as exc:
            self.send_json({"error": str(exc)}, 500)
        finally:
            conn.close()

    # ------------------------------------------------------------------
    # Handlers
    # ------------------------------------------------------------------
    def handle_overview(self, conn):
        counts = conn.execute(
            """
            SELECT
                (SELECT COUNT(*) FROM patients) AS patients,
                (SELECT COUNT(*) FROM doctors) AS doctors,
                (SELECT COUNT(*) FROM departments) AS departments,
                (SELECT COUNT(*) FROM appointments) AS total_appointments,
                (SELECT COUNT(*) FROM appointments WHERE status = 'scheduled') AS scheduled,
                (SELECT COUNT(*) FROM appointments WHERE status = 'completed') AS completed,
                (SELECT COUNT(*) FROM appointments WHERE status = 'cancelled') AS cancelled
            """
        ).fetchone()

        fin = conn.execute(
            """
            SELECT
                COUNT(*) AS bill_count,
                COALESCE(SUM(amount), 0) AS total_billed,
                COALESCE(SUM(paid_amount), 0) AS total_collected,
                COALESCE(SUM(amount - paid_amount), 0) AS outstanding
            FROM bills
            """
        ).fetchone()

        upcoming = conn.execute(
            """
            SELECT a.appt_id, a.appt_date, a.status,
                   p.patient_id, p.full_name AS patient_name,
                   d.doctor_name, dep.dept_name
            FROM appointments a
            JOIN patients p ON p.patient_id = a.patient_id
            JOIN doctors d ON d.doctor_id = a.doctor_id
            JOIN departments dep ON dep.dept_id = d.dept_id
            WHERE a.status = 'scheduled'
            ORDER BY a.appt_date ASC
            LIMIT 5
            """
        ).fetchall()

        top_doctors = conn.execute(
            """
            SELECT d.doctor_id, d.doctor_name, d.specialization, dep.dept_name,
                   COUNT(a.appt_id) AS visits
            FROM doctors d
            JOIN departments dep ON dep.dept_id = d.dept_id
            LEFT JOIN appointments a ON a.doctor_id = d.doctor_id
            GROUP BY d.doctor_id
            ORDER BY visits DESC, d.doctor_id ASC
            LIMIT 5
            """
        ).fetchall()

        self.send_json({
            "counts": dict(counts),
            "finance": dict(fin),
            "weekly": build_weekly_series(conn, 8),
            "upcoming": rows_to_dicts(upcoming),
            "top_doctors": rows_to_dicts(top_doctors),
        })

    def handle_patient_profile(self, conn, patient_id):
        patient = conn.execute(
            "SELECT * FROM v_patient_records WHERE patient_id = ?",
            (patient_id,),
        ).fetchone()
        if not patient:
            return self.send_json({"error": "Patient not found"}, 404)

        billing = conn.execute(
            """
            SELECT
                COALESCE(SUM(b.amount), 0) AS total_billed,
                COALESCE(SUM(b.paid_amount), 0) AS total_paid,
                COALESCE(SUM(b.amount - b.paid_amount), 0) AS outstanding
            FROM bills b
            JOIN appointments a ON a.appt_id = b.appt_id
            WHERE a.patient_id = ?
            """,
            (patient_id,),
        ).fetchone()

        bills = conn.execute(
            """
            SELECT b.bill_id, b.appt_id, b.amount, b.paid_amount,
                   (b.amount - b.paid_amount) AS balance,
                   b.bill_date, d.doctor_name, dep.dept_name, m.condition
            FROM bills b
            JOIN appointments a ON a.appt_id = b.appt_id
            JOIN doctors d ON d.doctor_id = a.doctor_id
            JOIN departments dep ON dep.dept_id = d.dept_id
            LEFT JOIN medical_history m ON m.appt_id = a.appt_id
            WHERE a.patient_id = ?
            ORDER BY b.bill_date DESC, b.bill_id DESC
            """,
            (patient_id,),
        ).fetchall()

        self.send_json({
            "patient": dict(patient),
            "billing": dict(billing),
            "bills": rows_to_dicts(bills),
        })

    def handle_patient_history(self, conn, patient_id):
        rows = hospital.get_patient_history_rows(conn, patient_id)
        visits = {}
        order = []
        for r in rows:
            aid = r["appt_id"]
            if aid not in visits:
                visits[aid] = {
                    "appt_id": aid,
                    "appt_date": r["appt_date"],
                    "status": r["status"],
                    "doctor_name": r["doctor_name"],
                    "specialization": r["specialization"],
                    "dept_name": r["dept_name"],
                    "condition": r["condition"],
                    "medicines": [],
                    "tests": [],
                }
                order.append(aid)

            v = visits[aid]
            if r["medicine"]:
                med_key = (r["medicine"], r["dosage"], r["duration_days"])
                if not any((m["medicine"], m["dosage"], m["duration_days"]) == med_key for m in v["medicines"]):
                    v["medicines"].append({
                        "medicine": r["medicine"],
                        "dosage": r["dosage"],
                        "duration_days": r["duration_days"],
                    })
            if r["test_name"]:
                test_key = (r["test_name"], r["result"])
                if not any((t["test_name"], t["result"]) == test_key for t in v["tests"]):
                    v["tests"].append({
                        "test_name": r["test_name"],
                        "result": r["result"],
                    })

        # Return newest first for timeline display
        result = [visits[aid] for aid in reversed(order)]
        self.send_json(result)

    def handle_appointments(self, conn):
        rows = conn.execute(
            """
            SELECT a.appt_id, a.patient_id, a.doctor_id, a.appt_date, a.status,
                   p.full_name AS patient_name, p.phone AS patient_phone,
                   d.doctor_name, d.specialization, dep.dept_name,
                   m.condition,
                   (SELECT COUNT(*) FROM bills b WHERE b.appt_id = a.appt_id) AS bill_count
            FROM appointments a
            JOIN patients p ON p.patient_id = a.patient_id
            JOIN doctors d ON d.doctor_id = a.doctor_id
            JOIN departments dep ON dep.dept_id = d.dept_id
            LEFT JOIN medical_history m ON m.appt_id = a.appt_id
            ORDER BY a.appt_date DESC, a.appt_id DESC
            """
        ).fetchall()

        data = []
        for r in rows:
            item = dict(r)
            fee, reason = hospital.compute_fee(item["condition"] or "", item["dept_name"])
            item["fixed_fee"] = fee
            item["fee_reason"] = reason
            data.append(item)
        self.send_json(data)

    def handle_bills(self, conn):
        rows = conn.execute(
            """
            SELECT b.bill_id, b.appt_id, b.amount, b.paid_amount,
                   ROUND(b.amount - b.paid_amount, 2) AS balance,
                   b.bill_date,
                   p.patient_id, p.full_name AS patient_name,
                   d.doctor_name, dep.dept_name, m.condition
            FROM bills b
            JOIN appointments a ON a.appt_id = b.appt_id
            JOIN patients p ON p.patient_id = a.patient_id
            JOIN doctors d ON d.doctor_id = a.doctor_id
            JOIN departments dep ON dep.dept_id = d.dept_id
            LEFT JOIN medical_history m ON m.appt_id = a.appt_id
            ORDER BY b.bill_date DESC, b.bill_id DESC
            """
        ).fetchall()

        result = []
        for r in rows:
            item = dict(r)
            if item["balance"] <= 0:
                item["status"] = "Paid"
            elif item["paid_amount"] > 0:
                item["status"] = "Partial"
            else:
                item["status"] = "Unpaid"
            result.append(item)
        self.send_json(result)

    def handle_analytics(self, conn):
        revenue_by_dept = rows_to_dicts(hospital.get_revenue_analysis(conn))
        freq_depts = rows_to_dicts(hospital.get_frequent_departments(conn))
        freq_docs = rows_to_dicts(hospital.get_frequent_doctors(conn))

        fin = conn.execute(
            """
            SELECT COUNT(*) AS bill_count,
                   COALESCE(SUM(amount), 0) AS total_billed,
                   COALESCE(SUM(paid_amount), 0) AS total_collected,
                   COALESCE(SUM(amount - paid_amount), 0) AS outstanding,
                   COALESCE(AVG(amount), 0) AS avg_invoice
            FROM bills
            """
        ).fetchone()

        status_counts = conn.execute(
            """
            SELECT
                COUNT(*) AS total,
                SUM(CASE WHEN status = 'scheduled' THEN 1 ELSE 0 END) AS scheduled,
                SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed,
                SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled
            FROM appointments
            """
        ).fetchone()

        # Patient age groups and gender split
        patients = conn.execute("SELECT dob, gender FROM patients").fetchall()
        age_groups = {"0-17": 0, "18-35": 0, "36-59": 0, "60+": 0}
        genders = {"F": 0, "M": 0, "O": 0}
        ref_year = 2026
        for p in patients:
            g = p["gender"]
            if g in genders:
                genders[g] += 1
            try:
                birth_year = int(p["dob"][:4])
                age = ref_year - birth_year
                if age <= 17:
                    age_groups["0-17"] += 1
                elif age <= 35:
                    age_groups["18-35"] += 1
                elif age <= 59:
                    age_groups["36-59"] += 1
                else:
                    age_groups["60+"] += 1
            except ValueError:
                pass

        self.send_json({
            "finance": dict(fin),
            "status_counts": dict(status_counts),
            "weekly": build_weekly_series(conn, 8),
            "revenue_by_dept": revenue_by_dept,
            "frequent_departments": freq_depts,
            "frequent_doctors": freq_docs,
            "age_groups": age_groups,
            "genders": genders,
        })

    def handle_search(self, conn, q):
        if not q:
            return self.send_json({"patients": [], "doctors": []})
        like = f"%{q}%"
        patients = conn.execute(
            """
            SELECT patient_id, full_name, phone, latest_condition
            FROM v_patient_records
            WHERE full_name LIKE ? OR COALESCE(latest_condition, '') LIKE ?
            LIMIT 6
            """,
            (like, like),
        ).fetchall()
        doctors = conn.execute(
            """
            SELECT d.doctor_id, d.doctor_name, d.specialization, dep.dept_name
            FROM doctors d
            JOIN departments dep ON dep.dept_id = d.dept_id
            WHERE d.doctor_name LIKE ? OR d.specialization LIKE ? OR dep.dept_name LIKE ?
            LIMIT 6
            """,
            (like, like, like),
        ).fetchall()
        self.send_json({
            "patients": rows_to_dicts(patients),
            "doctors": rows_to_dicts(doctors),
        })

    def handle_database_info(self, conn):
        objects = conn.execute(
            """
            SELECT type, name, sql
            FROM sqlite_master
            WHERE name NOT LIKE 'sqlite_%'
            ORDER BY CASE type WHEN 'table' THEN 1 WHEN 'view' THEN 2 ELSE 3 END, name
            """
        ).fetchall()

        tables = []
        views = []
        indexes = []
        for obj in objects:
            if obj["type"] == "table":
                cnt = conn.execute(f'SELECT COUNT(*) FROM "{obj["name"]}"').fetchone()[0]
                tables.append({"name": obj["name"], "rows": cnt, "sql": obj["sql"]})
            elif obj["type"] == "view":
                cnt = conn.execute(f'SELECT COUNT(*) FROM "{obj["name"]}"').fetchone()[0]
                views.append({"name": obj["name"], "rows": cnt, "sql": obj["sql"]})
            elif obj["type"] == "index" and obj["sql"]:
                indexes.append({"name": obj["name"], "sql": obj["sql"]})

        with open(hospital.SCHEMA_PATH, "r", encoding="utf-8") as f:
            schema_sql = f.read()
        with open(hospital.QUERIES_PATH, "r", encoding="utf-8") as f:
            queries_sql = f.read()

        fk_check = rows_to_dicts(conn.execute("PRAGMA foreign_key_check").fetchall())
        explain = rows_to_dicts(hospital.get_explain_patient_lookup(conn, 1))

        self.send_json({
            "tables": tables,
            "views": views,
            "indexes": indexes,
            "schema_sql": schema_sql,
            "queries_sql": queries_sql,
            "named_queries": hospital.QUERIES,
            "fk_violations": len(fk_check),
            "explain_plan": explain,
        })

    def handle_database_table(self, conn, name):
        allowed = {
            r["name"]
            for r in conn.execute(
                "SELECT name FROM sqlite_master WHERE type IN ('table', 'view') AND name NOT LIKE 'sqlite_%'"
            ).fetchall()
        }
        if name not in allowed:
            return self.send_json({"error": "Invalid table or view name."}, 400)

        cur = conn.execute(f'SELECT * FROM "{name}" LIMIT 100')
        cols = [d[0] for d in cur.description]
        rows = [dict(r) for r in cur.fetchall()]
        self.send_json({"name": name, "columns": cols, "rows": rows})

    def handle_readonly_query(self, conn, sql_text):
        if not sql_text:
            return self.send_json({"error": "SQL query cannot be empty."}, 400)

        # Allow read-only inspection queries in the Database SQL viewer
        first_word = sql_text.lstrip().split()[0].upper()
        if first_word not in ("SELECT", "EXPLAIN", "PRAGMA", "WITH"):
            return self.send_json(
                {"error": "Only read-only SELECT, WITH, EXPLAIN, or PRAGMA queries are allowed here."},
                400,
            )

        # Strip optional trailing semicolon and block multiple statements
        cleaned = sql_text.rstrip().rstrip(";")
        if ";" in cleaned:
            return self.send_json({"error": "Run one SQL statement at a time."}, 400)

        try:
            cur = conn.execute(cleaned)
            cols = [d[0] for d in cur.description] if cur.description else []
            rows = [dict(r) for r in cur.fetchall()]
            self.send_json({"columns": cols, "rows": rows})
        except sqlite3.Error as exc:
            self.send_json({"error": f"SQLite error: {exc}"}, 400)


def main():
    hospital.init_db(seed=True)
    host = "127.0.0.1"
    port = int(os.environ.get("PORT", "8000"))
    server = ThreadingHTTPServer((host, port), HospitalHandler)
    print(f"MediCare Hospital System running at http://{host}:{port}")
    print("Press Ctrl+C to stop the server.")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped.")
        server.server_close()


if __name__ == "__main__":
    main()
