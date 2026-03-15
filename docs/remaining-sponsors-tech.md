# Remaining Sponsors — Technical Reference

## Olas (Autonomous Agent Framework)

### What It Is
Leading crypto-AI protocol for decentralized autonomous agent services. 4M+ agent transactions. Open Autonomy framework for multi-agent systems (MAS) secured on public blockchains.

### Architecture
Components (skills/rounds) → Agent blueprints → Agent services (multiple instances). Built on Open AEA framework.

### Pearl — AI Agent App Store
Desktop app for running/owning agents. Self-custody. Notable: Modius agent >150% ROI in <150 days. Pearl Accelerator: up to $100K grants.

### Mech Marketplace
Decentralized agent-to-agent service marketplace. Crypto signatures (not API keys). $90K+ turnover, 11.2M+ A2A transactions.

### Supported Chains
Ethereum, Gnosis, Polygon, Celo, Base, Optimism, Arbitrum One, + custom.

### Cost
Simple 4-instance agent: ~$3000/mo on Ethereum, ~$1.50/mo on Polygon.

### Key URLs
- Docs: https://docs.olas.network/open-autonomy/
- Stack: https://stack.olas.network/open-autonomy/
- Build: https://olas.network/build
- Pearl: https://stack.olas.network/pearl/integration-guide/
- Mech Client: https://stack.olas.network/mech-client/
- Mech Server: https://stack.olas.network/mech-server/

---

## Arkhai / Alkahest (Escrow Protocol)

### What It Is
Programmable marketplace primitives by CoopHive/Arkhai. Escrow contracts with Boolean logic, recursive arbitration, modular market design.

### How Escrow Works
1. Collateral in escrow
2. **Arbiter** contract determines outcome
3. Collateral released or retained based on arbiter decision

### Arbiter Types
- **TrivialArbiter** — approves any fulfillment (base layer)
- **TrustedPartyArbiter** — validates result from specific trusted party
- Custom arbiters composable recursively (stackable)

### SDKs
- alkahest-ts (TypeScript, GitHub)
- alkahest-rs (Rust, crates.io)
- alkahest-py (Python, archived Feb 2026)

### Token Support
Any ERC-20, ERC-721, ERC-1155, ERC-6909. Bundle exchanges supported.

### Key URLs
- Docs: https://alkahest.coophive.network/
- GitHub: https://github.com/CoopHive
- Mocks/Contracts: https://github.com/CoopHive/alkahest-mocks

---

## Slice (ERC-8128 Auth + Commerce)

### ERC-8128: Signed HTTP Requests with Ethereum
Signs **every HTTP request** with Ethereum key (not just login like SIWE).

**Identity format:** `erc8128:<chainId>:<address>`

```typescript
import { createSignerClient } from '@slicekit/erc8128'

const client = createSignerClient({
  chainId: 1,
  address: account.address,
  signMessage: (msg) => account.signMessage({ message: { raw: msg } })
})
const response = await client.signedFetch(url, init)
```

**Verification:**
```typescript
import { createVerifierClient } from '@slicekit/erc8128'

const verifier = createVerifierClient({
  verifyMessage: publicClient.verifyMessage,
  nonceStore
})
const result = await verifier.verifyRequest({ request })
// { ok, address, chainId, ... }
```

**Package:** `npm install @slicekit/erc8128`

### Slice Commerce Protocol
- **Slicers** = smart contract stores distributing payments to owners
- **Slices** = ERC-1155 ownership tokens
- Built-in decentralized store selling anything
- ETH or any ERC-20 payments

### Hooks System (Foundry)
- **IProductPrice** — dynamic pricing
- **IProductAction** — purchase gating + on-purchase logic
- **IHookRegistry** — reusable hooks
- Generator: `./script/generate-hook.sh`

### Related: ERC-8183 (Agentic Commerce)
Trustless agent-to-agent commerce. Job with escrowed budget, 4 states (Open → Funded → Submitted → Terminal).

### Key URLs
- ERC-8128: https://erc8128.slice.so
- GitHub: https://github.com/slice-so/erc8128
- Hooks: https://github.com/slice-so/hooks
- Store: https://mainnet.slice.so

---

## bond.credit (Agentic Trading & Credit)

### What It Is
"The Credit Layer for the Agentic Economy." Tests autonomous agents with real capital on-chain, records every trade, feeds data into credit engine.

### Hackathon Bounty Requirements
- **HARD RULE:** Agent must have traded live on GMX perps on Arbitrum
- No simulations, no retroactive demos
- Winners earn on-chain credit scores on ERC-8004 identity

### GMX V2 Integration
- Contract docs: https://docs.gmx.io/docs/api/contracts-v2/
- Arbitrum Sepolia deployment most current
- `executionFee`: native ETH for keeper execution
- Python: `eth_defi` library (GMXConfig, GMXAPI)

### ERC-8004 + x402 Integration
bond.credit builds on ERC-8004 for trust + x402 for payments. Agents include crypto payment proofs in reputation feedback.

### Key URLs
- Website: https://www.bond.credit
- ERC-8004 contracts: https://github.com/erc-8004/erc-8004-contracts
- GMX docs: https://docs.gmx.io/docs/api/contracts-v2/
