# JSON Agents Spec + agent_log.json + Claude Code Hooks Research

**Date:** 2026-03-13
**Purpose:** Full specification analysis for Protocol Labs bounties ($15,968)

---

## Part 1: JSON Agents PAM Specification (agent.json)

**Source:** https://jsonagents.org / https://github.com/JSON-AGENTS/Standard
**Spec version:** 1.0
**Spec document:** `json-agents.md` (888 lines, normative)
**Schema:** JSON Schema 2020-12 at `schema/json-agents.json`
**Media type:** `application/agents+json`
**File extension:** `.agents.json`

### Root-Level Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `manifest_version` | string (const "1.0") | **MUST** | Spec version identifier |
| `profiles` | array of strings | SHOULD | Active profiles: "core", "exec", "gov", "graph" |
| `agent` | object | **MUST** | Agent identity and metadata |
| `capabilities` | array | SHOULD | Functional capabilities (7 standard types) |
| `tools` | array | MAY | External callable resources |
| `modalities` | object | SHOULD | Input/output format specs |
| `context` | object | SHOULD | Memory and windowing config |
| `runtime` | object | Required if "exec" profile | Runtime environment metadata |
| `security` | object | Required if "gov" profile* | Sandbox and security config |
| `policies` | array | Required if "gov" profile* | Behavior constraints |
| `observability` | object | Required if "gov" profile* | Logging/metrics/tracing config |
| `graph` | object | Required if "graph" profile | Multi-agent topology |
| `signatures` | array | MAY | Cryptographic signatures |
| `extensions` | object | MAY | Namespaced extensions |
| `x-*` | any | MAY | Vendor-specific extensions |

*Gov profile requires at least ONE of: `security`, `policies`, or `observability`.

### Agent Object (Required)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string (URI) | **MUST** | Globally unique identifier, `ajson://` scheme recommended |
| `name` | string | **MUST** | Human-readable name |
| `description` | string | MAY | Purpose description |
| `version` | string | MAY | Semantic version |
| `homepage` | string (URI) | MAY | Agent homepage |
| `authors` | array of objects | MAY | `{name, organization, email}` |
| `license` | string | MAY | License identifier (e.g., "Apache-2.0") |
| `tags` | array of strings | MAY | Unique string tags |

### Capability Object

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | **MUST** | Capability identifier |
| `description` | string | MAY | Explanation |
| `schema` | string (URI) | MAY | URI to formal schema |

**7 Standard Capability IDs:**
1. `summarization` -- Condensing information
2. `routing` -- Message/request direction
3. `retrieval` -- Information lookup
4. `qa` -- Question answering
5. `classification` -- Categorization
6. `extraction` -- Entity/data extraction
7. `generation` -- Content creation

### Tool Object

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | **MUST** | Stable tool identifier |
| `name` | string | **MUST** | Human-readable name |
| `type` | enum | **MUST** | "http", "function", "plugin", "system", "mcp", "custom" |
| `description` | string | MAY | |
| `endpoint` | string | MAY | URL or reference |
| `input_schema` | object | MAY | JSON Schema for inputs |
| `output_schema` | object | MAY | JSON Schema for outputs |
| `auth` | object | MAY | `{method, ref}` -- NO raw secrets |
| `metadata` | object | MAY | Implementation-specific data |

### Modalities Object

| Field | Type | Description |
|-------|------|-------------|
| `input` | array of strings | Supported input types (e.g., "text", "json", "image") |
| `output` | array of strings | Supported output types |

### Context Object

| Field | Type | Description |
|-------|------|-------------|
| `window` | integer (>=1) | Context window size |
| `strategy` | string | "rolling", "episodic", "conversation", "stateless" |
| `persistent` | boolean | Cross-session persistence |

### Runtime Object (Exec Profile)

