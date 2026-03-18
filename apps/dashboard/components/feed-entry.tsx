import { memo } from "react";
import type { AgentLogEntry } from "@veil/common";
import { Badge } from "./ui/badge";
import { truncateHash, formatCurrency, formatPercentage, formatAllocationSummary } from "@veil/common";

interface FeedEntryProps {
  entry: AgentLogEntry;
}

const EXPLORER_URLS: Record<string, string> = {
  "ethereum-sepolia": "https://sepolia.etherscan.io/tx/",
  "base-sepolia": "https://sepolia.basescan.org/tx/",
};

/** Safely read a nested value from the untyped result record. */
function r(result: Record<string, unknown> | undefined, key: string): unknown {
  return result?.[key];
}

/** Render a block explorer tx link. Chain defaults to ethereum-sepolia. */
function TxLink({ hash, chain = "ethereum-sepolia", label, className = "" }: { hash: string | undefined; chain?: string; label?: string; className?: string }) {
  if (!hash || hash === "0x0") return null;
  const base = EXPLORER_URLS[chain] ?? EXPLORER_URLS["ethereum-sepolia"];
  return (
    <a
      href={`${base}${hash}`}
      target="_blank"
      rel="noopener noreferrer"
      className={`font-mono text-xs text-accent-secondary hover:underline ${className}`}
    >
      {label ? `${label} ` : ""}{truncateHash(hash)}
      <span className="sr-only"> (opens in new tab)</span>
    </a>
  );
}

/** Dot indicator with semantic color. */
function Dot({ color }: { color: "green" | "red" | "blue" | "gray" }) {
  const cls: Record<string, string> = {
    green: "bg-accent-positive",
    red: "bg-accent-danger",
    blue: "bg-accent-secondary",
    gray: "bg-border",
  };
  return (
    <span
      aria-hidden="true"
      className={`mt-0.5 inline-flex h-1.5 w-1.5 shrink-0 rounded-full ${cls[color]}`}
    />
  );
}

/** Optional duration suffix. */
function Duration({ ms }: { ms: number | undefined }) {
  if (ms == null) return null;
  return (
    <span className="ml-2 font-mono text-xs tabular-nums text-text-tertiary">
      {ms}ms
    </span>
  );
}

function getEntryLabel(action: string): string {
  const labels: Record<string, string> = {
    rebalance_decision: "Decision",
    swap_executed: "Swap",
    swap_failed: "Swap Failed",
    cycle_error: "Cycle Error",
    safety_block: "Safety Block",
    delegation_redeem_failed: "Delegation Failed",
    permit2_approval: "Permit2 Approval",
    quote_received: "Quote",
    price_fetch: "Price",
    portfolio_check: "Portfolio",
    pool_data_fetch: "Pools",
    budget_check: "Budget",
    cycle_complete: "Cycle",
    erc8004_feedback: "ERC-8004 Feedback",
    agent_start: "Agent Start",
    agent_stop: "Agent Stop",
    audit_report: "Audit Report",
    delegation_created: "Delegation",
    delegation_failed: "Delegation Failed",
    adversarial_check: "Safety Check",
    erc8004_register: "Identity",
    erc8004_register_failed: "Identity Failed",
    privacy_guarantee: "Privacy",
    worker_start: "Worker Start",
    worker_stop: "Worker Stop",
    worker_error: "Worker Error",
    judge_started: "Judge",
    judge_completed: "Judge",
    judge_failed: "Judge Failed",
    delegation_caveat_enforced: "Caveat Enforced",
  };
  return labels[action] ?? action.replace(/_/g, " ");
}

