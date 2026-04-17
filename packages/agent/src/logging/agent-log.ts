/**
 * JSONL event logger. Appends structured AgentLogEntry records to agent_log.jsonl.
 * Read by the server for the dashboard activity feed.
 *
 * @module @maw/agent/logging/agent-log
 */
import type { AgentLogEntry } from "@maw/common";
export type { AgentLogEntry } from "@maw/common";
import { appendFileSync } from "fs";
import { join, resolve } from "path";

// ---------------------------------------------------------------------------
// JSONL writer
// ---------------------------------------------------------------------------

let sequence = 0;

function getAgentLogJsonlPath(): string {
  const fromEnv = process.env.MAW_AGENT_LOG_JSONL?.trim();
  if (fromEnv && fromEnv.length > 0) {
    return resolve(fromEnv);
  }
  return join(process.cwd(), "agent_log.jsonl");
}

export function resetLogSequence(): void {
  sequence = 0;
}

export function logAction(
  action: string,
  opts?: {
    cycle?: number;
    tool?: string;
    parameters?: Record<string, unknown>;
    result?: Record<string, unknown>;
    duration_ms?: number;
    error?: string;
  },
): AgentLogEntry {
  const entry: AgentLogEntry = {
    timestamp: new Date().toISOString(),
    sequence: sequence++,
    action,
    ...opts,
  };

  const line = JSON.stringify(entry) + "\n";
  appendFileSync(getAgentLogJsonlPath(), line, "utf-8");

  return entry;
}

export function logStart(): void {
  logAction("agent_start", {
    parameters: { pid: process.pid, cwd: process.cwd() },
  });
}

export function logStop(reason: string): void {
  logAction("agent_stop", { parameters: { reason } });
}
