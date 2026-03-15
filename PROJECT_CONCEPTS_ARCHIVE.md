# Project Concepts for The Synthesis Hackathon

## Research-Backed Ideation: Privacy + Payments + DeFi for AI Agents

**Hackathon:** The Synthesis (March 13-22, 2026)
**Total Prize Pool:** $100,000+
**Judging:** AI agent judges + humans
**Core Philosophy:** "Solve a problem, not a checklist." One well-scoped working demo > ambitious architecture diagram.

---

## Quick Reference: Prize Amounts by Track

| Track | Sponsor | Total Prize | 1st Place |
|-------|---------|------------|-----------|
| Synthesis Open Track | Community | $14,059 | $14,059 (shared) |
| Private Agents, Trusted Actions | Venice | $11,500 | $5,750 (1000 VVV) |
| Let the Agent Cook | Protocol Labs | $8,000 | $4,000 |
| Agents With Receipts (ERC-8004) | Protocol Labs | $8,004 | $4,000 |
| Best Use of Delegations | MetaMask | $5,000 | $3,000 |
| Best Bankr LLM Gateway Use | Bankr | $5,000 | $3,000 |
| Best Agent on Celo | Celo | $5,000 | $3,000 |
| Agentic Finance | Uniswap | $5,000 | $2,500 |
| Ship Something Real with OpenServ | OpenServ | $4,500 | $2,500 |
| Best Use of Locus | Locus | $3,000 | $2,000 |
| Build with AgentCash | Merit | $1,750 | $1,000 |
| Best Self Agent ID Integration | Self | $1,000 | $1,000 |
| Arkhai Escrow | Arkhai | $900 | $450 |

---

## Concept 1: "Private DeFi Copilot"

### Description
An autonomous agent that uses Venice (private, no-data-retention LLM inference) to analyze DeFi portfolio positions, reason about market conditions, and execute token swaps via the Uniswap Trading API -- with spending limits enforced by MetaMask Delegation Framework (ERC-7715). The agent registers an on-chain identity via ERC-8004 and logs all actions to a reputation registry.

**Core loop:** User sets delegation (e.g., "spend up to 100 USDC/day, only on Uniswap, only for ETH/USDC") -> Agent privately reasons about portfolio via Venice -> Agent executes swaps via Uniswap API -> On-chain settlement with auditable history -> Reputation logged to ERC-8004.

### Target Tracks
| Track | Prize | Fit |
|-------|-------|-----|
| Venice (Private Agents) | $11,500 | **PRIMARY** -- private reasoning over portfolio data is the core value |
| Protocol Labs (Let the Agent Cook) | $8,000 | Full autonomous loop with ERC-8004 identity |
| Protocol Labs (Agents With Receipts) | $8,004 | ERC-8004 registration + reputation logging |
| Uniswap (Agentic Finance) | $5,000 | Real Trading API integration with real TxIDs |
| MetaMask (Delegations) | $5,000 | ERC-7715 scoped permissions as spending guardrails |
| Synthesis Open Track | $14,059 | Spans "secrets" + "pay" themes |
| **TOTAL POTENTIAL** | **$51,563** | |

### Novelty Score: 6/10
**Reasoning:** DeFi copilots exist (Singularry on BNB, HeyAnon, Glider) but NONE combine private LLM inference with delegation-scoped spending. The privacy layer is the differentiator. Singularry uses proprietary models with no privacy guarantees. No existing project uses Venice for private DeFi reasoning. The combination of private cognition -> scoped delegation -> on-chain execution is novel.

### Feasibility Score: 8/10
**Reasoning:** All components have working APIs with good documentation:
- Venice API is OpenAI-compatible (just change base_url)
- Uniswap has dedicated AI Skills (`npx skills add uniswap/uniswap-ai`) with 3-step swap flow
- MetaMask has `npx create-gator-app@latest` scaffolding
- ERC-8004 has deployed contracts on Base (`0x8004A818...`)
- All work on Base/Ethereum

**9-day timeline:**
- Days 1-2: Venice integration + basic portfolio analysis
- Days 3-4: Uniswap Trading API integration (check_approval -> quote -> swap)
- Days 5-6: MetaMask delegation with spending caveats
- Days 7-8: ERC-8004 registration + reputation logging
- Day 9: Polish, demo, deploy

### Human Steps Required
1. **Create Venice API key** (signup at venice.ai, get Pro for $10 credits)
2. **Create Uniswap Developer Platform API key** (register at developers.uniswap.org)
3. **Install MetaMask Flask** (separate browser profile required for ERC-7715)
4. **Fund a Base wallet** with ETH/USDC for gas and test swaps
5. **Sign initial delegation transaction** (one-time human approval to set spending scope)

### Competitive Advantage
- **Privacy is load-bearing, not decorative.** Venice's no-data-retention means portfolio analysis, strategy reasoning, and trade planning never leak to an LLM provider. This matters for DeFi: trading strategies are alpha, and leaking them to centralized inference providers is a real problem traders face.
- **Delegation makes the agent safe.** Unlike existing copilots that require full wallet access, this agent operates within cryptographically enforced boundaries. The human sets the "allowance box" and the agent can never exceed it.
- **Complete audit trail.** Every decision is logged (agent_log.json), every trade has a TxID, every reputation signal is on ERC-8004. Full transparency of opaque reasoning.

