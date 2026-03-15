# Bankr — Complete Technical Reference

## Overview
Two products: (a) LLM Gateway — unified multi-provider LLM API with auto-failover, (b) Agent API — wallets + on-chain execution, (c) Token Launching — agents deploy tokens and earn trading fees.

---

## 1. LLM Gateway

### Base URL & Auth
- **Base URL:** `https://llm.bankr.bot`
- **Auth:** `X-API-Key: bk_YOUR_API_KEY` or `Authorization: Bearer bk_YOUR_API_KEY`
- **Key generation:** bankr.bot/api or via CLI login

### Endpoints

| Method | Endpoint | Format | Purpose |
|--------|----------|--------|---------|
| POST | `/v1/chat/completions` | OpenAI-compatible | Chat completions |
| POST | `/v1/messages` | Anthropic-compatible | Messages API |
| GET | `/v1/models` | JSON | List models |
| GET | `/v1/usage?days=30` | JSON | Usage/cost breakdown |
| GET | `/health` | JSON (no auth) | Provider health |

### Supported Models

**Claude:** `claude-opus-4.6` (200K), `claude-sonnet-4.6` (200K), `claude-haiku-4.5` (200K)
**Gemini:** `gemini-3-pro` (2M), `gemini-3-flash` (1M), `gemini-2.5-pro` (1M)
**GPT:** `gpt-5.2` (262K), `gpt-5.2-codex` (262K), `gpt-5-mini` (128K), `gpt-5-nano` (128K)
**Other:** `kimi-k2.5` (128K), `qwen3-coder` (128K)

### Routing
- Claude/Gemini: Vertex AI (primary) → OpenRouter (fallback)
- GPT/Kimi/Qwen: OpenRouter only

### Rate Limits
60 req/min

### Error Codes
| Code | Meaning |
|------|---------|
| 401 | Invalid API key |
| 402 | Insufficient credits |
| 429 | Rate limit (60/min) |
| 500 | Internal error |

### SDK Compatibility (Drop-in)
```python
# OpenAI SDK
client = OpenAI(base_url="https://llm.bankr.bot/v1", api_key="bk_...")

# Anthropic SDK
client = Anthropic(base_url="https://llm.bankr.bot", api_key="bk_...")
```

### Credit System
- New accounts: **$0 credits** (no free tier)
- Top-up: USDC, ETH, BNKR, or other ERC-20s on Base
- Manage: bankr.bot/llm?tab=credits
- CLI: `bankr llm credits add 25`

---

## 2. Agent API (Wallets + On-Chain Execution)

### Base URL & Auth
- **Base URL:** `https://api.bankr.bot`
- **Auth:** Same `bk_...` key with `agentApiEnabled` flag

### Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/agent/prompt` | Submit natural language prompt → jobId + threadId |
| GET | `/agent/job/{jobId}` | Poll job status |
| POST | `/agent/job/{jobId}/cancel` | Cancel job |
| GET | `/agent/balances?chains=base,solana` | Wallet balances |
| POST | `/agent/sign` | Sign messages, EIP-712, transactions |
| POST | `/agent/submit` | Submit raw transactions |
| GET/POST/PUT/DELETE | `/agent/profile` | Agent profile CRUD |

### Async Job Workflow
1. POST `/agent/prompt` → `{jobId, threadId}`
2. Poll GET `/agent/job/{jobId}` every ~2s
3. Read completed result
4. Reuse `threadId` for multi-turn

### Rate Limits
- Standard: 100 messages/day
- Bankr Club: 1,000 messages/day

### Wallet Provisioning
Automatic on account creation:
- **EVM:** Base, Ethereum, Polygon, Unichain
- **Solana:** auto-provisioned
- Managed via Privy
- **Gas sponsored** by Bankr on all chains

---

## 3. Token Launching

### Methods
- Natural language via Terminal/CLI/Twitter (@bankrbot)
- CLI: `bankr launch --name "MyToken" --image "..." --yes`
- Programmatic via Agent API prompt

### Token Parameters
- Chain: Base (via Clanker/Doppler)
- Fixed supply: 100B (non-mintable)
- Swap fee: 1.2% on Uniswap V4 pool
- Required: token name only
- Optional: image, tweet, website, fee recipient

### Fee Distribution (Base)
| Recipient | Share |
|-----------|-------|
| Creator/Agent | 57% |
| Bankr | 36.1% |
| Ecosystem | 1.9% |
| Doppler protocol | 5% |

