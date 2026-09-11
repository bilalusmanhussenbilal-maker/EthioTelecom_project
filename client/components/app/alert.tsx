import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export type AlertTone = "info" | "success" | "warning" | "danger";

const TONE_CLASSES: Record<AlertTone, string> = {
  info: "border-sky-500/30 bg-sky-500/10 text-sky-900 dark:text-sky-200",
  success: "border-emerald-500/30 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200",
  warning: "border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200",
  danger: "border-destructive/30 bg-destructive/10 text-destructive",
};

const ICONS: Record<AlertTone, typeof Info> = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: XCircle,
};

export interface AlertProps {
  tone?: AlertTone;
  title?: string;
  children?: ReactNode;
  className?: string;
}

export function Alert({ tone = "info", title, children, className }: AlertProps) {
  const Icon = ICONS[tone];

  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className={cn("flex items-start gap-3 rounded-lg border p-3 text-sm", TONE_CLASSES[tone], className)}
    >
      <Icon aria-hidden className="mt-0.5 size-4 shrink-0" />
      <div className="space-y-1">
        {title ? <p className="font-medium">{title}</p> : null}
        {children ? <div className="text-sm opacity-90">{children}</div> : null}
      </div>
    </div>
  );
}