export function LoadingSkeleton({ className = "h-48" }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-gray-100 dark:bg-gray-800 rounded-xl ${className}`} />
  );
}
