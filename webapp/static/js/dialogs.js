// Modal dialogs for registering patients, booking appointments, medical records, and billing

import { api } from "./api.js";
import { escapeHtml, formatDate, formatINR, showToast } from "./ui.js";

function openModal(title, subtitle, bodyHtml, onMount) {
  const root = document.getElementById("modal-root");
  root.innerHTML = `
    <div class="modal-card">
      <div class="modal-header">
        <div>
          <h3 class="modal-title">${escapeHtml(title)}</h3>
          ${subtitle ? `<div class="muted" style="font-size:12px;">${escapeHtml(subtitle)}</div>` : ""}
        </div>
        <button class="modal-close" type="button" id="modal-close-btn">✕</button>
      </div>
      <div>${bodyHtml}</div>
    </div>
  `;
  root.classList.remove("hidden");

  const close = () => {
    root.classList.add("hidden");
    root.innerHTML = "";
  };
  document.getElementById("modal-close-btn").onclick = close;
  root.onclick = (e) => {
    if (e.target === root) close();
  };
  if (onMount) onMount(close);
}

export function openRegisterPatientModal(onDone) {
  openModal(
    "Register patient",
    "Add a new patient record to the patients table",
    `
    <form id="patient-form">
      <div class="form-field">
        <label>Full name *</label>
        <input class="input" name="full_name" required placeholder="e.g. Aarav Singh" />
      </div>
      <div class="form-grid">
        <div class="form-field">
          <label>Date of birth *</label>
          <input class="input" type="date" name="dob" required />
        </div>
        <div class="form-field">
          <label>Gender *</label>
          <select class="select" name="gender" required>
            <option value="M">Male (M)</option>
            <option value="F">Female (F)</option>
            <option value="O">Other (O)</option>
          </select>
        </div>
      </div>
      <div class="form-grid">
        <div class="form-field">
          <label>Phone</label>
          <input class="input" name="phone" placeholder="98765-00000" />
        </div>
        <div class="form-field">
          <label>Email</label>
          <input class="input" type="email" name="email" placeholder="patient@example.com" />
        </div>
      </div>
      <div class="modal-actions">
        <button class="btn" type="button" id="cancel-btn">Cancel</button>
        <button class="btn btn-primary" type="submit">Save patient</button>
      </div>
    </form>
    `,
    (close) => {
      document.getElementById("cancel-btn").onclick = close;
      document.getElementById("patient-form").onsubmit = async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        try {
          await api.post("/api/patients", Object.fromEntries(fd.entries()));
          showToast("Patient registered successfully.");
          close();
          if (onDone) onDone();
        } catch (err) {
          showToast(err.message, true);
        }
      };
    }
  );
}

export async function openBookAppointmentModal(onDone, presetPatientId = null) {
  const [patients, doctors] = await Promise.all([
    api.get("/api/patients"),
    api.get("/api/doctors"),
  ]);

  openModal(
    "New appointment",
    "Schedule a visit linking patient and doctor",
    `
    <form id="appt-form">
      <div class="form-field">
        <label>Patient *</label>
        <select class="select" name="patient_id" required>
          ${patients
            .map(
              (p) =>
                `<option value="${p.patient_id}" ${
                  Number(presetPatientId) === p.patient_id ? "selected" : ""
                }>#${p.patient_id} · ${escapeHtml(p.full_name)}</option>`
            )
            .join("")}
        </select>
      </div>
      <div class="form-field">
        <label>Doctor *</label>
        <select class="select" name="doctor_id" required>
          ${doctors
            .map(
              (d) =>
                `<option value="${d.doctor_id}">${escapeHtml(d.doctor_name)} · ${escapeHtml(
                  d.dept_name
                )}</option>`
            )
            .join("")}
        </select>
      </div>
      <div class="form-field">
        <label>Appointment date *</label>
        <input class="input" type="date" name="appt_date" value="2026-11-25" required />
      </div>
      <div class="modal-actions">
        <button class="btn" type="button" id="cancel-btn">Cancel</button>
        <button class="btn btn-primary" type="submit">Book appointment</button>
      </div>
    </form>
    `,
    (close) => {
      document.getElementById("cancel-btn").onclick = close;
      document.getElementById("appt-form").onsubmit = async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        try {
          await api.post("/api/appointments", Object.fromEntries(fd.entries()));
          showToast("Appointment booked.");
          close();
          if (onDone) onDone();
        } catch (err) {
          showToast(err.message, true);
        }
      };
    }
  );
}

export function openRecordClinicalModal(appt, onDone) {
  openModal(
    `Clinical record · Visit #${appt.appt_id}`,
    `${appt.patient_name} with ${appt.doctor_name} (${appt.dept_name})`,
    `
    <form id="record-form">
      <div class="form-field">
        <label>Diagnosis / Condition *</label>
        <input class="input" name="condition" value="${escapeHtml(appt.condition || "")}" required
               placeholder="e.g. Dengue fever, Hypertension, Knee sprain" />
      </div>
      <div class="form-grid">
        <div class="form-field">
          <label>Medicine 1</label>
          <input class="input" name="med1" placeholder="e.g. Paracetamol 500 mg" />
        </div>
        <div class="form-field">
          <label>Dosage &amp; Days</label>
          <div style="display:flex; gap:6px;">
            <input class="input" name="dosage1" placeholder="Twice daily" style="flex:1;" />
            <input class="input" type="number" min="1" name="days1" value="5" style="width:65px;" />
          </div>
        </div>
      </div>
      <div class="form-grid">
        <div class="form-field">
          <label>Diagnostic Test</label>
          <input class="input" name="test_name" placeholder="e.g. CBC / ECG" />
        </div>
        <div class="form-field">
          <label>Test Result</label>
          <input class="input" name="test_result" placeholder="e.g. Normal" />
        </div>
      </div>
      <div class="modal-actions">
        <button class="btn" type="button" id="cancel-btn">Cancel</button>
        <button class="btn btn-primary" type="submit">Save medical record</button>
      </div>
    </form>
    `,
    (close) => {
      document.getElementById("cancel-btn").onclick = close;
      document.getElementById("record-form").onsubmit = async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const medicines = [];
        if (fd.get("med1").trim()) {
          medicines.push({
            medicine: fd.get("med1").trim(),
            dosage: fd.get("dosage1").trim() || "Once daily",
            duration_days: Number(fd.get("days1") || 5),
          });
        }
        const tests = [];
        if (fd.get("test_name").trim()) {
          tests.push({
            test_name: fd.get("test_name").trim(),
            result: fd.get("test_result").trim() || "Pending",
          });
        }
        try {
          await api.post("/api/records", {
            appt_id: appt.appt_id,
            condition: fd.get("condition").trim(),
            medicines,
            tests,
            record_date: appt.appt_date,
          });
          showToast("Diagnosis, prescription & tests saved.");
          close();
          if (onDone) onDone();
        } catch (err) {
          showToast(err.message, true);
        }
      };
    }
  );
}

