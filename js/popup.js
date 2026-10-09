/*
 * Tree detail popups, including the botanical illustration plates.
 */
"use strict";

function popupText(className, text, tag = "span") {
  const element = document.createElement(tag);
  element.className = className;
  element.textContent = text;
  return element;
}

function hasRecordedValue(value) {
  return value !== null && value !== undefined && String(value).trim() !== "";
}

function formatRecordedNumber(value, unit, maximumFractionDigits = 1) {
  if (!hasRecordedValue(value)) return t("notRecorded");
  return `${new Intl.NumberFormat(currentLanguage === "de" ? "de-DE" : "en-GB", {
    maximumFractionDigits,
  }).format(Number(value))} ${unit}`;
}

function appendBenefit(container, label, value) {
  const benefit = document.createElement("div");
  benefit.className = "benefit";
  const valueElement = popupText("", value, "strong");
  if (value === t("notRecorded")) valueElement.classList.add("is-missing");
  benefit.append(popupText("", label), valueElement);
  container.appendChild(benefit);
}

function appendRecordRow(container, label, value) {
  const row = document.createElement("div");
  row.className = "tree-record-row";
  const term = popupText("", label, "dt");
  const description = popupText("", value, "dd");
  if (value === t("notRecorded") || value === t("noPhoto")) {
    description.classList.add("is-missing");
  }
  row.append(term, description);
  container.appendChild(row);
}

function buildPopupSection(title) {
  const section = document.createElement("section");
  section.className = "popup-section";
  section.appendChild(popupText("popup-section-title", title, "h3"));
  return section;
}

