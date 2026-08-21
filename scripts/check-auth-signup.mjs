import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";
import {
  assertLoopback,
  emit,
  fail,
  pass,
} from "./run-foundation-checks.mjs";

class UnusedRealtimeTransport {
  constructor() {
    throw new Error("Realtime is disabled in the Auth contract check");
  }
}

function newClient(apiUrl, key) {
  return createClient(apiUrl, key, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    realtime: { transport: UnusedRealtimeTransport },
  });
}

function readLocalStatus() {
  const child = spawnSync("npx", ["supabase", "status", "--output", "json"], {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: "pipe",
  });

  if (child.status !== 0) {
    throw new Error("Local Supabase status is unavailable");
  }

  const status = JSON.parse(child.stdout);
  assertLoopback(status.API_URL);

  const publicKey = status.PUBLISHABLE_KEY ?? status.ANON_KEY;
  const fixtureCapability = status.SECRET_KEY ?? status.SERVICE_ROLE_KEY;
  if (!publicKey || !fixtureCapability) {
    throw new Error("Local fixture capabilities are unavailable");
  }

  return { apiUrl: status.API_URL, publicKey, fixtureCapability };
}

function configInventory(config) {
  const exactBoolean = (section, key, expected) => {
    const escaped = section.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const block = config.match(new RegExp(`\\[${escaped}\\]([\\s\\S]*?)(?=\\n\\[|$)`))?.[1] ?? "";
    return new RegExp(`^\\s*${key}\\s*=\\s*${expected}\\s*$`, "m").test(block);
  };
  const exactFalse = (section, key) => exactBoolean(section, key, false);
  const exactTrue = (section, key) => exactBoolean(section, key, true);

  const providerSections = config
    .split(/(?=^\[)/m)
    .filter((section) => /^\[auth\.(?:external\.|web3\.|third_party\.|oauth_server\])/.test(section));

  return {
    globalSignup: exactFalse("auth", "enable_signup"),
    anonymousSignup: exactFalse("auth", "enable_anonymous_sign_ins"),
    emailPasswordProvider: exactTrue("auth.email", "enable_signup"),
    smsSignup: exactFalse("auth.sms", "enable_signup"),
    externalProvidersDisabled: providerSections.length > 0
      && providerSections.every((section) => /^\s*enabled\s*=\s*false\s*$/m.test(section)),
  };
}

async function listAllUsers(adminClient) {
  const users = [];
  let page = 1;

  while (true) {
    const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error("Unable to inspect local Auth fixtures");
    users.push(...data.users);
    if (data.users.length < 1000) return users;
    page += 1;
  }
}

async function main() {
  const results = [];
  const fixtureToken = randomUUID();
  const email = `foundation-${fixtureToken}@example.invalid`;
  const otpEmail = `foundation-otp-${fixtureToken}@example.invalid`;
  const spoofEmail = `foundation-spoof-${fixtureToken}@example.invalid`;
  const downgradedEmail = `foundation-downgraded-${fixtureToken}@example.invalid`;
  const revokedEmail = `foundation-revoked-${fixtureToken}@example.invalid`;
  const phone = `+1555${fixtureToken.replaceAll("-", "").slice(0, 7)}`;
  const fixturePassword = `Local-${fixtureToken}-9!`;
  let adminClient;

  try {
    const { apiUrl, publicKey, fixtureCapability } = readLocalStatus();
    const publicClient = newClient(apiUrl, publicKey);
    adminClient = newClient(apiUrl, fixtureCapability);

    const config = readFileSync("supabase/config.toml", "utf8");
    const inventory = configInventory(config);
    results.push(
      Object.values(inventory).every(Boolean)
        ? pass("authorization.auth.config", "Public signup is closed and existing email users may sign in")
        : fail("authorization.auth.config", "authorization", "Auth provider or signup configuration is unsafe"),
    );

    const beforeUsers = await listAllUsers(adminClient);
    const beforeIds = new Set(beforeUsers.map((user) => user.id));

    const emailAttempt = await publicClient.auth.signUp({
      email,
      password: fixturePassword,
    });
    const emailRefused = emailAttempt.error?.code === "signup_disabled"
      && !emailAttempt.data.user
      && !emailAttempt.data.session;
    results.push(
      emailRefused
        ? pass("authorization.auth.email_signup", "Email signup is refused without identity or session")
        : fail("authorization.auth.email_signup", "authorization", "Email signup was not safely refused"),
    );

    const anonymousAttempt = await publicClient.auth.signInAnonymously();
    const anonymousRefused = Boolean(anonymousAttempt.error)
      && !anonymousAttempt.data.user
      && !anonymousAttempt.data.session;
    results.push(
      anonymousRefused
        ? pass("authorization.auth.anonymous_signup", "Anonymous signup is refused")
        : fail("authorization.auth.anonymous_signup", "authorization", "Anonymous signup was not safely refused"),
    );

    const otpAttempt = await publicClient.auth.signInWithOtp({
      email: otpEmail,
      options: { shouldCreateUser: true },
    });
    const otpRefused = Boolean(otpAttempt.error)
      && !otpAttempt.data.user
      && !otpAttempt.data.session;
    results.push(
      otpRefused
        ? pass("authorization.auth.otp_signup", "OTP and magic-link identity creation is refused without identity or session")
        : fail("authorization.auth.otp_signup", "authorization", "OTP identity creation was not refused"),
    );

    const smsAttempt = await publicClient.auth.signInWithOtp({ phone });
    const smsRefused = Boolean(smsAttempt.error)
      && !smsAttempt.data.user
      && !smsAttempt.data.session;
    results.push(
      smsRefused
        ? pass("authorization.auth.sms_signup", "SMS identity creation is refused without identity or session")
        : fail("authorization.auth.sms_signup", "authorization", "SMS identity creation was not refused"),
    );

    const afterUsers = await listAllUsers(adminClient);
    const unexpectedUsers = afterUsers.filter((user) => !beforeIds.has(user.id));
    results.push(
      unexpectedUsers.length === 0
        ? pass("authorization.auth.user_count", "Auth user count is unchanged")
        : fail("authorization.auth.user_count", "authorization", "A public Auth attempt created a user"),
    );

    for (const user of unexpectedUsers) {
      await adminClient.auth.admin.deleteUser(user.id);
    }

    const spoofCreation = await adminClient.auth.admin.createUser({
      email: spoofEmail,
      password: fixturePassword,
      email_confirm: true,
      user_metadata: { role: "admin" },
    });
    if (spoofCreation.error || !spoofCreation.data.user) {
      throw new Error("Unable to create metadata spoof fixture");
    }
    const spoofClient = newClient(apiUrl, publicKey);
    const spoofLogin = await spoofClient.auth.signInWithPassword({ email: spoofEmail, password: fixturePassword });
    if (spoofLogin.error || !spoofLogin.data.session) {
      throw new Error("Unable to authenticate metadata spoof fixture");
    }
    const spoofAuthorization = await spoofClient.rpc("is_current_admin");
    results.push(
      !spoofAuthorization.error && spoofAuthorization.data === false
        ? pass("authorization.auth.user_metadata_spoof", "User-controlled metadata never grants administration")
        : fail("authorization.auth.user_metadata_spoof", "authorization", "User-controlled metadata affected administration"),
    );

    const downgradedCreation = await adminClient.auth.admin.createUser({
      email: downgradedEmail,
      password: fixturePassword,
      email_confirm: true,
      app_metadata: { role: "admin" },
    });
    if (downgradedCreation.error || !downgradedCreation.data.user) {
      throw new Error("Unable to create downgrade fixture");
    }
    const downgradedClient = newClient(apiUrl, publicKey);
    const downgradedLogin = await downgradedClient.auth.signInWithPassword({ email: downgradedEmail, password: fixturePassword });
    if (downgradedLogin.error || !downgradedLogin.data.session) {
      throw new Error("Unable to authenticate downgrade fixture");
    }
    const initialAdminAuthorization = await downgradedClient.rpc("is_current_admin");
    results.push(
      !initialAdminAuthorization.error && initialAdminAuthorization.data === true
        ? pass("authorization.auth.current_admin", "Current protected metadata and live session grant administration")
        : fail("authorization.auth.current_admin", "authorization", "Current administrator was not authorized"),
    );
    const downgrade = await adminClient.auth.admin.updateUserById(downgradedCreation.data.user.id, {
      app_metadata: { role: "member" },
    });
    if (downgrade.error) throw new Error("Unable to downgrade Auth fixture");
    const downgradedAuthorization = await downgradedClient.rpc("is_current_admin");
    results.push(
      !downgradedAuthorization.error && downgradedAuthorization.data === false
        ? pass("authorization.auth.downgrade", "A database-side downgrade defeats stale admin claims on the next check")
        : fail("authorization.auth.downgrade", "authorization", "A downgraded identity retained administration"),
    );

    const revokedCreation = await adminClient.auth.admin.createUser({
      email: revokedEmail,
      password: fixturePassword,
      email_confirm: true,
      app_metadata: { role: "admin" },
    });
    if (revokedCreation.error || !revokedCreation.data.user) {
      throw new Error("Unable to create revoked-session fixture");
    }
    const revokedClient = newClient(apiUrl, publicKey);
    const revokedLogin = await revokedClient.auth.signInWithPassword({ email: revokedEmail, password: fixturePassword });
    const accessToken = revokedLogin.data.session?.access_token;
    if (revokedLogin.error || !accessToken) {
      throw new Error("Unable to authenticate revoked-session fixture");
    }
    const preRevocation = await revokedClient.rpc("is_current_admin");
    if (preRevocation.error || preRevocation.data !== true) {
      throw new Error("Revoked-session fixture was not initially authorized");
    }
    const revocation = await adminClient.auth.admin.signOut(accessToken, "global");
    if (revocation.error) throw new Error("Unable to revoke Auth fixture session");
    const postRevocation = await revokedClient.rpc("is_current_admin");
    results.push(
      postRevocation.data !== true
        ? pass("authorization.auth.revoked_session", "A revoked session loses administration on the next check")
        : fail("authorization.auth.revoked_session", "authorization", "A revoked session retained administration"),
    );
  } catch {
    results.push(fail("internal.auth.check", "internal", "Local Auth verification could not complete"));
  } finally {
    if (adminClient) {
      try {
        const users = await listAllUsers(adminClient);
        const disposable = users.filter((user) => user.email?.startsWith("foundation-") && user.email.endsWith("@example.invalid"));
        await Promise.all(disposable.map((user) => adminClient.auth.admin.deleteUser(user.id)));
      } catch {
        results.push(fail("internal.auth.cleanup", "internal", "Local Auth fixture cleanup failed"));
      }
    }
  }

  emit(results);
  process.exitCode = results.some((result) => result.status === "fail") ? 1 : 0;
}

await main();
