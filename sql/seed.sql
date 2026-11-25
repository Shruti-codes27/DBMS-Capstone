-- Sample seed data for demonstration and testing
-- Matches the counts and figures documented in the project report:
-- 4 departments, 5 doctors, 4 patients, 11 appointments,
-- 9 diagnoses, 9 prescriptions, 11 prescription items, 8 diagnostic tests, 9 bills.

INSERT INTO departments (dept_id, dept_name, location, phone) VALUES
(1, 'Cardiology',       'Block A, Floor 2', '011-4001-1001'),
(2, 'General Medicine', 'Block A, Floor 1', '011-4001-1002'),
(3, 'Orthopedics',      'Block B, Floor 2', '011-4001-1003'),
(4, 'Pediatrics',       'Block C, Floor 1', '011-4001-1004');

INSERT INTO doctors (doctor_id, doctor_name, specialization, dept_id) VALUES
(1, 'Dr. Meera Sharma', 'Cardiologist',       1),
(2, 'Dr. Arjun Rao',    'Cardiac Surgeon',    1),
(3, 'Dr. Suresh Patel', 'General Physician',  2),
(4, 'Dr. Kavita Iyer',  'Orthopedic Surgeon', 3),
(5, 'Dr. Anita Desai',  'Pediatrician',       4);

INSERT INTO patients (patient_id, full_name, dob, gender, phone, email) VALUES
(1, 'Vikram Malhotra', '1985-04-12', 'M', '98765-10001', 'vikram.m@example.com'),
(2, 'Sneha Kulkarni',  '1994-07-23', 'F', '98765-10002', 'sneha.k@example.com'),
(3, 'Rahul Verma',     '1980-11-05', 'M', '98765-10003', 'rahul.v@example.com'),
(4, 'Isha Nair',       '2016-02-19', 'F', '98765-10004', 'isha.n@example.com');

-- 11 appointments: 9 completed, 2 scheduled
INSERT INTO appointments (appt_id, patient_id, doctor_id, appt_date, status) VALUES
(1,  1, 1, '2026-10-01', 'completed'),
(2,  1, 3, '2026-10-20', 'completed'),
(3,  1, 1, '2026-11-05', 'completed'),
(4,  2, 2, '2026-10-08', 'completed'),
(5,  2, 4, '2026-10-18', 'completed'),
(6,  3, 3, '2026-09-25', 'completed'),
(7,  3, 3, '2026-10-30', 'completed'),
(8,  4, 5, '2026-10-12', 'completed'),
(9,  4, 5, '2026-11-08', 'completed'),
(10, 2, 1, '2026-11-24', 'scheduled'),
(11, 3, 2, '2026-11-26', 'scheduled');

-- 9 diagnoses (one per completed visit)
INSERT INTO medical_history (history_id, appt_id, condition, diagnosed_on) VALUES
(1, 1, 'Hypertension',           '2026-10-01'),
(2, 2, 'Vitamin D deficiency',   '2026-10-20'),
(3, 3, 'Hypertension follow-up', '2026-11-05'),
(4, 4, 'Arrhythmia evaluation',  '2026-10-08'),
(5, 5, 'Knee sprain',            '2026-10-18'),
(6, 6, 'Type 2 Diabetes',        '2026-09-25'),
(7, 7, 'Diabetes follow-up',     '2026-10-30'),
(8, 8, 'Seasonal viral fever',   '2026-10-12'),
(9, 9, 'Recovery check',         '2026-11-08');

-- 9 prescriptions (one per completed visit)
INSERT INTO prescriptions (presc_id, appt_id, issued_on) VALUES
(1, 1, '2026-10-01'),
(2, 2, '2026-10-20'),
(3, 3, '2026-11-05'),
(4, 4, '2026-10-08'),
(5, 5, '2026-10-18'),
(6, 6, '2026-09-25'),
(7, 7, '2026-10-30'),
(8, 8, '2026-10-12'),
(9, 9, '2026-11-08');

-- 11 prescription items (multiple medicines per prescription supported)
INSERT INTO prescription_items (item_id, presc_id, medicine, dosage, duration_days) VALUES
(1,  1, 'Amlodipine 5 mg',       'Once daily',   30),
(2,  1, 'Aspirin 75 mg',         'Once daily',   30),
(3,  2, 'Vitamin D3 60000 IU',   'Weekly',       56),
(4,  3, 'Amlodipine 10 mg',      'Once daily',   30),
(5,  4, 'Metoprolol 25 mg',      'Twice daily',  15),
(6,  5, 'Diclofenac Gel',        'Apply twice',  10),
(7,  5, 'Calcium 500 mg',        'Once daily',   14),
(8,  6, 'Metformin 500 mg',      'Twice daily',  30),
(9,  7, 'Metformin 500 mg',      'Once daily',   30),
(10, 8, 'Paracetamol 250 mg',    'As needed',     5),
(11, 9, 'Multivitamin Syrup',    'Once daily',   15);

-- 8 diagnostic tests
INSERT INTO diagnostic_tests (test_id, appt_id, test_name, result, tested_on) VALUES
(1, 1, 'ECG',            'Normal',     '2026-10-01'),
(2, 1, 'Lipid profile',  'Borderline', '2026-10-01'),
(3, 3, 'ECG',            'Normal',     '2026-11-05'),
(4, 4, 'Holter Monitor', 'Mild PACs',  '2026-10-08'),
(5, 5, 'Knee X-Ray',     'No fracture','2026-10-18'),
(6, 6, 'HbA1c',          '7.4%',       '2026-09-25'),
(7, 7, 'Fasting Sugar',  '118 mg/dL',  '2026-10-30'),
(8, 8, 'CBC',            'Normal',     '2026-10-12');

-- 9 bills (Total billed: 16200, Collected: 13900, Outstanding: 2300)
INSERT INTO bills (bill_id, appt_id, amount, paid_amount, bill_date) VALUES
(1, 1, 2500.00, 2500.00, '2026-10-01'),
(2, 2,  800.00,  800.00, '2026-10-20'),
(3, 3, 1800.00, 1800.00, '2026-11-05'),
(4, 4, 4500.00, 3000.00, '2026-10-08'),
(5, 5, 2200.00, 2200.00, '2026-10-18'),
(6, 6, 1500.00, 1500.00, '2026-09-25'),
(7, 7, 1200.00, 1200.00, '2026-10-30'),
(8, 8,  900.00,  900.00, '2026-10-12'),
(9, 9,  800.00,    0.00, '2026-11-08');
