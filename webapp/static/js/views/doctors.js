import { api } from "../api.js";
import { escapeHtml, getAvatarColor, getInitials } from "../ui.js";

export async function renderDoctors(container) {
  const [doctors, departments] = await Promise.all([
    api.get("/api/doctors"),
    api.get("/api/departments"),
  ]);

  container.innerHTML = `
    <div class="card" style="margin-bottom:18px;">
      <div class="card-header">
        <div>
          <h3 class="card-title">Departments</h3>
          <div class="card-sub">Hospital master units (${departments.length} departments)</div>
        </div>
      </div>
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr><th>ID</th><th>Department</th><th>Location</th><th>Phone</th><th>Doctors</th></tr>
          </thead>
          <tbody>
            ${departments
              .map(
                (dep) => `
              <tr>
                <td class="muted">#${dep.dept_id}</td>
                <td><strong>${escapeHtml(dep.dept_name)}</strong></td>
                <td>${escapeHtml(dep.location)}</td>
                <td>${escapeHtml(dep.phone || "—")}</td>
                <td><span class="badge badge-green">${dep.doctor_count} doctors</span></td>
              </tr>`
              )
              .join("")}
          </tbody>
        </table>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <div>
          <h3 class="card-title">Medical staff</h3>
          <div class="card-sub">${doctors.length} registered doctors across departments</div>
        </div>
      </div>
      <div class="doctor-grid">
        ${doctors
          .map(
            (d) => `
          <div class="card" style="box-shadow:none;">
            <div style="display:flex; align-items:center; gap:12px; margin-bottom:12px;">
              <div class="avatar-circle" style="background:${getAvatarColor(d.doctor_id + 2)};">
                ${getInitials(d.doctor_name.replace(/^Dr\.\s*/i, ""))}
              </div>
              <div>
                <strong>${escapeHtml(d.doctor_name)}</strong>
                <div class="muted" style="font-size:12px;">${escapeHtml(d.specialization)}</div>
              </div>
            </div>
            <div class="list-row">
              <span class="muted">Department</span>
              <span class="badge badge-gray">${escapeHtml(d.dept_name)}</span>
            </div>
            <div class="list-row">
              <span class="muted">Total visits</span>
              <strong>${d.total_appointments}</strong>
            </div>
            <div class="list-row">
              <span class="muted">Completed / Scheduled</span>
              <span>${d.completed_appointments || 0} / ${d.scheduled_appointments || 0}</span>
            </div>
          </div>`
          )
          .join("")}
      </div>
    </div>
  `;
}
