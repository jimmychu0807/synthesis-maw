# Hono Server Refactor Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the hand-rolled `node:http` server in `packages/agent/src/server.ts` with Hono, splitting the 633-line monolith into modular route files.

**Architecture:** Install Hono + `@hono/node-server` + `@hono/zod-validator`. Extract route handlers into `routes/auth.ts`, `routes/intents.ts`, `routes/parse.ts`. Create an auth middleware. Keep `server.ts` as the thin entrypoint (app setup, middleware, mount routes, startup). Rewrite unit tests to use Hono's `app.request()` test helper instead of mocking `node:http` internals.

**Tech Stack:** Hono 4.x, `@hono/node-server`, `@hono/zod-validator`, Zod 4, vitest, TypeScript strict mode, ESM

**Key constraints:**
- The entrypoint MUST remain `packages/agent/src/server.ts` (VPS systemd runs `packages/agent/dist/src/server.js`)
- `API_PATHS` from `@veil/common` defines canonical route strings — use them where possible
- All existing API behavior (status codes, response shapes, CORS, SPA fallback) must be preserved
- E2E tests (`server.e2e.test.ts`) should pass without modification (they hit real HTTP endpoints)

---

### Task 1: Install Hono Dependencies

**Files:**
- Modify: `packages/agent/package.json`

**Step 1: Install hono and adapters**

Run from project root:
```bash
pnpm --filter @veil/agent add hono @hono/node-server @hono/zod-validator
```

**Step 2: Verify installation**

Run: `pnpm --filter @veil/agent exec -- node -e "import('hono').then(m => console.log('hono OK'))"`
Expected: `hono OK`

**Step 3: Verify build still works**

