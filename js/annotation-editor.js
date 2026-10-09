/*
 * The edit form shown inside a tree popup.
 */
"use strict";

function annotationField(labelText, control) {
  const wrapper = document.createElement("div");
  wrapper.className = "annotation-field";
  const label = document.createElement("label");
  label.textContent = labelText;
  label.htmlFor = control.id;
  wrapper.append(label, control);
  return wrapper;
}

function annotationInput(id, name, type, value, placeholder = "") {
  const input = document.createElement("input");
  input.id = id;
  input.name = name;
  input.type = type;
  input.value = value ?? "";
  input.placeholder = placeholder;
  if (type === "number") {
    input.step = "0.1";
    input.min = "0";
  }
  return input;
}

function optionalFormNumber(form, name) {
  const rawValue = form.elements[name].value.trim();
  if (!rawValue) return null;
  const parsed = Number(rawValue);
  return Number.isFinite(parsed) ? parsed : null;
}

function buildAnnotationEditor(feature) {
  const properties = feature.properties;
  const isOsm =
    properties.detection_method === "openstreetmap-overpass";
  const root = document.createElement("article");
  root.className = "annotation-editor";
  root.setAttribute("aria-label", t("annotationTitle"));
  root.appendChild(popupText("", t("annotationTitle"), "h2"));

  const meta = document.createElement("div");
  meta.className = "annotation-meta";
  const sourceChip = popupText(
    "annotation-chip",
    t(isOsm ? "osmMappedTree" : "manualAnnotation"),
  );
  meta.appendChild(sourceChip);
  meta.appendChild(
    popupText(
      "annotation-chip",
      `${feature.geometry.coordinates[1].toFixed(5)}, ${feature.geometry.coordinates[0].toFixed(5)}`,
    ),
  );
  if (Number.isFinite(Number(properties.location_accuracy_m))) {
    meta.appendChild(
      popupText(
        "annotation-chip",
        `GPS ±${Math.round(Number(properties.location_accuracy_m))} m`,
      ),
    );
  }
  root.appendChild(meta);

  if (isOsm) {
    const osmRecord = document.createElement("dl");
    osmRecord.className = "tree-record";
    [
      [
        t("osmElement"),
        `node/${properties.osm_id || t("notRecorded")}`,
      ],
      [
        t("osmLeafType"),
        properties.osm_leaf_type || t("notRecorded"),
      ],
      [
        t("osmMappedCount"),
        integerFormatter.format(properties.osm_tree_count_estimate || 1),
      ],
      [
        t("osmDescriptionTag"),
        properties.osm_description || t("notRecorded"),
      ],
      [
        t("osmUpdated"),
        properties.osm_timestamp
          ? formatDate(properties.osm_timestamp)
          : t("notRecorded"),
      ],
    ].forEach(([label, value]) => appendRecordRow(osmRecord, label, value));
    root.appendChild(osmRecord);

    const tagDetails = document.createElement("details");
    tagDetails.className = "osm-tag-details";
    const tagSummary = document.createElement("summary");
    tagSummary.textContent = t("allOsmTags");
    const tagList = document.createElement("dl");
    tagList.className = "tree-record";
    try {
      Object.entries(JSON.parse(properties.osm_tags_json || "{}"))
        .sort(([first], [second]) => first.localeCompare(second))
        .forEach(([key, value]) =>
          appendRecordRow(tagList, key, String(value)),
        );
    } catch {
      appendRecordRow(tagList, "OSM", t("notRecorded"));
    }
    tagDetails.append(tagSummary, tagList);
    root.appendChild(tagDetails);
  }

  const form = document.createElement("form");
  form.className = "annotation-form";

  const treeTypeInput = document.createElement("input");
  treeTypeInput.type = "hidden";
  treeTypeInput.name = "tree_type";
  treeTypeInput.value = properties.tree_type || "";

  const edibleInput = document.createElement("input");
  edibleInput.type = "hidden";
  edibleInput.name = "edible";
  edibleInput.value = properties.edible ? "true" : "false";

  const floweringInput = document.createElement("input");
  floweringInput.type = "hidden";
  floweringInput.name = "flowering";
  floweringInput.value = properties.flowering ? "true" : "false";

  const fruitCategoryInput = document.createElement("input");
  fruitCategoryInput.type = "hidden";
  fruitCategoryInput.name = "fruit_category";
  fruitCategoryInput.value = properties.fruit_category || "";

  const presetSelect = document.createElement("select");
  presetSelect.id = `annotation-preset-${properties.id}`;
  presetSelect.name = "identification_preset";
  const manualOption = document.createElement("option");
  manualOption.value = "";
  manualOption.textContent = t("chooseTreeType");
  presetSelect.appendChild(manualOption);

  const currentPreset = TREE_IDENTIFICATION_CATALOG.find(
    (entry) =>
      entry.common_name === properties.common_name &&
      entry.genus === properties.genus,
  );
  [...TREE_IDENTIFICATION_CATALOG]
    .sort((first, second) =>
      localizedCommonName(first.common_name).localeCompare(
        localizedCommonName(second.common_name),
        currentLanguage === "de" ? "de" : "en",
      ),
    )
    .forEach((entry) => {
      const option = document.createElement("option");
      option.value = entry.id;
      option.textContent = `${localizedCommonName(entry.common_name)} · ${entry.scientific_name}`;
      option.selected = entry.id === currentPreset?.id;
      presetSelect.appendChild(option);
    });

  const presetField = annotationField(t("treeSelection"), presetSelect);
  presetField.classList.add("annotation-preset-field");
  form.append(
    presetField,
    popupText(
      "annotation-preset-hint",
      t("treeSelectionHint"),
      "p",
    ),
    treeTypeInput,
    edibleInput,
    floweringInput,
    fruitCategoryInput,
  );

  form.append(
    annotationField(
      t("commonName"),
      annotationInput(
        `annotation-common-${properties.id}`,
        "common_name",
        "text",
        properties.common_name,
        t("unknownTree"),
      ),
    ),
    annotationField(
      t("scientificName"),
      annotationInput(
        `annotation-scientific-${properties.id}`,
        "scientific_name",
        "text",
        properties.scientific_name,
      ),
    ),
    annotationField(
      t("scientificSynonym"),
      annotationInput(
        `annotation-synonym-${properties.id}`,
        "scientific_synonym",
        "text",
        properties.scientific_synonym,
      ),
    ),
    annotationField(
      t("genus"),
      annotationInput(
        `annotation-genus-${properties.id}`,
        "genus",
        "text",
        properties.genus,
        t("unknownGenus"),
      ),
    ),
    annotationField(
      `${t("trunkGirth")} (cm)`,
      annotationInput(
        `annotation-girth-${properties.id}`,
        "trunk_circumference_cm",
        "number",
        properties.trunk_circumference_cm,
      ),
    ),
    annotationField(
      `${t("trunkDiameter")} (cm)`,
      annotationInput(
        `annotation-dbh-${properties.id}`,
        "dbh_cm",
        "number",
        properties.dbh_cm,
      ),
    ),
    annotationField(
      `${t("height")} (m)`,
      annotationInput(
        `annotation-height-${properties.id}`,
        "height_m",
        "number",
        properties.height_m,
      ),
    ),
    annotationField(
      `${t("canopySpread")} (m)`,
      annotationInput(
        `annotation-canopy-${properties.id}`,
        "canopy_spread_m",
        "number",
        properties.canopy_spread_m,
      ),
    ),
  );

  presetSelect.addEventListener("change", () => {
    const preset = TREE_IDENTIFICATION_CATALOG.find(
      (entry) => entry.id === presetSelect.value,
    );
    if (!preset) {
      form.elements.tree_type.value = "";
      form.elements.edible.value = "false";
      form.elements.flowering.value = "false";
      form.elements.fruit_category.value = "";
      return;
    }
    form.elements.common_name.value = preset.common_name;
    form.elements.scientific_name.value = preset.scientific_name;
    form.elements.scientific_synonym.value =
      preset.scientific_synonym || "";
    form.elements.genus.value = preset.genus;
    form.elements.tree_type.value = preset.tree_type;
    form.elements.edible.value = preset.edible ? "true" : "false";
    form.elements.flowering.value = preset.flowering ? "true" : "false";
    form.elements.fruit_category.value =
      preset.fruit_category || "";
  });

  const healthSelect = document.createElement("select");
  healthSelect.id = `annotation-health-${properties.id}`;
  healthSelect.name = "health";
  ["good", "fair", "poor", "dead"].forEach((value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = healthLabel(value);
    option.selected = value === treeHealthKey({ properties });
    healthSelect.appendChild(option);
  });
  form.appendChild(annotationField(t("health"), healthSelect));

  form.append(
    annotationField(
      `${t("co2Stored")} (kg)`,
      annotationInput(
        `annotation-co2-${properties.id}`,
        "co2_stored_kg",
        "number",
        properties.co2_stored_kg,
      ),
    ),
    annotationField(
      `${t("co2PerYear")} (kg)`,
      annotationInput(
        `annotation-co2-year-${properties.id}`,
        "co2_per_year_kg",
        "number",
        properties.co2_per_year_kg,
      ),
    ),
    annotationField(
      `${t("stormwater")} (L)`,
      annotationInput(
        `annotation-water-${properties.id}`,
        "stormwater_l_per_year",
        "number",
        properties.stormwater_l_per_year,
      ),
    ),
    annotationField(
      t("surveyed"),
      annotationInput(
        `annotation-date-${properties.id}`,
        "date_surveyed",
        "date",
        properties.date_surveyed,
      ),
    ),
    annotationField(
      t("photo"),
      annotationInput(
        `annotation-photo-${properties.id}`,
        "photo_url",
        "url",
        properties.photo_url,
        "https://…",
      ),
    ),
  );

  const notes = document.createElement("textarea");
  notes.id = `annotation-notes-${properties.id}`;
  notes.name = "notes";
  notes.value = properties.notes || "";
  notes.placeholder = t("notesPlaceholder");
  form.appendChild(annotationField(t("notes"), notes));

  const reviewSelect = document.createElement("select");
  reviewSelect.id = `annotation-review-${properties.id}`;
  reviewSelect.name = "review_status";
  ["unreviewed", "reviewed"].forEach((value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = t(value);
    option.selected = value === properties.review_status;
    reviewSelect.appendChild(option);
  });
  form.appendChild(annotationField(t("reviewStatus"), reviewSelect));

  const sourceNote = popupText(
    "data-availability",
    isOsm
      ? `${t("annotationMethod")}: ${t("methodOsm")}. ${t("osmCaveat")}`
      : `${t("annotationMethod")}: ${t("methodManual")}.`,
    "p",
  );
  form.appendChild(sourceNote);

  if (isOsm && properties.source_url) {
    const sourceLink = document.createElement("a");
    sourceLink.className = "survey-date source-link";
    sourceLink.href = properties.source_url;
    sourceLink.target = "_blank";
    sourceLink.rel = "noopener noreferrer";
    sourceLink.textContent = t("openOsmElement");
    form.appendChild(sourceLink);
  }

  const actions = document.createElement("div");
  actions.className = "annotation-form-actions";
  const saveButton = document.createElement("button");
  saveButton.className = "annotation-button primary";
  saveButton.type = "submit";
  saveButton.textContent = t("saveAnnotation");
  const deleteButton = document.createElement("button");
  deleteButton.className = "annotation-button annotation-delete";
  deleteButton.type = "button";
  deleteButton.textContent = t("deleteAnnotation");
  actions.append(saveButton, deleteButton);
  form.appendChild(actions);

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const updatedFeature = {
      ...feature,
      properties: {
        ...properties,
        common_name: form.elements.common_name.value.trim(),
        scientific_name: form.elements.scientific_name.value.trim(),
        scientific_synonym:
          form.elements.scientific_synonym.value.trim(),
        genus: form.elements.genus.value.trim(),
        tree_type: form.elements.tree_type.value || null,
        edible: form.elements.edible.value === "true",
        flowering: form.elements.flowering.value === "true",
        fruit_category:
          form.elements.fruit_category.value.trim() || null,
        trunk_circumference_cm: optionalFormNumber(
          form,
          "trunk_circumference_cm",
        ),
        dbh_cm: optionalFormNumber(form, "dbh_cm"),
        height_m: optionalFormNumber(form, "height_m"),
        canopy_spread_m: optionalFormNumber(form, "canopy_spread_m"),
        health: form.elements.health.value,
        co2_stored_kg: optionalFormNumber(form, "co2_stored_kg"),
        co2_per_year_kg: optionalFormNumber(form, "co2_per_year_kg"),
        stormwater_l_per_year: optionalFormNumber(
          form,
          "stormwater_l_per_year",
        ),
        date_surveyed: form.elements.date_surveyed.value || null,
        photo_url: form.elements.photo_url.value.trim(),
        notes: form.elements.notes.value.trim(),
        review_status: form.elements.review_status.value,
        updated_at: new Date().toISOString(),
      },
    };
    updateAnnotation(updatedFeature);
    if (activePopup) activePopup.remove();
    setAnnotationStatus("annotationSaved");
  });

  deleteButton.addEventListener("click", () => {
    if (window.confirm(t("confirmDelete"))) {
      deleteAnnotation(properties.id);
    }
  });

  root.appendChild(form);
  return root;
}

function openAnnotationEditor(feature) {
  const inheritedPanelRestore = activePopupRestoresPanel;
  activePopupRestoresPanel = false;
  if (activePopup) activePopup.remove();
  const shouldRestorePanel =
    inheritedPanelRestore || prepareViewportForPopup();
  activeAnnotationId = feature.properties.id;
  activePopupFeature = null;
  const popup = new maplibregl.Popup({
    anchor: "bottom",
    offset: 16,
    maxWidth: "368px",
  })
    .setLngLat(feature.geometry.coordinates)
    .setDOMContent(buildAnnotationEditor(feature))
    .addTo(map);
  activePopup = popup;
  activePopupRestoresPanel = shouldRestorePanel;
  focusPopupInViewport(popup);
  popup.on("close", () => {
    if (activePopup === popup) {
      const restorePanel = activePopupRestoresPanel;
      activePopup = null;
      activeAnnotationId = null;
      activePopupRestoresPanel = false;
      if (restorePanel) setDashboardCollapsed(false);
    }
  });
}
