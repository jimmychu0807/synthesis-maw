# The Synthesis Hackathon — Project Proposal

## "Veil" — Intent-Compiled Private DeFi Agent

**Date:** March 13, 2026 (Day 1)
**Deadline:** March 22, 2026 (11:59pm PST)
**Decision:** Build Proposal A (Veil). Bankr is OUT. Single-agent architecture.

---

## The Product in One Sentence

An agent that compiles your portfolio rules into on-chain constraints it can't violate, privately reasons about when to rebalance, and executes trades on Uniswap — with every decision auditable but no strategy ever leaked.

---

## How It Works (The Full Flow)

```
STEP 1: USER GIVES INTENT (in English)
   "Keep my portfolio 60/40 ETH/USDC, max $200/day, only Uniswap, for 7 days"

STEP 2: AGENT COMPILES INTENT → ERC-7715 PERMISSION REQUEST (MetaMask)
   → erc20PeriodTransfer: max $200/day (period-based)
   → allowedTargets: [UNISWAP_ROUTER]
   → timestamp: 7-day window
   → limitedCalls: max 10 trades
   → redeemer: locked to agent's session account
   Human approves ONCE via MetaMask Flask (or Playwright). Agent redeems via ERC-7710.

STEP 3: AGENT MONITORS PORTFOLIO (Venice web search + The Graph)
   → Current prices via Venice web search (scrapes CoinGecko/other sources, with citations)
   → Pool data from Uniswap V3 Base subgraph via The Graph (GraphQL, codegen'd types)
   → Paid DeFi data from x402scan MCP (~$0.01/call)
   → "Portfolio is 72% ETH / 28% USDC. Drift: 12% from target."

STEP 4: AGENT PRIVATELY DECIDES (Venice — no data retention)
   → Venice GLM 4.7 with tool calling: calls get_portfolio_balance, get_token_price
   → Venice web search for real-time market context (with citations)
   → Private reasoning: "Volatility is 4.2%, gas is $0.50, within daily budget. Rebalance."
   → Structured JSON output: exact swap parameters
   → NO THIRD PARTY EVER SEES THIS ANALYSIS

STEP 5: AGENT EXECUTES ON UNISWAP (real TxIDs)
   → Permit2 for gasless approvals
   → swap-planner for intelligent routing
   → Real transaction on Base mainnet ($5-10 real money) or Ethereum Sepolia (free)
   → Delegation caveats enforce: can't exceed $200, can't call non-Uniswap contracts

STEP 6: AGENT LOGS EVERYTHING (ERC-8004 + Protocol Labs format)
   → giveFeedback() on Reputation Registry with trade outcome
   → agent_log.json auto-generated via Claude Code hooks
   → agent.json manifest (PAM spec, all 4 profiles)
   → All transactions viewable on basescan.org
```

---

## Sponsors IN (with product role)

| Sponsor | Prize | Role in Product | Confidence |
|---------|-------|----------------|------------|
| **Venice** | $11.5K | The brain — private reasoning, multi-model, web search, tool calling | ★★★★★ Core |
| **Protocol Labs** | $16K (2 bounties) | The paperwork — agent.json, agent_log.json, ERC-8004 | ★★★★★ Core |
| **MetaMask** | $5K | The cage — ERC-7715 grant + ERC-7710 redeem, intent-to-delegation compiler | ★★★★★ Core |
| **Uniswap** | $5K | The hands — trade execution with real TxIDs | ★★★★ Core |
| **AgentCash/Merit** | $1.75K | Data consumption — x402 paid DeFi data services | ★★★ Supporting |

### Sponsors OUT

| Sponsor | Why OUT |
|---------|--------|
| **Bankr** ($5K) | No free credits ($25 min). Token launching doesn't fit product. Multi-model routing done within Venice instead. |
| **Self Protocol** ($1K) | Passport NFC adds human dependency. Small prize. |
| **Celo** ($5K) | Different product entirely. |
| **OpenServ** ($4.5K) | Build Story only ($500, Day 9). Product integration only if ahead of schedule. |
| **Locus** ($3K) | Not integrated in Proposal A. |

---

## Venice Integration (Deep — Not Just Base URL Swap)

### Three-Model Strategy Within Venice

| Model | Use Case | Why This Model | Cost |
|-------|----------|---------------|------|
| **`zai-org-glm-4.7`** (128K ctx) | Complex decisions — "should I rebalance?" | Flagship reasoning + function calling | ~$0.30/$1.00 per 1M |
| **`mistral-31-24b`** (131K ctx) | Tool calling, structured output, vision | Cheapest with function calling + vision | ~$0.15/$0.50 per 1M |
| **`qwen3-4b`** (40K ctx) | Quick lookups — balance checks, formatting | Fastest, cheapest | Cheapest tier |

