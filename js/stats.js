/*
 * Statistics tab: how far the mapping has come, and charts of tree types,
 * growth forms and health. Always for every tree inside the campus boundary,
 * whatever the filters on the Trees tab are set to.
 */
"use strict";

// Validated as neighbours around the ring (dataviz palette check).
const FORM_COLORS = {
  Laubbaum: "#3d8b4a",
  Nadelbaum: "#2d6aa6",
  "Obstbaum-Fundort": "#b94a62",
  Strauch: "#d9a12a",
};
const PROGRESS_COLOR = "#4d724c";

function formatPercent(part, whole) {
  const share = whole ? part / whole : 0;
  const format = new Intl.NumberFormat(
    currentLanguage === "de" ? "de-DE" : "en-GB",
    { style: "percent", maximumFractionDigits: 0 },
  ).format;
  // One tree of 670 is "<1%", not "0%".
  return share > 0 && share < 0.005 ? `<${format(0.01)}` : format(share);
}

function svgElement(tag, attributes = {}) {
  const element = document.createElementNS("http://www.w3.org/2000/svg", tag);
  Object.entries(attributes).forEach(([name, value]) =>
    element.setAttribute(name, value),
  );
  return element;
}

// A ring of arcs, one per part, with a 2px gap between neighbours. The centre
// holds an optional figure; the legend beside it carries every value.
function buildRing(parts, { size = 128, width = 15, center = null } = {}) {
  const wrap = document.createElement("div");
  wrap.className = "ring";
  wrap.style.width = `${size}px`;
  const middle = size / 2;
  const radius = (size - width) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = parts.reduce((sum, part) => sum + part.count, 0);
  const drawn = parts.filter((part) => part.count > 0);
  const gap = drawn.length > 1 ? 2 : 0;
  const svg = svgElement("svg", {
    viewBox: `0 0 ${size} ${size}`,
    "aria-hidden": "true",
  });
  svg.appendChild(
    svgElement("circle", {
      class: "ring-track",
      cx: middle,
      cy: middle,
      r: radius,
      "stroke-width": width,
    }),
  );
  let offset = 0;
  drawn.forEach((part) => {
    const length = (part.count / Math.max(total, 1)) * circumference;
    const arc = svgElement("circle", {
      class: "ring-arc",
      cx: middle,
      cy: middle,
      r: radius,
      stroke: part.color,
      "stroke-width": width,
      "stroke-dasharray": `${Math.max(length - gap, 1)} ${circumference}`,
      "stroke-dashoffset": -offset,
      transform: `rotate(-90 ${middle} ${middle})`,
    });
    const title = svgElement("title");
    title.textContent = `${part.label}: ${integerFormatter.format(
      part.count,
    )} (${formatPercent(part.count, part.of ?? total)})`;
    arc.appendChild(title);
    svg.appendChild(arc);
    offset += length;
  });
  wrap.appendChild(svg);
  if (center) {
    const label = document.createElement("div");
    label.className = "ring-center";
    label.append(
      popupText("", center.value, "strong"),
      popupText("", center.caption),
    );
    wrap.appendChild(label);
  }
  return wrap;
}

function buildChartLegend(parts, total) {
  const list = document.createElement("ul");
  list.className = "chart-legend";
  parts.forEach((part) => {
    const item = document.createElement("li");
    const swatch = popupText("chart-swatch", "");
    swatch.style.background = part.color;
    item.append(
      swatch,
      popupText("chart-legend-label", part.label),
      popupText(
        "chart-legend-value",
        integerFormatter.format(part.count),
        "strong",
      ),
      popupText("chart-legend-share", formatPercent(part.count, total)),
    );
    list.appendChild(item);
  });
  return list;
}

function renderRingChart(containerId, parts, emptyText) {
  const container = document.getElementById(containerId);
  const shown = parts.filter((part) => part.count > 0);
  const total = shown.reduce((sum, part) => sum + part.count, 0);
  container.replaceChildren();
  if (!total) {
    container.appendChild(popupText("insight-empty", emptyText, "p"));
    return;
  }
  container.append(buildRing(shown), buildChartLegend(shown, total));
  container.setAttribute(
    "aria-label",
    shown
      .map(
        (part) =>
          `${part.label}: ${integerFormatter.format(part.count)} (${formatPercent(
            part.count,
            total,
          )})`,
      )
      .join("; "),
  );
}

function buildMeter(label, count, total) {
  const row = document.createElement("div");
  row.className = "meter-row";
  const track = popupText("meter-track", "");
  const fill = popupText("meter-fill", "");
  fill.style.width = `${total ? (count / total) * 100 : 0}%`;
  track.appendChild(fill);
  row.append(
    popupText("meter-label", label),
    popupText(
      "meter-value",
      `${integerFormatter.format(count)} · ${formatPercent(count, total)}`,
      "strong",
    ),
    track,
  );
  return row;
}

