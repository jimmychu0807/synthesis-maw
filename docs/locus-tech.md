# Locus — Complete Technical Reference

## What It Is
Payment infrastructure for autonomous AI agents. Unified USDC balance for wallets, API access, deployments, checkout. Smart wallets with spending limits, escrow, policy enforcement, audit trails. **Y Combinator F25** backed.

Founded by Cole Dermott (ex-Coinbase) and Eliot Lee (ex-Scale AI).

## Chain & Assets
- **Primary:** USDC on **Base**
- Non-custodial smart wallets with sponsored gas
- ACH/wire transfers coming soon

## Core Features
- AI Agent Payments (programmatic USDC)
- USDC Escrow (freelance/task-based)
- Spending Limits (per-tx and per-day caps)
- Policy Enforcement (agent identities tied to permission groups)
- Audit Trails (who got paid, when, why, with justification)

## Platform Capabilities
1. **Wallets** — Smart wallets on Base, gas sponsored, subwallet support
2. **Payments** — USDC to addresses or email; Venmo/PayPal via Laso Finance
3. **Checkout** — Stripe-style SDK (`@withlocus/checkout-react`), inline/popup/redirect
4. **Wrapped APIs** — Third-party APIs with per-use USDC billing
5. **Deployment** — Containerized services to AWS via API or git push
6. **Agent Self-Registration** — Agents register themselves programmatically

## MCP Integration
- **Endpoint:** `https://mcp.paywithlocus.com/mcp`
- **Auth:** Bearer token (Locus API key, prefix `locus_`)
- Works with Claude Desktop, Cursor, n8n, any MCP client
- **Tools:** send payments, check balances, list tokens, approve spending, scan emails, initiate payments
- Dynamic toolsets per permission group

## Spending Controls
- Per-transaction maximums (e.g., $50 per payout)
- Daily spending limits (e.g., $500/day)
- Justification requirements (reason for each payment)
- Permission groups with budgets and approval flows
- Least-privilege API keys

## Checkout SDK
```bash
npm install @withlocus/checkout-react
```
Session-based: merchant creates session → amount + description + webhook URL. Statuses: PENDING, PAID, EXPIRED (30min), CANCELLED.

## Integration Steps
1. Sign up at app.paywithlocus.com (get **$10 free USDC**)
2. Deploy wallet from dashboard
3. Create agent, assign permissions/spending limits
4. Generate API key for agent
5. Use via REST API or MCP endpoint
6. Discovery: `mcporter list locus --schema`

## Setup via mcporter
```bash
mcporter install check
mcporter config add
mcporter list
```

## Key URLs
- Website: https://paywithlocus.com
- Docs: https://docs.paywithlocus.com
- App/Dashboard: https://app.paywithlocus.com
- MCP: `https://mcp.paywithlocus.com/mcp`
- Discord: discord.gg/TGnjUceXwE
