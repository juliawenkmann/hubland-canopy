/*
 * Community-mapped fruit locations from mundraub.org inside the campus.
 */
"use strict";

const MUNDRAUB_SOURCE = {
  title: "mundraub.org",
  url: "https://mundraub.org/map#z=15&lat=49.78594694963257&lng=9.967989921569826",
  retrieved: "2026-07-30",
};

const MUNDRAUB_ROWS = [
  ["80300", 9.97626721859, 49.783674833979, "Kirsche", "Prunus sp.", "Prunus", "6"],
  ["80297", 9.97226536274, 49.784107791065, "Apfel", "Malus sp.", "Malus", "4"],
  ["80296", 9.971771836281, 49.784232481987, "Mirabelle", "Prunus sp.", "Prunus", "7"],
  ["80295", 9.969304203987, 49.785036038014, "Kirsche", "Prunus sp.", "Prunus", "6"],
  ["80237", 9.97664809227, 49.785150335849, "Kirsche", "Prunus sp.", "Prunus", "6"],
  ["80294", 9.968633651733, 49.785313123209, "Kirsche", "Prunus sp.", "Prunus", "6"],
  ["80236", 9.975950717926, 49.785351222299, "Apfel", "Malus sp.", "Malus", "4"],
  ["80290", 9.969422221184, 49.78584304423, "Apfel", "Malus sp.", "Malus", "4"],
  ["80291", 9.969035983086, 49.785874215874, "Apfel", "Malus sp.", "Malus", "4"],
  ["80292", 9.968891143799, 49.785877679389, "Birne", "Pyrus sp.", "Pyrus", "5"],
  ["80293", 9.968740940094, 49.785898460472, "Apfel", "Malus sp.", "Malus", "4"],
  ["80288", 9.970790147781, 49.786272518451, "Apfel", "Malus sp.", "Malus", "4"],
  ["80289", 9.970682859421, 49.786514961895, "Apfel", "Malus sp.", "Malus", "4"],
  ["80239", 9.974539875984, 49.786615402395, "Kirsche", "Prunus sp.", "Prunus", "6"],
  ["80287", 9.971503615379, 49.787301163001, "Apfel", "Malus sp.", "Malus", "4"],
  ["80238", 9.975044131279, 49.787328870296, "Kirsche", "Prunus sp.", "Prunus", "6"],
  ["80240", 9.974191188812, 49.787803355266, "Kirsche", "Prunus sp.", "Prunus", "6"],
];

const MUNDRAUB_DATA = {
  type: "FeatureCollection",
  name: "Mundraub fruit-tree locations inside Campus Hubland Nord",
  source: MUNDRAUB_SOURCE,
  features: MUNDRAUB_ROWS.map(
    ([sourceId, longitude, latitude, category, scientificName, genus, categoryId]) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [longitude, latitude] },
      properties: {
        id: `mundraub-${sourceId}`,
        source_id: sourceId,
        common_name: category,
        scientific_name: scientificName,
        genus,
        dbh_cm: null,
        height_m: null,
        canopy_spread_m: null,
        health: "not_recorded",
        co2_stored_kg: null,
        co2_per_year_kg: null,
        stormwater_l_per_year: null,
        date_surveyed: null,
        photo_url: "",
        trunk_circumference_cm: null,
        tree_type: "Obstbaum-Fundort",
        fruit_category: category,
        fruit_category_id: categoryId,
        taxonomy_basis: "Gattung aus der Mundraub-Obstkategorie abgeleitet",
        data_source: "mundraub",
        source_name: MUNDRAUB_SOURCE.title,
        source_updated: MUNDRAUB_SOURCE.retrieved,
        source_license: "Mundraub-Nutzungsbedingungen",
        source_url: `https://mundraub.org/node/${sourceId}`,
      },
    }),
  ),
};
