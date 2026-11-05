/*
 * Tree types offered in the editor, in groups: a main type followed by its
 * subtypes. Trees store the German name, so existing names must never change.
 */
"use strict";

const TREE_FORMS = {
  L: "Laubbaum",
  N: "Nadelbaum",
  S: "Strauch",
  O: "Obstbaum-Fundort",
};

// prettier-ignore
const TREE_TYPE_GROUPS = [
  // German name, English name, scientific name, growth form, details.
  // `plate` is the illustration in assets/plates; subtypes share their main type's.
  [
    ["Ahorn", "Maple", "Acer sp.", "L", { plate: "acer-platanoides" }],
    ["Spitz-Ahorn", "Norway maple", "Acer platanoides", "L"],
    ["Berg-Ahorn", "Sycamore maple", "Acer pseudoplatanus", "L", { plate: "genus-acer" }],
    ["Feld-Ahorn", "Field maple", "Acer campestre", "L", { plate: "genus-acer" }],
    ["Rot-Ahorn", "Red maple", "Acer rubrum", "L", { plate: "genus-acer" }],
    ["Silber-Ahorn", "Silver maple", "Acer saccharinum", "L", { plate: "genus-acer" }],
    ["Fächerahorn", "Japanese maple", "Acer palmatum", "L", { plate: "acer-palmatum" }],
  ],
  [
    ["Akazie", "Black locust", "Robinia pseudoacacia", "L", { plate: "robinia-pseudoacacia" }],
    ["Kugel-Robinie", "Mop-top robinia", "Robinia pseudoacacia ‘Umbraculifera’", "L"],
  ],
  [["Amberbaum", "Sweetgum", "Liquidambar styraciflua", "L"]],
  [
    ["Birke", "Birch", "Betula sp.", "L", { plate: "betula" }],
    ["Hänge-Birke", "Silver birch", "Betula pendula", "L"],
    ["Moor-Birke", "Downy birch", "Betula pubescens", "L"],
    ["Himalaya-Birke", "Himalayan birch", "Betula utilis", "L"],
  ],
  [["Blasenbaum", "Golden rain tree", "Koelreuteria paniculata", "L", { plate: "koelreuteria-paniculata" }]],
  [["Blauglockenbaum", "Empress tree", "Paulownia tomentosa", "L", { plate: "paulownia-tomentosa" }]],
  [
    ["Buche", "European beech", "Fagus sylvatica", "L", { plate: "fagus-sylvatica" }],
    ["Blutbuche", "Copper beech", "Fagus sylvatica f. purpurea", "L"],
  ],
  [
    ["Eberesche", "Rowan", "Sorbus aucuparia", "L", { plate: "sorbus-aucuparia" }],
    ["Speierling", "Service tree", "Sorbus domestica", "L"],
  ],
  [["Eibe", "European yew", "Taxus baccata", "N", { plate: "taxus-baccata" }]],
  [
    ["Eiche", "Oak", "Quercus sp.", "L", { plate: "quercus-robur" }],
    ["Stiel-Eiche", "Pedunculate oak", "Quercus robur", "L"],
    ["Trauben-Eiche", "Sessile oak", "Quercus petraea", "L"],
    ["Rot-Eiche", "Red oak", "Quercus rubra", "L"],
    ["Säulen-Eiche", "Cypress oak", "Quercus robur ‘Fastigiata’", "L"],
  ],
  [["Eisenholzbaum", "Persian ironwood", "Parrotia persica", "L"]],
  [
    ["Erle", "Alder", "Alnus sp.", "L", { plate: "alnus-glutinosa" }],
    ["Schwarz-Erle", "Black alder", "Alnus glutinosa", "L"],
    ["Grau-Erle", "Grey alder", "Alnus incana", "L"],
    ["Italienische Erle", "Italian alder", "Alnus cordata", "L"],
    ["Spaeths Erle", "Spaeth alder", "Alnus × spaethii", "L", { plate: "genus-alnus" }],
  ],
  [
    ["Esche", "Ash", "Fraxinus sp.", "L", { plate: "genus-fraxinus" }],
    ["Gemeine Esche", "European ash", "Fraxinus excelsior", "L"],
    ["Straßen-Esche ‘Westhof’s Glorie’", "European ash ‘Westhof’s Glorie’", "Fraxinus excelsior ‘Westhof’s Glorie’", "L"],
    ["Schmalblättrige Esche", "Narrow-leaved ash", "Fraxinus angustifolia", "L"],
    ["Schmalblättrige Esche ‘Raywood’", "Narrow-leaved ash ‘Raywood’", "Fraxinus angustifolia ‘Raywood’", "L"],
    ["Blumen-Esche", "Manna ash", "Fraxinus ornus", "L"],
  ],
  [["Esskastanie", "Sweet chestnut", "Castanea sativa", "L"]],
  [
    ["Fichte", "Spruce", "Picea sp.", "N", { plate: "picea-abies" }],
    ["Gemeine Fichte", "Norway spruce", "Picea abies", "N"],
    ["Blaufichte", "Blue spruce", "Picea pungens", "N", { plate: "picea-pungens" }],
    ["Serbische Fichte", "Serbian spruce", "Picea omorika", "N"],
  ],
  [["Ginkgo", "Ginkgo", "Ginkgo biloba", "L", { plate: "ginkgo-biloba" }]],
  [["Götterbaum", "Tree of heaven", "Ailanthus altissima", "L", { plate: "ailanthus-altissima" }]],
  [
    ["Hainbuche", "Hornbeam", "Carpinus betulus", "L", { plate: "carpinus-betulus" }],
    ["Säulen-Hainbuche", "Columnar hornbeam", "Carpinus betulus ‘Fastigiata’", "L"],
  ],
  [["Japanischer Schnurbaum", "Japanese pagoda tree", "Styphnolobium japonicum", "L", { plate: "styphnolobium-japonicum", scientific_synonym: "Sophora japonica" }]],
  [["Judasbaum", "Judas tree", "Cercis siliquastrum", "L"]],
  [
    ["Kastanie", "Horse chestnut", "Aesculus sp.", "L", { plate: "aesculus" }],
    ["Gewöhnliche Rosskastanie", "Common horse chestnut", "Aesculus hippocastanum", "L"],
    ["Rotblühende Rosskastanie", "Red horse chestnut", "Aesculus × carnea", "L"],
  ],
  [
    ["Kiefer", "Pine", "Pinus sp.", "N", { plate: "pinus-sylvestris" }],
    ["Wald-Kiefer", "Scots pine", "Pinus sylvestris", "N"],
    ["Schwarz-Kiefer", "Austrian pine", "Pinus nigra", "N"],
  ],
  [
    ["Lärche", "Larch", "Larix sp.", "N", { plate: "larix-decidua" }],
    ["Europäische Lärche", "European larch", "Larix decidua", "N"],
    ["Japanische Lärche", "Japanese larch", "Larix kaempferi", "N"],
  ],
  [
    ["Lebensbaum", "Arborvitae", "Thuja sp.", "N", { plate: "thuja-occidentalis" }],
    ["Abendländischer Lebensbaum", "Eastern arborvitae", "Thuja occidentalis", "N"],
    ["Riesen-Lebensbaum", "Western red cedar", "Thuja plicata", "N"],
  ],
  [
    ["Lederhülsenbaum", "Honey locust", "Gleditsia triacanthos", "L", { plate: "genus-gleditsia" }],
    ["Dornenloser Lederhülsenbaum", "Thornless honey locust", "Gleditsia triacanthos f. inermis", "L"],
  ],
  [
    ["Linde", "Linden", "Tilia sp.", "L", { plate: "tilia", flowering: true, fruit_category: "Linde" }],
    ["Winter-Linde", "Small-leaved linden", "Tilia cordata", "L", { flowering: true, fruit_category: "Linde" }],
    ["Sommer-Linde", "Large-leaved linden", "Tilia platyphyllos", "L", { flowering: true, fruit_category: "Linde" }],
    ["Kaiser-Linde", "Common linden", "Tilia × europaea", "L", { flowering: true, fruit_category: "Linde" }],
    ["Silber-Linde", "Silver linden", "Tilia tomentosa", "L", { flowering: true, fruit_category: "Linde" }],
    ["Silber-Linde ‘Brabant’", "Silver linden ‘Brabant’", "Tilia tomentosa ‘Brabant’", "L", { flowering: true, fruit_category: "Linde" }],
  ],
  [["Magnolie", "Magnolia", "Magnolia sp.", "S"]],
  [
    ["Mammutbaum", "Giant sequoia", "Sequoiadendron giganteum", "N"],
    ["Urweltmammutbaum", "Dawn redwood", "Metasequoia glyptostroboides", "N"],
  ],
  [
    ["Mehlbeere", "Common whitebeam", "Sorbus aria", "L", { plate: "sorbus-aria" }],
    ["Schwedische Mehlbeere", "Swedish whitebeam", "Sorbus intermedia", "L"],
    ["Elsbeere", "Wild service tree", "Sorbus torminalis", "L"],
  ],
  [
    ["Pappel", "Poplar", "Populus sp.", "L", { plate: "populus-nigra" }],
    ["Espe", "European aspen", "Populus tremula", "L", { plate: "populus-tremula" }],
    ["Schwarz-Pappel", "Black poplar", "Populus nigra", "L"],
    ["Silber-Pappel", "White poplar", "Populus alba", "L"],
  ],
  [
    ["Platane", "Plane tree", "Platanus sp.", "L", { plate: "platanus" }],
    ["Ahornblättrige Platane", "London plane tree", "Platanus × acerifera", "L", { scientific_synonym: "Platanus × hispanica" }],
  ],
  [["Douglasie", "Douglas fir", "Pseudotsuga menziesii", "N"]],
  [
    ["Tanne", "Fir", "Abies sp.", "N"],
    ["Weiß-Tanne", "Silver fir", "Abies alba", "N"],
    ["Nordmann-Tanne", "Nordmann fir", "Abies nordmanniana", "N"],
  ],
  [["Trompetenbaum", "Indian bean tree", "Catalpa bignonioides", "L"]],
  [["Tulpenbaum", "Tulip tree", "Liriodendron tulipifera", "L"]],
  [
    ["Ulme", "Elm", "Ulmus sp.", "L", { plate: "ulmus-glabra" }],
    ["Berg-Ulme", "Wych elm", "Ulmus glabra", "L"],
    ["Feld-Ulme", "Field elm", "Ulmus minor", "L"],
  ],
  [["Wacholder", "Juniper", "Juniperus sp.", "S"]],
  [
    ["Weide", "Willow", "Salix sp.", "L"],
    ["Silber-Weide", "White willow", "Salix alba", "L"],
    ["Trauer-Weide", "Weeping willow", "Salix × sepulcralis", "L"],
    ["Sal-Weide", "Goat willow", "Salix caprea", "S"],
  ],
  [
    ["Weißdorn", "Hawthorn", "Crataegus sp.", "L", { plate: "crataegus-monogyna" }],
    ["Eingriffliger Weißdorn", "Common hawthorn", "Crataegus monogyna", "L"],
    ["Rotdorn", "Red hawthorn", "Crataegus laevigata ‘Paul’s Scarlet’", "L"],
    ["Apfeldorn", "Lavalle hawthorn", "Crataegus × lavallei", "L"],
  ],
  [["Zürgelbaum", "Nettle tree", "Celtis australis", "L"]],

  // Shrubs
  [["Berberitze", "Common barberry", "Berberis vulgaris", "S", { plate: "berberis-vulgaris", edible: true, fruit_category: "Berberitze" }]],
  [["Felsenbirne", "Serviceberry", "Amelanchier lamarckii", "S", { plate: "amelanchier-lamarckii" }]],
  [["Flieder", "Lilac", "Syringa sp.", "S", { plate: "syringa", flowering: true, fruit_category: "Flieder" }]],
  [["Holunder", "Black elder", "Sambucus nigra", "S", { plate: "sambucus-nigra" }]],
  [["Kirschlorbeer", "Cherry laurel", "Prunus laurocerasus", "S", { plate: "prunus-laurocerasus" }]],
  [["Kornelkirsche", "Cornelian cherry", "Cornus mas", "S", { plate: "cornus-mas" }]],
  [["Rose", "Rose", "Rosa sp.", "S", { plate: "rosa-wild", flowering: true, fruit_category: "Rose" }]],
  [["Schlehe", "Blackthorn", "Prunus spinosa", "S", { plate: "prunus-spinosa", edible: true, flowering: true, fruit_category: "Schlehe" }]],

  // Fruit and nut trees
  [
    ["Apfel", "Apple", "Malus domestica", "O", { plate: "fruit-apple", edible: true, fruit_category: "Apfel" }],
    ["Holzapfel", "European crab apple", "Malus sylvestris", "L"],
  ],
  [
    ["Birne", "Pear", "Pyrus communis", "O", { plate: "fruit-pear", edible: true, fruit_category: "Birne" }],
    ["Chinesische Wildbirne", "Callery pear", "Pyrus calleryana", "L"],
  ],
  [["Feige", "Fig", "Ficus carica", "O", { plate: "ficus-carica", edible: true, fruit_category: "Feige" }]],
  [
    ["Haselnuss", "Hazelnut", "Corylus avellana", "S", { plate: "corylus", edible: true, fruit_category: "Haselnuss" }],
    ["Baum-Hasel", "Turkish hazel", "Corylus colurna", "L", { edible: true, fruit_category: "Haselnuss" }],
  ],
  [
    ["Kirsche", "Cherry", "Prunus sp.", "O", { plate: "fruit-cherry", edible: true, fruit_category: "Kirsche" }],
    ["Vogelkirsche", "Wild cherry", "Prunus avium", "L", { plate: "prunus-avium", edible: true, flowering: true, fruit_category: "Kirsche" }],
    ["Sauerkirsche", "Sour cherry", "Prunus cerasus", "O", { edible: true, fruit_category: "Kirsche" }],
    ["Zierkirsche", "Japanese cherry", "Prunus serrulata", "L"],
    ["Traubenkirsche", "Bird cherry", "Prunus padus", "L"],
  ],
  [["Maulbeere", "Mulberry", "Morus sp.", "L", { plate: "morus", edible: true, fruit_category: "Maulbeere" }]],
  [["Mispel", "Medlar", "Mespilus germanica", "O", { plate: "mespilus-germanica", edible: true, fruit_category: "Mispel" }]],
  [
    ["Pflaume", "Plum", "Prunus domestica", "O", { plate: "fruit-plum", edible: true, fruit_category: "Pflaume" }],
    ["Mirabelle", "Mirabelle plum", "Prunus domestica subsp. syriaca", "O", { plate: "fruit-mirabelle", edible: true, fruit_category: "Mirabelle" }],
    ["Rote Mirabelle", "Red mirabelle plum", "Prunus domestica subsp. syriaca", "O", { plate: "red-mirabelle", edible: true, fruit_category: "Mirabelle" }],
    ["Blutpflaume", "Purple cherry plum", "Prunus cerasifera ‘Nigra’", "L"],
  ],
  [["Quitte", "Quince", "Cydonia oblonga", "O", { plate: "fruit-quince", edible: true, fruit_category: "Quitte" }]],
  [
    ["Walnuss", "Walnut", "Juglans regia", "L", { plate: "juglans", edible: true, fruit_category: "Walnuss" }],
    ["Schwarznuss", "Black walnut", "Juglans nigra", "L"],
  ],
];