| Field | Type | Description |
|-------|------|-------------|
| `type` | enum | "python", "node", "java", "go", "container", "wasm", "hosted", "custom" |
| `language` | string | Implementation language |
| `entrypoint` | string | Function/command/image reference |
| `env` | object | Environment variable keys |
| `resources` | object | `{cpu_cores_min, memory_mb_min, accelerator}` |

### Security Object (Gov Profile)

| Field | Type | Description |
|-------|------|-------------|
| `sandbox` | string | "process", "container", "vm", "none" |
| `network_zone` | string | Deployment classification |
| `auth_context` | string | Identity/authorization reference |
| `sensitive_data_handling` | string | Data protection policy |

### Policy Object

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | **MUST** | Policy identifier |
| `effect` | enum | **MUST** | "allow", "deny", "audit", "notify" |
| `action` | string | **MUST** | Target action (e.g., "tool.call") |
| `description` | string | MAY | |
| `where` | string | MAY | Conditional expression |

### Observability Object

| Field | Type | Description |
|-------|------|-------------|
| `log_level` | string | "debug", "info", "warn", "error" |
| `log_sink` | string | Endpoint identifier |
| `redact_sensitive` | boolean | Mask sensitive data |
| `metrics_enabled` | boolean | Metrics collection |
| `trace_enabled` | boolean | Distributed tracing |

### Graph Object (Graph Profile)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `nodes` | array (>=1) | **MUST** | Graph node objects |
| `edges` | array | MAY | Graph edge objects |
| `message_envelope` | object | MAY | `{schema: URI}` |

**Node:** `{id (required), ref (required), role, metadata}`
**Edge:** `{from (required), to (required), condition}`

### Audit Extension Schema

Located at `schema/extensions/audit.json`. Used via `x-audit` key:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `level` | enum | **YES** | "minimal", "detailed", "full" |
| `include_payloads` | boolean | no | Include serialized message payloads (default: false) |
| `destination` | string (URI) | no | External audit log sink |
| `retention_days` | integer (1-3650) | no | Days to retain (default: 30) |
| `rotation_policy` | enum | no | "daily", "weekly", "size-based" (default: "weekly") |

---

## Part 2: agent_log.json Format

### IMPORTANT FINDING: No Formal Spec Exists

The JSON Agents PAM specification at jsonagents.org defines `agent.json` (the manifest) comprehensively but does NOT define a formal `agent_log.json` schema. The spec mentions observability (log_level, log_sink, metrics, tracing) and the audit extension, but there is no normative schema for execution logs.

The `agent_log.json` requirement comes from the **Protocol Labs bounty descriptions** specifically, not from jsonagents.org. This means we have freedom to design an impressive format.

### What Protocol Labs Expects (from bounty descriptions)

From SPONSOR_TECH.md and PROPOSALS.md:
- **"Let the Agent Cook"**: "Structured execution logs -- `agent_log.json` (decisions, tool calls, retries, failures, outputs)"
- **"Agents With Receipts"**: "DevSpot Agent Compatibility -- must provide `agent.json` and `agent_log.json`"

### Recommended agent_log.json Format

Based on the bounty requirements and the PAM spec's observability section, here is the format we should use:

