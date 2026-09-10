const state = {
  leads: [],
  filtered: [],
  selectedId: null,
  selectedLead: null,
  sortKey: "propensity_score",
  sortDirection: "desc",
};

const rowsEl = document.querySelector("#leadRows");
const relationshipFilter = document.querySelector("#relationshipFilter");
const scoreFilter = document.querySelector("#scoreFilter");
const scoreValue = document.querySelector("#scoreValue");
const detailPane = document.querySelector("#detailPane");
const errorBanner = document.querySelector("#errorBanner");

const formatCurrency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function compareValues(a, b, key) {
  const av = a[key] ?? "";
  const bv = b[key] ?? "";
  if (key === "propensity_score") return Number(av) - Number(bv);
  return String(av).localeCompare(String(bv), undefined, { numeric: true });
}

function applyFilters() {
  const relationship = relationshipFilter.value;
  const minScore = Number(scoreFilter.value);
  state.filtered = state.leads
    .filter((lead) => relationship === "all" || lead.relationship_type === relationship)
    .filter((lead) => Number(lead.propensity_score) >= minScore)
    .sort((a, b) => {
      const result = compareValues(a, b, state.sortKey);
      return state.sortDirection === "asc" ? result : -result;
    });

  if (!state.filtered.some((lead) => lead.contact_id === state.selectedId)) {
    state.selectedId = state.filtered[0]?.contact_id ?? null;
  }

  render();
  loadSelectedLead();
}

function renderMetrics() {
  const scores = state.filtered.map((lead) => Number(lead.propensity_score));
  const avg = scores.length ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 0;
  const metroCounts = state.filtered.reduce((acc, lead) => {
    acc[lead.metro] = (acc[lead.metro] || 0) + 1;
    return acc;
  }, {});
  const topMetro = Object.entries(metroCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "-";

  document.querySelector("#visibleCount").textContent = state.filtered.length;
  document.querySelector("#averageScore").textContent = avg.toFixed(1);
  document.querySelector("#topMetro").textContent = topMetro.replace(", AZ", "");
}

function renderRows() {
  rowsEl.innerHTML = state.filtered
    .map((lead) => {
      const selected = lead.contact_id === state.selectedId ? " selected" : "";
      return `
        <tr class="${selected}" data-id="${escapeHtml(lead.contact_id)}">
          <td><strong>${escapeHtml(lead.name)}</strong><span>${escapeHtml(lead.contact_id)}</span></td>
          <td>${escapeHtml(lead.zip_code)}<span>${escapeHtml(lead.metro)}</span></td>
          <td>${escapeHtml(lead.relationship_type)}</td>
          <td><meter min="0" max="100" value="${escapeHtml(lead.propensity_score)}"></meter><strong>${escapeHtml(lead.propensity_score)}</strong></td>
          <td>${escapeHtml(lead.reasons?.[0] ?? "Structured score available")}</td>
          <td>${escapeHtml(lead.last_contact_date ?? "-")}</td>
        </tr>
      `;
    })
    .join("");
}

function renderDetail() {
  const lead = state.selectedLead || state.leads.find((item) => item.contact_id === state.selectedId);
  if (!lead) {
    detailPane.innerHTML = `<p class="eyebrow">Lead detail</p><h2>No leads match</h2><p class="muted">Adjust the filters to widen the ranked list.</p>`;
    return;
  }

  detailPane.innerHTML = `
    <p class="eyebrow">${escapeHtml(lead.contact_id)}</p>
    <h2>${escapeHtml(lead.name)}</h2>
    <div class="score-card">
      <span>${escapeHtml(lead.propensity_score)}</span>
      <p>propensity score · ${escapeHtml(lead.scoring_model_version || "v1.1.0")}</p>
    </div>
    <dl>
      <div><dt>Metro</dt><dd>${escapeHtml(lead.metro)}</dd></div>
      <div><dt>ZIP</dt><dd>${escapeHtml(lead.zip_code)}</dd></div>
      <div><dt>Relationship</dt><dd>${escapeHtml(lead.relationship_type)}</dd></div>
      <div><dt>Estimated equity</dt><dd>${escapeHtml(formatCurrency.format(lead.estimated_equity || 0))}</dd></div>
      <div><dt>Tenure</dt><dd>${escapeHtml(lead.ownership_tenure_years)} years</dd></div>
      <div><dt>Comp trend</dt><dd>${escapeHtml(lead.zip_zhvi_1yr_change_pct)}%</dd></div>
      <div><dt>Engagement</dt><dd>${escapeHtml(lead.engagement_score_0_100)}/100</dd></div>
      <div><dt>Last contact</dt><dd>${escapeHtml(lead.last_contact_date ?? "-")}</dd></div>
      <div><dt>Explanation</dt><dd>${escapeHtml(lead.explanation_source)}</dd></div>
    </dl>
    <h3>Why this lead</h3>
    <ul>${(lead.reasons || []).map((reason) => `<li>${escapeHtml(reason)}</li>`).join("")}</ul>
  `;
}

function render() {
  scoreValue.textContent = `${scoreFilter.value}+`;
  renderMetrics();
  renderRows();
  renderDetail();
}

async function loadSelectedLead() {
  if (!state.selectedId) {
    state.selectedLead = null;
    renderDetail();
    return;
  }

  const cached = state.leads.find((lead) => lead.contact_id === state.selectedId);
  state.selectedLead = cached ?? null;
  renderDetail();

  try {
    const response = await fetch(`/api/leads/${encodeURIComponent(state.selectedId)}`);
    if (!response.ok) return;
    const lead = await response.json();
    if (lead.contact_id === state.selectedId) {
      state.selectedLead = lead;
      renderDetail();
    }
  } catch {
    // Keep the list payload if the detail route is unavailable.
  }
}

function hydrateRelationshipOptions() {
  const options = [...new Set(state.leads.map((lead) => lead.relationship_type))].sort();
  relationshipFilter.insertAdjacentHTML(
    "beforeend",
    options.map((option) => `<option value="${escapeHtml(option)}">${escapeHtml(option)}</option>`).join(""),
  );
}

function showError(message) {
  errorBanner.hidden = false;
  errorBanner.textContent = message;
}

document.querySelectorAll("th button").forEach((button) => {
  button.addEventListener("click", () => {
    const key = button.dataset.sort;
    if (state.sortKey === key) {
      state.sortDirection = state.sortDirection === "asc" ? "desc" : "asc";
    } else {
      state.sortKey = key;
      state.sortDirection = key === "propensity_score" ? "desc" : "asc";
    }
    applyFilters();
  });
});

rowsEl.addEventListener("click", (event) => {
  const row = event.target.closest("tr[data-id]");
  if (!row) return;
  state.selectedId = row.dataset.id;
  render();
  loadSelectedLead();
});

relationshipFilter.addEventListener("change", applyFilters);
scoreFilter.addEventListener("input", applyFilters);

try {
  const response = await fetch("/api/leads");
  if (!response.ok) throw new Error(`Could not load leads (${response.status})`);
  state.leads = await response.json();
  if (!Array.isArray(state.leads)) throw new Error("Leads API returned an unexpected payload");
  hydrateRelationshipOptions();
  applyFilters();
} catch (error) {
  showError(error.message || "Could not load ranked leads.");
  rowsEl.innerHTML = "";
  detailPane.innerHTML = `<p class="eyebrow">Lead detail</p><h2>Unable to load</h2><p class="muted">Start the Worker with npm run dev and reload this page.</p>`;
}
