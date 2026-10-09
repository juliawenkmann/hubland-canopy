/*
 * Dashboard panel: stats, charts, collapsing and the trees / fruit mode switch.
 */
"use strict";

function updatePanelToggleLabel() {
  const panelToggle = document.getElementById("panel-toggle");
  const collapsed = document.body.classList.contains("panel-collapsed");
  panelToggle.setAttribute(
    "aria-label",
    t(collapsed ? "expandDashboard" : "collapseDashboard"),
  );
}

function setDashboardCollapsed(collapsed) {
  document.body.classList.toggle("panel-collapsed", Boolean(collapsed));
  const panelToggle = document.getElementById("panel-toggle");
  panelToggle.setAttribute("aria-expanded", String(!collapsed));
  updatePanelToggleLabel();
  window.setTimeout(() => map?.resize(), 370);
}

function calculateStats() {
  const features = filteredTreeInventoryFeatures();
  const measuredHeights = features
    .map((feature) => number(feature.properties.height_m))
    .filter((height) => height > 0);
  const canopyAreas = features
    .map((feature) => number(feature.properties.canopy_spread_m))
    .filter((spread) => spread > 0)
    .map((spread) => Math.PI * (spread / 2) ** 2);
  return {
    totalTrees: features.length,
    speciesCount: new Set(
      features
        .map(
          (feature) =>
            feature.properties.common_name ||
            feature.properties.scientific_name ||
            feature.properties.genus,
        )
        .filter(Boolean),
    ).size,
    averageHeight: measuredHeights.length
      ? measuredHeights.reduce((sum, height) => sum + height, 0) /
        measuredHeights.length
      : null,
    canopyArea: canopyAreas.length
      ? canopyAreas.reduce((sum, area) => sum + area, 0)
      : null,
  };
}

function renderStats() {
  const stats = calculateStats();
  document.getElementById("total-trees").textContent = integerFormatter.format(
    stats.totalTrees,
  );
  document.getElementById("species-count").textContent = integerFormatter.format(
    stats.speciesCount,
  );
  document.getElementById("average-height").textContent =
    stats.averageHeight === null
      ? "—"
      : decimalFormatter.format(stats.averageHeight);
  document.getElementById("total-canopy").textContent =
    stats.canopyArea === null
      ? "—"
      : integerFormatter.format(stats.canopyArea);
}

function renderSpeciesChart() {
  const counts = filteredTreeInventoryFeatures().reduce((totals, feature) => {
    const name = localizedCommonName(feature.properties);
    totals[name] = (totals[name] || 0) + 1;
    return totals;
  }, {});

  const topSpecies = Object.entries(counts)
    .sort(
      (a, b) =>
        b[1] - a[1] ||
        a[0].localeCompare(b[0], currentLanguage === "de" ? "de" : "en"),
    )
    .slice(0, 5);
  const maxCount = Math.max(...topSpecies.map(([, count]) => count), 1);
  const chart = document.getElementById("species-chart");
  chart.replaceChildren();

  topSpecies.forEach(([name, count]) => {
    const row = document.createElement("div");
    row.className = "bar-row";

    const label = document.createElement("span");
    label.className = "bar-label";
    label.title = name;
    label.textContent = name;

    const track = document.createElement("span");
    track.className = "bar-track";
    const fill = document.createElement("span");
    fill.className = "bar-fill";
    track.appendChild(fill);

    const value = document.createElement("span");
    value.className = "bar-value";
    value.textContent = integerFormatter.format(count);

    row.append(label, track, value);
    chart.appendChild(row);
    requestAnimationFrame(() => {
      fill.style.width = `${(count / maxCount) * 100}%`;
    });
  });

  chart.setAttribute(
    "aria-label",
    t("chartSummary", {
      label: t("chartAria"),
      items: topSpecies
        .map(([name, count]) => `${name}, ${integerFormatter.format(count)}`)
        .join("; "),
    }),
  );
}

