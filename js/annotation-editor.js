/*
 * The tree editor: a bottom sheet on phones, a card beside the map on laptops.
 * The type is typed with suggestions; health and review are one tap; fields you
 * have never filled in for any tree wait under "More fields".
 */
"use strict";

// Shown in the main form once any tree you mapped has a value for them.
const OPTIONAL_TREE_FIELDS = [
  { name: "trunk_circumference_cm", labelKey: "trunkGirth", unit: "cm" },
  { name: "dbh_cm", labelKey: "trunkDiameter", unit: "cm" },
  { name: "height_m", labelKey: "height", unit: "m" },
  { name: "canopy_spread_m", labelKey: "canopySpread", unit: "m" },
  { name: "co2_stored_kg", labelKey: "co2Stored", unit: "kg" },
  { name: "co2_per_year_kg", labelKey: "co2PerYear", unit: "kg" },
  { name: "stormwater_l_per_year", labelKey: "stormwater", unit: "L" },
  { name: "photo_url", labelKey: "photo", type: "url" },
];
// Filled by the type picker or automatically, so always under "More fields".
const DETAIL_TREE_FIELDS = [
  { name: "scientific_name", labelKey: "scientificName", type: "text" },
  { name: "scientific_synonym", labelKey: "scientificSynonym", type: "text" },
  { name: "genus", labelKey: "genus", type: "text" },
  { name: "date_surveyed", labelKey: "surveyed", type: "date" },
];
const HIDDEN_TYPE_FIELDS = [
  "common_name",
  "tree_type",
  "edible",
  "flowering",
  "fruit_category",
];

function hasValue(value) {
  return value !== null && value !== undefined && String(value).trim() !== "";
}

function fieldWasUsed(name, properties) {
  return (
    hasValue(properties[name]) ||
    annotationData.features.some(
      (feature) =>
        ["manual", "gps"].includes(feature.properties.detection_method) &&
        hasValue(feature.properties[name]),
    )
  );
}

// Catalogue types plus names you typed yourself on earlier trees; your own
// names join the group of a type they contain ("Säulen-Hainbuche").
function typeChoices() {
  const choices = [...TREE_IDENTIFICATION_CATALOG];
  const known = new Set(choices.map((entry) => entry.common_name));
  annotationData.features.forEach(({ properties }) => {
    const name = String(properties.common_name || "").trim();
    if (!/\p{L}{2}/u.test(name) || known.has(name)) return;
    known.add(name);
    const type = findTreeType(properties);
    choices.push({
      common_name: name,
      scientific_name: properties.scientific_name || "",
      genus: properties.genus || type?.genus || "",
      tree_type: properties.tree_type || type?.tree_type || "",
      group: type?.group,
    });
  });
  return choices;
}

// Fills the botanical details of a type without touching what is typed.
function fillTypeFields(form, choice) {
  const values = {
    common_name: choice.common_name,
    scientific_name: choice.scientific_name || "",
    scientific_synonym: choice.scientific_synonym || "",
    genus: choice.genus || "",
    tree_type: choice.tree_type || "",
    edible: choice.edible ? "true" : "false",
    flowering: choice.flowering ? "true" : "false",
    fruit_category: choice.fruit_category || "",
  };
  Object.entries(values).forEach(([name, value]) => {
    if (form.elements[name]) form.elements[name].value = value;
  });
}

// The chosen type's group as one-tap chips: the main type, its subtypes and
// names of your own in that group, each with how many trees you have mapped.
function renderSubtypeChips(container, form, onChoose) {
  const current = form.elements.common_name.value;
  const group = findTreeType({ common_name: current })?.group;
  const members = group
    ? typeChoices().filter((choice) => choice.group === group)
    : [];
  container.replaceChildren();
  container.hidden = members.length < 2;
  if (container.hidden) return;
  const counts = new Map();
  annotationData.features.forEach(({ properties }) =>
    counts.set(
      properties.common_name,
      (counts.get(properties.common_name) || 0) + 1,
    ),
  );
  container.appendChild(popupText("tree-subtypes-caption", t("subtypes")));
  members.forEach((choice) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "subtype-chip";
    chip.setAttribute("aria-pressed", String(choice.common_name === current));
    chip.appendChild(popupText("", localizedCommonName(choice.common_name)));
    if (counts.get(choice.common_name)) {
      chip.appendChild(
        popupText("subtype-count", String(counts.get(choice.common_name))),
      );
    }
    chip.addEventListener("click", () => onChoose(choice));
    container.appendChild(chip);
  });
}

