import { api } from "../api.js";
import { openRegisterPatientModal } from "../dialogs.js";
import {
  escapeHtml,
  formatDate,
  genderLabel,
  getAvatarColor,
  getInitials,
} from "../ui.js";

export async function renderPatients(container) {
  const patients = await api.get("/api/patients");
  let search = "";
  let genderFilter = "ALL";
  let sortBy = "name";

  container.innerHTML = `
    <div class="card">
      <div class="filter-bar">
        <input class="input" id="pat-search" placeholder="Search name or condition..." style="flex:1; min-width:200px;" />
        <select class="select" id="pat-gender">
          <option value="ALL">All genders</option>
          <option value="M">Male</option>
          <option value="F">Female</option>
          <option value="O">Other</option>
        </select>
        <select class="select" id="pat-sort">
          <option value="name">Sort by name</option>
          <option value="id">Sort by ID</option>
          <option value="visits">Sort by visits</option>
        </select>
        <span class="badge badge-green" id="pat-count">${patients.length}</span>
        <button class="btn btn-primary" id="pat-add-btn">+ Register patient</button>
      </div>

      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Patient</th>
              <th>Gender</th>
              <th>Visits</th>
              <th>Last visit</th>
              <th>Latest condition</th>
              <th></th>
            </tr>
          </thead>
          <tbody id="pat-tbody"></tbody>
        </table>
      </div>
    </div>
  `;

  const renderRows = () => {
    let list = patients.filter((p) => {
      const q = search.toLowerCase();
      const matchText =
        p.full_name.toLowerCase().includes(q) ||
        (p.latest_condition || "").toLowerCase().includes(q);
      const matchGender = genderFilter === "ALL" || p.gender === genderFilter;
      return matchText && matchGender;
    });

    if (sortBy === "name") {
      list.sort((a, b) => a.full_name.localeCompare(b.full_name));
    } else if (sortBy === "visits") {
      list.sort((a, b) => b.total_appointments - a.total_appointments);
    } else {
      list.sort((a, b) => a.patient_id - b.patient_id);
    }

    document.getElementById("pat-count").textContent = list.length;
    const tbody = document.getElementById("pat-tbody");
    tbody.innerHTML = list
      .map(
        (p) => `
      <tr>
        <td class="muted">#${p.patient_id}</td>
        <td>
          <div style="display:flex; align-items:center; gap:10px;">
            <div class="avatar-circle" style="background:${getAvatarColor(p.patient_id)};">
              ${getInitials(p.full_name)}
            </div>
            <div>
              <strong>${escapeHtml(p.full_name)}</strong>
              <div class="muted" style="font-size:12px;">${escapeHtml(p.phone || "")}</div>
            </div>
          </div>
        </td>
        <td><span class="badge badge-gray">${genderLabel(p.gender)}</span></td>
        <td>${p.total_appointments}</td>
        <td>${formatDate(p.last_visit)}</td>
        <td>${escapeHtml(p.latest_condition || "—")}</td>
        <td class="text-right">
          <a class="btn btn-sm" href="#/patients/${p.patient_id}">View ›</a>
        </td>
      </tr>`
      )
      .join("");
  };

  document.getElementById("pat-search").oninput = (e) => {
    search = e.target.value;
    renderRows();
  };
  document.getElementById("pat-gender").onchange = (e) => {
    genderFilter = e.target.value;
    renderRows();
  };
  document.getElementById("pat-sort").onchange = (e) => {
    sortBy = e.target.value;
    renderRows();
  };
  document.getElementById("pat-add-btn").onclick = () =>
    openRegisterPatientModal(() => renderPatients(container));

  renderRows();
}