export const FeedEntry = memo(function FeedEntry({ entry }: FeedEntryProps) {
  const isError = !!entry.error;
  const res = entry.result;

  // ── Error entries ──────────────────────────────────────────────────
  if (isError) {
    return (
      <div className="flex items-start gap-2 py-1.5 text-sm">
        <Dot color="red" />
        <div className="min-w-0">
          <span className="font-medium text-accent-danger">
            {getEntryLabel(entry.action)}
          </span>
          <span className="ml-2 text-text-tertiary">{entry.error}</span>
        </div>
      </div>
    );
  }

  // ── price_fetch ────────────────────────────────────────────────────
  if (entry.action === "price_fetch" && res) {
    const price = r(res, "price") as number | undefined;
    return (
      <div className="flex items-start gap-2 py-1 text-sm">
        <Dot color="gray" />
        <div className="min-w-0">
          <span className="text-text-tertiary">{getEntryLabel(entry.action)}</span>
          {price != null && (
            <span className="ml-2 font-mono tabular-nums text-text-secondary">
              ETH {formatCurrency(price)}
            </span>
          )}
          <Duration ms={entry.duration_ms} />
        </div>
      </div>
    );
  }

  // ── portfolio_check ────────────────────────────────────────────────
  if (entry.action === "portfolio_check" && res) {
    const totalUsdValue = r(res, "totalUsdValue") as number | undefined;
    const allocation = r(res, "allocation") as Record<string, number> | undefined;
    return (
      <div className="flex items-start gap-2 py-1 text-sm">
        <Dot color="gray" />
        <div className="min-w-0">
          <span className="text-text-tertiary">{getEntryLabel(entry.action)}</span>
          {totalUsdValue != null && (
            <span className="ml-2 font-mono tabular-nums text-text-secondary">
              {formatCurrency(totalUsdValue)}
            </span>
          )}
          {allocation && (
            <span className="ml-1 font-mono tabular-nums text-text-tertiary">
              | {formatAllocationSummary(allocation)}
            </span>
          )}
          <Duration ms={entry.duration_ms} />
        </div>
      </div>
    );
  }

  // ── pool_data_fetch ────────────────────────────────────────────────
  if (entry.action === "pool_data_fetch" && res) {
    const poolCount = r(res, "poolCount") as number | undefined;
    return (
      <div className="flex items-start gap-2 py-1 text-sm">
        <Dot color="gray" />
        <div className="min-w-0">
          <span className="text-text-tertiary">{getEntryLabel(entry.action)}</span>
          {poolCount != null && (
            <span className="ml-2 font-mono tabular-nums text-text-secondary">
              {poolCount} pool{poolCount !== 1 ? "s" : ""} fetched
            </span>
          )}
          <Duration ms={entry.duration_ms} />
        </div>
      </div>
    );
  }

  // ── budget_check ───────────────────────────────────────────────────
  if (entry.action === "budget_check" && res) {
    const tier = r(res, "tier") as string | undefined;
    const tierColor =
      tier === "critical" ? "text-accent-danger" : "text-text-secondary";
    return (
      <div className="flex items-start gap-2 py-1 text-sm">
        <Dot color="gray" />
        <div className="min-w-0">
          <span className="text-text-tertiary">{getEntryLabel(entry.action)}</span>
          {tier && (
            <span className={`ml-2 font-mono text-xs ${tierColor}`}>
              {tier}
            </span>
          )}
          <Duration ms={entry.duration_ms} />
        </div>
      </div>
    );
  }

  // ── rebalance_decision ─────────────────────────────────────────────
  if (entry.action === "rebalance_decision" && res) {
    const shouldRebalance = r(res, "shouldRebalance") as boolean;
    const reasoning = r(res, "reasoning") as string | undefined;
    return (
      <div className="flex items-start gap-2 py-1.5 text-sm">
        <Dot color="green" />
        <div className="min-w-0">
          <span className="font-medium text-text-primary">
            {getEntryLabel(entry.action)}
          </span>
          <Badge variant={shouldRebalance ? "positive" : "warning"}>
            {shouldRebalance ? "Rebalance" : "Hold"}
          </Badge>
          {reasoning && (
            <span className="ml-2 text-text-secondary">{reasoning}</span>
          )}
        </div>
      </div>
    );
  }

  // ── quote_received ─────────────────────────────────────────────────
  if (entry.action === "quote_received" && res) {
    const input = r(res, "input") as { amount?: string } | undefined;
    const output = r(res, "output") as { amount?: string } | undefined;
    const viaDelegation = r(res, "viaDelegation") as boolean | undefined;
    return (
      <div className="flex items-start gap-2 py-1.5 text-sm">
        <Dot color="blue" />
        <div className="min-w-0">
          <span className="font-medium text-text-primary">
            {getEntryLabel(entry.action)}
          </span>
          {input?.amount && output?.amount && (
            <span className="ml-2 font-mono tabular-nums text-text-secondary">
              {input.amount} &rarr; {output.amount}
            </span>
          )}
          {viaDelegation && (
            <Badge variant="positive">delegation</Badge>
          )}
          <Duration ms={entry.duration_ms} />
        </div>
      </div>
    );
  }

  // ── swap_executed ──────────────────────────────────────────────────
  if (entry.action === "swap_executed" && res) {
    const txHash = r(res, "txHash") as string | undefined;
    const viaDelegation = r(res, "viaDelegation") as boolean | undefined;
    return (
      <div className="flex items-start gap-2 py-1.5 text-sm">
        <Dot color="blue" />
        <div className="min-w-0">
          <span className="font-medium text-text-primary">Swap</span>
          <span className="ml-2 text-text-secondary">
            {r(res, "sellAmount") as string} {r(res, "sellToken") as string}{" "}
            &rarr; {r(res, "buyToken") as string}
          </span>
          {viaDelegation && (
            <Badge variant="positive">delegation</Badge>
          )}
          <TxLink hash={txHash} className="ml-2" />
        </div>
      </div>
    );
  }

  // ── delegation_created ─────────────────────────────────────────────
  if (entry.action === "delegation_created" && res) {
    const txHash = r(res, "txHash") as string | undefined;
    const caveatsCount = r(res, "caveatsCount") as number | undefined;
    return (
      <div className="flex items-start gap-2 py-1.5 text-sm">
        <Dot color="green" />
        <div className="min-w-0">
          <span className="font-medium text-text-primary">
            {getEntryLabel(entry.action)}
          </span>
          <span className="ml-2 text-text-secondary">created</span>
          {caveatsCount != null && (
            <span className="ml-1 font-mono text-xs tabular-nums text-text-tertiary">
              ({caveatsCount} caveat{caveatsCount !== 1 ? "s" : ""})
            </span>
          )}
          <TxLink hash={txHash} className="ml-2" />
          <Duration ms={entry.duration_ms} />
        </div>
      </div>
    );
  }

  // ── judge_started ──────────────────────────────────────────────────
  if (entry.action === "judge_started") {
    return (
      <div className="flex items-start gap-2 py-1 text-sm">
        <Dot color="gray" />
        <div className="min-w-0">
          <span className="text-text-tertiary">Judge evaluation started</span>
        </div>
      </div>
    );
  }

  // ── judge_completed ────────────────────────────────────────────────
  if (entry.action === "judge_completed" && res) {
    const composite = r(res, "composite") as number | undefined;
    const scores = r(res, "scores") as Record<string, number> | undefined;
    const reasonings = r(res, "reasonings") as Record<string, string> | undefined;
    const feedbackTxHash = r(res, "feedbackTxHash") as string | undefined;
    const validationRequestTxHash = r(res, "validationRequestTxHash") as string | undefined;
    const outcome = r(res, "outcome") as string | undefined;

    const compositeScore = composite != null ? composite * 10 : null; // 0-10 → 0-100 for display
    const scoreColor = compositeScore != null
      ? compositeScore >= 70 ? "text-accent-positive" : compositeScore >= 50 ? "text-amber-400" : "text-accent-danger"
      : "text-text-secondary";

    const DIMENSION_LABELS: Record<string, { label: string; weight: string }> = {
      "decision-quality": { label: "Decision Quality", weight: "40%" },
      "execution-quality": { label: "Execution Quality", weight: "30%" },
      "goal-progress": { label: "Goal Progress", weight: "30%" },
    };

    return (
      <div className="flex items-start gap-2 py-1.5 text-sm">
        <Dot color={outcome === "failed" ? "red" : "green"} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-text-primary">
              Judge {outcome === "failed" ? "(Failed Swap)" : ""}
            </span>
            {compositeScore != null && (
              <span className={`font-mono tabular-nums font-medium ${scoreColor}`}>
                {compositeScore.toFixed(0)}/100
              </span>
            )}
            {feedbackTxHash && feedbackTxHash !== "0x0" && (
              <TxLink hash={feedbackTxHash} chain="base-sepolia" label="reputation" />
            )}
            {validationRequestTxHash && (
              <TxLink hash={validationRequestTxHash} chain="base-sepolia" label="request" />
            )}
            <Duration ms={entry.duration_ms} />
          </div>

          {/* Dimension scores */}
          {scores && (
            <div className="mt-1.5 space-y-1">
              {Object.entries(scores).map(([tag, score]) => {
                const dim = DIMENSION_LABELS[tag];
                const reasoning = reasonings?.[tag];
                const isGoalProgress = tag === "goal-progress";

                if (isGoalProgress) {
                  const advanced = score >= 50;
                  return (
                    <div key={tag} className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-text-tertiary text-xs w-36 shrink-0">
                          {dim?.label ?? tag}{" "}
                          <span className="text-text-tertiary/60">{dim?.weight ?? ""}</span>
                        </span>
                        <span className={`font-mono text-xs font-medium ${advanced ? "text-accent-positive" : "text-accent-danger"}`}>
                          {advanced ? "Yes" : "No"}
                        </span>
                      </div>
                      {reasoning && (
                        <p className="text-text-tertiary text-xs pl-[9.5rem] leading-relaxed line-clamp-2">
                          {reasoning}
                        </p>
                      )}
                    </div>
                  );
                }

                const dimColor = score >= 70 ? "text-accent-positive" : score >= 50 ? "text-amber-400" : "text-accent-danger";
                return (
                  <div key={tag} className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-text-tertiary text-xs w-36 shrink-0">
                        {dim?.label ?? tag}{" "}
                        <span className="text-text-tertiary/60">{dim?.weight ?? ""}</span>
                      </span>
                      <div className="flex items-center gap-1.5 flex-1 min-w-0">
                        <div className="h-1 flex-1 max-w-24 rounded-full bg-border overflow-hidden">
                          <div
                            className={`h-full rounded-full ${score >= 70 ? "bg-accent-positive" : score >= 50 ? "bg-amber-400" : "bg-accent-danger"}`}
                            style={{ width: `${score}%` }}
                          />
                        </div>
                        <span className={`font-mono tabular-nums text-xs ${dimColor}`}>
                          {score}
                        </span>
                      </div>
                    </div>
                    {reasoning && (
                      <p className="text-text-tertiary text-xs pl-[9.5rem] leading-relaxed line-clamp-2">
                        {reasoning}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}

        </div>
      </div>
    );
  }

  // ── cycle_complete ─────────────────────────────────────────────────
  if (entry.action === "cycle_complete" && res) {
    const totalValue = r(res, "totalValue") as number | undefined;
    const drift = r(res, "drift") as number | undefined;
    const ethPrice = r(res, "ethPrice") as number | undefined;
    const allocation = r(res, "allocation") as Record<string, number> | undefined;
    return (
      <div className="flex items-start gap-2 py-1.5 text-sm">
        <Dot color="green" />
        <div className="min-w-0">
          <span className="font-medium text-text-primary">
            {getEntryLabel(entry.action)}
          </span>
          {totalValue != null && (
            <span className="ml-2 font-mono tabular-nums text-text-secondary">
              {formatCurrency(totalValue)}
            </span>
          )}
          {drift != null && (
            <span
              className={`ml-1 font-mono tabular-nums ${drift > 0.05 ? "text-accent-danger" : "text-text-tertiary"}`}
            >
              drift {formatPercentage(drift)}
            </span>
          )}
          {ethPrice != null && (
            <span className="ml-1 font-mono tabular-nums text-text-tertiary">
              ETH {formatCurrency(ethPrice)}
            </span>
          )}
          {allocation && (
            <span className="ml-1 text-text-tertiary hidden sm:inline">
              | {formatAllocationSummary(allocation)}
            </span>
          )}
          <Duration ms={entry.duration_ms} />
        </div>
      </div>
    );
  }

  // ── erc8004_register ───────────────────────────────────────────────
  if (entry.action === "erc8004_register" && res) {
    const agentId = r(res, "agentId") as string | undefined;
    const txHash = r(res, "txHash") as string | undefined;
    return (
      <div className="flex items-start gap-2 py-1.5 text-sm">
        <Dot color="green" />
        <div className="min-w-0">
          <span className="font-medium text-text-primary">
            {getEntryLabel(entry.action)}
          </span>
          {agentId && (
            <span className="ml-2 font-mono text-xs tabular-nums text-text-secondary">
              Agent ID: {agentId}
            </span>
          )}
          <TxLink hash={txHash} className="ml-2" />
          <Duration ms={entry.duration_ms} />
        </div>
      </div>
    );
  }

  // ── Default: any entry with a txHash in result gets a link ─────────
  const fallbackTxHash = res ? (r(res, "txHash") as string | undefined) : undefined;

  return (
    <div className="flex items-start gap-2 py-1 text-sm">
      <Dot color="gray" />
      <div className="min-w-0">
        <span className="text-text-tertiary">{getEntryLabel(entry.action)}</span>
        <TxLink hash={fallbackTxHash} className="ml-2" />
        <Duration ms={entry.duration_ms} />
      </div>
    </div>
  );
});