function typeSuggestions(query) {
  const choices = typeChoices();
  const wanted = searchKey(query.trim());
  if (!wanted) {
    const counts = new Map();
    annotationData.features.forEach(({ properties }) => {
      const name = properties.common_name;
      if (name) counts.set(name, (counts.get(name) || 0) + 1);
    });
    return choices
      .filter((choice) => counts.has(choice.common_name))
      .sort((a, b) => counts.get(b.common_name) - counts.get(a.common_name))
      .slice(0, 6);
  }
  const rank = (choice) => {
    const names = [
      choice.common_name,
      COMMON_NAME_EN[choice.common_name],
      choice.scientific_name,
    ]
      .filter(Boolean)
      .map(searchKey);
    if (names.some((name) => name.startsWith(wanted))) return 0;
    if (
      names.some((name) =>
        name.split(/[\s-]+/).some((word) => word.startsWith(wanted)),
      )
    )
      return 1;
    return names.some((name) => name.includes(wanted)) ? 2 : null;
  };
  return choices
    .map((choice) => [choice, rank(choice)])
    .filter(([, score]) => score !== null)
    .sort(
      ([a, scoreA], [b, scoreB]) =>
        scoreA - scoreB ||
        localizedCommonName(a.common_name).localeCompare(
          localizedCommonName(b.common_name),
        ),
    )
    .slice(0, 6)
    .map(([choice]) => choice);
}

function editorInput(name, type, value) {
  const input = document.createElement("input");
  input.name = name;
  input.id = `tree-editor-${name}`;
  input.type = type;
  input.value = value ?? "";
  if (type === "number") {
    input.step = "0.1";
    input.min = "0";
    input.inputMode = "decimal";
  }
  return input;
}

function editorField(label, control) {
  const wrapper = document.createElement("div");
  wrapper.className = "annotation-field";
  const labelElement = document.createElement("label");
  labelElement.textContent = label;
  labelElement.htmlFor = control.id;
  wrapper.append(labelElement, control);
  return wrapper;
}

function fieldLabel({ labelKey, unit }) {
  return unit ? `${t(labelKey)} (${unit})` : t(labelKey);
}

function buildTypeField(form, properties) {
  const wrapper = document.createElement("div");
  wrapper.className = "annotation-field tree-type-field";
  const input = editorInput("tree_type_search", "text", "");
  input.value = properties.common_name
    ? localizedCommonName(properties.common_name)
    : "";
  input.placeholder = t("treeTypePlaceholder");
  input.autocomplete = "off";
  input.autocapitalize = "words";
  input.enterKeyHint = "done";
  input.setAttribute("role", "combobox");
  input.setAttribute("aria-autocomplete", "list");
  const label = document.createElement("label");
  label.textContent = t("treeSelection");
  label.htmlFor = input.id;
  const list = document.createElement("div");
  list.className = "tree-type-suggestions";
  list.setAttribute("role", "listbox");
  list.hidden = true;

  const subtypes = document.createElement("div");
  subtypes.className = "tree-subtypes";
  const fillType = (choice) => {
    fillTypeFields(form, choice);
    renderSubtypeChips(subtypes, form, choose);
  };
  const choose = (choice) => {
    fillType(choice);
    input.value = localizedCommonName(choice.common_name);
    list.hidden = true;
  };
  const render = () => {
    const suggestions = typeSuggestions(input.value);
    list.replaceChildren();
    if (!input.value.trim() && suggestions.length) {
      list.appendChild(popupText("tree-type-caption", t("mostUsedTypes"), "p"));
    }
    suggestions.forEach((choice) => {
      const option = document.createElement("button");
      option.type = "button";
      option.className = "tree-type-option";
      option.setAttribute("role", "option");
      option.append(
        popupText("", localizedCommonName(choice.common_name), "strong"),
        popupText("", choice.scientific_name || "", "span"),
      );
      // pointerdown, so the input's blur doesn't hide the list first
      option.addEventListener("pointerdown", (event) => {
        event.preventDefault();
        choose(choice);
      });
      option.addEventListener("click", () => choose(choice));
      list.appendChild(option);
    });
    list.hidden = suggestions.length === 0;
  };

  input.addEventListener("focus", render);
  input.addEventListener("input", () => {
    const typed = input.value.trim();
    const key = treeNameKey(typed);
    const type = findTreeType({ common_name: typed });
    const exactType =
      type &&
      [type.common_name, type.english_name].map(treeNameKey).includes(key);
    const own = typeChoices().find(
      (choice) => treeNameKey(choice.common_name) === key,
    );
    // A name of your own keeps only the genus of a type it contains.
    fillType(
      exactType
        ? type
        : own || {
            common_name: typed,
            genus: type?.genus,
            tree_type: type?.tree_type,
          },
    );
    render();
  });
  input.addEventListener("blur", () => {
    list.hidden = true;
  });
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      const first = typeSuggestions(input.value)[0];
      if (first && input.value.trim()) choose(first);
      input.blur();
    } else if (event.key === "Escape" && !list.hidden) {
      event.stopPropagation();
      list.hidden = true;
    }
  });
  renderSubtypeChips(subtypes, form, choose);
  wrapper.append(label, input, list, subtypes);
  return wrapper;
}

