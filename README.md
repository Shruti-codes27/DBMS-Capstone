# Hospital & Healthcare Information Management System

**DBMS Mini / Capstone Project**  
Prepared by: Shruti Rajour (2501630022), Shivangi (2501630013)

## Project Structure

- `sql/schema.sql` — DDL for all 9 normalized tables (3NF), constraints, 8 indexes, and 2 views (`v_patient_records`, `v_revenue_analysis`)
- `sql/seed.sql` — Sample hospital data (4 departments, 5 doctors, 4 patients, 11 appointments, 9 diagnoses, 9 prescriptions, 11 prescription items, 8 diagnostic tests, 9 bills)
- `sql/queries.sql` — Named SQL queries used by the application (multi-table JOIN, above-average subqueries, views, and `EXPLAIN QUERY PLAN`)
- `hospital.py` — SQLite database layer, business rules (fixed diagnosis-based fees), `--demo` report mode, and interactive console menu
- `test_hospital.py` — 10 automated `unittest` cases validating constraints, joins, subqueries, views, and index usage
- `make_er_diagram.py` — Generates `hospital_er.svg` ER diagram
- `webapp/server.py` — Python standard-library HTTP server + JSON API
- `webapp/static/` — Vanilla HTML/CSS/JS single-page application

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
