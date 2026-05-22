const portfolioState = {
  data: null,
  filtered: []
};

const portfolioElements = {
  benchmarkCountMetric: document.querySelector("#benchmarkCountMetric"),
  tierOneMetric: document.querySelector("#tierOneMetric"),
  phaseCountMetric: document.querySelector("#phaseCountMetric"),
  restrictedBenchMetric: document.querySelector("#restrictedBenchMetric"),
  benchmarkTierList: document.querySelector("#benchmarkTierList"),
  benchmarkPhaseList: document.querySelector("#benchmarkPhaseList"),
  benchmarkInventoryTable: document.querySelector("#benchmarkInventoryTable"),
  benchmarkMetadataList: document.querySelector("#benchmarkMetadataList"),
  benchmarkGovernanceList: document.querySelector("#benchmarkGovernanceList"),
  benchmarkGapList: document.querySelector("#benchmarkGapList"),
  benchmarkUpdatedChip: document.querySelector("#benchmarkUpdatedChip"),
  benchmarkSearchInput: document.querySelector("#benchmarkSearchInput"),
  benchmarkTierFilter: document.querySelector("#benchmarkTierFilter")
};

function portfolioText(value) {
  return String(value ?? "");
}

function portfolioEscape(value) {
  return portfolioText(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function loadBenchmarkPortfolio() {
  try {
    const response = await fetch("/api/benchmarks");
    if (!response.ok) throw new Error(`Server returned HTTP ${response.status}`);
    const data = await response.json();
    portfolioState.data = data;
    portfolioState.filtered = data.benchmarks || [];
    renderBenchmarkPortfolio(data);
  } catch (error) {
    if (portfolioElements.benchmarkUpdatedChip) {
      portfolioElements.benchmarkUpdatedChip.textContent = `Unavailable: ${error.message}`;
      portfolioElements.benchmarkUpdatedChip.classList.add("status-warning");
    }
    if (portfolioElements.benchmarkInventoryTable) {
      portfolioElements.benchmarkInventoryTable.innerHTML = `<div class="empty-panel">Start the local server to load the benchmark portfolio.</div>`;
    }
  }
}

function renderBenchmarkPortfolio(data) {
  const benchmarks = data.benchmarks || [];
  const tierOne = benchmarks.filter((benchmark) => benchmark.tier === 1);
  const restricted = benchmarks.filter((benchmark) => ["high", "critical"].includes(portfolioText(benchmark.riskLevel).toLowerCase()));

  portfolioElements.benchmarkCountMetric.textContent = String(benchmarks.length);
  portfolioElements.tierOneMetric.textContent = String(tierOne.length);
  portfolioElements.phaseCountMetric.textContent = String((data.phases || []).length);
  portfolioElements.restrictedBenchMetric.textContent = String(restricted.length);
  portfolioElements.benchmarkUpdatedChip.textContent = `v${data.version} / ${data.updatedAt}`;

  renderTierList(data.tiers || []);
  renderPhaseList(data.phases || []);
  renderMetadataList(data.metadataFields || []);
  renderGovernanceList(data.governanceRules || []);
  renderGapList(data.customGaps || []);
  applyBenchmarkFilters();
  window.lucide?.createIcons();
}

function renderTierList(tiers) {
  portfolioElements.benchmarkTierList.innerHTML = tiers
    .map(
      (tier) => `
        <article class="benchmark-tier-card">
          <div class="tier-card-head">
            <span class="badge ${tier.id === 1 ? "success" : tier.id === 2 ? "warning" : "violet"}">${portfolioEscape(tier.label)}</span>
            <strong>${portfolioEscape(tier.benchmarks?.length || 0)} datasets</strong>
          </div>
          <p>${portfolioEscape(tier.summary)}</p>
          <div class="benchmark-chip-row">
            ${(tier.benchmarks || []).map((name) => `<span>${portfolioEscape(name)}</span>`).join("")}
          </div>
        </article>
      `
    )
    .join("");
}

function renderPhaseList(phases) {
  portfolioElements.benchmarkPhaseList.innerHTML = phases
    .map(
      (phase) => `
        <article class="phase-card">
          <div>
            <strong>${portfolioEscape(phase.label)}</strong>
            <p>${portfolioEscape(phase.goal)}</p>
          </div>
          <div class="phase-output-row">
            ${(phase.outputs || []).slice(0, 4).map((output) => `<span>${portfolioEscape(output)}</span>`).join("")}
          </div>
        </article>
      `
    )
    .join("");
}

function renderMetadataList(fields) {
  portfolioElements.benchmarkMetadataList.innerHTML = fields
    .map((field) => `<div class="metadata-item">${portfolioEscape(field)}</div>`)
    .join("");
}

function renderGovernanceList(rules) {
  portfolioElements.benchmarkGovernanceList.innerHTML = rules
    .map((rule, index) => `<div class="governance-item"><span>${index + 1}</span><p>${portfolioEscape(rule)}</p></div>`)
    .join("");
}

function renderGapList(gaps) {
  portfolioElements.benchmarkGapList.innerHTML = gaps
    .map(
      (gap) => `
        <article class="gap-item">
          <strong>${portfolioEscape(gap.name)}</strong>
          <p>${portfolioEscape(gap.purpose)}</p>
        </article>
      `
    )
    .join("");
}

function applyBenchmarkFilters() {
  const data = portfolioState.data;
  if (!data) return;

  const query = portfolioText(portfolioElements.benchmarkSearchInput.value).trim().toLowerCase();
  const tier = portfolioElements.benchmarkTierFilter.value;
  const benchmarks = data.benchmarks || [];

  portfolioState.filtered = benchmarks.filter((benchmark) => {
    const tierMatch = tier === "all" || String(benchmark.tier) === tier;
    const haystack = [
      benchmark.name,
      benchmark.axis,
      benchmark.category,
      benchmark.metric,
      benchmark.modality,
      benchmark.riskLevel,
      ...(benchmark.languages || [])
    ]
      .map((item) => portfolioText(item).toLowerCase())
      .join(" ");
    return tierMatch && (!query || haystack.includes(query));
  });

  renderInventoryTable(portfolioState.filtered);
}

function renderInventoryTable(benchmarks) {
  if (!benchmarks.length) {
    portfolioElements.benchmarkInventoryTable.innerHTML = `<div class="empty-panel">No benchmark entries match the current filters.</div>`;
    return;
  }

  const rows = benchmarks
    .map(
      (benchmark) => `
        <tr>
          <td>
            <strong>${portfolioEscape(benchmark.name)}</strong>
            <span>${portfolioEscape(benchmark.category)}</span>
          </td>
          <td><span class="badge ${tierBadgeClass(benchmark.tier)}">Tier ${portfolioEscape(benchmark.tier)}</span></td>
          <td>${portfolioEscape(benchmark.axis)}</td>
          <td>${portfolioEscape(benchmark.metric)}</td>
          <td>${portfolioEscape(benchmark.modality)}<br /><span>${portfolioEscape((benchmark.languages || []).join(", "))}</span></td>
          <td><span class="risk-pill ${riskClass(benchmark.riskLevel)}">${portfolioEscape(benchmark.riskLevel)}</span></td>
          <td>${portfolioEscape(benchmark.expectedBehavior)}</td>
          <td><a href="${portfolioEscape(benchmark.source)}" target="_blank" rel="noreferrer">Source</a></td>
        </tr>
      `
    )
    .join("");

  portfolioElements.benchmarkInventoryTable.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Dataset</th>
          <th>Tier</th>
          <th>Axis</th>
          <th>Metric</th>
          <th>Modality / language</th>
          <th>Risk</th>
          <th>Expected behavior</th>
          <th>Ref</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function tierBadgeClass(tier) {
  if (Number(tier) === 1) return "success";
  if (Number(tier) === 2) return "warning";
  return "violet";
}

function riskClass(riskLevel) {
  const value = portfolioText(riskLevel).toLowerCase();
  if (value === "critical") return "is-critical";
  if (value === "high") return "is-high";
  if (value === "medium") return "is-medium";
  return "is-low";
}

portfolioElements.benchmarkSearchInput?.addEventListener("input", applyBenchmarkFilters);
portfolioElements.benchmarkTierFilter?.addEventListener("change", applyBenchmarkFilters);
loadBenchmarkPortfolio();
