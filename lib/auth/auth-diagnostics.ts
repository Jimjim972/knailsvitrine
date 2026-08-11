import { randomUUID } from "node:crypto";
import type {
  AuthDiagnostic,
  AuthDiagnosticCategory,
  AuthDiagnosticStage,
} from "./auth-state.ts";

export function createAuthDiagnostic(
  category: AuthDiagnosticCategory,
  stage: AuthDiagnosticStage,
  correlationId: string = randomUUID(),
): AuthDiagnostic {
  return { category, stage, correlationId };
}