```json
{
  "agent_id": "ajson://team/agent-name",
  "session_id": "uuid-here",
  "start_time": "2026-03-13T12:00:00Z",
  "end_time": "2026-03-13T12:05:00Z",
  "manifest_version": "1.0",
  "entries": [
    {
      "timestamp": "2026-03-13T12:00:01Z",
      "sequence": 1,
      "action": "decision",
      "description": "Evaluating portfolio allocation strategy",
      "reasoning": "User requested privacy-preserving swap. Comparing Venice inference vs direct on-chain analysis.",
      "duration_ms": 450
    },
    {
      "timestamp": "2026-03-13T12:00:05Z",
      "sequence": 2,
      "action": "tool.call",
      "tool": "venice_inference",
      "parameters": {
        "model": "llama-3.3-70b",
        "prompt": "[redacted for privacy]"
      },
      "result": {
        "status": "success",
        "summary": "Recommended WETH->USDC swap via Uniswap v3"
      },
      "duration_ms": 2300
    },
    {
      "timestamp": "2026-03-13T12:01:00Z",
      "sequence": 3,
      "action": "safety_check",
      "check_type": "pre_transaction",
      "description": "Verifying transaction parameters before irreversible on-chain action",
      "checks_passed": ["amount_within_budget", "slippage_acceptable", "recipient_verified"],
      "result": { "status": "approved" },
      "duration_ms": 50
    },
    {
      "timestamp": "2026-03-13T12:01:05Z",
      "sequence": 4,
      "action": "tool.call",
      "tool": "uniswap_swap",
      "parameters": {
        "tokenIn": "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
        "tokenOut": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
        "amountIn": "0.01",
        "slippage": "0.5%"
      },
      "result": {
        "status": "success",
        "txHash": "0xabc123...",
        "amountOut": "25.43",
        "gasUsed": "152000"
      },
      "duration_ms": 15000
    },
    {
      "timestamp": "2026-03-13T12:01:25Z",
      "sequence": 5,
      "action": "tool.call",
      "tool": "erc8004_giveFeedback",
      "parameters": {
        "agentAddress": "0x...",
        "taskId": "swap-001",
        "score": 5,
        "comment": "Successful swap execution"
      },
      "result": {
        "status": "success",
        "txHash": "0xdef456...",
        "registry": "reputation"
      },
      "duration_ms": 8000
    },
    {
      "timestamp": "2026-03-13T12:02:00Z",
      "sequence": 6,
      "action": "retry",
      "tool": "price_feed",
      "attempt": 2,
      "error": "RPC timeout after 5000ms",
      "result": { "status": "success_on_retry" },
      "duration_ms": 3200
    },
    {
      "timestamp": "2026-03-13T12:02:30Z",
      "sequence": 7,
      "action": "failure",
      "tool": "analytics_api",
      "error": "403 Forbidden - API key expired",
      "recovery_action": "Skipped non-critical analytics, continued with cached data",
      "duration_ms": 200
    }
  ],
  "summary": {
    "total_entries": 7,
    "tool_calls": 4,
    "decisions": 1,
    "safety_checks": 1,
    "retries": 1,
    "failures": 1,
    "total_duration_ms": 29200,
    "on_chain_txns": ["0xabc123...", "0xdef456..."]
  }
}
```

### What Makes a "Good" vs "Bad" agent_log.json

**Good log entries:**
- Timestamped with ISO 8601 (UTC)
- Sequential numbering for ordering
- Categorized actions: `decision`, `tool.call`, `safety_check`, `retry`, `failure`
- Include reasoning for decisions (shows agent "thinking")
- Safety checks explicitly documented (shows guardrails)
- Retries and failures included with recovery actions (shows resilience)
- On-chain transaction hashes linked (shows verifiability)
- Duration tracking (shows compute budget awareness)
- Parameters included but sensitive data redacted

**Bad log entries:**
- Missing timestamps or out-of-order
- Only logging successes (no failures/retries = looks fake)
- No reasoning or decision trail (just "called tool X")
- No safety checks documented
- No duration/performance data
- Embedding secrets or full API responses
- Missing transaction hashes for on-chain actions

---

## Part 3: Example agent.json for Our Hackathon Project

### Minimal (Meets Requirements)

```json
{
  "manifest_version": "1.0",
  "profiles": ["core"],
  "agent": {
    "id": "ajson://synthesis-hackathon/claude-opus-agent",
    "name": "Claude Opus Agent",
    "version": "1.0.0"
  },
  "capabilities": [
    { "id": "generation", "description": "Autonomous DeFi operations" }
  ]
}
```

### Impressive (Targets Protocol Labs Bounties)

