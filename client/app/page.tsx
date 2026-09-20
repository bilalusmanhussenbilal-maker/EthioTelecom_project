import Link from "next/link";
import {
  ArrowRight,
  Boxes,
  Check,
  ClipboardCheck,
  ClipboardList,
  LogIn,
  MapPin,
  Network,
  ScrollText,
  ShieldCheck,
  Wifi,
  WifiOff,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";

const CONTAINER = "mx-auto w-full max-w-6xl px-4 sm:px-6";

const WORKFLOW = [
  { title: "Service", description: "Look up the service, its address and its area." },
  { title: "Old network", description: "Confirm the box, port and line in use today." },
  { title: "Change or shift", description: "Decide the new connection or the relocation." },
  { title: "New network", description: "Choose an available box, port and line." },
  { title: "Survey", description: "Verify on site and record what you actually found." },
  { title: "Verification", description: "The supervisor reviews the result and decides." },
  { title: "Completion", description: "Approved and closed with a full activity history." },
] as const;

const ROLES = [
  {
    icon: ClipboardList,
    title: "Technician",
    summary: "Works the assigned survey on site.",
    points: [
      "Search services and open assigned surveys",
      "Compare the old and the new network path",
      "Verify the box, port, line and capacity",
      "Save offline and submit when back online",
    ],
  },
  {
    icon: ClipboardCheck,
    title: "Supervisor",
    summary: "Reviews the work and owns the decision.",
    points: [
      "Monitor technicians and open surveys",
      "Read the field observations and GPS record",
      "Approve, reject or return with a remark",
      "Report on completion and return rates",
    ],
  },
  {
    icon: Boxes,
    title: "Administrator",
    summary: "Keeps the data every survey depends on correct.",
    points: [
      "Manage users, roles and technicians",
      "Maintain boxes, ports, lines and areas",
      "Configure GPS accuracy and logging rules",
      "Follow every action in the activity log",
    ],
  },
] as const;

const CAPABILITIES = [
  {
    icon: WifiOff,
    title: "Built for no signal",
    description:
      "Assigned surveys and the network data they need are cached on the device. Work is saved locally and synchronised automatically when the connection returns, with conflicts surfaced instead of silently overwritten.",
  },
  {
    icon: MapPin,
    title: "GPS-verified visits",
    description:
      "Every submission records latitude, longitude, accuracy and a timestamp, then compares the technician's position with the expected service location. Weak accuracy is flagged before the survey can be sent.",
  },
  {
    icon: ShieldCheck,
    title: "Feasibility before submission",
    description:
      "The server checks that the box exists, the port is free, the line reaches it and the capacity is sufficient, so an impossible connection is caught in the field instead of weeks later.",
  },
  {
    icon: ScrollText,
    title: "Every action logged",
    description:
      "Opens, edits, submissions and reviews are written to an audit trail with the responsible user, so a supervisor can see how a survey arrived and what changed along the way.",
  },
] as const;

function PreviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}

