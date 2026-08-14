import assert from "node:assert/strict";
import test from "node:test";
import { getServiceCategoryPresentation } from "../../../lib/services/constants.ts";
import { buildPublicServiceSections, mapAdminService, mapPublicService, mapServiceCategory, sortServices, type ServiceCategoryRow, type ServiceRow } from "../../../lib/services/mappers.ts";

const row = (partial: Partial<ServiceRow>): ServiceRow => ({ id: "00000000-0000-4000-8000-000000000001", nom: "Service", description: "Description", categorie: "onglerie_manucure", prix: "45.00", type_prix: "fixed", duree_minutes: 45, badge: null, ordre_affichage: 0, actif: true, created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z", ...partial });
const categoryRow = (partial: Partial<ServiceCategoryRow>): ServiceCategoryRow => ({ code: "onglerie_manucure", nom: "Onglerie & Manucure", ordre_affichage: 0, created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z", ...partial });
const categories = [
  mapServiceCategory(categoryRow({})),
  mapServiceCategory(categoryRow({ code: "soins_corps", nom: "Soins du Corps", ordre_affichage: 1 })),
  mapServiceCategory(categoryRow({ code: "esthetique_visage", nom: "Esthétique & Visage", ordre_affichage: 2 })),
];
const categoriesByCode = new Map(categories.map((category) => [category.code, category]));

test("uses product rank then order, creation timestamp and id", () => {
  const services = [
    mapAdminService(row({ id: "00000000-0000-4000-8000-000000000004", categorie: "esthetique_visage" }), categoriesByCode),
    mapAdminService(row({ id: "00000000-0000-4000-8000-000000000003", categorie: "onglerie_manucure", ordre_affichage: 1 }), categoriesByCode),
    mapAdminService(row({ id: "00000000-0000-4000-8000-000000000002", categorie: "onglerie_manucure", created_at: "2026-01-01T00:00:01Z" }), categoriesByCode),
    mapAdminService(row({ id: "00000000-0000-4000-8000-000000000001", categorie: "onglerie_manucure" }), categoriesByCode),
  ];
  assert.deepEqual(sortServices(services, categories).map(({ id }) => id), [
    "00000000-0000-4000-8000-000000000001", "00000000-0000-4000-8000-000000000002",
    "00000000-0000-4000-8000-000000000003", "00000000-0000-4000-8000-000000000004",
  ]);
});

test("uses database category labels and keeps empty dynamic sections", () => {
  const admin = mapAdminService(row({}), categoriesByCode);
  const publicService = mapPublicService(row({ duree_minutes: null, badge: null }));
  const sections = buildPublicServiceSections(categories, [publicService]);
  assert.equal(admin.categoryLabel, "Onglerie & Manucure");
  assert.equal(publicService.durationLabel, null);
  assert.deepEqual(sections.map(({ category }) => category.code), ["onglerie_manucure", "soins_corps", "esthetique_visage"]);
  assert.equal(sections[1].services.length, 0);
});

test("preserves initial presentations and supplies a branded fallback for new categories", () => {
  assert.equal(getServiceCategoryPresentation("onglerie_manucure", "Onglerie & Manucure").image, "/images/nails-signature.jpg");
  const fallback = getServiceCategoryPresentation("category_123", "Massages");
  assert.equal(fallback.image, "/images/salon-interior.jpg");
  assert.equal(fallback.imageTitle, "Massages");
});

test("maps exact decimal text to cents at the cent and maximum boundaries", () => {
  assert.equal(mapAdminService(row({ prix: "0.01" }), categoriesByCode).priceMinorUnits, 1);
  assert.equal(mapAdminService(row({ prix: "99999999.99" }), categoriesByCode).priceMinorUnits, 9_999_999_999);
});
