import { api } from "../api.js";
import { openBookAppointmentModal, openRecordClinicalModal } from "../dialogs.js";
import { escapeHtml, formatDate, formatINR, showToast, statusBadge } from "../ui.js";

export async function renderAppointments(container) {
  const appts = await api.get("/api/appointments");
  let statusFilter = "all";

  container.innerHTML = `
    <div class="card">
      <div class="filter-bar">
        <div class="tabs" id="appt-tabs">
          <button class="tab-btn active" data-filter="all">All (${appts.length})</button>
          <button class="tab-btn" data-filter="scheduled">Scheduled (${appts.filter((a) => a.status === "scheduled").length})</button>
          <button class="tab-btn" data-filter="completed">Completed (${appts.filter((a) => a.status === "completed").length})</button>
          <button class="tab-btn" data-filter="cancelled">Cancelled (${appts.filter((a) => a.status === "cancelled").length})</button>
        </div>
        <button class="btn btn-primary" style="margin-left:auto;" id="appt-new-btn">+ New appointment</button>
      </div>

      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Date</th>
              <th>Patient</th>
              <th>Doctor &amp; Dept</th>
              <th>Diagnosis</th>
              <th>Est. Fee</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="appt-tbody"></tbody>
        </table>
      </div>
    </div>
  `;

  const renderRows = () => {
    const list = statusFilter === "all" ? appts : appts.filter((a) => a.status === statusFilter);
    const tbody = document.getElementById("appt-tbody");
    tbody.innerHTML = list
      .map(
        (a) => `
      <tr>
        <td class="muted">#${a.appt_id}</td>
        <td>${formatDate(a.appt_date)}</td>
        <td><a href="#/patients/${a.patient_id}"><strong>${escapeHtml(a.patient_name)}</strong></a></td>
        <td>
          <div>${escapeHtml(a.doctor_name)}</div>
          <div class="muted" style="font-size:12px;">${escapeHtml(a.dept_name)}</div>
        </td>
        <td>${escapeHtml(a.condition || "—")}</td>
        <td>${formatINR(a.fixed_fee)}</td>
        <td>${statusBadge(a.status)}</td>
        <td>
          <div style="display:flex; gap:6px; flex-wrap:wrap;">
            ${
              a.status === "scheduled"
                ? `<button class="btn btn-sm btn-primary" data-complete="${a.appt_id}">Complete</button>
                   <button class="btn btn-sm btn-danger" data-cancel="${a.appt_id}">Cancel</button>`
                : ""
            }
            ${
              a.status !== "cancelled"
                ? `<button class="btn btn-sm" data-record="${a.appt_id}">Clinical notes</button>`
                : ""
            }
          </div>
        </td>
      </tr>`
      )
      .join("");

    tbody.querySelectorAll("[data-complete]").forEach((btn) => {
      btn.onclick = async () => {
        await api.post(`/api/appointments/${btn.dataset.complete}/complete`, {});
        showToast("Appointment marked completed.");
        renderAppointments(container);
      };
    });

    tbody.querySelectorAll("[data-cancel]").forEach((btn) => {
      btn.onclick = async () => {
        await api.post(`/api/appointments/${btn.dataset.cancel}/cancel`, {});
        showToast("Appointment cancelled.");
        renderAppointments(container);
      };
    });

    tbody.querySelectorAll("[data-record]").forEach((btn) => {
      btn.onclick = () => {
        const appt = appts.find((x) => String(x.appt_id) === btn.dataset.record);
        openRecordClinicalModal(appt, () => renderAppointments(container));
      };
    });
  };

  document.querySelectorAll("#appt-tabs .tab-btn").forEach((btn) => {
    btn.onclick = () => {
      statusFilter = btn.dataset.filter;
      document.querySelectorAll("#appt-tabs .tab-btn").forEach((b) => b.classList.toggle("active", b === btn));
      renderRows();
    };
  });

  document.getElementById("appt-new-btn").onclick = () =>
    openBookAppointmentModal(() => renderAppointments(container));

  renderRows();
}