### Venice-Only Features We Use (not available on OpenAI)

| Feature | How We Use It | Why It Matters to Judges |
|---------|--------------|-------------------------|
| `venice_parameters` in every request | `include_venice_system_prompt: false`, reasoning control | Shows we know the API, not just base_url swap |
| **Web search + citations** | Agent researches market conditions before trading, cites sources | Venice-exclusive. $10/1K calls. Creates verifiable decision trail. |
| **Tool calling** (OpenAI-compatible) | Agent decides which tools to call: `get_portfolio_balance`, `get_token_price`, `execute_swap` | Venice GLM 4.7 + Mistral 3.1 both support function calling |
| **Reasoning control** | `reasoning_effort: "high"` for swap decisions, `"low"` for balance checks | Shows compute-awareness + cost optimization |
| **Structured JSON output** | `response_format: { type: "json_schema" }` for swap parameters | Guarantees valid output, no hallucinated numbers |
| **Billing API** | `x-venice-balance-usd` response header tracked after every call | Agent manages own compute budget (Protocol Labs requirement too) |
| **Web scraping** | Scrapes protocol docs/governance forums before decisions | Venice-exclusive Firecrawl integration |
| **Prompt caching** | Cache DeFi system prompt to reduce cost | Venice-specific optimization |

### Venice Tool Calling Architecture

```typescript
const tools = [
  { type: "function", function: {
    name: "get_portfolio_balance",
    description: "Get current token balances and USD values for a wallet",
    parameters: { type: "object", properties: { wallet_address: { type: "string" } } }
  }},
  { type: "function", function: {
    name: "get_token_price",
    description: "Get current price and 24h change for a token",
    parameters: { type: "object", properties: { token_id: { type: "string" } } }
  }},
  { type: "function", function: {
    name: "get_pool_data",
    description: "Get Uniswap pool liquidity, volume, and fee tier via The Graph",
    parameters: { type: "object", properties: { token0: { type: "string" }, token1: { type: "string" } } }
  }},
  { type: "function", function: {
    name: "execute_swap",
    description: "Execute a token swap on Uniswap within delegation constraints",
    parameters: { type: "object", properties: {
      sell_token: { type: "string" }, buy_token: { type: "string" },
      sell_amount: { type: "string" }, max_slippage: { type: "string" }
    } }
  }}
];

// Venice decides WHICH tools to call. Our code executes them.
// Loop: Venice decides → we execute tool → send result back → Venice reasons → next action
```

### VVV/DIEM Awareness (Judge Signal)

Prizes paid in VVV. Venice wants winners who value the ecosystem.
- VVV staking = pro-rata API capacity perpetually
- DIEM = $1/day perpetual API credit, ERC-20 on Base (`0xf4d97f2da56e8c3098f3a8d538db630a2606a024`)
- Code comment: `// In production, stake VVV for zero marginal cost inference`

---

## MetaMask Delegation (ERC-7715 Grant + ERC-7710 Redeem)

### How ERC-7715 and ERC-7710 Work Together

| Standard | What It Does | Where It Runs | When |
|----------|-------------|---------------|------|
| **ERC-7715** | User **grants** permissions via MetaMask popup | Browser (MetaMask Flask) | **Once** — human approves |
| **ERC-7710** | Agent **redeems** permissions to execute trades | Server-side (Node.js) | **Every trade** — fully autonomous |

The human opens a grant page once, approves the permissions, and the agent operates autonomously forever after. The grant is the human-in-the-loop safety moment. The redemption is autonomous.

### The Grant Flow (ERC-7715 — browser, one-time)

Agent compiles user's English intent into an ERC-7715 permission request:

```typescript
// Runs in browser via Playwright or human manually
import { erc7715ProviderActions } from "@metamask/smart-accounts-kit/actions";

const walletClient = createWalletClient({
  transport: custom(window.ethereum), // MetaMask Flask
}).extend(erc7715ProviderActions());

const grantedPermissions = await walletClient.requestExecutionPermissions([{
  chainId: sepolia.id,
  expiry: now + 7 * 86400, // 7-day window
  signer: {
    type: "account",
    data: { address: agentSessionAccount.address },
  },
  permission: {
    type: "erc20-token-periodic",
    data: {
      tokenAddress: USDC,
      periodAmount: parseUnits("200", 6), // $200/day
      periodDuration: 86400,
      justification: "Portfolio rebalancing: 60/40 ETH/USDC, max $200/day",
    },
  },
  isAdjustmentAllowed: true, // User can modify in MetaMask UI
}]);

// Save these — agent needs them for every future trade
const permissionsContext = grantedPermissions[0].context;
const delegationManager = grantedPermissions[0].signerMeta.delegationManager;
```

