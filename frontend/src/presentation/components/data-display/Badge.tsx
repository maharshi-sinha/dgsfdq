interface BadgeProps {
  variant: "over" | "under";
  children: string;
}

export function Badge({ variant, children }: BadgeProps) {
  const styles = {
    over: "bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400",
    under: "bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400",
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${styles[variant]}`}>
      {children}
    </span>
  );
}
