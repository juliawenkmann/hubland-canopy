/*
 * Creating, editing, deleting and exporting editable tree records.
 */
"use strict";

function syncAnnotationSource() {
  renderTreeFacets();
  renderStats();
  renderSpeciesChart();
  renderTreeInsights();
  renderLegend(colorMode);
  applyMapView();
  updateSelectionStatus();
  renderAnnotationUI();
}

function setAnnotationStatus(key, variables = {}, isError = false) {
  annotationStatus = { key, variables, isError };
  renderAnnotationUI();
}

function renderAnnotationUI() {
  const count = annotationData.features.length;
  document.getElementById("annotation-count").textContent = t("annotationsCount", {
    count: integerFormatter.format(count),
  });

  const placeButton = document.getElementById("place-tree");
  placeButton.classList.toggle("is-active", manualPlacementMode);
  placeButton.textContent = t(
    manualPlacementMode ? "cancelPlacement" : "placeTree",
  );
  placeButton.setAttribute("aria-pressed", String(manualPlacementMode));

  const status = document.getElementById("annotation-status");
  status.textContent = t(annotationStatus.key, annotationStatus.variables);
  status.classList.toggle("is-error", annotationStatus.isError);

  const mobileAddButton = document.getElementById("mobile-add-tree");
  const mobileAddLabel = mobileAddButton.querySelector(
    "[data-field-add-label]",
  );
  mobileAddButton.disabled = locatingTree;
  mobileAddLabel.textContent = t(
    locatingTree
      ? "locatingTree"
      : manualPlacementMode
        ? "tapTreeLocation"
        : "quickAddTree",
  );
  mobileAddButton.setAttribute("aria-label", t("quickAddTreeAria"));
}

function createAnnotationFeature(coordinates, detectionMethod) {
  const createdAt = new Date().toISOString();
  const id = `annotation-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
  return {
    type: "Feature",
    geometry: {
      type: "Point",
      coordinates: coordinates.map(Number),
    },
    properties: {
      id,
      common_name: "",
      scientific_name: "",
      scientific_synonym: "",
      genus: "",
      tree_type: "",
      edible: false,
      flowering: false,
      fruit_category: "",
      trunk_circumference_cm: null,
      dbh_cm: null,
      height_m: null,
      canopy_spread_m: null,
      health: "good",
      co2_stored_kg: null,
      co2_per_year_kg: null,
      stormwater_l_per_year: null,
      date_surveyed: null,
      photo_url: "",
      notes: "",
      review_status: "unreviewed",
      detection_method: detectionMethod,
      data_source: "generic_annotation",
      source_name: "Manual map annotation",
      source_url: null,
      source_license: null,
      created_at: createdAt,
      updated_at: createdAt,
    },
  };
}

function addManualAnnotation(
  coordinates,
  { detectionMethod = "manual", accuracy = null } = {},
) {
  if (cloudConfigured && !cloudUser) {
    setCloudStatus("online", "cloudViewOnly", "cloudSignedOut");
    return;
  }
  const feature = createAnnotationFeature(coordinates, detectionMethod);
  feature.properties.date_surveyed = localSurveyDate();
  if (detectionMethod === "gps") {
    feature.properties.location_accuracy_m = accuracy;
    feature.properties.source_name = "iPhone GPS field observation";
  }
  annotationData = {
    ...annotationData,
    features: [...annotationData.features, feature],
  };
  persistAnnotations();
  syncAnnotationSource();
  queueCloudOperation("upsert", feature);
  manualPlacementMode = false;
  map.getCanvas().style.cursor = "";
  if (detectionMethod === "manual") clearMobileFieldStatus();
  setAnnotationStatus(
    detectionMethod === "gps" ? "gpsAdded" : "manualAdded",
    detectionMethod === "gps" ? { accuracy } : {},
  );
  openAnnotationEditor(feature);
}

function updateAnnotation(updatedFeature) {
  if (cloudConfigured && !cloudUser) {
    setCloudStatus("online", "cloudViewOnly", "cloudSignedOut");
    return;
  }
  annotationData = {
    ...annotationData,
    features: annotationData.features.map((feature) =>
      feature.properties.id === updatedFeature.properties.id
        ? updatedFeature
        : feature,
    ),
  };
  persistAnnotations();
  syncAnnotationSource();
  queueCloudOperation("upsert", updatedFeature);
}

function deleteAnnotation(id) {
  if (cloudConfigured && !cloudUser) {
    setCloudStatus("online", "cloudViewOnly", "cloudSignedOut");
    return;
  }
  const deletedFeature = annotationData.features.find(
    (feature) => feature.properties.id === id,
  );
  annotationData = {
    ...annotationData,
    features: annotationData.features.filter(
      (feature) => feature.properties.id !== id,
    ),
  };
  persistAnnotations();
  syncAnnotationSource();
  if (deletedFeature) queueCloudOperation("delete", deletedFeature);
  if (activePopup) activePopup.remove();
  setAnnotationStatus("annotationDeleted");
}

async function exportAnnotations() {
  if (!annotationData.features.length) {
    setAnnotationStatus("exportEmpty");
    return;
  }
  const exportData = {
    ...annotationData,
    exported_at: new Date().toISOString(),
    // Part of the baseline came from OpenStreetMap.
    attribution: "© OpenStreetMap contributors",
    licence: "ODbL 1.0",
  };
  const contents = JSON.stringify(exportData, null, 2);
  const fileName = "hubland-generic-tree-annotations.geojson";
  const file = new File([contents], fileName, {
    type: "application/geo+json",
  });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        title: t("shareExportTitle"),
        text: t("shareExportText"),
      });
      setAnnotationStatus("exportReady", {
        count: integerFormatter.format(annotationData.features.length),
      });
      return;
    } catch (error) {
      if (error?.name === "AbortError") return;
      console.warn("Could not share annotations:", error);
    }
  }
  const blob = new Blob([contents], { type: "application/geo+json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
  setAnnotationStatus("exportReady", {
    count: integerFormatter.format(annotationData.features.length),
  });
}
