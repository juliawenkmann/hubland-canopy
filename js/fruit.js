/*
 * Fruit & flowers mode: seasonal calendar, filters and dashboard.
 */
"use strict";

function monthLabel(month) {
  return t(`month${month}`);
}

function fruitLabel(fruit) {
  return t(fruit.nameKey);
}

function fruitKindLabel(kind) {
  return t(kind === "flower" ? "flowerGroup" : "fruitGroup");
}

function fruitSeasonRange(fruit) {
  const firstMonth = fruit.months[0];
  const lastMonth = fruit.months[fruit.months.length - 1];
  return firstMonth === lastMonth
    ? monthLabel(firstMonth)
    : `${monthLabel(firstMonth)} – ${monthLabel(lastMonth)}`;
}

function fruitSeasonPeriod(fruit) {
  return t(fruit.kind === "flower" ? "floweringPeriod" : "harvestPeriod", {
    months: fruitSeasonRange(fruit),
  });
}

function fruitSeasonDescription(fruit) {
  return t(fruit.descriptionKey);
}

function fruitAndFlowerCategory(feature) {
  const properties = feature?.properties || {};
  const knownCategories = new Set(
    FRUIT_CATALOG.map((fruit) => fruit.category),
  );
  const recordedCategory = String(properties.fruit_category || "").trim();
  if (knownCategories.has(recordedCategory)) return recordedCategory;

  const identity = [
    recordedCategory,
    properties.common_name,
    properties.scientific_name,
    properties.genus,
  ]
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase("de");
  const categoryMatchers = [
    ["Mirabelle", /mirabell|syriaca/],
    ["Quitte", /quitt|quince|cydonia/],
    ["Mispel", /mispel|medlar|mespilus\s+germanica/],
    ["Feige", /feige|fig|ficus\s+carica/],
    ["Maulbeere", /maulbeer|mulberry|morus(?:\s|$)/],
    ["Berberitze", /berberitz|barberry|berberis\s+vulgaris/],
    ["Schlehe", /schlehe|schlehdorn|blackthorn|sloe|prunus\s+spinosa/],
    ["Rose", /(?:^|\s)rose(?:\s|$)|wild\s*rose|rosa(?:\s|$)/],
    ["Haselnuss", /haseln|hazelnut|corylus/],
    ["Walnuss", /walnuss|walnut|juglans/],
    ["Apfel", /apfel|apple|malus/],
    ["Birne", /birn|pear|pyrus/],
    ["Kirsche", /kirsch|cherry|prunus\s+(avium|cerasus)/],
    ["Pflaume", /pflaum|plum/],
    ["Linde", /linde|linden|tilia/],
    ["Flieder", /flieder|lilac|syringa/],
  ];
  return (
    categoryMatchers.find(([, matcher]) => matcher.test(identity))?.[0] ||
    null
  );
}

function foodAndFlowerFeatures() {
  const knownCategories = new Set(
    FRUIT_CATALOG.map((fruit) => fruit.category),
  );
  const uniqueFeatures = new Map();
  [
    ...treeData.features,
    ...annotationData.features,
  ].forEach((feature) => {
    const category = fruitAndFlowerCategory(feature);
    const isFlowering =
      feature.properties.flowering === true ||
      ["Tilia", "Syringa"].includes(feature.properties.genus);
    const belongsInFoodAndFlowerMode =
      feature.properties.data_source === "mundraub" ||
      feature.properties.edible === true ||
      isFlowering ||
      knownCategories.has(category);
    if (
      feature?.geometry?.type !== "Point" ||
      !pointInCampus(feature.geometry.coordinates) ||
      !belongsInFoodAndFlowerMode ||
      !knownCategories.has(category)
    ) {
      return;
    }
    uniqueFeatures.set(String(feature.properties.id), {
      ...feature,
      properties: {
        ...feature.properties,
        fruit_category: category,
        flowering: isFlowering,
      },
    });
  });
  return [...uniqueFeatures.values()];
}

function eligibleFruitCatalog() {
  return FRUIT_CATALOG.filter(
    (fruit) =>
      fruit.months.includes(selectedHarvestMonth) &&
      (!selectedFruitType || fruit.id === selectedFruitType),
  );
}

function mapFruitCatalog() {
  if (selectedFruitType) {
    return FRUIT_CATALOG.filter(
      (fruit) => fruit.id === selectedFruitType,
    );
  }
  return FRUIT_CATALOG;
}

function visibleFruitFeatures() {
  const eligibleCategories = new Set(
    mapFruitCatalog().map((fruit) => fruit.category),
  );
  return foodAndFlowerFeatures().filter((feature) =>
    eligibleCategories.has(feature.properties.fruit_category),
  );
}

