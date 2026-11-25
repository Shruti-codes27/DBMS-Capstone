"""
Hospital and Healthcare Information Management System
Database layer and console application (Python 3 + SQLite).

All DDL, seed data, and core analytical queries are stored in the sql/ folder
so the SQL code can be read and verified directly.
"""

import os
import sqlite3
import sys
from datetime import date

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SQL_DIR = os.path.join(BASE_DIR, "sql")
SCHEMA_PATH = os.path.join(SQL_DIR, "schema.sql")
SEED_PATH = os.path.join(SQL_DIR, "seed.sql")
QUERIES_PATH = os.path.join(SQL_DIR, "queries.sql")
DEFAULT_DB_PATH = os.path.join(BASE_DIR, "hospital.db")


def load_queries(path=QUERIES_PATH):
    """Read named SQL queries marked with '-- [name]' from sql/queries.sql."""
    queries = {}
    current_name = None
    lines = []

    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            stripped = line.strip()
            if stripped.startswith("-- [") and stripped.endswith("]"):
                if current_name is not None:
                    queries[current_name] = "".join(lines).strip()
                current_name = stripped[4:-1].strip()
                lines = []
            elif current_name is not None:
                lines.append(line)

    if current_name is not None:
        queries[current_name] = "".join(lines).strip()

    return queries


QUERIES = load_queries()

# Fixed fee rules mapped by diagnosis keywords (Section 6.6 of report)
DISEASE_FEE_RULES = [
    (("fracture", "bone", "sprain", "arthritis", "joint", "knee", "ortho"), 3500.0),
    (("pregnancy", "antenatal", "prenatal"), 3000.0),
    (("hypertension", "cardiac", "heart", "angina", "arrhythmia", "chest pain"), 2500.0),
    (("migraine", "epilepsy", "stroke", "neuro"), 2200.0),
    (("diabetes", "thyroid", "hormone", "obesity"), 1800.0),
    (("asthma", "copd", "pneumonia", "bronchitis", "respiratory"), 1600.0),
    (("dengue", "typhoid", "malaria"), 1500.0),
    (("gastritis", "ulcer", "stomach", "abdominal", "liver", "gastro"), 1400.0),
    (("skin", "dermatitis", "allergy", "rash"), 1000.0),
    (("fever", "infection", "viral", "flu", "cold", "cough"), 800.0),
]

DEPARTMENT_FALLBACK_FEES = {
    "Orthopedics": 3500.0,
    "Cardiology": 2500.0,
    "General Medicine": 800.0,
    "Pediatrics": 800.0,
}


def get_connection(db_path=DEFAULT_DB_PATH):
    """Open a SQLite connection with foreign key enforcement turned on."""
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn


def init_db(db_path=DEFAULT_DB_PATH, seed=True):
    """Create schema (tables, indexes, views) and load seed data if empty."""
    conn = get_connection(db_path)
    try:
        with open(SCHEMA_PATH, "r", encoding="utf-8") as f:
            conn.executescript(f.read())

        if seed:
            count = conn.execute("SELECT COUNT(*) FROM departments").fetchone()[0]
            if count == 0:
                with open(SEED_PATH, "r", encoding="utf-8") as f:
                    conn.executescript(f.read())
        conn.commit()
    finally:
        conn.close()


def compute_fee(condition, dept_name=""):
    """Calculate fixed consultation/treatment fee from diagnosis or department."""
    text = (condition or "").lower()
    for keywords, fee in DISEASE_FEE_RULES:
        for word in keywords:
            if word in text:
                return fee, f'Diagnosis "{condition}" — fee fixed as per disease.'

    if dept_name in DEPARTMENT_FALLBACK_FEES:
        fee = DEPARTMENT_FALLBACK_FEES[dept_name]
        return fee, f"Standard {dept_name} consultation fee."

    return 500.0, "Default consultation fee."


# ---------------------------------------------------------------------------
# Query / Report functions
# ---------------------------------------------------------------------------

def get_patient_history_rows(conn, patient_id):
    return conn.execute(QUERIES["patient_history"], (patient_id,)).fetchall()


def get_frequent_departments(conn):
    return conn.execute(QUERIES["frequent_departments"]).fetchall()


def get_frequent_doctors(conn):
    return conn.execute(QUERIES["frequent_doctors"]).fetchall()


def get_patient_records(conn):
    return conn.execute(QUERIES["patient_records_view"]).fetchall()


