/*
 * Reading and writing tree records in this browser's localStorage.
 */
"use strict";

function readStoredTrees(storageKey) {
  try {
    const features = JSON.parse(localStorage.getItem(storageKey))?.features;
    return Array.isArray(features)
      ? features.filter(
          (feature) =>
            feature?.geometry?.type === "Point" &&
            feature.properties?.id &&
            // Machine-detected candidates from an early experiment, never real trees.
            !["satellite-color-texture-v1", "ai-manual-visual-review-v1"].includes(
              feature.properties.detection_method,
            ),
        )
      : [];
  } catch {
    return [];
  }
}

// The current list wins; older copies only add trees it doesn't have.
function loadStoredAnnotations() {
  const trees = new Map();
  const deleted = new Set(
    loadCloudOutbox().filter((entry) => entry.type === "delete").map((entry) => entry.id),
  );
  [ANNOTATION_STORAGE_KEY, ...LEGACY_TREE_STORAGE_KEYS].forEach((storageKey) => {
    readStoredTrees(storageKey).forEach((feature) => {
      const id = String(feature.properties.id);
      if (!trees.has(id) && !deleted.has(id)) trees.set(id, feature);
    });
  });
  return { type: "FeatureCollection", features: [...trees.values()] };
}

function persistAnnotations() {
  try {
    localStorage.setItem(ANNOTATION_STORAGE_KEY, JSON.stringify(annotationData));
  } catch (error) {
    console.warn("Could not persist annotations:", error);
  }
}

function loadCloudOutbox() {
  try {
    const stored = JSON.parse(localStorage.getItem(CLOUD_OUTBOX_STORAGE_KEY));
    return Array.isArray(stored) ? stored : [];
  } catch {
    return [];
  }
}

function persistCloudOutbox(outbox) {
  try {
    localStorage.setItem(CLOUD_OUTBOX_STORAGE_KEY, JSON.stringify(outbox));
  } catch (error) {
    console.warn("Could not persist cloud outbox:", error);
  }
}
