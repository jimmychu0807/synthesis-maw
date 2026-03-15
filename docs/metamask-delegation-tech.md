# MetaMask Delegation Framework — Complete Technical Reference

## What It Is
Audited smart contracts enabling **scoped, rule-based permission sharing for smart accounts**. One account (delegator) grants another (delegate) permission to perform specific on-chain actions. Delegations signed **off-chain**, cryptographically bound to delegate. Built on **ERC-7710** standard.

Renamed from "Delegation Toolkit" to **Smart Accounts Kit** (`@metamask/smart-accounts-kit`).

## Key Standards
| Standard | Purpose |
|----------|---------|
| ERC-7710 | Smart contract delegation interface |
| ERC-7715 | Grant permissions from wallets (`wallet_grantPermissions`) |
| ERC-4337 | Account abstraction |
| EIP-7702 | EOA-to-SCA temporary delegation |

---

## ERC-7710: Delegation Interface

```solidity
interface ERC7710Manager {
    function redeemDelegations(
        bytes[] calldata _permissionContexts,
        bytes32[] calldata _modes,
        bytes[] calldata _executionCallData
    ) external;
}
```

**Roles:** Delegator (creates), Delegation Manager (validates), Delegate/Redeemer (exercises)

## ERC-7715: wallet_grantPermissions

JSON-RPC method for dapps to request scoped permissions from MetaMask:
1. Dapp calls `wallet_grantPermissions`
2. MetaMask shows human-readable confirmation
3. User approves → `permissionsContext` returned
4. Dapp redeems via ERC-7710

**Permission types:** ERC-20 periodic, ERC-20 streaming, native token periodic, native token streaming.

**Currently Sepolia only** (requires MetaMask Flask).

---

## Installation

### CLI Scaffolding
```bash
npx create-gator-app@latest
```
Templates: Smart Accounts Starter, Delegation Starter, Farcaster Mini App, ERC-7715 Permissions.
Options: Next.js or Vite-React, npm/yarn/pnpm.
Flags: `--add-web3auth`, `--add-llm-rules` (Cursor/Windsurf)

### NPM Package
```bash
npm i @metamask/delegation-toolkit
# or
npm i @metamask/smart-accounts-kit
```
Prerequisites: Node.js v18+, Viem (peer dep), Foundry (custom enforcers)

---

## Key Exports

```typescript
import {
  toMetaMaskSmartAccount,
  Implementation,
  createDelegation,
  createOpenDelegation,
  createCaveatBuilder,
  getSmartAccountsEnvironment,
  createExecution,
  ExecutionMode,
} from "@metamask/delegation-toolkit";

import { DelegationManager } from "@metamask/delegation-toolkit/contracts";
```

## Smart Account Types
- **HybridDeleGator** — EOA + P256 (passkey) signers
- **MultiSigDeleGator** — Multi-signature
- **EIP7702StatelessDeleGator** — EOA upgrades (no UUPS proxy)

---

## Delegation Structure

```typescript
type Delegation = {
  delegate: Hex;      // Address receiving delegation
  delegator: Hex;     // Address granting delegation
  authority: Hex;     // Parent delegation hash, or ROOT_AUTHORITY
  caveats: Caveat[];  // Restrictions
  salt: Hex;
  signature: Hex;     // Delegator's signature
}
```

---

## Sub-Delegations (Chains)

Delegate can pass permissions to third party:
- Caveats are **accumulative** — can only add restrictions, never remove
- Original delegator can **revoke at any time**, invalidating entire chain

```typescript
// Root: Alice → Bob
const delegation = createDelegation({
  to: bobAddress,
  from: aliceAddress,
  caveats: [],
});

// Sub: Bob → Carol
const subDelegation = createDelegation({
  to: carolAddress,
  from: bobAddress,
  parentDelegation: getDelegationHashOffchain(signedDelegation),
  caveats: [], // Can ADD more restrictions
});
```

---

## Full Lifecycle Example

### 1. Setup
```typescript
import { createPublicClient, http } from "viem";
import { sepolia as chain } from "viem/chains";
import { createBundlerClient } from "viem/account-abstraction";

const publicClient = createPublicClient({ chain, transport: http() });
const bundlerClient = createBundlerClient({
  client: publicClient,
  transport: http("https://your-bundler-rpc.com"),
});
```