function renderFruitFilters() {
  const seasonalFeatures = foodAndFlowerFeatures();
  const counts = seasonalFeatures.reduce((totals, feature) => {
    const category = feature.properties.fruit_category;
    totals[category] = (totals[category] || 0) + 1;
    return totals;
  }, {});
  const container = document.getElementById("fruit-type-filters");
  container.replaceChildren();

  function buildFilterButton(choice, additionalClass = "") {
    const button = document.createElement("button");
    button.className = `fruit-filter ${additionalClass}`.trim();
    button.type = "button";
    button.style.setProperty("--fruit-color", choice.color);
    button.setAttribute(
      "aria-pressed",
      String(selectedFruitType === choice.id),
    );
    button.textContent = `${choice.label} · ${integerFormatter.format(
      choice.count,
    )}`;
    button.addEventListener("click", () => {
      selectedFruitType = choice.id;
      renderFruitDashboard();
      applyMapView();
      updateSelectionStatus();
      fitAllTrees();
    });
    return button;
  }

  container.appendChild(
    buildFilterButton(
      {
        id: null,
        label: t("allFruitTypes"),
        color: "#4f7658",
        count: seasonalFeatures.length,
      },
      "all-fruit-filter",
    ),
  );

  ["fruit", "flower"].forEach((kind) => {
    const group = document.createElement("section");
    group.className = "season-filter-group";
    group.setAttribute("aria-label", fruitKindLabel(kind));
    const heading = document.createElement("h3");
    heading.className = "season-filter-group-title";
    heading.textContent = fruitKindLabel(kind);
    const options = document.createElement("div");
    options.className = "fruit-filter-list";
    FRUIT_CATALOG.filter((fruit) => fruit.kind === kind).forEach((fruit) => {
      options.appendChild(
        buildFilterButton({
          id: fruit.id,
          label: fruitLabel(fruit),
          color: fruit.color,
          count: counts[fruit.category] || 0,
        }),
      );
    });
    group.append(heading, options);
    container.appendChild(group);
  });
}

function renderFruitDashboard() {
  if (!integerFormatter) return;
  const monthSelect = document.getElementById("harvest-month");
  monthSelect.replaceChildren();
  for (let month = 1; month <= 12; month += 1) {
    const option = document.createElement("option");
    option.value = String(month);
    option.textContent = monthLabel(month);
    option.selected = month === selectedHarvestMonth;
    monthSelect.appendChild(option);
  }

  const mappedFeatures = foodAndFlowerFeatures();
  const mappedCategories = new Set(
    mappedFeatures.map((feature) => feature.properties.fruit_category),
  );
  const ripeFruit = eligibleFruitCatalog();
  const matchingFeatures = visibleFruitFeatures();

  document.getElementById("fruit-location-count").textContent =
    integerFormatter.format(mappedFeatures.length);
  document.getElementById("mapped-fruit-count").textContent =
    integerFormatter.format(mappedCategories.size);
  document.getElementById("ripe-type-count").textContent =
    integerFormatter.format(ripeFruit.length);
  document.getElementById("ripe-location-count").textContent =
    integerFormatter.format(matchingFeatures.length);
  document.getElementById("selected-month-label").textContent =
    monthLabel(selectedHarvestMonth);

  renderFruitFilters();

  const ripeList = document.getElementById("ripe-fruit-list");
  ripeList.replaceChildren();
  if (!ripeFruit.length) {
    const empty = document.createElement("p");
    empty.className = "insight-empty";
    empty.textContent = t("noRipeFruit", {
      month: monthLabel(selectedHarvestMonth),
    });
    ripeList.appendChild(empty);
  } else {
    let currentKind = null;
    ripeFruit.forEach((fruit) => {
      if (fruit.kind !== currentKind) {
        currentKind = fruit.kind;
        const groupHeading = document.createElement("h3");
        groupHeading.className = "season-group-title";
        groupHeading.textContent = fruitKindLabel(currentKind);
        ripeList.appendChild(groupHeading);
      }
      const count = mappedFeatures.filter(
        (feature) =>
          feature.properties.fruit_category === fruit.category,
      ).length;
      const card = document.createElement("article");
      card.className = "season-card";
      card.style.setProperty("--fruit-color", fruit.color);

      const dot = document.createElement("span");
      dot.className = "season-card-dot";
      dot.setAttribute("aria-hidden", "true");

      const copy = document.createElement("div");
      copy.className = "season-card-copy";
      const name = document.createElement("strong");
      name.textContent = fruitLabel(fruit);
      const season = document.createElement("span");
      season.className = "season-card-period";
      season.textContent = fruitSeasonPeriod(fruit);
      const description = document.createElement("p");
      description.className = "season-card-description";
      description.textContent = fruitSeasonDescription(fruit);
      copy.append(name, season, description);

      const countElement = document.createElement("span");
      countElement.className = "season-card-count";
      countElement.title = count
        ? t("fruitLocationsCount", {
            count: integerFormatter.format(count),
          })
        : t("fruitNotMapped");
      countElement.textContent = integerFormatter.format(count);
      card.append(dot, copy, countElement);
      ripeList.appendChild(card);
    });
  }

  const fruitCounts = mappedFeatures.reduce((totals, feature) => {
    const category = feature.properties.fruit_category;
    totals[category] = (totals[category] || 0) + 1;
    return totals;
  }, {});
  const fruitRows = FRUIT_CATALOG
    .filter((fruit) => fruitCounts[fruit.category])
    .map((fruit) => ({
      label: fruitLabel(fruit),
      count: fruitCounts[fruit.category],
      color: fruit.color,
    }))
    .sort((first, second) => second.count - first.count);
  populateBarChart(
    document.getElementById("mundraub-fruit-chart"),
    fruitRows,
    t("mundraubChartAria"),
  );
}
