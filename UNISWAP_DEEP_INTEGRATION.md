# Uniswap Deep Integration Research

**Date:** March 13, 2026
**Purpose:** Go from "basic swap user" to "deep Uniswap integration" for maximum hackathon prize impact
**Prize Context:** "Deeper stack usage (Hooks, AI Skills, v4, Permit2) = better"

---

## Table of Contents

1. [Current State: What "Basic" Looks Like](#1-current-state)
2. [The 7 AI Agent Skills — What They Actually Do](#2-ai-skills)
3. [swap-planner Deep Dive](#3-swap-planner)
4. [uniswap-driver / liquidity-planner Deep Dive](#4-liquidity-planner)
5. [Permit2 Integration — How It Strengthens Us](#5-permit2)
6. [V4 Hooks — Minimum Viable Integration](#6-v4-hooks)
7. [What Hackathon Winners Actually Built](#7-hackathon-winners)
8. [Concrete Recommendations: The Upgrade Path](#8-recommendations)
9. [Implementation Priority Matrix](#9-priority-matrix)

---

## 1. Current State: What "Basic" Looks Like {#1-current-state}

Basic Uniswap integration = `check_approval -> quote -> swap`. This is table stakes. Every hackathon project does this. The prize explicitly says deeper stack usage wins.

**What judges see as "basic":**
- Call Trading API to get a quote
- Check if token is approved
- Execute the swap
- Done

**What judges see as "deep":**
- Using Uniswap's own AI Skills toolkit
- Permit2 for gasless signature-based approvals
- V4 Hooks for custom pool behavior
- LP position management (not just swapping)
- TWAP/order splitting for large trades
- Multi-step DeFi workflows in single transactions

---

## 2. The 7 AI Agent Skills — What They Actually Do {#2-ai-skills}

Released Feb 21, 2026. Open source at `github.com/Uniswap/uniswap-ai`. These are protocol-native agent SDKs — not chatbot wrappers.

Install: `npx skills add uniswap/uniswap-ai`

| Skill | Purpose | Value for Us |
|-------|---------|-------------|
| **v4-security-foundations** | Security patterns for v4 hook development | HIGH — shows we understand hook security |
| **configurator** | Pool setup and parameter management | MEDIUM — useful if we deploy pools |
| **deployer** | Contract/pool deployment automation | MEDIUM — if we deploy a hook |
| **viem-integration** | EVM connectivity via viem/wagmi | HIGH — foundational for all on-chain ops |
| **swap-integration** | Direct token swap execution | HIGH — our core swap path |
| **liquidity-planner** | LP position strategy and optimization | HIGH — differentiator |
| **swap-planner** | Trade workflow planning, TWAP, order splitting | HIGH — differentiator |

**Key insight:** Using these official AI Skills is itself a signal to judges. It shows we're using Uniswap's own agent infrastructure, not just calling a REST API.

---

## 3. swap-planner Deep Dive {#3-swap-planner}

### What It Actually Does

The swap-planner is a structured skill that helps agents plan and execute token swaps. It operates through a 7-step workflow:

1. **Token Discovery** — Searches DexScreener API, filters by chain/DEX, sorts by volume
2. **Intent Gathering** — Collects input/output tokens, amounts, chain
3. **Token Address Resolution** — Maps symbols to contract addresses
4. **Contract Verification** — Validates addresses on-chain via `eth_getCode`
5. **Token Research** — Web searches for legitimacy, security, liquidity
6. **Price Data Fetching** — DexScreener/DefiLlama for price, liquidity, volume
7. **Deep Link Generation** — Pre-filled Uniswap swap URL

### TWAP and Order Splitting

The swap-planner's descriptions reference TWAP and large-order splitting, but the **actual implementation** generates Uniswap deep links — it does NOT execute TWAP on-chain itself. The TWAP capability comes from Uniswap V4's **TWAMM Hook** (Time-Weighted Average Market Maker):

- TWAMM breaks large orders into small pieces over a user-specified duration
- Each block executes a proportional swap until the time window ends
- Reduces price impact and MEV extraction
- Great for DAO treasury operations and DCA strategies

**For our project:** We can use swap-planner for the planning/intelligence layer, then route large trades through the TWAMM hook for actual execution. This is a genuine value-add for agent treasury management.

### What's NOT in swap-planner

- Does NOT execute transactions directly (generates deep links)
- Does NOT do on-chain TWAP (that's the TWAMM hook)
- Does NOT do multi-hop routing optimization (relies on Uniswap UI)
- Does NOT handle limit orders

---

## 4. uniswap-driver / liquidity-planner Deep Dive {#4-liquidity-planner}

### What uniswap-driver Does

The `uniswap-driver` plugin provides "Swap & liquidity planning" — it's the unified plugin that covers both swap and LP operations.

### Liquidity-Planner Capabilities

- Plan and manage LP (Liquidity Provider) positions
- Optimize yield through position strategy
- Work with Uniswap V4's Position Manager contract

### V4 Position Manager (What's Under the Hood)

The Position Manager uses a **batched command pattern** — multiple operations in a single transaction:

- `MINT_POSITION` — Create new LP positions
- `INCREASE_LIQUIDITY` — Add to existing positions
- `DECREASE_LIQUIDITY` — Remove liquidity
- `SETTLE_PAIR / TAKE_PAIR` — Handle token transfers

### How We Could Use This

**Agent-managed LP rebalancing:**
1. Agent monitors price ranges of existing LP positions
2. When price moves out of range, agent plans a rebalance
3. Remove liquidity from old range → swap to rebalance ratio → add liquidity at new range
4. All in a batched transaction via Position Manager

This is a **massive differentiator** — most hackathon projects just swap. Managing LP positions shows real DeFi depth.

---

## 5. Permit2 Integration — How It Strengthens Us {#5-permit2}

### What Permit2 Is

A universal token approval contract that replaces the old `approve()` pattern with signature-based approvals.

### The Two-Step Flow

1. **One-time on-chain approval** (costs gas): User approves the Permit2 contract for the token. Done once per token, ever.
2. **Gasless signature approvals** (no gas): For each subsequent DApp interaction, user signs an EIP-712 message. The signature authorizes the specific spend.

### Two Modes

| Mode | Best For | How It Works |
|------|----------|-------------|
| **AllowanceTransfer** | Frequent interactions | Time-bounded, amount-limited allowances. Like traditional approvals but with expiry. |
| **SignatureTransfer** | One-time operations | Permission exists only within the transaction where the signature is spent. No lingering approvals. |

### Why This Matters for Our Agent

1. **UX improvement**: After initial Permit2 approval, all subsequent Uniswap operations need only an off-chain signature — no more approval transactions per protocol
2. **Security**: Expiring approvals, amount limits, no infinite approvals
3. **Batched approvals**: Approve multiple tokens to multiple spenders in one signature
4. **Agent workflow optimization**: Agent can bundle Permit2 signature + swap parameters in a single transaction

### How to Integrate

```
User approves Permit2 contract (once per token)
     ↓
Agent requests EIP-712 signature for specific operation
     ↓
Agent bundles signature + swap/LP calldata
     ↓
Single transaction: Permit2 pulls tokens + executes operation
```

**For hackathon:** Even just MENTIONING and using Permit2 in our swap flow (instead of traditional `approve()`) signals depth to judges. The Uniswap Trading API already supports Permit2 — we just need to use that path.

---

## 6. V4 Hooks — Minimum Viable Integration {#6-v4-hooks}

### Architecture Recap

- V4 uses a **singleton contract** (`PoolManager.sol`) — all pools in one contract
- Pool creation is a state update, not a contract deployment (99.99% cheaper)
- Hooks are external contracts attached to pools at initialization
- Hook permissions are encoded in the contract's **address** (via CREATE2 mining)

### Available Hook Callbacks

| Callback | When It Fires |
|----------|--------------|
| `beforeInitialize` / `afterInitialize` | Pool creation (one-time) |
| `beforeAddLiquidity` / `afterAddLiquidity` | Liquidity addition |
| `beforeRemoveLiquidity` / `afterRemoveLiquidity` | Liquidity removal |
| `beforeSwap` / `afterSwap` | Every swap |
| `beforeDonate` / `afterDonate` | Donations to pool |

### Minimum Viable Hook (CounterHook)

From the official quickstart — a hook that counts swaps and liquidity events:

```solidity
contract CounterHook is BaseHook {
    mapping(PoolId => uint256) public beforeSwapCount;
    mapping(PoolId => uint256) public afterSwapCount;

    function getHookPermissions() public pure override returns (Hooks.Permissions memory) {
        return Hooks.Permissions({
            beforeSwap: true,
            afterSwap: true,
            // ... other flags false
        });
    }

    function _afterSwap(...) internal override returns (bytes4, int128) {
        afterSwapCount[key.toId()]++;
        return (BaseHook.afterSwap.selector, 0);
    }
}
```

Setup: `forge init` + install v4-core and v4-periphery. Template at `github.com/uniswapfoundation/v4-template`.

### Hook Ideas Relevant to Our Project (Privacy + Agent Payments)

| Hook Concept | Complexity | Relevance |
|-------------|------------|-----------|
| **Swap Counter / Analytics Hook** | Low | Track agent swap activity on-chain |
| **Points/Rewards Hook** | Low-Medium | Award tokens for agent-mediated swaps (official tutorial) |
| **Fee Discount Hook** | Medium | Dynamic fees for agent-approved addresses |
| **Privacy-Enhancing Hook** | High | ZK-based deposit/withdrawal unlinking (Tornado-on-hooks concept) |
| **MEV Rebate Hook** | Medium | Return MEV to agent users |
| **TWAMM Hook** | High | Already exists — use it for large order execution |

### Deployment

1. Mine a CREATE2 salt that produces an address with correct permission bits
2. Deploy via CREATE2 deployer (`0x4e59b44847b379578588920ca78fbf26c0b4956c`)
3. Initialize a pool with the hook address

**Critical note:** V4 is live on Base mainnet since Jan 30, 2025. Over 5,000 hooks have been initialized. Deploying a hook on Base is real and demonstrated.

### Realistic Assessment

Deploying a **custom** hook from scratch during a hackathon is feasible but time-intensive. A counter/analytics hook is ~2 hours. A meaningful privacy hook is ~2 days. The better strategy may be to **use existing hooks** (like TWAMM) and demonstrate integration depth through the AI Skills layer.

---

## 7. What Hackathon Winners Actually Built {#7-hackathon-winners}

### Unichain Infinite Hackathon Winners (2025)

| Project | What They Did | Why They Won |
|---------|--------------|-------------|
| **Unipump** | pump.fun on EVM via V4 hooks, custom bonding curves | Novel use of hooks as token launch platform |
| **Prediction Market Hook** | Permissionless prediction markets in any Uniswap pool | Creative hook that extends pool functionality |
| **Likwid.fi** | Permissionless, oracle-less margin trading via V4 | Deep protocol understanding |
| **Async Swap** | Asynchronous swaps via hook for MEV protection | Novel transaction ordering rules |
| **Uniderp** | No-code meme token launches via V4 hook | Traction: 772 tokens, 10K wallets, $1.3M volume |
| **Milady Bank** | Lending/borrowing protocol built with V4 hooks | Used hooks for complete new protocol |
| **AnyPrice** | Cross-chain oracle data via Superchain messaging | Infrastructure utility |

### Patterns That Win

1. **Hooks as platform** — Not just modifying swaps, but creating entirely new primitives
2. **Real traction** — Uniderp won partly on actual usage numbers
3. **Novel combinations** — Prediction markets + AMM, Lending + hooks
4. **MEV protection** — Async Swap's approach was valued
5. **Ecosystem contribution** — Tools/infra that others can build on

### What This Means for Us

We don't need to build a full new protocol. But we need to show we understand V4 deeply enough to use its primitives creatively. The sweet spot is using hooks + AI Skills + Permit2 together in a way that serves our privacy + agent payments narrative.

---

## 8. Concrete Recommendations: The Upgrade Path {#8-recommendations}

### Tier 1: Low Effort, High Signal (DO ALL OF THESE)

**A. Install and use Uniswap AI Skills**
- `npx skills add uniswap/uniswap-ai`
- Use `swap-integration` for swaps instead of raw API calls
- Use `viem-integration` for on-chain operations
- Document this in submission materials
- **Effort:** 1-2 hours
- **Signal:** "We're using Uniswap's official agent SDK"

**B. Use Permit2 for token approvals**
- Replace traditional `approve()` with Permit2 signature flow
- The Uniswap Trading API already supports Permit2 — use the Permit2 path
- Show the UX improvement: one-time approval + gasless signatures
- **Effort:** 2-3 hours (mostly understanding the flow)
- **Signal:** "We understand modern token approval patterns"

**C. Use swap-planner for intelligent trade planning**
- Don't just swap blindly — show the agent PLANNING trades
- Token discovery, contract verification, price impact assessment
- Log the planning process in agent_log.json
- **Effort:** 1-2 hours
- **Signal:** "Our agent thinks before it trades"

### Tier 2: Medium Effort, Strong Differentiator (PICK 1-2)

**D. LP position management via liquidity-planner**
- Agent monitors existing LP positions
- Detects when price moves out of range
- Plans and executes rebalancing
- Use Position Manager's batched commands
- **Effort:** 4-6 hours
- **Signal:** "Our agent manages liquidity, not just swaps"

**E. TWAMM integration for large trades**
- For any trade above a threshold (e.g., >$1000), route through TWAMM
- Agent decides: instant swap vs. TWAMM based on size and price impact
- Show the decision logic in agent_log.json
- **Effort:** 3-5 hours
- **Signal:** "Our agent optimizes execution strategy"

**F. Deploy a simple custom hook on Base**
- Fork the v4-template
- Build an "AgentSwapTracker" hook that logs agent-mediated swaps
- Deploy on Base mainnet via CREATE2
- Create a pool that uses the hook
- **Effort:** 4-8 hours (if Solidity-comfortable)
- **Signal:** "We deployed custom V4 infrastructure"

### Tier 3: High Effort, Maximum Impact (ONLY IF TIME PERMITS)

**G. Privacy-Enhancing Hook**
- Hook that breaks the on-chain link between agent deposit and swap
- Could use commitment schemes or ZK proofs
- Connects directly to our privacy narrative
- **Effort:** 1-2 days
- **Signal:** "We built novel privacy infrastructure on V4"

**H. Full Agent Treasury Manager**
- Agent manages a portfolio: swaps, LP positions, rebalancing, TWAP
- Uses all 7 AI Skills
- Autonomous DeFi operations with privacy via Venice inference
- **Effort:** 2-3 days
- **Signal:** "This is a production-grade agent DeFi stack"

---

## 9. Implementation Priority Matrix {#9-priority-matrix}

| Priority | Action | Hours | Prize Impact | Dependencies |
|----------|--------|-------|-------------|-------------|
| **P0** | Install Uniswap AI Skills, use swap-integration | 1-2h | Medium | None |
| **P0** | Use Permit2 flow for approvals | 2-3h | High | None |
| **P0** | Use swap-planner for trade intelligence | 1-2h | Medium | AI Skills installed |
| **P1** | LP management via liquidity-planner | 4-6h | High | AI Skills installed |
| **P1** | TWAMM for large trades | 3-5h | High | Understanding V4 hooks |
| **P2** | Deploy simple custom hook on Base | 4-8h | Very High | Foundry, Solidity comfort |
| **P3** | Privacy hook | 1-2 days | Maximum | Solidity, ZK knowledge |

### Minimum Viable "Deep Integration" (8-10 hours total)

If we do P0 items + one P1 item, we go from "basic swap user" to:

> "An AI agent that uses Uniswap's official AI Skills SDK for intelligent trade planning with Permit2 gasless approvals, automated LP position management, and TWAP-optimized execution for large trades."

That sentence alone hits: AI Skills, Permit2, V4, and deep stack usage.

### Maximum Viable Integration (2-3 days)

All P0 + all P1 + deploy a hook = everything the prize asks for.

---

## Key URLs & Resources

- Uniswap AI Skills repo: https://github.com/Uniswap/uniswap-ai
- V4 Hooks docs: https://docs.uniswap.org/contracts/v4/concepts/hooks
- V4 Hook quickstart: https://docs.uniswap.org/contracts/v4/quickstart/hooks/setup
- First hook tutorial: https://docs.uniswap.org/contracts/v4/guides/hooks/your-first-hook
- Hook deployment: https://docs.uniswap.org/contracts/v4/guides/hooks/hook-deployment
- Permit2 overview: https://docs.uniswap.org/contracts/permit2/overview
- Permit2 integration blog: https://blog.uniswap.org/permit2-integration-guide
- V4 template: https://github.com/uniswapfoundation/v4-template
- TWAMM hook blog: https://blog.uniswap.org/v4-twamm-hook
- Position Manager: https://docs.uniswap.org/contracts/v4/guides/position-manager
- Awesome V4 Hooks: https://github.com/johnsonstephan/awesome-uniswap-v4-hooks
- LLM docs: https://docs.uniswap.org/llms/overview
- Trading API: https://api-docs.uniswap.org
- Uniswap AI Skills announcement gist: https://gist.github.com/afrexai-cto/725951fd9b60a7058575c0d716672159