function buildChoiceChips(name, values, selected, labelFor) {
  const group = document.createElement("fieldset");
  group.className = "choice-chips";
  const legend = document.createElement("legend");
  legend.textContent = t(name);
  group.appendChild(legend);
  values.forEach((value) => {
    const chip = document.createElement("label");
    const radio = document.createElement("input");
    radio.type = "radio";
    radio.name = name;
    radio.value = value;
    radio.checked = value === selected;
    chip.append(radio, popupText("", labelFor(value), "span"));
    group.appendChild(chip);
  });
  return group;
}

function buildOsmDetails(properties) {
  const record = document.createElement("dl");
  record.className = "tree-record";
  [
    [t("osmElement"), `node/${properties.osm_id || t("notRecorded")}`],
    [t("osmLeafType"), properties.osm_leaf_type || t("notRecorded")],
    [
      t("osmMappedCount"),
      integerFormatter.format(properties.osm_tree_count_estimate || 1),
    ],
    [t("osmDescriptionTag"), properties.osm_description || t("notRecorded")],
    [
      t("osmUpdated"),
      properties.osm_timestamp
        ? formatDate(properties.osm_timestamp)
        : t("notRecorded"),
    ],
  ].forEach(([label, value]) => appendRecordRow(record, label, value));
  try {
    Object.entries(JSON.parse(properties.osm_tags_json || "{}"))
      .sort(([first], [second]) => first.localeCompare(second))
      .forEach(([key, value]) => appendRecordRow(record, key, String(value)));
  } catch {
    // tags are optional
  }
  return record;
}