def get_revenue_analysis(conn):
    return conn.execute(QUERIES["revenue_analysis_view"]).fetchall()


def get_explain_patient_lookup(conn, patient_id=1):
    return conn.execute(QUERIES["explain_patient_lookup"], (patient_id,)).fetchall()


# ---------------------------------------------------------------------------
# Write operations (parameterised SQL)
# ---------------------------------------------------------------------------

def register_patient(conn, full_name, dob, gender, phone="", email=None):
    email_val = email.strip() if email and email.strip() else None
    cur = conn.execute(
        """
        INSERT INTO patients (full_name, dob, gender, phone, email)
        VALUES (?, ?, ?, ?, ?)
        """,
        (full_name.strip(), dob.strip(), gender.strip().upper(), phone.strip(), email_val),
    )
    conn.commit()
    return cur.lastrowid


def book_appointment(conn, patient_id, doctor_id, appt_date):
    cur = conn.execute(
        """
        INSERT INTO appointments (patient_id, doctor_id, appt_date, status)
        VALUES (?, ?, ?, 'scheduled')
        """,
        (patient_id, doctor_id, appt_date),
    )
    conn.commit()
    return cur.lastrowid


def update_appointment_status(conn, appt_id, status):
    cur = conn.execute(
        "UPDATE appointments SET status = ? WHERE appt_id = ?",
        (status, appt_id),
    )
    conn.commit()
    return cur.rowcount


def save_medical_record(conn, appt_id, condition, medicines=None, tests=None, record_date=None):
    """Save diagnosis, prescription (with items), and tests in one transaction."""
    today = record_date or date.today().isoformat()
    medicines = medicines or []
    tests = tests or []

    with conn:
        # Mark visit as completed when clinical notes are recorded
        conn.execute(
            "UPDATE appointments SET status = 'completed' WHERE appt_id = ?",
            (appt_id,),
        )

        # Upsert diagnosis
        existing_hist = conn.execute(
            "SELECT history_id FROM medical_history WHERE appt_id = ?",
            (appt_id,),
        ).fetchone()
        if existing_hist:
            conn.execute(
                "UPDATE medical_history SET condition = ?, diagnosed_on = ? WHERE appt_id = ?",
                (condition.strip(), today, appt_id),
            )
        else:
            conn.execute(
                "INSERT INTO medical_history (appt_id, condition, diagnosed_on) VALUES (?, ?, ?)",
                (appt_id, condition.strip(), today),
            )

        # Upsert prescription header and replace items if medicines provided
        existing_presc = conn.execute(
            "SELECT presc_id FROM prescriptions WHERE appt_id = ?",
            (appt_id,),
        ).fetchone()
        if existing_presc:
            presc_id = existing_presc["presc_id"]
            conn.execute("DELETE FROM prescription_items WHERE presc_id = ?", (presc_id,))
        else:
            cur = conn.execute(
                "INSERT INTO prescriptions (appt_id, issued_on) VALUES (?, ?)",
                (appt_id, today),
            )
            presc_id = cur.lastrowid

        for med in medicines:
            name = (med.get("medicine") or "").strip()
            dosage = (med.get("dosage") or "").strip()
            days = int(med.get("duration_days") or 1)
            if name and dosage:
                conn.execute(
                    """
                    INSERT INTO prescription_items (presc_id, medicine, dosage, duration_days)
                    VALUES (?, ?, ?, ?)
                    """,
                    (presc_id, name, dosage, days),
                )

        for t in tests:
            t_name = (t.get("test_name") or "").strip()
            t_res = (t.get("result") or "").strip()
            if t_name:
                conn.execute(
                    """
                    INSERT INTO diagnostic_tests (appt_id, test_name, result, tested_on)
                    VALUES (?, ?, ?, ?)
                    """,
                    (appt_id, t_name, t_res or "Pending", today),
                )


def get_appointment_fee(conn, appt_id):
    """Look up diagnosis and department for an appointment and return fixed fee."""
    row = conn.execute(
        """
        SELECT a.appt_id, a.status, dep.dept_name, m.condition
        FROM appointments a
        JOIN doctors d ON d.doctor_id = a.doctor_id
        JOIN departments dep ON dep.dept_id = d.dept_id
        LEFT JOIN medical_history m ON m.appt_id = a.appt_id
        WHERE a.appt_id = ?
        """,
        (appt_id,),
    ).fetchone()
    if not row:
        raise ValueError("Appointment not found.")

    fee, reason = compute_fee(row["condition"] or "", row["dept_name"])
    return {
        "appt_id": row["appt_id"],
        "status": row["status"],
        "dept_name": row["dept_name"],
        "condition": row["condition"] or "",
        "amount": fee,
        "reason": reason,
    }


