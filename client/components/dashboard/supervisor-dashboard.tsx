"use client";

import Link from "next/link";
import { CalendarClock, CheckCircle2, ClipboardList, Loader2, Users } from "lucide-react";
import { AsyncBoundary } from "@/components/app/async-boundary";
import { PageHeader } from "@/components/app/page-header";
import { StatCard } from "@/components/app/stat-card";
import { SurveyTable } from "@/components/survey/survey-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TableBody, TableCell, TableContainer, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAsync } from "@/lib/hooks/use-async";
import { surveysApi } from "@/lib/api/surveys";
import { techniciansApi } from "@/lib/api/technicians";

export function SupervisorDashboard() {
  const summary = useAsync("survey-summary", () => surveysApi.summary());
  const workload = useAsync("technician-workload", () => techniciansApi.list());
  const submitted = useAsync("awaiting-review", () =>
    surveysApi.list({ status: "COMPLETED", pageSize: 20 }),
  );

  const awaitingReview = (submitted.data?.items ?? []).filter((survey) => survey.completedAt === null);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Supervisor dashboard"
        description="Technician workload, the review queue and today's throughput."
      />

      <AsyncBoundary state={summary} loadingLabel="Loading survey totals">
        {(data) => (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="New" value={data.counts.NEW} icon={ClipboardList} tone="info" />
            <StatCard label="In progress" value={data.counts.IN_PROGRESS} icon={Loader2} tone="progress" />
            <StatCard
              label="Awaiting review"
              value={data.counts.AWAITING_REVIEW}
              icon={CalendarClock}
              tone="warning"
            />
            <StatCard label="Approved" value={data.counts.APPROVED} icon={CheckCircle2} tone="success" />
          </div>
        )}
      </AsyncBoundary>

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2">
            <CalendarClock aria-hidden className="size-4 text-muted-foreground" />
            Waiting on your review
          </CardTitle>
          <Link
            href="/surveys?status=COMPLETED"
            className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Open queue
          </Link>
        </CardHeader>
        <CardContent className="px-0 sm:px-0">
          <AsyncBoundary state={submitted} loadingLabel="Loading the review queue">
            {() => (
              <SurveyTable
                surveys={awaitingReview}
                emptyTitle="Nothing waiting"
                emptyDescription="Every submitted survey has been reviewed."
              />
            )}
          </AsyncBoundary>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2">
            <Users aria-hidden className="size-4 text-muted-foreground" />
            Technician workload
          </CardTitle>
          <Link
            href="/technicians"
            className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Manage
          </Link>
        </CardHeader>
        <CardContent className="px-0 sm:px-0">
          <AsyncBoundary state={workload} loadingLabel="Loading technicians">
            {(data) =>
              data.technicians.length === 0 ? (
                <EmptyState
                  icon={Users}
                  title="No technicians yet"
                  description="An administrator has to create technician accounts first."
                />
              ) : (
                <TableContainer className="rounded-none border-x-0 border-b-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Technician</TableHead>
                        <TableHead className="hidden sm:table-cell">Zone</TableHead>
                        <TableHead>New</TableHead>
                        <TableHead>Active</TableHead>
                        <TableHead className="hidden sm:table-cell">Awaiting review</TableHead>
                        <TableHead>Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.technicians.map((technician) => (
                        <TableRow key={technician.id}>
                          <TableCell>
                            <div className="space-y-0.5">
                              <p className="font-medium">{technician.fullName}</p>
                              <p className="text-xs text-muted-foreground">
                                {technician.employeeCode}
                                {technician.isActive ? "" : " - inactive"}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="hidden text-sm sm:table-cell">
                            {technician.zone ?? "-"}
                          </TableCell>
                          <TableCell className="tabular-nums">{technician.counts.NEW}</TableCell>
                          <TableCell className="tabular-nums">{technician.counts.IN_PROGRESS}</TableCell>
                          <TableCell className="hidden tabular-nums sm:table-cell">
                            {technician.counts.COMPLETED}
                          </TableCell>
                          <TableCell className="font-medium tabular-nums">{technician.counts.TOTAL}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )
            }
          </AsyncBoundary>
        </CardContent>
      </Card>
    </div>
  );
}