function buildBotanicalPlate(properties, displayName) {
  const normalizedCommonName = String(
    properties.common_name || properties.fruit_category || "",
  )
    .trim()
    .toLocaleLowerCase("de");
  const normalizedScientificName = String(
    properties.scientific_name || properties.scientific_synonym || "",
  )
    .trim()
    .toLocaleLowerCase("de");
  const catalogMatch = TREE_IDENTIFICATION_CATALOG.find((entry) => {
    const commonNameMatches = [
      entry.common_name,
      COMMON_NAME_EN[entry.common_name],
    ]
      .filter(Boolean)
      .some(
        (name) =>
          String(name).trim().toLocaleLowerCase("de") ===
          normalizedCommonName,
      );
    const scientificNameMatches = [
      entry.scientific_name,
      entry.scientific_synonym,
    ]
      .filter(Boolean)
      .some(
        (name) =>
          String(name).trim().toLocaleLowerCase("de") ===
          normalizedScientificName,
      );
    return commonNameMatches || scientificNameMatches;
  });
  const illustrationGenus = catalogMatch?.genus || properties.genus;
  const botanicalIdentity = [
    properties.fruit_category,
    properties.common_name,
    properties.scientific_name,
    illustrationGenus,
  ]
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase("de");
  const isRedMirabelle =
    /rot(?:e)?\s+mirabell|red\s+mirabell/.test(botanicalIdentity);
  const isCherryLaurel =
    /kirschlorbeer|cherry\s+laurel|laurocerasus/.test(
      botanicalIdentity,
    );
  const isBlackLocust =
    /akazie|robinie|black\s+locust|robinia\s+pseudoacacia/.test(
      botanicalIdentity,
    );
  const isBlueSpruce =
    /blaufichte|blue\s+spruce|picea\s+pungens/.test(
      botanicalIdentity,
    );
  const isNorwaySpruce =
    catalogMatch?.id === "norway-spruce" ||
    normalizedCommonName === "fichte" ||
    normalizedCommonName === "norway spruce" ||
    /picea\s+abies/.test(botanicalIdentity);
  const isScotsPine =
    catalogMatch?.id === "scots-pine" ||
    /kiefer|scots\s+pine|pinus\s+sylvestris/.test(botanicalIdentity);
  const isOak =
    /eiche|pedunculate\s+oak|quercus\s+robur/.test(botanicalIdentity);
  const isRowan =
    /eberesche|rowan|sorbus\s+aucuparia/.test(botanicalIdentity);
  const isWhitebeam =
    catalogMatch?.id === "common-whitebeam" ||
    /mehlbeere|whitebeam|sorbus\s+aria/.test(botanicalIdentity);
  const isNorwayMaple =
    catalogMatch?.id === "norway-maple" ||
    normalizedCommonName === "ahorn" ||
    normalizedCommonName === "norway maple" ||
    /acer\s+platanoides/.test(botanicalIdentity);
  const isJapaneseMaple =
    catalogMatch?.id === "japanese-maple" ||
    /fächerahorn|japanese\s+maple|acer\s+palmatum/.test(
      botanicalIdentity,
    );
  const isServiceberry =
    catalogMatch?.id === "serviceberry" ||
    /felsenbirne|serviceberry|amelanchier\s+lamarckii/.test(
      botanicalIdentity,
    );
  const isCornelianCherry =
    catalogMatch?.id === "cornelian-cherry" ||
    /kornelkirsche|cornelian\s+cherry|cornus\s+mas/.test(
      botanicalIdentity,
    );
  const isGinkgo =
    catalogMatch?.id === "ginkgo" ||
    /ginkgo|ginko|ginkgo\s+biloba/.test(botanicalIdentity);
  const isEmpressTree =
    catalogMatch?.id === "empress-tree" ||
    /blauglockenbaum|empress\s+tree|paulownia\s+tomentosa/.test(
      botanicalIdentity,
    );
  const isBlackElder =
    catalogMatch?.id === "black-elder" ||
    /holunder|black\s+elder|sambucus\s+nigra/.test(botanicalIdentity);
  const isYew =
    catalogMatch?.id === "european-yew" ||
    /eibe|european\s+yew|taxus\s+baccata/.test(botanicalIdentity);
  const isWildCherry =
    catalogMatch?.id === "wild-cherry" ||
    /vogelkirsche|wild\s+cherry|prunus\s+avium/.test(botanicalIdentity);
  const isBlackthorn =
    catalogMatch?.id === "blackthorn" ||
    /schlehe|schlehdorn|blackthorn|sloe|prunus\s+spinosa/.test(
      botanicalIdentity,
    );
  const isWildRose =
    catalogMatch?.id === "wild-rose" ||
    /(?:^|\s)rose(?:\s|$)|wild\s*rose|rosa\s+(?:sp\.?|canina)/.test(
      botanicalIdentity,
    );
  const isMulberry =
    catalogMatch?.id === "mulberry" ||
    /maulbeer|mulberry|morus\s+(?:sp\.?|alba|nigra|rubra)/.test(
      botanicalIdentity,
    );
  const isMedlar =
    catalogMatch?.id === "medlar" ||
    /mispel|medlar|mespilus\s+germanica/.test(botanicalIdentity);
  const isFig =
    catalogMatch?.id === "common-fig" ||
    /feige|common\s+fig|ficus\s+carica/.test(botanicalIdentity);
  const isBarberry =
    catalogMatch?.id === "common-barberry" ||
    /berberitz|barberry|berberis\s+vulgaris/.test(botanicalIdentity);
  const isTreeOfHeaven =
    catalogMatch?.id === "tree-of-heaven" ||
    /götterbaum|tree\s+of\s+heaven|ailanthus\s+altissima/.test(
      botanicalIdentity,
    );
  const isAspen =
    /espe|european\s+aspen|populus\s+tremula/.test(botanicalIdentity);
  const isPoplar =
    catalogMatch?.id === "poplar" ||
    normalizedCommonName === "pappel" ||
    normalizedCommonName === "poplar" ||
    /populus\s+(?:sp\.?|nigra|alba|canadensis)/.test(botanicalIdentity);
  const isAlder =
    catalogMatch?.id === "alder" ||
    normalizedCommonName === "erle" ||
    normalizedCommonName === "alder" ||
    /alnus\s+glutinosa/.test(botanicalIdentity);
  const isBeech =
    /buche|european\s+beech|fagus\s+sylvatica/.test(botanicalIdentity);
  const isElm =
    /ulme|wych\s+elm|ulmus\s+glabra/.test(botanicalIdentity);
  const fruitPlate = /mirabell|syriaca/.test(botanicalIdentity)
    ? "mirabelle"
    : /kirsch|cherry|prunus\s+(avium|cerasus)/.test(
          botanicalIdentity,
        )
      ? "cherry"
      : /birn|pear|pyrus/.test(botanicalIdentity)
        ? "pear"
        : /apfel|apple|malus/.test(botanicalIdentity)
          ? "apple"
          : null;
  const extraFruitPlate = /quitt|quince|cydonia/.test(botanicalIdentity)
    ? "quince"
    : /pflaum|plum|prunus\s+domestica/.test(botanicalIdentity)
      ? "plum"
      : null;
  const genusPlate = {
    Acer: "acer",
    Alnus: "alnus",
    Fraxinus: "fraxinus",
    Gleditsia: "gleditsia",
  }[illustrationGenus];
  const individualGenusPlate = {
    Aesculus: "botanical-aesculus-plate",
    Betula: "botanical-betula-plate",
    Juglans: "botanical-juglans-plate",
    Syringa: "botanical-syringa-plate",
    Tilia: "botanical-tilia-plate",
  }[illustrationGenus];
  const dedicatedPlateClass = [
    [isCherryLaurel, "botanical-prunus-laurocerasus-plate"],
    [isBlackLocust, "botanical-robinia-pseudoacacia-plate"],
    [isBlueSpruce, "botanical-picea-pungens-plate"],
    [isNorwaySpruce, "botanical-picea-abies-plate"],
    [isScotsPine, "botanical-pinus-sylvestris-plate"],
    [isJapaneseMaple, "botanical-acer-palmatum-plate"],
    [isServiceberry, "botanical-amelanchier-lamarckii-plate"],
    [isCornelianCherry, "botanical-cornus-mas-plate"],
    [isGinkgo, "botanical-ginkgo-biloba-plate"],
    [isEmpressTree, "botanical-paulownia-tomentosa-plate"],
    [isBlackElder, "botanical-sambucus-nigra-plate"],
    [isYew, "botanical-taxus-baccata-plate"],
    [isWildCherry, "botanical-prunus-avium-plate"],
    [isBlackthorn, "botanical-prunus-spinosa-plate"],
    [isWildRose, "botanical-rosa-wild-plate"],
    [isMulberry, "botanical-morus-plate"],
    [isMedlar, "botanical-mespilus-germanica-plate"],
    [isFig, "botanical-ficus-carica-plate"],
    [isBarberry, "botanical-berberis-vulgaris-plate"],
    [isTreeOfHeaven, "botanical-ailanthus-altissima-plate"],
    [isOak, "botanical-quercus-robur-plate"],
    [isRowan, "botanical-sorbus-aucuparia-plate"],
    [isWhitebeam, "botanical-sorbus-aria-plate"],
    [isNorwayMaple, "botanical-acer-platanoides-plate"],
    [isAspen, "botanical-populus-tremula-plate"],
    [isPoplar, "botanical-populus-nigra-plate"],
    [isAlder, "botanical-alnus-glutinosa-plate"],
    [isBeech, "botanical-fagus-sylvatica-plate"],
    [isElm, "botanical-ulmus-glabra-plate"],
    [isRedMirabelle, "botanical-red-mirabelle-plate"],
  ].find(([matches]) => matches)?.[1];
  const plate = document.createElement("div");
  plate.className = dedicatedPlateClass
    ? `botanical-plate ${dedicatedPlateClass}`
    : fruitPlate
      ? `botanical-plate botanical-fruit-plate fruit-${fruitPlate}`
      : extraFruitPlate
        ? `botanical-plate botanical-extra-fruit-plate fruit-${extraFruitPlate}`
        : genusPlate
          ? `botanical-plate botanical-genus-plate genus-${genusPlate}`
          : individualGenusPlate
            ? `botanical-plate ${individualGenusPlate}`
            : illustrationGenus === "Corylus"
              ? "botanical-plate botanical-corylus-plate"
              : illustrationGenus === "Platanus"
                ? "botanical-plate botanical-platanus-plate"
                : "botanical-plate botanical-tree-plate";
  plate.setAttribute("role", "img");
  plate.setAttribute(
    "aria-label",
    t("botanicalIllustrationAlt", { name: displayName }),
  );
  return plate;
}

