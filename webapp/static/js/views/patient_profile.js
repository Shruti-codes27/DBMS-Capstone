import { api } from "../api.js";
import { openBookAppointmentModal } from "../dialogs.js";
import {
  calcAge,
  escapeHtml,
  formatDate,
  formatINR,
  genderLabel,
  getAvatarColor,
  getInitials,
  statusBadge,
} from "../ui.js";

export async function renderPatientProfile(container, patientId) {
  const [profile, history] = await Promise.all([
    api.get(`/api/patients/${patientId}/profile`),
    api.get(`/api/patients/${patientId}/history`),
  ]);

  const { patient, billing, bills } = profile;
  let activeTab = "visits";

  container.innerHTML = `
    <div style="margin-bottom:12px;">
      <a href="#/patients" class="muted">← All patients</a>
    </div>

    <div class="card" style="margin-bottom:16px;">
      <div class="profile-header">
        <div class="profile-identity">
          <div class="profile-avatar" style="background:${getAvatarColor(patient.patient_id)};">
            ${getInitials(patient.full_name)}
          </div>
          <div>
            <h2 style="margin:0 0 6px;">${escapeHtml(patient.full_name)}</h2>
            <div style="display:flex; gap:6px; flex-wrap:wrap; margin-bottom:6px;">
              <span class="badge badge-gray">Patient #${patient.patient_id}</span>
              <span class="badge badge-gray">${genderLabel(patient.gender)}</span>
              <span class="badge badge-gray">${calcAge(patient.dob)} years</span>
              <span class="badge badge-green">Registered patient</span>
            </div>
            <div class="muted" style="font-size:13px;">
              ${escapeHtml(patient.phone || "No phone")} &nbsp;·&nbsp; ${escapeHtml(patient.email || "No email")}
            </div>
          </div>
        </div>
        <button class="btn btn-primary" id="prof-book-btn">+ Book appointment</button>
      </div>

      <div class="profile-stats">
        <div>
          <div class="muted" style="font-size:11px; font-weight:700;">TOTAL VISITS</div>
          <div style="font-size:20px; font-weight:700;">${patient.total_appointments}</div>
        </div>
        <div>
          <div class="muted" style="font-size:11px; font-weight:700;">LAST VISIT</div>
          <div style="font-size:20px; font-weight:700;">${formatDate(patient.last_visit)}</div>
        </div>
        <div>
          <div class="muted" style="font-size:11px; font-weight:700;">TOTAL BILLED</div>
          <div style="font-size:20px; font-weight:700;">${formatINR(billing.total_billed)}</div>
        </div>
        <div>
          <div class="muted" style="font-size:11px; font-weight:700;">OUTSTANDING</div>
          <div style="font-size:20px; font-weight:700;">${formatINR(billing.outstanding)}</div>
        </div>
      </div>
    </div>

    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px;">
      <div class="tabs">
        <button class="tab-btn active" data-tab="visits">Visits (${history.length})</button>
        <button class="tab-btn" data-tab="billing">Billing (${bills.length})</button>
        <button class="tab-btn" data-tab="details">Details</button>
      </div>
      <div class="muted" style="font-size:12px;">SQLite · joined visit history</div>
    </div>

    <div id="profile-tab-body"></div>
  `;

  const bodyEl = document.getElementById("profile-tab-body");

  const renderTab = () => {
    if (activeTab === "visits") {
      if (!history.length) {
        bodyEl.innerHTML = '<div class="card muted">No visits recorded yet.</div>';
        return;
      }
      bodyEl.innerHTML = `<div class="timeline">${history
        .map(
          (v) => `
        <div class="visit-card">
          <div style="display:flex; justify-content:space-between; align-items:flex-start;">
            <div>
              <strong>${formatDate(v.appt_date)}</strong>
              <div class="muted" style="font-size:12px;">
                ${escapeHtml(v.doctor_name)} · ${escapeHtml(v.specialization)} · ${escapeHtml(v.dept_name)}
              </div>
            </div>
            ${statusBadge(v.status)}
          </div>

          ${
            v.condition
              ? `<div class="diagnosis-box"><strong>Diagnosis</strong> · ${escapeHtml(v.condition)}</div>`
              : ""
          }

          ${
            v.medicines.length
              ? `
            <div style="margin-top:10px;">
              <div class="muted" style="font-size:11px; font-weight:700;">PRESCRIPTION</div>
              <div class="med-pills">
                ${v.medicines
                  .map(
                    (m) =>
                      `<span class="med-pill">${escapeHtml(m.medicine)} · ${escapeHtml(m.dosage)} · ${m.duration_days}d</span>`
                  )
                  .join("")}
              </div>
            </div>`
              : ""
          }

          ${
            v.tests.length
              ? `
            <div style="margin-top:12px;">
              <div class="muted" style="font-size:11px; font-weight:700;">DIAGNOSTIC TESTS</div>
              ${v.tests
                .map(
                  (t) => `
                <div style="display:flex; justify-content:space-between; padding:4px 0; font-size:13px;">
                  <span>${escapeHtml(t.test_name)}</span>
                  <strong>${escapeHtml(t.result)}</strong>
                </div>`
                )
                .join("")}
            </div>`
              : ""
          }
        </div>`
        )
        .join("")}</div>`;
    } else if (activeTab === "billing") {
      bodyEl.innerHTML = `
        <div class="card">
          <div class="table-wrap">
            <table class="data-table">
              <thead>
                <tr><th>Invoice</th><th>Date</th><th>Doctor</th><th>Diagnosis</th><th>Amount</th><th>Paid</th><th>Balance</th></tr>
              </thead>
              <tbody>
                ${bills
                  .map(
                    (b) => `
                  <tr>
                    <td>#${b.bill_id}</td>
                    <td>${formatDate(b.bill_date)}</td>
                    <td>${escapeHtml(b.doctor_name)} (${escapeHtml(b.dept_name)})</td>
                    <td>${escapeHtml(b.condition || "—")}</td>
                    <td>${formatINR(b.amount)}</td>
                    <td>${formatINR(b.paid_amount)}</td>
                    <td class="${b.balance > 0 ? "text-red" : ""}">${formatINR(b.balance)}</td>
                  </tr>`
                  )
                  .join("")}
              </tbody>
            </table>
          </div>
        </div>`;
    } else {
      bodyEl.innerHTML = `
        <div class="card">
          <div class="list-row"><span class="muted">Patient ID</span><strong>#${patient.patient_id}</strong></div>
          <div class="list-row"><span class="muted">Full Name</span><strong>${escapeHtml(patient.full_name)}</strong></div>
          <div class="list-row"><span class="muted">Date of Birth</span><strong>${formatDate(patient.dob)}</strong></div>
          <div class="list-row"><span class="muted">Gender</span><strong>${genderLabel(patient.gender)}</strong></div>
          <div class="list-row"><span class="muted">Phone</span><strong>${escapeHtml(patient.phone || "—")}</strong></div>
          <div class="list-row"><span class="muted">Email</span><strong>${escapeHtml(patient.email || "—")}</strong></div>
        </div>`;
    }
  };

  document.querySelectorAll("[data-tab]").forEach((btn) => {
    btn.onclick = () => {
      activeTab = btn.dataset.tab;
      document.querySelectorAll("[data-tab]").forEach((b) => b.classList.toggle("active", b === btn));
      renderTab();
    };
  });

  document.getElementById("prof-book-btn").onclick = () =>
    openBookAppointmentModal(() => renderPatientProfile(container, patientId), patientId);

  renderTab();
}
