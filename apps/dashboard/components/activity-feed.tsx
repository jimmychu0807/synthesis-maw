"use client";

import { useRef } from "react";
import type { AgentLogEntry } from "@veil/common";
import { Card } from "./ui/card";
import { SectionHeading } from "./ui/section-heading";
import { SponsorBadge } from "./sponsor-badge";
import { CycleGroup } from "./cycle-group";
import { groupFeedByCycle } from "@/lib/group-feed";

interface ActivityFeedProps {
  feed: AgentLogEntry[];
}

export function ActivityFeed({ feed }: ActivityFeedProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Reverse so newest cycles appear at the top
  const groups = groupFeedByCycle(feed).reverse();

  return (
    <Card className="flex flex-col p-5">
      <SectionHeading className="mb-3">Activity Feed</SectionHeading>
      <div
        ref={scrollRef}
        className="flex-1 space-y-1 overflow-y-auto"
        style={{ maxHeight: "400px" }}
      >
        {groups.length > 0 ? (
          groups.map((group) => (
            <CycleGroup
              key={group.cycle ?? "init"}
              group={group}
              defaultExpanded={group === groups[0]}
            />
          ))
        ) : (
          <div className="flex h-full items-center justify-center py-12">
            <p className="text-sm text-text-tertiary">
              Waiting for the agent&apos;s first cycle...
            </p>
          </div>
        )}
      </div>
      <div className="mt-5 border-t border-border-subtle pt-3">
        <SponsorBadge text="Powered by Venice" />
      </div>
    </Card>
  );
}
