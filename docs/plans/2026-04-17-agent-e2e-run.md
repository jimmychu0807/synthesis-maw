# Agent E2E driver script (`scripts/agent-e2e-run.ts`)

Plan for a script that starts `@maw/agent` as an HTTP child process, reads users + intents from a YAML file, authenticates each user wallet, creates intents, and observes or limits the agent to **N** monitoring cycles.

---

## Goals

1. Spawn the agent **server** on the default port (or a configurable port) as a **child process**.
2. Load input users from a **YAML file** (`privateKey` + `intents[]`).
3. Derive a **user wallet** from each input private key.
4. Complete **wallet auth** (nonce → sign → bearer token) for each user.
5. **POST** an intent with a structured `parsedIntent` (target allocation, budgets, etc.).
6. Run until **N cycles** — see [N cycles](#n-cycles) (script-only vs small product change).

---

## Input YAML

The script should accept a YAML file path (for example via `--input <path>`), with this shape:

```yml
cycles: 2
users:
  - privateKey: "0x..."
    intents:
      - "60/40 ETH/USDC, $5/day, 7 days"
      - "50/50 WBTC/ETH, $10/day, 3 days"
  - privateKey: "0x..."
    intents:
      - "70/30 ETH/USDC, $8/day, 14 days"
```

Type shape (for implementation reference):

```ts
type YamlInput = {
  cycles: number; // global positive integer for all users/intents
  users: Array<{
    privateKey: `0x${string}`;
    intents: string[];
  }>;
};
```

Validation rules:

- `privateKey` is required and must be a valid `0x` hex private key.
- top-level `cycles` is required and must be a positive integer.
- `intents` is required and must be a non-empty string array.
- Skip invalid entries with clear logs, or fail fast in strict mode.
- Optional: CLI `--cycles` can be used as a fallback only when YAML omits top-level `cycles`.

Execution rule:

- For each YAML user, run **one active intent at a time** under that user wallet.
- If multiple `intents` are provided for a user, process them sequentially (intent #1, then #2, etc.).

---

## Server child process

### Port

- Default API port is **3147** (`DEFAULT_AGENT_PORT` in `@maw/common`).
- `packages/agent/src/server.ts` uses `process.env.PORT` when set, otherwise `DEFAULT_AGENT_PORT`.

### Prefer `tsx` without `--watch`

- `pnpm serve` runs `tsx --watch src/server.ts`, which can restart the server mid-run when files change.
- For a driver script, spawn **`tsx`** on `packages/agent/src/server.ts` **without** `--watch`, matching existing e2e tests (`lifecycle.e2e.test.ts`, `multi-intent.e2e.test.ts`).

Example pattern (paths adjusted for repo root vs `packages/agent/src/__tests__`):

```ts
import { spawn, type ChildProcess } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
// From repo root scripts/: resolve to packages/agent/src/server.ts
const serverEntry = join(__dirname, "../packages/agent/src/server.ts");

const serverProcess = spawn("npx", ["tsx", serverEntry], {
  env: { ...process.env, PORT: String(port), DB_PATH },
  stdio: "pipe",
  cwd: repoRoot, // optional: set so npx/tsx resolve correctly
});
```

### Isolated database

- Set **`DB_PATH`** to a **temporary** SQLite file (e.g. `mkdtemp` under `os.tmpdir()`), same pattern as `packages/agent/src/__tests__/lifecycle.e2e.test.ts` and `multi-intent.e2e.test.ts`.
- Avoids corrupting or locking `data/maw.db` used for local dev.

### Readiness

- Poll until `GET ${BASE}/api/auth/nonce?wallet=0x...` returns **200** (or another lightweight health check), with timeout and captured **stderr** on failure.

### Shutdown

- On completion or error: **`SIGTERM`** the child process.
- Remove the temp DB directory if desired.

### Environment

- Child should inherit **`...process.env`** so `.env`-loaded secrets on the parent apply: `AGENT_PRIVATE_KEY`, Venice, RPC, `TOKEN_SECRET` for auth tokens, etc.

---

## Running the script from the monorepo

Root `package.json` has minimal runtime dependencies.

Options:

1. Add **`tsx`** and **`viem`** as root **devDependencies**, then `pnpm exec tsx scripts/agent-e2e-run.ts`.
2. Place the script under **`packages/agent`** where `viem` already exists.
3. Run via **`pnpm --filter @maw/agent exec tsx <path-to-script>`** so resolution stays inside the agent package.

The script must run in an environment where **`tsx`** and **`viem`** resolve.

Use option 1 here.

---

## Wallet and auth (per YAML user)

### Wallet

- Use `privateKeyToAccount(privateKey)` from `viem/accounts` (same approach as `packages/agent/src/__tests__/multi-intent.e2e.test.ts`).
- Source private keys from the YAML input file instead of a hardcoded script constant.

### Auth flow

1. `GET /api/auth/nonce?wallet=<address>` → `{ nonce }`.
2. Build message **exactly**:
   `Sign this message to authenticate with Maw.\n\nNonce: ${nonce}`
3. `account.signMessage({ message })` → `signature`.
4. `POST /api/auth/verify` with JSON `{ wallet, signature }` → `{ token }`.
5. Use header **`Authorization: Bearer <token>`** on protected routes.

Server implementation: `packages/agent/src/routes/auth.ts` (`createAuthRoutes`).

---

## Create intent (target portfolio, per user intent string)

### Endpoint

- **`POST`** `{BASE}/api/intents` with `Authorization: Bearer <token>`.

### Required JSON fields

Per `packages/agent/src/routes/intents.ts`, the body must include:

| Field | Notes |
|--------|--------|
| `intentText` | string |
| `parsedIntent` | object; must satisfy `ParsedIntentSchema` (shared / agent Zod) |
| `permissions` | **string** (often `JSON.stringify([...])`) |
| `delegationManager` | **string** (hex address) |
| `dependencies` | optional in types at route level — confirm route; tests pass `JSON.stringify([])` |

### Portfolio shape

- For each intent string from YAML:
  - either call parse endpoint (`/api/parse-intent`) to get structured intent,
  - or provide a deterministic parser/fixture mapping in script.
- Final `parsedIntent` should include `targetAllocation`, `dailyBudgetUsd`, `timeWindowDays`, `maxTradesPerDay`, `maxPerTradeUsd`, `maxSlippage`, `driftThreshold` (see `MOCK_PARSED_INTENT` / `VALID_PARSED_INTENT` in e2e tests).

### Fixtures vs production

- E2e tests use **placeholder** `permissions`, `delegationManager`, and `dependencies`.
- A **real** autonomous run needs values consistent with ERC-7715 / ERC-7710 flow and your `.env` (agent key, RPC, Uniswap, Venice, etc.).

---

## N cycles

### Behavior today

- `runAgentLoop` in `packages/agent/src/agent-loop/index.ts` supports optional **`maxCycles`**. When set, after each cycle the loop checks `config.maxCycles && state.cycle >= config.maxCycles` and stops (“demo mode”).
- **`DefaultAgentWorker`** (`packages/agent/src/agent-worker.ts`) builds `AgentConfig` with `intervalMs: 20_000` but **does not** pass `maxCycles`. The server-driven worker therefore runs until budget/trade caps, completion, deploy error, or external stop — **not** until an arbitrary N from HTTP alone.

### Option A — Script only (poll + cancel)

No agent code changes:

1. `POST /api/intents` → save `intent.id`.
2. Poll **`GET /api/intents/:id`** with the bearer token.
3. Determine cycle count from:
   - **`liveState.cycle`** on the detail response (worker state), and/or
   - Counting **`logs`** entries with `action === "cycle_complete"`.
4. When count **≥ N**, **`DELETE /api/intents/:id`** → `workerPool.stop` → `AbortController` aborts the loop (same idea as cancel tests).

**Timing:** default **`intervalMs` is 20 seconds** between cycles, plus per-cycle work — expect wall time **≥ roughly N × 20s** unless the worker’s interval changes.

### Option B — Product change (native N cycles)

- Thread **`maxCycles: N`** into `runAgentLoop` from **`DefaultAgentWorker`**, sourced e.g. from:
  - a new optional field on intent create API / DB column, or
  - an env var such as `MAW_MAX_CYCLES` read only in the worker.

Then the script can pass N once at create time (or via env before spawn) without polling for cancellation.

Use Option A here.

---

## CLI vs HTTP driver

| Path | Command | Starts HTTP server | `--cycles` / `maxCycles` |
|------|---------|----------------------|---------------------------|
| CLI | `pnpm run dev` → `tsx src/index.ts --intent "..." [--cycles N]` | No | Yes (`startFromCli` → `runAgentLoop`) |
| Dashboard parity | Child `server.ts` + `POST /api/intents` | Yes | Not wired in worker today; use Option A or B above |

For “same stack as the dashboard,” the **server + HTTP intent** approach is correct.

---

## Security

- Do not commit **production** private keys in the script.
- Prefer **environment variables** or a **gitignored** local config for any signing key.

---

## Reference files

| Topic | Path |
|--------|------|
| Port + app wiring | `packages/agent/src/server.ts` |
| Constants | `packages/common/src/constants.ts` |
| Auth routes | `packages/agent/src/routes/auth.ts` |
| Intent create | `packages/agent/src/routes/intents.ts` |
| Worker + `AgentConfig` | `packages/agent/src/agent-worker.ts` |
| Loop + `maxCycles` | `packages/agent/src/agent-loop/index.ts` |
| CLI `--cycles` | `packages/agent/src/index.ts` |
| Spawn + auth + intent examples | `packages/agent/src/__tests__/lifecycle.e2e.test.ts`, `multi-intent.e2e.test.ts` |

---

## Checklist (implementation)

- [ ] Resolve `server.ts` path from script location; spawn without `--watch`.
- [ ] Temp `DB_PATH`; wait for server; forward or log stderr on failure.
- [ ] Parse `--input <yamlPath>` and validate YAML user records.
- [ ] Parse CLI arg or env for **N** (and optional `PORT`, `BASE`).
- [ ] For each YAML user: auth with `privateKeyToAccount` + nonce flow.
- [ ] For each user intent string: build/parse `parsedIntent`, then `POST /api/intents` with delegation fields.
- [ ] Option A: poll until N then `DELETE`; or Option B: implement `maxCycles` in worker/API.
- [ ] SIGTERM child + cleanup temp dir.
