/**
 * E2E runner: spawn agent server, load YAML users/intents, and run each intent to global N cycles.
 *
 * Run: pnpm exec tsx scripts/agent-e2e-run.ts --input ./scripts/simple-intents.yml --cycles 3
 */
import { spawn, type ChildProcess } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { privateKeyToAccount } from "viem/accounts";
import { parse as parseYaml } from "yaml";

type Hex = `0x${string}`;

interface YamlUser {
  privateKey: Hex;
  intents: string[];
}

interface YamlInput {
  cycles: number;
  users: YamlUser[];
}

interface ScriptConfig {
  inputPath: string;
  defaultCycles?: number;
  port: number;
  strict: boolean;
  pollMs: number;
  startupTimeoutMs: number;
  permissions: string;
  delegationManager: string;
  dependencies: string;
}

interface AuthNonceResponse {
  nonce: string;
}

interface AuthVerifyResponse {
  token: string;
}

interface ParseIntentResponse {
  parsed: Record<string, unknown>;
}

interface CreateIntentResponse {
  intent: {
    id: string;
  };
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = resolve(__dirname, "..");
const serverEntry = resolve(repoRoot, "packages/agent/src/server.ts");
const DEFAULT_AGENT_PORT = 3147;

const DEFAULT_PERMISSIONS = JSON.stringify([
  { type: "native-token-periodic", context: "0xdeadbeef", token: "ETH" },
]);
const DEFAULT_DELEGATION_MANAGER = "0x0000000000000000000000000000000000000001";
const DEFAULT_DEPENDENCIES = JSON.stringify([]);

function printUsage(): void {
  console.log(
    [
      "Usage:",
      "  pnpm exec tsx scripts/agent-e2e-run.ts --input ./inputs/users.yml --cycles 3",
      "",
      "Options:",
      "  --input <path>        Required. YAML input file path.",
      "  --cycles <number>     Optional fallback when YAML omits top-level cycles.",
      `  --port <number>       Optional. Agent port (default: ${DEFAULT_AGENT_PORT}).`,
      "  --strict              Optional. Fail on first invalid YAML entry.",
      "  --poll-ms <number>    Optional. Poll interval for cycle checks (default: 5000).",
      "  --startup-timeout-ms  Optional. Server startup timeout (default: 30000).",
      "",
      "Env overrides:",
      "  AGENT_E2E_PERMISSIONS        JSON string for intent permissions",
      "  AGENT_E2E_DELEGATION_MANAGER delegation manager address",
      "  AGENT_E2E_DEPENDENCIES       JSON string for dependencies",
    ].join("\n"),
  );
}

function parseArgs(argv: string[]): ScriptConfig {
  const getArg = (name: string): string | undefined => {
    const idx = argv.indexOf(name);
    if (idx === -1) return undefined;
    return argv[idx + 1];
  };

  if (argv.includes("--help") || argv.includes("-h")) {
    printUsage();
    process.exit(0);
  }

  const inputPath = getArg("--input");
  const cyclesRaw = getArg("--cycles");
  const portRaw = getArg("--port");
  const pollMsRaw = getArg("--poll-ms");
  const startupTimeoutRaw = getArg("--startup-timeout-ms");
  const strict = argv.includes("--strict");

  if (!inputPath) {
    throw new Error("Missing required argument --input <path>.");
  }
  let defaultCycles: number | undefined;
  if (cyclesRaw) {
    const cycles = Number(cyclesRaw);
    if (!Number.isFinite(cycles) || cycles < 1) {
      throw new Error(`Invalid --cycles value: ${cyclesRaw}`);
    }
    defaultCycles = cycles;
  }

  const port = portRaw ? Number(portRaw) : DEFAULT_AGENT_PORT;
  if (!Number.isFinite(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid --port value: ${String(portRaw)}`);
  }

  const pollMs = pollMsRaw ? Number(pollMsRaw) : 5_000;
  if (!Number.isFinite(pollMs) || pollMs < 250) {
    throw new Error(`Invalid --poll-ms value: ${String(pollMsRaw)}`);
  }

  const startupTimeoutMs = startupTimeoutRaw ? Number(startupTimeoutRaw) : 30_000;
  if (!Number.isFinite(startupTimeoutMs) || startupTimeoutMs < 1_000) {
    throw new Error(`Invalid --startup-timeout-ms value: ${String(startupTimeoutRaw)}`);
  }

  return {
    inputPath: resolve(process.cwd(), inputPath),
    defaultCycles,
    port,
    strict,
    pollMs,
    startupTimeoutMs,
    permissions: process.env.AGENT_E2E_PERMISSIONS ?? DEFAULT_PERMISSIONS,
    delegationManager: process.env.AGENT_E2E_DELEGATION_MANAGER ?? DEFAULT_DELEGATION_MANAGER,
    dependencies: process.env.AGENT_E2E_DEPENDENCIES ?? DEFAULT_DEPENDENCIES,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseYamlInput(yamlText: string, strict: boolean, defaultCycles?: number): YamlInput {
  const parsed = parseYaml(yamlText) as unknown;
  if (!isRecord(parsed)) {
    throw new Error("Invalid YAML: expected top-level object with 'cycles' and 'users'.");
  }

  const cyclesFromYaml = parsed.cycles;
  const resolvedCyclesRaw =
    typeof cyclesFromYaml === "number"
      ? cyclesFromYaml
      : cyclesFromYaml === undefined
        ? defaultCycles
        : Number.NaN;
  const resolvedCycles = resolvedCyclesRaw;
  if (resolvedCycles === undefined || !Number.isInteger(resolvedCycles) || resolvedCycles < 1) {
    throw new Error(
      "Missing valid cycles. Set top-level 'cycles' in YAML (positive integer), or pass --cycles.",
    );
  }

  if (!Array.isArray(parsed.users)) {
    throw new Error("Invalid YAML: top-level 'users' must be an array.");
  }

  const users: YamlUser[] = [];
  for (const user of parsed.users) {
    if (!isRecord(user)) {
      if (strict) {
        throw new Error("Invalid YAML user entry (must be an object).");
      }
      console.warn("[warn] Skipping YAML user entry (must be an object).");
      continue;
    }

    const privateKey = typeof user.privateKey === "string" ? user.privateKey.trim() : "";
    const intents = Array.isArray(user.intents)
      ? user.intents
          .filter((v): v is string => typeof v === "string")
          .map((v) => v.trim())
          .filter((v) => v.length > 0)
      : [];

    const keyValid = /^0x[0-9a-fA-F]{64}$/.test(privateKey);
    const intentsValid = intents.length > 0;
    if (!keyValid || !intentsValid) {
      let reason = "invalid YAML user entry";
      if (!keyValid) {
        reason = `invalid privateKey: ${privateKey}`;
      } else if (!intentsValid) {
        reason = "intents must be a non-empty string array";
      }
      if (strict) {
        throw new Error(`Invalid YAML user entry (${reason}).`);
      }
      console.warn(`[warn] Skipping YAML user entry (${reason}).`);
      continue;
    }

    users.push({ privateKey: privateKey as Hex, intents });
  }

  if (users.length === 0) {
    throw new Error("No valid users found in YAML input.");
  }

  return { cycles: resolvedCycles, users };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolveSleep) => {
    setTimeout(resolveSleep, ms);
  });
}

async function waitForServer(base: string, timeoutMs: number): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${base}/api/auth/nonce?wallet=0x1234`);
      if (res.ok) return;
    } catch {
      // server still starting
    }
    await sleep(300);
  }
  throw new Error(`Server did not start within ${timeoutMs}ms`);
}

