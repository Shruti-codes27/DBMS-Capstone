"""
Automated unit tests for Hospital & Healthcare Information Management System.
Each test uses a fresh temporary SQLite database file so runs are isolated.
"""

import os
import sqlite3
import tempfile
import unittest

import hospital


class TestHospitalDatabase(unittest.TestCase):
    def setUp(self):
        fd, self.db_path = tempfile.mkstemp(suffix=".db")
        os.close(fd)
        hospital.init_db(self.db_path, seed=True)
        self.conn = hospital.get_connection(self.db_path)

    def tearDown(self):
        self.conn.close()
        if os.path.exists(self.db_path):
            os.remove(self.db_path)

    # T-01
    def test_seed_counts(self):
        patients = self.conn.execute("SELECT COUNT(*) FROM patients").fetchone()[0]
        appts = self.conn.execute("SELECT COUNT(*) FROM appointments").fetchone()[0]
        self.assertEqual(patients, 4)
        self.assertEqual(appts, 11)

    # T-02
    def test_foreign_key_rejects_unknown_patient(self):
        with self.assertRaises(sqlite3.IntegrityError):
            self.conn.execute(
                "INSERT INTO appointments (patient_id, doctor_id, appt_date, status) "
                "VALUES (999, 1, '2026-11-20', 'scheduled')"
            )

    # T-03
    def test_check_rejects_invalid_gender(self):
        with self.assertRaises(sqlite3.IntegrityError):
            self.conn.execute(
                "INSERT INTO patients (full_name, dob, gender, phone, email) "
                "VALUES ('Test User', '1999-01-01', 'X', '99999-00000', 'test@example.com')"
            )

    # T-04
    def test_check_rejects_overpayment(self):
        with self.assertRaises(sqlite3.IntegrityError):
            self.conn.execute(
                "INSERT INTO bills (appt_id, amount, paid_amount, bill_date) "
                "VALUES (1, 1000.0, 1500.0, '2026-11-20')"
            )

    # T-05
    def test_no_orphan_rows(self):
        issues = self.conn.execute("PRAGMA foreign_key_check").fetchall()
        self.assertEqual(len(issues), 0)

    # T-06
    def test_patient_history_join(self):
        rows = hospital.get_patient_history_rows(self.conn, 1)
        conditions = {r["condition"] for r in rows}
        self.assertIn("Hypertension", conditions)
        self.assertIn("Vitamin D deficiency", conditions)

    # T-07
    def test_frequent_departments_subquery(self):
        rows = hospital.get_frequent_departments(self.conn)
        names = [r["dept_name"] for r in rows]
        self.assertEqual(names, ["Cardiology", "General Medicine"])

    # T-08
    def test_patient_records_view(self):
        rows = hospital.get_patient_records(self.conn)
        self.assertEqual(len(rows), 4)
        p2 = [r for r in rows if r["patient_id"] == 2][0]
        self.assertEqual(p2["last_visit"], "2026-10-18")

    # T-09
    def test_revenue_view_totals(self):
        rows = hospital.get_revenue_analysis(self.conn)
        billed = sum(r["total_billed"] for r in rows)
        collected = sum(r["total_collected"] for r in rows)
        outstanding = sum(r["outstanding"] for r in rows)
        self.assertEqual(billed, 16200.0)
        self.assertEqual(collected, 13900.0)
        self.assertEqual(outstanding, 2300.0)

    # T-10
    def test_patient_lookup_uses_index(self):
        plan = hospital.get_explain_patient_lookup(self.conn, 1)
        detail = " ".join(str(r["detail"]) for r in plan)
        self.assertIn("idx_appt_patient", detail)


if __name__ == "__main__":
    unittest.main()