```json
{
  "manifest_version": "1.0",
  "profiles": ["core", "exec", "gov"],
  "agent": {
    "id": "ajson://synthesis-hackathon/claude-opus-agent",
    "name": "Claude Opus Agent",
    "description": "Privacy-preserving autonomous DeFi agent with ERC-8004 identity. Routes sensitive inference through Venice (zero data retention), executes swaps via Uniswap, manages reputation on-chain.",
    "version": "1.0.0",
    "homepage": "https://github.com/YOUR_REPO",
    "authors": [
      { "name": "neilei", "organization": "Synthesis Hackathon Team" }
    ],
    "license": "MIT",
    "tags": ["defi", "privacy", "erc-8004", "autonomous", "base"]
  },
  "capabilities": [
    {
      "id": "generation",
      "description": "Generate and execute DeFi trading strategies with privacy-preserving inference"
    },
    {
      "id": "routing",
      "description": "Route inference requests between Venice (private) and Bankr (multi-model) based on data sensitivity"
    },
    {
      "id": "classification",
      "description": "Classify transaction risk levels and apply appropriate safety guardrails"
    }
  ],
  "tools": [
    {
      "id": "tool://venice/inference",
      "name": "Venice Private Inference",
      "description": "Privacy-preserving LLM inference with zero data retention",
      "type": "http",
      "endpoint": "https://api.venice.ai/api/v1/chat/completions",
      "input_schema": {
        "type": "object",
        "properties": {
          "model": { "type": "string" },
          "messages": { "type": "array" }
        },
        "required": ["model", "messages"]
      },
      "auth": { "method": "bearer", "ref": "env:VENICE_API_KEY" }
    },
    {
      "id": "tool://uniswap/swap",
      "name": "Uniswap Swap",
      "description": "Execute token swaps via Uniswap API",
      "type": "http",
      "endpoint": "https://api.uniswap.org/v1/swap",
      "auth": { "method": "api_key", "ref": "env:UNISWAP_API_KEY" }
    },
    {
      "id": "tool://erc8004/identity",
      "name": "ERC-8004 Identity Registry",
      "description": "On-chain agent identity on Base Mainnet",
      "type": "custom",
      "endpoint": "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432",
      "metadata": {
        "chain": "base-mainnet",
        "standard": "ERC-8004"
      }
    },
    {
      "id": "tool://erc8004/reputation",
      "name": "ERC-8004 Reputation Registry",
      "description": "On-chain reputation feedback for agent performance",
      "type": "custom",
      "endpoint": "0x8004BAa17C55a88189AE136b182e5fdA19dE9b63",
      "metadata": {
        "chain": "base-mainnet",
        "standard": "ERC-8004"
      }
    }
  ],
  "modalities": {
    "input": ["text", "json"],
    "output": ["text", "json"]
  },
  "context": {
    "window": 200000,
    "strategy": "conversation",
    "persistent": true
  },
  "runtime": {
    "type": "node",
    "language": "typescript",
    "entrypoint": "src/agent.ts",
    "resources": {
      "cpu_cores_min": 2,
      "memory_mb_min": 4096,
      "accelerator": "none"
    }
  },
  "security": {
    "sandbox": "process",
    "network_zone": "public",
    "sensitive_data_handling": "Portfolio data and strategy prompts routed exclusively through Venice (zero data retention). No PII stored in logs. API keys referenced by environment variable, never embedded."
  },
  "policies": [
    {
      "id": "safety-guardrail-pre-tx",
      "description": "Require safety check before any irreversible on-chain transaction",
      "effect": "audit",
      "action": "tool.call",
      "where": "tool.type == 'custom' && tool.metadata.chain != null"
    },
    {
      "id": "budget-enforcement",
      "description": "Deny tool calls that would exceed compute budget",
      "effect": "deny",
      "action": "tool.call",
      "where": "runtime.budget_remaining <= 0"
    },
    {
      "id": "privacy-routing",
      "description": "Route sensitive data through Venice, never through Bankr",
      "effect": "deny",
      "action": "tool.call",
      "where": "tool.id == 'tool://bankr/inference' && message.contains_pii == true"
    }
  ],
  "observability": {
    "log_level": "info",
    "log_sink": "file://agent_log.json",
    "redact_sensitive": true,
    "metrics_enabled": true,
    "trace_enabled": true
  },
  "x-erc8004": {
    "identity_registry": "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432",
    "reputation_registry": "0x8004BAa17C55a88189AE136b182e5fdA19dE9b63",
    "chain": "base-mainnet",
    "chain_id": 8453,
    "registration_tx": "SEE .env"
  },
  "x-audit": {
    "level": "detailed",
    "include_payloads": false,
    "destination": "file://agent_log.json",
    "rotation_policy": "daily",
    "retention_days": 90
  }
}
```