function buildAnnotationEditor(feature) {
  const properties = feature.properties;
  const isOsm = properties.detection_method === "openstreetmap-overpass";
  const [lng, lat] = feature.geometry.coordinates;

  const form = document.createElement("form");
  form.className = "tree-editor-form";

  const header = document.createElement("header");
  header.className = "tree-editor-header";
  const title = popupText(
    "",
    properties.common_name
      ? localizedCommonName(properties.common_name)
      : t("newTree"),
    "h2",
  );
  title.id = "tree-editor-title";
  const close = document.createElement("button");
  close.type = "button";
  close.className = "tree-editor-close";
  close.textContent = "×";
  close.setAttribute("aria-label", t("closeEditor"));
  close.addEventListener("click", closeAnnotationEditor);
  const meta = [
    Number.isFinite(Number(properties.location_accuracy_m)) &&
    hasValue(properties.location_accuracy_m)
      ? `GPS ±${Math.round(Number(properties.location_accuracy_m))} m`
      : t(isOsm ? "methodOsm" : "methodManual"),
    `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
  ].join(" · ");
  header.append(title, close, popupText("tree-editor-meta", meta, "p"));

  const body = document.createElement("div");
  body.className = "tree-editor-body";
  HIDDEN_TYPE_FIELDS.forEach((name) => {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = name;
    input.value =
      name === "edible" || name === "flowering"
        ? String(Boolean(properties[name]))
        : properties[name] || "";
    form.appendChild(input);
  });
  body.appendChild(buildTypeField(form, properties));
  body.appendChild(
    buildChoiceChips(
      "health",
      ["good", "fair", "poor", "dead"],
      treeHealthKey({ properties }),
      healthLabel,
    ),
  );

  const reviewed = document.createElement("label");
  reviewed.className = "toggle-field";
  const reviewedBox = document.createElement("input");
  reviewedBox.type = "checkbox";
  reviewedBox.name = "reviewed";
  reviewedBox.checked = properties.review_status === "reviewed";
  reviewed.append(reviewedBox, popupText("", t("reviewed"), "span"));
  body.appendChild(reviewed);

  const notes = document.createElement("textarea");
  notes.name = "notes";
  notes.id = "tree-editor-notes";
  notes.rows = 2;
  notes.value = properties.notes || "";
  notes.placeholder = t("notesPlaceholder");
  body.appendChild(editorField(t("notes"), notes));

  const more = document.createElement("details");
  more.className = "more-fields";
  const moreSummary = document.createElement("summary");
  moreSummary.textContent = t("moreFields");
  const moreGrid = document.createElement("div");
  moreGrid.className = "tree-editor-grid";
  more.append(moreSummary, moreGrid);

  const usedGrid = document.createElement("div");
  usedGrid.className = "tree-editor-grid";
  OPTIONAL_TREE_FIELDS.forEach((field) => {
    const control = editorInput(
      field.name,
      field.type || "number",
      properties[field.name],
    );
    const target = fieldWasUsed(field.name, properties) ? usedGrid : moreGrid;
    target.appendChild(editorField(fieldLabel(field), control));
  });
  DETAIL_TREE_FIELDS.forEach((field) => {
    const control = editorInput(field.name, field.type, properties[field.name]);
    moreGrid.appendChild(editorField(fieldLabel(field), control));
  });
  if (usedGrid.childElementCount) body.appendChild(usedGrid);
  if (isOsm) more.appendChild(buildOsmDetails(properties));
  body.appendChild(more);

  const actions = document.createElement("div");
  actions.className = "tree-editor-actions";
  const deleteButton = document.createElement("button");
  deleteButton.type = "button";
  deleteButton.className = "text-button danger";
  deleteButton.textContent = t("deleteAnnotation");
  deleteButton.addEventListener("click", () => {
    if (window.confirm(t("confirmDelete"))) deleteAnnotation(properties.id);
  });
  const saveButton = document.createElement("button");
  saveButton.type = "submit";
  saveButton.className = "annotation-button primary";
  saveButton.textContent = t("saveTree");
  actions.append(deleteButton, saveButton);

  form.append(header, body, actions);
  // Trees saved with a name only get the catalogue details, stored on Save.
  const known = findTreeType(properties);
  if (known?.common_name === properties.common_name && !properties.genus) {
    fillTypeFields(form, known);
  }
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const text = (name) => form.elements[name].value.trim();
    const updated = { ...properties, updated_at: new Date().toISOString() };
    [
      "common_name",
      "scientific_name",
      "scientific_synonym",
      "genus",
      "notes",
      "photo_url",
    ].forEach((name) => {
      updated[name] = text(name);
    });
    OPTIONAL_TREE_FIELDS.filter((field) => !field.type).forEach(({ name }) => {
      updated[name] = optionalFormNumber(form, name);
    });
    Object.assign(updated, {
      tree_type: form.elements.tree_type.value || null,
      edible: form.elements.edible.value === "true",
      flowering: form.elements.flowering.value === "true",
      fruit_category: text("fruit_category") || null,
      health: form.elements.health.value || properties.health,
      review_status: form.elements.reviewed.checked ? "reviewed" : "unreviewed",
      date_surveyed: form.elements.date_surveyed.value || null,
    });
    updateAnnotation({ ...feature, properties: updated });
    closeAnnotationEditor();
    setAnnotationStatus("annotationSaved");
  });
  return form;
}

function optionalFormNumber(form, name) {
  const rawValue = form.elements[name].value.trim();
  if (!rawValue) return null;
  const parsed = Number(rawValue.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function treeEditorIsOpen() {
  return !document.getElementById("tree-editor").hidden;
}

// Ring around the tree being edited, so you can see which one it is.
function showEditingRing(coordinates) {
  map?.getSource("editing")?.setData({
    type: "FeatureCollection",
    features: coordinates
      ? [
          {
            type: "Feature",
            geometry: { type: "Point", coordinates },
            properties: {},
          },
        ]
      : [],
  });
}

function openAnnotationEditor(feature, { focusType = false } = {}) {
  activePopup?.remove();
  activeAnnotationId = feature.properties.id;
  const editor = document.getElementById("tree-editor");
  editor.replaceChildren(buildAnnotationEditor(feature));
  editor.hidden = false;
  document.body.classList.add("is-editing");
  showEditingRing(feature.geometry.coordinates);
  // Keyboard first (iOS only opens it within the tap that led here).
  if (focusType) editor.querySelector("#tree-editor-tree_type_search").focus();
  const phone = window.matchMedia("(max-width: 760px)").matches;
  map.easeTo({
    center: feature.geometry.coordinates,
    offset: phone
      ? [0, -Math.round(editor.offsetHeight / 2)]
      : [-Math.round(editor.offsetWidth / 2 + 9), 0],
    duration: 500,
  });
}

function closeAnnotationEditor() {
  const editor = document.getElementById("tree-editor");
  if (editor.hidden) return;
  editor.hidden = true;
  editor.replaceChildren();
  activeAnnotationId = null;
  document.body.classList.remove("is-editing");
  showEditingRing(null);
}

// Keep the sheet above the on-screen keyboard on phones.
window.visualViewport?.addEventListener("resize", () => {
  const covered =
    window.innerHeight -
    window.visualViewport.height -
    window.visualViewport.offsetTop;
  document.documentElement.style.setProperty(
    "--keyboard-inset",
    `${Math.max(0, Math.round(covered))}px`,
  );
});
