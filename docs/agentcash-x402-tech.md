# AgentCash / x402 Protocol — Complete Technical Reference

## What x402 Is
Open internet-native payment protocol using HTTP 402 "Payment Required" status code for programmatic per-request payments. No accounts, subscriptions, API keys, or KYC. Zero protocol fees.

**Founded by:** Coinbase, Cloudflare, Vercel, Visa, Stripe (x402 Foundation)
**Stats:** 75.41M transactions, $24.24M volume, 94K buyers, 22K sellers

## How Pay-Per-Request Works
1. Client sends request to protected endpoint
2. Server responds **402** with `PAYMENT-REQUIRED` header (price, token, recipient, network, scheme)
3. Client signs payment using wallet
4. Client retries with `PAYMENT-SIGNATURE` header
5. Server/facilitator verifies and broadcasts stablecoin tx on-chain
6. Server returns **200 OK** with data + `PAYMENT-RESPONSE` header

**Schemes:** `exact` (fixed amount) or `upto` (variable based on consumption)

## What AgentCash Is
Unified payment gateway giving AI agents a single USDC balance to access any x402 API. "One balance, every paid API."
**Stats:** 286+ endpoints, 27K+ installs, 306K+ API calls

## Installation
```bash
npx agentcash install
```

For Claude Code:
```bash
claude mcp add x402scan --scope user -- npx -y x402scan-mcp@latest
```

Also works with: Cursor, Gemini CLI, Poncho, OpenClaw

## MCP Tools (4)
1. `check_balance` — wallet address + USDC balance
2. `query_endpoint` — probe pricing/schema without paying
3. `validate_payment` — pre-flight check
4. `execute_call` — make paid API call with auto-payment

**Wallet:** Auto-generated at `~/.x402scan-mcp/wallet.json`. Override with `X402_PRIVATE_KEY` env var.

## Chains
- **Primary:** Base (USDC)
- Also: Base Sepolia, Ethereum, Optimism, Arbitrum, Polygon, Solana

## Free Tier
**$100 in initial credits** ($25 onboarding bonus minimum) via agentcash.dev

## Available Services (Stables Ecosystem)

### StableEnrich (stableenrich.dev) — Data Enrichment
| Endpoint | Price | Description |
|----------|-------|-------------|
| `POST /api/exa/search` | $0.015 | Semantic neural search |
| `POST /api/exa/find-similar` | $0.015 | Find similar pages |
| `POST /api/exa/contents` | $0.002 | Clean text extraction |
| `POST /api/exa/answer` | $0.015 | Factual answers |
| `POST /api/firecrawl/scrape` | $0.015 | Web scraping |
| `POST /api/firecrawl/search` | $0.015 | Search + scrape |
| People Enrichment | $0.015 | Contact/company data |
| Places & Location | $0.045 | Business details |
| Social Media | $0.015 | Posts, profiles |
| Contact Info | $0.030 | Phone/email |

### StableEmail (stableemail.dev) — Email
| Endpoint | Price |
|----------|-------|
| `POST /api/send` | $0.02 |
| `POST /api/subdomain/buy` | $5.00 |
| `POST /api/subdomain/send` | $0.005 |
| `POST /api/inbox/buy` | $1.00 (30d) |
| `POST /api/inbox/send` | $0.005 |
| `POST /api/inbox/messages` | $0.001 |

### StableTravel (stabletravel.dev) — Travel (Amadeus)
| Service | Price |
|---------|-------|
| Flight Search | $0.05 |
| Hotel Search | $0.03 |
| Activities | $0.05 |
| Airport Transfers | $0.003 |
| Flight Status | $0.005 |

### Other Services
- **StablePhone** (stablephone.dev) — Phone calls via Bland.ai
- **StableSocial** (stablesocial.dev) — Reddit, X/Twitter
- **AgentUpload** — S3 file upload with micropayments

## Agent Discovery
Each x402 server exposes:
- `/.well-known/mcp.json` — MCP config
- `/.well-known/agent.json` — Google A2A Agent Card
- `@x402/extensions/bazaar` — auto-catalogs endpoints

## Programmatic Integration

### Client (consuming x402 APIs)
```typescript
import { x402Client, wrapAxiosWithPayment, registerExactEvmScheme } from '@x402/axios';

const client = new x402Client();
const evmSigner = privateKeyToAccount(evmPrivateKey);
registerExactEvmScheme(client, { signer: evmSigner });

const api = wrapAxiosWithPayment(axios.create({ baseURL }), client);
// Any 402 response auto-handled with payment
```

### Server (creating x402 APIs)
```javascript
import { paymentMiddleware } from '@x402/express';

app.use(paymentMiddleware({
  "GET /weather": {
    accepts: [...],
    description: "Weather data"
  }
}));
```

### Vercel package
```bash
npm install x402-mcp
```

## x402 SDKs
| Language | Package |
|----------|---------|
| TypeScript | `@x402/axios`, `@x402/express`, `@x402/cloudflare` |
| Rust | `x402-rs` |
| .NET | `x402-dotnet` |
| Ruby | `x402-rails`, `x402-payments` |
| Solana | `x402-Solana` |
| Vercel | `x402-mcp` |
| thirdweb | `thirdweb/x402` |

## Key URLs
- AgentCash: https://agentcash.dev
- Merit Systems: https://www.merit.systems
- x402 Protocol: https://www.x402.org
- x402 GitHub: https://github.com/coinbase/x402
- x402 Docs: https://docs.cdp.coinbase.com/x402
- x402 MCP Guide: https://docs.cdp.coinbase.com/x402/mcp-server
- x402Scan: https://x402scan.com
- Awesome x402: https://github.com/Merit-Systems/awesome-x402