async function parseJsonResponse<T>(res: Response, context: string): Promise<T> {
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${context} failed: HTTP ${res.status} ${body}`);
  }
  return (await res.json()) as T;
}

async function authenticate(base: string, privateKey: Hex): Promise<{ wallet: string; token: string }> {
  const account = privateKeyToAccount(privateKey);
  const wallet = account.address;

  const nonceRes = await fetch(`${base}/api/auth/nonce?wallet=${wallet}`);
  const nonceData = await parseJsonResponse<AuthNonceResponse>(nonceRes, "Request nonce");
  const message = `Sign this message to authenticate with Maw.\n\nNonce: ${nonceData.nonce}`;
  const signature = await account.signMessage({ message });

  const verifyRes = await fetch(`${base}/api/auth/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ wallet, signature }),
  });
  const verifyData = await parseJsonResponse<AuthVerifyResponse>(verifyRes, "Verify auth signature");
  return { wallet, token: verifyData.token };
}

async function parseIntent(base: string, intentText: string): Promise<Record<string, unknown>> {
  const res = await fetch(`${base}/api/parse-intent`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ intent: intentText }),
  });
  const data = await parseJsonResponse<ParseIntentResponse>(res, "Parse intent");
  return data.parsed;
}

async function createIntent(
  base: string,
  token: string,
  intentText: string,
  parsedIntent: Record<string, unknown>,
  config: ScriptConfig,
): Promise<string> {
  const res = await fetch(`${base}/api/intents`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      intentText,
      parsedIntent,
      permissions: config.permissions,
      delegationManager: config.delegationManager,
      dependencies: config.dependencies,
    }),
  });
  const data = await parseJsonResponse<CreateIntentResponse>(res, "Create intent");
  return data.intent.id;
}

