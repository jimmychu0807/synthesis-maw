# Celo — Complete Technical Reference

## What It Is
Ethereum L2 built on OP Stack with EigenDA for data availability. Migrated from L1 on March 26, 2025. Jello hardfork (Dec 2025) added ZK proofs via OP Succinct Lite.

## Key Differentiators
- **Fee abstraction (native):** Pay gas in stablecoins (cUSD, cEUR, USDC, USDT) via `feeCurrency` field. No Paymasters needed.
- **1-second block times**, sub-cent txns (~$0.0005)
- **Token duality:** CELO is both native gas token and ERC-20
- **Mobile-first:** MiniPay wallet, phone-number attestations
- **30M gas limit** per block

## Network Configuration

| Parameter | Mainnet | Celo Sepolia |
|---|---|---|
| **Chain ID** | 42220 | 11142220 |
| **RPC** | `https://forno.celo.org` | `https://forno.celo-sepolia.celo-testnet.org` |
| **Explorer** | celoscan.io / explorer.celo.org | celo-sepolia.blockscout.com |

## Faucets
- https://faucet.celo.org/celo-sepolia
- https://cloud.google.com/application/web3/faucet/celo/sepolia
- Testnet bridge: https://testnets.superbridge.app

## Stablecoin Addresses (Mainnet)

| Token | Address |
|---|---|
| **cUSD** | `0x765DE816845861e75A25fCA122bb6898B8B1282a` |
| **cEUR** | `0xD8763CBa276a3738E6DE85b4b3bF5FDed6D6cA73` |
| **cREAL** | `0xe8537a3d056DA446677B9E9d6c5dB704EaAb4787` |
| **USDC** | `0xcebA9300f2b948710d2653dD7B07f33A8B32118C` |
| **USDT** | `0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e` |
| **CELO** | `0x471ece3750da237f93b8e339c536989b8978a438` |

## Fee Abstraction
- Transaction type `0x7b` (CIP-64, decimal 123)
- 18-decimal tokens (cUSD, cEUR, cREAL): `feeCurrency` = token address
- 6-decimal tokens (USDC, USDT): `feeCurrency` = adapter address:
  - USDC adapter: `0x2F25deB3848C207fc8E0c34035B3Ba7fC157602B`
  - USDT adapter: `0x0e2a3e05bc9a16f5292a6170456a710cb89c6f72`
- **viem** is the only library with native `feeCurrency` support
- ~50,000 additional gas overhead for non-CELO currencies

## Deploying Contracts
Standard EVM tooling: Hardhat, Remix, thirdweb, Foundry. `celo-composer` starter project.

## SDKs
- **viem** (recommended, native Celo support)
- ethers.js, web3.js (work but no feeCurrency)
- wagmi (React)
- @celo/contractkit (legacy)

## Key URLs
- Docs: https://docs.celo.org
- L2 Docs: https://docs.celo.org/cel2
- Developer: https://docs.celo.org/developer
- Fee Abstraction: https://docs.celo.org/developer/fee-abstraction
