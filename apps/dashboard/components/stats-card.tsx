"use client";

import { useCallback } from "react";
import { Card } from "./ui/card";
import { AnimatedNumber } from "./ui/animated-number";

interface StatsCardProps {
  label: string;
  value: string;
  /** If provided, enables smooth number animation between updates. */
  numericValue?: number;
  /** Format function for animated numeric display. Required when numericValue is set. */
  formatValue?: (n: number) => string;
  valueColor?: string;
}

export function StatsCard({
  label,
  value,
  numericValue,
  formatValue,
  valueColor = "text-text-primary",
}: StatsCardProps) {
  const defaultFormat = useCallback((n: number) => String(Math.round(n)), []);
  const fmt = formatValue ?? defaultFormat;

  return (
    <Card className="p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-text-secondary">
        {label}
      </p>
      <p className={`mt-1 font-mono text-2xl tabular-nums ${valueColor}`}>
        {numericValue != null ? (
          <AnimatedNumber value={numericValue} format={fmt} />
        ) : (
          value
        )}
      </p>
    </Card>
  );
}
