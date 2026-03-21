import { Card } from "./ui/card";

interface SkeletonProps {
  className?: string;
}

function SkeletonLine({ className = "" }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse rounded bg-border ${className}`}
    />
  );
}

export function SkeletonCard({ index = 0 }: { index?: number }) {
  return (
    <Card
      className="p-4 animate-skeleton-in"
      style={{ animationDelay: `${index * 80}ms` }}
      aria-busy="true"
      aria-label="Loading"
    >
      <SkeletonLine className="h-3 w-20 mb-3" />
      <SkeletonLine className="h-8 w-32" />
    </Card>
  );
}

export function SkeletonTable({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3" role="status" aria-label="Loading content">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="animate-skeleton-in"
          style={{ animationDelay: `${i * 80}ms` }}
        >
          <SkeletonLine className="h-10 w-full" />
        </div>
      ))}
    </div>
  );
}
