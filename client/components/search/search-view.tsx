"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { Boxes, Cable, Loader2, MapPin, Search as SearchIcon } from "lucide-react";
import { AsyncBoundary } from "@/components/app/async-boundary";
import { PageHeader } from "@/components/app/page-header";
import { BoxStatusBadge, LineStatusBadge, PortStatusBadge } from "@/components/app/survey-badges";
import { RouteChips } from "@/components/survey/network-path-view";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { searchApi } from "@/lib/api/search";
import { SERVICE_TYPE_LABELS } from "@/lib/domain";
import { useAsync } from "@/lib/hooks/use-async";
import { cn } from "@/lib/utils";
import type { NetworkNode, SearchResults } from "@/lib/api/types";

type ResultTab = "services" | "boxes" | "ports" | "lines";

function MiniNetwork({ label, node }: { label: string; node: NetworkNode | null }) {
  if (!node || (!node.box && !node.port && !node.line)) {
    return (
      <div className="space-y-0.5">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="text-sm text-muted-foreground">Not set</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="flex flex-wrap items-center gap-1.5">
        {node.box ? <Badge variant="outline">{node.box.code}</Badge> : null}
        {node.port ? <Badge variant="outline">Port {node.port.code}</Badge> : null}
        {node.line ? <Badge variant="outline">{node.line.code}</Badge> : null}
      </div>
      {node.line ? (
        <RouteChips path={node.line.path ?? node.line.hops.map((hop) => hop.nodeCode)} />
      ) : null}
    </div>
  );
}

export function SearchView() {
  const [term, setTerm] = useState("");
  const [applied, setApplied] = useState("");
  const [tab, setTab] = useState<ResultTab>("services");

  const state = useAsync(`search:${applied}`, () =>
    applied ? searchApi.search(applied, 20) : Promise.resolve(null),
  );

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const query = term.trim();

    if (query.length >= 2) {
      setApplied(query);
    }
  }

  const results = state.data;

  const tabs: Array<{ value: ResultTab; label: string; count: number }> = results
    ? [
        { value: "services", label: "Services", count: results.totals.services },
        { value: "boxes", label: "Boxes", count: results.totals.boxes },
        { value: "ports", label: "Ports", count: results.totals.ports },
        { value: "lines", label: "Lines", count: results.totals.lines },
      ]
    : [];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Search"
        description="Find a service, box, port or line. Results include the network path, so you rarely need a second lookup."
      />

      <form className="flex gap-2" onSubmit={handleSubmit} role="search">
        <label className="sr-only" htmlFor="global-search">
          Search services, boxes, ports and lines
        </label>
        <Input
          id="global-search"
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          placeholder="SRV-001, customer name, BOX-22, port 03, address or area"
          autoComplete="off"
        />
        <Button type="submit" disabled={state.isLoading}>
          {state.isLoading ? <Loader2 aria-hidden className="animate-spin" /> : <SearchIcon aria-hidden />}
          Search
        </Button>
      </form>

      {!applied ? (
        <EmptyState
          icon={MapPin}
          title="Search for anything on the network"
          description="Try a service ID, a customer name, a box number, a port number, a street or a service area."
        />
      ) : (
        <AsyncBoundary state={state} loadingLabel="Searching">
          {(data) => {
            const total =
              (data?.totals.services ?? 0) +
              (data?.totals.boxes ?? 0) +
              (data?.totals.ports ?? 0) +
              (data?.totals.lines ?? 0);

            if (!data || total === 0) {
              return (
                <EmptyState
                  icon={SearchIcon}
                  title={`Nothing matched "${applied}"`}
                  description="Check the spelling, or try a shorter term such as the box number."
                />
              );
            }

            return (
              <div className="space-y-4">
                <div
                  role="tablist"
                  aria-label="Result type"
                  className="flex gap-1 overflow-x-auto rounded-lg border border-border p-1"
                >
                  {tabs.map((item) => {
                    const active = item.value === tab;

                    return (
                      <button
                        key={item.value}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        onClick={() => setTab(item.value)}
                        className={cn(
                          "whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          active
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                        )}
                      >
                        {item.label} ({item.count})
                      </button>
                    );
                  })}
                </div>

                {tab === "services" ? <ServiceResults results={data} /> : null}
                {tab === "boxes" ? <BoxResults results={data} /> : null}
                {tab === "ports" ? <PortResults results={data} /> : null}
                {tab === "lines" ? <LineResults results={data} /> : null}
              </div>
            );
          }}
        </AsyncBoundary>
      )}
    </div>
  );
}