def create_bill(conn, appt_id, paid_amount=0.0, bill_date=None):
    """Create a bill using server-computed fixed fee."""
    info = get_appointment_fee(conn, appt_id)
    if info["status"] != "completed":
        raise ValueError("Only completed appointments can be billed.")

    amount = info["amount"]
    paid = float(paid_amount or 0.0)
    if paid < 0 or paid > amount:
        raise ValueError(f"Paid amount must be between 0 and {amount:.2f}.")

    b_date = bill_date or date.today().isoformat()
    cur = conn.execute(
        """
        INSERT INTO bills (appt_id, amount, paid_amount, bill_date)
        VALUES (?, ?, ?, ?)
        """,
        (appt_id, amount, paid, b_date),
    )
    conn.commit()
    return cur.lastrowid, amount


def pay_bill(conn, bill_id, payment):
    """Add a payment to an existing bill without exceeding total amount."""
    payment = float(payment)
    if payment <= 0:
        raise ValueError("Payment must be greater than zero.")

    row = conn.execute(
        "SELECT amount, paid_amount FROM bills WHERE bill_id = ?",
        (bill_id,),
    ).fetchone()
    if not row:
        raise ValueError("Bill not found.")

    new_paid = round(row["paid_amount"] + payment, 2)
    if new_paid > row["amount"]:
        raise ValueError("Payment exceeds remaining balance.")

    conn.execute(
        "UPDATE bills SET paid_amount = ? WHERE bill_id = ?",
        (new_paid, bill_id),
    )
    conn.commit()
    return new_paid


# ---------------------------------------------------------------------------
# Console demonstration and interactive menu
# ---------------------------------------------------------------------------

def print_line(char="-", width=72):
    print(char * width)


def run_demo(db_path=DEFAULT_DB_PATH):
    """Run all queries and checks for demonstration."""
    init_db(db_path, seed=True)
    conn = get_connection(db_path)
    try:
        print_line("=")
        print("HOSPITAL & HEALTHCARE INFORMATION MANAGEMENT SYSTEM - SQL DEMO")
        print_line("=")

        # 1. Integrity check
        fk_issues = conn.execute("PRAGMA foreign_key_check").fetchall()
        print(f"PRAGMA foreign_key_check violations: {len(fk_issues)}")

        # 2. Record counts
        tables = [
            "departments", "doctors", "patients", "appointments",
            "medical_history", "prescriptions", "prescription_items",
            "diagnostic_tests", "bills",
        ]
        counts = [f"{t}: {conn.execute(f'SELECT COUNT(*) FROM {t}').fetchone()[0]}" for t in tables]
        print("Database counts -> " + ", ".join(counts))

        # 3. Multi-table JOIN for patient 1
        print("\n[1] Patient 1 Complete History (Multi-table JOIN)")
        print_line()
        rows = get_patient_history_rows(conn, 1)
        for r in rows:
            med = f"{r['medicine']} ({r['dosage']})" if r["medicine"] else "-"
            test = f"{r['test_name']} ({r['result']})" if r["test_name"] else "-"
            print(
                f"Appt #{r['appt_id']} | {r['appt_date']} | {r['doctor_name']} "
                f"({r['dept_name']}) | {r['condition']} | Med: {med} | Test: {test}"
            )

        # 4. Subqueries
        print("\n[2] Frequently Visited Departments (Above Average Subquery)")
        print_line()
        for r in get_frequent_departments(conn):
            print(f"- {r['dept_name']}: {r['visits']} visits")

        print("\n[3] Frequently Visited Doctors (Above Average Subquery)")
        print_line()
        for r in get_frequent_doctors(conn):
            print(f"- {r['doctor_name']} ({r['dept_name']}): {r['visits']} visits")

        # 5. Views
        print("\n[4] View: v_patient_records")
        print_line()
        for r in get_patient_records(conn):
            print(
                f"#{r['patient_id']} {r['full_name']} ({r['gender']}) | "
                f"Appts: {r['total_appointments']} | Last: {r['last_visit']} | "
                f"Latest: {r['latest_condition']}"
            )

        print("\n[5] View: v_revenue_analysis")
        print_line()
        tot_b = tot_c = tot_o = 0.0
        for r in get_revenue_analysis(conn):
            tot_b += r["total_billed"]
            tot_c += r["total_collected"]
            tot_o += r["outstanding"]
            print(
                f"{r['dept_name']:<18} | Bills: {r['bill_count']} | "
                f"Billed: {r['total_billed']:>8.2f} | Collected: {r['total_collected']:>8.2f} | "
                f"Outstanding: {r['outstanding']:>8.2f}"
            )
        print(f"{'TOTAL':<18} | {'':8} | Billed: {tot_b:>8.2f} | Collected: {tot_c:>8.2f} | Outstanding: {tot_o:>8.2f}")

        # 6. Query plan
        print("\n[6] Index Verification (EXPLAIN QUERY PLAN)")
        print_line()
        for r in get_explain_patient_lookup(conn, 1):
            print(dict(r))
    finally:
        conn.close()


