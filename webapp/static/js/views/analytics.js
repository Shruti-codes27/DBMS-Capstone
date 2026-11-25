import { api } from "../api.js";
import { renderDonutChart, renderLineChart } from "../charts.js";
import { escapeHtml, formatINR } from "../ui.js";

export async function renderAnalytics(container) {
  const data = await api.get("/api/analytics");
  const {
    finance,
    status_counts,
    weekly,
    revenue_by_dept,
    frequent_departments,
    frequent_doctors,
    age_groups,
    genders,
  } = data;

  const collRate = finance.total_billed > 0
    ? Math.round((finance.total_collected / finance.total_billed) * 100)
    : 0;

  const busiestDept = revenue_by_dept[0] || { dept_name: "—", total_billed: 0 };
  const busiestDoc = frequent_doctors[0] || { doctor_name: "—", visits: 0 };
  const maxBilled = Math.max(...revenue_by_dept.map((d) => d.total_billed), 1);
  const totalPatients = Object.values(genders).reduce((a, b) => a + b, 0) || 1;

  container.innerHTML = `
    <section class="kpi-grid">
      <div class="card kpi-card">
        <div class="kpi-top">Collection Rate</div>
        <div class="kpi-value">${collRate}%</div>
        <div class="muted" style="font-size:12px;">${formatINR(finance.total_collected)} of ${formatINR(finance.total_billed)}</div>
      </div>

      <div class="card kpi-card">
        <div class="kpi-top">Average Invoice</div>
        <div class="kpi-value">${formatINR(Math.round(finance.avg_invoice))}</div>
        <div class="muted" style="font-size:12px;">${finance.bill_count} invoices raised</div>
      </div>

      <div class="card kpi-card">
        <div class="kpi-top">Busiest Department</div>
        <div class="kpi-value" style="font-size:20px;">${escapeHtml(busiestDept.dept_name)}</div>
        <div class="muted" style="font-size:12px;">${formatINR(busiestDept.total_billed)} billed</div>
      </div>

      <div class="card kpi-card">
        <div class="kpi-top">Busiest Doctor</div>
        <div class="kpi-value" style="font-size:20px;">${escapeHtml(busiestDoc.doctor_name)}</div>
        <div class="muted" style="font-size:12px;">${busiestDoc.visits} appointments</div>
      </div>
    </section>

    <section class="two-col">
      <div class="card">
        <div class="card-header">
          <div>
            <h3 class="card-title">Appointments per week</h3>
            <div class="card-sub">Last 8 weeks of visit volume</div>
          </div>
          <span class="muted" style="font-size:12px;">${status_counts.total} VISITS</span>
        </div>
        ${renderLineChart(weekly, [{ key: "appointments", color: "#3b82f6" }], (v) => v)}
      </div>

      <div class="card">
        <div class="card-header">
          <div>
            <h3 class="card-title">Appointment status</h3>
            <div class="card-sub">Across every recorded visit</div>
          </div>
        </div>
        <div style="display:flex; align-items:center; gap:20px; padding:12px 0;">
          ${renderDonutChart(
            [
              { value: status_counts.scheduled, color: "#3b82f6" },
              { value: status_counts.completed, color: "#0d7a67" },
              { value: status_counts.cancelled, color: "#94a3b8" },
            ],
            status_counts.total,
            "APPOINTMENTS"
          )}
          <div style="flex:1;">
            <div class="list-row"><span><span style="color:#3b82f6;">●</span> Scheduled</span><strong>${status_counts.scheduled}</strong></div>
            <div class="list-row"><span><span style="color:#0d7a67;">●</span> Completed</span><strong>${status_counts.completed}</strong></div>
            <div class="list-row"><span><span style="color:#94a3b8;">●</span> Cancelled</span><strong>${status_counts.cancelled}</strong></div>
          </div>
        </div>
      </div>
    </section>

    <section class="equal-two-col">
      <div class="card">
        <div class="card-header">
          <div>
            <h3 class="card-title">Revenue by department</h3>
            <div class="card-sub">From SQL view <code>v_revenue_analysis</code></div>
          </div>
          <a href="#/billing" class="muted" style="font-size:13px;">Open billing ›</a>
        </div>
        ${revenue_by_dept
          .map((d) => {
            const pct = d.total_billed > 0 ? Math.round((d.total_collected / d.total_billed) * 100) : 0;
            const barW = Math.round((d.total_billed / maxBilled) * 100);
            return `
            <div class="progress-row">
              <div class="progress-head">
                <strong>${escapeHtml(d.dept_name)}</strong>
                <span class="muted">${formatINR(d.total_billed)} · ${pct}% collected</span>
              </div>
              <div class="progress-track">
                <div class="progress-fill" style="width:${barW}%;"></div>
              </div>
            </div>`;
          })
          .join("")}
        <div style="display:flex; justify-content:space-between; border-top:1px solid var(--border); padding-top:10px; margin-top:12px; font-size:13px;">
          <span>Outstanding: <strong class="text-red">${formatINR(finance.outstanding)}</strong></span>
          <span class="muted">Scheduled visits: ${status_counts.scheduled}</span>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <div>
            <h3 class="card-title">Patient demographics</h3>
            <div class="card-sub">Age distribution and gender split</div>
          </div>
        </div>
        <div class="muted" style="font-size:11px; font-weight:700; margin-bottom:8px;">AGE GROUPS</div>
        ${Object.entries(age_groups)
          .map(
            ([label, count]) => `
          <div class="progress-row">
            <div class="progress-head"><span>${label}</span><strong>${count}</strong></div>
            <div class="progress-track"><div class="progress-fill" style="width:${Math.round((count / totalPatients) * 100)}%;"></div></div>
          </div>`
          )
          .join("")}

        <div class="muted" style="font-size:11px; font-weight:700; margin:14px 0 8px;">GENDER</div>
        <div class="progress-row">
          <div class="progress-head"><span>Female</span><strong>${genders.F || 0}</strong></div>
          <div class="progress-track"><div class="progress-fill" style="width:${Math.round(((genders.F || 0) / totalPatients) * 100)}%;"></div></div>
        </div>
        <div class="progress-row">
          <div class="progress-head"><span>Male</span><strong>${genders.M || 0}</strong></div>
          <div class="progress-track"><div class="progress-fill" style="width:${Math.round(((genders.M || 0) / totalPatients) * 100)}%;"></div></div>
        </div>
      </div>
    </section>

    <section class="equal-two-col">
      <div class="card">
        <div class="card-header">
          <div>
            <h3 class="card-title">Frequently visited departments (Subquery)</h3>
            <div class="card-sub">Departments above hospital-wide average visit count</div>
          </div>
        </div>
        ${frequent_departments
          .map(
            (d) => `<div class="list-row"><strong>${escapeHtml(d.dept_name)}</strong><span class="badge badge-green">${d.visits} visits</span></div>`
          )
          .join("")}
      </div>

      <div class="card">
        <div class="card-header">
          <div>
            <h3 class="card-title">Frequently visited doctors (Subquery)</h3>
            <div class="card-sub">Doctors above hospital-wide average visit count</div>
          </div>
        </div>
        ${frequent_doctors
          .map(
            (d) => `
          <div class="list-row">
            <div><strong>${escapeHtml(d.doctor_name)}</strong> <span class="muted">· ${escapeHtml(d.dept_name)}</span></div>
            <span class="badge badge-green">${d.visits} visits</span>
          </div>`
          )
          .join("")}
      </div>
    </section>
  `;
}
