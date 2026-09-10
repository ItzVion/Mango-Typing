type LoadingStateProps = {
  label?: string;
  className?: string;
};

export const LoadingState = ({ label = "Loading…", className = "" }: LoadingStateProps) => (
  <div
    className={`flex min-h-40 flex-col items-center justify-center gap-3 text-center ${className}`}
    role="status"
    aria-live="polite"
    aria-label={label}
  >
    <span
      className="h-8 w-8 animate-spin rounded-full border-2 border-black/15 border-t-black dark:border-white/15 dark:border-t-white"
      aria-hidden="true"
    />
    <span className="text-sm text-black/50 dark:text-white/50">{label}</span>
  </div>
);
