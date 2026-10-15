/*
 * Storage keys and the mutable application state shared by all modules.
 */
"use strict";

const ANNOTATION_STORAGE_KEY = "hubland-generic-tree-annotations-v1";
const CLOUD_OUTBOX_STORAGE_KEY = "hubland-tree-cloud-outbox-v1";
// Written by older versions; still read so trees saved there are never lost.
const LEGACY_TREE_STORAGE_KEYS = [
  "hubland-tree-cloud-migration-v1",
  "hubland-tree-local-recovery-v1",
];

let currentLanguage = (() => {
  try {
    return localStorage.getItem("hubland-language") === "de" ? "de" : "en";
  } catch {
    return "en";
  }
})();
let integerFormatter;
let decimalFormatter;
let map;
let treeData = { type: "FeatureCollection", features: [] };
let colorMode = "genus";
const treeFacetSelection = {
  species: new Set(),
  genera: new Set(),
  health: new Set(),
  forms: new Set(),
  sources: new Set(),
};
let treeSpeciesSearch = "";
let dashboardMode = "trees";
let selectedHarvestMonth = new Date().getMonth() + 1;
let selectedFruitType = null;
let activePopup = null;
let activePopupFeature = null;
let activeAnnotationId = null;
let activePopupRestoresPanel = false;
let annotationData = { type: "FeatureCollection", features: [] };
let annotationStatus = { key: "annotationReady", variables: {}, isError: false };
let manualPlacementMode = false;
let mobileFieldStatusTimer = null;
let cloudConfigured = false;
let cloudDb = null;
let cloudAuth = null;
let cloudUser = null;
let cloudFlushPromise = null;
let cloudStatus = {
  state: "offline",
  badgeKey: "cloudLocalOnly",
  messageKey: "cloudNotConfigured",
  variables: {},
  isError: false,
};