### The Redeem Flow (ERC-7710 — server-side, every trade)

```typescript
// Runs on server, no browser, fully autonomous
import { erc7710WalletActions } from "@metamask/smart-accounts-kit/actions";

const agentClient = createWalletClient({
  account: agentSessionAccount,
  transport: http(), // Plain RPC, no MetaMask
  chain: sepolia,
}).extend(erc7710WalletActions());

const txHash = await agentClient.sendTransactionWithDelegation({
  to: USDC_ADDRESS,
  data: swapCalldata,
  permissionsContext, // From the grant step
  delegationManager,
});
```

### Grant Page Options

| Option | Effort | Reliability |
|--------|--------|------------|
| **Playwright automation** | 2-3h | Good — we have Playwright MCP installed |
| **Tiny React page** | 1-2h | Best — human opens in Chrome w/ Flask, clicks approve |
| **Both** | 3-4h | Belt + suspenders — Playwright for demo, manual for backup |

### Adversarial Intent Handling (Novel)

When intent is ambiguous or dangerous:
```
User: "Keep 60/40 ETH/USDC, max $500/day"
Agent: "Two concerns:
  1. $500/day on a $2,000 portfolio = 25% daily liquidation risk.
     Safer alternative: $200/day (10%). Want me to adjust?
  2. No time window specified — delegation is permanent until revoked.
     Recommended: 30-day expiry."
```

Inspired by South et al. (arXiv:2501.09674). No on-chain implementation exists.

### Delegation Audit Report (Novel)

Before executing, agent generates:
- What the delegation ALLOWS (plain English)
- What the delegation PREVENTS (boundary conditions)
- Worst-case scenario under current caveats
- Comparison to user's stated intent