export default function Home() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-border">
        <div className={cn(CONTAINER, "flex items-center gap-3 py-3")}>
          <Link
            href="/"
            aria-label="Network Service Survey"
            className="flex items-center gap-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="inline-flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Network aria-hidden className="size-4" />
            </span>
            <span className="hidden text-sm font-semibold leading-tight sm:inline">
              Network Service Survey
            </span>
          </Link>

          <div className="ml-auto flex items-center gap-1.5">
            <ThemeToggle />
            <Link href="/login" className={buttonVariants({ size: "sm" })}>
              <LogIn aria-hidden />
              Sign in
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section
          aria-labelledby="hero-heading"
          className={cn(
            CONTAINER,
            "grid gap-10 py-12 sm:py-16 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-14 lg:py-20",
          )}
        >
          <div className="space-y-6">
            <Badge variant="outline">
              <Wifi aria-hidden className="size-3.5" />
              Fixed and Wi-Fi network operations
            </Badge>

            <div className="space-y-4">
              <h1
                id="hero-heading"
                className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl"
              >
                Verify every network change on site, then hand it straight to review.
              </h1>
              <p className="max-w-xl text-pretty text-base text-muted-foreground sm:text-lg">
                Network Service Survey puts the service, the old network and the proposed new network
                on one screen. Technicians confirm the box, port and line, record what they found and
                submit a GPS-verified survey that a supervisor can approve without chasing paperwork.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/login"
                className={cn(buttonVariants({ size: "lg" }), "w-full sm:w-auto")}
              >
                <LogIn aria-hidden />
                Sign in
              </Link>
              <Link
                href="#workflow"
                className={cn(
                  buttonVariants({ variant: "outline", size: "lg" }),
                  "w-full sm:w-auto",
                )}
              >
                See how it works
                <ArrowRight aria-hidden />
              </Link>
            </div>
          </div>

          <figure className="w-full max-w-md lg:max-w-none">
            <Card className="overflow-hidden shadow-sm">
              <div className="flex items-center justify-between gap-3 border-b border-border bg-muted/40 px-4 py-3">
                <p className="font-mono text-sm font-medium">SV-2026-0148</p>
                <StatusBadge tone="progress">In progress</StatusBadge>
              </div>
              <CardContent className="space-y-4 p-4 sm:p-5">
                <dl className="space-y-2.5 text-sm">
                  <PreviewRow label="Service" value="Fixed line, Zone 3" />
                  <PreviewRow label="Old network" value="BOX-22 / PORT-04 / LINE-05" />
                  <PreviewRow label="New network" value="BOX-22 / PORT-03 / LINE-05" />
                  <PreviewRow label="Capacity" value="32 of 100 used" />
                </dl>

                <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
                  <StatusBadge tone="success">Technically feasible</StatusBadge>
                  <StatusBadge tone="warning">Pending sync</StatusBadge>
                </div>

                <p className="text-xs text-muted-foreground">
                  GPS accuracy 8 m, captured at 10:42.
                </p>
              </CardContent>
            </Card>
            <figcaption className="mt-3 text-xs text-muted-foreground">
              A survey as the technician sees it: existing network data is already filled in, so only
              the field observations are entered.
            </figcaption>
          </figure>
        </section>

        <section
          id="workflow"
          aria-labelledby="workflow-heading"
          className="border-y border-border bg-muted/40"
        >
          <div className={cn(CONTAINER, "space-y-8 py-12 sm:py-16")}>
            <div className="max-w-2xl space-y-2">
              <h2
                id="workflow-heading"
                className="text-2xl font-semibold tracking-tight sm:text-3xl"
              >
                One survey, seven steps
              </h2>
              <p className="text-pretty text-sm text-muted-foreground sm:text-base">
                Every screen follows the same path, from the first service lookup to the approved
                result.
              </p>
            </div>

            <ol className="grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
              {WORKFLOW.map((step, index) => (
                <li key={step.title} className="flex gap-3">
                  <span
                    aria-hidden
                    className="inline-flex size-7 shrink-0 items-center justify-center rounded-full border border-border bg-card text-xs font-semibold tabular-nums"
                  >
                    {index + 1}
                  </span>
                  <div className="space-y-0.5">
                    <h3 className="text-sm font-medium leading-tight">{step.title}</h3>
                    <p className="text-sm text-muted-foreground">{step.description}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section aria-labelledby="roles-heading" className={cn(CONTAINER, "space-y-8 py-12 sm:py-16")}>
          <div className="max-w-2xl space-y-2">
            <h2 id="roles-heading" className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Built around three roles
            </h2>
            <p className="text-pretty text-sm text-muted-foreground sm:text-base">
              Access follows the role, and the server enforces it: technicians survey, supervisors
              decide, administrators keep the network data correct.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {ROLES.map(({ icon: Icon, title, summary, points }) => (
              <Card key={title} className="h-full">
                <CardContent className="flex h-full flex-col gap-4 p-5">
                  <div className="flex items-start gap-3">
                    <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon aria-hidden className="size-5" />
                    </span>
                    <div className="space-y-0.5">
                      <h3 className="text-base font-semibold leading-tight">{title}</h3>
                      <p className="text-sm text-muted-foreground">{summary}</p>
                    </div>
                  </div>

                  <ul className="space-y-2 text-sm">
                    {points.map((point) => (
                      <li key={point} className="flex gap-2">
                        <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section
          aria-labelledby="capabilities-heading"
          className="border-t border-border bg-muted/40"
        >
          <div className={cn(CONTAINER, "space-y-8 py-12 sm:py-16")}>
            <div className="max-w-2xl space-y-2">
              <h2
                id="capabilities-heading"
                className="text-2xl font-semibold tracking-tight sm:text-3xl"
              >
                Made for the field, not the office
              </h2>
              <p className="text-pretty text-sm text-muted-foreground sm:text-base">
                Lost signal, occupied ports and unclear handovers are the failure modes this platform
                is designed around.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {CAPABILITIES.map(({ icon: Icon, title, description }) => (
                <div key={title} className="flex gap-3 rounded-xl border border-border bg-card p-5">
                  <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <Icon aria-hidden className="size-4" />
                  </span>
                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold">{title}</h3>
                    <p className="text-sm text-muted-foreground">{description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div
          className={cn(
            CONTAINER,
            "flex flex-col gap-3 py-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between",
          )}
        >
          <p className="flex items-center gap-2">
            <Network aria-hidden className="size-4" />
            Network Service Survey
          </p>
          <p className="text-xs">
            Field survey platform for fixed and Wi-Fi network technicians and their supervisors.
          </p>
          <Link href="/login" className="font-medium text-foreground underline-offset-4 hover:underline">
            Sign in
          </Link>
        </div>
      </footer>
    </div>
  );
}
