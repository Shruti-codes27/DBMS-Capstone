// Shared UI helpers: formatting, avatars, and toast messages

const AVATAR_COLORS = ["#b91c1c", "#7c3aed", "#be123c", "#b45309", "#0d7a67", "#1d4ed8"];

export function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function formatINR(value) {
  const num = Number(value || 0);
  return "₹" + num.toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

export function formatDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso + "T00:00:00");
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function getInitials(name) {
  const parts = String(name || "").trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return (parts[0] || "?").slice(0, 2).toUpperCase();
}

export function getAvatarColor(id) {
  return AVATAR_COLORS[Math.abs(Number(id) || 0) % AVATAR_COLORS.length];
}

export function calcAge(dob) {
  if (!dob) return "";
  const birth = new Date(dob + "T00:00:00");
  const ref = new Date("2026-11-21T00:00:00");
  let age = ref.getFullYear() - birth.getFullYear();
  const m = ref.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && ref.getDate() < birth.getDate())) age--;
  return age;
}

export function genderLabel(code) {
  if (code === "M") return "Male";
  if (code === "F") return "Female";
  return "Other";
}

export function statusBadge(status) {
  const s = String(status || "").toLowerCase();
  if (s === "completed" || s === "paid") return `<span class="badge badge-green">● ${escapeHtml(status)}</span>`;
  if (s === "scheduled") return `<span class="badge badge-blue">● Scheduled</span>`;
  if (s === "partial") return `<span class="badge badge-amber">● Partial</span>`;
  if (s === "unpaid" || s === "cancelled") return `<span class="badge badge-red">● ${escapeHtml(status)}</span>`;
  return `<span class="badge badge-gray">${escapeHtml(status)}</span>`;
}

export function showToast(message, isError = false) {
  const root = document.getElementById("toast-root");
  const el = document.createElement("div");
  el.className = "toast" + (isError ? " error" : "");
  el.textContent = message;
  root.appendChild(el);
  setTimeout(() => el.remove(), 3200);
}
