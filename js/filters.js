/*
 * The tree filter panel in the dashboard.
 */
"use strict";

// One-tap filters above the Filters panel; each toggles "only this value".
const QUICK_FILTERS = [
  { id: "unknown-trees-filter", facet: "species", value: "not_recorded" },
  { id: "review-trees-filter", facet: "review", value: "unreviewed" },
];

function toggleOnlyFacetValue(facet, value) {
  const alreadyOnly = singleTreeFacetValue(facet) === value;
  treeFacetSelection[facet].clear();
  if (!alreadyOnly) treeFacetSelection[facet].add(value);
  refreshTreeFilterResults();
}

function renderTreeFacetOptions(facet, allFeatures) {
  const container = document.querySelector(
    `[data-facet-options="${facet}"]`,
  );
  if (!container) return;
  const counts = treeFacetCounts(facet, allFeatures);
  const normalizedSearch = treeSpeciesSearch.trim().toLocaleLowerCase(
    currentLanguage === "de" ? "de" : "en",
  );
  const values = treeFacetValues(facet, allFeatures).filter((value) => {
    if (facet !== "species" || !normalizedSearch) return true;
    return treeFacetLabel(facet, value)
      .toLocaleLowerCase(currentLanguage === "de" ? "de" : "en")
      .includes(normalizedSearch);
  });
  container.replaceChildren();
  values.forEach((value) => {
    const count = counts.get(value) || 0;
    const option = document.createElement("label");
    option.className = "facet-option";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = treeFacetSelection[facet].has(value);
    checkbox.disabled = count === 0 && !checkbox.checked;
    checkbox.setAttribute(
      "aria-label",
      `${treeFacetLabel(facet, value)} (${integerFormatter.format(count)})`,
    );
    checkbox.addEventListener("change", () => {
      setTreeFacetValue(facet, value, checkbox.checked);
    });
    const label = document.createElement("span");
    label.className = "facet-option-label";
    label.textContent = treeFacetLabel(facet, value);
    const countText = document.createElement("span");
    countText.className = "facet-option-count";
    countText.textContent = integerFormatter.format(count);
    option.append(checkbox, label, countText);
    container.appendChild(option);
  });
  if (!values.length) {
    const empty = document.createElement("p");
    empty.className = "facet-empty";
    empty.textContent = t("noFilterResults");
    container.appendChild(empty);
  }
}

function renderActiveTreeFilters() {
  const container = document.getElementById("active-tree-filters");
  if (!container) return;
  container.replaceChildren();
  treeFacetDefinitions().forEach(({ key, labelKey }) => {
    treeFacetSelection[key].forEach((value) => {
      const label = `${t(labelKey)}: ${treeFacetLabel(key, value)}`;
      const chip = document.createElement("button");
      chip.className = "tree-filter-chip";
      chip.type = "button";
      chip.setAttribute("aria-label", t("removeFilter", { filter: label }));
      const text = document.createElement("span");
      text.textContent = label;
      const close = document.createElement("b");
      close.textContent = "×";
      close.setAttribute("aria-hidden", "true");
      chip.append(text, close);
      chip.addEventListener("click", () => setTreeFacetValue(key, value, false));
      container.appendChild(chip);
    });
  });
}

function renderTreeFacets() {
  if (!integerFormatter) return;
  const allFeatures = campusTreeInventoryFeatures();
  treeFacetDefinitions().forEach(({ key }) => {
    const available = new Set(
      allFeatures.map((feature) => treeFacetValue(feature, key)),
    );
    [...treeFacetSelection[key]].forEach((value) => {
      if (!available.has(value)) treeFacetSelection[key].delete(value);
    });
  });
  treeFacetDefinitions().forEach(({ key }) => {
    renderTreeFacetOptions(key, allFeatures);
    const count = document.querySelector(`[data-facet-count="${key}"]`);
    if (count) {
      count.textContent = treeFacetSelection[key].size
        ? integerFormatter.format(treeFacetSelection[key].size)
        : "";
    }
  });
  renderActiveTreeFilters();
  const activeCount = activeTreeFilterCount();
  const badge = document.getElementById("tree-filter-count");
  if (badge) {
    badge.textContent = activeCount
      ? integerFormatter.format(activeCount)
      : "";
    badge.dataset.count = String(activeCount);
  }
  QUICK_FILTERS.forEach(({ id, facet, value }) => {
    const button = document.getElementById(id);
    const count = allFeatures.filter((feature) => treeFacetValue(feature, facet) === value).length;
    const badge = button.querySelector(".tree-filter-count");
    badge.textContent = integerFormatter.format(count);
    badge.dataset.count = String(count);
    button.setAttribute("aria-pressed", String(singleTreeFacetValue(facet) === value));
  });
  const clearButton = document.getElementById("clear-tree-filters");
  if (clearButton) clearButton.disabled = activeCount === 0;
  const toggle = document.getElementById("tree-filter-toggle");
  if (toggle) {
    toggle.setAttribute(
      "aria-label",
      activeCount ? t("selectedFilters", { count: activeCount }) : t("filters"),
    );
  }
  const search = document.getElementById("tree-species-search");
  if (search && search.value !== treeSpeciesSearch) {
    search.value = treeSpeciesSearch;
  }
}

function refreshTreeFilterResults() {
  renderTreeFacets();
  renderLegend(colorMode);
  renderStats();
  renderSpeciesChart();
  renderTreeInsights();
  applyMapView();
  updateSelectionStatus();
}

function setTreeFacetValue(facet, value, selected) {
  if (!treeFacetSelection[facet]) return;
  if (selected) treeFacetSelection[facet].add(value);
  else treeFacetSelection[facet].delete(value);
  refreshTreeFilterResults();
}

function clearTreeFacets() {
  treeFacetDefinitions().forEach(({ key }) => treeFacetSelection[key].clear());
  treeSpeciesSearch = "";
  refreshTreeFilterResults();
}