function populateBarChart(container, rows, ariaLabel, emptyText = "") {
  container.replaceChildren();
  if (!rows.length) {
    const empty = document.createElement("p");
    empty.className = "insight-empty";
    empty.textContent = emptyText;
    container.appendChild(empty);
    container.setAttribute("aria-label", `${ariaLabel}. ${emptyText}`);
    return;
  }

  const maxCount = Math.max(...rows.map((row) => row.count), 1);
  rows.forEach(({ label, count, color }) => {
    const row = document.createElement("div");
    row.className = "bar-row";

    const labelElement = document.createElement("span");
    labelElement.className = "bar-label";
    labelElement.title = label;
    labelElement.textContent = label;

    const track = document.createElement("span");
    track.className = "bar-track";
    const fill = document.createElement("span");
    fill.className = "bar-fill";
    if (color) fill.style.background = color;
    track.appendChild(fill);

    const value = document.createElement("span");
    value.className = "bar-value";
    value.textContent = integerFormatter.format(count);

    row.append(labelElement, track, value);
    container.appendChild(row);
    requestAnimationFrame(() => {
      fill.style.width = `${(count / maxCount) * 100}%`;
    });
  });

  container.setAttribute(
    "aria-label",
    `${ariaLabel}: ${rows
      .map(({ label, count }) => `${label}, ${integerFormatter.format(count)}`)
      .join("; ")}`,
  );
}

function treeInsightFeatures() {
  return filteredTreeInventoryFeatures();
}

function renderHealthSummary() {
  const healthKeys = ["good", "fair", "poor", "dead"];
  const counts = Object.fromEntries(healthKeys.map((key) => [key, 0]));
  treeInsightFeatures().forEach((feature) => {
    const value = treeHealthKey(feature);
    counts[value] += 1;
  });
  const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
  const recorded = total;
  document.getElementById("health-record-count").textContent = t(
    "healthRecordsRecorded",
    { count: integerFormatter.format(recorded) },
  );

  const container = document.getElementById("health-summary");
  container.replaceChildren();
  const meter = document.createElement("div");
  meter.className = "health-meter";
  meter.setAttribute("aria-hidden", "true");
  healthKeys.forEach((key) => {
    if (!counts[key]) return;
    const segment = document.createElement("span");
    segment.style.width = `${(counts[key] / Math.max(total, 1)) * 100}%`;
    segment.style.background = HEALTH_COLORS[key];
    meter.appendChild(segment);
  });
  container.appendChild(meter);

  const chart = document.createElement("div");
  chart.className = "bar-chart";
  const rows = healthKeys
    .filter((key) => counts[key] > 0)
    .map((key) => ({
      label: healthLabel(key),
      count: counts[key],
      color: HEALTH_COLORS[key],
    }));
  populateBarChart(chart, rows, t("healthChartAria"));
  container.appendChild(chart);
  container.setAttribute(
    "aria-label",
    `${t("healthChartAria")}: ${rows
      .map(({ label, count }) => `${label}, ${integerFormatter.format(count)}`)
      .join("; ")}`,
  );
}

function renderTreeInsights() {
  if (!integerFormatter) return;
  renderHealthSummary();
}

function updateDashboardModeUI() {
  document.body.classList.toggle(
    "food-mode",
    dashboardMode === "food",
  );
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute(
      "content",
      dashboardMode === "food" ? "#f5e8df" : "#f2f0e4",
    );
  document.querySelectorAll("[data-dashboard-mode]").forEach((button) => {
    const active = button.dataset.dashboardMode === dashboardMode;
    button.setAttribute("aria-selected", String(active));
    button.tabIndex = 0;
  });
  document.querySelectorAll("[data-dashboard-panel]").forEach((panel) => {
    panel.hidden = panel.dataset.dashboardPanel !== dashboardMode;
  });
  document.querySelectorAll("[data-tree-only]").forEach((element) => {
    element.hidden = dashboardMode !== "trees";
  });
  const fitButton = document.getElementById("fit-trees");
  fitButton.setAttribute(
    "aria-label",
    t(dashboardMode === "food" ? "fitFruitLocations" : "fitTrees"),
  );
  fitButton.querySelector("span").textContent = t(
    dashboardMode === "food" ? "viewFruitLocations" : "viewAllTrees",
  );
}

function setDashboardMode(mode) {
  dashboardMode = mode === "food" ? "food" : "trees";
  if (dashboardMode === "food" && manualPlacementMode) {
    manualPlacementMode = false;
    if (map) map.getCanvas().style.cursor = "";
  }
  updateDashboardModeUI();
  renderTreeInsights();
  renderFruitDashboard();
  applyMapView();
  updateSelectionStatus();
  if (dashboardMode === "food") fitAllTrees();
}