Run: `pnpm --filter @veil/agent build`
Expected: No errors (hono isn't imported yet, just installed)

**Step 4: Commit**

```bash
git add packages/agent/package.json pnpm-lock.yaml
git commit -m "chore: add hono, @hono/node-server, @hono/zod-validator dependencies"
```

---

### Task 2: Create Auth Middleware

**Files:**
- Create: `packages/agent/src/middleware/auth.ts`
- Test: `packages/agent/src/middleware/__tests__/auth.test.ts`

This middleware extracts the wallet address from the `Authorization: Bearer <token>` header using the existing `verifyAuthToken` function, and sets it on the Hono context. Routes that need auth use this middleware; it returns 401 if the token is missing or invalid.

**Step 1: Write the failing test**

Create `packages/agent/src/middleware/__tests__/auth.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import { requireAuth, type AuthEnv } from "../auth.js";

// Mock the auth module
vi.mock("../../auth.js", () => ({
  verifyAuthToken: vi.fn(),
}));

import { verifyAuthToken } from "../../auth.js";

const mockVerify = vi.mocked(verifyAuthToken);

describe("requireAuth middleware", () => {
  let app: Hono<AuthEnv>;

  beforeEach(() => {
    vi.clearAllMocks();
    app = new Hono<AuthEnv>();
    app.use("/*", requireAuth);
    app.get("/test", (c) => c.json({ wallet: c.var.wallet }));
  });

  it("returns 401 when no Authorization header", async () => {
    const res = await app.request("/test");
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 401 when token is invalid", async () => {
    mockVerify.mockReturnValue(null);
    const res = await app.request("/test", {
      headers: { Authorization: "Bearer bad-token" },
    });
    expect(res.status).toBe(401);
  });

  it("sets wallet on context when token is valid", async () => {
    mockVerify.mockReturnValue("0xabc123");
    const res = await app.request("/test", {
      headers: { Authorization: "Bearer good-token" },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.wallet).toBe("0xabc123");
  });

  it("does not call verifyAuthToken when header is missing", async () => {
    await app.request("/test");
    expect(mockVerify).not.toHaveBeenCalled();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm --filter @veil/agent test -- src/middleware/__tests__/auth.test.ts`
Expected: FAIL — module `../auth.js` not found

**Step 3: Write the middleware**

Create `packages/agent/src/middleware/auth.ts`:

```typescript
import { createMiddleware } from "hono/factory";
import { verifyAuthToken } from "../auth.js";

export type AuthEnv = {
  Variables: {
    wallet: string;
  };
};

export const requireAuth = createMiddleware<AuthEnv>(async (c, next) => {
  const auth = c.req.header("Authorization");
  if (!auth?.startsWith("Bearer ")) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const token = auth.slice(7);
  const wallet = verifyAuthToken(token);
  if (!wallet) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  c.set("wallet", wallet);
  await next();
});
```

**Step 4: Run test to verify it passes**

Run: `pnpm --filter @veil/agent test -- src/middleware/__tests__/auth.test.ts`
Expected: PASS (4 tests)

**Step 5: Commit**

```bash
git add packages/agent/src/middleware/
git commit -m "feat: add Hono auth middleware with tests"
```

---

### Task 3: Create Auth Routes

**Files:**
- Create: `packages/agent/src/routes/auth.ts`
- Test: `packages/agent/src/routes/__tests__/auth.test.ts`

Extracts `handleAuthNonce` and `handleAuthVerify` from `server.ts` into a Hono sub-app. The route module exports a factory function that receives dependencies (repo) and returns a Hono app. This avoids module-level singletons and makes testing easy.

**Step 1: Write the failing test**

Create `packages/agent/src/routes/__tests__/auth.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createAuthRoutes } from "../auth.js";
import type { IntentRepository } from "../../db/repository.js";

// Mock viem
vi.mock("viem", () => ({
  recoverMessageAddress: vi.fn(),
}));
import { recoverMessageAddress } from "viem";
const mockRecover = vi.mocked(recoverMessageAddress);

// Mock auth module
vi.mock("../../auth.js", () => ({
  generateNonce: vi.fn().mockReturnValue("mock-nonce-abc"),
  createAuthToken: vi.fn().mockReturnValue("mock-token-xyz"),
  verifyAuthToken: vi.fn(),
  NONCE_TTL_SECONDS: 300,
}));

function createMockRepo(): IntentRepository {
  return {
    upsertNonce: vi.fn(),
    getNonce: vi.fn(),
    deleteNonce: vi.fn(),
    createIntent: vi.fn(),
    getIntent: vi.fn(),
    getIntentsByWallet: vi.fn(),
    getActiveIntents: vi.fn(),
    updateIntentStatus: vi.fn(),
    updateIntentCycleState: vi.fn(),
    updateIntentAgentId: vi.fn(),
    markExpiredIntents: vi.fn(),
    insertSwap: vi.fn(),
    getSwapsByIntent: vi.fn(),
  } as unknown as IntentRepository;
}

describe("auth routes", () => {
  let repo: IntentRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repo = createMockRepo();
  });

  describe("GET /nonce", () => {
    it("returns nonce for a wallet", async () => {
      const app = createAuthRoutes({ repo });
      const res = await app.request("/nonce?wallet=0x1234");
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.nonce).toBe("mock-nonce-abc");
      expect(vi.mocked(repo.upsertNonce)).toHaveBeenCalledWith(
        "0x1234",
        "mock-nonce-abc",
      );
    });

    it("returns 400 when wallet is missing", async () => {
      const app = createAuthRoutes({ repo });
      const res = await app.request("/nonce");
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe("Missing wallet query parameter");
    });
  });

  describe("POST /verify", () => {
    it("returns token on valid signature", async () => {
      const now = Math.floor(Date.now() / 1000);
      vi.mocked(repo.getNonce).mockReturnValue({
        walletAddress: "0xabcd",
        nonce: "stored-nonce",
        createdAt: now,
      });
      mockRecover.mockResolvedValue("0xABCD" as `0x${string}`);

      const app = createAuthRoutes({ repo });
      const res = await app.request("/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet: "0xABCD",
          signature: "0xdeadbeef",
        }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.token).toBe("mock-token-xyz");
    });

    it("returns 400 when wallet or signature is missing", async () => {
      const app = createAuthRoutes({ repo });
      const res = await app.request("/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet: "0x1234" }),
      });
      expect(res.status).toBe(400);
    });

    it("returns 401 when no nonce found", async () => {
      vi.mocked(repo.getNonce).mockReturnValue(null);
      const app = createAuthRoutes({ repo });
      const res = await app.request("/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet: "0x1234",
          signature: "0xdeadbeef",
        }),
      });
      expect(res.status).toBe(401);
    });

    it("returns 401 when nonce is expired", async () => {
      vi.mocked(repo.getNonce).mockReturnValue({
        walletAddress: "0x1234",
        nonce: "old-nonce",
        createdAt: Math.floor(Date.now() / 1000) - 400, // expired (> 300s)
      });
      const app = createAuthRoutes({ repo });
      const res = await app.request("/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet: "0x1234",
          signature: "0xdeadbeef",
        }),
      });
      expect(res.status).toBe(401);
    });

    it("returns 401 when signature does not match wallet", async () => {
      const now = Math.floor(Date.now() / 1000);
      vi.mocked(repo.getNonce).mockReturnValue({
        walletAddress: "0x1234",
        nonce: "some-nonce",
        createdAt: now,
      });
      mockRecover.mockResolvedValue("0xDIFFERENT" as `0x${string}`);

      const app = createAuthRoutes({ repo });
      const res = await app.request("/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet: "0x1234",
          signature: "0xdeadbeef",
        }),
      });
      expect(res.status).toBe(401);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm --filter @veil/agent test -- src/routes/__tests__/auth.test.ts`
Expected: FAIL — module `../auth.js` not found

**Step 3: Write the route module**

Create `packages/agent/src/routes/auth.ts`:

```typescript
import { Hono } from "hono";
import { recoverMessageAddress } from "viem";
import type { IntentRepository } from "../db/repository.js";
import {
  generateNonce,
  createAuthToken,
  NONCE_TTL_SECONDS,
} from "../auth.js";

export interface AuthRouteDeps {
  repo: IntentRepository;
}

export function createAuthRoutes({ repo }: AuthRouteDeps) {
  const app = new Hono();

  // GET /nonce?wallet=0x...
  app.get("/nonce", (c) => {
    const wallet = c.req.query("wallet");
    if (!wallet) {
      return c.json({ error: "Missing wallet query parameter" }, 400);
    }

    const nonce = generateNonce();
    repo.upsertNonce(wallet.toLowerCase(), nonce);
    return c.json({ nonce });
  });

  // POST /verify  { wallet, signature }
  app.post("/verify", async (c) => {
    const body = await c.req.json();
    const wallet = typeof body.wallet === "string" ? body.wallet : null;
    const signature =
      typeof body.signature === "string" ? body.signature : null;

    if (!wallet || !signature) {
      return c.json({ error: "Missing wallet or signature" }, 400);
    }

    const walletLower = wallet.toLowerCase();
    const nonceRecord = repo.getNonce(walletLower);
    if (!nonceRecord) {
      return c.json(
        { error: "No nonce found — request /api/auth/nonce first" },
        401,
      );
    }

    // Check nonce expiry
    const now = Math.floor(Date.now() / 1000);
    if (now - nonceRecord.createdAt > NONCE_TTL_SECONDS) {
      repo.deleteNonce(walletLower);
      return c.json({ error: "Nonce expired" }, 401);
    }

    // Verify signature
    try {
      const message = `Sign this message to authenticate with Veil.\n\nNonce: ${nonceRecord.nonce}`;
      const recovered = await recoverMessageAddress({
        message,
        signature: signature as `0x${string}`,
      });

      if (recovered.toLowerCase() !== walletLower) {
        return c.json(
          { error: "Signature does not match wallet" },
          401,
        );
      }
    } catch {
      return c.json({ error: "Invalid signature" }, 401);
    }

    // Clean up nonce and issue token
    repo.deleteNonce(walletLower);
    const token = createAuthToken(walletLower);
    return c.json({ token });
  });

  return app;
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm --filter @veil/agent test -- src/routes/__tests__/auth.test.ts`
Expected: PASS (6 tests)

**Step 5: Commit**

```bash
git add packages/agent/src/routes/
git commit -m "feat: extract auth routes to Hono sub-app with tests"
```

---

### Task 4: Create Parse-Intent Route

**Files:**
- Create: `packages/agent/src/routes/parse.ts`
- Test: `packages/agent/src/routes/__tests__/parse.test.ts`

**Step 1: Write the failing test**

Create `packages/agent/src/routes/__tests__/parse.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createParseRoutes } from "../parse.js";

vi.mock("../../delegation/compiler.js", () => ({
  compileIntent: vi.fn(),
}));
vi.mock("@veil/common", async () => {
  const actual = await vi.importActual<typeof import("@veil/common")>(
    "@veil/common",
  );
  return {
    ...actual,
    generateAuditReport: vi.fn().mockReturnValue({
      allows: ["swap ETH for USDC"],
      prevents: ["exceed $200/day"],
      worstCase: "$200 in slippage",
      warnings: [],
    }),
  };
});

import { compileIntent } from "../../delegation/compiler.js";
const mockCompile = vi.mocked(compileIntent);

describe("parse-intent routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns parsed intent and audit report", async () => {
    mockCompile.mockResolvedValue({
      targetAllocation: { ETH: 60, USDC: 40 },
      dailyBudgetUsd: 200,
      timeWindowDays: 7,
      maxTradesPerDay: 5,
      maxSlippage: 0.5,
      driftThreshold: 5,
    });

    const app = createParseRoutes();
    const res = await app.request("/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ intent: "60/40 ETH/USDC, $200/day, 7 days" }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.parsed.dailyBudgetUsd).toBe(200);
    expect(body.audit.allows).toContain("swap ETH for USDC");
  });

  it("returns 400 when intent text is missing", async () => {
    const app = createParseRoutes();
    const res = await app.request("/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Missing intent text");
  });

  it("returns 500 when compileIntent throws", async () => {
    mockCompile.mockRejectedValue(new Error("LLM timeout"));

    const app = createParseRoutes();
    const res = await app.request("/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ intent: "some intent" }),
    });
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("LLM timeout");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm --filter @veil/agent test -- src/routes/__tests__/parse.test.ts`
Expected: FAIL — module `../parse.js` not found

**Step 3: Write the route module**

Create `packages/agent/src/routes/parse.ts`:

```typescript
import { Hono } from "hono";
import { compileIntent } from "../delegation/compiler.js";
import { generateAuditReport } from "@veil/common";
import { logger } from "../logging/logger.js";

export function createParseRoutes() {
  const app = new Hono();

  // POST /  (mounted at /api/parse-intent)
  app.post("/", async (c) => {
    const body = await c.req.json();
    const intentText =
      typeof body.intent === "string" ? body.intent.trim() : null;
    if (!intentText) {
      return c.json({ error: "Missing intent text" }, 400);
    }

    try {
      const parsed = await compileIntent(intentText);
      const audit = generateAuditReport(parsed);
      return c.json({ parsed, audit });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error({ err }, "Parse intent failed");
      return c.json({ error: msg }, 500);
    }
  });

  return app;
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm --filter @veil/agent test -- src/routes/__tests__/parse.test.ts`
Expected: PASS (3 tests)

**Step 5: Commit**

```bash
git add packages/agent/src/routes/parse.ts packages/agent/src/routes/__tests__/parse.test.ts
git commit -m "feat: extract parse-intent route to Hono sub-app with tests"
```

---

### Task 5: Create Intent Routes

**Files:**
- Create: `packages/agent/src/routes/intents.ts`
- Test: `packages/agent/src/routes/__tests__/intents.test.ts`

This is the largest route file. It handles: `POST /` (create), `GET /` (list), `GET /:id` (detail), `DELETE /:id` (cancel), `GET /:id/logs` (download logs). All routes require auth — the auth middleware is applied by the parent app when mounting, so these handlers read `c.var.wallet`.

**Step 1: Write the failing test**

Create `packages/agent/src/routes/__tests__/intents.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import { createIntentRoutes } from "../intents.js";
import { requireAuth, type AuthEnv } from "../../middleware/auth.js";
import type { IntentRepository } from "../../db/repository.js";
import type { WorkerPool } from "../../worker-pool.js";

// Mock auth — always returns a wallet for these tests
vi.mock("../../auth.js", () => ({
  verifyAuthToken: vi.fn().mockReturnValue("0xwallet123"),
  generateNonce: vi.fn(),
  createAuthToken: vi.fn(),
  NONCE_TTL_SECONDS: 300,
}));

vi.mock("nanoid", () => ({
  nanoid: vi.fn().mockReturnValue("test-intent-id"),
}));

vi.mock("@veil/common", async () => {
  const { z } = await import("zod");
  return {
    ParsedIntentSchema: z.object({
      targetAllocation: z.record(z.string(), z.number()),
      dailyBudgetUsd: z.number(),
      timeWindowDays: z.number(),
      maxTradesPerDay: z.number(),
      maxSlippage: z.number(),
      driftThreshold: z.number(),
    }),
    computeExpiryTimestamp: vi
      .fn()
      .mockReturnValue(Math.floor(Date.now() / 1000) + 86400),
    generateAuditReport: vi.fn().mockReturnValue({
      allows: [],
      prevents: [],
      worstCase: "",
      warnings: [],
    }),
  };
});

vi.mock("../../logging/intent-log.js", () => {
  class MockLogger {
    log = vi.fn();
    readAll = vi.fn().mockReturnValue([]);
    getFilePath = vi.fn().mockReturnValue("/tmp/nonexistent.jsonl");
  }
  return { IntentLogger: MockLogger };
});

vi.mock("../../logging/logger.js", () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

function createMockRepo(): IntentRepository {
  return {
    createIntent: vi.fn().mockImplementation((data) => ({
      ...data,
      status: "active",
    })),
    getIntent: vi.fn(),
    getIntentsByWallet: vi.fn().mockReturnValue([]),
    getActiveIntents: vi.fn().mockReturnValue([]),
    updateIntentStatus: vi.fn(),
    updateIntentCycleState: vi.fn(),
    updateIntentAgentId: vi.fn(),
    markExpiredIntents: vi.fn(),
    insertSwap: vi.fn(),
    getSwapsByIntent: vi.fn(),
    upsertNonce: vi.fn(),
    getNonce: vi.fn(),
    deleteNonce: vi.fn(),
  } as unknown as IntentRepository;
}

function createMockWorkerPool(): WorkerPool {
  return {
    start: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn().mockResolvedValue(undefined),
    getStatus: vi.fn().mockReturnValue("stopped"),
    getState: vi.fn().mockReturnValue(null),
    activeCount: vi.fn().mockReturnValue(0),
    queuedCount: vi.fn().mockReturnValue(0),
    shutdown: vi.fn().mockResolvedValue(undefined),
    setWorkerFactory: vi.fn(),
  } as unknown as WorkerPool;
}

const AUTH_HEADER = { Authorization: "Bearer valid-token" };

function buildApp(repo: IntentRepository, pool: WorkerPool) {
  const root = new Hono<AuthEnv>();
  root.use("/*", requireAuth);
  root.route("/", createIntentRoutes({ repo, workerPool: pool }));
  return root;
}

describe("intent routes", () => {
  let repo: IntentRepository;
  let pool: WorkerPool;

  beforeEach(() => {
    vi.clearAllMocks();
    repo = createMockRepo();
    pool = createMockWorkerPool();
  });

  describe("POST / (create intent)", () => {
    const validBody = {
      intentText: "60/40 ETH/USDC",
      parsedIntent: {
        targetAllocation: { ETH: 60, USDC: 40 },
        dailyBudgetUsd: 200,
        timeWindowDays: 7,
        maxTradesPerDay: 5,
        maxSlippage: 0.5,
        driftThreshold: 5,
      },
      signedDelegation: "0xdelegation",
      delegatorSmartAccount: "0xsmartaccount",
    };

    it("creates an intent and returns 201", async () => {
      const app = buildApp(repo, pool);
      const res = await app.request("/", {
        method: "POST",
        headers: { ...AUTH_HEADER, "Content-Type": "application/json" },
        body: JSON.stringify(validBody),
      });
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.intent).toBeDefined();
      expect(body.audit).toBeDefined();
      expect(vi.mocked(pool.start)).toHaveBeenCalledWith("test-intent-id");
    });

    it("returns 400 when required fields are missing", async () => {
      const app = buildApp(repo, pool);
      const res = await app.request("/", {
        method: "POST",
        headers: { ...AUTH_HEADER, "Content-Type": "application/json" },
        body: JSON.stringify({ intentText: "hello" }),
      });
      expect(res.status).toBe(400);
    });

    it("returns 401 without auth", async () => {
      const app = buildApp(repo, pool);
      const res = await app.request("/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validBody),
      });
      expect(res.status).toBe(401);
    });
  });

  describe("GET / (list intents)", () => {
    it("returns intents for the authenticated wallet", async () => {
      vi.mocked(repo.getIntentsByWallet).mockReturnValue([
        { id: "i1", walletAddress: "0xwallet123", status: "active" },
      ] as never);

      const app = buildApp(repo, pool);
      const res = await app.request("/", { headers: AUTH_HEADER });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(Array.isArray(body)).toBe(true);
    });

    it("returns 403 when wallet query param doesn't match auth", async () => {
      const app = buildApp(repo, pool);
      const res = await app.request("/?wallet=0xother", {
        headers: AUTH_HEADER,
      });
      expect(res.status).toBe(403);
    });
  });

  describe("GET /:id (get intent)", () => {
    it("returns intent detail with worker status and logs", async () => {
      vi.mocked(repo.getIntent).mockReturnValue({
        id: "i1",
        walletAddress: "0xwallet123",
        status: "active",
      } as never);

      const app = buildApp(repo, pool);
      const res = await app.request("/i1", { headers: AUTH_HEADER });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.workerStatus).toBeDefined();
      expect(body.logs).toBeDefined();
    });

    it("returns 404 when intent not found", async () => {
      vi.mocked(repo.getIntent).mockReturnValue(null);
      const app = buildApp(repo, pool);
      const res = await app.request("/nonexistent", {
        headers: AUTH_HEADER,
      });
      expect(res.status).toBe(404);
    });

    it("returns 403 when intent belongs to different wallet", async () => {
      vi.mocked(repo.getIntent).mockReturnValue({
        id: "i1",
        walletAddress: "0xother",
        status: "active",
      } as never);

      const app = buildApp(repo, pool);
      const res = await app.request("/i1", { headers: AUTH_HEADER });
      expect(res.status).toBe(403);
    });
  });

  describe("DELETE /:id (cancel intent)", () => {
    it("cancels an intent and stops the worker", async () => {
      vi.mocked(repo.getIntent).mockReturnValue({
        id: "i1",
        walletAddress: "0xwallet123",
        status: "active",
      } as never);

      const app = buildApp(repo, pool);
      const res = await app.request("/i1", {
        method: "DELETE",
        headers: AUTH_HEADER,
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.status).toBe("cancelled");
      expect(vi.mocked(pool.stop)).toHaveBeenCalledWith("i1");
      expect(vi.mocked(repo.updateIntentStatus)).toHaveBeenCalledWith(
        "i1",
        "cancelled",
      );
    });

    it("returns 404 when intent not found", async () => {
      vi.mocked(repo.getIntent).mockReturnValue(null);
      const app = buildApp(repo, pool);
      const res = await app.request("/missing", {
        method: "DELETE",
        headers: AUTH_HEADER,
      });
      expect(res.status).toBe(404);
    });
  });

  describe("GET /:id/logs", () => {
    it("returns empty ndjson when log file does not exist", async () => {
      vi.mocked(repo.getIntent).mockReturnValue({
        id: "i1",
        walletAddress: "0xwallet123",
        status: "active",
      } as never);

      const app = buildApp(repo, pool);
      const res = await app.request("/i1/logs", { headers: AUTH_HEADER });
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toContain(
        "application/x-ndjson",
      );
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm --filter @veil/agent test -- src/routes/__tests__/intents.test.ts`
Expected: FAIL — module `../intents.js` not found

**Step 3: Write the route module**

Create `packages/agent/src/routes/intents.ts`:

```typescript
import { Hono } from "hono";
import { stream } from "hono/streaming";
import { existsSync, createReadStream } from "node:fs";
import { nanoid } from "nanoid";
import {
  ParsedIntentSchema,
  computeExpiryTimestamp,
  generateAuditReport,
} from "@veil/common";
import type { IntentRepository } from "../db/repository.js";
import type { WorkerPool } from "../worker-pool.js";
import { IntentLogger } from "../logging/intent-log.js";
import { logger } from "../logging/logger.js";
import type { AuthEnv } from "../middleware/auth.js";

export interface IntentRouteDeps {
  repo: IntentRepository;
  workerPool: WorkerPool;
}

export function createIntentRoutes({ repo, workerPool }: IntentRouteDeps) {
  const app = new Hono<AuthEnv>();

  // POST / — create intent
  app.post("/", async (c) => {
    const wallet = c.var.wallet;
    const body = await c.req.json();

    const intentText =
      typeof body.intentText === "string" ? body.intentText.trim() : null;
    const parsedIntentRaw = body.parsedIntent;
    const signedDelegation =
      typeof body.signedDelegation === "string"
        ? body.signedDelegation
        : null;
    const delegatorSmartAccount =
      typeof body.delegatorSmartAccount === "string"
        ? body.delegatorSmartAccount
        : null;

    if (
      !intentText ||
      !parsedIntentRaw ||
      !signedDelegation ||
      !delegatorSmartAccount
    ) {
      return c.json(
        {
          error:
            "Missing required fields: intentText, parsedIntent, signedDelegation, delegatorSmartAccount",
        },
        400,
      );
    }

    const parsedResult = ParsedIntentSchema.safeParse(parsedIntentRaw);
    if (!parsedResult.success) {
      return c.json(
        {
          error: `Invalid parsedIntent: ${parsedResult.error.issues[0]?.message ?? "validation failed"}`,
        },
        400,
      );
    }

    const parsed = parsedResult.data;
    const intentId = nanoid();
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = computeExpiryTimestamp(parsed.timeWindowDays);

    const intent = repo.createIntent({
      id: intentId,
      walletAddress: wallet,
      intentText,
      parsedIntent: JSON.stringify(parsed),
      status: "active",
      createdAt: now,
      expiresAt,
      signedDelegation,
      delegatorSmartAccount,
      permissionsContext:
        typeof body.permissionsContext === "string"
          ? body.permissionsContext
          : null,
      delegationManager:
        typeof body.delegationManager === "string"
          ? body.delegationManager
          : null,
    });

    try {
      await workerPool.start(intentId);
    } catch (err) {
      logger.error(
        { err, intentId },
        "Failed to start worker for new intent",
      );
    }

    const audit = generateAuditReport(parsed);
    return c.json({ intent, audit }, 201);
  });

  // GET / — list intents
  app.get("/", (c) => {
    const wallet = c.var.wallet;
    const queryWallet = c.req.query("wallet")?.toLowerCase();
    if (queryWallet && queryWallet !== wallet) {
      return c.json({ error: "Wallet mismatch" }, 403);
    }

    const intents = repo.getIntentsByWallet(wallet);
    const enriched = intents.map((intent) => ({
      ...intent,
      workerStatus: workerPool.getStatus(intent.id),
    }));
    return c.json(enriched);
  });

  // GET /:id — get intent detail
  app.get("/:id", (c) => {
    const wallet = c.var.wallet;
    const intentId = c.req.param("id");
    const intent = repo.getIntent(intentId);
    if (!intent) {
      return c.json({ error: "Intent not found" }, 404);
    }
    if (intent.walletAddress !== wallet) {
      return c.json({ error: "Forbidden" }, 403);
    }

    const workerStatus = workerPool.getStatus(intentId);
    const liveState = workerPool.getState(intentId);
    const intentLogger = new IntentLogger(intentId);
    const logs = intentLogger.readAll();

    return c.json({ ...intent, workerStatus, liveState, logs });
  });

  // DELETE /:id — cancel intent
  app.delete("/:id", async (c) => {
    const wallet = c.var.wallet;
    const intentId = c.req.param("id");
    const intent = repo.getIntent(intentId);
    if (!intent) {
      return c.json({ error: "Intent not found" }, 404);
    }
    if (intent.walletAddress !== wallet) {
      return c.json({ error: "Forbidden" }, 403);
    }

    await workerPool.stop(intentId);
    repo.updateIntentStatus(intentId, "cancelled");
    return c.json({ status: "cancelled" });
  });

  // GET /:id/logs — download intent logs as ndjson
  app.get("/:id/logs", (c) => {
    const wallet = c.var.wallet;
    const intentId = c.req.param("id");
    const intent = repo.getIntent(intentId);
    if (!intent) {
      return c.json({ error: "Intent not found" }, 404);
    }
    if (intent.walletAddress !== wallet) {
      return c.json({ error: "Forbidden" }, 403);
    }

    const intentLogger = new IntentLogger(intentId);
    const filePath = intentLogger.getFilePath();

    c.header("Content-Type", "application/x-ndjson");
    c.header(
      "Content-Disposition",
      `attachment; filename="${intentId}.jsonl"`,
    );

    if (!existsSync(filePath)) {
      return c.body("");
    }

    return stream(c, async (s) => {
      const nodeStream = createReadStream(filePath);
      for await (const chunk of nodeStream) {
        await s.write(chunk);
      }
    });
  });

  return app;
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm --filter @veil/agent test -- src/routes/__tests__/intents.test.ts`
Expected: PASS (9 tests)

**Step 5: Commit**

```bash
git add packages/agent/src/routes/intents.ts packages/agent/src/routes/__tests__/intents.test.ts
git commit -m "feat: extract intent CRUD routes to Hono sub-app with tests"
```

---

### Task 6: Rewrite `server.ts` to Use Hono

**Files:**
- Rewrite: `packages/agent/src/server.ts`

This is the core migration step. The file shrinks from ~633 lines to ~120 lines. It sets up the Hono app, mounts CORS middleware, mounts the three route modules, configures static file serving for the dashboard SPA, and runs `startup()`.

**Step 1: Rewrite `server.ts`**

Replace `packages/agent/src/server.ts` with:

```typescript
/**
 * HTTP server (port 3147) exposing wallet-scoped intent API.
 * Serves the Next.js dashboard static build as a SPA fallback.
 *
 * @module @veil/agent/server
 */
import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { join } from "path";
import { existsSync, readFileSync } from "node:fs";
import { privateKeyToAccount } from "viem/accounts";

import { env } from "./config.js";
import { registerAgent } from "./identity/erc8004.js";
import { DEFAULT_AGENT_PORT } from "@veil/common";
import { logger } from "./logging/logger.js";
import { withRetry } from "./utils/retry.js";
import { IntentRepository } from "./db/repository.js";
import { getDb } from "./db/connection.js";
import { WorkerPool } from "./worker-pool.js";
import { DefaultAgentWorker } from "./agent-worker.js";
import { resumeActiveIntents } from "./startup.js";

import { requireAuth } from "./middleware/auth.js";
import { createAuthRoutes } from "./routes/auth.js";
import { createParseRoutes } from "./routes/parse.js";
import { createIntentRoutes } from "./routes/intents.js";

const PORT = process.env.PORT ? Number(process.env.PORT) : DEFAULT_AGENT_PORT;
const DASHBOARD_DIST = join(process.cwd(), "apps", "dashboard", "out");

// Singleton instances — initialized at startup
let repo: IntentRepository;
let serverAgentId: bigint | undefined;
const workerPool = new WorkerPool({ maxConcurrency: 5 });

// ---------------------------------------------------------------------------
// App setup
// ---------------------------------------------------------------------------

export const app = new Hono();

// CORS
app.use(
  "*",
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  }),
);

// ---------------------------------------------------------------------------
// API routes
// ---------------------------------------------------------------------------

// Auth routes (no auth middleware required)
app.route("/api/auth", createAuthRoutes({ get repo() { return repo; } }));

// Parse intent (no auth required — used before wallet connected)
app.route("/api/parse-intent", createParseRoutes());

// Intent CRUD routes (auth required)
app.use("/api/intents/*", requireAuth);
app.use("/api/intents", requireAuth);
app.route(
  "/api/intents",
  createIntentRoutes({
    get repo() { return repo; },
    workerPool,
  }),
);

// ---------------------------------------------------------------------------
// Dashboard static files + SPA fallback
// ---------------------------------------------------------------------------

app.use(
  "/_next/*",
  serveStatic({ root: DASHBOARD_DIST, rewriteRequestPath: (p) => p }),
);
app.use(
  "/favicon.ico",
  serveStatic({ root: DASHBOARD_DIST, rewriteRequestPath: () => "/favicon.ico" }),
);

// SPA fallback — serve index.html for all non-API routes
app.get("*", (c) => {
  const indexPath = join(DASHBOARD_DIST, "index.html");
  if (existsSync(indexPath)) {
    const html = readFileSync(indexPath, "utf-8");
    return c.html(html);
  }

  return c.html(`<!doctype html>
<html><head><title>Veil API</title></head>
<body style="font-family:monospace;background:#0a0c0f;color:#c9d1d9;padding:2rem">
<h1 style="color:#00ff9d">VEIL</h1>
<p>Agent API is running. Dashboard not built yet.</p>
<p>API endpoints:</p>
<ul>
<li>GET /api/auth/nonce?wallet= — request auth nonce</li>
<li>POST /api/auth/verify — verify wallet signature</li>
<li>POST /api/parse-intent — parse intent text</li>
<li>POST /api/intents — create new intent</li>
<li>GET /api/intents?wallet= — list intents</li>
<li>GET /api/intents/:id — get intent detail</li>
<li>DELETE /api/intents/:id — cancel intent</li>
<li>GET /api/intents/:id/logs — download intent logs</li>
</ul>
<p style="color:#6e7681">Build the dashboard: <code>pnpm --filter @veil/dashboard build</code></p>
</body></html>`);
});

// ---------------------------------------------------------------------------
// Startup
// ---------------------------------------------------------------------------

async function startup() {
  // Initialize database
  repo = new IntentRepository(getDb());

  // Wire up worker factory
  workerPool.setWorkerFactory(
    (intentId) => new DefaultAgentWorker(intentId, { repo, serverAgentId }),
  );

  const agentAccount = privateKeyToAccount(env.AGENT_PRIVATE_KEY);

  logger.info("=".repeat(60));
  logger.info("  VEIL — Dashboard Server");
  logger.info("=".repeat(60));
  logger.info(`  Agent address:  ${agentAccount.address}`);
  logger.info(`  Dashboard:      http://localhost:${PORT}`);
  logger.info(`  API:            http://localhost:${PORT}/api/intents`);
  logger.info("=".repeat(60));

  serve({ fetch: app.fetch, port: PORT }, () => {
    logger.info(`[server] Listening on http://localhost:${PORT}`);
  });

  // Resume active intents from database
  try {
    const result = await resumeActiveIntents(
      repo,
      (intentId) => workerPool.start(intentId),
    );
    if (result.expired > 0 || result.resumed > 0) {
      logger.info(
        { expired: result.expired, resumed: result.resumed },
        "Startup resumption complete",
      );
    }
  } catch (err) {
    logger.error({ err }, "Startup resumption failed");
  }

  // Register agent identity on Base Sepolia
  try {
    const { txHash, agentId } = await withRetry(
      () => registerAgent(`https://github.com/neilei/veil`, "base-sepolia"),
      { label: "erc8004:register", maxRetries: 3 },
    );
    if (agentId) {
      serverAgentId = agentId;
    }
    logger.info(
      { txHash, agentId: agentId?.toString() },
      "ERC-8004 agent registered — ID will be passed to all workers",
    );
  } catch (err) {
    logger.error(
      { err },
      "ERC-8004 registration failed after retries — workers will register individually",
    );
  }
}

