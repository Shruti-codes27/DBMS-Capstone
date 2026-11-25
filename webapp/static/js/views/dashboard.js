import { api } from "../api.js";
import { renderDonutChart, renderLineChart } from "../charts.js";
import { openBookAppointmentModal, openRegisterPatientModal } from "../dialogs.js";
import { escapeHtml, formatDate, formatINR, statusBadge } from "../ui.js";

export async function renderDashboard(container) {
  const data = await api.get("/api/overview");
  const { counts, finance, weekly, upcoming, top_doctors } = data;
  const collRate = finance.total_billed > 0
    ? Math.round((finance.total_collected / finance.total_billed) * 100)
    : 0;

  container.innerHTML = `
    <section class="card hero-banner">
      <div>
        <div class="hero-tag">✦ Hospital Overview</div>
        <h2 class="hero-title">Good evening, Dr. Shruti</h2>
        <div class="muted">
          Here is what is happening across MediCare today — ${counts.scheduled} scheduled visits awaiting your team.
        </div>
        <div class="hero-actions">
          <button class="btn btn-primary" id="dash-new-appt">+ New appointment</button>
          <button class="btn" id="dash-reg-patient">Register patient</button>
        </div>
      </div>
      <div class="date-tile">
        <div class="date-tile-day">25</div>
        <div class="muted" style="font-size:12px;">Nov 2026</div>
        <div class="muted" style="font-size:10px; letter-spacing:0.06em;">WEDNESDAY</div>
      </div>
    </section>

    <section class="kpi-grid">
      <div class="card kpi-card">
        <div class="kpi-top">
          <span class="kpi-icon" style="background:var(--primary-soft); color:var(--primary);">P</span>
          Patients
        </div>
        <div class="kpi-value">${counts.patients}</div>
        <div class="muted" style="font-size:12px;">${counts.doctors} doctors · ${counts.departments} departments</div>
      </div>

      <div class="card kpi-card">
        <div class="kpi-top">
          <span class="kpi-icon" style="background:var(--blue-soft); color:var(--blue);">A</span>
          Appointments
        </div>
        <div class="kpi-value">${counts.total_appointments}</div>
        <div class="muted" style="font-size:12px;">${counts.scheduled} scheduled · ${counts.completed} completed</div>
      </div>

      <div class="card kpi-card">
        <div class="kpi-top">
          <span class="kpi-icon" style="background:var(--green-soft); color:var(--green);">₹</span>
          Collected
        </div>
        <div class="kpi-value">${formatINR(finance.total_collected)}</div>
        <div class="muted" style="font-size:12px;">of ${formatINR(finance.total_billed)} billed · ${collRate}%</div>
      </div>

      <div class="card kpi-card">
        <div class="kpi-top">
          <span class="kpi-icon" style="background:var(--amber-soft); color:var(--amber);">!</span>
          Outstanding
        </div>
        <div class="kpi-value">${formatINR(finance.outstanding)}</div>
        <div class="muted" style="font-size:12px;">pending payments</div>
      </div>
    </section>

    <section class="two-col">
      <div class="card">
        <div class="card-header">
          <div>
            <h3 class="card-title">Revenue &amp; collections</h3>
            <div class="card-sub">Weekly billing activity over the last 8 weeks</div>
          </div>
          <div style="display:flex; gap:12px; font-size:12px;">
            <span><span style="color:#0d7a67;">●</span> Billed</span>
            <span><span style="color:#3b82f6;">●</span> Collected</span>
          </div>
        </div>
        ${renderLineChart(
          weekly,
          [
            { key: "billed", color: "#0d7a67" },
            { key: "collected", color: "#3b82f6" },
          ],
          (v) => (v >= 1000 ? `₹${(v / 1000).toFixed(1)}k` : `₹${v}`)
        )}
      </div>

      <div class="card">
        <div class="card-header">
          <div>
            <h3 class="card-title">Appointment status</h3>
            <div class="card-sub">Distribution across all visits</div>
          </div>
        </div>
        <div style="display:flex; align-items:center; gap:20px; padding:12px 0;">
          ${renderDonutChart(
            [
              { value: counts.scheduled, color: "#3b82f6" },
              { value: counts.completed, color: "#0d7a67" },
              { value: counts.cancelled, color: "#94a3b8" },
            ],
            counts.total_appointments,
            "APPOINTMENTS"
          )}
          <div style="flex:1;">
            <div class="list-row">
              <span><span style="color:#3b82f6;">●</span> Scheduled</span>
              <strong>${counts.scheduled}</strong>
            </div>
            <div class="list-row">
              <span><span style="color:#0d7a67;">●</span> Completed</span>
              <strong>${counts.completed}</strong>
            </div>
            <div class="list-row">
              <span><span style="color:#94a3b8;">●</span> Cancelled</span>
              <strong>${counts.cancelled}</strong>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="equal-two-col">
      <div class="card">
        <div class="card-header">
          <div>
            <h3 class="card-title">Upcoming appointments</h3>
            <div class="card-sub">Next scheduled visits for the care team</div>
          </div>
          <a href="#/appointments" class="muted" style="font-size:13px;">View all ›</a>
        </div>
        ${
          upcoming.length === 0
            ? '<div class="muted">No scheduled appointments.</div>'
            : upcoming
                .map(
                  (a) => `
              <div class="list-row">
                <div>
                  <a href="#/patients/${a.patient_id}"><strong>${escapeHtml(a.patient_name)}</strong></a>
                  <div class="muted" style="font-size:12px;">${escapeHtml(a.doctor_name)} · ${escapeHtml(a.dept_name)}</div>
                </div>
                <div style="text-align:right;">
                  <div>${formatDate(a.appt_date)}</div>
                  ${statusBadge(a.status)}
                </div>
              </div>`
                )
                .join("")
        }
      </div>

      <div class="card">
        <div class="card-header">
          <div>
            <h3 class="card-title">Top doctors</h3>
            <div class="card-sub">By total appointments handled</div>
          </div>
          <a href="#/doctors" class="muted" style="font-size:13px;">All doctors ›</a>
        </div>
        ${top_doctors
          .map(
            (d) => `
          <div class="list-row">
            <div>
              <strong>${escapeHtml(d.doctor_name)}</strong>
              <div class="muted" style="font-size:12px;">${escapeHtml(d.specialization)} · ${escapeHtml(d.dept_name)}</div>
            </div>
            <span class="badge badge-gray">${d.visits} visits</span>
          </div>`
          )
          .join("")}
      </div>
    </section>
  `;

  document.getElementById("dash-new-appt").onclick = () =>
    openBookAppointmentModal(() => renderDashboard(container));
  document.getElementById("dash-reg-patient").onclick = () =>
    openRegisterPatientModal(() => renderDashboard(container));
}
