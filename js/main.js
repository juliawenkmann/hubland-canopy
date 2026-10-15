/*
 * Start-up: loads data, creates the map and wires up the controls.
 */
"use strict";

function showFatalError(message) {
  const loadingCard = document.querySelector(".loading-card");
  loadingCard.replaceChildren();
  loadingCard.append(
    popupText("loading-pulse", ""),
    (() => {
      const copy = document.createElement("div");
      copy.append(
        popupText("", t("mapCouldNotStart"), "strong"),
        popupText("", message),
      );
      return copy;
    })(),
  );
}

async function initialise() {
  if (!window.maplibregl) {
    showFatalError(t("mapLibreLoadError"));
    return;
  }

  treeData = loadTreeData();
  await initialiseCloudSync();
  renderStats();
  renderSpeciesChart();
  renderTreeInsights();
  renderFruitDashboard();
  updateDashboardModeUI();
  renderTreeFacets();
  renderLegend("genus");
  updateSelectionStatus();
  renderAnnotationUI();

  map = new maplibregl.Map({
    container: "map",
    style: SATELLITE_STYLE,
    center: [9.975, 49.7855],
    zoom: 15,
    minZoom: 3,
    maxZoom: 20,
    pitch: 0,
    bearing: 0,
    fadeDuration: 250,
    cooperativeGestures: false,
    attributionControl: true,
  });

  map.addControl(
    new maplibregl.NavigationControl({ visualizePitch: true, showCompass: true }),
    "top-right",
  );
  if (window.matchMedia("(max-width: 760px)").matches) {
    // On phones the expanded credits sit under the field buttons; the (i) still opens them.
    const attribution = map.getContainer().querySelector(".maplibregl-ctrl-attrib");
    attribution?.classList.remove("maplibregl-compact-show");
    attribution?.removeAttribute("open");
  }
  applyLanguage({ refreshDynamic: false });

  map.on("load", () => {
    addMapLayers();
    applyMapView();
    fitAllTrees({ instant: true });
    document.getElementById("loading-state").classList.add("is-hidden");
  });

  map.on("error", (event) => {
    console.error("MapLibre error:", event.error || event);
  });
}

document.querySelectorAll("[data-color-mode]").forEach((button) => {
  button.addEventListener("click", () => setColorMode(button.dataset.colorMode));
});

document.querySelectorAll("[data-dashboard-mode]").forEach((button) => {
  button.addEventListener("click", () =>
    setDashboardMode(button.dataset.dashboardMode),
  );
});

document.getElementById("harvest-month").addEventListener("change", (event) => {
  selectedHarvestMonth = Number(event.currentTarget.value);
  renderFruitDashboard();
  applyMapView();
  updateSelectionStatus();
  fitAllTrees();
});

document.getElementById("language-toggle").addEventListener("click", () => {
  setLanguage(currentLanguage === "en" ? "de" : "en");
});

document.getElementById("tree-filter-toggle").addEventListener("click", () => {
  const panel = document.getElementById("tree-filter-panel");
  const toggle = document.getElementById("tree-filter-toggle");
  panel.hidden = !panel.hidden;
  toggle.setAttribute("aria-expanded", String(!panel.hidden));
});

document
  .getElementById("clear-tree-filters")
  .addEventListener("click", clearTreeFacets);

document
  .getElementById("tree-species-search")
  .addEventListener("input", (event) => {
    treeSpeciesSearch = event.currentTarget.value;
    renderTreeFacetOptions("species", campusTreeInventoryFeatures());
  });

document.getElementById("fit-trees").addEventListener("click", () => fitAllTrees());

document.getElementById("place-tree").addEventListener("click", () => {
  if (!manualPlacementMode && requireSignIn()) return;
  setManualPlacement(!manualPlacementMode);
});

document.getElementById("account-toggle").addEventListener("click", () => {
  setAccountPanelOpen(!accountPanelIsOpen());
});

// pointerdown, not click: the click that opens the panel (e.g. Track tree) must not close it.
document.addEventListener("pointerdown", (event) => {
  if (
    accountPanelIsOpen() &&
    !event.target.closest("#account-panel, #account-toggle")
  ) {
    setAccountPanelOpen(false);
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && accountPanelIsOpen()) {
    setAccountPanelOpen(false);
    document.getElementById("account-toggle").focus();
  }
});

document
  .getElementById("mobile-add-tree")
  .addEventListener("click", captureTreeAtCurrentLocation);

document
  .getElementById("export-annotations")
  .addEventListener("click", exportAnnotations);

document.getElementById("cloud-auth-form").addEventListener("submit", (event) => {
  event.preventDefault();
  signIn();
});
document.getElementById("cloud-create-account").addEventListener("click", createAccount);
document.getElementById("cloud-reset-password").addEventListener("click", sendPasswordReset);

document.getElementById("cloud-sign-out").addEventListener("click", () => {
  cloudAuth?.signOut().catch((error) => {
    console.warn("Cloud sign-out failed:", error?.code || error);
  });
});

document
  .getElementById("cloud-import-file")
  .addEventListener("change", async (event) => {
    const input = event.currentTarget;
    await importCloudGeoJson(input.files?.[0]);
    input.value = "";
  });

document.getElementById("panel-toggle").addEventListener("click", (event) => {
  event.stopPropagation();
  setDashboardCollapsed(
    !document.body.classList.contains("panel-collapsed"),
  );
});

document.getElementById("panel-header").addEventListener("click", (event) => {
  if (
    window.matchMedia("(max-width: 760px)").matches &&
    event.target.closest("#panel-toggle") === null &&
    document.body.classList.contains("panel-collapsed")
  ) {
    document.getElementById("panel-toggle").click();
  }
});

window.addEventListener("resize", () => map?.resize());
window.addEventListener("online", () => flushCloudOutbox());
annotationData = loadStoredAnnotations();
applyLanguage({ refreshDynamic: false });
initialise().catch((error) => {
  console.error(error);
  showFatalError(error.message || t("unexpectedError"));
});

if ("serviceWorker" in navigator && window.location.protocol.startsWith("http")) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch((error) => {
      console.warn("Offline support unavailable:", error);
    });
  });
}
