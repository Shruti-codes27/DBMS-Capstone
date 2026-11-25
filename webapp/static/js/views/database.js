import { api } from "../api.js";
import { escapeHtml } from "../ui.js";

function renderResultTable(columns, rows) {
  if (!columns || columns.length === 0) {
    return '<div class="muted">No columns returned.</div>';
  }
  if (!rows || rows.length === 0) {
    return '<div class="muted">Query returned 0 rows.</div>';
  }
  return `
    <div class="table-wrap">
      <table class="data-table">
        <thead>
          <tr>${columns.map((c) => `<th>${escapeHtml(c)}</th>`).join("")}</tr>
        </thead>
        <tbody>
          ${rows
            .map(
              (r) =>
                `<tr>${columns
                  .map((c) => `<td>${escapeHtml(r[c] === null ? "NULL" : r[c])}</td>`)
                  .join("")}</tr>`
            )
            .join("")}
        </tbody>
      </table>
    </div>`;
}

export async function renderDatabase(container) {
  const info = await api.get("/api/database");
  let activeSubTab = "browser";
  let selectedObject = info.tables[0]?.name || "patients";

  container.innerHTML = `
    <div class="card" style="margin-bottom:16px;">
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
        <div class="tabs" id="db-subtabs">
          <button class="tab-btn active" data-sub="browser">Tables &amp; Views (${info.tables.length + info.views.length})</button>
          <button class="tab-btn" data-sub="queries">Report SQL Queries</button>
          <button class="tab-btn" data-sub="schema">Full Schema DDL (sql/schema.sql)</button>
          <button class="tab-btn" data-sub="console">Run SQL Query</button>
        </div>
        <div style="display:flex; gap:8px;">
          <span class="badge badge-green">PRAGMA foreign_keys = ON</span>
          <span class="badge badge-green">FK violations: ${info.fk_violations}</span>
        </div>
      </div>
    </div>

    <div id="db-panel"></div>
  `;

  const panel = document.getElementById("db-panel");

  async function loadTablePanel() {
    const allObjs = [
      ...info.tables.map((t) => ({ ...t, kind: "Table" })),
      ...info.views.map((v) => ({ ...v, kind: "View" })),
    ];
    const currentMeta = allObjs.find((o) => o.name === selectedObject) || allObjs[0];
    const tableData = await api.get(`/api/database/table?name=${encodeURIComponent(selectedObject)}`);

    panel.innerHTML = `
      <div class="db-layout">
        <div class="card">
          <div class="muted" style="font-size:11px; font-weight:700; margin-bottom:6px;">TABLES (9)</div>
          ${info.tables
            .map(
              (t) => `
            <button class="db-obj-btn ${t.name === selectedObject ? "active" : ""}" data-obj="${t.name}">
              <span>${escapeHtml(t.name)}</span>
              <span class="muted">${t.rows}</span>
            </button>`
            )
            .join("")}
          <div class="muted" style="font-size:11px; font-weight:700; margin:14px 0 6px;">VIEWS (2)</div>
          ${info.views
            .map(
              (v) => `
            <button class="db-obj-btn ${v.name === selectedObject ? "active" : ""}" data-obj="${v.name}">
              <span>${escapeHtml(v.name)}</span>
              <span class="muted">${v.rows}</span>
            </button>`
            )
            .join("")}
        </div>

        <div style="display:flex; flex-direction:column; gap:16px;">
          <div class="card">
            <div class="card-header">
              <div>
                <h3 class="card-title">${escapeHtml(currentMeta.kind)}: ${escapeHtml(currentMeta.name)}</h3>
                <div class="card-sub">Showing ${tableData.rows.length} row(s)</div>
              </div>
            </div>
            ${renderResultTable(tableData.columns, tableData.rows)}
          </div>

          <div class="card">
            <div class="card-header">
              <div>
                <h3 class="card-title">SQL Definition (DDL)</h3>
                <div class="card-sub">Exact CREATE statement stored in SQLite</div>
              </div>
            </div>
            <pre class="sql-code">${escapeHtml(currentMeta.sql)}</pre>
          </div>
        </div>
      </div>
    `;

    panel.querySelectorAll("[data-obj]").forEach((btn) => {
      btn.onclick = () => {
        selectedObject = btn.dataset.obj;
        loadTablePanel();
      };
    });
  }

  function loadQueriesPanel() {
    const queryList = [
      { key: "patient_history", title: "1. Multi-table JOIN (Patient 1 complete history)", bind: [1] },
      { key: "frequent_departments", title: "2. Subquery: Frequently visited departments" },
      { key: "frequent_doctors", title: "3. Subquery: Frequently visited doctors" },
      { key: "patient_records_view", title: "4. View: v_patient_records" },
      { key: "revenue_analysis_view", title: "5. View: v_revenue_analysis" },
      { key: "explain_patient_lookup", title: "6. Index Verification: EXPLAIN QUERY PLAN", bind: [1] },
    ];

    panel.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:16px;">
        ${queryList
          .map(
            (q) => `
          <div class="card">
            <div class="card-header">
              <div>
                <h3 class="card-title">${escapeHtml(q.title)}</h3>
                <div class="card-sub">Defined in <code>sql/queries.sql</code> [${escapeHtml(q.key)}]</div>
              </div>
              <button class="btn btn-sm btn-primary" data-run-q="${q.key}">Run query</button>
            </div>
            <pre class="sql-code">${escapeHtml(info.named_queries[q.key] || "")}</pre>
            <div id="qres-${q.key}" style="margin-top:12px;"></div>
          </div>`
          )
          .join("")}
      </div>
    `;

    panel.querySelectorAll("[data-run-q]").forEach((btn) => {
      btn.onclick = async () => {
        const key = btn.dataset.runQ;
        let sql = info.named_queries[key] || "";
        // Replace '?' parameter placeholder with 1 for demonstration in browser
        sql = sql.replace(/\?/g, "1");
        const outEl = document.getElementById(`qres-${key}`);
        try {
          const res = await api.post("/api/database/query", { sql });
          outEl.innerHTML = renderResultTable(res.columns, res.rows);
        } catch (err) {
          outEl.innerHTML = `<div class="text-red">${escapeHtml(err.message)}</div>`;
        }
      };
    });
  }

  function loadSchemaPanel() {
    panel.innerHTML = `
      <div class="card" style="margin-bottom:16px;">
        <div class="card-header">
          <div>
            <h3 class="card-title">Schema DDL (sql/schema.sql)</h3>
            <div class="card-sub">9 normalized tables (3NF), 8 indexes, and 2 views</div>
          </div>
        </div>
        <pre class="sql-code">${escapeHtml(info.schema_sql)}</pre>
      </div>

      <div class="card">
        <div class="card-header">
          <div>
            <h3 class="card-title">Indexes (${info.indexes.length})</h3>
            <div class="card-sub">Query plan for patient appointment lookup: ${escapeHtml(
              info.explain_plan.map((r) => r.detail).join(" | ")
            )}</div>
          </div>
        </div>
        ${info.indexes
          .map((idx) => `<div style="margin-bottom:8px;"><pre class="sql-code">${escapeHtml(idx.sql)}</pre></div>`)
          .join("")}
      </div>
    `;
  }

  function loadConsolePanel() {
    const defaultSql = info.named_queries.patient_history.replace(/\?/g, "1");
    panel.innerHTML = `
      <div class="card">
        <div class="card-header">
          <div>
            <h3 class="card-title">Interactive SQL Runner (Read-Only)</h3>
            <div class="card-sub">Run any SELECT, WITH, EXPLAIN, or PRAGMA statement on hospital.db</div>
          </div>
        </div>
        <textarea id="sql-input" class="textarea" rows="8" style="width:100%; font-family:Consolas, monospace;">${escapeHtml(
          defaultSql
        )}</textarea>
        <div style="display:flex; gap:10px; margin-top:10px;">
          <button class="btn btn-primary" id="run-sql-btn">Execute SQL</button>
          <button class="btn" id="sample-rev-btn">Load Revenue View SQL</button>
          <button class="btn" id="sample-sub-btn">Load Subquery SQL</button>
        </div>
        <div id="sql-output" style="margin-top:16px;"></div>
      </div>
    `;

    const input = document.getElementById("sql-input");
    const output = document.getElementById("sql-output");

    document.getElementById("sample-rev-btn").onclick = () => {
      input.value = info.named_queries.revenue_analysis_view;
    };
    document.getElementById("sample-sub-btn").onclick = () => {
      input.value = info.named_queries.frequent_departments;
    };
    document.getElementById("run-sql-btn").onclick = async () => {
      try {
        const res = await api.post("/api/database/query", { sql: input.value });
        output.innerHTML = renderResultTable(res.columns, res.rows);
      } catch (err) {
        output.innerHTML = `<div class="text-red">${escapeHtml(err.message)}</div>`;
      }
    };
  }

  function switchSubTab() {
    if (activeSubTab === "browser") loadTablePanel();
    else if (activeSubTab === "queries") loadQueriesPanel();
    else if (activeSubTab === "schema") loadSchemaPanel();
    else loadConsolePanel();
  }

  document.querySelectorAll("#db-subtabs .tab-btn").forEach((btn) => {
    btn.onclick = () => {
      activeSubTab = btn.dataset.sub;
      document.querySelectorAll("#db-subtabs .tab-btn").forEach((b) => b.classList.toggle("active", b === btn));
      switchSubTab();
    };
  });

  switchSubTab();
}