function buildTreePopup(properties, coordinates) {
  const isMundraub = properties.data_source === "mundraub";
  const isFoodOrFlower =
    properties.edible === true ||
    properties.flowering === true ||
    FRUIT_CATALOG.some(
      (fruit) => fruit.category === properties.fruit_category,
    );
  const seasonalEntry = FRUIT_CATALOG.find(
    (fruit) => fruit.category === properties.fruit_category,
  );
  const editableFeature = annotationData.features.find(
    (feature) => String(feature.properties.id) === String(properties.id),
  );
  const displayName = localizedCommonName(properties) || t("unknownTree");
  const scientificName =
    properties.scientific_name || t("identificationPending");
  const healthValue = treeHealthKey({ properties });
  const root = document.createElement("article");
  root.className = "tree-popup-card";
  root.setAttribute("aria-label", t("detailsAria", { name: displayName }));

  const imageWrap = document.createElement("div");
  imageWrap.className = "tree-popup-image";
  imageWrap.appendChild(buildBotanicalPlate(properties, displayName));
  imageWrap.appendChild(
    popupText(
      "tree-popup-id",
      isMundraub
        ? t("mundraubBadge", { id: properties.source_id || properties.id })
        : t("treeBadge", { id: properties.id }),
    ),
  );
  if (editableFeature && (!cloudConfigured || cloudUser)) {
    const editButton = document.createElement("button");
    editButton.className = "tree-popup-edit-trigger";
    editButton.type = "button";
    editButton.title = t("editTreeRecord");
    editButton.setAttribute("aria-label", t("editTreeRecord"));
    editButton.append(
      popupText("tree-popup-edit-icon", "✎"),
      popupText("", t("editTreeRecord")),
    );
    editButton.addEventListener("click", (event) => {
      event.stopPropagation();
      openAnnotationEditor(editableFeature);
    });
    imageWrap.appendChild(editButton);
  }

  const body = document.createElement("div");
  body.className = "tree-popup-body";
  body.append(
    popupText("tree-popup-title", displayName, "h2"),
    popupText("tree-popup-scientific", scientificName, "p"),
    popupText("tree-popup-location", t("campusLocation"), "p"),
  );

  const tags = document.createElement("div");
  tags.className = "popup-tag-list";
  [
    properties.genus,
    localizedTreeType(properties.tree_type),
    isFoodOrFlower
      ? localizedCommonName(properties.fruit_category)
      : null,
  ]
    .filter(
      (value) =>
        hasRecordedValue(value) &&
        value !== t("notRecorded") &&
        value !== t("unknownGenus"),
    )
    .forEach((value) => tags.appendChild(popupText("popup-tag", value)));
  if (tags.childElementCount) body.appendChild(tags);

  if (seasonalEntry) {
    const seasonalCard = document.createElement("section");
    seasonalCard.className = `seasonal-popup-card${
      seasonalEntry.kind === "flower" ? " is-flower" : ""
    }`;
    const icon = popupText(
      "seasonal-popup-icon",
      seasonalEntry.kind === "flower" ? "✿" : "◉",
    );
    icon.setAttribute("aria-hidden", "true");
    const seasonalCopy = document.createElement("div");
    seasonalCopy.className = "seasonal-popup-copy";
    seasonalCopy.append(
      popupText("", t("seasonalInformation"), "span"),
      popupText("", fruitSeasonPeriod(seasonalEntry), "strong"),
      popupText("", fruitSeasonDescription(seasonalEntry), "p"),
    );
    seasonalCard.append(icon, seasonalCopy);
    body.appendChild(seasonalCard);
  }

  const measures = document.createElement("div");
  measures.className = "popup-measures";
  [
    [
      "♡",
      healthValue === "not_recorded" ? "—" : healthLabel(healthValue),
      t("health"),
    ],
    [
      "↕",
      hasRecordedValue(properties.height_m)
        ? formatRecordedNumber(properties.height_m, "m")
        : "—",
      t("height"),
    ],
    [
      "❧",
      hasRecordedValue(properties.canopy_spread_m)
        ? formatRecordedNumber(properties.canopy_spread_m, "m")
        : "—",
      t("canopySpread"),
    ],
  ].forEach(([icon, value, label]) => {
    const measure = document.createElement("div");
    measure.className = "popup-measure";
    measure.append(
      popupText("popup-measure-icon", icon),
      popupText("", value, "strong"),
      popupText("", label),
    );
    measures.appendChild(measure);
  });
  body.appendChild(measures);

  const moreInformation = document.createElement("details");
  moreInformation.className = "more-information";
  const summary = document.createElement("summary");
  summary.textContent = t("moreInformation");
  const moreBody = document.createElement("div");
  moreBody.className = "more-information-body";

  const measurements = buildPopupSection(t("measurements"));
  const measurementRows = document.createElement("div");
  measurementRows.className = "benefits";
  [
    [
      t("trunkGirth"),
      formatRecordedNumber(properties.trunk_circumference_cm, "cm"),
    ],
    [
      t("trunkDiameter"),
      formatRecordedNumber(properties.dbh_cm, "cm"),
    ],
    [t("height"), formatRecordedNumber(properties.height_m, "m")],
    [
      t("canopySpread"),
      formatRecordedNumber(properties.canopy_spread_m, "m"),
    ],
  ].forEach(([label, value]) =>
    appendBenefit(measurementRows, label, value),
  );
  measurements.appendChild(measurementRows);
  moreBody.appendChild(measurements);

  const classification = buildPopupSection(t("classification"));
  const benefits = document.createElement("div");
  benefits.className = "benefits";
  const classificationRows = [
    [t("genus"), properties.genus || t("notRecorded")],
    [t("treeType"), localizedTreeType(properties.tree_type)],
  ];
  if (hasRecordedValue(properties.scientific_synonym)) {
    classificationRows.splice(1, 0, [
      t("scientificSynonym"),
      properties.scientific_synonym,
    ]);
  }
  if (isFoodOrFlower) {
    classificationRows.push([
      t("fruitCategory"),
      localizedCommonName(properties.fruit_category),
    ]);
  }
  classificationRows.forEach(([label, value]) => {
    appendBenefit(benefits, label, value);
  });
  classification.appendChild(benefits);
  moreBody.appendChild(classification);

  const ecology = buildPopupSection(t("ecologicalBenefits"));
  const ecologyRows = document.createElement("div");
  ecologyRows.className = "benefits";
  [
    [
      t("co2Stored"),
      formatRecordedNumber(properties.co2_stored_kg, "kg", 0),
    ],
    [
      t("co2PerYear"),
      formatRecordedNumber(
        properties.co2_per_year_kg,
        currentLanguage === "de" ? "kg/Jahr" : "kg/year",
        1,
      ),
    ],
    [
      t("stormwater"),
      formatRecordedNumber(
        properties.stormwater_l_per_year,
        currentLanguage === "de" ? "L/Jahr" : "L/year",
        0,
      ),
    ],
  ].forEach(([label, value]) => appendBenefit(ecologyRows, label, value));
  ecology.appendChild(ecologyRows);
  moreBody.appendChild(ecology);

  if (hasRecordedValue(properties.photo_url)) {
    const photo = buildPopupSection(t("surveyPhoto"));
    const photoImage = document.createElement("img");
    photoImage.className = "popup-record-photo";
    photoImage.src = properties.photo_url;
    photoImage.alt = t("photoAlt", { name: displayName });
    photoImage.loading = "lazy";
    photoImage.addEventListener("error", () => photo.remove());
    photo.appendChild(photoImage);
    moreBody.appendChild(photo);
  }

  const record = buildPopupSection(
    t(isMundraub ? "completeSourceRecord" : "completeTreeRecord"),
  );
  const recordRows = document.createElement("dl");
  recordRows.className = "tree-record";
  const coordinateValue = Array.isArray(coordinates)
    ? `${Number(coordinates[1]).toFixed(6)}, ${Number(coordinates[0]).toFixed(6)}`
    : t("notRecorded");
  let sourceRows;
  if (isMundraub) {
    sourceRows = [
        [
          t("mundraubId"),
          String(properties.source_id || properties.id || t("notRecorded")),
        ],
        [t("fruitCategory"), localizedCommonName(properties.fruit_category)],
        [t("derivedGenus"), properties.genus],
        [t("botanicalGroup"), properties.scientific_name],
        [t("taxonomyNote"), t("taxonomyDerived")],
        [t("measurements"), t("notRecorded")],
        [t("health"), t("notRecorded")],
        [t("photo"), t("noPhoto")],
        [t("source"), properties.source_name],
        [t("retrieved"), formatDate(properties.source_updated)],
        [t("coordinates"), coordinateValue],
      ];
  } else {
    sourceRows = [
        [t("treeId"), String(properties.id)],
        [t("commonName"), displayName],
        [t("scientificName"), properties.scientific_name || t("notRecorded")],
        [
          t("scientificSynonym"),
          properties.scientific_synonym || t("notRecorded"),
        ],
        [t("genus"), properties.genus || t("notRecorded")],
        [
          t("health"),
          healthValue === "not_recorded"
            ? t("notRecorded")
            : healthLabel(healthValue),
        ],
        [t("surveyed"), formatDate(properties.date_surveyed)],
        [
          t("annotationMethod"),
          properties.detection_method === "openstreetmap-overpass"
            ? t("methodOsm")
            : t("methodManual"),
        ],
        [
          t("reviewStatus"),
          properties.review_status
            ? t(properties.review_status)
            : t("notRecorded"),
        ],
        [t("notes"), properties.notes || t("notRecorded")],
        [t("source"), properties.source_name || t("notRecorded")],
        [t("licence"), properties.source_license || t("notRecorded")],
        [t("coordinates"), coordinateValue],
      ];
  }
  sourceRows.forEach(([label, value]) => appendRecordRow(recordRows, label, value));
  record.appendChild(recordRows);
  moreBody.appendChild(record);

  moreBody.appendChild(
    popupText(
      "data-availability",
      t(isMundraub ? "mundraubAvailability" : "annotationAvailability"),
      "p",
    ),
  );

  const sourceHref = properties.source_url;
  if (sourceHref) {
    const sourceLink = document.createElement("a");
    sourceLink.className = "survey-date source-link";
    sourceLink.href = sourceHref;
    sourceLink.target = "_blank";
    sourceLink.rel = "noopener noreferrer";
    sourceLink.textContent = isMundraub
      ? t("openMundraubEntry")
      : t("openOsmElement");
    moreBody.appendChild(sourceLink);
  }

  moreInformation.append(summary, moreBody);
  moreInformation.addEventListener("toggle", () => {
    if (activePopup) focusPopupInViewport(activePopup);
  });
  body.appendChild(moreInformation);
  root.append(imageWrap, body);
  return root;
}

