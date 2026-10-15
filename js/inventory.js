/*
 * The campus tree inventory: loading, campus scoping and facet classification.
 */
"use strict";

function pointInCampus(coordinates) {
  const [x, y] = coordinates;
  // Inventory, filters and editable records remain scoped to Hubland Nord.
  // Hubland Süd is currently an additional visual campus boundary only.
  const ring = CAMPUS_BOUNDARY.features[0].geometry.coordinates[0];
  let inside = false;
  for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index++) {
    const [xi, yi] = ring[index];
    const [xj, yj] = ring[previous];
    const intersects =
      yi > y !== yj > y &&
      x < ((xj - xi) * (y - yi)) / (yj - yi || Number.EPSILON) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

function loadTreeData() {
  return {
    type: "FeatureCollection",
    features: MUNDRAUB_DATA.features.filter((feature) =>
      pointInCampus(feature.geometry.coordinates),
    ),
  };
}

function campusTreeInventoryFeatures() {
  return annotationData.features.filter((feature) =>
    pointInCampus(feature.geometry.coordinates),
  );
}

function treeTypeKey(feature) {
  return (
    feature?.properties?.common_name ||
    feature?.properties?.scientific_name ||
    ""
  ).trim();
}

function treeHealthKey(feature) {
  const health = feature?.properties?.health;
  return ["good", "fair", "poor", "dead"].includes(health)
    ? health
    : "good";
}

function treeFormKey(feature) {
  return feature?.properties?.tree_type || "not_recorded";
}

function treeSourceKey(feature) {
  const properties = feature?.properties || {};
  const method = String(properties.detection_method || "").toLowerCase();
  if (
    method.includes("openstreetmap") ||
    properties.data_source === "openstreetmap" ||
    properties.osm_id
  ) {
    return "openstreetmap";
  }
  if (
    method === "manual" ||
    properties.data_source === "generic_annotation"
  ) {
    return "manual";
  }
  return "campus";
}

function treeSourceLabel(value) {
  return t(
    {
      openstreetmap: "sourceOpenStreetMap",
      manual: "sourceManual",
      campus: "sourceCampus",
    }[value] || "sourceCampus",
  );
}

function treeFacetValue(feature, facet) {
  if (facet === "species") return treeTypeKey(feature) || "not_recorded";
  if (facet === "genera") {
    return feature?.properties?.genus || "not_recorded";
  }
  if (facet === "health") return treeHealthKey(feature);
  if (facet === "forms") return treeFormKey(feature);
  if (facet === "sources") return treeSourceKey(feature);
  return "not_recorded";
}

function treeFacetLabel(facet, value) {
  if (value === "not_recorded") return t(facet === "species" ? "unknownType" : "notRecorded");
  if (facet === "species") return localizedCommonName(value);
  if (facet === "health") return healthLabel(value);
  if (facet === "forms") return localizedTreeType(value);
  if (facet === "sources") return treeSourceLabel(value);
  return value;
}

function treeFacetDefinitions() {
  return [
    { key: "species", labelKey: "filterTreeSpecies" },
    { key: "genera", labelKey: "filterGenus" },
    { key: "health", labelKey: "filterCondition" },
    { key: "forms", labelKey: "filterGrowthForm" },
    { key: "sources", labelKey: "filterDataSource" },
  ];
}

function treeMatchesSelection(feature, excludedFacet = null) {
  return treeFacetDefinitions().every(({ key }) => {
    if (key === excludedFacet || treeFacetSelection[key].size === 0) {
      return true;
    }
    return treeFacetSelection[key].has(treeFacetValue(feature, key));
  });
}

function filteredTreeInventoryFeatures() {
  return campusTreeInventoryFeatures().filter(treeMatchesSelection);
}

function activeTreeFilterCount() {
  return treeFacetDefinitions().reduce(
    (total, { key }) => total + treeFacetSelection[key].size,
    0,
  );
}

function hasActiveTreeFilters() {
  return activeTreeFilterCount() > 0;
}

function singleTreeFacetValue(facet) {
  return treeFacetSelection[facet].size === 1
    ? [...treeFacetSelection[facet]][0]
    : null;
}

function treeFacetCounts(facet, allFeatures) {
  return allFeatures
    .filter((feature) => treeMatchesSelection(feature, facet))
    .reduce((counts, feature) => {
      const value = treeFacetValue(feature, facet);
      counts.set(value, (counts.get(value) || 0) + 1);
      return counts;
    }, new Map());
}

function treeFacetValues(facet, allFeatures) {
  const values = new Set(
    allFeatures.map((feature) => treeFacetValue(feature, facet)),
  );
  treeFacetSelection[facet].forEach((value) => values.add(value));
  const fixedOrder = {
    health: ["good", "fair", "poor", "dead", "not_recorded"],
    forms: ["Laubbaum", "Strauch", "Obstbaum-Fundort", "not_recorded"],
    sources: ["manual", "openstreetmap", "campus"],
  }[facet];
  if (fixedOrder) {
    return fixedOrder.filter((value) => values.has(value));
  }
  return [...values].sort((first, second) =>
    treeFacetLabel(facet, first).localeCompare(
      treeFacetLabel(facet, second),
      currentLanguage === "de" ? "de" : "en",
    ),
  );
}