### 2. Create Smart Accounts
```typescript
import { Implementation, toMetaMaskSmartAccount } from "@metamask/smart-accounts-kit";
import { privateKeyToAccount } from "viem/accounts";

const aliceSmartAccount = await toMetaMaskSmartAccount({
  client: publicClient,
  implementation: Implementation.Hybrid,
  deployParams: [aliceAccount.address, [], [], []],
  deploySalt: "0x",
  signer: { account: aliceAccount },
});
```

### 3. Create Delegation with Spending Scope
```typescript
const delegation = createDelegation({
  to: bobSmartAccount.address,
  from: aliceSmartAccount.address,
  environment: aliceSmartAccount.environment,
  scope: {
    type: "erc20TransferAmount",
    tokenAddress: "0x...", // USDC
    maxAmount: parseUnits("10", 6),
  },
});
```

### 4. Sign
```typescript
const signature = await aliceSmartAccount.signDelegation({ delegation });
const signedDelegation = { ...delegation, signature };
```

### 5. Redeem (Bob Executes)
```typescript
const callData = encodeFunctionData({
  abi: erc20Abi,
  functionName: "transfer",
  args: [bobSmartAccount.address, parseUnits("1", 6)],
});

const redeemCalldata = DelegationManager.encode.redeemDelegations({
  delegations: [[signedDelegation]],
  modes: [ExecutionMode.SingleDefault],
  executions: [[createExecution({ target: tokenAddress, callData })]],
});

await bundlerClient.sendUserOperation({
  account: bobSmartAccount,
  calls: [{ to: bobSmartAccount.address, data: redeemCalldata }],
});
```

### 6. Revoke
```typescript
const disableData = DelegationManager.encode.disableDelegation({ delegation });
await bundlerClient.sendUserOperation({
  account: aliceSmartAccount,
  calls: [{ to: environment.DelegationManager, data: disableData }],
});
```

---

## All 30+ Caveat Enforcers

| Caveat Type | Description |
|------------|-------------|
| `allowedCalldata` | Restrict calldata patterns |
| `allowedMethods` | Limit callable methods (selector/ABI) |
| `allowedTargets` | Limit target addresses |
| `argsEqualityCheck` | Verify argument equality |
| `blockNumber` | Block number range |
| `deployed` | Check contract deployed |
| `erc20BalanceChange` | Validate ERC-20 balance changes |
| `erc20PeriodTransfer` | Per-period ERC-20 limit |
| `erc20Streaming` | Linear streaming ERC-20 limit |
| `erc20TransferAmount` | Max ERC-20 transfer |
| `erc721BalanceChange` | ERC-721 balance changes |
| `erc721Transfer` | ERC-721 transfer control |
| `erc1155BalanceChange` | ERC-1155 balance changes |
| `exactCalldata` | Exact calldata match |
| `exactCalldataBatch` | Exact calldata batch match |
| `exactExecution` | Exact execution match |
| `exactExecutionBatch` | Exact execution batch match |
| `id` | Identity enforcer |
| `limitedCalls` | Max execution count (one-time use) |
| `multiTokenPeriod` | Multi-token periodic limits |
| `nativeBalanceChange` | Native token balance changes |
| `nativeTokenPayment` | Native payment enforcement |
| `nativeTokenPeriodTransfer` | Per-period native limit |
| `nativeTokenStreaming` | Linear streaming native limit |
| `nativeTokenTransferAmount` | Max native transfer |
| `nonce` | Nonce-based enforcement |
| `ownershipTransfer` | Ownership transfer control |
| `redeemer` | Restrict who can redeem |
| `timestamp` | Time window (`afterThreshold`, `beforeThreshold`) |
| `valueLte` | Limit native value |

### CaveatBuilder (Multiple Caveats)
```typescript
const builder = createCaveatBuilder()
  .addCaveat("allowedTargets", [contractAddress])
  .addCaveat("allowedMethods", ["transfer(address,uint256)"])
  .addCaveat("limitedCalls", 1)
  .addCaveat("timestamp", { afterThreshold: now, beforeThreshold: now + 7*86400 });
```

---

## ZK + Delegations