function closestTreeFromEvent(event) {
  const candidates = event.features || [];
  if (candidates.length < 2) return candidates[0];
  return candidates.reduce((closest, feature) => {
    const point = map.project(feature.geometry.coordinates);
    const distance = Math.hypot(
      point.x - event.point.x,
      point.y - event.point.y,
    );
    if (!closest || distance < closest.distance) {
      return { feature, distance };
    }
    return closest;
  }, null).feature;
}

function prepareViewportForPopup() {
  const mobile = window.matchMedia("(max-width: 760px)").matches;
  const shouldCollapsePanel =
    mobile && !document.body.classList.contains("panel-collapsed");
  if (shouldCollapsePanel) setDashboardCollapsed(true);
  return shouldCollapsePanel;
}

function popupSafeArea() {
  const mapRectangle = map.getContainer().getBoundingClientRect();
  const mobile = window.matchMedia("(max-width: 760px)").matches;
  const brandRectangle = document
    .querySelector(".brand")
    ?.getBoundingClientRect();
  const dashboardRectangle = document
    .querySelector(".dashboard")
    ?.getBoundingClientRect();
  return {
    left: mobile
      ? mapRectangle.left + 12
      : Math.max(
          mapRectangle.left + 14,
          (dashboardRectangle?.right || mapRectangle.left) + 14,
        ),
    right: mapRectangle.right - 14,
    top: Math.max(
      mapRectangle.top + 14,
      (brandRectangle?.bottom || mapRectangle.top) + 12,
    ),
    bottom: mobile
      ? mapRectangle.bottom - 88
      : mapRectangle.bottom - 18,
  };
}

