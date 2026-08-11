import assert from "node:assert/strict";
import test from "node:test";
import {
  createServiceDiagnostic,
  createServiceReadFailure,
  reportServiceDiagnostic,
  ServiceDataAccessError,
} from "../../../lib/services/diagnostics.ts";
import { classifyServiceError } from "../../../lib/services/errors.ts";

test("diagnostics expose only stable allowlisted fields", () => {
  const diagnostic = createServiceDiagnostic("unavailable", "mutation", "opaque-id");
  assert.deepEqual(diagnostic, { category: "unavailable", stage: "mutation", correlationId: "opaque-id" });
  assert.equal(JSON.stringify(diagnostic).includes("provider"), false);
});

test("error classification is stable and redacted", () => {
  assert.equal(classifyServiceError({ status: 503, message: "secret SQL" }), "unavailable");
  for (const status of [0, 429, 502, 503, 504]) {
    assert.equal(classifyServiceError({ code: "", message: "RAW_PROVIDER_MESSAGE" }, status), "unavailable");
  }
  assert.equal(classifyServiceError({ name: "AbortError", message: "RAW_ABORT_DETAIL" }), "unavailable");
  assert.equal(classifyServiceError({ code: "ABORT_ERR", message: "RAW_ABORT_DETAIL" }), "unavailable");
  assert.equal(classifyServiceError({ code: "constraint_failure", message: "secret SQL" }), "internal");
});

test("read failures log only allowlisted diagnostic fields", () => {
  const logged: unknown[] = [];
  const providerFailure = {
    status: 503,
    code: "network_timeout",
    message: "RAW_PROVIDER_MESSAGE",
    details: "RAW_DATABASE_ROW",
    hint: "RAW_SQL_QUERY",
    url: "https://database.example/private",
    line: 42,
  };

  const failure = createServiceReadFailure(providerFailure, {
    correlationId: "read-correlation-id",
    logger: (...values) => logged.push(values),
  });

  assert.ok(failure instanceof ServiceDataAccessError);
  assert.equal(failure.message, "Les prestations sont momentanément indisponibles.");
  assert.equal(failure.category, "unavailable");
  assert.equal(failure.correlationId, "read-correlation-id");
  assert.deepEqual(logged, [["services.read.failed", {
    category: "unavailable",
    stage: "read",
    correlationId: "read-correlation-id",
  }]]);

  const shareable = JSON.stringify({ failure, logged });
  for (const forbidden of ["RAW_PROVIDER_MESSAGE", "RAW_DATABASE_ROW", "RAW_SQL_QUERY", "database.example", "\"line\""]) {
    assert.equal(shareable.includes(forbidden), false, `leaked ${forbidden}`);
  }
});

test("action failures log only the shared category, stage and correlation id", () => {
  const logged: unknown[] = [];
  const diagnostic = reportServiceDiagnostic("services.action.failed", "unavailable", "mutation", {
    correlationId: "action-correlation-id",
    logger: (...values) => logged.push(values),
  });

  assert.deepEqual(diagnostic, {
    category: "unavailable",
    stage: "mutation",
    correlationId: "action-correlation-id",
  });
  assert.deepEqual(logged, [["services.action.failed", diagnostic]]);
});
