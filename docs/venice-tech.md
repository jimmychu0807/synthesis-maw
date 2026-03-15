# Venice AI — Complete Technical Reference

## API Fundamentals

### Base URL & Authentication
- **Base URL:** `https://api.venice.ai/api/v1`
- **Auth:** `Authorization: Bearer $VENICE_API_KEY`
- **API Key management:** https://venice.ai/settings/api
- **Env var:** `VENICE_API_KEY`

### OpenAI Compatibility
Drop-in replacement. Change 3 things:
1. `base_url` → `https://api.venice.ai/api/v1`
2. API key → Venice API key
3. Model IDs → Venice model IDs

Works with OpenAI SDKs in Python, TypeScript/Node.js, Go, PHP, C#, Java, Swift.

---

## All API Endpoints

### Chat & Text
| Method | Path | Description |
|--------|------|-------------|
| POST | `/chat/completions` | Text generation, vision, streaming, tool/function calling |
| GET | `/models` | List available models |
| GET | `/models/traits` | Model capabilities |
| GET | `/models/compatibility_mapping` | OpenAI model name mappings |

### Image
| Method | Path | Description |
|--------|------|-------------|
| POST | `/image/generate` | Text-to-image |
| POST | `/image/upscale` | 2x or 4x resolution |
| POST | `/image/edit` | Inpaint/modify |
| POST | `/image/multi-edit` | Layered editing |
| POST | `/image/background-remove` | Background removal |
| GET | `/image/styles` | Style presets |
| POST | `/images/generations` | OpenAI-compatible image endpoint |

### Audio
| Method | Path | Description |
|--------|------|-------------|
| POST | `/audio/speech` | Text-to-speech (50+ voices) |
| POST | `/audio/transcriptions` | Speech-to-text |
| POST | `/audio/queue` | Queue async audio |
| POST | `/audio/retrieve` | Poll status |

### Video
| Method | Path | Description |
|--------|------|-------------|
| POST | `/video/queue` | Queue video generation |
| POST | `/video/retrieve` | Check status |

### Embeddings
| POST | `/embeddings` | Text embeddings (e.g., `text-embedding-bge-m3`) |

### Billing
| GET | `/billing/balance` | Current balance (USD + DIEM) |
| GET | `/billing/usage` | Usage data |

### API Key Management
| POST | `/api_keys` | Create key |
| GET | `/api_keys` | List keys |
| GET | `/api_keys/rate_limits` | Rate limit info |
| GET | `/api_keys/generate_web3_key` | Web3 wallet auth |

---

## Venice-Specific Parameters

Pass via `extra_body` in OpenAI SDK:

```python
extra_body={
    "venice_parameters": {
        "enable_web_search": "auto",
        "enable_web_scraping": True,
        "enable_web_citations": True,
        "strip_thinking_response": True,
        "include_venice_system_prompt": False,
    }
}
```

| Parameter | Values | Purpose |
|-----------|--------|---------|
| `enable_web_search` | `off`/`on`/`auto` | Real-time web search |
| `enable_web_scraping` | bool | Auto-scrape up to 5 URLs |
| `enable_web_citations` | bool | Source attribution |
| `strip_thinking_response` | bool | Hide reasoning chain |
| `disable_thinking` | bool | Disable reasoning entirely |
| `include_venice_system_prompt` | bool (default true) | Venice uncensored system prompt |
| `character_slug` | string | AI persona |
| `prompt_cache_key` | string | Routing hint for caching |

**Model suffix syntax:** `model_id:param1=value1&param2=value2`

---

## Response Headers

| Header | Description |
|--------|-------------|
| `x-venice-model-id` | Actual model used |
| `x-venice-balance-usd` | USD balance before request |
| `x-venice-balance-diem` | DIEM balance before request |
| `x-ratelimit-remaining-requests` | Requests remaining |
| `x-ratelimit-remaining-tokens` | Tokens remaining |

---

## Rate Limits

| Tier | Examples | Req/min | Tokens/min |
|------|---------|---------|-----------|
| XS | `qwen3-4b`, `llama-3.2-3b` | 500 | 1,000,000 |
| S | `mistral-31-24b`, `venice-uncensored` | 75 | 750,000 |
| M | `llama-3.3-70b`, `qwen3-next-80b` | 50 | 750,000 |
| L | `deepseek-R1`, `claude-opus-4.6`, `gpt-5.4` | 20 | 500,000 |

Image: 20/min, Audio: 60/min, Embedding: 500/min

---

## Pricing (Per 1M tokens)