function keepPopupInsideSafeArea(popup) {
  const popupElement = popup?.getElement?.();
  if (!popupElement?.isConnected || !map) return;
  const popupRectangle = popupElement.getBoundingClientRect();
  const safeArea = popupSafeArea();
  const safeWidth = safeArea.right - safeArea.left;
  const safeHeight = safeArea.bottom - safeArea.top;

  let horizontalShift = 0;
  let verticalShift = 0;
  if (popupRectangle.width > safeWidth) {
    horizontalShift =
      (safeArea.left + safeArea.right) / 2 -
      (popupRectangle.left + popupRectangle.right) / 2;
  } else if (popupRectangle.left < safeArea.left) {
    horizontalShift = safeArea.left - popupRectangle.left;
  } else if (popupRectangle.right > safeArea.right) {
    horizontalShift = safeArea.right - popupRectangle.right;
  }

  if (popupRectangle.height > safeHeight) {
    verticalShift =
      (safeArea.top + safeArea.bottom) / 2 -
      (popupRectangle.top + popupRectangle.bottom) / 2;
  } else if (popupRectangle.top < safeArea.top) {
    verticalShift = safeArea.top - popupRectangle.top;
  } else if (popupRectangle.bottom > safeArea.bottom) {
    verticalShift = safeArea.bottom - popupRectangle.bottom;
  }

  if (Math.abs(horizontalShift) > 1 || Math.abs(verticalShift) > 1) {
    map.panBy([-horizontalShift, -verticalShift], {
      duration: 440,
      essential: true,
    });
  }
}

