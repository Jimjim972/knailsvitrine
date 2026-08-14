import assert from "node:assert/strict";
import test from "node:test";
import { executeServiceAction } from "../../../lib/services/action-core.ts";
import { validateVisibilityValues } from "../../../lib/validations/service.ts";

const values = { name: "Service", description: "D", category: "soins_corps", priceType: "fixed", price: "45", durationMinutes: "", badge: "", displayOrder: "0", active: "true" };

test("authorization and validation failures stop before mutation and invalidation", async () => {
  for (const denied of [
    { authorize: async () => ({ authorized: false as const, state: "session_expired" as const }), validate: () => ({ success: true as const, data: 1 }) },
    { authorize: async () => ({ authorized: true as const }), validate: () => ({ success: false as const, fieldErrors: { name: ["invalid"] } }) },
  ]) {
    let mutations = 0; let invalidations = 0;
    const state = await executeServiceAction({ ...denied, mutate: async () => { mutations += 1; return { id: "id" }; }, invalidate: () => { invalidations += 1; }, values, successMessage: "ok", createCorrelationId: () => "cid" });
    assert.notEqual(state.status, "success"); assert.equal(mutations, 0); assert.equal(invalidations, 0);
  }
});

test("an unavailable category lookup stops before mutation with a redacted validation diagnostic", async () => {
  let mutations = 0;
  const logged: unknown[] = [];
  const state = await executeServiceAction({
    authorize: async () => ({ authorized: true }),
    validate: async () => { throw { status: 503, message: "RAW_CATEGORY_PROVIDER_DETAIL" }; },
    mutate: async () => { mutations += 1; return { id: "unexpected" }; },
    invalidate: () => undefined,
    values,
    successMessage: "ok",
    createCorrelationId: () => "category-validation-cid",
    logger: (...event) => logged.push(event),
  });

  assert.equal(mutations, 0);
  assert.deepEqual(state, {
    status: "unavailable",
    message: "Le service est momentanément indisponible. Réessayez.",
    correlationId: "category-validation-cid",
    values,
  });
  assert.deepEqual(logged, [["services.action.failed", {
    category: "unavailable",
    stage: "validation",
    correlationId: "category-validation-cid",
  }]]);
  assert.equal(JSON.stringify({ state, logged }).includes("RAW_"), false);
});

test("all mutation kinds require an affected id before one invalidation", async () => {
  for (const operation of ["create", "update", "visibility", "delete"]) {
    let invalidations = 0;
    const state = await executeServiceAction({ authorize: async () => ({ authorized: true }), validate: () => ({ success: true, data: operation }), mutate: async (payload) => ({ id: `${payload}-id` }), invalidate: () => { invalidations += 1; }, successMessage: operation });
    assert.deepEqual(state, { status: "success", message: operation, serviceId: `${operation}-id` });
    assert.equal(invalidations, 1);
  }
});

test("zero rows and provider failures never invalidate or claim success", async () => {
  for (const result of [{ id: null }, { id: null, error: { status: 503, message: "raw" } }]) {
    let invalidations = 0;
    const state = await executeServiceAction({ authorize: async () => ({ authorized: true }), validate: () => ({ success: true, data: 1 }), mutate: async () => result, invalidate: () => { invalidations += 1; }, successMessage: "ok", createCorrelationId: () => "cid" });
    assert.notEqual(state.status, "success"); assert.equal(invalidations, 0); assert.equal(JSON.stringify(state).includes("raw"), false);
  }
});

test("PostgREST response statuses classify unavailable failures and log the same correlation id", async () => {
  for (const status of [0, 429, 502, 503, 504]) {
    const logged: unknown[] = [];
    const state = await executeServiceAction({
      authorize: async () => ({ authorized: true }),
      validate: () => ({ success: true, data: 1 }),
      mutate: async () => ({
        id: null,
        error: { code: "", message: "RAW_PROVIDER_MESSAGE", details: "RAW_DATABASE_ROW" },
        status,
      }),
      invalidate: () => undefined,
      values,
      successMessage: "ok",
      createCorrelationId: () => `cid-${status}`,
      logger: (...event) => logged.push(event),
    });

    assert.deepEqual(state, {
      status: "unavailable",
      message: "Le service est momentanément indisponible. Réessayez.",
      correlationId: `cid-${status}`,
      values,
    });
    assert.deepEqual(logged, [["services.action.failed", {
      category: "unavailable",
      stage: "mutation",
      correlationId: `cid-${status}`,
    }]]);
    assert.equal(JSON.stringify({ state, logged }).includes("RAW_"), false);
  }
});

test("authorization and invalidation failures are correlated, redacted and never claim success", async () => {
  const authorizationLogs: unknown[] = [];
  const unavailable = await executeServiceAction({
    authorize: async () => ({ authorized: false, state: "unavailable" }),
    validate: () => ({ success: true, data: 1 }),
    mutate: async () => ({ id: "unexpected" }),
    invalidate: () => undefined,
    successMessage: "ok",
    createCorrelationId: () => "authorization-cid",
    logger: (...event) => authorizationLogs.push(event),
  });
  assert.equal(unavailable.status, "unavailable");
  assert.deepEqual(authorizationLogs, [["services.action.failed", {
    category: "unavailable",
    stage: "authorization",
    correlationId: "authorization-cid",
  }]]);

  const invalidationLogs: unknown[] = [];
  const invalidation = await executeServiceAction({
    authorize: async () => ({ authorized: true }),
    validate: () => ({ success: true, data: 1 }),
    mutate: async () => ({ id: "saved-id" }),
    invalidate: () => { throw new Error("RAW_INVALIDATION_DETAIL"); },
    values,
    successMessage: "ok",
    createCorrelationId: () => "invalidation-cid",
    logger: (...event) => invalidationLogs.push(event),
  });
  assert.deepEqual(invalidation, {
    status: "internal",
    message: "L’opération n’a pas pu être terminée. Réessayez.",
    correlationId: "invalidation-cid",
    values,
  });
  assert.deepEqual(invalidationLogs, [["services.action.failed", {
    category: "internal",
    stage: "invalidation",
    correlationId: "invalidation-cid",
  }]]);
  assert.equal(JSON.stringify({ invalidation, invalidationLogs }).includes("RAW_"), false);
});

test("malformed or missing visibility values stop before mutation and invalidation", async () => {
  for (const active of ["", "on", "1"]) {
    let mutations = 0;
    let invalidations = 0;
    const state = await executeServiceAction({
      authorize: async () => ({ authorized: true }),
      validate: () => validateVisibilityValues("00000000-0000-4000-8000-000000000001", active),
      mutate: async () => { mutations += 1; return { id: "unexpected" }; },
      invalidate: () => { invalidations += 1; },
      successMessage: "ok",
    });
    assert.equal(state.status, "validation");
    assert.equal(mutations, 0);
    assert.equal(invalidations, 0);
  }
});