function renderProgress(features) {
  const total = features.length;
  const identified = features.filter(typeGroupOf).length;
  const reviewed = features.filter(
    (feature) => feature.properties.review_status === "reviewed",
  ).length;
  const healthRecorded = features.filter(
    (feature) => treeHealthKey(feature) !== "not_recorded",
  ).length;
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const addedThisWeek = features.filter(
    (feature) => Date.parse(feature.properties.created_at) >= weekAgo,
  ).length;

  const hero = document.getElementById("progress-hero");
  hero.replaceChildren(
    buildRing(
      [
        {
          label: t("identifiedShare"),
          count: identified,
          color: PROGRESS_COLOR,
          of: total,
        },
      ],
      {
        size: 116,
        width: 13,
        center: {
          value: formatPercent(identified, total),
          caption: t("identifiedShare"),
        },
      },
    ),
  );
  const copy = document.createElement("div");
  copy.className = "progress-copy";
  copy.append(
    popupText(
      "progress-detail",
      t("identifiedDetail", {
        count: integerFormatter.format(identified),
        total: integerFormatter.format(total),
      }),
      "p",
    ),
    buildMeter(t("reviewed"), reviewed, total),
    buildMeter(t("healthRecorded"), healthRecorded, total),
  );
  hero.appendChild(copy);
  hero.setAttribute(
    "aria-label",
    t("identifiedDetail", {
      count: integerFormatter.format(identified),
      total: integerFormatter.format(total),
    }),
  );
  document.getElementById("stats-types-count").textContent =
    integerFormatter.format(
      new Set(features.map((feature) => typeGroupOf(feature)).filter(Boolean))
        .size,
    );
  document.getElementById("stats-added-week").textContent =
    integerFormatter.format(addedThisWeek);
}

// A tree's main type: its catalogue group, or the name you gave it.
function typeGroupOf(feature) {
  return (
    findTreeType(feature.properties)?.group ||
    String(feature.properties.common_name || "").trim() ||
    null
  );
}

// Main types as ranked bars; a type with subtypes opens to show them.
function renderTypeBreakdown(features) {
  const groups = new Map();
  features.forEach((feature) => {
    const group = typeGroupOf(feature);
    if (!group) return;
    const entry = groups.get(group) || {
      group,
      count: 0,
      names: new Map(),
      genus: treeGenus(feature.properties),
    };
    const name = feature.properties.common_name.trim();
    entry.count += 1;
    entry.names.set(name, (entry.names.get(name) || 0) + 1);
    groups.set(group, entry);
  });
  const rows = [...groups.values()].sort(
    (a, b) =>
      b.count - a.count ||
      localizedCommonName(a.group).localeCompare(localizedCommonName(b.group)),
  );
  const max = Math.max(1, ...rows.map((row) => row.count));
  const unknown =
    features.length - rows.reduce((sum, row) => sum + row.count, 0);
  document.getElementById("types-unknown-count").textContent = t(
    "stillUnknown",
    { count: integerFormatter.format(unknown) },
  );

  const list = document.getElementById("type-breakdown");
  list.replaceChildren();
  rows.forEach((row) => {
    const subtypes = [...row.names.entries()].sort((a, b) => b[1] - a[1]);
    const hasSubtypes = subtypes.some(([name]) => name !== row.group);
    const item = document.createElement(hasSubtypes ? "details" : "div");
    item.className = "type-row";
    const summary = document.createElement(hasSubtypes ? "summary" : "div");
    summary.className = "type-summary";
    const swatch = popupText("chart-swatch", "");
    swatch.style.background = GENUS_COLORS[row.genus] || COLOR_FALLBACK;
    const track = popupText("type-bar", "");
    const fill = popupText("type-bar-fill", "");
    fill.style.width = `${(row.count / max) * 100}%`;
    track.appendChild(fill);
    summary.append(
      swatch,
      popupText("type-name", localizedCommonName(row.group)),
      track,
      popupText("type-count", integerFormatter.format(row.count), "strong"),
    );
    summary.title = `${localizedCommonName(row.group)}: ${row.count}`;
    item.appendChild(summary);
    if (hasSubtypes) {
      const sublist = document.createElement("ul");
      sublist.className = "subtype-list";
      subtypes.forEach(([name, count]) => {
        const subtype = document.createElement("li");
        subtype.append(
          popupText(
            "",
            name === row.group
              ? t("subtypeUnspecified")
              : localizedCommonName(name),
          ),
          popupText("", integerFormatter.format(count), "strong"),
        );
        sublist.appendChild(subtype);
      });
      item.appendChild(sublist);
    }
    list.appendChild(item);
  });
}

function renderStatistics() {
  const features = campusTreeInventoryFeatures();
  renderProgress(features);
  renderTypeBreakdown(features);

  const forms = new Map();
  features.forEach((feature) => {
    const form =
      findTreeType(feature.properties)?.tree_type ||
      feature.properties.tree_type;
    if (FORM_COLORS[form]) forms.set(form, (forms.get(form) || 0) + 1);
  });
  renderRingChart(
    "form-chart",
    Object.entries(FORM_COLORS).map(([form, color]) => ({
      label:
        form === "Obstbaum-Fundort" ? t("fruitTree") : localizedTreeType(form),
      count: forms.get(form) || 0,
      color,
    })),
    t("noTypesYet"),
  );

  const health = new Map();
  features.forEach((feature) => {
    const key = treeHealthKey(feature);
    health.set(key, (health.get(key) || 0) + 1);
  });
  renderRingChart(
    "health-chart",
    Object.entries(HEALTH_COLORS).map(([key, color]) => ({
      label: healthLabel(key),
      count: health.get(key) || 0,
      color,
    })),
    t("noTypesYet"),
  );
  document.getElementById("health-chart-count").textContent = t("allTrees", {
    count: integerFormatter.format(features.length),
  });
}
