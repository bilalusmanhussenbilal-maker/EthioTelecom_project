"use client";

import { useState } from "react";
import { HardHat, Phone, RefreshCw } from "lucide-react";
import { Alert } from "@/components/app/alert";
import { AsyncBoundary } from "@/components/app/async-boundary";
import { PageHeader } from "@/components/app/page-header";
import { StatCard } from "@/components/app/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ApiError } from "@/lib/api/client";
import { toApiError } from "@/lib/api/errors";
import { techniciansApi } from "@/lib/api/technicians";
import { useAsync } from "@/lib/hooks/use-async";
import { cn } from "@/lib/utils";

export function TechniciansView() {
  const [refreshToken, setRefreshToken] = useState(0);
  const [error, setError] = useState<ApiError | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const state = useAsync(`technicians:${refreshToken}`, () => techniciansApi.list());

  async function toggleAvailability(id: string, isAvailable: boolean) {
    setBusyId(id);
    setError(null);

    try {
      await techniciansApi.setAvailability(id, !isAvailable);
      setRefreshToken((value) => value + 1);
    } catch (cause) {
      setError(toApiError(cause, "Could not update availability"));
    } finally {
      setBusyId(null);
    }
  }

  const totals = (state.data?.technicians ?? []).reduce(
    (accumulator, technician) => ({
      open: accumulator.open + technician.counts.NEW + technician.counts.IN_PROGRESS,
      awaitingReview: accumulator.awaitingReview + technician.counts.COMPLETED,
      returned: accumulator.returned + technician.counts.RETURNED + technician.counts.REJECTED,
    }),
    { open: 0, awaitingReview: 0, returned: 0 },
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="Technicians"
        description="Field workload at a glance. Mark someone unavailable when they are off shift."
        actions={
          <Button variant="outline" size="sm" onClick={() => setRefreshToken((value) => value + 1)}>
            <RefreshCw aria-hidden />
            Refresh
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Open work" value={totals.open} tone="progress" hint="New and in progress" />
        <StatCard label="Awaiting review" value={totals.awaitingReview} tone="warning" />
        <StatCard label="Needs rework" value={totals.returned} tone="danger" hint="Returned or rejected" />
      </div>

      {error ? <Alert tone="danger" title={error.message} /> : null}

      <AsyncBoundary state={state} loadingLabel="Loading technicians">
        {(data) =>
          data.technicians.length === 0 ? (
            <EmptyState
              icon={HardHat}
              title="No technicians yet"
              description="An administrator creates technician accounts from the Users page."
            />
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {data.technicians.map((technician) => (
                <li key={technician.id}>
                  <Card className={cn(!technician.isActive && "opacity-60")}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-0.5">
                          <CardTitle>{technician.fullName}</CardTitle>
                          <p className="text-xs text-muted-foreground">
                            {technician.employeeCode}
                            {technician.zone ? ` - ${technician.zone}` : ""}
                          </p>
                        </div>
                        <Badge variant={technician.isAvailable ? "secondary" : "muted"}>
                          {technician.isAvailable ? "Available" : "Unavailable"}
                        </Badge>
                      </div>
                      {technician.phoneNumber ? (
                        <a
                          href={`tel:${technician.phoneNumber}`}
                          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                        >
                          <Phone aria-hidden className="size-3.5" />
                          {technician.phoneNumber}
                        </a>
                      ) : null}
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <dl className="grid grid-cols-4 gap-2 text-center">
                        <div className="rounded-lg border border-border p-2">
                          <dt className="text-[11px] uppercase text-muted-foreground">New</dt>
                          <dd className="text-sm font-semibold tabular-nums">{technician.counts.NEW}</dd>
                        </div>
                        <div className="rounded-lg border border-border p-2">
                          <dt className="text-[11px] uppercase text-muted-foreground">Active</dt>
                          <dd className="text-sm font-semibold tabular-nums">{technician.counts.IN_PROGRESS}</dd>
                        </div>
                        <div className="rounded-lg border border-border p-2">
                          <dt className="text-[11px] uppercase text-muted-foreground">Done</dt>
                          <dd className="text-sm font-semibold tabular-nums">{technician.counts.COMPLETED}</dd>
                        </div>
                        <div className="rounded-lg border border-border p-2">
                          <dt className="text-[11px] uppercase text-muted-foreground">Rework</dt>
                          <dd className="text-sm font-semibold tabular-nums text-destructive">
                            {technician.counts.RETURNED + technician.counts.REJECTED}
                          </dd>
                        </div>
                      </dl>

                      <Button
                        variant="outline"
                        size="sm"
                        block
                        disabled={busyId === technician.id || !technician.isActive}
                        onClick={() => void toggleAvailability(technician.id, technician.isAvailable)}
                      >
                        {technician.isAvailable ? "Mark unavailable" : "Mark available"}
                      </Button>
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ul>
          )
        }
      </AsyncBoundary>
    </div>
  );
}