# OpenServ — Complete Technical Reference

## What It Is
End-to-end agentic infrastructure layer for building, launching, and running on-chain AI projects. Multi-agent orchestration platform with proprietary BRAID reasoning framework. "Framework of frameworks" — agents built in any language/framework can collaborate. Includes no-code and code paths, token launching, and an AI Cofounder suite.

**Prize: $4,988 — Two bounties**

---

## Bounties

### Bounty 1: "Best OpenServ Build Story" ($500)
Content challenge — X thread, blog post, or build log about experience building with OpenServ.
- 1st: $250 / 2nd: $250

### Bounty 2: "Ship Something Real with OpenServ" ($4,500)
Build a useful AI-powered product on OpenServ. Multi-agent workflows, x402-native services, agentic DeFi.
- 1st: $2,500 / 2nd: $1,000 / 3rd: $1,000

**What they want:** Agentic economy products, x402-native services, agentic DeFi (trading copilots, strategy assistants, yield/vault helpers, liquidity management, DeFi monitoring, portfolio automation). Bonus: register workflow/agent on ERC-8004.

---

## Platform Architecture

### "Second Brain" Architecture
- You build agent core skills (e.g., summarizing, trading)
- OpenServ's Project Manager agent handles orchestration, routing, formatting
- Single POST endpoint architecture — all requests to root `/` with action `type` field (`do-task`, `respond-chat-message`)
- Async pattern: acknowledge immediately with HTTP 200, process in background

### Three Pillars
1. **BUILD** — No-code workflows + SDK for multi-agent apps
2. **LAUNCH** — Token launch mechanics on Base via bonding curves
3. **RUN** — AI Cofounder Suite (autonomous team members: CMO, CTO, CFO phases)

---

## SDKs

### TypeScript SDK (Primary)
```bash
npm install @openserv-labs/sdk
```

```typescript
import { Agent } from '@openserv-labs/sdk';

const agent = new Agent({
  systemPrompt: "Your agent description",
  apiKey: process.env.OPENSERV_API_KEY,
});

agent.addCapability({
  name: 'greet',
  description: 'Greet a user',
  schema: z.object({ name: z.string() }),
  run: async ({ args }) => `Hello, ${args.name}!`,
});

agent.start(); // Runs on PORT (default 7378)
```

### Python SDK
```bash
pip install openserv-sdk
```

```python
from openserv import Agent, Capability
from openserv.types import AgentOptions
from pydantic import BaseModel

class GreetArgs(BaseModel):
    name: str

agent = Agent(AgentOptions(
    system_prompt="Your agent description",
    api_key="your_api_key_here"
))

agent.add_capability(Capability(
    name="greet",
    description="Greet a user",
    schema=GreetArgs,
    run=lambda run_params, messages:
        f"Hello, {run_params['args'].name}!"
))

agent.start()
```

### REST API (Any Language)
Single POST endpoint at `/`. Action types: `do-task`, `respond-chat-message`. Must respond immediately with HTTP 200 and process asynchronously.

### Skills CLI (Rapid Setup)
```bash
npx skills add openserv-labs/skills
```
Loads 5 official skills: `openserv-agent-sdk`, `openserv-client`, `openserv-launch`, `openserv-multi-agent-workflows`, `openserv-ideaboard-api`. Works with Cursor, Claude Code, Roo Code.

---

## Key SDK Methods

### Task Management
- `createTask()` — Create work units
- `addLogToTask()` — Add progress logs
- `updateTaskStatus()` — Change task status

### Chat & Communication
- `sendMessage()` — Send chat responses
- `requestHumanAssistance()` — Escalate to human

### File Operations
- `uploadFile(workspace_id, path, file, skip_summarizer, task_ids)`
- `getFiles(workspace_id)` — Retrieve workspace files
- `deleteFile()` — Remove files

### Secrets
- `getSecrets()` — List available secrets
- `getSecretValue()` — Retrieve secret value

### Integrations
- `callIntegration()` — Call connected integrations
- `callMcpTool()` — Call MCP tools within capabilities

---

## Platform API Endpoints (Agent → OpenServ)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/workspaces/{workspaceId}/agent-chat/{agentId}/message` | Send chat message |
| POST | `/workspaces/{workspaceId}/file` | Upload file |
| PUT | `/workspaces/{workspaceId}/tasks/{taskId}/complete` | Complete task |
| POST | `/workspaces/{workspaceId}/tasks/{taskId}/error` | Report error |

**API Proxy:** `https://agents-proxy.openserv.ai`

---

## Capabilities System
Capabilities are the building blocks — each represents a function the agent can perform. Framework handles routing, human assistance triggers, and decision-making automatically.

Each capability needs:
- **name** — unique identifier
- **description** — what it does
- **schema** — parameter schema (Zod for TS, Pydantic for Python)
- **run** — execution function

---

## MCP Server Support
Connect agents to external MCP servers and auto-import their tools as capabilities:
```typescript
const agent = new Agent({
  systemPrompt: "...",
  mcpServers: {
    serverName: { transport: "sse", url: "https://..." }
  }
});
```

Supported transports: HTTP, SSE, stdio. Use `addMcpServer()` or constructor config.

---

## BRAID Reasoning Framework
**Bounded Reasoning for Autonomous Inference and Decisions**

### Two-Stage Process
1. **Planning** — Agent generates Guided Reasoning Diagram (GRD) in Mermaid syntax
2. **Execution** — Agent follows the GRD deterministically, reducing hallucinations