async function getIntentDetail(base: string, token: string, intentId: string): Promise<unknown> {
  const res = await fetch(`${base}/api/intents/${intentId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return parseJsonResponse<unknown>(res, `Get intent detail for ${intentId}`);
}

function cycleCountFromDetail(detail: unknown): number {
  if (typeof detail !== "object" || detail === null) return 0;
  const payload = detail as Record<string, unknown>;

  const liveState = payload.liveState;
  if (typeof liveState === "object" && liveState !== null) {
    const cycle = (liveState as Record<string, unknown>).cycle;
    if (typeof cycle === "number" && Number.isFinite(cycle)) return cycle;
  }

  const logs = payload.logs;
  if (Array.isArray(logs)) {
    let maxCycle = 0;
    for (const entry of logs) {
      if (typeof entry !== "object" || entry === null) continue;
      const row = entry as Record<string, unknown>;
      if (row.action !== "cycle_complete") continue;
      const cycle = row.cycle;
      if (typeof cycle === "number" && cycle > maxCycle) {
        maxCycle = cycle;
      }
    }
    return maxCycle;
  }
  return 0;
}

async function cancelIntent(base: string, token: string, intentId: string): Promise<void> {
  const res = await fetch(`${base}/api/intents/${intentId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Cancel intent failed for ${intentId}: HTTP ${res.status} ${body}`);
  }
}

async function runIntentUntilCycles(
  base: string,
  token: string,
  intentId: string,
  cycles: number,
  pollMs: number,
): Promise<void> {
  while (true) {
    const detail = await getIntentDetail(base, token, intentId);
    const cycleCount = cycleCountFromDetail(detail);
    console.log(`    cycles: ${cycleCount}/${cycles}`);

    if (cycleCount >= cycles) {
      await cancelIntent(base, token, intentId);
      return;
    }

    await sleep(pollMs);
  }
}

async function main(): Promise<void> {
  const config = parseArgs(process.argv.slice(2));
  const yamlRaw = readFileSync(config.inputPath, "utf8");
  const input = parseYamlInput(yamlRaw, config.strict, config.defaultCycles);
  const base = `http://localhost:${config.port}`;

  const tmpDir = mkdtempSync(join(tmpdir(), "maw-agent-e2e-"));
  const dbPath = join(tmpDir, "agent-e2e.db");

  let server: ChildProcess | null = null;
  let serverStderr = "";
  const cleanup = (): void => {
    if (server) {
      server.kill("SIGTERM");
      server = null;
    }
    rmSync(tmpDir, { recursive: true, force: true });
  };

  process.on("SIGINT", () => {
    cleanup();
    process.exit(130);
  });
  process.on("SIGTERM", () => {
    cleanup();
    process.exit(143);
  });

  try {
    console.log(`[info] starting server on ${base}`);
    server = spawn("npx", ["tsx", serverEntry], {
      cwd: repoRoot,
      env: { ...process.env, PORT: String(config.port), DB_PATH: dbPath },
      stdio: "pipe",
    });

    server.stderr?.on("data", (chunk: Buffer | string) => {
      serverStderr += chunk.toString();
    });

    await waitForServer(base, config.startupTimeoutMs);
    console.log("[info] server is ready");
    console.log(`[info] loaded ${input.users.length} user record(s) from YAML`);
    console.log(`[info] global cycles: ${input.cycles}`);

    for (let userIndex = 0; userIndex < input.users.length; userIndex++) {
      const user = input.users[userIndex]!;
      console.log(`[user ${userIndex + 1}/${input.users.length}] authenticating`);
      const auth = await authenticate(base, user.privateKey);
      console.log(`[user ${userIndex + 1}] wallet: ${auth.wallet}`);
      console.log(`[user ${userIndex + 1}] cycles: ${input.cycles}`);

      for (let intentIndex = 0; intentIndex < user.intents.length; intentIndex++) {
        const intentText = user.intents[intentIndex]!;
        console.log(`  [intent ${intentIndex + 1}/${user.intents.length}] ${intentText}`);

        const parsedIntent = await parseIntent(base, intentText);
        const intentId = await createIntent(base, auth.token, intentText, parsedIntent, config);
        console.log(`    created intent: ${intentId}`);

        await runIntentUntilCycles(base, auth.token, intentId, input.cycles, config.pollMs);
        console.log(`    stopped intent at ${input.cycles} cycle(s): ${intentId}`);
      }
    }

    console.log("[done] all users and intents completed");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const serverLog = serverStderr.trim();
    if (serverLog.length > 0) {
      throw new Error(`${msg}\n\n--- server stderr ---\n${serverLog}`);
    }
    throw new Error(msg);
  } finally {
    cleanup();
  }
}

main().catch((err) => {
  const msg = err instanceof Error ? err.message : String(err);
  console.error(`[error] ${msg}`);
  process.exit(1);
});