Addresses the exact gap the [Consensys Diligence audit](https://diligence.consensys.io/audits/2024/06/metamask-delegator/) flagged.

### Richer Caveat Usage (30 types available, we use 8+)

| Caveat | Purpose | Why Better |
|--------|---------|-----------|
| `erc20PeriodTransfer` | Rate-limited spending per time period | Exactly "$200/day" — period-based, not flat cap |
| `allowedTargets` | Only Uniswap router | Core safety |
| `allowedMethods` | Only swap functions | Core safety |
| `timestamp` | 7-day expiry window | Time-bounded policy |
| `limitedCalls` | Max 10 trades | Prevents runaway trading |
| `redeemer` | Lock to agent's session account only | Prevents delegation theft |
| `nativeBalanceChange` | Cap ETH exposure per tx | Additional safety layer |
| `nonce` | Prevent delegation replay | Security hardening |

Optional stretch goal: **Custom caveat enforcer** (Solidity) — e.g., `PortfolioDriftEnforcer` that only allows swaps when portfolio drift exceeds a threshold. No hackathon project has done this.

### MetaMask Prize Target (REVISED — targeting 1st)

- **1st place ($3K):** Intent-to-delegation compiler + ERC-7715 grant + rich caveat usage + adversarial handling + audit reports. Past winner (Revoke.delegate) won with ERC-7710 automation — our approach is more sophisticated.
- **2nd place ($1.5K):** Floor if custom enforcer doesn't ship.
- **EV: $1,500-$2,250** (up from $500-$1,000)

---

## Uniswap Integration

### Testnet Reality

**Base Sepolia is NOT supported** by Uniswap Trading API. Only Ethereum Sepolia and Unichain Sepolia.

**Options:**
| Option | Chain | Cost | Judge Impression |
|--------|-------|------|-----------------|
| **Base mainnet** (recommended) | Base | $5-10 real money | Strongest — real TxIDs on the hackathon's primary chain |
| Ethereum Sepolia | Sepolia | Free | Acceptable — "Real TxIDs on testnet" meets criteria |
| Direct contract calls on Base Sepolia | Base Sepolia | Free | Weakest — bypasses Trading API |

### Upgrades Beyond Basic Swap

| Upgrade | Hours | Why |
|---------|-------|-----|
| **Permit2 approvals** | 2-3h | Explicitly listed in prize criteria. Gasless EIP-712 signatures after one-time approval. |
| **swap-planner plugin** | 2-3h | 7-step intelligence: token discovery, risk assessment, contract verification, price fetching. Agent *thinks* before trading. |
| **Uniswap AI Skills** | 1h | Install via `npx skills add uniswap/uniswap-ai`. Shows use of official agent SDK. |

### NOT doing (unless ahead of schedule)
- V4 Hooks deployment (requires Solidity, 4-8h, risky)
- LP position management (4-6h)
- TWAMM for large trades (3-5h)

---

## Data Layer (Internal Tools — NOT sponsors)

These strengthen Protocol Labs + AgentCash submissions but are not sponsor prizes themselves.

| Tool | What It Does | Cost | How |
|------|-------------|------|-----|
| **Venice web search** | Real-time prices, market data, news — Venice scrapes CoinGecko/other sources via LLM call | Included in Venice API cost | `enable_web_search: 'on'` + `enable_web_citations: true` |
| **The Graph** | Uniswap V3 Base subgraph — pool liquidity, volume, fees via GraphQL | FREE/cheap | Direct GraphQL queries with codegen (see `reference/graphql-codegen-pattern.ts`) |
| **x402scan MCP** (AgentCash) | Paid DeFi data via micropayments | ~$1 total for demo | `npx -y x402scan-mcp@latest` |

No third-party MCP servers for price data — Venice web search handles it natively (and it's a Venice feature judges want to see). Human teammate has GraphQL skills for The Graph integration. Codegen pattern from `private-streams` project available in `reference/`.

---

## Protocol Labs — Full Requirements Checklist

### Bounty 1: "Let the Agent Cook" ($8K)

| Requirement | What We Build | Differentiator |
|-------------|--------------|----------------|
| **Autonomous execution + self-correction** | Rebalancing loop: check → decide → execute → verify → adjust. Retries with adjusted params on failure. | Most agents "run once." Ours runs continuously. |
| **ERC-8004 identity** | Already done via hackathon registration. | Table stakes. |
| **agent.json manifest** | Full PAM spec, all 4 profiles (core, exec, gov, graph). | Most teams write minimal manifests. |
| **agent_log.json** | Claude Code hooks auto-generate every tool call. Plus Venice reasoning chains. | **Novel — nobody else has this.** |
| **Real tool use** | 6 tools: Venice, CoinGecko, The Graph, x402scan, Uniswap, ERC-8004. | Most agents have 2-3 tools. |
| **Safety guardrails** | Delegation caveats as ON-CHAIN guardrails. Adversarial intent handling. Delegation audit reports. | **Unique — most agents use prompt-based "be careful."** |
| **Compute budget awareness** | Track Venice costs via `x-venice-balance-usd` header. Switch to cheaper model when low. Stop when budget exhausted. | Simple but shows resource management. |

### Bounty 2: "Agents With Receipts" ($8K)

All covered by same work: ERC-8004 identity + reputation + on-chain txns + agent.json + agent_log.json.

### ERC-8004 Details

- Identity Registry: `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432` (Base Mainnet) — DONE
- Reputation Registry: `0x8004BAa17C55a88189AE136b182e5fdA19dE9b63` (Base Mainnet)
- `giveFeedback()` after each trade — need to rate a DIFFERENT agent (can't self-rate)
- Strategy: consume an x402 service from another agent, then rate that agent. Dual-purpose.

---

## The Competitive Landscape

### Direct Competitors (from 408 registered participants)

| Agent | Description | Threat Level |
|-------|------------|--------------|
| **Aegis** | "Privacy-preserving DeFi agent with MetaMask delegation" | **CRITICAL** — almost identical |
| **AgentVault** | "MetaMask EIP-7710 + Venice private inference" | **HIGH** — same combo |
| **CoinFello** | Synchronous command interpreter, NOT policy compiler. Closed-source. | **MEDIUM** — different architecture |

### Our Differentiator from ALL competitors

| | CoinFello / Others | Veil (Ours) |
|--|-------------------|-------------|
| **Input** | "Swap 100 USDC for ETH" | "Keep 60/40 ETH/USDC, max $200/day, 7 days" |
| **Output** | Single transaction | Persistent caveat structure (5+ constraints) |
| **Duration** | Instant execution | Standing policy (time-bounded) |
| **Safety** | Trust the agent | Enforce boundaries mathematically |

**Pitch:** "We didn't build a chatbot that trades. We built a policy compiler that enforces."

---

## Pitch Language

| Phrase | Use When |
|--------|----------|
| "Your agent has a security clearance, not a blank check" | MetaMask/delegation pitch |
| "Private reasoning, public receipts" | Venice pitch, tagline |
| "Intent in, enforcement out" | Technical demo moment |
| "The agent that can't exceed its boundaries" | Protocol Labs/safety pitch |
| "Front-runners can't exploit reasoning they never see" | Venice/privacy pitch |

---

## Target Tracks & Realistic Expected Value

| Track | Prize | Honest Win Prob | Realistic EV |
|-------|-------|----------------|-------------|
| **Venice** | $11.5K | 20-35% | $2,300-$4,025 |
| **Protocol Labs (either bounty)** | $16K | 15-25% | $2,400-$4,000 |
| **MetaMask** | $5K | 25-40% | $1,250-$2,000 |
| **Uniswap** | $5K | 10-15% | $500-$750 |
| **AgentCash/Merit** | $1.75K | 15-25% | $262-$437 |
| **Open Track** | $14K | 3-8% | $420-$1,120 |
| **Add-ons (D)** | ~$1.3K | Various | $320-$545 |
| **TOTAL** | | | **$7,452-$12,877** |

---

## Build Plan (9 Days)

| Day | What | Output | Risk |
|-----|------|--------|------|
| 1 | Venice integration: multi-model setup, tool calling, web search, system prompts | Working Venice inference with 3 models + function calling | Low — OpenAI-compatible |
| 2 | MetaMask: ERC-7715 grant page (Playwright + React), session account, caveat builder, NL→permission compiler | Working grant + redeem flow on Sepolia | Medium — Flask required, but Playwright available |
| 3 | Data layer: Venice web search + The Graph (GraphQL w/ codegen) + x402scan setup | Real market data feeding Venice decisions | Low — Venice built-in, human has GraphQL skills |
| 4 | Uniswap: Trading API + Permit2 + swap-planner, real TxIDs | Working swap with real transactions | Low — well-documented API |
| 5 | Wire together: Venice decides → caveats validate → Uniswap executes → verify outcome | End-to-end rebalancing loop | Medium — integration complexity |
| 6 | ERC-8004: reputation logging, agent.json manifest, agent_log.json via Claude Code hooks | On-chain audit trail + Protocol Labs format | Low — known contracts |
| 7 | Safety: adversarial intent handling, delegation audit reports, compute budget tracking | Complete safety story | Low |
| 8 | Testing, self-correction loop (retry on failure), edge cases, demo recording | Reliable demo | Low |
| 9 | Add-ons: Status Network ($50), OpenServ Build Story ($250), Markee ($240), ENS ($200). Polish. | Submission ready | Low |

---

## 3-Minute Demo Flow

1. **0:00-0:30** — Show ERC-8004 identity on basescan. "This agent has an on-chain identity."
2. **0:30-1:00** — User types portfolio intent. Agent compiles to ERC-7715 permission request. MetaMask Flask popup shows human-readable terms. Show adversarial handling: "Your $500/day limit is risky — safer at $200. Adjust?" Show delegation audit report.
3. **1:00-1:30** — Agent detects drift (72/28). Venice call: web search for market data (show citations), private reasoning about timing. Split screen: private reasoning vs. public execution.
4. **1:30-2:00** — Uniswap swap executes. Real TxID on block explorer. Delegation caveats enforced — show a rejected attempt that exceeds limits.
5. **2:00-2:30** — ERC-8004 reputation entry. agent_log.json entry with full decision trail. Venice billing: remaining compute budget displayed.
6. **2:30-3:00** — "Every decision is auditable. No strategy ever leaked. The agent can't exceed its boundaries." Show agent monitoring its own Venice balance.

---

## Human Steps (One-Time, ~20 Minutes)

| Step | Time | Why Human Required |
|------|------|--------------------|
| Venice API key at venice.ai | 2 min | Browser signup |
| Uniswap API key at developers.uniswap.org | 5 min | Developer portal |
| Pimlico API key at pimlico.io (bundler) | 3 min | Browser signup |
| Fund wallet (Base mainnet or Sepolia) | 5 min | Faucet or small transfer |
| AgentCash credits at agentcash.dev | 3 min | Signup |
| Provide credentials in `.env` | 2 min | Copy-paste |
| **Total** | **~20 min** | Then hands-off |

---

## Risks

| Risk | Mitigation |
|------|-----------|
| **Aegis (competitor)** has nearly identical concept | Our constraint compiler + adversarial intent handling + auto-logging differentiates. Depth of execution matters more than concept. |
| **Uniswap Base Sepolia** not supported by Trading API | Use Base mainnet ($5-10) or Ethereum Sepolia (free). Both produce real TxIDs. |
| **MetaMask Flask** required for ERC-7715 grant | Playwright automation as primary path. Manual browser fallback. Grant only needed once — agent redeems server-side. |
| **Venice API costs money** | Budget ~$10-20. Native models (GLM 4.7, Qwen 3) are 30-40x cheaper than proxied Claude. |
| **giveFeedback() requires rating a DIFFERENT agent** | Consume an x402 service, then rate that agent's service quality. |
| **Vibe coding risks** | Keep architecture simple. One agent, two phases (analyze → execute). No multi-agent coordination unless ahead of schedule. |

---

## Low-Barrier Add-Ons (Day 9)

| Add-On | Prize | Effort | Win Prob | EV |
|--------|-------|--------|----------|----|
| **Status Network** | $50 | 30 min (deploy contract + gasless tx, Chain ID 1660990954) | 80%+ | $40 |
| **OpenServ Build Story** | $500 | 1-2 hrs (X thread documenting build) | 30-50% | $150-$250 |
| **Markee GitHub** | $800 | 30 min (add tracking to repo) | 20-40% | $160-$320 |
| **ENS Identity** | $600 | 1 hr (register ENS name for agent) | 10-20% | $60-$120 |

---

## All Sources

### Competitive Intelligence
- [CoinFello OpenClaw Skill (Mar 11, 2026)](https://www.theblock.co/press-releases/393179/coinfello-launches-openclaw-skill-for-ai-agent-transactions)
- [Gaia + MetaMask Delegation Starter](https://github.com/meowyx/metamask-gaia-starter)
- [South et al. — NL Permissions (arXiv:2501.09674)](https://arxiv.org/abs/2501.09674)
- [Consensys Diligence Audit — DeleGator](https://diligence.consensys.io/audits/2024/06/metamask-delegator/)
- [Synthesis Participants API](https://synthesis.devfolio.co/participants) — 408 agents

### Venice
- [Venice API Docs](https://docs.venice.ai)
- [Venice Pricing](https://docs.venice.ai/overview/pricing)
- [Venice AI Agents Guide](https://docs.venice.ai/overview/guides/ai-agents)
- [VVV Token](https://venice.ai/vvv)
- [DIEM Token](https://venice.ai/blog/introducing-diem-as-tokenized-intelligence-the-next-evolution-of-vvv)

### MetaMask
- [Delegation Toolkit Docs](https://docs.metamask.io/delegation-toolkit/)
- [Pimlico Integration Guide](https://docs.pimlico.io/guides/how-to/accounts/use-metamask-account)
- [ERC-7710 Spec](https://eips.ethereum.org/EIPS/eip-7710)
- [MetaMask Hacker Guide](https://metamask.io/news/hacker-guide-metamask-delegation-toolkit-erc-7715-actions)

### Uniswap
- [Uniswap Dev Platform](https://developers.uniswap.org)
- [Uniswap AI Skills](https://github.com/Uniswap/uniswap-ai)
- [Uniswap API Docs](https://api-docs.uniswap.org)
- [Uniswap V3 Base Subgraph](https://thegraph.com/explorer/subgraphs/FUbEPQw1oMghy39fwWBFY5fE6MXPXZQtjncQy2cXdrNS)

### Protocol Labs
- [ERC-8004 Contracts](https://github.com/erc-8004/erc-8004-contracts)
- [EIP-8004 Spec](https://eips.ethereum.org/EIPS/eip-8004)
- [JSON Agents PAM Spec](https://jsonagents.org)

### Data & Payments
- [CoinGecko MCP](https://docs.coingecko.com/docs/mcp-server)
- [Uniswap Pools MCP](https://github.com/kukapay/uniswap-pools-mcp)
- [AgentCash Portal](https://agentcash.dev)
- [x402 Testnet Guide](https://docs.x402.org)
- [Circle USDC Faucet](https://faucet.circle.com)

### Market & Trends
- [NEAR Confidential Intents — 17% price jump](https://www.coindesk.com/markets/2026/03/02/near-token-jumps-17-after-confidential-intents-launch-outpaces-privacy-tokens-sector/)
- [a16z 2026 Crypto Predictions — Privacy as Moat](https://a16zcrypto.com/posts/article/trends-ai-agents-automation-crypto/)