startup();
```

**NOTE on lazy `repo` access:** The route factories receive `repo` via getter (`get repo() { return repo; }`) because `repo` is initialized inside `startup()` after the app is created. The routes only access `repo` at request time, never at mount time, so the getter is safe.

**Step 2: Verify build compiles**

Run: `pnpm --filter @veil/agent build`
Expected: No TypeScript errors. If `serveStatic` rewriteRequestPath typing is fussy, adjust per compiler feedback.

**Step 3: Commit**

```bash
git add packages/agent/src/server.ts
git commit -m "feat: rewrite server.ts to use Hono with modular routes"
```

---

### Task 7: Rewrite Unit Tests for `server.ts`

**Files:**
- Rewrite: `packages/agent/src/__tests__/server.test.ts`

The old tests mock `http.createServer` and manually construct `IncomingMessage`/`ServerResponse` — none of that applies anymore. The new tests import `app` from `server.ts` and use `app.request()` (Hono's built-in test helper). Since the route-level logic is already tested in `routes/__tests__/*.test.ts`, these tests focus on **integration**: CORS, routing dispatch, SPA fallback, and OPTIONS preflight.

**Step 1: Rewrite the test file**

Replace `packages/agent/src/__tests__/server.test.ts` with:

```typescript
/**
 * Integration tests for the Hono server — CORS, routing, SPA fallback.
 * Route handler logic is tested in routes/__tests__/*.test.ts.
 *
 * @module @veil/agent/server.test
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mock all heavy dependencies (same as before, prevents real crypto/DB/network)
// ---------------------------------------------------------------------------
vi.mock("../config.js", () => ({
  env: {
    VENICE_API_KEY: "x",
    VENICE_BASE_URL: "https://x",
    UNISWAP_API_KEY: "x",
    AGENT_PRIVATE_KEY:
      "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
  },
  CONTRACTS: {},
  CHAINS: {},
  UNISWAP_API_BASE: "",
  THEGRAPH_UNISWAP_V3_BASE: "",
}));
vi.mock("viem/accounts", () => ({
  privateKeyToAccount: vi.fn().mockReturnValue({
    address: "0xABCDEF1234567890ABCDEF1234567890ABCDEF12",
  }),
}));
vi.mock("../delegation/compiler.js", () => ({
  compileIntent: vi.fn(),
}));
vi.mock("../identity/erc8004.js", () => ({
  registerAgent: vi.fn().mockResolvedValue({ txHash: "0xabc", agentId: 1n }),
}));
vi.mock("../logging/logger.js", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));
vi.mock("../utils/retry.js", () => ({
  withRetry: vi.fn((fn: () => Promise<unknown>) => fn()),
}));
vi.mock("../db/connection.js", () => ({
  getDb: vi.fn().mockReturnValue({}),
}));
vi.mock("../db/repository.js", () => {
  class MockRepo {
    createIntent = vi.fn();
    getIntent = vi.fn();
    getIntentsByWallet = vi.fn().mockReturnValue([]);
    getActiveIntents = vi.fn().mockReturnValue([]);
    updateIntentStatus = vi.fn();
    updateIntentCycleState = vi.fn();
    updateIntentAgentId = vi.fn();
    markExpiredIntents = vi.fn();
    insertSwap = vi.fn();
    getSwapsByIntent = vi.fn();
    upsertNonce = vi.fn();
    getNonce = vi.fn();
    deleteNonce = vi.fn();
  }
  return { IntentRepository: MockRepo };
});
vi.mock("../worker-pool.js", () => {
  class MockPool {
    start = vi.fn().mockResolvedValue(undefined);
    stop = vi.fn().mockResolvedValue(undefined);
    getStatus = vi.fn().mockReturnValue("stopped");
    getState = vi.fn().mockReturnValue(null);
    activeCount = vi.fn().mockReturnValue(0);
    queuedCount = vi.fn().mockReturnValue(0);
    shutdown = vi.fn().mockResolvedValue(undefined);
    setWorkerFactory = vi.fn();
  }
  return { WorkerPool: MockPool };
});
vi.mock("../logging/intent-log.js", () => {
  class MockLogger {
    log = vi.fn();
    readAll = vi.fn().mockReturnValue([]);
    getFilePath = vi.fn().mockReturnValue("data/logs/mock.jsonl");
  }
  return { IntentLogger: MockLogger };
});
vi.mock("../agent-worker.js", () => {
  class MockWorker {
    intentId: string;
    constructor(intentId: string) {
      this.intentId = intentId;
    }
    start = vi.fn().mockResolvedValue(undefined);
    stop = vi.fn().mockResolvedValue(undefined);
    isRunning = vi.fn().mockReturnValue(false);
    getState = vi.fn().mockReturnValue(null);
  }
  return { DefaultAgentWorker: MockWorker };
});
vi.mock("../auth.js", () => ({
  generateNonce: vi.fn().mockReturnValue("mock-nonce-123"),
  createAuthToken: vi.fn().mockReturnValue("mock-token"),
  verifyAuthToken: vi.fn().mockReturnValue(null),
  NONCE_TTL_SECONDS: 300,
}));
vi.mock("../startup.js", () => ({
  resumeActiveIntents: vi.fn().mockResolvedValue({ expired: 0, resumed: 0 }),
}));
vi.mock("@veil/common", async () => {
  const { z } = await import("zod");
  return {
    DEFAULT_AGENT_PORT: 3147,
    API_PATHS: {
      authNonce: "/api/auth/nonce",
      authVerify: "/api/auth/verify",
      parseIntent: "/api/parse-intent",
      intents: "/api/intents",
    },
    ParsedIntentSchema: z.object({
      targetAllocation: z.record(z.string(), z.number()),
      dailyBudgetUsd: z.number(),
      timeWindowDays: z.number(),
      maxTradesPerDay: z.number(),
      maxSlippage: z.number(),
      driftThreshold: z.number(),
    }),
    computeExpiryTimestamp: vi
      .fn()
      .mockReturnValue(Math.floor(Date.now() / 1000) + 86400),
    generateAuditReport: vi.fn().mockReturnValue({
      allows: [],
      prevents: [],
      worstCase: "",
      warnings: [],
    }),
  };
});
vi.mock("../agent-loop.js", () => ({}));
vi.mock("@hono/node-server", () => ({
  serve: vi.fn(),
}));
vi.mock("@hono/node-server/serve-static", () => ({
  serveStatic: vi.fn().mockReturnValue(
    async (_c: unknown, next: () => Promise<void>) => next(),
  ),
}));

// ---------------------------------------------------------------------------
// Import the app AFTER mocks are set up
// ---------------------------------------------------------------------------

const { app } = await import("../server.js");

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("CORS", () => {
  it("OPTIONS returns 204 with CORS headers", async () => {
    const res = await app.request("/api/parse-intent", {
      method: "OPTIONS",
    });
    expect(res.status).toBe(204);
    expect(res.headers.get("access-control-allow-origin")).toBe("*");
    expect(res.headers.get("access-control-allow-methods")).toContain("POST");
    expect(res.headers.get("access-control-allow-headers")).toContain(
      "Content-Type",
    );
  });

  it("JSON responses include CORS headers", async () => {
    const res = await app.request("/api/auth/nonce?wallet=0x1234");
    expect(res.headers.get("access-control-allow-origin")).toBe("*");
  });
});

describe("Route dispatch", () => {
  it("GET /api/auth/nonce returns nonce", async () => {
    const res = await app.request("/api/auth/nonce?wallet=0x1234");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.nonce).toBe("mock-nonce-123");
  });

  it("GET /api/auth/nonce returns 400 without wallet", async () => {
    const res = await app.request("/api/auth/nonce");
    expect(res.status).toBe(400);
  });

  it("GET /api/intents returns 401 without auth", async () => {
    const res = await app.request("/api/intents");
    expect(res.status).toBe(401);
  });

  it("POST /api/parse-intent returns 400 for missing intent", async () => {
    const res = await app.request("/api/parse-intent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("Missing intent");
  });
});

describe("SPA fallback", () => {
  it("GET / returns HTML", async () => {
    const res = await app.request("/");
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("VEIL");
  });

  it("GET /nonexistent returns HTML (not JSON 404)", async () => {
    const res = await app.request("/nonexistent");
    expect(res.status).toBe(200);
    const contentType = res.headers.get("content-type") ?? "";
    expect(contentType).toContain("text/html");
  });
});
```

**Step 2: Run tests**

Run: `pnpm --filter @veil/agent test -- src/__tests__/server.test.ts`
Expected: PASS

**Step 3: Also run the route-level tests to make sure nothing broke**

Run: `pnpm --filter @veil/agent test`
Expected: All tests pass

**Step 4: Commit**

```bash
git add packages/agent/src/__tests__/server.test.ts
git commit -m "test: rewrite server tests for Hono (app.request instead of http mocks)"
```

---

### Task 8: Run E2E Tests + Manual Verification

**Files:**
- No file changes expected. Fix any issues found.

**Step 1: Build the agent package**

Run: `pnpm --filter @veil/agent build`
Expected: Clean compile with no errors

**Step 2: Run the server locally and spot-check**

Run: `pnpm run serve` (in background or separate terminal)

Then test key endpoints:
```bash
curl -s http://localhost:3147/api/auth/nonce?wallet=0x1234 | head -c 200
curl -s http://localhost:3147/ | head -c 200
curl -s -X OPTIONS http://localhost:3147/api/intents -i 2>&1 | head -20
```

Expected:
- Nonce endpoint returns JSON with `nonce` field
- Root returns HTML with "VEIL"
- OPTIONS returns 204 with CORS headers

**Step 3: Run E2E tests**

Run: `pnpm run test:e2e`
Expected: All tests in `server.e2e.test.ts` pass without modification

**Step 4: Fix any issues found**

If E2E tests fail, check:
- Port binding (Hono's `serve` uses same port semantics)
- CORS header casing (Hono normalizes to lowercase)
- Response body differences (e.g., extra whitespace in JSON)
- Static file serving paths

**Step 5: Run full test suite**

Run: `pnpm test`
Expected: All unit tests pass across all packages

**Step 6: Commit any fixes**

```bash
git add -A
git commit -m "fix: address e2e test issues from Hono migration"
```

---

### Task 9: Clean Up and Final Commit

**Files:**
- Possibly modify: `CLAUDE.md` (if any architectural notes need updating)

**Step 1: Verify no leftover references to old patterns**

Search for any remaining references to `createServer` from `node:http` in agent source (not tests):
```
grep -r "from \"http\"" packages/agent/src/ --include="*.ts" | grep -v __tests__ | grep -v node_modules
```
Expected: No matches

**Step 2: Run lint**

Run: `pnpm run lint`
Expected: No errors

**Step 3: Run full build + test one final time**

Run: `turbo run build` then `turbo run test`
Expected: All green

**Step 4: Final commit**

```bash
git add -A
git commit -m "chore: clean up Hono migration — remove dead code, update docs"
```

---

## Summary

| Before | After |
|---|---|
| `server.ts`: 633 lines | `server.ts`: ~120 lines |
| Manual body parsing, CORS, URL parsing, MIME types, routing | Hono built-ins |
| 1 monolithic file | 5 focused files (`server.ts`, `middleware/auth.ts`, `routes/auth.ts`, `routes/parse.ts`, `routes/intents.ts`) |
| Tests mock `http.createServer` internals (180 lines of setup) | Tests use `app.request()` (20 lines of setup) |
| No route params | Declarative `:id` params |
| Hand-rolled `if/else` router | Hono declarative routing |