No established standard yet, but architecture supports:
1. Custom `CaveatEnforcer` that verifies ZK proof on-chain (Groth16 verifier in `beforeHook`)
2. ERC-7710 accepts arbitrary `_permissionContexts` bytes — ZK proof can serve as delegation proof
3. Use cases: private delegation proofs, conditional execution with privacy, verifiable agent computation

---

## Supported Chains

### Mainnets (v1.3.0)
Ethereum, Polygon, BSC, Optimism, Arbitrum One/Nova, Linea, **Base**, Gnosis, Berachain, Unichain, Ink, Sei, Sonic, Monad, MegaETH, Ronin, **Celo**

### Testnets
Sepolia, Base Sepolia, Linea Sepolia, Polygon Amoy, Arbitrum Sepolia, + many more

Works on **any EVM chain** with a bundler.

---

## Contract Addresses (Same Across All Chains — CREATE2)

| Contract | Address |
|----------|---------|
| **DelegationManager** | `0xdb9B1e94B5b69Df7e401DDbedE43491141047dB3` |
| SimpleFactory | `0x69Aa2f9fe1572F1B640E1bbc512f5c3a734fc77c` |
| HybridDeleGatorImpl | `0x48dBe696A4D990079e039489bA2053B36E8FFEC4` |
| MultiSigDeleGatorImpl | `0x56a9EdB16a0105eb5a4C54f4C062e2868844f3A7` |
| EIP7702StatelessDeleGatorImpl | `0x63c0c19a282a1B52b07dD5a65b58948A07DAE32B` |
| AllowedTargetsEnforcer | `0x7F20f61b1f09b08D970938F6fa563634d65c4EeB` |
| AllowedMethodsEnforcer | `0x2c21fD0Cb9DC8445CB3fb0DC5E7Bb0Aca01842B5` |
| ERC20TransferAmountEnforcer | `0xf100b0819427117EcF76Ed94B358B1A5b5C6D2Fc` |
| ERC20PeriodTransferEnforcer | `0x474e3Ae7E169e940607cC624Da8A15Eb120139aB` |
| TimestampEnforcer | `0x1046bb45C8d673d4ea75321280DB34899413c069` |
| LimitedCallsEnforcer | `0x04658B29F6b82ed55274221a06Fc97D318E25416` |
| NativeTokenTransferAmountEnforcer | `0xF71af580b9c3078fbc2BBF16FbB8EEd82b330320` |
| EntryPoint (ERC-4337) | `0x0000000071727De22E5E9d8BAf0edAc6f37da032` |

---

## AI Agent Integration Pattern

### Architecture
1. User creates smart account (MetaMask or programmatic)
2. User grants delegation to agent's address with scoped caveats
3. Agent operates within bounds — constructs txns, redeems delegations
4. User retains full control — revoke anytime
5. Multi-hop: agent can sub-delegate to specialized agents

### Recommended Caveats for AI Agents
- `allowedTargets` — restrict to specific contracts
- `allowedMethods` — restrict to specific functions
- `erc20TransferAmount` / `nativeTokenTransferAmount` — cap spending
- `timestamp` — time-bound
- `limitedCalls` — limit total actions
- `erc20PeriodTransfer` — rate-limiting

### Browser-Based (ERC-7715)
```
Agent → wallet_grantPermissions → MetaMask UI → User approves → permissionsContext → Agent redeems
```

### Backend/Headless (Direct Delegation)
```
User signs delegation off-chain → Stored (DB/IPFS) → Agent retrieves → Agent calls DelegationManager.redeemDelegations
```

---

## Key URLs
- Docs: https://docs.metamask.io/delegation-toolkit/
- Smart Accounts Kit: https://docs.metamask.io/smart-accounts-kit/
- GitHub (Framework): https://github.com/MetaMask/delegation-framework
- GitHub (Toolkit): https://github.com/MetaMask/delegation-toolkit
- npm: https://www.npmjs.com/package/@metamask/delegation-toolkit
- CLI: `npx create-gator-app@latest`
- LLM Context: https://docs.gator.metamask.io/get-started/delegation-toolkit-llm-context
- Audit: https://diligence.security/audits/2024/08/metamask-delegation-framework/
- Dev Portal: https://metamask.io/developer/delegation-toolkit
- Pimlico Guide: https://docs.pimlico.io/guides/how-to/accounts/use-metamask-account
