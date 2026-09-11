"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { AsyncBoundary } from "@/components/app/async-boundary";
import { PageHeader } from "@/components/app/page-header";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableContainer, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { networkApi } from "@/lib/api/network";
import { reportsApi } from "@/lib/api/reports";
import { useAsync } from "@/lib/hooks/use-async";
import { cn } from "@/lib/utils";
import type { ReportKey, ReportTable } from "@/lib/api/types";

/** Which column each report should chart, and which column labels the bars. */
const CHART_COLUMN: Record<ReportKey, { label: string; value: string }> = {
  "survey-summary": { label: "status", value: "count" },
  "port-availability": { label: "box", value: "available" },
  "box-utilization": { label: "area", value: "utilizationPercent" },
  "line-capacity": { label: "line", value: "available" },
  "technician-performance": { label: "technician", value: "total" },
  "services-by-area": { label: "area", value: "total" },
};

function ReportBars({ table }: { table: ReportTable }) {
  const config = CHART_COLUMN[table.key];
  const points = table.rows
    .filter((row) => String(row[config.label] ?? "") !== "TOTAL")
    .map((row) => ({
      label: String(row[config.label] ?? "-"),
      value: typeof row[config.value] === "number" ? (row[config.value] as number) : 0,
    }));

  const max = points.reduce((highest, point) => Math.max(highest, point.value), 0);

  if (points.length === 0 || max === 0) {
    return (
      <p className="text-sm text-muted-foreground">Not enough data to chart this report yet.</p>
    );
  }

  return (
    <ul className="space-y-2">
      {points.map((point) => (
        <li key={point.label} className="space-y-1">
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate">{point.label}</span>
            <span className="tabular-nums text-muted-foreground">{point.value}</span>
          </div>
          <div
            role="img"
            aria-label={`${point.label}: ${point.value}`}
            className="h-2 w-full overflow-hidden rounded-full bg-muted"
          >
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${Math.max(2, (point.value / max) * 100)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

function ReportTableView({ table }: { table: ReportTable }) {
  return (
    <TableContainer>
      <Table>
        <TableHeader>
          <TableRow>
            {table.columns.map((column) => (
              <TableHead key={column.key}>{column.header}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {table.rows.map((row, rowIndex) => (
            <TableRow
              key={rowIndex}
              className={cn(String(row[table.columns[0]?.key ?? ""] ?? "") === "TOTAL" && "font-medium")}
            >
              {table.columns.map((column) => (
                <TableCell key={column.key} className="whitespace-nowrap">
                  {row[column.key] === null || row[column.key] === undefined ? "-" : String(row[column.key])}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

export function ReportsView() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [areaId, setAreaId] = useState("");
  const [selectedKey, setSelectedKey] = useState<ReportKey | null>(null);

  const filters = {
    ...(from ? { from: new Date(from).toISOString() } : {}),
    ...(to ? { to: new Date(to).toISOString() } : {}),
    ...(areaId ? { areaId } : {}),
  };

  const reports = useAsync(`reports:${from}:${to}:${areaId}`, () =>
    reportsApi.list(filters).then((response) => response.reports),
  );
  const areas = useAsync("reports-areas", () => networkApi.getAreas());

  const active = reports.data?.find((table) => table.key === selectedKey) ?? reports.data?.[0] ?? null;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Reports"
        description="Survey throughput, port availability, line headroom and technician performance."
      />

      <Card>
        <CardContent className="grid gap-4 p-4 sm:grid-cols-3 sm:p-5">
          <div className="space-y-1.5">
            <Label htmlFor="report-from">From</Label>
            <Input id="report-from" type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="report-to">To</Label>
            <Input id="report-to" type="date" value={to} onChange={(event) => setTo(event.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="report-area">Service area</Label>
            <Select id="report-area" value={areaId} onChange={(event) => setAreaId(event.target.value)}>
              <option value="">All areas</option>
              {(areas.data?.areas ?? []).map((area) => (
                <option key={area.id} value={area.id}>
                  {area.code} - {area.name}
                </option>
              ))}
            </Select>
          </div>
        </CardContent>
      </Card>

      <AsyncBoundary state={reports} loadingLabel="Building reports">
        {(tables) => {
          if (!active) {
            return <p className="text-sm text-muted-foreground">No reports available.</p>;
          }

          return (
            <div className="space-y-4">
              <div
                role="tablist"
                aria-label="Report"
                className="flex gap-1 overflow-x-auto rounded-lg border border-border p-1"
              >
                {tables.map((table) => {
                  const isActive = table.key === active.key;

                  return (
                    <button
                      key={table.key}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      onClick={() => setSelectedKey(table.key)}
                      className={cn(
                        "whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                      )}
                    >
                      {table.title}
                    </button>
                  );
                })}
              </div>

              <Card>
                <CardHeader className="flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1">
                    <CardTitle>{active.title}</CardTitle>
                    <p className="text-sm text-muted-foreground">{active.description}</p>
                  </div>
                  <a
                    href={reportsApi.exportUrl(active.key, filters)}
                    className={buttonVariants({ variant: "outline", size: "sm" })}
                    download
                  >
                    <Download aria-hidden className="size-4" />
                    Export CSV
                  </a>
                </CardHeader>
                <CardContent className="space-y-5 px-0 sm:px-0">
                  <div className="px-4 sm:px-5">
                    <ReportBars table={active} />
                  </div>
                  <ReportTableView table={active} />
                </CardContent>
              </Card>

              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                {reports.isLoading ? <Loader2 aria-hidden className="size-3.5 animate-spin" /> : null}
                Generated {new Date(active.generatedAt).toLocaleString()} - {active.rows.length} rows
              </p>
            </div>
          );
        }}
      </AsyncBoundary>

      <Card>
        <CardHeader>
          <CardTitle>Included reports</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {reports.data?.map((table) => (
            <Badge key={table.key} variant="muted">
              {table.title}
            </Badge>
          ))}
          {!reports.data ? <Button variant="ghost" size="sm" onClick={reports.reload}>Reload</Button> : null}
        </CardContent>
      </Card>
    </div>
  );
}