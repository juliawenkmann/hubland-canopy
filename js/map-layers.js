/*
 * MapLibre sources and layers: the campus boundary, your trees and the fruit
 * locations. Each set clusters when zoomed out; points have a larger invisible
 * tap target so they are easy to hit on a phone.
 */
"use strict";

const TREE_LAYERS = ["tree-cluster-halo", "tree-clusters", "tree-cluster-count", "tree-points", "tree-targets"];
const FRUIT_LAYERS = ["fruit-cluster-halo", "fruit-clusters", "fruit-cluster-count", "fruit-points", "fruit-targets"];

function addClusterLayers(prefix, source, color) {
  const clustered = ["has", "point_count"];
  map.addLayer({
    id: `${prefix}-cluster-halo`,
    type: "circle",
    source,
    filter: clustered,
    paint: {
      "circle-color": "rgba(251, 248, 236, 0.8)",
      "circle-radius": ["step", ["get", "point_count"], 22, 12, 27, 35, 33],
      "circle-blur": 0.15,
    },
  });
  map.addLayer({
    id: `${prefix}-clusters`,
    type: "circle",
    source,
    filter: clustered,
    paint: {
      "circle-color": color,
      "circle-radius": ["step", ["get", "point_count"], 17, 12, 22, 35, 28],
      "circle-stroke-color": "#fbf7e8",
      "circle-stroke-width": 1.8,
    },
  });
  map.addLayer({
    id: `${prefix}-cluster-count`,
    type: "symbol",
    source,
    filter: clustered,
    layout: {
      "text-field": ["get", "point_count_abbreviated"],
      "text-font": ["Noto Sans Regular"],
      "text-size": 11,
    },
    paint: { "text-color": "#ffffff" },
  });
}

function addPointLayers(prefix, source, paint) {
  const single = ["!", ["has", "point_count"]];
  map.addLayer({ id: `${prefix}-points`, type: "circle", source, filter: single, paint });
  map.addLayer({
    id: `${prefix}-targets`,
    type: "circle",
    source,
    filter: single,
    paint: { "circle-radius": 20, "circle-color": "rgba(255, 255, 255, 0.01)" },
  });
}

function addMapLayers() {
  map.addSource("campus-boundary", {
    type: "geojson",
    data: CAMPUS_BOUNDARY,
    attribution:
      'Campus boundary &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap contributors</a>',
  });
  const southOr = (south, north) => ["match", ["get", "campus_area"], "south", south, north];
  map.addLayer({
    id: "campus-boundary-fill",
    type: "fill",
    source: "campus-boundary",
    paint: { "fill-color": southOr("#d3a66c", "#8dd08b"), "fill-opacity": 0.12 },
  });
  map.addLayer({
    id: "campus-boundary-outline",
    type: "line",
    source: "campus-boundary",
    paint: {
      "line-color": southOr("#ffd7a0", "#e7f7d5"),
      "line-width": ["interpolate", ["linear"], ["zoom"], 12, 1.8, 18, 4],
      "line-opacity": 0.96,
      "line-dasharray": [2.2, 1.4],
    },
  });

  const empty = { type: "FeatureCollection", features: [] };
  map.addSource("trees", { type: "geojson", data: empty, cluster: true, clusterMaxZoom: 16, clusterRadius: 42 });
  map.addSource("fruit", { type: "geojson", data: empty, cluster: true, clusterMaxZoom: 14, clusterRadius: 46 });

  addClusterLayers("tree", "trees", ["step", ["get", "point_count"], "#4d724c", 12, "#315837", 35, "#18321f"]);
  addPointLayers("tree", "trees", {
    "circle-radius": ["interpolate", ["linear"], ["zoom"], 14, 6, 18, 10],
    "circle-color": treeColorExpression(),
    "circle-opacity": 0.94,
    "circle-stroke-color": "#fbf7e8",
    // Reviewed trees get a heavier ring.
    "circle-stroke-width": ["case", ["==", ["get", "review_status"], "reviewed"], 3, 1.6],
  });
  addClusterLayers("fruit", "fruit", "#8d6046");
  addPointLayers("fruit", "fruit", {
    "circle-radius": ["interpolate", ["linear"], ["zoom"], 10, 5, 18, 11],
    "circle-color": matchColorExpression("fruit_category", FRUIT_COLORS),
    "circle-opacity": 0.98,
    "circle-stroke-width": 2.2,
    "circle-stroke-color": "#fff8ef",
  });

  [
    ["tree-clusters", "trees"],
    ["fruit-clusters", "fruit"],
  ].forEach(([layer, source]) => {
    map.on("click", layer, async (event) => {
      if (manualPlacementMode) return;
      const cluster = event.features[0];
      const zoom = await map.getSource(source).getClusterExpansionZoom(cluster.properties.cluster_id);
      map.easeTo({ center: cluster.geometry.coordinates, zoom, duration: 650 });
    });
  });
  [
    ["tree-targets", () => annotationData.features],
    ["fruit-targets", () => treeData.features],
  ].forEach(([layer, features]) => {
    map.on("click", layer, (event) => {
      if (manualPlacementMode) return;
      const id = closestTreeFromEvent(event)?.properties.id;
      const feature = features().find((item) => String(item.properties.id) === String(id));
      if (feature) showTreePopup(feature);
    });
  });
  ["tree-clusters", "tree-targets", "fruit-clusters", "fruit-targets"].forEach((layer) => {
    map.on("mouseenter", layer, () => {
      if (!manualPlacementMode) map.getCanvas().style.cursor = "pointer";
    });
    map.on("mouseleave", layer, () => {
      map.getCanvas().style.cursor = manualPlacementMode ? "crosshair" : "";
    });
  });

  map.on("click", (event) => {
    if (!manualPlacementMode) return;
    if (map.queryRenderedFeatures(event.point, { layers: ["tree-clusters", "tree-targets"] }).length) {
      return;
    }
    const coordinates = [event.lngLat.lng, event.lngLat.lat];
    if (!pointInCampus(coordinates)) {
      setAnnotationStatus("placementOutside", {}, true);
      return;
    }
    addManualAnnotation(coordinates);
  });
}
