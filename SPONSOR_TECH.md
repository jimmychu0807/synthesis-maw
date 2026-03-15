# Sponsor Tech Reference — The Synthesis Hackathon

## Table of Contents
1. [Venice (Private LLM Inference)](#venice)
2. [Bankr (LLM Gateway + Token Launching)](#bankr)
3. [MetaMask (Delegation Framework)](#metamask)
4. [Locus (Agent Payment Infrastructure)](#locus)
5. [Self Protocol (ZK Agent Identity)](#self-protocol)
6. [Merit Systems / AgentCash (x402 Pay-per-Request)](#agentcash)
7. [Uniswap (AI Skills + Trading API)](#uniswap)
8. [ERC-8004 (Agent Identity Standard)](#erc-8004)
9. [Protocol Labs (Autonomous Agents + ERC-8004)](#protocol-labs)
10. [Celo (L2 + Stablecoins)](#celo)
11. [Olas (Agent Framework)](#olas)
12. [Arkhai / Alkahest (Escrow)](#arkhai)
13. [Slice (ERC-8128 Auth + Commerce)](#slice)
14. [bond.credit (GMX Trading)](#bondcredit)
15. [OpenServ (Multi-Agent Orchestration)](#openserv)
16. [Octant (Public Goods Evaluation)](#octant)
17. [SuperRare (NFT Art + Rare Protocol)](#superrare)
18. [Status Network (Gasless Transactions)](#status-network)
19. [ENS (Identity + Communication)](#ens)
20. [Markee (GitHub Integration + Monetization)](#markee)
21. [ampersend (x402 Payment SDK)](#ampersend)

---

## Venice
**Prize: $11,474 (VVV tokens) — "Private Agents, Trusted Actions"**

### What It Is
Privacy-focused, OpenAI-compatible LLM inference API with **no data retention** and permissionless access. Supports text (with vision, tool use, streaming), image generation/upscaling, audio synthesis (50+ voices).

### API Details
- **Base URL:** `https://api.venice.ai/api/v1`
- **Auth:** `Authorization: Bearer $VENICE_API_KEY`
- **OpenAI-compatible** — use any existing OpenAI client (Python, TS, etc.) by changing base URL
- **Endpoints:** `/chat/completions`, image generation, audio/TTS, AI characters
- **Key models:**
  - GLM 4.7 (128k context, reasoning/agents)
  - Venice Uncensored 1.1 (32k, unfiltered)
  - Mistral 3.1 24B (131k, vision+tools)
  - Qwen 3 4B (40k, cost-efficient)
- **Extended features via `venice_parameters`:** web search with citations, web scraping, reasoning mode, vision, tool calling

### Integration
Change `base_url` in existing OpenAI SDK code. No additional dependencies.

### Free Tier
Pro subscription gives $10 free credits. Pay-as-you-go available.

### Prize Details
Prizes in VVV (Venice ecosystem token). VVV can be staked to mint DIEM. DIEM = $1/day of Venice compute, perpetually, tradeable as ERC20 on Base.
- 1st: 1,000 VVV (~$5,750)
- 2nd: 600 VVV (~$3,450)
- 3rd: 400 VVV (~$2,300)

### What They Want
Agents that reason over sensitive data privately, producing trustworthy outputs for public on-chain systems. Examples: private treasury copilots, confidential governance analysts, deal negotiation agents, on-chain risk desks, confidential due diligence agents, private multi-agent coordination.

### Docs
- API: https://api.venice.ai/api/v1
- Docs: https://docs.venice.ai

---

## Bankr
**Prize: $5,000 — "Best Bankr LLM Gateway Use"**

### What It Is
Two products: (a) LLM Gateway — unified multi-provider LLM API with auto-failover, and (b) Token Launching — agents deploy tokens and earn trading fees.

### LLM Gateway API
- **Base URL:** `https://llm.bankr.bot`
- **Endpoints:**
  - `/v1/chat/completions` (OpenAI-compatible)
  - `/v1/messages` (Anthropic-compatible)
- **Auth:** `X-API-Key: bk_YOUR_API_KEY` (generate at bankr.bot/api)
- **Models:** Claude (Opus, Sonnet, Haiku), Gemini (Pro, Flash), GPT-5.2/Codex/Mini/Nano, Kimi K2.5, Qwen3 Coder
- **Works with existing OpenAI and Anthropic SDKs** without code changes
- **CLI:** `bankr llm setup`, `bankr llm credits add 25`, `bankr llm credits auto --enable`

### Token Launching
- Deploy tokens via natural language (Terminal, CLI, or Twitter @bankrbot)
- Fixed 100B supply, non-mintable
- Auto-creates Uniswap V4 liquidity pool with 1.2% swap fee
- Fee split: 57% creator, 36.1% Bankr, 1.9% ecosystem, 5% Doppler protocol
- 50 tokens/day standard, 100/day for Bankr Club

### Chain: Base (primary)

### Integration
`npm install @bankr/cli`. Fund account with USDC, ETH, BNKR, or other ERC-20s on Base.

### Free Tier
No free tier — must top up before first request.

### Prize Details
- 1st: $3,000 — best autonomous system, real on-chain execution, genuine multi-model usage, self-sustaining economics
- 2nd: $1,500 — strong autonomous system, real on-chain outcomes
- 3rd: $500 — solid use with working on-chain outcomes

### What They Want
Autonomous systems that fund their own inference from on-chain activity (trading fees, token launch fees, protocol fees). Ideas: trading & markets, commerce & payments, marketplaces, token ecosystems, lending, research, copilots.

### Docs
- LLM Gateway: https://docs.bankr.bot/llm-gateway/overview
- Token Launching: https://docs.bankr.bot/token-launching/overview
- Skill: https://docs.bankr.bot/openclaw/installation

---

## MetaMask
**Prize: $5,000 — "Best Use of Delegations"**

### What It Is
Enables dapps to request granular, scoped permissions from users via ERC-7715. Allows actions (transfers, subscriptions, automated payments, AI agent trading) without repeated user signatures.

### Tech Stack
- **CLI:** `npx create-gator-app@latest` (scaffolds full project)
- **SDKs:** React, Vue, JavaScript, Node, Unity, Android, iOS, React Native, Flutter, Unreal
- **Standards:** ERC-7715 (permission requests), ERC-7710 (permission redemption), ERC-4337 (account abstraction), EIP-7702 (EOA code delegation)
- **Viem integration:** `erc7715ProviderActions` and `erc7710WalletActions()`
- **Templates:** Smart Accounts Starter, Delegation Starter, Farcaster Mini App, ERC-7715 Permissions starter

### Supported Chains
- **Mainnets:** Ethereum, Optimism, Base, BNB, Gnosis, Metis, Arbitrum One/Nova, Avalanche, Linea, Polygon
- **Testnets:** Sepolia, Base Sepolia, Linea Sepolia, Arbitrum Sepolia, etc.
- **ERC-7715 specifically:** Currently Sepolia only (requires MetaMask Flask)

### Integration
Node.js, MetaMask Flask extension (separate profile), ERC-4337 bundler (Pimlico recommended), optional paymaster for gas sponsorship.

### Free Tier
Sepolia testnet. All framework contracts are open source.

### Prize Details
- 1st: $3,000 — intent-based delegations, novel ERC-7715 extensions, ZK + delegation auth
- 2nd: $1,500 — creative caveat usage, agent coordination via sub-delegation chains
- 3rd: $500 — solid delegation usage with clear use case

### What They Want
Novel, creative use of delegations. Top-tier: intent-based delegations as core pattern, sub-delegations, ZK + delegation auth. Standard patterns without innovation will NOT place.

### Docs
- GitHub: github.com/metamask/delegation-framework, github.com/MetaMask/smart-accounts-kit
- CLI: `npx create-gator-app@latest`

---

## Locus
**Prize: $2,993 — "Best Use of Locus"**

### What It Is
Payment infrastructure for autonomous AI agents. Unified USDC balance for wallets, API access, service deployments, checkout. Smart wallets with spending limits, escrow, policy enforcement, audit trails. YC-backed.

### API Details
- **MCP Gateway:** `https://mcp.paywithlocus.com/mcp` (Bearer auth with API key)
- **API keys:** Prefix `locus_`, generated at `app.paywithlocus.com`
- **MCP tools:** send USDC payments, check balances, list tokens, approve spending, scan emails for payment requests, initiate payments
- **Additional:** Non-custodial smart wallets on Base with sponsored gas, email payouts, Visa prepaid card ordering, Venmo/PayPal via Laso Finance, containerized service deployment to AWS

### Chain: Base (USDC only)

### Integration
Create account at app.paywithlocus.com → deploy wallet → create agent with permissions → generate API key → connect via MCP.
CLI: `mcporter install check`, `mcporter config add`, `mcporter list`

### Free Tier
$10 USDC to experiment with upon joining beta.

### Prize Details
- 1st: $2,000 — agent-native payments core to product, deeply woven autonomous flows
- 2nd: $500 — strong use with meaningful agent autonomy
- 3rd: $500 — working integration with promising approach

### What They Want
Locus deeply integrated into agent's autonomous payment flows. Spending controls and auditability. Auto-DQ if no working Locus integration.

### Docs
- Dashboard: https://app.paywithlocus.com
- Docs: https://docs.paywithlocus.com

---

## Self Protocol
**Prize: $998 — "Best Self Agent ID Integration"**

### What It Is
Privacy-first ZK identity. Users scan NFC chip in government IDs (passports from 129 countries, EU IDs, Aadhaar) to generate zero-knowledge proofs. Proves attributes (humanity, age, OFAC compliance, nationality) without revealing personal data. 7M+ users.

### SDK Details
- **TypeScript:** `@selfxyz/agent-sdk` (npm)
- **Python:** `selfxyz-agent-sdk` (pip)
- **Rust:** `self-agent-sdk` (cargo)
- **MCP Server:** `@selfxyz/mcp-server`
- **Endpoints:** `/api/a2a`, `/.well-known/agent-card.json`, `/llms.txt`
- **ZK tech:** groth16/plonk provers, ICAO Doc 9303 standard, millisecond on-chain verification

### What Agents Can Prove
Human-backed, age (18+/21+), OFAC sanctions compliance, one-agent-per-human uniqueness, nationality (optional), name (optional).

### Chain: Celo Sepolia (testnet)
Contract: `0xaC3DF9ABf80d0F5c020C06B04Cced27763355944`

### Integration
Install SDK → add verification middleware → configure required proofs.

### Free Tier
Free. Testnet on Celo Sepolia.

### Prize Details
Winner-takes-all: $1,000 — must demonstrate meaningful, functional use where identity layer is load-bearing, not decorative.

### What They Want
Soulbound NFT generation, A2A identity verification, Sybil-resistant workflows, novel credential verification.

### Docs
- App: https://app.ai.self.xyz

---

## AgentCash (Merit Systems)
**Prize: $1,746 — "Build with AgentCash"**

### What It Is
x402 protocol implementation — enables AI agents to pay for APIs at request time using HTTP 402 Payment Required. MCP server handles automatic payment signing for any x402-protected endpoint. 286+ endpoints, 306K+ API calls.

### API Details
- **MCP Server:** `npx -y x402scan-mcp@latest`
- **Claude Code:** `claude mcp add x402scan --scope user -- npx -y x402scan-mcp@latest`
- **4 tools:**
  1. `check_balance` — wallet address + USDC balance
  2. `query_endpoint` — probe pricing/schema without paying
  3. `validate_payment` — pre-flight check
  4. `execute_call` — make paid API call with auto-payment
- **Wallet:** Auto-generated at `~/.x402scan-mcp/wallet.json` on first run
- **Vercel package:** `npm install x402-mcp`

### Chains: Base (primary), Base Sepolia, Ethereum, Optimism, Arbitrum, Polygon

### Integration
Install MCP server → deposit USDC on Base to auto-generated wallet → use tools from any MCP-compatible client.

### Free Tier
$100 in initial credits ($25 onboarding bonus minimum) via AgentCash.dev.

### Prize Details
- 1st: $1,000 — x402 payment layer is load-bearing
- 2nd: $500 — strong execution, clear pay-per-request model
- 3rd: $250 — solid working integration

### What They Want
Projects where x402 pay-per-request is core to agent functionality, not decorative. Produce new x402 APIs or consume existing ones.

### Docs
- Portal: https://agentcash.dev
- x402 protocol partners: Coinbase, Cloudflare, Vercel, Visa, Stripe

---

## Uniswap
**Prize: $5,000 — "Agentic Finance (Best Uniswap API Integration)"**

### What It Is
Open-source AI tooling for building on Uniswap. Skills, plugins, and agents for any coding agent. Quote trades, execute swaps, manage liquidity, deploy V4 hooks.

### API Details
- **Trading API URL:** `https://trade-api.gateway.uniswap.org/v1/`
- **Endpoints:** `check_approval`, `quote`, `swap`, `order`
- **Rate limits:** Unauth = 60 req/hr, Auth (API key) = 5,000 req/hr
- **API key:** Get at developers.uniswap.org
- **AI Skills:** `npx skills add uniswap/uniswap-ai`
- **7 plugins:**
  1. v4-security-foundations — hook security patterns
  2. Configurator — pool/parameter setup
  3. Deployer — contract/pool launches
  4. uniswap-viem — EVM connectivity
  5. uniswap-trading — swap execution
  6. uniswap-driver — LP position management
  7. Swap-planner — execution optimization (TWAP, order splitting)
- **Plus:** `uniswap-cca` for CCA auctions
- **Routing types:** CLASSIC, DUTCH_V2, PRIORITY, WRAP/UNWRAP

### Chains
Ethereum, Arbitrum, Base, Unichain, + 16 more. UniswapX V2 on Ethereum, Arbitrum, Base, Unichain.

### Integration
`npx skills add uniswap/uniswap-ai`. Python and TypeScript.

### Free Tier
Open source (MIT). No fees for tooling. Gas fees for on-chain txns.

### Prize Details
- 1st: $2,500 — best agentic finance integration, real Dev Platform API key, real TxIDs
- 2nd: $1,500 — functional, open source, solid API use
- 3rd: $1,000 — solid usage with real execution

### What They Want
Real Uniswap API key from Developer Platform. Real TxIDs on testnet or mainnet. No mocks. Deeper stack usage (Hooks, AI Skills, Unichain, v4, Permit2) = better. Open source with README.

### Docs
- Dev Platform: https://developers.uniswap.org
- AI Skills: https://github.com/Uniswap/uniswap-ai
- API Docs: https://api-docs.uniswap.org
- Protocol: https://docs.uniswap.org
- Unichain: https://docs.unichain.org

---

## ERC-8004 (Agent Identity Standard)
**Used by: Protocol Labs bounties, bond.credit, hackathon registration**

### What It Is
Ethereum EIP for discovering, registering, and establishing trust with autonomous agents. Defines three on-chain registries for agent economies without pre-existing relationships.

### Three Registries

**A. Identity Registry (ERC-721 NFT-based)**
- Each agent gets unique `agentId` (tokenId) as NFT
- Global identifier: `{namespace}:{chainId}:{identityRegistry}`
- Metadata JSON: name, description, services array (A2A, MCP, ENS, DIDs, email, web), x402 support, active flag, trust mechanisms
- Methods: `register()`, `setAgentURI()`, `getMetadata()`, `setAgentWallet()`, `getAgentWallet()`
- Domain verification: `/.well-known/agent-registration.json`

**B. Reputation Registry**
- Standardized feedback signals for quality
- Structure: `value` (int128), `valueDecimals`, tags, endpoint, feedbackURI, feedbackHash
- Methods: `giveFeedback()`, `revokeFeedback()`, `appendResponse()`, `getSummary()`
- Supports off-chain feedback files with proof-of-payment (x402)

**C. Validation Registry**
- Third-party validators verify agent work with crypto proofs
- Methods: `validationRequest()`, `validationResponse()`, `getValidationStatus()`
- Response values: uint8 0-100

### Trust Models
1. Reputation-based (client feedback)
2. Crypto-economic (stake-secured validator re-execution)
3. TEE-attestation (trusted execution environment oracles)

### Dependencies
EIP-155, EIP-712, EIP-721, EIP-1271

### Spec
https://eips.ethereum.org/EIPS/eip-8004

---

## Protocol Labs
**Prize: $15,968 — Two bounties**

### Bounty 1: "Let the Agent Cook" ($8,000)
Fully autonomous agents — discover, plan, execute, verify, submit.

**Required:**
1. Autonomous execution — full decision loop with self-correction
2. Agent identity — register ERC-8004 identity linked to operator wallet
3. Agent capability manifest — machine-readable `agent.json` (name, operator wallet, ERC-8004 identity, tools, tech stacks, compute constraints, task categories)
4. Structured execution logs — `agent_log.json` (decisions, tool calls, retries, failures, outputs)
5. Tool use — real tools/APIs (code gen, GitHub, blockchain, data APIs, deployment)
6. Safety guardrails — safeguards before irreversible actions
7. Compute budget awareness — operate within defined budget

**Bonus:** ERC-8004 trust signal integration, multi-agent swarms. Sponsored by Ethereum Foundation.
- 1st: $4,000 / 2nd: $2,500 / 3rd: $1,500

### Bounty 2: "Agents With Receipts — ERC-8004" ($8,004)
Build agents that verify identity, reputation, capabilities via ERC-8004.

**Required:**
1. ERC-8004 integration — real on-chain transactions with identity/reputation/validation registries
2. Autonomous architecture — planning, execution, verification loops
3. Agent identity + operator model
4. On-chain verifiability — transactions viewable on block explorer
5. DevSpot Agent Compatibility — must provide `agent.json` and `agent_log.json`

Sponsored by PL_Genesis.
- 1st: $4,000 / 2nd: $3,000 / 3rd: $1,004

---

## Celo
**Prize: $5,000 — "Best Agent on Celo"**

### What It Is
Ethereum L2 for fast, low-cost real-world payments. Stablecoin-native (cUSD, cEUR, cREAL). Mobile-accessible.

### Prize Details
- 1st: $3,000 / 2nd: $2,000

### What They Want
AI agents leveraging Celo's stablecoin infra, mobile accessibility, global payments. Economic agency, on-chain interaction, real-world applicability. All frameworks welcome.

### Docs
- https://docs.celo.org

---

## Olas
**Prize: $2,994 — Three bounties**

### Bounty 1: "Build an Agent for Pearl" ($1,000)
Agent integrated into Pearl following official guide. Must pass full QA checklist.
- 1st: $1,000

### Bounty 2: "Hire an Agent on Olas Marketplace" ($1,000)
Use mech-client to hire agents. Must complete 10+ requests on-chain.
- 1st: $500 / 2nd: $300 / 3rd: $200

### Bounty 3: "Monetize Your Agent on Olas Marketplace" ($1,000)
Use mech-server. Must serve 50+ requests on-chain.
- 1st: $500 / 2nd: $300 / 3rd: $200

### Docs
- Pearl integration: https://stack.olas.network/pearl/integration-guide/
- Build: https://build.olas.network

---

## Arkhai / Alkahest
**Prize: $898 — Two bounties**

### Bounty 1: Applications ($450)
Build on Alkahest, natural-language-agreements, git-commit-trading, de-redis-clients. Extend into new domains.

### Bounty 2: Escrow Ecosystem Extensions ($450)
New arbiter types (ZK, multi-party, reputation-weighted, AI-evaluated), obligation structures, trust models.

---

## Slice
**Prize: $2,195 — Three bounties**

### Bounty 1: ERC-8128 Auth ($750)
- 1st: $500 / 2nd: $250 (credits)

### Bounty 2: Commerce ($750)
Custom checkout on Slice stores.
- 1st: $500 / 2nd: $250 (credits)

### Bounty 3: Hooks ($700)
Pricing strategies and on-chain actions for Slice products on Base.
- 1st: $550 / 2nd: $150

---

## bond.credit
**Prize: $1,500 — "Agents that pay"**

Live autonomous trading on GMX perps on Arbitrum. No simulations. Winners get on-chain credit scores on ERC-8004 identity.
- 1st: $1,000 / 2nd: $500

---

## OpenServ
**Prize: $4,988 — Two bounties**

### What It Is
End-to-end agentic infrastructure — multi-agent orchestration platform with proprietary BRAID reasoning framework. "Second Brain" architecture: you build agent core skills, OpenServ's Project Manager agent handles orchestration, routing, formatting. Single POST endpoint architecture, async pattern (acknowledge immediately, process in background).

### SDKs
- **TypeScript:** `npm install @openserv-labs/sdk`
- **Python:** `pip install openserv-sdk`
- **REST API:** Single POST endpoint, action types include `respond-chat-message`

### Key Concepts
- **Capabilities:** Building blocks — name, description, schema (Zod/Pydantic), run function
- **MCP Server Support:** Connect agents to external MCP servers, auto-import tools as capabilities (HTTP, SSE, stdio transports)
- **BRAID Reasoning:** Bounded Reasoning for Autonomous Inference and Decisions — two-stage (Planning → GRD in Mermaid → Execution). GPT-4o accuracy 42% → 91% on GSM8K. Up to 74x cost efficiency. DSPy integration: `pip install braid-dspy`
- **Shadow Agents:** Each agent gets two supporting agents for decision-making and validation automatically
- **Token Launch:** Launch tokens on Base via bonding curves, auto-graduation to Aerodrome DEX
- **Framework Agnostic:** Works with LangChain, BabyAGI, Eliza, or any framework

### Integration
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

### Environment Variables
- `OPENSERV_API_KEY` (required) — from platform.openserv.ai
- `OPENAI_API_KEY` (optional)
- `PORT` (default 7378)

### Getting Started
1. Register at platform.openserv.ai
2. Create developer profile + register agent
3. Generate API key
4. Use tunneling for local dev (agent needs public URL)
5. Deploy to publicly accessible URL

### Prize Details
**Bounty 1: "Best OpenServ Build Story" ($500)** — Content challenge (X thread, blog post, build log)
- 1st: $250 / 2nd: $250

**Bounty 2: "Ship Something Real with OpenServ" ($4,500)** — Build a useful AI-powered product
- 1st: $2,500 / 2nd: $1,000 / 3rd: $1,000

### What They Want
Agentic economy products, x402-native services, agentic DeFi (trading copilots, strategy assistants, yield/vault helpers, liquidity management, DeFi monitoring, portfolio automation). Bonus: register workflow/agent on ERC-8004.

### Docs
- Platform: https://platform.openserv.ai
- Docs: https://docs.openserv.ai
- TypeScript SDK: https://github.com/openserv-labs/sdk
- Python SDK: https://github.com/openserv-labs/python-sdk
- Agent Tutorial: https://github.com/openserv-labs/agent-tutorial
- BRAID Paper: https://arxiv.org/html/2512.15959v1
- BRAID DSPy: https://github.com/ziyacivan/braid-dspy

---

## Octant
**Prize: $3,992 — Four bounties for Public Goods Evaluation**

### What It Is
Octant funds public goods projects. They want AI agents that can help evaluate, analyze, and curate public goods projects for funding decisions. Data sources: Open Source Observer, OpenGrants, Karma.

### Bounty 1: "Mechanism Design for Public Goods Evaluation" ($1,000)
Design novel mechanisms for how AI agents can evaluate public goods projects fairly. Sybil resistance, quadratic funding improvements, impact measurement frameworks.
- 1st: $1,000

### Bounty 2: "Agents for Public Goods Data Collection" ($1,000)
Agents that autonomously gather, structure, and maintain data about public goods projects from multiple sources.
- 1st: $1,000

### Bounty 3: "Agents for Public Goods Data Analysis" ($1,000)
Agents that analyze public goods data to surface insights — impact metrics, funding efficiency, project health signals.
- 1st: $1,000

### Bounty 4: "Agents for Public Goods Evaluation" ($1,000)
End-to-end evaluation agents that assess public goods projects for funding worthiness using collected and analyzed data.
- 1st: $1,000

### What They Want
Agents that meaningfully improve how public goods are discovered, evaluated, and funded. Must use real data sources (Open Source Observer, OpenGrants, Karma). Winner-takes-all per bounty.

### Docs
- Open Source Observer: https://www.opensource.observer
- OpenGrants: https://opengrants.com
- Karma: https://www.karmahq.xyz

---

## SuperRare
**Prize: $2,494 — "SuperRare Partner Track"**

### What It Is
AI agent that creates and sells digital art using Rare Protocol. Must deploy ERC-721 contracts, mint NFTs with IPFS-pinned metadata, and run auctions — all on-chain.

### Tech Stack
- **CLI:** `@rareprotocol/rare-cli` (npm)
- **Functions:** Deploy ERC-721, mint tokens (auto IPFS pinning), create/settle/cancel auctions
- **Networks:** Ethereum, Sepolia, Base, Base Sepolia

### Prize Details
- 1st: $1,200 / 2nd: $800 / 3rd: $500

### What They Want
Creative AI agents that autonomously generate art, deploy NFT contracts, mint with proper IPFS metadata, and manage auctions. Full on-chain art lifecycle.

### Docs
- Rare Protocol CLI: npm `@rareprotocol/rare-cli`
- Support: https://t.me/+3F5IzO_UmDBkMTM1

---

## Status Network
**Prize: $1,995 — "Go Gasless"**

### What It Is
$50 per qualifying team (up to 40 teams). Deploy a smart contract AND execute a gasless transaction (gas=0) on Status Network Sepolia testnet.

### Requirements
1. Verified smart contract deployment on Status Network Sepolia (Chain ID: 1660990954)
2. At least one gasless transaction (gas field = 0) on Status Network Sepolia
3. AI agent component in the project
4. README or video explaining the project

### Chain
Status Network Sepolia — Chain ID: 1660990954

### Prize Details
- $50 per qualifying team × up to 40 slots = $2,000 max
- Low barrier, guaranteed payout if requirements met

### What They Want
Any project that deploys on their testnet with a gasless tx. Very low bar — essentially free $50 if you add Status Network deployment as a side task.

### Docs
- Status Network: https://status.network

---

## ENS
**Prize: $1,497 — Three sub-tracks**

### What It Is
Ethereum Name Service — human-readable names for blockchain addresses. Three bounty categories for agent integration.

### Bounty 1: "ENS Identity" ($600)
Agents that use ENS names for identity resolution, profile data, avatar resolution, or address lookup.
- 1st: $400 / 2nd: $200

### Bounty 2: "ENS Communication" ($600)
Agents that use ENS for messaging, notifications, or cross-platform communication using ENS names.
- 1st: $400 / 2nd: $200

### Bounty 3: "ENS Open Integration" ($300)
Any creative ENS integration that doesn't fit the above categories.
- 1st: $300

### What They Want
Creative uses of ENS beyond basic name resolution. Identity-layer integrations, communication protocols, novel name-based workflows.

### Docs
- ENS Docs: https://docs.ens.domains
- ENS App: https://app.ens.domains

---

## Markee
**Prize: $798 — "Markee GitHub Integration"**

### What It Is
Platform for monetizing open-source repos. Integrate a Markee message into your GitHub repo and appear "Live" on markee.xyz. Judged on objective metrics only.

### Two Categories
1. **Top Views** ($400) — Most views on your Markee-integrated repo
2. **Top Monetization** ($400) — Most revenue generated through Markee integration

### Requirements
1. Markee message integrated into GitHub repository
2. Project must appear "Live" on markee.xyz
3. Judged purely on objective metrics (views, monetization)

### What They Want
High-visibility open-source projects with Markee integration. Gaming strategy: maximize GitHub repo traffic and/or monetization. Pure metrics-based judging.

### Docs
- Platform: https://markee.xyz

---

## ampersend
**Prize: $500 — "Best Agent Built with ampersend-sdk"**

### What It Is
SDK by Edge & Node for building applications with x402 payment capabilities. Transport-agnostic payment protocol for agent and LLM applications enabling pay-per-request patterns. Supports MCP for LLM-tool integration with payment capabilities, plus standard HTTP client with x402 payment in TypeScript.

### Tech Stack
- **SDK:** `ampersend-sdk` (npm) — by edgeandnode
- **Supports:** Buyer and seller roles
- **Protocol:** x402 (HTTP 402 Payment Required)
- **MCP integration** for LLM-tool payments

### Prize Details
- Winner: $500
- Integration must be "substantive" — SDK should be load-bearing to agent's core functionality, not a peripheral add-on

### What They Want
Creative, functional agents where ampersend-sdk is a core dependency delivering real utility. Not a wrapper or add-on — must be load-bearing.

### Docs
- GitHub: https://github.com/edgeandnode/ampersend-sdk
