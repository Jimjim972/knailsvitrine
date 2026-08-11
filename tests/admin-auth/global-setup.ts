import {
  createAuthFixture,
  deleteAuthFixture,
  getLocalSupabaseRuntime,
  type AuthFixture,
} from "./local-supabase";

type FixtureKey =
  | "ADMIN"
  | "NON_ADMIN"
  | "REVOCABLE_ADMIN"
  | "EXPIRABLE_ADMIN"
  | "ROLE_REMOVABLE_ADMIN"
  | "LOGOUT_ERROR_ADMIN";

function exposeFixture(key: FixtureKey, fixture: AuthFixture) {
  process.env[`AUTH_E2E_${key}_ID`] = fixture.userId;
  process.env[`AUTH_E2E_${key}_EMAIL`] = fixture.email;
  process.env[`AUTH_E2E_${key}_PASSWORD`] = fixture.password;
}

export default async function globalSetup() {
  const runtime = getLocalSupabaseRuntime();
  process.env.NEXT_PUBLIC_SUPABASE_URL ??= runtime.apiUrl;
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??= runtime.publishableKey;

  const fixtures: Array<[FixtureKey, AuthFixture]> = [];
  try {
    fixtures.push(["ADMIN", await createAuthFixture(runtime, "admin", true)]);
    fixtures.push(["NON_ADMIN", await createAuthFixture(runtime, "non-admin")]);
    fixtures.push(["REVOCABLE_ADMIN", await createAuthFixture(runtime, "revocable-admin", true)]);
    fixtures.push(["EXPIRABLE_ADMIN", await createAuthFixture(runtime, "expirable-admin", true)]);
    fixtures.push([
      "ROLE_REMOVABLE_ADMIN",
      await createAuthFixture(runtime, "role-removable-admin", true),
    ]);
    fixtures.push([
      "LOGOUT_ERROR_ADMIN",
      await createAuthFixture(runtime, "logout-error-admin", true),
    ]);
    for (const [key, fixture] of fixtures) exposeFixture(key, fixture);
  } catch (error) {
    await Promise.allSettled(fixtures.map(([, fixture]) => deleteAuthFixture(runtime, fixture)));
    throw error;
  }

  return async () => {
    const results = await Promise.allSettled(
      fixtures.map(([, fixture]) => deleteAuthFixture(runtime, fixture)),
    );
    if (results.some((result) => result.status === "rejected")) {
      throw new Error("One or more local auth fixtures could not be cleaned");
    }
  };
}
