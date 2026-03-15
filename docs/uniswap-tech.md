# Uniswap — Complete Technical Reference

## AI Skills Overview

Seven open-source Skills for AI agents to operate on Uniswap protocol.

### Installation
```bash
npx skills add Uniswap/uniswap-ai
# Or Claude Code Marketplace:
/plugin marketplace add uniswap/uniswap-ai
```

### Individual Plugins
| Plugin | Install | Purpose |
|--------|---------|---------|
| `uniswap-hooks` | `/plugin install uniswap-hooks` | v4 hook development |
| `uniswap-trading` | `/plugin install uniswap-trading` | Swap integration |
| `uniswap-cca` | `/plugin install uniswap-cca` | CCA auctions |
| `uniswap-driver` | `/plugin install uniswap-driver` | Swap & liquidity planning |
| `uniswap-viem` | `/plugin install uniswap-viem` | EVM integration (viem/wagmi) |

Or: `npx skills add uniswap/uniswap-ai --skill swap-integration`

### GitHub
- Skills: https://github.com/Uniswap/uniswap-ai
- AI Toolkit: https://github.com/Uniswap/ai-toolkit

---

## Trading API

### Setup
1. Create account at https://developers.uniswap.org/dashboard/
2. Generate API key
3. All calls require `x-api-key` header

### Base URL
`https://trade-api.gateway.uniswap.org/v1`

### Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/check_approval` | POST | Check if token approval needed |
| `/quote` | POST | Generate swap quote with routing |
| `/swap` | POST | Build AMM transaction (CLASSIC, WRAP, UNWRAP, BRIDGE) |
| `/order` | POST | Create UniswapX order (DUTCH_V2, V3, PRIORITY) |
| `/swaps` | GET | Monitor AMM transaction status |
| `/orders` | GET | Monitor UniswapX order status |
| `/swap_5792` | POST | Batch transactions (EIP-5792) |
| `/swap_7702` | POST | Delegated transactions (EIP-7702) |

### Rate Limits
- Unauth: 60 req/hr
- Auth (API key): 5,000 req/hr
- 429 → exponential backoff with jitter, cache 30s

### Supported Chain IDs
1 (Ethereum), 10 (Optimism), 56 (BSC), 137 (Polygon), 324 (zkSync), 8453 (Base), 42161 (Arbitrum), 42220 (Celo), 43114 (Avalanche), 59144 (Linea), 81457 (Blast), 7777777 (Zora), 84532 (Base Sepolia), 11155111 (Sepolia), + more (21+ chains)

---

## check_approval Endpoint

**POST** `/check_approval`

```json
{
  "walletAddress": "0x...",
  "token": "0x...",
  "amount": "1000000",
  "chainId": 8453
}
```

Optional: `urgency` ("normal"/"fast"/"urgent"), `includeGasInfo`, `tokenOut`, `tokenOutChainId`

Response: `approval` (TransactionRequest | null), `cancel` (TransactionRequest | null)

---

## quote Endpoint

**POST** `/quote`

```json
{
  "type": "EXACT_INPUT",
  "amount": "1000000",
  "tokenInChainId": 8453,
  "tokenOutChainId": 8453,
  "tokenIn": "0x...",
  "tokenOut": "0x...",
  "swapper": "0x..."
}
```

Optional:
- `slippageTolerance` (0-100%) or `autoSlippage: "DEFAULT"`
- `routingPreference`: `"BEST_PRICE"` | `"FASTEST"`
- `protocols`: `[V2, V3, V4, UNISWAPX, UNISWAPX_V2, UNISWAPX_V3]`
- `hooksOptions`: `"V4_HOOKS_INCLUSIVE"` | `"V4_HOOKS_ONLY"` | `"V4_NO_HOOKS"`
- `urgency`, `permitAmount`, `integratorFees`

Response: `routing` type + quote object + `permitData` (if Permit2 needed)

---

## swap Endpoint

**POST** `/swap`

```json
{
  "quote": { /* from /quote response */ },
  "signature": "0x...",
  "permitData": { /* from /quote response */ }
}
```

Response: TransactionRequest (`to`, `from`, `data`, `value`, `gasLimit`, `chainId`)

---

## order Endpoint

**POST** `/order` — for UniswapX routes (DUTCH_V2, V3, PRIORITY)

Takes `encodedOrder`, `orderId`, and signature from the quote response.

---

## Integration Flow

1. **Check Approval** → POST `/check_approval`
2. **Get Quote** → POST `/quote`
3. **Handle Permit2** → Sign `permitData` if returned (EIP-712)
4. **Build Transaction** → POST `/swap` (CLASSIC) or POST `/order` (UniswapX)
5. **Broadcast** → Sign and submit via RPC
6. **Monitor** → GET `/swaps` or `/orders`

### Permit2 Flow
1. Quote returns `permitData` (EIP-712 typed data)
2. Sign: `wallet._signTypedData(permitData.domain, permitData.types, permitData.values)`
3. Submit signature + permitData with quote to `/swap`
4. Disable with `x-permit2-disabled: true` header

---

## Uniswap v4 Hooks

### Architecture
- Single `PoolManager.sol` (singleton) manages all pools
- Flash accounting via EIP-1153 transient storage
- Native ETH support (no WETH wrapping)

### 14 Hook Callbacks
| Hook | When |
|------|------|
| `beforeInitialize` | Before pool creation |
| `afterInitialize` | After pool creation |
| `beforeAddLiquidity` | Before LP adds |
| `afterAddLiquidity` | After LP adds |
| `beforeRemoveLiquidity` | Before LP removes |
| `afterRemoveLiquidity` | After LP removes |
| `beforeSwap` | Before swap |
| `afterSwap` | After swap |
| `beforeDonate` | Before donation |
| `afterDonate` | After donation |
| `beforeSwapReturnDelta` | Custom swap amounts |
| `afterSwapReturnDelta` | Custom swap amounts |
| `afterAddLiquidityReturnDelta` | Custom liquidity amounts |
| `afterRemoveLiquidityReturnDelta` | Custom liquidity amounts |

Hook address encodes callbacks in last 14 bits. Extend `BaseHook` from v4-periphery.

---

## Error Codes

| Status | Meaning |
|--------|---------|
| 400 | Invalid input |
| 401 | Bad API key / blocked |
| 404 | Quote too low / insufficient balance |
| 429 | Rate limited |
| 500 | Internal error |

---

## Best Practices
- Refresh quotes older than 30 seconds
- Slippage: 0.05-0.5% stables, 0.5-1% production, 1-5% volatile
- UniswapX minimums: Mainnet 300 USDC, L2 1000 USDC
- UniswapX v2 chains: Ethereum, Arbitrum, Base
- Cache responses 30s, batch requests

---

## Key URLs
- Dev Platform: https://developers.uniswap.org/dashboard/
- API Docs: https://api-docs.uniswap.org
- Integration Guide: https://api-docs.uniswap.org/guides/integration_guide
- API Reference: https://api-docs.uniswap.org/api-reference/swapping/approval
- OpenAPI Spec: https://trade-api.gateway.uniswap.org/v1/api.json
- Protocol Docs: https://docs.uniswap.org
- v4 Hooks: https://docs.uniswap.org/concepts/protocol/hooks
- v4 Contracts: https://docs.uniswap.org/contracts/v4/overview
- Unichain: https://docs.unichain.org
- AI Skills: https://github.com/Uniswap/uniswap-ai
