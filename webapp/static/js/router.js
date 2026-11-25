// Hash-based SPA router and global search setup

import { api } from "./api.js";
import { hydrateIcons } from "./icons.js";
import { escapeHtml } from "./ui.js";
import { renderDashboard } from "./views/dashboard.js";
import { renderPatients } from "./views/patients.js";
import { renderPatientProfile } from "./views/patient_profile.js";
import { renderDoctors } from "./views/doctors.js";
import { renderAppointments } from "./views/appointments.js";
import { renderBilling } from "./views/billing.js";
import { renderAnalytics } from "./views/analytics.js";
import { renderDatabase } from "./views/database.js";

const ROUTES = [
  { pattern: /^#\/dashboard$/, nav: "dashboard", title: "Dashboard", sub: "Hospital overview", fn: renderDashboard },
  { pattern: /^#\/patients$/, nav: "patients", title: "Patients", sub: "Patient directory and latest conditions", fn: renderPatients },
  { pattern: /^#\/patients\/(\d+)$/, nav: "patients", title: "Patient profile", sub: "Medical history, prescriptions and billing", fn: renderPatientProfile },
  { pattern: /^#\/doctors$/, nav: "doctors", title: "Doctors", sub: "Departments and medical staff", fn: renderDoctors },
  { pattern: /^#\/appointments$/, nav: "appointments", title: "Appointments", sub: "Schedule visits and record clinical notes", fn: renderAppointments },
  { pattern: /^#\/billing$/, nav: "billing", title: "Billing", sub: "Invoices, payments and outstanding dues", fn: renderBilling },
  { pattern: /^#\/analytics$/, nav: "analytics", title: "Analytics", sub: "Operational and financial insights", fn: renderAnalytics },
  { pattern: /^#\/database$/, nav: "database", title: "Database & SQL", sub: "Schema DDL, SQLite views, joins, subqueries and live explorer", fn: renderDatabase },
];

export async function refreshScheduledBadge() {
  try {
    const overview = await api.get("/api/overview");
    const badge = document.getElementById("nav-scheduled-badge");
    if (badge) badge.textContent = overview.counts.scheduled;
  } catch {
    // ignore badge refresh error
  }
}

export async function navigate() {
  const hash = window.location.hash || "#/dashboard";
  if (!window.location.hash) {
    window.location.hash = "#/dashboard";
    return;
  }

  let matched = ROUTES[0];
  let params = [];
  for (const r of ROUTES) {
    const m = hash.match(r.pattern);
    if (m) {
      matched = r;
      params = m.slice(1);
      break;
    }
  }

  document.getElementById("page-title").textContent = matched.title;
  document.getElementById("page-subtitle").textContent = matched.sub;

  document.querySelectorAll("#sidebar-nav .nav-item").forEach((a) => {
    a.classList.toggle("active", a.dataset.route === matched.nav);
  });

  const container = document.getElementById("app-content");
  container.innerHTML = '<div class="loading-box">Loading...</div>';
  await matched.fn(container, ...params);
  refreshScheduledBadge();
}

function setupGlobalSearch() {
  const input = document.getElementById("global-search");
  const box = document.getElementById("search-results");
  let timer = null;

  input.addEventListener("input", () => {
    clearTimeout(timer);
    const q = input.value.trim();
    if (!q) {
      box.classList.add("hidden");
      box.innerHTML = "";
      return;
    }
    timer = setTimeout(async () => {
      try {
        const res = await api.get(`/api/search?q=${encodeURIComponent(q)}`);
        const items = [];
        if (res.patients.length) {
          items.push('<div class="search-group-label">Patients</div>');
          for (const p of res.patients) {
            items.push(
              `<div class="search-result-item" data-href="#/patients/${p.patient_id}">
                <span>${escapeHtml(p.full_name)}</span>
                <span class="muted">${escapeHtml(p.latest_condition || p.phone)}</span>
              </div>`
            );
          }
        }
        if (res.doctors.length) {
          items.push('<div class="search-group-label">Doctors</div>');
          for (const d of res.doctors) {
            items.push(
              `<div class="search-result-item" data-href="#/doctors">
                <span>${escapeHtml(d.doctor_name)}</span>
                <span class="muted">${escapeHtml(d.dept_name)}</span>
              </div>`
            );
          }
        }
        if (!items.length) {
          items.push('<div class="muted" style="padding:8px;">No matching records</div>');
        }
        box.innerHTML = items.join("");
        box.classList.remove("hidden");
        box.querySelectorAll("[data-href]").forEach((el) => {
          el.onclick = () => {
            window.location.hash = el.dataset.href;
            box.classList.add("hidden");
            input.value = "";
          };
        });
      } catch {
        box.classList.add("hidden");
      }
    }, 200);
  });

  document.addEventListener("click", (e) => {
    if (!e.target.closest(".search-box")) {
      box.classList.add("hidden");
    }
  });
}

window.addEventListener("DOMContentLoaded", () => {
  hydrateIcons();
  setupGlobalSearch();
  const toggle = document.getElementById("menu-toggle");
  const sidebar = document.querySelector(".sidebar");
  toggle.onclick = () => sidebar.classList.toggle("open");
  navigate();
});

window.addEventListener("hashchange", navigate);