export async function openCreateInvoiceModal(onDone) {
  const appointments = await api.get("/api/appointments");
  const eligible = appointments.filter((a) => a.status === "completed" && a.bill_count === 0);

  if (eligible.length === 0) {
    openModal(
      "New invoice",
      "Raise a bill for a completed appointment",
      `<p class="muted">All completed appointments already have bills. Complete an appointment first to raise a new invoice.</p>
       <div class="modal-actions"><button class="btn btn-primary" id="ok-close">OK</button></div>`,
      (close) => {
        document.getElementById("ok-close").onclick = close;
      }
    );
    return;
  }

  openModal(
    "New invoice",
    "Raise a bill for a completed appointment",
    `
    <form id="bill-form">
      <div class="form-field">
        <label>Appointment</label>
        <select class="select" name="appt_id" id="bill-appt-select">
          ${eligible
            .map(
              (a) =>
                `<option value="${a.appt_id}">#${a.appt_id} · ${escapeHtml(a.patient_name)} · ${escapeHtml(
                  a.doctor_name
                )} · ${formatDate(a.appt_date)} · ${formatINR(a.fixed_fee)}</option>`
            )
            .join("")}
        </select>
        <div class="form-hint">Only completed visits without an invoice can be billed.</div>
      </div>

      <div class="form-grid">
        <div class="form-field">
          <label>Total amount (₹)</label>
          <input class="input" id="bill-amount-display" readonly />
          <div class="form-hint" id="bill-fee-reason"></div>
        </div>
        <div class="form-field">
          <label>Amount paid (₹)</label>
          <input class="input" type="number" min="0" step="1" name="paid_amount" id="bill-paid-input" value="0" />
          <div class="form-hint">Enter 0 to create an Unpaid invoice.</div>
        </div>
      </div>

      <div class="form-field">
        <label>Bill date</label>
        <input class="input" type="date" name="bill_date" value="2026-11-25" required />
      </div>

      <div class="modal-actions">
        <button class="btn" type="button" id="cancel-btn">Cancel</button>
        <button class="btn btn-primary" type="submit">Create invoice</button>
      </div>
    </form>
    `,
    (close) => {
      const sel = document.getElementById("bill-appt-select");
      const amtInput = document.getElementById("bill-amount-display");
      const reasonEl = document.getElementById("bill-fee-reason");
      const paidInput = document.getElementById("bill-paid-input");

      const updateFee = () => {
        const appt = eligible.find((a) => String(a.appt_id) === sel.value);
        if (appt) {
          amtInput.value = formatINR(appt.fixed_fee);
          reasonEl.textContent = appt.fee_reason;
          paidInput.max = appt.fixed_fee;
        }
      };
      sel.onchange = updateFee;
      updateFee();

      document.getElementById("cancel-btn").onclick = close;
      document.getElementById("bill-form").onsubmit = async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        try {
          await api.post("/api/bills", {
            appt_id: Number(fd.get("appt_id")),
            paid_amount: Number(fd.get("paid_amount") || 0),
            bill_date: fd.get("bill_date"),
          });
          showToast("Invoice created.");
          close();
          if (onDone) onDone();
        } catch (err) {
          showToast(err.message, true);
        }
      };
    }
  );
}

export function openPayModal(bill, onDone) {
  openModal(
    `Record payment · Invoice #${bill.bill_id}`,
    `${bill.patient_name} · Balance due: ${formatINR(bill.balance)}`,
    `
    <form id="pay-form">
      <div class="form-field">
        <label>Payment amount (₹)</label>
        <input class="input" type="number" min="1" max="${bill.balance}" step="1"
               name="payment_amount" value="${bill.balance}" required />
      </div>
      <div class="modal-actions">
        <button class="btn" type="button" id="cancel-btn">Cancel</button>
        <button class="btn btn-primary" type="submit">Confirm payment</button>
      </div>
    </form>
    `,
    (close) => {
      document.getElementById("cancel-btn").onclick = close;
      document.getElementById("pay-form").onsubmit = async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        try {
          await api.post(`/api/bills/${bill.bill_id}/pay`, {
            payment_amount: Number(fd.get("payment_amount")),
          });
          showToast("Payment recorded.");
          close();
          if (onDone) onDone();
        } catch (err) {
          showToast(err.message, true);
        }
      };
    }
  );
}
