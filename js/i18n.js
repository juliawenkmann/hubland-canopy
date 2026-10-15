/*
 * Translation lookup, number/date formatting and language switching.
 */
"use strict";

function number(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function t(key, variables = {}) {
  const template = I18N[currentLanguage]?.[key] ?? I18N.en[key] ?? key;
  return Object.entries(variables).reduce(
    (text, [name, value]) => text.replaceAll(`{${name}}`, String(value)),
    template,
  );
}

function updateFormatters() {
  const locale = currentLanguage === "de" ? "de-DE" : "en-GB";
  integerFormatter = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });
  decimalFormatter = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

function localizedCommonName(propertiesOrName) {
  const name =
    typeof propertiesOrName === "string"
      ? propertiesOrName
      : propertiesOrName?.common_name || "";
  return currentLanguage === "en" ? COMMON_NAME_EN[name] || name : name;
}

function localizedTreeType(value) {
  if (value === "Laubbaum") return t("deciduousTree");
  if (value === "Strauch") return t("shrub");
  if (value === "Obstbaum-Fundort") return t("fruitTreeLocation");
  return value || t("notRecorded");
}

function healthLabel(value) {
  const key = {
    good: "healthGood",
    fair: "healthFair",
    poor: "healthPoor",
    dead: "healthDead",
    not_recorded: "healthNotRecorded",
  }[value];
  return key ? t(key) : titleCase(value);
}

function titleCase(value) {
  const text = String(value || "");
  return text
    ? text.charAt(0).toUpperCase() + text.slice(1).replaceAll("_", " ")
    : "Unknown";
}

function formatDate(value) {
  if (!value) return t("notRecorded");
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime())
    ? String(value)
    : new Intl.DateTimeFormat(currentLanguage === "de" ? "de-DE" : "en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(date);
}

function applyLanguage({ refreshDynamic = true } = {}) {
  updateFormatters();
  document.documentElement.lang = currentLanguage;
  document.title = t("pageTitle");
  document.querySelector('meta[name="description"]').content = t("metaDescription");
  document.querySelectorAll("[data-i18n]").forEach((element) => {
    element.textContent = t(element.dataset.i18n);
  });
  document.querySelectorAll("[data-i18n-aria-label]").forEach((element) => {
    element.setAttribute("aria-label", t(element.dataset.i18nAriaLabel));
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((element) => {
    element.setAttribute("placeholder", t(element.dataset.i18nPlaceholder));
  });
  document.querySelectorAll("[data-i18n-title]").forEach((element) => {
    element.setAttribute("title", t(element.dataset.i18nTitle));
  });

  const languageToggle = document.getElementById("language-toggle");
  languageToggle.dataset.language = currentLanguage;
  languageToggle.setAttribute(
    "aria-label",
    t(currentLanguage === "en" ? "switchToGerman" : "switchToEnglish"),
  );
  languageToggle.title = languageToggle.getAttribute("aria-label");
  updatePanelToggleLabel();
  [
    [".maplibregl-ctrl-zoom-in", "zoomIn"],
    [".maplibregl-ctrl-zoom-out", "zoomOut"],
    [".maplibregl-ctrl-compass", "resetBearing"],
    [".maplibregl-ctrl-attrib-button", "showAttribution"],
  ].forEach(([selector, key]) => {
    document.querySelectorAll(selector).forEach((control) => {
      control.setAttribute("aria-label", t(key));
      control.title = t(key);
    });
  });

  renderCloudSyncUI();

  if (!refreshDynamic) return;
  renderStats();
  renderSpeciesChart();
  renderTreeInsights();
  renderFruitDashboard();
  updateDashboardModeUI();
  renderTreeFacets();
  renderLegend(colorMode);
  updateSelectionStatus();
  renderAnnotationUI();
  if (activePopup && activeAnnotationId) {
    const annotation = annotationData.features.find(
      (feature) => feature.properties.id === activeAnnotationId,
    );
    if (annotation) {
      activePopup.setDOMContent(buildAnnotationEditor(annotation));
    }
  } else if (activePopup && activePopupFeature) {
    activePopup.setDOMContent(
      buildTreePopup(
        activePopupFeature.properties,
        activePopupFeature.coordinates,
      ),
    );
  }
}

function setLanguage(language) {
  currentLanguage = language === "de" ? "de" : "en";
  try {
    localStorage.setItem("hubland-language", currentLanguage);
  } catch {
    // The map still works when browser storage is unavailable.
  }
  applyLanguage();
}