function focusPopupInViewport(popup) {
  window.requestAnimationFrame(() =>
    window.requestAnimationFrame(() => keepPopupInsideSafeArea(popup)),
  );
  if (window.matchMedia("(max-width: 760px)").matches) {
    window.setTimeout(() => keepPopupInsideSafeArea(popup), 380);
  }
}

function showTreePopup(feature) {
  const coordinates = feature.geometry.coordinates.slice();
  const inheritedPanelRestore = activePopupRestoresPanel;
  activePopupRestoresPanel = false;
  if (activePopup) activePopup.remove();
  const shouldRestorePanel =
    inheritedPanelRestore || prepareViewportForPopup();
  activeAnnotationId = null;
  activePopupFeature = {
    properties: { ...feature.properties },
    coordinates,
  };
  const popup = new maplibregl.Popup({
    anchor: "bottom",
    offset: 18,
    maxWidth: "390px",
  })
    .setLngLat(coordinates)
    .setDOMContent(buildTreePopup(feature.properties, coordinates))
    .addTo(map);
  activePopup = popup;
  activePopupRestoresPanel = shouldRestorePanel;
  focusPopupInViewport(popup);
  popup.on("close", () => {
    if (activePopup === popup) {
      const restorePanel = activePopupRestoresPanel;
      activePopup = null;
      activePopupFeature = null;
      activePopupRestoresPanel = false;
      if (restorePanel) setDashboardCollapsed(false);
    }
  });
}
