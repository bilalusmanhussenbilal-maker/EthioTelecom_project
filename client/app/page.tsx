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
  WifiOff,
} from "lucide-react";
import { ScrollHeader } from "@/components/landing/scroll-header";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const CONTAINER = "mx-auto w-full max-w-6xl px-4 sm:px-6";

const HERO_FACTS = ["Works offline", "GPS verified", "Role-based access"] as const;

const BENEFITS = [
  {
    icon: WifiOff,
    title: "Works offline",
    description: "Surveys and network data are cached on the device.",
  },
  {
    icon: MapPin,
    title: "GPS verified",
    description: "Latitude, longitude, accuracy and time on every submission.",
  },
  {
    icon: ShieldCheck,
    title: "Validated up front",
    description: "The box, port, line and capacity are checked before submission.",
  },
  {
    icon: ScrollText,
    title: "Fully audited",
    description: "Every open, edit, submission and review is logged.",
  },
] as const;

const WORKFLOW = [
  { title: "Service", description: "Find the service and its address." },
  { title: "Old network", description: "Confirm the current box, port and line." },
  { title: "Change or shift", description: "Choose the new connection or move." },
  { title: "New network", description: "Pick an available box, port and line." },
  { title: "Survey", description: "Verify on site and record what you found." },
  { title: "Verification", description: "The supervisor reviews and decides." },
  { title: "Completion", description: "Approved, closed and logged." },
] as const;

const ROLES = [
  {
    icon: ClipboardList,
    title: "Technician",
    summary: "Surveys assigned jobs on site.",
    points: ["Search services", "Compare old and new network", "Verify box, port and line"],
  },
  {
    icon: ClipboardCheck,
    title: "Supervisor",
    summary: "Reviews the work and decides.",
    points: ["Monitor technicians", "Approve, reject or return", "Report on completion"],
  },
  {
    icon: Boxes,
    title: "Administrator",
    summary: "Owns the network data.",
    points: ["Manage users and roles", "Maintain boxes, ports and lines", "Configure thresholds and logging"],
  },
] as const;

function SectionHeading({
  id,
  eyebrow,
  title,
  description,
}: {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mx-auto max-w-2xl space-y-3 text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {eyebrow}
      </p>
      <h2 id={id} className="text-3xl font-semibold tracking-tight sm:text-4xl">
        {title}
      </h2>
      <p className="text-pretty text-base text-muted-foreground">{description}</p>
    </div>
  );
}

export default function Home() {
  return (
    <div className="landing-shell dark flex min-h-dvh flex-col bg-background text-foreground">
      <ScrollHeader>
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
           <Link href="/login" className={buttonVariants({ size: "sm" })}>
              <LogIn aria-hidden />
              Sign in
            </Link>
          </div>
        </div>
      </ScrollHeader>

      <main className="flex-1">
        <section className="landing-hero relative overflow-hidden text-foreground">
          <div
            className={cn(
              CONTAINER,
              "relative z-10 flex flex-col items-center gap-7 py-20 text-center sm:py-28 lg:py-32",
            )}
          >
            <Badge variant="outline" className="border-white/20 bg-white/10 text-white/80 backdrop-blur">
              Field survey platform
            </Badge>

            <h1 className="text-balance text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
              Survey the network on site.
              <br className="hidden sm:block" />{" "}
              <span className="landing-accent-text">Approve it in one place.</span>
            </h1>

            <p className="max-w-xl text-pretty text-base text-foreground/80 sm:text-lg">
              One screen for the service, the old network and the new one. Confirm the box, port and
              line, then submit a GPS-verified survey.
            </p>

            <div className="flex w-full flex-col justify-center gap-3 sm:w-auto sm:flex-row">
              <Link href="/login" className={cn(buttonVariants({ size: "lg" }), "w-full sm:w-auto")}>
                <LogIn aria-hidden />
                Sign in
              </Link>
              <Link
                href="#workflow"
                className={cn(
                  buttonVariants({ variant: "outline", size: "lg" }),
                  "w-full border-white/20 bg-white/5 hover:bg-white/10 sm:w-auto",
                )}
              >
                How it works
                <ArrowRight aria-hidden />
              </Link>
            </div>

            <ul className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-foreground/75">
              {HERO_FACTS.map((fact) => (
                <li key={fact} className="flex items-center gap-2">
                  <Check aria-hidden className="size-4 text-foreground" />
                  {fact}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section aria-labelledby="benefits-heading" className={cn(CONTAINER, "space-y-10 py-16 sm:py-20")}>
          <SectionHeading
            id="benefits-heading"
            eyebrow="Why it works"
            title="Built for field work"
            description="Designed around lost signal, occupied ports and unclear handovers."
          />

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {BENEFITS.map(({ icon: Icon, title, description }) => (
              <Card
                key={title}
                className="h-full transition-colors hover:border-primary/40"
              >
                <CardContent className="flex h-full flex-col gap-3 p-6">
                  <span className="inline-flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon aria-hidden className="size-5" />
                  </span>
                  <h3 className="text-base font-semibold leading-tight">{title}</h3>
                  <p className="text-sm text-muted-foreground">{description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section
          id="workflow"
          aria-labelledby="workflow-heading"
          className="border-y border-border bg-muted/40"
        >
          <div className={cn(CONTAINER, "space-y-10 py-16 sm:py-20")}>
            <SectionHeading
              id="workflow-heading"
              eyebrow="Workflow"
              title="One survey, seven steps"
              description="The same path on every screen, from service lookup to approval."
            />

            <ol className="grid gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
              {WORKFLOW.map((step, index) => (
                <li key={step.title} className="flex gap-4">
                  <span
                    aria-hidden
                    className="inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-primary/40 bg-primary/10 text-sm font-semibold tabular-nums text-primary"
                  >
                    {index + 1}
                  </span>
                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold leading-tight">{step.title}</h3>
                    <p className="text-sm text-muted-foreground">{step.description}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section aria-labelledby="roles-heading" className={cn(CONTAINER, "space-y-10 py-16 sm:py-20")}>
          <SectionHeading
            id="roles-heading"
            eyebrow="Roles"
            title="Three roles, one workflow"
            description="Technicians survey, supervisors decide, administrators keep the data correct."
          />

          <div className="grid gap-4 lg:grid-cols-3">
            {ROLES.map(({ icon: Icon, title, summary, points }) => (
              <Card key={title} className="h-full transition-colors hover:border-primary/40">
                <CardContent className="flex h-full flex-col gap-5 p-6">
                  <div className="flex items-start gap-3">
                    <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Icon aria-hidden className="size-5" />
                    </span>
                    <div className="space-y-1">
                      <h3 className="text-base font-semibold leading-tight">{title}</h3>
                      <p className="text-sm text-muted-foreground">{summary}</p>
                    </div>
                  </div>

                  <ul className="space-y-2 text-sm text-muted-foreground">
                    {points.map((point) => (
                      <li key={point} className="flex gap-2">
                        <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-primary" />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div
          className={cn(
            CONTAINER,
            "flex flex-col items-center gap-4 py-8 text-center sm:flex-row sm:justify-between sm:text-left",
          )}
        >
          <div className="flex items-center gap-2">
            <span className="inline-flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Network aria-hidden className="size-4" />
            </span>
            <div className="leading-tight">
              <p className="text-sm font-semibold">Network Service Survey</p>
              <p className="text-xs text-muted-foreground">Fixed and Wi-Fi network field teams.</p>
            </div>
          </div>

          <Link
            href="/login"
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "text-muted-foreground")}
          >
            Sign in
            <ArrowRight aria-hidden />
          </Link>
        </div>
      </footer>
    </div>
  );
}