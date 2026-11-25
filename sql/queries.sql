-- Named SQL Queries used across the console app, tests, and web API
-- Kept in a standalone .sql file so every query is easy to read and demonstrate.

-- [patient_history]
-- Multi-table JOIN to get complete medical history of a single patient
SELECT
    a.appt_id,
    a.appt_date,
    a.status,
    d.doctor_name,
    d.specialization,
    dep.dept_name,
    m.condition,
    pi.medicine,
    pi.dosage,
    pi.duration_days,
    t.test_name,
    t.result
FROM appointments a
JOIN doctors d            ON d.doctor_id = a.doctor_id
JOIN departments dep      ON dep.dept_id = d.dept_id
LEFT JOIN medical_history m      ON m.appt_id = a.appt_id
LEFT JOIN prescriptions p        ON p.appt_id = a.appt_id
LEFT JOIN prescription_items pi  ON pi.presc_id = p.presc_id
LEFT JOIN diagnostic_tests t     ON t.appt_id = a.appt_id
WHERE a.patient_id = ?
ORDER BY a.appt_date, a.appt_id;


-- [frequent_departments]
-- Subquery to find departments with visit count above the hospital average
SELECT
    dep.dept_id,
    dep.dept_name,
    COUNT(a.appt_id) AS visits
FROM departments dep
JOIN doctors d      ON d.dept_id = dep.dept_id
JOIN appointments a ON a.doctor_id = d.doctor_id
GROUP BY dep.dept_id
HAVING COUNT(a.appt_id) > (
    SELECT AVG(cnt)
    FROM (
        SELECT COUNT(a2.appt_id) AS cnt
        FROM departments dep2
        JOIN doctors d2      ON d2.dept_id = dep2.dept_id
        JOIN appointments a2 ON a2.doctor_id = d2.doctor_id
        GROUP BY dep2.dept_id
    )
)
ORDER BY visits DESC;


-- [frequent_doctors]
-- Subquery to find doctors whose appointment count is above the average
SELECT
    d.doctor_id,
    d.doctor_name,
    dep.dept_name,
    COUNT(a.appt_id) AS visits
FROM doctors d
JOIN departments dep ON dep.dept_id = d.dept_id
JOIN appointments a  ON a.doctor_id = d.doctor_id
GROUP BY d.doctor_id
HAVING COUNT(a.appt_id) > (
    SELECT AVG(cnt)
    FROM (
        SELECT COUNT(a2.appt_id) AS cnt
        FROM doctors d2
        JOIN appointments a2 ON a2.doctor_id = d2.doctor_id
        GROUP BY d2.doctor_id
    )
)
ORDER BY visits DESC;


-- [patient_records_view]
SELECT * FROM v_patient_records ORDER BY patient_id;


-- [revenue_analysis_view]
SELECT * FROM v_revenue_analysis ORDER BY total_billed DESC;


-- [explain_patient_lookup]
EXPLAIN QUERY PLAN
SELECT appt_id, appt_date, status
FROM appointments
WHERE patient_id = ?;
