# Self Protocol — Complete Technical Reference

## What It Is
Privacy-first ZK identity protocol. Users scan NFC chip in government IDs (passports from 129 countries, EU IDs, Aadhaar) to generate zero-knowledge proofs. Proves attributes without revealing personal data. **8M+ users.** Partners: Google Cloud, Aave, Celo. Raised $9M.

## How ZK Identity Works
1. **Scan** — User scans passport/ID via NFC in Self mobile app
2. **Prove** — App generates ZK proof on-device (no data leaves device)
3. **Verify** — Proof submitted to smart contract or backend. Verifier learns only what was requested.

Uses zk-SNARK (groth16/plonk), ICAO Doc 9303 standard. Audited by zkSecurity.

## What Agents Can Prove
- Human-backed (not a bot)
- Age (18+ or 21+)
- OFAC sanctions compliance
- Sybil resistance (one human = one agent)
- Nationality (optional)
- Verified name (optional)

## Self Agent ID (app.ai.self.xyz)
On-chain AI agent identity registry with proof-of-human verification.

**5 Registration Modes:** Wallet connection, agent keypair (ECDSA/Ed25519), wallet-free, passkey smart wallet, social login (Privy)

**Flow:** Select mode → scan passport → get soulbound NFT on Celo + A2A identity card

## Chain
- **Primary:** Celo (mainnet and Sepolia testnet)
- **Soulbound NFT Contract:** `0xaC3DF9ABf80d0F5c020C06B04Cced27763355944` (Celo Sepolia)
- **Hub Addresses:**
  - Celo Sepolia: `0x16ECBA51e18a4a7e61fdC417f0d47AFEeDfbed74`
  - Celo Mainnet: `0xe57F4773bd9c9d8b6Cd70431117d353298B9f5BF`

## SDKs

### Frontend
```bash
npm install @selfxyz/qrcode @selfxyz/core ethers
```

```typescript
import { SelfAppBuilder, countries } from '@selfxyz/qrcode';

const app = new SelfAppBuilder({
  version: 2,
  appName: "My App",
  scope: "my-app-prod",
  endpoint: "0xContractAddress",
  endpointType: "staging_celo",
  userId: userAddress,
  userIdType: "hex",
  disclosures: {
    minimumAge: 18,
    excludedCountries: [countries.UNITED_STATES],
    ofac: true,
  }
}).build();
```

### Backend Verifier
```typescript
import { SelfBackendVerifier, AllIds, DefaultConfigStore } from "@selfxyz/core";

const verifier = new SelfBackendVerifier(
  "my-app-prod",
  "https://myapp.com/api/verify",
  false, // mockPassport
  AllIds,
  new DefaultConfigStore({ minimumAge: 18, ofac: true }),
  "hex"
);
const result = await verifier.verify(attestationId, proof, publicSignals, userContextData);
```

### Agent SDK
- TypeScript: `@selfxyz/agent-sdk` (npm)
- Python: `selfxyz-agent-sdk` (pip)
- Rust: `self-agent-sdk` (cargo)

```typescript
// Agent middleware
const verifier = SelfAgentVerifier.create().requireAge(18).requireOFAC().build();
app.use(verifier.auth());

// Agent client
const agent = new SelfAgentClient({ privateKey: process.env.AGENT_KEY });
const res = await agent.fetch(url); // auto-signs requests
```

### Smart Contract
```solidity
contract ProofOfHuman is SelfVerificationRoot {
  // Override customVerificationHook
}
```

## MCP Server (self-mcp)
```bash
pip install git+https://github.com/selfxyz/self-mcp.git
```

**12 Tools:**
1. `explain_self_integration` — Integration guides
2. `generate_verification_code` — Code gen (frontend/backend/contract)
3. `debug_verification_error` — Error resolution
4. `check_self_status` — Network status
5. `generate_verification_config` — Config from requirements
6. `explain_sdk_setup` — Backend setup docs
7. `generate_eu_id_verification` — EU ID verification
8. `generate_scope_hash` — Deterministic hash
9. `generate_config_id` — Config ID with blockchain check
10. `read_hub_config` — Hub contract config
11. `list_country_codes` — Available countries
12. `guide_to_tools` — Links to tools.self.xyz

Requirements: Python 3.12+, fastmcp, web3, aiohttp

## Key URLs
- Docs: https://docs.self.xyz
- Agent ID: https://app.ai.self.xyz
- Dev Tools: https://tools.self.xyz
- GitHub: https://github.com/selfxyz
- MCP: https://github.com/selfxyz/self-mcp
- Boilerplate: https://github.com/selfxyz/self-integration-boilerplate
- Coverage Map: https://map.self.xyz
