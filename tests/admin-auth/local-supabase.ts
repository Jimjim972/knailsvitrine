import { randomBytes, randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type LocalStatus = {
  API_URL?: string;
  PUBLISHABLE_KEY?: string;
  SERVICE_ROLE_KEY?: string;
};

export type AuthFixture = {
  userId: string;
  email: string;
  password: string;
};

export type LocalSupabaseRuntime = {
  apiUrl: string;
  publishableKey: string;
  admin: SupabaseClient;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);
class UnusedRealtimeTransport {
  constructor() { throw new Error("Realtime is disabled in local Auth fixtures"); }
}

function runSupabase(args: string[], input?: string) {
  const result = spawnSync("npx", ["supabase", ...args], {
    cwd: process.cwd(),
    encoding: "utf8",
    input,
    maxBuffer: 4 * 1024 * 1024,
    env: process.env,
  });

  if (result.status !== 0) {
    throw new Error("Local Supabase command failed");
  }

  return result.stdout;
}

function runDocker(args: string[]) {
  const result = spawnSync("docker", args, {
    cwd: process.cwd(),
    encoding: "utf8",
    maxBuffer: 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.status !== 0) throw new Error("Local container command failed");
  return result.stdout;
}

function assertLoopbackApiUrl(value: string) {
  const url = new URL(value);
  if (url.protocol !== "http:" || !LOOPBACK_HOSTS.has(url.hostname) || url.username || url.password) {
    throw new Error("Auth fixtures require an exact HTTP loopback Supabase URL");
  }
  return url.origin;
}

export function getLocalSupabaseRuntime(): LocalSupabaseRuntime {
  const status = JSON.parse(runSupabase(["status", "--output", "json"])) as LocalStatus;
  const apiUrl = assertLoopbackApiUrl(status.API_URL ?? "");
  const publishableKey = status.PUBLISHABLE_KEY?.trim();
  const serviceRoleKey = status.SERVICE_ROLE_KEY?.trim();

  if (!publishableKey || !serviceRoleKey) {
    throw new Error("Local Supabase status is missing required ephemeral capabilities");
  }

  return {
    apiUrl,
    publishableKey,
    admin: createClient(apiUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: false,
      },
      realtime: { transport: UnusedRealtimeTransport as never },
    }),
  };
}

export async function createAuthFixture(
  runtime: LocalSupabaseRuntime,
  label: string,
  adminRole = false,
): Promise<AuthFixture> {
  const email = `${label}-${randomUUID()}@example.invalid`;
  const password = `${randomBytes(24).toString("base64url")}Aa1!`;
  const { data, error } = await runtime.admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: adminRole ? { role: "admin" } : {},
  });

  if (error || !data.user) {
    throw new Error("Unable to create an ephemeral local auth fixture");
  }

  return { userId: data.user.id, email, password };
}

export async function deleteAuthFixture(runtime: LocalSupabaseRuntime, fixture: AuthFixture) {
  const { error } = await runtime.admin.auth.admin.deleteUser(fixture.userId, false);
  if (error) {
    throw new Error("Unable to delete an ephemeral local auth fixture");
  }
}

function runGuardedSessionMutation(userId: string, statement: string) {
  if (!UUID_PATTERN.test(userId)) {
    throw new Error("Invalid local fixture identifier");
  }

  getLocalSupabaseRuntime();
  runSupabase(["db", "query", "--local"], statement.replaceAll("$USER_ID", userId));
}

export function expireCurrentSessionForFixture(userId: string) {
  runGuardedSessionMutation(
    userId,
    `do $$
    begin
      update auth.sessions
      set not_after = clock_timestamp() - interval '1 second'
      where id = (
        select id from auth.sessions
        where user_id = '$USER_ID'::uuid
        order by refreshed_at desc nulls last, created_at desc
        limit 1
      );
      if not found then raise exception 'fixture session not found'; end if;
    end $$;`,
  );
}

export function revokeSessionsForFixture(userId: string) {
  runGuardedSessionMutation(
    userId,
    `delete from auth.sessions where user_id = '$USER_ID'::uuid;`,
  );
}

export function stopLocalAuthService() {
  getLocalSupabaseRuntime();
  const containers = runDocker(["ps", "-a", "--format", "{{.Names}}"])
    .split("\n")
    .filter((name) => name.startsWith("supabase_auth_") && name.length > 14);
  if (containers.length !== 1) throw new Error("Expected exactly one local Auth container");
  const [container] = containers;
  runDocker(["stop", "--time", "1", container]);

  return () => {
    runDocker(["start", container]);
    for (let attempt = 0; attempt < 80; attempt += 1) {
      const status = runDocker([
        "inspect",
        "--format",
        "{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}",
        container,
      ]).trim();
      if (status === "healthy" || status === "running") return;
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 250);
    }
    throw new Error("Local Auth service did not recover in time");
  };
}
