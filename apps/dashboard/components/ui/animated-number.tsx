"use client";

import { useEffect, useRef } from "react";

interface AnimatedNumberProps {
  value: number;
  format: (n: number) => string;
  duration?: number;
  className?: string;
}

/**
 * Smoothly interpolates between numeric values using requestAnimationFrame.
 * Respects prefers-reduced-motion by snapping instantly.
 *
 * Uses ease-out-quart for a natural deceleration curve — fast start, smooth stop.
 * Updates the DOM directly via ref to avoid React re-renders during animation.
 */
export function AnimatedNumber({
  value,
  format,
  duration = 400,
  className = "",
}: AnimatedNumberProps) {
  const spanRef = useRef<HTMLSpanElement>(null);
  const prevRef = useRef(value);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const el = spanRef.current;
    if (!el) return;

    const from = prevRef.current;
    const to = value;
    prevRef.current = to;

    // No change or reduced motion — snap immediately via rAF
    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (from === to || prefersReduced) {
      rafRef.current = requestAnimationFrame(() => {
        el.textContent = format(to);
      });
      return () => cancelAnimationFrame(rafRef.current);
    }

    const start = performance.now();

    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);

      // ease-out-quart: 1 - (1 - t)^4
      const eased = 1 - Math.pow(1 - progress, 4);
      const current = from + (to - from) * eased;

      el!.textContent = format(current);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    }

    rafRef.current = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(rafRef.current);
  }, [value, format, duration]);

  return (
    <span ref={spanRef} className={className}>
      {format(value)}
    </span>
  );
}