### Performance
- GPT-4o accuracy: 42% → 91% on GSM8K with BRAID
- Up to 74x cost efficiency vs standard prompting
- Up to 99% reasoning accuracy
- Large model generates plan once; cheap model executes repeatedly

### DSPy Integration
```bash
pip install braid-dspy
```
GitHub: https://github.com/ziyacivan/braid-dspy

---

## Token Launch Mechanics
- **Fixed supply:** 1,000,000,000 tokens per project
- **Bonding curve:** Price increases deterministically with purchases
- **Graduation threshold:** 10 ETH — auto-graduates to Aerodrome DEX (Base)
- **Post-graduation:** LP tokens locked for 10 years
- **Anti-snipe:** Time-decaying buy-side tax starting at 99%, decreasing 1%/minute, fully removed after ~99 min; taxed portion burned permanently
- **Trading fees:** 67% to the project
- **Chain:** Base (ETH on Base required)
- **Agent launches supported** via `launch_token` capability (name, symbol, creator wallet, description, logo, website, Twitter)

---

## Agent Control Levels
1. **Fully Autonomous** — Framework handles decision-making via shadow agents
2. **Guided Control** — Natural language behavior guidance
3. **Full Control** — Complete customization of task handling, validation, chat

**Shadow Agents:** Each agent gets two supporting agents for decision-making and validation automatically.

**Framework Agnostic:** Works with LangChain, BabyAGI, Eliza, or any framework.

---

## Environment Variables

| Variable | Purpose | Required |
|----------|---------|----------|
| `OPENSERV_API_KEY` | Authentication | Yes |
| `OPENAI_API_KEY` | OpenAI features (`.process()`) | Optional |
| `PORT` | Server port | No (default 7378) |
| `OPENSERV_AUTH_TOKEN` | Auth token override | No |
| `OPENSERV_PROXY_URL` | Custom proxy URL | No (default `https://agents-proxy.openserv.ai`) |
| `DISABLE_TUNNEL` | Disable built-in tunnel | No |

---

## Getting Started

1. Register at platform.openserv.ai (Google login)
2. Developer → Profile → set up developer status
3. Developer → Add Agent (name, endpoint URL, capabilities description)
4. Generate API key from agent details page
5. Set environment variables
6. **Local dev:** Use `run()` function for built-in WebSocket tunnel (no ngrok needed)
7. Test: Create project on platform, add your agent, verify functionality
8. Deploy to publicly accessible URL (Vercel, Render, Railway, Fly.io, AWS Lambda)
9. Developer → Your Agents → Submit for Review

---

## x402 Integration
OpenServ integrates Coinbase's x402 protocol for agent micropayments:
- USDC micropayments between AI agents, apps, and external services
- Uses MCP for seamless cross-chain settlements
- Payments as low as $0.001 per request
- Production-ready SDKs in TypeScript, Python, Go
- Express, Hono, Next.js middleware available

---

## GitHub Repos

| Repo | Description | Stars |
|------|-------------|-------|
| **sdk** | Main TypeScript SDK | 132 |
| **python-sdk** | Python SDK | 2 |
| **agent-starter** | Lightning-fast starter template | 34 |
| **agent-tutorial** | Step-by-step tutorial (Summarizer agent) | — |
| **agent-examples** | Example agents (DexScreener, wallet, marketing) | 7 |
| **skills** | Official AI agent skills (5 skills) | 13 |
| **mcp-proxy** | Reverse proxy + admin UI for MCP tools | 16 |
| **client** | Client library | 6 |
| **openserv-mcp** | MCP integration | 3 |
| **workshops** | Workshop materials (Python) | 12 |

All under https://github.com/openserv-labs

---

## $SERV Token
- ERC-20 on Ethereum, with Base chain activity
- Max supply: 1 billion, Circulating: 750 million
- Used for: agent creation fees, platform access, governance, burn mechanics

---

## Key URLs
- Website: https://www.openserv.ai
- Docs: https://docs.openserv.ai
- Platform: https://platform.openserv.ai
- TypeScript SDK: https://github.com/openserv-labs/sdk
- Python SDK: https://github.com/openserv-labs/python-sdk
- Agent Starter: https://github.com/openserv-labs/agent-starter
- Agent Tutorial: https://github.com/openserv-labs/agent-tutorial
- Agent Examples: https://github.com/openserv-labs/agent-examples
- Skills: https://github.com/openserv-labs/skills
- MCP Proxy: https://github.com/openserv-labs/mcp-proxy
- BRAID Paper: https://arxiv.org/html/2512.15959v1
- BRAID DSPy: https://github.com/ziyacivan/braid-dspy
- BRAID Blog: https://www.openserv.ai/blog/braid-is-the-missing-piece-in-ai-reasoning
- Multi-Agent Blog: https://www.openserv.ai/blog/technical-insights-multi-agent-systems-and-autonomous-ai
- Build (No-Code): https://docs.openserv.ai/docs/build/no-code
- Build (SDK): https://docs.openserv.ai/docs/build/vibecode
- Launch Docs: https://docs.openserv.ai/docs/launch
- Run (AI Cofounder): https://docs.openserv.ai/docs/run
- API Key Guide: https://docs.openserv.ai/how/create-an-agent-api-key
- GitHub Org: https://github.com/openserv-labs
