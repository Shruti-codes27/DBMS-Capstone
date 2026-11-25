-- Hospital and Healthcare Information Management System
-- Database Schema: Tables, Constraints, Indexes, and Views (3NF)

PRAGMA foreign_keys = ON;

-- 1. Master table for hospital departments
CREATE TABLE IF NOT EXISTS departments (
    dept_id     INTEGER PRIMARY KEY AUTOINCREMENT,
    dept_name   TEXT NOT NULL UNIQUE,
    location    TEXT NOT NULL,
    phone       TEXT
);

-- 2. Master table for doctors (each belongs to one department)
CREATE TABLE IF NOT EXISTS doctors (
    doctor_id       INTEGER PRIMARY KEY AUTOINCREMENT,
    doctor_name     TEXT NOT NULL,
    specialization  TEXT NOT NULL,
    dept_id         INTEGER NOT NULL REFERENCES departments(dept_id) ON DELETE RESTRICT
);

-- 3. Master table for patients
CREATE TABLE IF NOT EXISTS patients (
    patient_id  INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name   TEXT NOT NULL,
    dob         TEXT NOT NULL,
    gender      TEXT NOT NULL CHECK (gender IN ('M', 'F', 'O')),
    phone       TEXT,
    email       TEXT UNIQUE
);

-- 4. Appointments linking patients and doctors
CREATE TABLE IF NOT EXISTS appointments (
    appt_id     INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id  INTEGER NOT NULL REFERENCES patients(patient_id) ON DELETE RESTRICT,
    doctor_id   INTEGER NOT NULL REFERENCES doctors(doctor_id) ON DELETE RESTRICT,
    appt_date   TEXT NOT NULL,
    status      TEXT NOT NULL DEFAULT 'scheduled'
                CHECK (status IN ('scheduled', 'completed', 'cancelled'))
);

-- 5. Diagnosis record for a visit (1:1 with appointments)
CREATE TABLE IF NOT EXISTS medical_history (
    history_id    INTEGER PRIMARY KEY AUTOINCREMENT,
    appt_id       INTEGER NOT NULL UNIQUE REFERENCES appointments(appt_id) ON DELETE RESTRICT,
    condition     TEXT NOT NULL,
    diagnosed_on  TEXT NOT NULL
);

-- 6. Prescription header for a visit (1:1 with appointments)
CREATE TABLE IF NOT EXISTS prescriptions (
    presc_id    INTEGER PRIMARY KEY AUTOINCREMENT,
    appt_id     INTEGER NOT NULL UNIQUE REFERENCES appointments(appt_id) ON DELETE RESTRICT,
    issued_on   TEXT NOT NULL
);

-- 7. Individual medicines in a prescription (1:N with prescriptions)
CREATE TABLE IF NOT EXISTS prescription_items (
    item_id        INTEGER PRIMARY KEY AUTOINCREMENT,
    presc_id       INTEGER NOT NULL REFERENCES prescriptions(presc_id) ON DELETE CASCADE,
    medicine       TEXT NOT NULL,
    dosage         TEXT NOT NULL,
    duration_days  INTEGER NOT NULL CHECK (duration_days > 0)
);

-- 8. Diagnostic tests ordered during a visit (1:N with appointments)
CREATE TABLE IF NOT EXISTS diagnostic_tests (
    test_id     INTEGER PRIMARY KEY AUTOINCREMENT,
    appt_id     INTEGER NOT NULL REFERENCES appointments(appt_id) ON DELETE RESTRICT,
    test_name   TEXT NOT NULL,
    result      TEXT,
    tested_on   TEXT NOT NULL
);

-- 9. Billing and payment details for a visit (1:N with appointments)
CREATE TABLE IF NOT EXISTS bills (
    bill_id      INTEGER PRIMARY KEY AUTOINCREMENT,
    appt_id      INTEGER NOT NULL REFERENCES appointments(appt_id) ON DELETE RESTRICT,
    amount       REAL NOT NULL CHECK (amount >= 0),
    paid_amount  REAL NOT NULL DEFAULT 0 CHECK (paid_amount >= 0 AND paid_amount <= amount),
    bill_date    TEXT NOT NULL
);


-- Indexes on foreign keys and frequently searched columns
CREATE INDEX IF NOT EXISTS idx_doctors_dept   ON doctors(dept_id);
CREATE INDEX IF NOT EXISTS idx_appt_patient   ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appt_doctor    ON appointments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_appt_date      ON appointments(appt_date);
CREATE INDEX IF NOT EXISTS idx_items_presc    ON prescription_items(presc_id);
CREATE INDEX IF NOT EXISTS idx_tests_appt     ON diagnostic_tests(appt_id);
CREATE INDEX IF NOT EXISTS idx_bills_appt     ON bills(appt_id);
CREATE INDEX IF NOT EXISTS idx_patients_name  ON patients(full_name);


-- View 1: Patient directory summary with appointment count, last completed visit, and latest condition
CREATE VIEW IF NOT EXISTS v_patient_records AS
SELECT
    p.patient_id,
    p.full_name,
    p.gender,
    p.dob,
    p.phone,
    p.email,
    COUNT(a.appt_id) AS total_appointments,
    MAX(CASE WHEN a.status = 'completed' THEN a.appt_date END) AS last_visit,
    (
        SELECT m.condition
        FROM medical_history m
        JOIN appointments a2 ON a2.appt_id = m.appt_id
        WHERE a2.patient_id = p.patient_id
        ORDER BY m.diagnosed_on DESC, m.history_id DESC
        LIMIT 1
    ) AS latest_condition
FROM patients p
LEFT JOIN appointments a ON a.patient_id = p.patient_id
GROUP BY p.patient_id;


-- View 2: Department-wise revenue, collections, and outstanding dues
CREATE VIEW IF NOT EXISTS v_revenue_analysis AS
SELECT
    d.dept_id,
    d.dept_name,
    COUNT(b.bill_id) AS bill_count,
    ROUND(COALESCE(SUM(b.amount), 0), 2) AS total_billed,
    ROUND(COALESCE(SUM(b.paid_amount), 0), 2) AS total_collected,
    ROUND(COALESCE(SUM(b.amount - b.paid_amount), 0), 2) AS outstanding
FROM departments d
JOIN doctors dr ON dr.dept_id = d.dept_id
JOIN appointments a ON a.doctor_id = dr.doctor_id
JOIN bills b ON b.appt_id = a.appt_id
GROUP BY d.dept_id;
