import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type StatusTone = "neutral" | "info" | "progress" | "success" | "warning" | "danger";

const TONE_CLASSES: Record<StatusTone, string> = {
  neutral: "border-border bg-muted text-muted-foreground",
  info: "border-transparent bg-sky-500/15 text-sky-700 dark:text-sky-300",
  progress: "border-transparent bg-violet-500/15 text-violet-700 dark:text-violet-300",
  success: "border-transparent bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  warning: "border-transparent bg-amber-500/15 text-amber-700 dark:text-amber-300",
  danger: "border-transparent bg-destructive/15 text-destructive",
};

const DOT_CLASSES: Record<StatusTone, string> = {
  neutral: "bg-muted-foreground",
  info: "bg-sky-500",
  progress: "bg-violet-500",
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  danger: "bg-destructive",
};

export interface StatusBadgeProps {
  tone?: StatusTone;
  children: ReactNode;
  className?: string;
}

export function StatusBadge({ tone = "neutral", children, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        TONE_CLASSES[tone],
        className,
      )}
    >
      <span aria-hidden className={cn("size-1.5 rounded-full", DOT_CLASSES[tone])} />
      {children}
    </span>
  );
}