### Risk Factors
- MetaMask Flask + ERC-7715 is **Sepolia-only** for permission requests, limiting mainnet demo potential
- Uniswap requires **real API key and real TxIDs** -- testnet is acceptable but mainnet is stronger
- Venice API costs money (no unlimited free tier), need to budget inference credits
- Risk of over-scoping by trying to integrate too many sponsor tools without coherence
- MEV risk: agent's on-chain trades could be front-run/sandwiched

### Similar Existing Projects
- **Singularry Agent** (BNB Chain) -- autonomous DeFi copilot with 130+ actions, but proprietary, closed-source, no privacy layer. [Source](https://beincrypto.com/singularry-agent-autonomous-defi-copilot/)
- **HeyAnon** -- natural-language DeFi trading, but centralized inference, no delegation scoping
- **Glider** -- portfolio automation, but no privacy guarantees
- **Agentic Wallet** -- multi-model DeFi agent, but no scoped delegation, not privacy-focused. [Source](https://agenticwallet.org/)

---

## Concept 2: "Privacy-First Agent Payment Router"

### Description
Infrastructure middleware that routes AI agent payments through privacy-preserving channels. An agent uses Venice for private decision-making about which services to pay for and how, Locus for wallet management and spending controls, and AgentCash/x402 for actual API micropayments. The agent's identity is registered via ERC-8004, and Self Protocol provides ZK-verified human backing.

**Core loop:** Agent receives task -> Venice privately reasons about which paid APIs to call and cost/benefit -> Agent uses AgentCash x402 to pay for APIs at request time -> Locus enforces spending limits and provides audit trail -> All identity verified via ERC-8004 + Self Protocol.

### Target Tracks
| Track | Prize | Fit |
|-------|-------|-----|
| Venice (Private Agents) | $11,500 | Private reasoning about payment decisions |
| Protocol Labs (Let the Agent Cook) | $8,000 | Autonomous payment routing with identity |
| Protocol Labs (Agents With Receipts) | $8,004 | ERC-8004 identity + transaction receipts |
| Locus (Best Use) | $3,000 | Core wallet infrastructure |
| Merit (AgentCash) | $1,750 | x402 payments as primary payment rail |
| Self (Agent ID) | $1,000 | ZK human-backed identity |
| Synthesis Open Track | $14,059 | "Agents that pay" + "keep secrets" |
| **TOTAL POTENTIAL** | **$47,313** | |

### Novelty Score: 7/10
**Reasoning:** The "payment router" concept for agents is emerging (Google AP2, x402) but no project currently combines privacy-preserving LLM reasoning with payment routing decisions. The insight is that *which APIs an agent pays for* reveals strategy and intent -- making the routing decision itself a privacy concern. ZK mandates for spending compliance (as described in academic research on AP2) exist in theory but no implementation combines Venice + x402 + Locus.

### Feasibility Score: 7/10
**Reasoning:** More middleware-heavy than Concept 1, but all APIs exist:
- Venice API: drop-in OpenAI replacement
- AgentCash MCP: `npx -y x402scan-mcp@latest` with 4 tools (check_balance, query_endpoint, validate_payment, execute_call)
- Locus MCP: `https://mcp.paywithlocus.com/mcp` with wallet + spending tools
- Self SDK: `@selfxyz/agent-sdk` (TypeScript)
- ERC-8004: deployed contracts

**Risk:** Coordinating 5+ integrations in 9 days is tight. Must scope ruthlessly.

**9-day timeline:**
- Days 1-2: Venice integration for payment reasoning
- Days 3-4: AgentCash x402 integration (discover, price-check, pay for APIs)
- Days 5-6: Locus wallet management + spending controls
- Days 7: Self Protocol identity verification
- Day 8: ERC-8004 registration + demo flow
- Day 9: Polish, deploy

### Human Steps Required
1. Create Venice API key
2. Create Locus account at app.paywithlocus.com + deploy wallet ($10 USDC free)
3. Create AgentCash account at agentcash.dev ($25+ onboarding credits)
4. Download Self app + scan passport NFC for ZK identity
5. Fund Base wallet with USDC for x402 payments

### Competitive Advantage
- **Novel privacy angle:** Payment routing decisions reveal intent. If your agent is paying for market data APIs about ETH/BTC, an observer can infer trading strategy. Venice ensures the reasoning about *what to pay for* stays private.
- **Infrastructure play:** Judges value projects that could become foundational. This is a reusable payment routing layer other agents could adopt.
- **Covers "Agents that pay" + "Agents that keep secrets" themes simultaneously.**

### Risk Factors
- **Over-scoping danger is HIGH** -- 5+ integrations risk "checklist" feel
- Locus is in beta -- potential instability
- AgentCash wallet auto-generates at `~/.x402scan-mcp/wallet.json` -- need to ensure it's funded
- Self Protocol testnet is on Celo Sepolia, not Base -- cross-chain complexity
- Judges explicitly warn: "Solve a problem, not a checklist"

### Similar Existing Projects
- **Google AP2 (Agent Payments Protocol)** -- similar routing concept but centralized, no privacy layer. [Source](https://cloud.google.com/blog/products/ai-machine-learning/announcing-agents-to-payments-ap2-protocol)
- **AlphaClaw** (SURGE hackathon) -- x402 micropayments for agent data marketplace, but no privacy. [Source](https://github.com/diassique/alphaclaw)
- **Coinbase Agentic Wallets** -- wallet infra for agents, but centralized custody model. [Source](https://www.coinbase.com/developer-platform/discover/launches/agentic-wallets)

---

## Concept 3: "Autonomous DeFi Agent with Scoped Permissions"

### Description
A full autonomous agent loop: Venice private reasoning -> MetaMask delegation for scoped token approvals -> Uniswap swaps -> ERC-8004 identity + reputation logging -> OpenServ multi-agent orchestration. The agent reasons privately, acts within human-set boundaries, and builds verifiable on-chain reputation.

**Core loop:** Human grants MetaMask delegation with caveats (max spend, allowed contracts, time window) -> Agent uses Venice to privately analyze market -> Agent coordinates sub-tasks via OpenServ orchestrator -> Trader sub-agent executes Uniswap swaps within delegation scope -> Results logged to ERC-8004 reputation.

### Target Tracks
| Track | Prize | Fit |
|-------|-------|-----|
| Venice (Private Agents) | $11,500 | Private DeFi reasoning |
| Protocol Labs (Let the Agent Cook) | $8,000 | Full autonomous loop |
| Protocol Labs (Agents With Receipts) | $8,004 | ERC-8004 integration |
| MetaMask (Delegations) | $5,000 | Scoped permissions as core pattern |
| Uniswap (Agentic Finance) | $5,000 | Real swap execution |
| OpenServ (Ship Something Real) | $4,500 | Multi-agent orchestration |
| Bankr (LLM Gateway) | $5,000 | Alternative: use Bankr for LLM + token economics |
| Synthesis Open Track | $14,059 | Full theme coverage |
| **TOTAL POTENTIAL** | **$61,063** | |

### Novelty Score: 5/10
**Reasoning:** This is the "maximalist" concept -- attempting to hit every major track. The individual components are not novel (DeFi agents, delegation, swaps, multi-agent). The novelty is in the specific combination and the privacy layer. However, judges explicitly warn against checklist approaches. This concept risks being too broad.

### Feasibility Score: 5/10
**Reasoning:** This is the hardest concept to execute well in 9 days. Six major integrations, each with its own setup requirements. OpenServ requires a publicly accessible URL for agent deployment. MetaMask Flask is Sepolia-only for ERC-7715. Coordinating Venice + OpenServ + Uniswap + MetaMask + ERC-8004 is ambitious.

**Critical path risk:** If any single integration breaks, the "full loop" story falls apart. Better to have 3 working integrations than 6 half-working ones.

### Human Steps Required
1. Create Venice API key
2. Create Uniswap Developer Platform API key
3. Install MetaMask Flask (separate browser profile)
4. Register at platform.openserv.ai + create agent + get API key
5. Set up tunneling (ngrok/cloudflare) for OpenServ public URL
6. Fund Base/Sepolia wallet
7. Sign initial delegation transaction
8. Register ERC-8004 identity

### Competitive Advantage
- **Maximum prize surface** -- eligible for more tracks than any other concept
- **Multi-agent via OpenServ** adds sophistication (researcher agent + trader agent + risk agent)
- **Complete story** from private reasoning to scoped execution to on-chain reputation

### Risk Factors
- **HIGHEST RISK of "checklist" penalty** -- judges will ask "is this coherent or just integrations?"
- MetaMask ERC-7715 is Sepolia-only -- mainnet demo impossible for delegation
- OpenServ requires public URL deployment -- adds DevOps complexity
- Six integration points = six potential failure modes
- Over-scoping is the #1 warned-against mistake

### Similar Existing Projects
- **AgenticTrading (Open-Finance-Lab)** -- multi-agent financial framework with A2A protocol, but no privacy layer, no delegation. [Source](https://github.com/Open-Finance-Lab/AgenticTrading)
- **TradingAgents** -- multi-agent LLM trading framework, but centralized inference. [Source](https://github.com/TauricResearch/TradingAgents)
- **Olas prediction market agents** -- autonomous agents on Gnosis Chain, 75% of Safe transactions, but no privacy. [Source](https://olas.network/agents)

---

## Concept 4: "Agent Escrow Marketplace"

### Description
A marketplace where agents privately negotiate and escrow payments for services. Agent A needs a service (data analysis, code review, etc.). It uses Venice to privately evaluate offers. It uses Alkahest (Arkhai) smart contracts to lock funds in escrow. Self Protocol verifies that both agents are human-backed. x402 micropayments handle the actual service delivery payments.

**Core loop:** Agent discovers service providers via ERC-8004 registry -> Venice privately evaluates quality/price -> Alkahest escrow locks funds -> Service agent delivers work -> AI evaluator (Venice) verifies quality -> Escrow releases payment.

### Target Tracks
| Track | Prize | Fit |
|-------|-------|-----|
| Venice (Private Agents) | $11,500 | Private negotiation and quality evaluation |
| Protocol Labs (Let the Agent Cook) | $8,000 | Autonomous discovery + execution |
| Protocol Labs (Agents With Receipts) | $8,004 | ERC-8004 for agent discovery |
| Arkhai (Applications) | $450 | Alkahest escrow integration |
| Arkhai (Escrow Extensions) | $450 | Novel arbiter type (AI-evaluated) |
| Self (Agent ID) | $1,000 | Sybil-resistant human-backed identity |
| Merit (AgentCash) | $1,750 | x402 for service micropayments |
| Synthesis Open Track | $14,059 | "Agents that cooperate" theme |
| **TOTAL POTENTIAL** | **$45,213** | |

### Novelty Score: 8/10
**Reasoning:** Agent-to-agent escrow is an emerging concept but almost no implementations exist. NEAR Protocol has a basic agent marketplace. Circle built an experimental escrow agent. Claw Earn has bounty-based escrow. But NONE combine: (a) private negotiation via Venice, (b) AI-evaluated work quality as escrow release condition, (c) ZK-verified human backing via Self, (d) composable Alkahest escrow primitives. The "AI as arbiter" for escrow release is particularly novel.

### Feasibility Score: 6/10
**Reasoning:** Alkahest documentation is limited (Arkhai prizes are only $450 each, suggesting it may be early-stage). The escrow contract interaction requires Solidity understanding. Self Protocol is on Celo Sepolia testnet. However, the core escrow pattern (lock -> verify -> release) is well-understood.

**9-day timeline:**
- Days 1-2: Venice integration for service evaluation
- Days 3-4: ERC-8004 agent registration + discovery
- Days 5-6: Alkahest escrow integration (lock, verify, release)
- Day 7: Self Protocol identity verification
- Day 8: x402/AgentCash for micropayments
- Day 9: Demo, deploy

### Human Steps Required
1. Create Venice API key
2. Download Self app + scan passport NFC
3. Fund Base wallet with USDC
4. Create AgentCash account
5. Deploy or interact with Alkahest escrow contracts

### Competitive Advantage
- **"AI as arbiter" is a killer feature** -- using Venice to privately evaluate work quality and trigger escrow release. This is the "programmatic escrow primitive" that RebelFi identifies as missing from all existing agent payment protocols.
- **Addresses "Agents that cooperate" theme directly** -- the escrow is the "neutral enforcement layer"
- **Self Protocol makes it Sybil-resistant** -- prevents agent marketplace spam

### Risk Factors
- Arkhai/Alkahest documentation may be insufficient for hackathon-speed development
- Arkhai prizes are small ($900 total) -- low incentive compared to other tracks
- Self Protocol testnet is on Celo Sepolia (different chain from Base)
- "Marketplace" implies two-sided network -- hard to demo with one builder
- Building a convincing escrow flow requires at least two distinct agents

### Similar Existing Projects
- **NEAR AI Agent Marketplace** -- agents bid on tasks, NEAR token escrow, but centralized evaluation. [Source](https://www.mexc.com/news/644376)
- **Circle AI Escrow Agent** -- OpenAI + USDC smart contracts, but no privacy, no ZK identity. [Source](https://www.zenml.io/llmops-database/ai-powered-escrow-agent-for-programmable-money-settlement)
- **Claw Earn** -- USDC bounty marketplace on Base, but human-driven evaluation. [Source](https://dev.to/aiagentstore/ai-agent-jobs-for-ai-to-human-work-with-trustless-usdc-escrow-27pn)
- **ERC-8183** -- programmable escrow primitive standard, but no implementation. [Source](https://cryptoslate.com/ai-agents-can-talk-use-tools-and-pay-but-crypto-wants-to-control-the-escrow-moment/)

---

## Concept 5: "Private Multi-Agent DeFi Swarm"

### Description
Multiple specialized agents (researcher, trader, risk manager) coordinated by OpenServ, each using Venice for private reasoning, executing DeFi operations via Uniswap, with MetaMask delegations for hierarchical spending controls. The "swarm" collectively manages a portfolio with each agent having scoped permissions.

**Core loop:** OpenServ orchestrator receives portfolio management task -> Researcher agent (Venice) privately analyzes market data -> Risk agent (Venice) privately evaluates exposure -> Trader agent executes Uniswap swaps within MetaMask delegation scope -> All agents have ERC-8004 identities with cross-referenced reputation.

### Target Tracks
| Track | Prize | Fit |
|-------|-------|-----|
| Venice (Private Agents) | $11,500 | All agents use Venice for private reasoning |
| Protocol Labs (Let the Agent Cook) | $8,000 | Fully autonomous multi-agent loop |
| Protocol Labs (Agents With Receipts) | $8,004 | Multi-agent ERC-8004 identities |
| OpenServ (Ship Something Real) | $4,500 | Multi-agent orchestration is OpenServ's purpose |
| Uniswap (Agentic Finance) | $5,000 | Real swap execution |
| MetaMask (Delegations) | $5,000 | Sub-delegation chains between agents |
| Bankr (LLM Gateway) | $5,000 | Multi-model inference for different agents |
| Synthesis Open Track | $14,059 | Full theme coverage |
| **TOTAL POTENTIAL** | **$61,063** | |

### Novelty Score: 6/10
**Reasoning:** Multi-agent trading systems exist (TradingAgents, AgenticTrading, OpenAI Swarm). The novel elements are: (a) privacy-preserving reasoning per agent, (b) hierarchical delegation chains (user -> orchestrator -> sub-agents), (c) per-agent ERC-8004 identity with cross-reputation. The sub-delegation chain pattern with MetaMask (user delegates to orchestrator, orchestrator sub-delegates to trader) is specifically called out in MetaMask's prize criteria.

### Feasibility Score: 4/10
**Reasoning:** This is the most complex concept. Building 3+ functional agents, each with Venice integration, coordinated via OpenServ, with sub-delegations, and Uniswap execution -- in 9 days -- is extremely ambitious. OpenServ requires public URLs per agent. MetaMask sub-delegation is cutting-edge. A scaled-down version (2 agents, simpler coordination) might be feasible.

**Scaled-down approach (recommended):**
- 2 agents instead of 3: Analyst (Venice) + Trader (Uniswap)
- OpenServ coordinates the two
- Single delegation from user to trader agent
- Both register on ERC-8004

### Human Steps Required
1. Create Venice API key
2. Create Uniswap Developer Platform API key
3. Install MetaMask Flask
4. Register at platform.openserv.ai
5. Set up public URL tunneling (per agent)
6. Fund wallet
7. Sign delegation transaction
8. Register multiple ERC-8004 identities

### Competitive Advantage
- **Sub-delegation chains are specifically what MetaMask wants** -- "agent coordination via sub-delegation chains" is listed as a criteria for 2nd place ($1,500)
- **OpenServ's orchestrator is purpose-built for this** -- not a hack, it's the intended use case
- **Per-agent privacy** means one agent's leaked reasoning doesn't compromise others

### Risk Factors
- **Complexity is the enemy** -- 3+ agents, each needing its own Venice, OpenServ, and ERC-8004 setup
- OpenServ requires each agent to have a publicly accessible URL -- DevOps burden
- MetaMask sub-delegation from one smart account to another is not trivial
- Demo risk: showing a multi-agent swarm working live is hard to make compelling
- Judges warn against over-scoping

### Similar Existing Projects
- **TradingAgents (Tauric Research)** -- multi-agent LLM trading, but centralized, no blockchain integration. [Source](https://github.com/TauricResearch/TradingAgents)
- **AgenticTrading (Open-Finance-Lab)** -- A2A protocol coordination, but no privacy, no delegation. [Source](https://github.com/Open-Finance-Lab/AgenticTrading)
- **Agentic Wallet** -- multi-model DeFi platform (GPT-4 + Claude + DeepSeek), but centralized, not modular. [Source](https://agenticwallet.org/)
- **Olas Pearl agents** -- multi-agent DeFi on Gnosis, but proprietary framework, no privacy. [Source](https://olas.network/)

---

## Concept 6: "Stablecoin Privacy Agent on Celo"

### Description
An agent that manages stablecoin payments privately on Celo L2, leveraging Celo's native fee abstraction (pay gas in cUSD/USDC instead of native token). Uses Venice for private inference about payment decisions, Locus for wallet controls, and registers identity via ERC-8004 + Self Protocol for ZK human-backed verification.

**Core loop:** User tasks agent with recurring payments or treasury management -> Agent uses Venice to privately analyze recipients, amounts, timing -> Agent pays gas in stablecoins via Celo fee abstraction (no need to hold CELO) -> Locus enforces spending policies -> Self Protocol provides ZK verification that the agent is human-backed.

### Target Tracks
| Track | Prize | Fit |
|-------|-------|-----|
| Venice (Private Agents) | $11,500 | Private payment reasoning |
| Celo (Best Agent on Celo) | $5,000 | Native Celo integration is primary |
| Protocol Labs (Let the Agent Cook) | $8,000 | Autonomous payment agent |
| Protocol Labs (Agents With Receipts) | $8,004 | ERC-8004 identity |
| Locus (Best Use) | $3,000 | Wallet management + spending controls |
| Self (Agent ID) | $1,000 | ZK identity on Celo (Self testnet is on Celo Sepolia) |
| Synthesis Open Track | $14,059 | "Agents that pay" + "keep secrets" |
| **TOTAL POTENTIAL** | **$50,563** | |

### Novelty Score: 7/10
**Reasoning:** Celo's fee abstraction is a unique blockchain feature (56% of Celo gas paid in stablecoins in 2025) but no AI agent project specifically targets it. The ability for an agent to transact entirely in stablecoins without holding a volatile native token is a genuine UX advantage for autonomous agents. Self Protocol's testnet is already on Celo Sepolia, creating natural synergy. No existing project combines Venice + Celo fee abstraction + privacy-preserving payments.

### Feasibility Score: 7/10
**Reasoning:** Celo is an EVM-compatible L2 (migrated March 2025), so most Ethereum tooling works. Fee abstraction requires setting `feeCurrency` field in transactions (CIP-64 type 123). Locus currently supports Base/USDC only -- **cross-chain gap** is a risk. Self Protocol testnet IS on Celo Sepolia, which is a natural advantage.

**9-day timeline:**
- Days 1-2: Venice integration for payment decision reasoning
- Days 3-4: Celo integration with fee abstraction (cUSD gas payments)
- Days 5-6: Payment automation + Self Protocol identity on Celo Sepolia
- Day 7: Locus wallet controls (may need to adapt for Celo vs. Base)
- Day 8: ERC-8004 registration + demo flow
- Day 9: Polish, deploy

### Human Steps Required
1. Create Venice API key
2. Download Self app + scan passport NFC
3. Fund Celo wallet with cUSD/USDC (no CELO needed for gas!)
4. Create Locus account (if Celo-compatible) or adapt for Celo directly
5. Register ERC-8004 identity

### Competitive Advantage
- **Celo is underserved** -- $5,000 prize pool with likely fewer competitors than Uniswap/MetaMask tracks
- **Self Protocol testnet is on Celo Sepolia** -- natural fit, less cross-chain complexity
- **Fee abstraction = agent-native UX** -- agents should not need to manage volatile gas tokens
- **Real-world payment focus** -- Celo's MiniPay has millions of users in Africa, making this practically relevant

### Risk Factors
- **Locus only supports Base** -- may not work with Celo, need alternative wallet management
- ERC-8004 contracts are deployed on Base/Ethereum, NOT Celo -- cross-chain identity gap
- Celo ecosystem is smaller, fewer developer resources/examples
- Fee abstraction adds ~50,000 extra gas units per transaction
- Less "DeFi" flavor compared to Uniswap-based concepts (Celo track wants "real-world payments")

### Similar Existing Projects
- **MiniPay (Opera)** -- Celo stablecoin wallet with millions of users, but no AI agent component. [Source](https://celo.org/)
- **Beep Protocol (Sui)** -- agent-driven yield farming with stablecoins, but on Sui, not Celo. [Source](https://blog.millionero.com/blog/ai-agents-in-crypto-how-autonomous-finance-is-becoming-real-in-2026/)
- No direct competitor combining AI agents + Celo fee abstraction

---

## Concept 7: "Self-Funding Autonomous Agent"

### Description
An agent that earns revenue to fund its own operations, creating a self-sustaining economic loop. It offers x402-protected API services (data analysis, content generation) that other agents pay for, uses Bankr LLM Gateway for multi-model inference (Claude, GPT, Gemini) with revenue from token launches and trading fees, and can optionally launch its own token via Bankr's token launching feature. Venice provides private reasoning for strategic decisions.

**Core loop:** Agent launches token via Bankr (earns 57% of swap fees) -> Uses swap fee revenue to pay for LLM inference via Bankr Gateway -> Offers x402 API services via AgentCash (earns per-request fees) -> Reinvests earnings into more inference -> Cycle continues.

### Target Tracks
| Track | Prize | Fit |
|-------|-------|-----|
| Venice (Private Agents) | $11,500 | Private strategic reasoning (what services to offer, pricing) |
| Bankr (LLM Gateway) | $5,000 | **PRIMARY** -- self-funding via Bankr is the core concept |
| Protocol Labs (Let the Agent Cook) | $8,000 | Fully autonomous self-sustaining agent |
| Protocol Labs (Agents With Receipts) | $8,004 | ERC-8004 identity + transaction receipts |
| Merit (AgentCash) | $1,750 | x402 API services as revenue source |
| OpenServ (Ship Something Real) | $4,500 | Agent economy product |
| Synthesis Open Track | $14,059 | "Agents that pay" theme |
| **TOTAL POTENTIAL** | **$52,813** | |

### Novelty Score: 8/10
**Reasoning:** Self-funding agents are the "holy grail" of autonomous AI -- an agent that can sustain itself economically without ongoing human funding. Olas has the concept (agents stake OLAS, earn rewards) but the Bankr model is different: the agent *launches its own token*, earns swap fees, and uses those fees to buy inference. This is genuinely novel. The combination of Venice (private strategy) + Bankr (token launch + LLM gateway) + x402 (earn from API services) creates a three-revenue-stream model no existing project implements.

### Feasibility Score: 7/10
**Reasoning:** Bankr's token launching is production-ready on Base (deploy via natural language, auto-creates Uniswap V4 pool). The LLM Gateway is OpenAI/Anthropic-compatible. AgentCash MCP is straightforward. The challenge is demonstrating the *loop*: earning enough from token fees + API services to fund continued inference within a 9-day hackathon demo.

**9-day timeline:**
- Days 1-2: Bankr LLM Gateway integration + basic agent capabilities
- Days 3-4: Token launch via Bankr + swap fee tracking
- Days 5-6: x402 API service creation (agent offers data analysis service)
- Day 7: Venice integration for private strategic reasoning
- Day 8: Self-sustaining loop demo (show revenue > cost)
- Day 9: ERC-8004 registration, polish

### Human Steps Required
1. Create Bankr API key at bankr.bot/api
2. Fund Bankr account with USDC/ETH on Base (`bankr llm credits add 25`)
3. Create Venice API key
4. Create AgentCash account
5. Fund Base wallet for token launch gas

### Competitive Advantage
- **Bankr specifically wants "self-sustaining economics"** -- their 1st place criteria says "self-sustaining economics" explicitly
- **Three revenue streams** (token swap fees + API service fees + potential trading profits) make the economics more plausible than single-stream models
- **Venice private reasoning for strategy** -- the agent's decisions about what services to offer, how to price them, and when to launch tokens are competitively sensitive
- **Token launch is visceral** -- judges (human and AI) will remember "this agent launched its own token and funded itself"

### Risk Factors
- Token launch creates **regulatory/perception risk** -- meme-token association
- Bankr has **no free tier** -- must top up before first request
- Demonstrating a *profitable* loop in 9 days may be impossible (token needs buyers)
- Revenue sharing math: 57% of 1.2% swap fee on a new token = very small unless token gets traction
- x402 API services need other agents to *pay for them* -- chicken-and-egg problem
- Risk of building something that looks like a "money printer" without substance

### Similar Existing Projects
- **Olas/Autonolas** -- autonomous economic agents that earn staking rewards and burn OLAS tokens, but different economic model (protocol-level, not individual agent token launch). [Source](https://olas.network/)
- **Virtuals Revenue Network** -- agents negotiate and earn from other agents, but centralized platform. [Source](https://crypto.com/en-fr/research/rise-of-autonomous-wallet-feb-2026)
- **Bankr itself** -- BNKR token was launched by the Bankr AI agent on Farcaster, the first token deployed by a bot. Our project would extend this model. [Source](https://bankr.bot/)
- **Alchemy x402 flow** -- agent uses own wallet + x402 to buy compute, but no token-launch revenue stream. [Source](https://blog.millionero.com/blog/ai-agents-in-crypto-how-autonomous-finance-is-becoming-real-in-2026/)

---

## Comparative Matrix

| Criterion | C1: Private DeFi Copilot | C2: Payment Router | C3: Full Autonomous | C4: Escrow Marketplace | C5: DeFi Swarm | C6: Celo Stablecoin | C7: Self-Funding |
|-----------|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| **Novelty** | 6 | 7 | 5 | 8 | 6 | 7 | 8 |
| **Feasibility** | 8 | 7 | 5 | 6 | 4 | 7 | 7 |
| **Prize Potential** | $51.6K | $47.3K | $61.1K | $45.2K | $61.1K | $50.6K | $52.8K |
| **# Tracks** | 6 | 7 | 8 | 8 | 8 | 7 | 7 |
| **Human Steps** | 5 | 5 | 8 | 5 | 8 | 5 | 5 |
| **Over-scope Risk** | Low | Medium | HIGH | Medium | HIGH | Low | Medium |
| **Checklist Risk** | Low | Medium | HIGH | Medium | HIGH | Low | Low |
| **Coherence** | High | High | Medium | High | Low | High | High |

---

## Recommendation: Top 3 Concepts to Build

### 1st Choice: Concept 1 -- "Private DeFi Copilot"
**Why:** Best balance of feasibility (8/10), coherence, and prize potential ($51.6K). The story is simple: "Your DeFi agent reasons privately and trades within human-set boundaries." Every integration is load-bearing, not decorative. Venice privacy is the core value proposition, not an add-on. Uniswap and MetaMask integrations are well-documented with starter kits. Low over-scope risk.

### 2nd Choice: Concept 7 -- "Self-Funding Autonomous Agent"
**Why:** Highest novelty (8/10) and directly addresses Bankr's explicit criteria for "self-sustaining economics." The token-launch narrative is memorable and demo-friendly. Feasibility is decent (7/10) because Bankr's tools are production-ready. Prize potential is strong ($52.8K) and covers different tracks than Concept 1, allowing you to pick based on strategic fit.

### 3rd Choice: Concept 6 -- "Stablecoin Privacy Agent on Celo"
**Why:** The Celo track ($5K) is likely undercompeted compared to Uniswap/MetaMask. Self Protocol's testnet is *already on Celo Sepolia*, reducing cross-chain friction. Fee abstraction is genuinely agent-native. The novelty (7/10) is real -- no existing project combines AI agents with Celo fee abstraction. Lower prize ceiling than Concepts 1/7 but higher probability of winning the Celo track.

### Avoid: Concepts 3 and 5
These maximalist concepts score highest on theoretical prize potential but carry severe over-scoping and checklist risks. The judges explicitly warn against this pattern. Building 6-8 integrations in 9 days is a recipe for a demo that shows nothing working well.

---

## Strategic Notes

1. **Venice is non-negotiable.** It's the largest single-sponsor prize ($11.5K) and their criteria -- "private cognition -> public on-chain action" -- aligns perfectly with every concept. Whatever you build, Venice must be the reasoning engine.

2. **Protocol Labs is the prize multiplier.** They offer $16K across two bounties, both requiring ERC-8004 identity + autonomous execution + structured logs. Adding `agent.json` + `agent_log.json` + ERC-8004 registration to ANY concept makes it eligible for both Protocol Labs bounties.

3. **"Solve a problem, not a checklist" is the #1 judging principle.** If you have to choose between adding a 6th integration or polishing 4 existing ones, always polish. A working demo with 3 deep integrations beats 6 surface-level ones.

4. **Testnet is acceptable, mainnet is better.** Uniswap explicitly accepts testnet TxIDs. MetaMask ERC-7715 is Sepolia-only anyway. Use testnet where needed, mainnet where possible.

5. **Document everything.** The `conversationLog` field is explicitly part of judging. Brainstorms, pivots, and breakthroughs should be logged. Since Claude Code is building most of this, the conversation history IS the build log.

6. **AI agent as participant.** The hackathon allows AI agents to enter and win. Consider registering the builder agent itself as an ERC-8004 identity, making the meta-narrative ("an AI agent built a project about AI agents") part of the submission.

---

## Sources

- [The Synthesis Hackathon](https://synthesis.md/)
- [Synthesis Hack Page](https://synthesis.md/hack/)
- [Venice AI API Docs](https://docs.venice.ai/api-reference/api-spec)
- [Venice AI](https://venice.ai/)
- [ERC-8004 Specification](https://eips.ethereum.org/EIPS/eip-8004)
- [ERC-8004 Contracts GitHub](https://github.com/erc-8004/erc-8004-contracts)
- [MetaMask Delegation Toolkit](https://metamask.io/developer/delegation-toolkit)
- [MetaMask Delegation Docs](https://docs.metamask.io/delegation-toolkit/)
- [MetaMask Hacker Guide ERC-7715](https://metamask.io/news/hacker-guide-metamask-delegation-toolkit-erc-7715-actions)
- [x402 Protocol](https://www.x402.org/)
- [Coinbase x402 Developer Docs](https://docs.cdp.coinbase.com/x402/welcome)
- [x402 GitHub](https://github.com/coinbase/x402)
- [Uniswap AI GitHub](https://github.com/Uniswap/uniswap-ai)
- [Uniswap Developer Platform](https://developers.uniswap.org)
- [Uniswap API Docs](https://api-docs.uniswap.org/introduction)
- [Singularry Agent](https://beincrypto.com/singularry-agent-autonomous-defi-copilot/)
- [OpenServ Platform](https://www.openserv.ai/)
- [OpenServ Multi-Agent Systems](https://www.openserv.ai/blog/technical-insights-multi-agent-systems-and-autonomous-ai)
- [Locus (YC - AI Agent Payments)](https://www.ycombinator.com/companies/locus)
- [Locus Payment Infrastructure](https://paywithlocus.com/)
- [Bankr Bot](https://bankr.bot/)
- [Bankr Ecosystem](https://www.kucoin.com/news/articles/a-deep-dive-into-the-ai-agent-bankr-and-its-ecosystem-token-bankrcoin-bnkr)
- [Self Protocol Launch (Celo Blog)](https://blog.celo.org/self-protocol-a-sybil-resistant-identity-primitive-for-real-people-launches-following-acquisition-74fd3461a428)
- [Self Agent ID App](https://app.ai.self.xyz/)
- [AgentCash](https://agentcash.dev)
- [Merit Systems](https://merit.systems/)
- [Celo Documentation](https://docs.celo.org/)
- [Celo Fee Abstraction](https://docs.celo.org/developer/fee-abstraction)
- [Google AP2 Protocol](https://cloud.google.com/blog/products/ai-machine-learning/announcing-agents-to-payments-ap2-protocol)
- [Olas Network](https://olas.network/)
- [TradingAgents GitHub](https://github.com/TauricResearch/TradingAgents)
- [AgenticTrading GitHub](https://github.com/Open-Finance-Lab/AgenticTrading)
- [NEAR AI Agent Marketplace](https://www.mexc.com/news/644376)
- [Circle AI Escrow Agent](https://www.zenml.io/llmops-database/ai-powered-escrow-agent-for-programmable-money-settlement)
- [Autonomous Agents on Blockchains (arXiv)](https://arxiv.org/html/2601.04583v1)
- [Crypto AI Agents 2026](https://coincub.com/blog/crypto-ai-agents/)
- [Rise of the Autonomous Wallet](https://crypto.com/en-fr/research/rise-of-autonomous-wallet-feb-2026)
