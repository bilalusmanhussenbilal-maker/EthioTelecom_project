import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface KeyValueProps {
  label: string;
  children: ReactNode;
  className?: string;
}

export function KeyValue({ label, children, className }: KeyValueProps) {
  return (
    <div className={cn("space-y-0.5", className)}>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="text-sm break-words">{children}</dd>
    </div>
  );
}

export function KeyValueGrid({ children, className }: { children: ReactNode; className?: string }) {
  return <dl className={cn("grid gap-4 sm:grid-cols-2 lg:grid-cols-3", className)}>{children}</dl>;
}