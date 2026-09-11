"use client";

import Link from "next/link";
import { BarChart3, Boxes, ClipboardList, Loader2, Users } from "lucide-react";
import { AsyncBoundary } from "@/components/app/async-boundary";
import { PageHeader } from "@/components/app/page-header";
import { StatCard } from "@/components/app/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { useAsync } from "@/lib/hooks/use-async";
import { networkApi } from "@/lib/api/network";
import { surveysApi } from "@/lib/api/surveys";
import { usersApi } from "@/lib/api/users";

export function AdminDashboard() {
  const summary = useAsync("admin-survey-summary", () => surveysApi.summary());
  const users = useAsync("admin-user-total", () => usersApi.list({ pageSize: 1 }));
  const network = useAsync("admin-network-totals", () => networkApi.getOptions());

  const portTotals = (network.data?.boxes ?? []).reduce(
    (accumulator, box) => ({
      total: accumulator.total + box.portSummary.total,
      available: accumulator.available + box.portSummary.available,
      occupied: accumulator.occupied + box.portSummary.occupied,
      faulty: accumulator.faulty + box.portSummary.faulty,
    }),
    { total: 0, available: 0, occupied: 0, faulty: 0 },
  );

  const lineCapacity = (network.data?.lines ?? []).reduce(
    (accumulator, line) => ({
      capacity: accumulator.capacity + line.capacity,
      used: accumulator.used + line.usedCapacity,
    }),
    { capacity: 0, used: 0 },
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Administration"
        description="System-wide survey activity and network inventory."
        actions={
          <Link href="/admin/users" className={buttonVariants({ size: "sm" })}>
            Manage users
          </Link>
        }
      />

      <AsyncBoundary state={summary} loadingLabel="Loading survey totals">
        {(data) => (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="All surveys" value={data.counts.TOTAL} icon={ClipboardList} />
            <StatCard label="In progress" value={data.counts.IN_PROGRESS} icon={Loader2} tone="progress" />
            <StatCard label="Awaiting review" value={data.counts.AWAITING_REVIEW} tone="warning" />
            <StatCard label="Approved" value={data.counts.APPROVED} tone="success" />
          </div>
        )}
      </AsyncBoundary>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <AsyncBoundary state={users} loadingLabel="Loading accounts">
          {(data) => <StatCard label="Accounts" value={data.total} icon={Users} hint="Users and technicians" />}
        </AsyncBoundary>
        <AsyncBoundary state={network} loadingLabel="Loading network">
          {(data) => (
            <StatCard
              label="Service areas"
              value={data.areas.length}
              icon={Boxes}
              hint={`${data.boxes.length} boxes`}
            />
          )}
        </AsyncBoundary>
        <AsyncBoundary state={network} loadingLabel="Loading network">
          {() => (
            <StatCard
              label="Ports available"
              value={portTotals.available}
              hint={`${portTotals.occupied} occupied, ${portTotals.faulty} faulty`}
              tone="success"
            />
          )}
        </AsyncBoundary>
        <AsyncBoundary state={network} loadingLabel="Loading network">
          {() => (
            <StatCard
              label="Line capacity free"
              value={lineCapacity.capacity - lineCapacity.used}
              hint={`${lineCapacity.used} of ${lineCapacity.capacity} in use`}
              icon={BarChart3}
            />
          )}
        </AsyncBoundary>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Network inventory</CardTitle>
        </CardHeader>
        <CardContent>
          <AsyncBoundary state={network} loadingLabel="Loading network inventory">
            {(data) => (
              <ul className="grid gap-2 text-sm sm:grid-cols-2">
                <li className="flex justify-between gap-4 rounded-lg border border-border px-3 py-2">
                  <span className="text-muted-foreground">Service areas</span>
                  <span className="font-medium tabular-nums">{data.areas.length}</span>
                </li>
                <li className="flex justify-between gap-4 rounded-lg border border-border px-3 py-2">
                  <span className="text-muted-foreground">Boxes</span>
                  <span className="font-medium tabular-nums">{data.boxes.length}</span>
                </li>
                <li className="flex justify-between gap-4 rounded-lg border border-border px-3 py-2">
                  <span className="text-muted-foreground">Ports</span>
                  <span className="font-medium tabular-nums">{portTotals.total}</span>
                </li>
                <li className="flex justify-between gap-4 rounded-lg border border-border px-3 py-2">
                  <span className="text-muted-foreground">Lines</span>
                  <span className="font-medium tabular-nums">{data.lines.length}</span>
                </li>
              </ul>
            )}
          </AsyncBoundary>
        </CardContent>
      </Card>
    </div>
  );
}