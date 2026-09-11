import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface StatCardProps {
  label: string;
  value: number | string;
  hint?: string;
  icon?: LucideIcon;
  tone?: "neutral" | "info" | "progress" | "success" | "warning" | "danger";
}

const VALUE_TONES: Record<NonNullable<StatCardProps["tone"]>, string> = {
  neutral: "text-foreground",
  info: "text-sky-600 dark:text-sky-400",
  progress: "text-violet-600 dark:text-violet-400",
  success: "text-emerald-600 dark:text-emerald-400",
  warning: "text-amber-600 dark:text-amber-400",
  danger: "text-destructive",
};

export function StatCard({ label, value, hint, icon: Icon, tone = "neutral" }: StatCardProps) {
  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-3 p-4 sm:p-5">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className={cn("text-2xl font-semibold tabular-nums", VALUE_TONES[tone])}>{value}</p>
          {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
        </div>
        {Icon ? <Icon aria-hidden className="size-5 shrink-0 text-muted-foreground" /> : null}
      </CardContent>
    </Card>
  );
}