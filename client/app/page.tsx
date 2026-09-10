import { Boxes, ClipboardList, ShieldCheck, Wifi } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";

const WORKFLOW = [
  "Service",
  "Old Network",
  "Change / Shift",
  "New Network",
  "Survey",
  "Verification",
  "Completion",
] as const;

const ROLES = [
  {
    icon: ClipboardList,
    title: "Technician",
    description:
      "Search services, open assigned jobs, verify the old and new network, record field observations and submit.",
  },
  {
    icon: ShieldCheck,
    title: "Supervisor",
    description:
      "Monitor technicians, review submitted surveys and approve, reject or return them with remarks.",
  },
  {
    icon: Boxes,
    title: "Administrator",
    description:
      "Manage users and roles, boxes, ports, lines, service areas, services and system configuration.",
  },
] as const;

const FOUNDATION = [
  { label: "Monorepo workspaces for client and server", state: "Ready" },
  { label: "Design tokens with light and dark themes", state: "Ready" },
  { label: "Shared UI primitives", state: "Ready" },
  { label: "Typed API client for the Express backend", state: "Ready" },
  { label: "Express server with health endpoint", state: "Ready" },
  { label: "Domain models, roles and survey screens", state: "Next" },
] as const;

export default function Home() {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api/v1";

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-12">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <Badge variant="outline">
            <Wifi aria-hidden className="size-3.5" />
            Fixed and Wi-Fi network service surveys
          </Badge>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Network Service Survey
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            A field-survey platform that helps technicians identify the box, port and line for a
            service, verify technical feasibility, and hand clean results to a supervisor for
            approval.
          </p>
        </div>
        <ThemeToggle />
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Survey workflow</CardTitle>
          <CardDescription>The flow every screen is built around.</CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="flex flex-wrap items-center gap-2">
            {WORKFLOW.map((step, index) => (
              <li key={step} className="flex items-center gap-2">
                <span className="rounded-lg border border-border bg-muted/50 px-3 py-1.5 text-sm font-medium">
                  {step}
                </span>
                {index < WORKFLOW.length - 1 ? (
                  <span aria-hidden className="text-muted-foreground">
                    &rarr;
                  </span>
                ) : null}
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      <section aria-labelledby="roles-heading" className="space-y-3">
        <h2 id="roles-heading" className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Roles
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ROLES.map(({ icon: Icon, title, description }) => (
            <Card key={title}>
              <CardHeader>
                <span className="inline-flex size-9 items-center justify-center rounded-lg bg-muted">
                  <Icon aria-hidden className="size-4" />
                </span>
                <CardTitle>{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Foundation status</CardTitle>
          <CardDescription>What the scaffold task delivered.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {FOUNDATION.map(({ label, state }) => (
            <div
              key={label}
              className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2 last:border-b-0 last:pb-0"
            >
              <span className="text-sm">{label}</span>
              <StatusBadge tone={state === "Ready" ? "success" : "neutral"}>{state}</StatusBadge>
            </div>
          ))}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        API base URL: <span className="font-mono">{apiBaseUrl}</span>
      </p>
    </main>
  );
}