function ServiceResults({ results }: { results: SearchResults }) {
  if (results.services.length === 0) {
    return <EmptyState title="No services matched" description="Try the Boxes, Ports or Lines tab." />;
  }

  return (
    <ul className="grid gap-3">
      {results.services.map((service) => (
        <li key={service.id}>
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle>{service.serviceCode}</CardTitle>
                <Badge variant="secondary">{SERVICE_TYPE_LABELS[service.serviceType]}</Badge>
                <Badge variant="muted">{service.status}</Badge>
                {service.surveyStatus ? (
                  <Badge variant="outline">Survey: {service.surveyStatus}</Badge>
                ) : null}
              </div>
              <p className="text-sm text-muted-foreground">
                {service.customerName} - {service.serviceAddress}
              </p>
              <p className="text-xs text-muted-foreground">
                {service.area.name} ({service.area.code})
                {service.area.zone ? ` - ${service.area.zone}` : ""}
              </p>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <MiniNetwork label="Old network" node={service.oldNetwork} />
              <MiniNetwork label="New network" node={service.newNetwork} />
            </CardContent>
          </Card>
        </li>
      ))}
    </ul>
  );
}

function BoxResults({ results }: { results: SearchResults }) {
  if (results.boxes.length === 0) {
    return <EmptyState icon={Boxes} title="No boxes matched" />;
  }

  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {results.boxes.map((box) => (
        <li key={box.id}>
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle>{box.code}</CardTitle>
                <BoxStatusBadge status={box.status} />
                <Badge variant="muted">{box.type}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {box.name ?? "Unnamed"}
                {box.area ? ` - ${box.area.name}` : ""}
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              <dl className="grid grid-cols-4 gap-2 text-center">
                <div className="rounded-lg border border-border p-2">
                  <dt className="text-[11px] uppercase text-muted-foreground">Total</dt>
                  <dd className="text-sm font-semibold tabular-nums">{box.portSummary.total}</dd>
                </div>
                <div className="rounded-lg border border-border p-2">
                  <dt className="text-[11px] uppercase text-muted-foreground">Free</dt>
                  <dd className="text-sm font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                    {box.portSummary.available}
                  </dd>
                </div>
                <div className="rounded-lg border border-border p-2">
                  <dt className="text-[11px] uppercase text-muted-foreground">Used</dt>
                  <dd className="text-sm font-semibold tabular-nums">{box.portSummary.occupied}</dd>
                </div>
                <div className="rounded-lg border border-border p-2">
                  <dt className="text-[11px] uppercase text-muted-foreground">Faulty</dt>
                  <dd className="text-sm font-semibold tabular-nums text-destructive">
                    {box.portSummary.faulty}
                  </dd>
                </div>
              </dl>

              {box.relatedServices.length > 0 ? (
                <div className="space-y-1">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Related services
                  </p>
                  <ul className="flex flex-wrap gap-1.5">
                    {box.relatedServices.map((service) => (
                      <li key={service.id}>
                        <Badge variant="outline">
                          {service.serviceCode} - {service.customerName}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </li>
      ))}
    </ul>
  );
}

function PortResults({ results }: { results: SearchResults }) {
  if (results.ports.length === 0) {
    return <EmptyState icon={Boxes} title="No ports matched" />;
  }

  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {results.ports.map((port) => (
        <li key={port.id} className="rounded-xl border border-border p-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">
              {port.box?.code ?? "?"} / Port {port.code}
            </span>
            <PortStatusBadge status={port.status} />
          </div>
          {port.notes ? <p className="text-xs text-muted-foreground">{port.notes}</p> : null}
          {port.relatedServices.length > 0 ? (
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {port.relatedServices.map((service) => (
                <li key={service.id}>
                  <Badge variant="outline">{service.serviceCode}</Badge>
                </li>
              ))}
            </ul>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function LineResults({ results }: { results: SearchResults }) {
  if (results.lines.length === 0) {
    return <EmptyState icon={Cable} title="No lines matched" />;
  }

  return (
    <ul className="grid gap-3">
      {results.lines.map((line) => (
        <li key={line.id}>
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle>{line.code}</CardTitle>
                <LineStatusBadge status={line.status} />
                <Badge variant="muted">{line.type}</Badge>
                <Badge variant="outline">
                  {line.availableCapacity} of {line.capacity} free
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">{line.name ?? "Unnamed line"}</p>
            </CardHeader>
            <CardContent className="space-y-3">
              <RouteChips path={line.path} />
              {line.relatedServices.length > 0 ? (
                <ul className="flex flex-wrap gap-1.5">
                  {line.relatedServices.map((service) => (
                    <li key={service.id}>
                      <Badge variant="outline">
                        {service.serviceCode} - {service.customerName}
                      </Badge>
                    </li>
                  ))}
                </ul>
              ) : null}
            </CardContent>
          </Card>
        </li>
      ))}
    </ul>
  );
}