def run_menu(db_path=DEFAULT_DB_PATH):
    """Simple interactive console menu for testing CRUD and SQL reports."""
    init_db(db_path, seed=True)
    conn = get_connection(db_path)

    while True:
        print("\n--- Hospital Management Console Menu ---")
        print("1. View all patients (v_patient_records)")
        print("2. Register new patient")
        print("3. Book appointment")
        print("4. View patient full medical history (JOIN)")
        print("5. Record diagnosis, prescription & test")
        print("6. Generate bill for completed appointment")
        print("7. View frequent departments & doctors (Subqueries)")
        print("8. View department revenue (v_revenue_analysis)")
        print("0. Exit")

        choice = input("Enter choice: ").strip()
        try:
            if choice == "1":
                for r in get_patient_records(conn):
                    print(dict(r))
            elif choice == "2":
                name = input("Full name: ")
                dob = input("DOB (YYYY-MM-DD): ")
                gender = input("Gender (M/F/O): ")
                phone = input("Phone: ")
                email = input("Email (optional): ")
                pid = register_patient(conn, name, dob, gender, phone, email)
                print(f"Patient registered with ID {pid}.")
            elif choice == "3":
                for d in conn.execute("SELECT doctor_id, doctor_name, specialization FROM doctors"):
                    print(dict(d))
                pid = int(input("Patient ID: "))
                did = int(input("Doctor ID: "))
                adate = input("Appointment Date (YYYY-MM-DD): ")
                aid = book_appointment(conn, pid, did, adate)
                print(f"Appointment #{aid} scheduled.")
            elif choice == "4":
                pid = int(input("Patient ID: "))
                rows = get_patient_history_rows(conn, pid)
                if not rows:
                    print("No visits found.")
                for r in rows:
                    print(dict(r))
            elif choice == "5":
                aid = int(input("Appointment ID: "))
                cond = input("Diagnosis / Condition: ")
                med = input("Medicine name (leave blank to skip): ").strip()
                meds = []
                if med:
                    dosage = input("Dosage (e.g. Once daily): ")
                    days = int(input("Duration (days): "))
                    meds.append({"medicine": med, "dosage": dosage, "duration_days": days})
                tname = input("Diagnostic test name (leave blank to skip): ").strip()
                tests = []
                if tname:
                    tres = input("Test result: ")
                    tests.append({"test_name": tname, "result": tres})
                save_medical_record(conn, aid, cond, meds, tests)
                print("Medical record saved.")
            elif choice == "6":
                aid = int(input("Completed Appointment ID: "))
                info = get_appointment_fee(conn, aid)
                print(f"Computed fee: INR {info['amount']:.2f} ({info['reason']})")
                paid = float(input("Paid amount (0 for unpaid): ") or 0)
                bid, amt = create_bill(conn, aid, paid)
                print(f"Bill #{bid} created for INR {amt:.2f}.")
            elif choice == "7":
                print("Frequent Departments:")
                for r in get_frequent_departments(conn):
                    print(dict(r))
                print("Frequent Doctors:")
                for r in get_frequent_doctors(conn):
                    print(dict(r))
            elif choice == "8":
                for r in get_revenue_analysis(conn):
                    print(dict(r))
            elif choice == "0":
                break
            else:
                print("Invalid option.")
        except Exception as err:
            print(f"Error: {err}")

    conn.close()


if __name__ == "__main__":
    if "--demo" in sys.argv:
        run_demo()
    else:
        run_menu()
