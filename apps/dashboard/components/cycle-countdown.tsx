"use client";

import { useState, useEffect, useMemo } from "react";

interface CycleCountdownProps {
  lastCycleAt: number | null | undefined;
  intervalMs: number;
  isActive: boolean;
}

function computeSecondsLeft(
  lastCycleAt: number | null | undefined,
  intervalMs: number,
  isActive: boolean,
): number | null {
  if (!isActive || !lastCycleAt) return null;
  const nextCycleAt = lastCycleAt + intervalMs / 1000;
  return Math.max(0, Math.ceil(nextCycleAt - Date.now() / 1000));
}

export function CycleCountdown({
  lastCycleAt,
  intervalMs,
  isActive,
}: CycleCountdownProps) {
  const initial = useMemo(
    () => computeSecondsLeft(lastCycleAt, intervalMs, isActive),
    [lastCycleAt, intervalMs, isActive],
  );
  const [secondsLeft, setSecondsLeft] = useState<number | null>(initial);

  useEffect(() => {
    if (!isActive || !lastCycleAt) return;

    function tick() {
      setSecondsLeft(computeSecondsLeft(lastCycleAt, intervalMs, isActive));
    }

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [lastCycleAt, intervalMs, isActive]);

  if (secondsLeft == null) return null;

  return (
    <span className="font-mono text-2xl tabular-nums text-text-primary">
      {secondsLeft}s
    </span>
  );
}
