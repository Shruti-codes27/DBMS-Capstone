# Hospital & Healthcare Information Management System

Deploy Link : https://hospital-management-system-drab-two.vercel.app
## Project Structure

- `sql/schema.sql` — DDL for all 9 normalized tables (3NF), constraints, 8 indexes, and 2 views (`v_patient_records`, `v_revenue_analysis`)
- `sql/seed.sql` — Sample hospital data (4 departments, 5 doctors, 4 patients, 11 appointments, 9 diagnoses, 9 prescriptions, 11 prescription items, 8 diagnostic tests, 9 bills)
- `sql/queries.sql` — Named SQL queries used by the application (multi-table JOIN, above-average subqueries, views, and `EXPLAIN QUERY PLAN`)
- `hospital.py` — SQLite database layer, business rules (fixed diagnosis-based fees), `--demo` report mode, and interactive console menu
- `test_hospital.py` — 10 automated `unittest` cases validating constraints, joins, subqueries, views, and index usage
- `make_er_diagram.py` — Generates `hospital_er.svg` ER diagram
- `webapp/server.py` — Python standard-library HTTP server + JSON API
- `webapp/static/` — Vanilla HTML/CSS/JS single-page application

<img width="752" height="321" alt="image" src="https://github.com/user-attachments/assets/18c42f50-0b24-4dfc-ba32-87b2017ca159" />
<img width="752" height="298" alt="image" src="https://github.com/user-attachments/assets/0fde0b36-cfdc-48c8-9206-a0d90aab1fc8" />
<img width="751" height="325" alt="image" src="https://github.com/user-attachments/assets/07f0776d-65e5-4e83-b6e1-3a1bba5df590" />
<img width="751" height="299" alt="image" src="https://github.com/user-attachments/assets/3ce861bf-1cdc-4df5-97e7-adab9b75e010" />
<img width="751" height="317" alt="image" src="https://github.com/user-attachments/assets/31dfd777-dc88-44ff-9796-908b922fdb01" />
<img width="751" height="325" alt="image" src="https://github.com/user-attachments/assets/efb9541c-d09c-4dd5-bcb2-7ccdbf62cdc9" />
<img width="751" height="297" alt="image" src="https://github.com/user-attachments/assets/2c876115-40a0-48d8-8754-ce83e1eeed90" />

## How to Run

1. **Run the automated tests:**
   ```bash
   python -m unittest -v test_hospital.py
   ```
2. **Run the SQL demonstration in terminal:**
   ```bash
   python hospital.py --demo
   ```
3. **Run the interactive console menu:**
   ```bash
   python hospital.py
   ```
4. **Start the web application:**
   ```bash
   python webapp/server.py
   ```
   Then open `http://127.0.0.1:8000` (or double-click `Start Website.bat` on Windows).  
   Open the **Database & SQL** tab in the sidebar to inspect all tables, views, DDL, and run SQL queries live.
