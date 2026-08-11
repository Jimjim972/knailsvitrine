import assert from "node:assert/strict";
import test from "node:test";
import { SERVICE_CATEGORIES } from "../../../lib/services/constants.ts";
import { groupPublicServices, mapAdminService, mapPublicService, sortServices, type ServiceRow } from "../../../lib/services/mappers.ts";

const row = (partial: Partial<ServiceRow>): ServiceRow => ({ id: "00000000-0000-4000-8000-000000000001", nom: "Service", description: "Description", categorie: "onglerie_manucure", prix: "45.00", type_prix: "fixed", duree_minutes: 45, badge: null, ordre_affichage: 0, actif: true, created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z", ...partial });

test("uses product rank then order, creation timestamp and id", () => {
  const services = [
    mapAdminService(row({ id: "00000000-0000-4000-8000-000000000004", categorie: "esthetique_visage" })),
    mapAdminService(row({ id: "00000000-0000-4000-8000-000000000003", categorie: "onglerie_manucure", ordre_affichage: 1 })),
    mapAdminService(row({ id: "00000000-0000-4000-8000-000000000002", categorie: "onglerie_manucure", created_at: "2026-01-01T00:00:01Z" })),
    mapAdminService(row({ id: "00000000-0000-4000-8000-000000000001", categorie: "onglerie_manucure" })),
  ];
  assert.deepEqual(sortServices(services).map(({ id }) => id), [
    "00000000-0000-4000-8000-000000000001", "00000000-0000-4000-8000-000000000002",
    "00000000-0000-4000-8000-000000000003", "00000000-0000-4000-8000-000000000004",
  ]);
});

test("separates admin and public labels and keeps all empty groups", () => {
  const admin = mapAdminService(row({}));
  const publicService = mapPublicService(row({ duree_minutes: null, badge: null }));
  const groups = groupPublicServices([publicService]);
  assert.equal(admin.categoryLabel, "Onglerie et manucure");
  assert.equal(publicService.durationLabel, null);
  assert.deepEqual(Object.keys(groups), ["onglerie_manucure", "soins_corps", "esthetique_visage"]);
  assert.equal(groups.soins_corps.length, 0);
});

test("keeps the exact public category labels in the centralized product contract", () => {
  assert.deepEqual(
    SERVICE_CATEGORIES.map(({ code, publicLabel }) => [code, publicLabel]),
    [
      ["onglerie_manucure", "Onglerie & Manucure"],
      ["soins_corps", "Soins du Corps"],
      ["esthetique_visage", "Esthétique & Visage"],
    ],
  );
});

test("maps exact decimal text to cents at the cent and maximum boundaries", () => {
  assert.equal(mapAdminService(row({ prix: "0.01" })).priceMinorUnits, 1);
  assert.equal(mapAdminService(row({ prix: "99999999.99" })).priceMinorUnits, 9_999_999_999);
});
