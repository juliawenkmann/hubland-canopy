/*
 * Field mode: add a tree at the phone's GPS position or by tapping the map.
 */
"use strict";

function setMobileFieldStatus(
  key,
  variables = {},
  isError = false,
  persistent = false,
) {
  const status = document.getElementById("mobile-field-status");
  window.clearTimeout(mobileFieldStatusTimer);
  status.textContent = t(key, variables);
  status.classList.add("is-visible");
  status.classList.toggle("is-error", isError);
  if (!persistent) {
    mobileFieldStatusTimer = window.setTimeout(() => {
      status.classList.remove("is-visible", "is-error");
    }, 4600);
  }
}

function clearMobileFieldStatus() {
  window.clearTimeout(mobileFieldStatusTimer);
  document
    .getElementById("mobile-field-status")
    .classList.remove("is-visible", "is-error");
}

function setManualPlacement(enabled) {
  manualPlacementMode = Boolean(enabled);
  if (map) {
    map.getCanvas().style.cursor = manualPlacementMode ? "crosshair" : "";
  }
  setAnnotationStatus(
    manualPlacementMode ? "placementHint" : "placementCancelled",
  );
}

function localSurveyDate() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function useMapPlacementFallback(statusKey = "gpsFallback") {
  locatingTree = false;
  setManualPlacement(true);
  setAnnotationStatus(statusKey, {}, true);
  setMobileFieldStatus(statusKey, {}, true, true);
}

function captureTreeAtCurrentLocation() {
  if (locatingTree) return;
  if (manualPlacementMode) {
    setManualPlacement(false);
    clearMobileFieldStatus();
    return;
  }
  if (requireSignIn()) return;

  if (dashboardMode !== "trees") setDashboardMode("trees");
  setDashboardCollapsed(true);

  if (!navigator.geolocation) {
    useMapPlacementFallback();
    return;
  }

  locatingTree = true;
  renderAnnotationUI();
  setMobileFieldStatus("locatingTree", {}, false, true);
  navigator.geolocation.getCurrentPosition(
    (position) => {
      locatingTree = false;
      const coordinates = [
        position.coords.longitude,
        position.coords.latitude,
      ];
      if (!pointInCampus(coordinates)) {
        map.easeTo({ center: coordinates, zoom: 17, duration: 650 });
        useMapPlacementFallback("gpsOutside");
        return;
      }

      const accuracy = Math.max(
        1,
        Math.round(Number(position.coords.accuracy) || 1),
      );
      map.easeTo({ center: coordinates, zoom: 18, duration: 650 });
      setMobileFieldStatus("gpsAdded", { accuracy });
      addManualAnnotation(coordinates, {
        detectionMethod: "gps",
        accuracy,
      });
    },
    () => useMapPlacementFallback(),
    {
      enableHighAccuracy: true,
      timeout: 12000,
      maximumAge: 5000,
    },
  );
}
