# ERC-8004: Trustless Agents — Complete Technical Reference

## Metadata
- **Title:** ERC-8004: Trustless Agents
- **Status:** Standards Track: ERC (Draft)
- **Created:** 2025-08-13
- **Live on Ethereum mainnet:** January 29, 2026
- **Authors:** Marco De Rossi (MetaMask), Davide Crapis (Ethereum Foundation), Jordan Ellis (Google), Erik Reppel (Coinbase)
- **Dependencies:** EIP-155, EIP-712, EIP-721, EIP-1271

## Purpose
Enables agents to be discovered and trusted across organizational boundaries without pre-existing relationships. Extends Google's A2A protocol with blockchain-based trust.

---

## Three Core Registries

All deployable on any L2 or mainnet as per-chain singletons.

### Deployed Contract Addresses

**Canonical (same across all EVM chains):**
- **IdentityRegistry:** `0x8004A818BFB912233c491871b3d84c89A494BD9e`
- **ReputationRegistry:** `0x8004B663056A597Dffe9eCcC1965A193B7388713`

**Base Mainnet specific:**
- **IdentityRegistry:** `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432`
- **ReputationRegistry:** `0x8004BAa17C55a88189AE136b182e5fdA19dE9b63`

**Deployed on 15+ chains:** Ethereum, Arbitrum, Optimism, Polygon, Avalanche, BSC, Celo, Gnosis, Linea, Mantle, Metis, Monad, Scroll, Taiko, XLayer, + testnets.

**Contracts repo:** https://github.com/erc-8004/erc-8004-contracts

---

## 1. Identity Registry (ERC-721 NFT-based)

Each agent gets an NFT (`agentId` = tokenId). The `agentURI` points to a JSON registration file.

### Global Agent Identifier
```
{namespace}:{chainId}:{identityRegistry}:{agentId}
Example: eip155:1:0x742...:{agentId}
```

### Functions
```solidity
// Registration (3 overloads)
function register(string agentURI, MetadataEntry[] calldata metadata) external returns (uint256 agentId)
function register(string agentURI) external returns (uint256 agentId)
function register() external returns (uint256 agentId)

// URI Management
function setAgentURI(uint256 agentId, string calldata newURI) external

// Metadata
function getMetadata(uint256 agentId, string memory metadataKey) external view returns (bytes memory)
function setMetadata(uint256 agentId, string memory metadataKey, bytes memory metadataValue) external

// Agent Wallet (requires EIP-712/1271 signature)
function setAgentWallet(uint256 agentId, address newWallet, uint256 deadline, bytes calldata signature) external
function getAgentWallet(uint256 agentId) external view returns (address)
function unsetAgentWallet(uint256 agentId) external
```

### Events
```solidity
event Registered(uint256 indexed agentId, string agentURI, address indexed owner)
event URIUpdated(uint256 indexed agentId, string newURI, address indexed updatedBy)
event MetadataSet(uint256 indexed agentId, string indexed indexedMetadataKey, string metadataKey, bytes metadataValue)
```

### Agent Registration File Schema (off-chain JSON)
```json
{
  "type": "https://eips.ethereum.org/EIPS/eip-8004#registration-v1",
  "name": "agentName",
  "description": "Natural language description",
  "image": "https://example.com/agentimage.png",
  "services": [
    { "name": "service-name", "endpoint": "uri", "version": "optional" }
  ],
  "x402Support": false,
  "active": true,
  "registrations": [
    { "agentId": "number", "agentRegistry": "namespace:chainId:address" }
  ],
  "supportedTrust": ["reputation", "crypto-economic", "tee-attestation"]
}
```

Service endpoint types: Web, A2A, MCP, OASF, ENS, DID, email, custom.

### Domain Verification
Publish `https://{domain}/.well-known/agent-registration.json`

---

## 2. Reputation Registry

### Feedback Structure (on-chain)
- `value` (int128 fixed-point rating)
- `valueDecimals` (uint8, 0-18)
- `tag1`, `tag2` (strings for categorization)
- `isRevoked` (boolean)
- `feedbackIndex` (uint64, 1-indexed per client-agent pair)

Emitted but NOT stored: `endpoint`, `feedbackURI`, `feedbackHash`