const TREE_IDENTIFICATION_CATALOG = TREE_TYPE_GROUPS.flatMap((rows) =>
  rows.map(([common_name, english_name, scientific_name, form, details]) => ({
    common_name,
    english_name,
    scientific_name,
    genus: scientific_name.split(" ")[0],
    tree_type: TREE_FORMS[form],
    group: rows[0][0],
    plate: rows[0][4]?.plate,
    ...details,
  })),
);

// English names, looked up by the German name a tree stores.
const COMMON_NAME_EN = Object.fromEntries(
  TREE_IDENTIFICATION_CATALOG.map((entry) => [
    entry.common_name,
    entry.english_name,
  ]),
);

function searchKey(text) {
  return String(text || "")
    .trim()
    .toLocaleLowerCase("de")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

// For comparing names: "Bergahorn" is "Berg-Ahorn".
function treeNameKey(text) {
  return searchKey(text).replace(/ß/g, "ss").replace(/[\s-]/g, "");
}

const treeTypeCache = new Map();

// The catalogue type of a tree: by its name (German or English), its
// scientific name, or a catalogue name inside its own ("Säulen-Hainbuche").
function findTreeType(properties) {
  const name = treeNameKey(
    properties?.common_name || properties?.fruit_category,
  );
  const scientific = searchKey(
    properties?.scientific_name || properties?.scientific_synonym,
  );
  const cacheKey = `${name}|${scientific}`;
  if (treeTypeCache.has(cacheKey)) return treeTypeCache.get(cacheKey);
  const names = (entry) =>
    [entry.common_name, entry.english_name].map(treeNameKey);
  const longest = (matches) =>
    matches.sort((a, b) => b[1].length - a[1].length)[0]?.[0] || null;
  const match =
    (name &&
      TREE_IDENTIFICATION_CATALOG.find((entry) =>
        names(entry).includes(name),
      )) ||
    (scientific &&
      longest(
        TREE_IDENTIFICATION_CATALOG.flatMap((entry) =>
          [entry.scientific_name, entry.scientific_synonym]
            .filter(Boolean)
            .map(searchKey)
            .filter(
              (value) =>
                scientific === value || scientific.startsWith(`${value} `),
            )
            .map((value) => [entry, value]),
        ),
      )) ||
    (name &&
      longest(
        TREE_IDENTIFICATION_CATALOG.flatMap((entry) =>
          names(entry)
            .filter((value) => value.length >= 4 && name.includes(value))
            .map((value) => [entry, value]),
        ),
      )) ||
    null;
  treeTypeCache.set(cacheKey, match);
  return match;
}

// Genus as stored, or from the catalogue for trees saved with a name only.
function treeGenus(properties) {
  return properties?.genus || findTreeType(properties)?.genus || "";
}

function treePlate(properties) {
  const genus = treeGenus(properties);
  return (
    findTreeType(properties)?.plate ||
    TREE_IDENTIFICATION_CATALOG.find((entry) => entry.genus === genus)?.plate ||
    "tree"
  );
}
