"use client";

import Link from "next/link";
import { CalendarClock, CheckCircle2, ClipboardList, FileWarning, Loader2, RotateCcw } from "lucide-react";
import { AsyncBoundary } from "@/components/app/async-boundary";
import { Alert } from "@/components/app/alert";
import { PageHeader } from "@/components/app/page-header";
import { StatCard } from "@/components/app/stat-card";
import { SurveyTable } from "@/components/survey/survey-table";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAsync } from "@/lib/hooks/use-async";
import { formatDate } from "@/lib/format";
import { techniciansApi } from "@/lib/api/technicians";
import type { AuthenticatedUser } from "@/lib/api/types";

export function TechnicianDashboard({ user }: { user: AuthenticatedUser }) {
  const state = useAsync("technician-dashboard", () => techniciansApi.getMyDashboard());

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Hello, ${user.fullName.split(" ")[0]}`}
        description="Your assigned surveys and what needs attention today."
        actions={
          <Link href="/surveys" className={buttonVariants({ size: "sm" })}>
            Open my surveys
          </Link>
        }
      />

      <AsyncBoundary state={state} loadingLabel="Loading your dashboard">
        {(dashboard) => (
          <div className="space-y-6">
            {dashboard.nextDueDate ? (
              <Alert tone="info" title={`Next due ${formatDate(dashboard.nextDueDate)}`}>
                <p>
                  {dashboard.nextDueSurvey
                    ? `${dashboard.nextDueSurvey.surveyCode} is the earliest assignment with a due date.`
                    : "You have an assignment with a due date."}
                </p>
              </Alert>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="New" value={dashboard.counts.NEW} icon={FileWarning} tone="info" />
              <StatCard
                label="In progress"
                value={dashboard.counts.IN_PROGRESS}
                icon={Loader2}
                tone="progress"
              />
              <StatCard
                label="Awaiting review"
                value={dashboard.counts.AWAITING_REVIEW}
                icon={CalendarClock}
                tone="warning"
                hint="Submitted, waiting on a supervisor"
              />
              <StatCard
                label="Approved"
                value={dashboard.counts.APPROVED}
                icon={CheckCircle2}
                tone="success"
              />
            </div>

            {dashboard.counts.RETURNED + dashboard.counts.REJECTED > 0 ? (
              <Alert tone="warning" title="Surveys need rework">
                <p>
                  {dashboard.counts.RETURNED} returned and {dashboard.counts.REJECTED} rejected. Open them to
                  see the supervisor remark, correct the field data and submit again.
                </p>
              </Alert>
            ) : null}

            <Card>
              <CardHeader className="flex-row items-center justify-between gap-2">
                <CardTitle className="flex items-center gap-2">
                  <ClipboardList aria-hidden className="size-4 text-muted-foreground" />
                  Recent surveys
                </CardTitle>
                <Link
                  href="/surveys"
                  className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                >
                  View all
                </Link>
              </CardHeader>
              <CardContent className="px-0 sm:px-0">
                <SurveyTable
                  surveys={dashboard.recentSurveys}
                  emptyTitle="No surveys assigned yet"
                  emptyDescription="Your supervisor will assign surveys to you."
                />
              </CardContent>
            </Card>

            <div className="grid gap-3 sm:grid-cols-3">
              <StatCard label="Returned" value={dashboard.counts.RETURNED} icon={RotateCcw} tone="warning" />
              <StatCard label="Rejected" value={dashboard.counts.REJECTED} tone="danger" />
              <StatCard label="Total assigned" value={dashboard.counts.TOTAL} />
            </div>
          </div>
        )}
      </AsyncBoundary>
    </div>
  );
}