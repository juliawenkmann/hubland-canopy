/*
 * Legend, colour expressions and which trees the map currently shows.
 */
"use strict";

function renderLegend(mode) {
  const legend = document.getElementById("legend");
  const statisticalFeatures = campusTreeInventoryFeatures();
  const availableValues = new Set(
    statisticalFeatures.map((feature) =>
      mode === "health"
        ? treeHealthKey(feature)
        : treeTypeKey(feature) || "not_recorded",
    ),
  );
  const entries =
    mode === "genus"
      ? [
          ...statisticalFeatures.reduce((species, feature) => {
            const key = treeTypeKey(feature) || "not_recorded";
            if (!species.has(key)) {
              species.set(key, {
                key,
                label: treeFacetLabel("species", key),
                color:
                  GENUS_COLORS[feature.properties.genus] || COLOR_FALLBACK,
              });
            }
            return species;
          }, new Map()).values(),
        ].sort((first, second) =>
          first.label.localeCompare(
            second.label,
            currentLanguage === "de" ? "de" : "en",
          ),
        )
      : Object.entries(HEALTH_COLORS)
          .filter(([key]) => availableValues.has(key))
          .map(([key, color]) => ({
            key,
            label: healthLabel(key),
            color,
          }));
  legend.replaceChildren();

  if (mode === "genus") {
    const counts = statisticalFeatures.reduce((totals, feature) => {
      const treeType = treeTypeKey(feature) || "not_recorded";
      totals[treeType] = (totals[treeType] || 0) + 1;
      return totals;
    }, {});

    const treeTypeEntries = [
      [null, t("allTreeTypes"), null, statisticalFeatures.length],
      ...entries.map(({ key, label, color }) => [
        key,
        label,
        color,
        counts[key],
      ]),
    ];

    treeTypeEntries.forEach(([treeType, label, color, count]) => {
      const item = document.createElement("button");
      item.className = "legend-item legend-button";
      item.type = "button";
      item.setAttribute(
        "aria-pressed",
        String(
          treeType
            ? treeFacetSelection.species.has(treeType)
            : treeFacetSelection.species.size === 0,
        ),
      );
      item.setAttribute(
        "aria-label",
        treeType
          ? t("showOnlyTreeType", { type: label })
          : t("showAllTreeTypes"),
      );

      const swatch = document.createElement("span");
      swatch.className = `legend-swatch${treeType ? "" : " all"}`;
      if (color) swatch.style.background = color;

      const text = document.createElement("span");
      text.className = "legend-label";
      text.textContent = label;

      const countText = document.createElement("span");
      countText.className = "legend-count";
      countText.textContent = integerFormatter.format(count);

      item.append(swatch, text, countText);
      item.addEventListener("click", () => setTreeTypeFilter(treeType));
      legend.appendChild(item);
    });
  } else {
    entries.forEach(({ label, color }) => {
      const item = document.createElement("div");
      item.className = "legend-item";
      const swatch = document.createElement("span");
      swatch.className = "legend-swatch";
      swatch.style.background = color;
      const text = document.createElement("span");
      text.className = "legend-label";
      text.textContent = label;
      item.append(swatch, text);
      legend.appendChild(item);
    });
  }

  [
    ["north", "campusBoundaryNorth"],
    ["south", "campusBoundarySouth"],
  ].forEach(([campusArea, labelKey]) => {
    const boundaryItem = document.createElement("div");
    boundaryItem.className = "legend-item";
    const boundarySwatch = document.createElement("span");
    boundarySwatch.className = `legend-swatch boundary boundary-${campusArea}`;
    const boundaryLabel = document.createElement("span");
    boundaryLabel.className = "legend-label";
    boundaryLabel.textContent = t(labelKey);
    boundaryItem.append(boundarySwatch, boundaryLabel);
    legend.appendChild(boundaryItem);
  });

  if (mode === "health" && availableValues.has("not_recorded")) {
    const note = document.createElement("p");
    note.className = "legend-note";
    note.textContent = t("healthDataNote");
    legend.appendChild(note);
  }

  legend.setAttribute(
    "aria-label",
    t("legendSummary", {
      mode: t(mode === "genus" ? "treeSpeciesColor" : "health"),
      items: entries.map(({ label }) => label).join(", "),
    }),
  );
}

function matchColorExpression(property, colors) {
  return ["match", ["get", property], ...Object.entries(colors).flat(), COLOR_FALLBACK];
}

function treeColorExpression() {
  const health = singleTreeFacetValue("health");
  if (health) return HEALTH_COLORS[health];
  return colorMode === "genus"
    ? matchColorExpression("genus", GENUS_COLORS)
    : matchColorExpression("health", HEALTH_COLORS);
}

function applyMapView() {
  if (!map?.getSource("trees")) return;
  const treesMode = dashboardMode === "trees";
  map.getSource("trees").setData({
    type: "FeatureCollection",
    features: treesMode ? annotationData.features.filter(treeMatchesSelection) : [],
  });
  map.getSource("fruit").setData({ type: "FeatureCollection", features: visibleFruitFeatures() });
  map.setPaintProperty("tree-points", "circle-color", treeColorExpression());
  map.setPaintProperty(
    "fruit-clusters",
    "circle-color",
    FRUIT_CATALOG.find((fruit) => fruit.id === selectedFruitType)?.color || "#8d6046",
  );
  TREE_LAYERS.forEach((layer) => map.setLayoutProperty(layer, "visibility", treesMode ? "visible" : "none"));
  FRUIT_LAYERS.forEach((layer) => map.setLayoutProperty(layer, "visibility", treesMode ? "none" : "visible"));
}

function updateSelectionStatus() {
  if (dashboardMode === "food") return;
  document.getElementById("color-description").textContent = hasActiveTreeFilters()
    ? t("selectedFilters", { count: integerFormatter.format(activeTreeFilterCount()) })
    : t(colorMode === "genus" ? "byGenus" : "health");
}

function setTreeTypeFilter(treeType) {
  if (treeType) {
    toggleQuickFilter({ facet: "species", values: [treeType] });
  } else {
    treeFacetSelection.species.clear();
    refreshTreeFilterResults();
  }
}

function setColorMode(mode) {
  colorMode = mode;
  document.querySelectorAll("[data-color-mode]").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.colorMode === mode));
  });
  updateSelectionStatus();
  renderLegend(mode);
  applyMapView();
}

function fitAllTrees(options = {}) {
  if (!map) return;
  const bounds = new maplibregl.LngLatBounds();
  const visible = dashboardMode === "food" ? visibleFruitFeatures() : filteredTreeInventoryFeatures();
  visible.forEach((feature) => bounds.extend(feature.geometry.coordinates));
  CAMPUS_BOUNDARY.features[0].geometry.coordinates[0].forEach((point) => bounds.extend(point));
  const mobile = window.matchMedia("(max-width: 760px)").matches;
  const mapBottom = map.getContainer().getBoundingClientRect().bottom;
  const dashboardTop = document.querySelector(".dashboard")?.getBoundingClientRect().top || mapBottom;
  const bottom = document.body.classList.contains("panel-collapsed")
    ? 92
    : Math.ceil(Math.max(110, mapBottom - dashboardTop + 18));
  map.fitBounds(bounds, {
    padding: mobile
      ? { top: 88, right: 34, bottom, left: 34 }
      : { top: 86, right: 80, bottom: 72, left: 400 },
    maxZoom: 17,
    duration: options.instant ? 0 : 950,
  });
}
