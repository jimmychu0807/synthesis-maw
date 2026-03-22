"use client";

import { useState } from "react";
import type { CycleGroup as CycleGroupData } from "@/lib/group-feed";
import { FeedEntry } from "./feed-entry";
import { SponsorChip } from "./sponsor-chip";
import { Badge } from "./ui/badge";
import { formatCurrency, formatPercentage, formatAllocationSummary } from "@maw/common";
import { Spinner } from "./ui/icons";

interface CycleGroupProps {
  group: CycleGroupData;
  defaultExpanded?: boolean;
  /** Sequence numbers of entries that arrived live via SSE. */
  liveSeqs?: Set<number>;
}

export function CycleGroup({ group, defaultExpanded = false, liveSeqs }: CycleGroupProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const { completed, total, pendingLabel } = group.progress;
  const hasError = group.hasError;
  const stepCountColor = hasError
    ? "text-accent-danger"
    : group.isComplete
      ? "text-accent-positive"
      : "text-text-tertiary";

  const panelId = `cycle-panel-${group.cycle ?? "init"}`;

  // Init group (no cycle number)
  if (group.cycle === null) {
    const { completed: initSuccess, total: initTotal } = group.progress;
    const initColor = initTotal === 0
      ? "text-text-tertiary"
      : initSuccess === initTotal
        ? "text-accent-positive"
        : "text-accent-danger";
    return (
      <div className="border-b border-border-subtle pb-2">
        <button
          onClick={() => setExpanded(!expanded)}
          aria-expanded={expanded}
          aria-controls={panelId}
          className="flex w-full cursor-pointer items-center gap-2 rounded px-2 py-2.5 min-h-[44px] text-left text-xs font-medium uppercase tracking-wider text-text-tertiary hover:bg-bg-primary focus:outline-none focus-visible:ring-1 focus-visible:ring-accent-positive"
        >
          <span
            aria-hidden="true"
            className={`transition-transform duration-150 ease-out-data ${expanded ? "rotate-90" : ""}`}
          >
            ▶
          </span>
          Initialization
          <span className={`ml-auto font-mono tabular-nums ${initColor}`}>
            {initSuccess}/{initTotal} steps
          </span>
        </button>
        {expanded && (
          <div id={panelId} className="mt-1 space-y-0 pl-4 animate-expand">
            {group.entries.map((entry) => (
              <FeedEntry key={entry.sequence} entry={entry} isNew={liveSeqs?.has(entry.sequence)} />
            ))}
          </div>
        )}
      </div>
    );
  }

  const snap = group.snapshot;
  const driftPct = snap ? snap.drift * 100 : null;
  const allocSummary = snap
    ? formatAllocationSummary(snap.allocation)
    : null;

  // Determine if Venice made a decision in this cycle
  const veniceDecided = group.entries.some((e) => e.action === "rebalance_decision");

  // Cycle outcome badge
  let outcomeLabel: string | null = null;
  let outcomeVariant: "positive" | "danger" | "warning" | null = null;
  if (group.isComplete && group.cycle !== null) {
    if (group.didRebalance) {
      outcomeLabel = "Rebalanced";
      outcomeVariant = "positive";
    } else if (group.wasSafetyBlocked) {
      outcomeLabel = "Blocked";
      outcomeVariant = "warning";
    } else {
      outcomeLabel = "Hold";
      outcomeVariant = null;
    }
  }

  return (
    <div className="border-b border-border-subtle pb-2">
      <button
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
        aria-controls={panelId}
        className={`flex w-full cursor-pointer items-center gap-3 rounded px-2 py-2.5 min-h-[44px] text-left text-sm hover:bg-bg-primary focus:outline-none focus-visible:ring-1 focus-visible:ring-accent-positive ${hasError ? "text-accent-danger" : "text-text-secondary"}`}
      >
        <span
          aria-hidden="true"
          className={`transition-transform duration-150 ease-out-data ${expanded ? "rotate-90" : ""}`}
        >
          ▶
        </span>
        <span className="font-medium text-text-primary">
          Cycle {group.cycle}
        </span>
        {!group.isComplete && (
          <span className="flex items-center gap-1.5 text-xs text-accent-positive">
            <Spinner className="h-3 w-3 animate-spin" />
            {pendingLabel && (
              <span className="text-text-tertiary">{pendingLabel}</span>
            )}
          </span>
        )}
        {outcomeLabel && (
          outcomeVariant
            ? <Badge variant={outcomeVariant}>{outcomeLabel}</Badge>
            : <span className="text-xs text-text-tertiary">{outcomeLabel}</span>
        )}
        {veniceDecided && (
          <SponsorChip sponsor="venice" text="Venice.ai" />
        )}
        {snap && (
          <>
            <span className="text-xs font-mono tabular-nums text-text-secondary">
              {formatCurrency(snap.totalValue)}
            </span>
            <span
              className={`text-xs font-mono tabular-nums ${driftPct != null && driftPct > 5 ? "text-accent-danger" : "text-accent-positive"}`}
            >
              {driftPct != null ? formatPercentage(snap.drift) : "---"}
            </span>
            <span className="hidden text-xs font-mono tabular-nums text-text-tertiary sm:inline">
              {allocSummary}
            </span>
          </>
        )}
        {hasError && (
          <>
            <span aria-hidden="true" className="inline-flex h-1.5 w-1.5 rounded-full bg-accent-danger" />
            <span className="sr-only">Error in cycle</span>
          </>
        )}
        <span className={`ml-auto text-xs font-mono tabular-nums ${stepCountColor}`}>
          {completed}/{total}
        </span>
      </button>
      {expanded && (
        <div id={panelId} className="mt-1 space-y-0 pl-4 animate-expand">
          {group.entries.map((entry) => (
            <FeedEntry key={entry.sequence} entry={entry} isNew={liveSeqs?.has(entry.sequence)} />
          ))}
        </div>
      )}
    </div>
  );
}