### Functions
```solidity
function giveFeedback(uint256 agentId, int128 value, uint8 valueDecimals,
  string calldata tag1, string calldata tag2, string calldata endpoint,
  string calldata feedbackURI, bytes32 feedbackHash) external

function revokeFeedback(uint256 agentId, uint64 feedbackIndex) external

function appendResponse(uint256 agentId, address clientAddress,
  uint64 feedbackIndex, string calldata responseURI, bytes32 responseHash) external

function getSummary(uint256 agentId, address[] calldata clientAddresses,
  string tag1, string tag2) external view returns (uint64 count, int128 summaryValue, uint8 summaryValueDecimals)

function readFeedback(uint256 agentId, address clientAddress, uint64 feedbackIndex)
  external view returns (int128 value, uint8 valueDecimals, string tag1, string tag2, bool isRevoked)

function readAllFeedback(uint256 agentId, address[] calldata clientAddresses,
  string tag1, string tag2, bool includeRevoked) external view returns (...)

function getClients(uint256 agentId) external view returns (address[] memory)
function getLastIndex(uint256 agentId, address clientAddress) external view returns (uint64)
```

### Constraints
- Agent owner/operators CANNOT submit feedback for own agent
- `valueDecimals` must be 0-18
- `getSummary` requires non-empty `clientAddresses` (Sybil mitigation)

---

## 3. Validation Registry

### Functions
```solidity
function validationRequest(address validatorAddress, uint256 agentId,
  string requestURI, bytes32 requestHash) external

function validationResponse(bytes32 requestHash, uint8 response,
  string responseURI, bytes32 responseHash, string tag) external

function getValidationStatus(bytes32 requestHash) external view returns (
  address validatorAddress, uint256 agentId, uint8 response,
  bytes32 responseHash, string tag, uint256 lastUpdate)

function getSummary(uint256 agentId, address[] calldata validatorAddresses, string tag)
  external view returns (uint64 count, uint8 averageResponse)

function getAgentValidations(uint256 agentId) external view returns (bytes32[] memory)
function getValidatorRequests(address validatorAddress) external view returns (bytes32[] memory)
```

Response range: 0-100. Multiple responses allowed per requestHash.

---

## Trust Models

1. **Reputation** — Client feedback with filtering/aggregation
2. **Crypto-Economic** — Stake-secured re-execution validation
3. **Zero-Knowledge ML** — zkML proof verification
4. **TEE Attestation** — Trusted execution environment oracles

---

## How to Register an Agent

1. Call `register(agentURI)` on Identity Registry → get `agentId`
2. Publish registration JSON (IPFS/HTTPS), set via `setAgentURI()`
3. Optionally set verified wallet via `setAgentWallet()` (requires EIP-712/1271 signature)
4. Collect feedback via `giveFeedback()` on Reputation Registry
5. Query trust via `getSummary()` or `readAllFeedback()`

---

## Agent Manifest (agent.json)

For Protocol Labs bounties, provide a machine-readable manifest:

```json
{
  "manifest_version": "1.0",
  "agent": {
    "id": "ajson://team/agent",
    "name": "Agent Name",
    "description": "...",
    "version": "1.0.0"
  },
  "capabilities": [
    {
      "id": "cap_id",
      "description": "...",
      "input_schema": {},
      "output_schema": {}
    }
  ],
  "tools": [
    {
      "id": "tool://api",
      "name": "API Name",
      "type": "http",
      "endpoint": "https://...",
      "auth": { "method": "bearer", "token_env": "API_TOKEN" }
    }
  ],
  "runtime": {
    "type": "python",
    "version": "3.11",
    "entrypoint": "main:run"
  },
  "security": {
    "sandbox": "container",
    "tls_required": true
  },
  "observability": {
    "log_level": "info",
    "metrics_enabled": true,
    "audit_events": ["tool.call", "message.send"]
  }
}
```

Spec: https://jsonagents.org/ / https://github.com/JSON-AGENTS/Standard

---

## Execution Log (agent_log.json)

Structured timestamped entries:
```json
{
  "entries": [
    {
      "timestamp": "2026-03-13T12:00:00Z",
      "action": "tool.call",
      "tool": "uniswap_swap",
      "parameters": { "tokenIn": "...", "amount": "..." },
      "result": { "txHash": "0x...", "status": "success" },
      "duration_ms": 1500
    }
  ]
}
```

---

## Key URLs
- EIP: https://eips.ethereum.org/EIPS/eip-8004
- Contracts: https://github.com/erc-8004/erc-8004-contracts
- Discussion: https://ethereum-magicians.org/t/erc-8004-trustless-agents/25098
- JSON Agents Spec: https://jsonagents.org/