| Model | Input | Output | Context |
|-------|-------|--------|---------|
| Claude Opus 4.6 | $6.00 | $30.00 | 1M |
| Claude Sonnet 4.6 | $3.60 | $18.00 | 1M |
| GPT-5.4 | $3.13 | $18.80 | 1M |
| DeepSeek V3.2 | $0.40 | $1.00 | — |
| Venice Uncensored 1.1 | $0.20 | $0.90 | 32K |
| GLM 4.7 Flash | $0.13 | $0.50 | — |
| Qwen 3 4B | cheapest | cheapest | 40K |

Web Search/Scraping: $10.00 per 1K calls

---

## "No Data Retention" — How It Works

1. **No server-side logging:** Prompts/responses never stored
2. **Proxy-based routing:** Requests routed through proxy to GPU servers without persistence. All SSL-encrypted.
3. **GPU-level isolation:** GPUs see only raw prompt text — no user data, no IPs. Data purged from GPU memory after response.
4. **Local-only chat storage:** History in browser localStorage only
5. **Metadata only:** Venice logs event metadata (sign-ins) but never content
6. **API requests:** Anonymized and follow same no-retention architecture

---

## Key Models

### Text/Chat
- **GLM 4.7** (128K ctx) — reasoning/agents, tool/function calling
- **Venice Uncensored 1.1** (32K ctx) — unfiltered
- **Mistral 3.1 24B** (131K ctx) — vision + function calling
- **Qwen 3 4B** (40K ctx) — cost-efficient
- **Claude Opus 4.6, Sonnet 4.6** — via Venice proxy
- **GPT-5.4, GPT-5.4-pro** — via Venice proxy
- **DeepSeek R1** — reasoning

### Vision/Multimodal
- `qwen3-vl-235b-a22b`, `mistral-31-24b`, `gpt-4o`

### Function/Tool Calling
Supported on: `zai-org-glm-4.7`, `mistral-31-24b`. Standard OpenAI `tools` parameter.

---

## Access Tiers

| Tier | Details |
|------|---------|
| **Free** | 1K credits on signup, content moderation, limited rates |
| **Pro** | ~$12.41/month, includes $10 one-time API credit |
| **API Credits** | Buy with credit card or crypto. Never expire |
| **DIEM Staking** | 1 DIEM = $1/day perpetual API credit. Min 0.1 DIEM |

---

## VVV Token

| Property | Detail |
|----------|--------|
| Standard | ERC-20 on Base |
| Utility | Stake for inference capacity share |
| Unstaking | 7 days |
| Deflationary | Monthly buy-and-burn from revenue |
| Burned | 33M+ tokens (~42.68% supply) |

## DIEM Token

| Property | Detail |
|----------|--------|
| Standard | ERC-20 on Base |
| Contract | `0xf4d97f2da56e8c3098f3a8d538db630a2606a024` |
| Value | 1 DIEM = $1/day perpetual API credit |
| Minting | Lock staked VVV (sVVV) |
| Trading | Aerodrome Finance DEX |

---

## Code Examples

### Python — Chat Completion
```python
from openai import OpenAI
client = OpenAI(
    api_key=os.getenv("VENICE_API_KEY"),
    base_url="https://api.venice.ai/api/v1"
)
completion = client.chat.completions.create(
    model="llama-3.3-70b",
    messages=[
        {"role": "system", "content": "You are a helpful AI assistant"},
        {"role": "user", "content": "Why is privacy important?"}
    ]
)
```

### Python — Web Search
```python
completion = client.chat.completions.create(
    model="venice-uncensored",
    messages=[{"role": "user", "content": "Latest AI developments?"}],
    extra_body={"venice_parameters": {"enable_web_search": "auto"}}
)
```

### Node.js — Chat Completion
```javascript
import OpenAI from 'openai';
const client = new OpenAI({
    apiKey: process.env.VENICE_API_KEY,
    baseURL: 'https://api.venice.ai/api/v1'
});
const completion = await client.chat.completions.create({
    model: 'venice-uncensored',
    messages: [{ role: 'user', content: 'Why is privacy important?' }]
});
```

### cURL
```bash
curl https://api.venice.ai/api/v1/chat/completions \
  -H "Authorization: Bearer $VENICE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"llama-3.3-70b","messages":[{"role":"user","content":"Hello"}]}'
```

---

## SDKs & Libraries

### Official (via OpenAI SDK)
- Python: `pip install openai`
- Node.js: `npm install openai`
- All OpenAI SDK variants work

### Third-Party
| Library | Install |
|---------|---------|
| `venice-ai` | `pip install venice-ai` (async, streaming, all endpoints) |
| `pyvenice` | `pip install pyvenice` (Pydantic models) |

### Resources
- Docs: https://docs.venice.ai
- LLMs.txt: https://docs.venice.ai/llms.txt
- Full docs: https://docs.venice.ai/llms-full.txt
- Postman: https://postman.venice.ai/
- Status: https://veniceai-status.com
- Discord: https://discord.gg/askvenice
