import { api } from "../api.js";
import { openCreateInvoiceModal, openPayModal } from "../dialogs.js";
import { escapeHtml, formatDate, formatINR, getAvatarColor, getInitials, statusBadge } from "../ui.js";

export async function renderBilling(container) {
  const bills = await api.get("/api/bills");

  const totalBilled = bills.reduce((s, b) => s + b.amount, 0);
  const totalPaid = bills.reduce((s, b) => s + b.paid_amount, 0);
  const totalOut = bills.reduce((s, b) => s + b.balance, 0);
  const avgInv = bills.length ? Math.round(totalBilled / bills.length) : 0;
  const collRate = totalBilled > 0 ? Math.round((totalPaid / totalBilled) * 100) : 0;

  let statusFilter = "All";
  let search = "";

  container.innerHTML = `
    <section class="kpi-grid">
      <div class="card kpi-card">
        <div class="kpi-top">
          <span class="kpi-icon" style="background:var(--primary-soft); color:var(--primary);">₹</span>
          Total Billed
        </div>
        <div class="kpi-value">${formatINR(totalBilled)}</div>
        <div class="muted" style="font-size:12px;">${bills.length} invoices raised</div>
      </div>

      <div class="card kpi-card">
        <div class="kpi-top">
          <span class="kpi-icon" style="background:var(--green-soft); color:var(--green);">✓</span>
          Collected
        </div>
        <div class="kpi-value">${formatINR(totalPaid)}</div>
        <div class="muted" style="font-size:12px;">${collRate}% collection rate</div>
      </div>

      <div class="card kpi-card">
        <div class="kpi-top">
          <span class="kpi-icon" style="background:var(--amber-soft); color:var(--amber);">!</span>
          Outstanding
        </div>
        <div class="kpi-value">${formatINR(totalOut)}</div>
        <div class="muted" style="font-size:12px;">pending payments</div>
      </div>

      <div class="card kpi-card">
        <div class="kpi-top">
          <span class="kpi-icon" style="background:var(--blue-soft); color:var(--blue);">~</span>
          Average Invoice
        </div>
        <div class="kpi-value">${formatINR(avgInv)}</div>
        <div class="muted" style="font-size:12px;">per appointment bill</div>
      </div>
    </section>

    <div class="card">
      <div class="filter-bar">
        <input class="input" id="bill-search" placeholder="Search patient, department or invoice..." style="flex:1; min-width:220px;" />
        <div class="tabs" id="bill-tabs">
          <button class="tab-btn active" data-st="All">All (${bills.length})</button>
          <button class="tab-btn" data-st="Paid">Paid (${bills.filter((b) => b.status === "Paid").length})</button>
          <button class="tab-btn" data-st="Partial">Partial (${bills.filter((b) => b.status === "Partial").length})</button>
          <button class="tab-btn" data-st="Unpaid">Unpaid (${bills.filter((b) => b.status === "Unpaid").length})</button>
        </div>
        <button class="btn btn-primary" id="new-invoice-btn">+ New invoice</button>
      </div>

      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>Invoice</th>
              <th>Date</th>
              <th>Patient</th>
              <th>Department</th>
              <th>Amount</th>
              <th>Paid</th>
              <th>Balance</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody id="bill-tbody"></tbody>
        </table>
      </div>
    </div>
  `;

  const renderRows = () => {
    const q = search.toLowerCase();
    const list = bills.filter((b) => {
      const matchSt = statusFilter === "All" || b.status === statusFilter;
      const matchText =
        b.patient_name.toLowerCase().includes(q) ||
        b.dept_name.toLowerCase().includes(q) ||
        String(b.bill_id).includes(q);
      return matchSt && matchText;
    });

    const tbody = document.getElementById("bill-tbody");
    tbody.innerHTML = list
      .map(
        (b) => `
      <tr>
        <td class="muted">#${b.bill_id}</td>
        <td>${formatDate(b.bill_date)}</td>
        <td>
          <div style="display:flex; align-items:center; gap:10px;">
            <div class="avatar-circle" style="background:${getAvatarColor(b.patient_id)};">
              ${getInitials(b.patient_name)}
            </div>
            <div>
              <a href="#/patients/${b.patient_id}"><strong>${escapeHtml(b.patient_name)}</strong></a>
              <div class="muted" style="font-size:12px;">${escapeHtml(b.doctor_name)}</div>
            </div>
          </div>
        </td>
        <td>${escapeHtml(b.dept_name)}</td>
        <td><strong>${formatINR(b.amount)}</strong></td>
        <td>${formatINR(b.paid_amount)}</td>
        <td class="${b.balance > 0 ? "text-red" : ""}"><strong>${formatINR(b.balance)}</strong></td>
        <td>${statusBadge(b.status)}</td>
        <td class="text-right">
          ${b.balance > 0 ? `<button class="btn btn-sm btn-primary" data-pay="${b.bill_id}">Pay now</button>` : ""}
        </td>
      </tr>`
      )
      .join("");

    tbody.querySelectorAll("[data-pay]").forEach((btn) => {
      btn.onclick = () => {
        const bill = bills.find((x) => String(x.bill_id) === btn.dataset.pay);
        openPayModal(bill, () => renderBilling(container));
      };
    });
  };

  document.getElementById("bill-search").oninput = (e) => {
    search = e.target.value;
    renderRows();
  };

  document.querySelectorAll("#bill-tabs .tab-btn").forEach((btn) => {
    btn.onclick = () => {
      statusFilter = btn.dataset.st;
      document.querySelectorAll("#bill-tabs .tab-btn").forEach((b) => b.classList.toggle("active", b === btn));
      renderRows();
    };
  });

  document.getElementById("new-invoice-btn").onclick = () =>
    openCreateInvoiceModal(() => renderBilling(container));

  renderRows();
}