### Deployment Limits
- Standard: 50 tokens/day
- Bankr Club: 100 tokens/day
- Gas sponsored within limits

### Solana Token Launching (via LaunchLab)
- SPL token deployment with bonding curve
- Auto-migration to CPMM
- Fee Key NFTs: 50% LP trading fees post-migration

---

## 4. Self-Sustaining Economics (The Flywheel)

1. Agent gets cross-chain wallets (auto-provisioned, gas-sponsored)
2. Agent deploys token on Base
3. Users trade → 1.2% swap fees
4. Agent receives 57% of fees
5. Fees top up LLM Gateway credits
6. Credits fund inference (Claude, GPT, Gemini...)
7. Cycle repeats

- **Agent API charges no per-request fees**
- **Gas fully sponsored**
- Revenue: Under $1/day to $100+/day depending on volume
- Auto top-up: configurable threshold

---

## 5. DeFi Capabilities

- Token swaps (buy/sell across 5 chains)
- Cross-chain bridging
- Limit orders, stop-loss
- DCA, TWAP
- Leverage: up to 50x crypto, 100x forex (via Avantis on Base)
- Polymarket betting
- NFT operations
- Raw transaction submission
- ENS management
- Trade execution via **0x** routing

---

## 6. Supported Chains

| Chain | Token | Gas |
|-------|-------|-----|
| **Base** | ETH | Sponsored |
| **Ethereum** | ETH | Sponsored |
| **Polygon** | MATIC | Sponsored |
| **Unichain** | ETH | Sponsored |
| **Solana** | SOL | Sponsored |

---

## 7. Installation & Setup

### CLI
```bash
npm install -g @bankr/cli
# or
bun install -g @bankr/cli
```

### Login
```bash
bankr login email user@example.com
bankr login email user@example.com --code OTP --accept-terms --key-name "My Agent" --llm
```

### OpenClaw Skill
```bash
npx skills add https://github.com/bankrbot/openclaw-skills --skill bankr
```

### Claude Code Integration
```bash
bankr llm setup claude   # Prints env vars
bankr llm claude [args]  # Launch through gateway
```

### Environment Variables
| Variable | Purpose | Default |
|----------|---------|---------|
| `BANKR_API_KEY` | Agent API key | — |
| `BANKR_API_URL` | Agent endpoint | `https://api.bankr.bot` |
| `BANKR_LLM_KEY` | LLM Gateway key | Falls back to API key |
| `BANKR_LLM_URL` | LLM endpoint | `https://llm.bankr.bot` |

---

## 8. Code Examples

### OpenAI Format
```bash
curl https://llm.bankr.bot/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "X-API-Key: bk_YOUR_API_KEY" \
  -d '{"model":"claude-opus-4.6","messages":[{"role":"user","content":"Hello!"}],"temperature":0.7,"max_tokens":1024}'
```

### Anthropic Format
```bash
curl https://llm.bankr.bot/v1/messages \
  -H "Content-Type: application/json" \
  -H "X-API-Key: bk_YOUR_API_KEY" \
  -d '{"model":"claude-opus-4.6","max_tokens":1024,"messages":[{"role":"user","content":"Hello!"}]}'
```

### Fee Collection Automation
```javascript
async function collectFees() {
  const fees = await executePrompt('check fees for MyToken');
  await executePrompt('claim my fees for MyToken');
}
setInterval(collectFees, 24 * 60 * 60 * 1000);
```

---

## 9. Key Docs URLs
- Main: https://docs.bankr.bot/
- LLM Gateway: https://docs.bankr.bot/llm-gateway/overview
- API Reference: https://docs.bankr.bot/llm-gateway/api-reference
- Models: https://docs.bankr.bot/llm-gateway/models
- Token Launching: https://docs.bankr.bot/token-launching/overview
- Self-sustaining guide: https://docs.bankr.bot/guides/self-sustaining-agent/
- API keys: https://bankr.bot/api
- Credits: https://bankr.bot/llm

## 10. GitHub Repos
- Skills: github.com/BankrBot/skills
- OpenClaw Skills: github.com/BankrBot/openclaw-skills
- Token Strategist: github.com/BankrBot/token-strategist
- Trading Engine Example: github.com/BankrBot/trading-engine-api-example
- x402 CLI Example: github.com/BankrBot/x402-cli-example