---

## Part 4: Claude Code Hooks for Auto-Logging

### The Opportunity

Claude Code has a **PostToolUse** hook event that fires after EVERY successful tool call. It receives the full tool name, input parameters, and response. This is the exact data needed to auto-populate `agent_log.json`.

There is also a **PostToolUseFailure** event for failures.

This means we can create a **fully automatic, deterministic** logging system that writes to `agent_log.json` without any manual effort, producing a rich execution trail that exactly matches what Protocol Labs judges want.

### Hook System Architecture

**Hook types:** `command`, `http`, `prompt`, `agent`
**Configuration locations:**
- `~/.claude/settings.json` -- global (all projects)
- `.claude/settings.json` -- project-specific (committable)
- `.claude/settings.local.json` -- project-specific (gitignored)

**Key events for our use case:**

| Event | Fires When | What We Log |
|-------|-----------|-------------|
| `SessionStart` | Session begins | Session metadata, agent identity |
| `PreToolUse` | Before tool call | Safety check logging (for on-chain txns) |
| `PostToolUse` | After successful tool call | Tool name, inputs, outputs, duration |
| `PostToolUseFailure` | After failed tool call | Failures, errors, retry info |
| `Stop` | Agent finishes | Session summary |

### PostToolUse Hook Input (What We Receive)

```json
{
  "session_id": "abc123",
  "transcript_path": "/path/to/transcript.jsonl",
  "cwd": "/Users/adoll/projects/synthesis-hackathon",
  "permission_mode": "default",
  "hook_event_name": "PostToolUse",
  "tool_name": "Bash",
  "tool_input": {
    "command": "cast send 0x8004... 'giveFeedback(...)' --private-key $KEY"
  },
  "tool_response": {
    "stdout": "Transaction hash: 0xabc...",
    "exitCode": 0
  },
  "tool_use_id": "toolu_01ABC123..."
}
```

### PostToolUseFailure Hook Input

```json
{
  "session_id": "abc123",
  "hook_event_name": "PostToolUseFailure",
  "tool_name": "Bash",
  "tool_input": { "command": "npm test" },
  "tool_use_id": "toolu_01ABC123...",
  "error": "Command exited with non-zero status code 1",
  "is_interrupt": false
}
```

### Proposed Hook Configuration

File: `.claude/settings.json` (project-specific, committable)

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/log-tool-use.sh",
            "async": true
          }
        ]
      }
    ],
    "PostToolUseFailure": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/log-tool-failure.sh",
            "async": true
          }
        ]
      }
    ],
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/log-session-start.sh"
          }
        ]
      }
    ],
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/log-session-end.sh",
            "async": true
          }
        ]
      }
    ]
  }
}
```

### Proposed Hook Script: log-tool-use.sh

```bash
#!/bin/bash
# .claude/hooks/log-tool-use.sh
# Appends a JSONL entry to agent_log.json for every tool call

LOG_FILE="$CLAUDE_PROJECT_DIR/agent_log.jsonl"
INPUT=$(cat /dev/stdin)

TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // "unknown"')
TOOL_INPUT=$(echo "$INPUT" | jq -c '.tool_input // {}')
TOOL_RESPONSE=$(echo "$INPUT" | jq -c '.tool_response // {}')
SESSION_ID=$(echo "$INPUT" | jq -r '.session_id // "unknown"')
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Redact sensitive fields (API keys, private keys)
TOOL_INPUT=$(echo "$TOOL_INPUT" | sed 's/\(private.key\|api.key\|token\|secret\)[^"]*"[^"]*"/\1":"[REDACTED]"/gi')

jq -n -c \
  --arg ts "$TIMESTAMP" \
  --arg action "tool.call" \
  --arg tool "$TOOL_NAME" \
  --argjson params "$TOOL_INPUT" \
  --argjson result "$TOOL_RESPONSE" \
  --arg session "$SESSION_ID" \
  '{timestamp: $ts, action: $action, tool: $tool, parameters: $params, result: $result, session_id: $session}' \
  >> "$LOG_FILE"

exit 0
```

### Key Implementation Notes

1. **Use `async: true`** for PostToolUse hooks so logging doesn't block tool execution
2. **Use JSONL format** (one JSON object per line) for append-friendly writing, then aggregate into the final `agent_log.json` array format at session end
3. **Redact sensitive data** -- private keys, API tokens, etc.
4. **No matcher needed** -- omitting matcher means it fires for ALL tool calls (Read, Write, Edit, Bash, Grep, Glob, WebFetch, WebSearch, and MCP tools)
5. **MCP tools show as** `mcp__<server>__<tool>` in `tool_name`
6. **Hooks are deterministic** -- unlike CLAUDE.md instructions, hooks fire every time, guaranteed

---

## Part 5: Competitive Analysis -- Is This a Differentiator?

### Has Anyone Done This Before?

**For hackathons:** No evidence found of anyone combining Claude Code hooks with agent_log.json for a hackathon submission. The concept exists in fragments:

1. **Session-log audit trail** -- DEV.to article by boucle2026 describes logging every tool call to JSONL via PostToolUse hooks. But this is generic audit logging, not structured for a standard like JSON Agents PAM.

2. **claude_telemetry (TechNickAI)** -- OpenTelemetry wrapper for Claude Code that logs tool calls, token usage, costs. But it's a CLI wrapper (`claudia`), not hooks-based, and outputs to Logfire/Sentry/Honeycomb, not agent_log.json.

3. **claude-code-hooks-multi-agent-observability (disler)** -- Real-time monitoring through hook events. Captures MCP tool names (`mcp_server`, `mcp_tool_name`). But it's a general observability tool, not tailored for agent identity/ERC-8004 compliance.

4. **everything-claude-code (affaan-m)** -- Anthropic hackathon winner. Uses PostToolUse hooks for linting. Not for structured logging.

**Bottom line:** Nobody has built a Claude Code hook pipeline that auto-generates a JSON Agents PAM-compliant `agent_log.json` with ERC-8004 identity integration. This is genuinely novel.

### Would Protocol Labs Judges Be Impressed?

**YES, strongly.** Here's why:

1. **"Let the Agent Cook" requires structured execution logs.** Most teams will manually write or retroactively create agent_log.json. Auto-generating it via deterministic hooks means our logs are:
   - Complete (every tool call captured, not just the ones we remember)
   - Honest (failures and retries included automatically)
   - Verifiable (timestamps are system-generated, not fabricated)

2. **"Agents With Receipts" requires DevSpot Agent Compatibility.** Having a machine-readable, auto-generated log demonstrates real autonomous agent behavior, not a human manually recording what happened.

3. **AI judges evaluate submissions.** Machine-readable agent_log.json is directly parseable by AI judges. A well-structured JSONL log with consistent schema is easier for an AI to evaluate than prose descriptions.

4. **It demonstrates "meaningful agent contribution."** The hackathon rules say "Agent must be a real participant. Not a wrapper. Show meaningful contribution to design, code, or coordination." Self-logging via hooks proves the agent is actually running autonomously.

5. **Compute budget awareness.** Including `duration_ms` in every log entry automatically demonstrates awareness of compute costs -- another explicit requirement.

### Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Hook slows down agent | Low | Use `async: true` for all logging hooks |
| Log file gets huge | Medium | JSONL format, rotate per session, summarize at end |
| Sensitive data in logs | High | Regex redaction in hook script + `redact_sensitive: true` in manifest |
| jq not installed | Low | macOS has jq via Homebrew; verify at session start |
| Hook configuration rejected | Low | Project-level `.claude/settings.json` is user-controlled |

---

## Part 6: Synthesis Hackathon Submission Requirements

### What We Know

From `skill.md` (fetched 2026-03-13):
- **Submissions not yet open** ("Submissions will open soon")
- No specific endpoint or format for submitting agent.json/agent_log.json yet
- `conversationLog` field captures human-agent collaboration
- `submissionMetadata` updated at submission time for stack changes

### What Protocol Labs Requires (from bounty descriptions)

**"Let the Agent Cook" ($8,000):**
1. Autonomous execution with self-correction loop
2. ERC-8004 identity (DONE via registration)
3. `agent.json` manifest
4. `agent_log.json` with decisions, tool calls, retries, failures, outputs
5. Real tool use (not mocked)
6. Safety guardrails before irreversible actions
7. Compute budget awareness

**"Agents With Receipts" ($8,004):**
1. Real on-chain transactions with ERC-8004 registries
2. Autonomous architecture (plan/execute/verify)
3. Agent identity + operator model
4. On-chain verifiability (block explorer)
5. `agent.json` + `agent_log.json`

### Recommended Submission Artifacts

1. `agent.json` -- Full PAM manifest with core+exec+gov profiles (see Part 3)
2. `agent_log.json` -- Auto-generated via hooks (see Part 4)
3. On-chain txn hashes -- ERC-8004 identity + reputation feedback
4. GitHub repo link -- Open source requirement
5. `conversationLog` -- Human-agent collaboration via Synthesis API field

---

## Part 7: Action Items

1. **Create `.claude/hooks/` directory** with logging scripts
2. **Configure `.claude/settings.json`** with PostToolUse/PostToolUseFailure/SessionStart/Stop hooks
3. **Create `agent.json`** using the "impressive" template from Part 3 (customize to actual project)
4. **Test hook pipeline** -- verify JSONL entries are written correctly
5. **Add session-end aggregation** -- Stop hook converts JSONL to final agent_log.json format
6. **Monitor skill.md** for submission endpoint details
7. **Verify jq is installed** (`brew install jq` if needed)

---

## Sources

- JSON Agents PAM Spec: https://jsonagents.org/
- JSON Agents GitHub: https://github.com/JSON-AGENTS/Standard
- JSON Schema: https://raw.githubusercontent.com/JSON-AGENTS/Standard/main/schema/json-agents.json
- Audit Extension Schema: https://raw.githubusercontent.com/JSON-AGENTS/Standard/main/schema/extensions/audit.json
- Claude Code Hooks Reference: https://code.claude.com/docs/en/hooks
- Claude Code Hooks Guide: https://code.claude.com/docs/en/hooks-guide
- claude-code-hooks-mastery: https://github.com/disler/claude-code-hooks-mastery
- claude-code-hooks-multi-agent-observability: https://github.com/disler/claude-code-hooks-multi-agent-observability
- claude_telemetry: https://github.com/TechNickAI/claude_telemetry
- everything-claude-code: https://github.com/affaan-m/everything-claude-code
- Audit Trail Hook Article: https://dev.to/boucle2026/how-to-see-everything-claude-code-does-audit-trail-hook-1g9j
- ERC-8004 Spec: https://eips.ethereum.org/EIPS/eip-8004
- Synthesis Hackathon Skill: https://synthesis.devfolio.co/skill.md
