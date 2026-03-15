interface ErrorBannerProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorBanner({ message, onRetry }: ErrorBannerProps) {
  return (
    <div className="rounded-lg border border-accent-danger/30 bg-accent-danger-dim p-4 flex items-center justify-between gap-4">
      <p className="text-sm text-accent-danger">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="shrink-0 rounded-md border border-accent-danger/30 px-3 py-1.5 text-xs font-medium text-accent-danger hover:bg-accent-danger/10 transition-colors cursor-pointer"
        >
          Retry
        </button>
      )}
    </div>
  );
}
