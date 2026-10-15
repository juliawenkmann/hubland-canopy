/*
 * Field mode: place a tree precisely. A cross sits in the middle of the map and
 * the tree is saved exactly there. "Track tree" makes the map follow your GPS
 * position until you move it yourself, so you can nudge the cross onto the
 * trunk in the aerial photo; "Place tree" starts from the current view.
 */
"use strict";

const PLACEMENT_ZOOM = 19; // the aerial photos (DOP40) are sharpest up to here

let placement = null; // { followGps, watchId, fix, moved, gpsFailed }

function setMobileFieldStatus(key, variables = {}, isError = false) {
  const status = document.getElementById("mobile-field-status");
  window.clearTimeout(mobileFieldStatusTimer);
  status.textContent = t(key, variables);
  status.classList.add("is-visible");
  status.classList.toggle("is-error", isError);
  mobileFieldStatusTimer = window.setTimeout(() => {
    status.classList.remove("is-visible", "is-error");
  }, 4600);
}

function localSurveyDate() {
  const date = new Date();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function placementCenter() {
  const center = map.getCenter();
  return [center.lng, center.lat];
}

function renderPlacement() {
  if (!placement) return;
  const outside = !pointInCampus(placementCenter());
  const hint = outside
    ? t("placementOutside")
    : placement.followGps && placement.gpsFailed && !placement.moved
      ? t("gpsFallback")
      : placement.followGps && !placement.fix && !placement.moved
        ? t("locatingTree")
        : t("placementHint");
  const accuracy = placement.fix ? ` · ${t("gpsAccuracy", { accuracy: placement.fix.accuracy })}` : "";
  const hintElement = document.getElementById("placement-hint");
  hintElement.textContent = hint + accuracy;
  hintElement.classList.toggle("is-error", outside);
  document.getElementById("placement-save").disabled = outside;
}

// A blue dot plus its accuracy circle, like in map apps.
function showGpsPosition(fix) {
  const source = map?.getSource("gps");
  if (!source) return;
  if (!fix) {
    source.setData({ type: "FeatureCollection", features: [] });
    return;
  }
  const [lng, lat] = fix.coordinates;
  const ring = Array.from({ length: 49 }, (_, index) => {
    const angle = (index / 48) * 2 * Math.PI;
    return [
      lng + (fix.accuracy * Math.cos(angle)) / (111320 * Math.cos((lat * Math.PI) / 180)),
      lat + (fix.accuracy * Math.sin(angle)) / 110540,
    ];
  });
  source.setData({
    type: "FeatureCollection",
    features: [
      { type: "Feature", geometry: { type: "Polygon", coordinates: [ring] }, properties: {} },
      { type: "Feature", geometry: { type: "Point", coordinates: fix.coordinates }, properties: {} },
    ],
  });
}

function startPlacement({ followGps }) {
  if (placement || requireSignIn()) return;
  if (dashboardMode !== "trees") setDashboardMode("trees");
  if (window.matchMedia("(max-width: 760px)").matches) setDashboardCollapsed(true);
  activePopup?.remove();
  placement = { followGps, watchId: null, fix: null, moved: false, gpsFailed: false };
  manualPlacementMode = true;
  document.body.classList.add("is-placing");
  document.getElementById("placement").hidden = false;
  if (followGps && navigator.geolocation) {
    placement.watchId = navigator.geolocation.watchPosition(
      (position) => {
        if (!placement) return;
        placement.fix = {
          coordinates: [position.coords.longitude, position.coords.latitude],
          accuracy: Math.max(1, Math.round(position.coords.accuracy || 0)),
        };
        placement.gpsFailed = false;
        showGpsPosition(placement.fix);
        if (!placement.moved) {
          map.easeTo({ center: placement.fix.coordinates, zoom: PLACEMENT_ZOOM, duration: 600 });
        }
        renderPlacement();
      },
      () => {
        if (!placement) return;
        placement.gpsFailed = true;
        renderPlacement();
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 },
    );
  } else {
    placement.gpsFailed = followGps;
    map.easeTo({ zoom: Math.max(map.getZoom(), PLACEMENT_ZOOM - 1), duration: 500 });
  }
  renderPlacement();
  renderAnnotationUI();
}

function stopPlacement() {
  if (!placement) return;
  if (placement.watchId !== null) navigator.geolocation.clearWatch(placement.watchId);
  placement = null;
  manualPlacementMode = false;
  document.body.classList.remove("is-placing");
  document.getElementById("placement").hidden = true;
  showGpsPosition(null);
  renderAnnotationUI();
}

function savePlacement() {
  const coordinates = placementCenter();
  if (!placement || !pointInCampus(coordinates)) return;
  // Saved right at the GPS fix only if the cross was never moved by hand.
  const fromGps = placement.followGps && placement.fix && !placement.moved;
  const accuracy = placement.fix?.accuracy ?? null;
  stopPlacement();
  addManualAnnotation(coordinates, fromGps ? { detectionMethod: "gps", accuracy } : {});
  if (fromGps) setMobileFieldStatus("gpsAdded", { accuracy });
}

// Only the person's own pan/zoom stops the GPS follow; our easeTo has no originalEvent.
function noteManualMapMove(event) {
  if (placement && event.originalEvent && !placement.moved) {
    placement.moved = true;
    renderPlacement();
  }
}

function captureTreeAtCurrentLocation() {
  if (placement) stopPlacement();
  else startPlacement({ followGps: true });
}
