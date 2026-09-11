import { ArrowRight } from "lucide-react";
import { BoxStatusBadge, LineStatusBadge, PortStatusBadge } from "@/components/app/survey-badges";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KeyValue, KeyValueGrid } from "@/components/app/key-value";
import { cn } from "@/lib/utils";
import type { NetworkNode } from "@/lib/api/types";

export function RouteChips({ path, className }: { path: string[]; className?: string }) {
  if (path.length === 0) {
    return <span className="text-sm text-muted-foreground">Route not recorded</span>;
  }

  return (
    <ol className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {path.map((node, index) => (
        <li key={`${node}-${index}`} className="flex items-center gap-1.5">
          {index > 0 ? <ArrowRight aria-hidden className="size-3 shrink-0 text-muted-foreground" /> : null}
          <span className="rounded-md border border-border bg-muted/50 px-2 py-0.5 font-mono text-xs">
            {node}
          </span>
        </li>
      ))}
    </ol>
  );
}

export interface NetworkPathViewProps {
  title: string;
  node: NetworkNode | null;
  emptyMessage: string;
}

export function NetworkPathView({ title, node, emptyMessage }: NetworkPathViewProps) {
  const path = node?.line?.path ?? node?.line?.hops.map((hop) => hop.nodeCode) ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {!node || (!node.box && !node.port && !node.line) ? (
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        ) : (
          <div className="space-y-4">
            <KeyValueGrid>
              <KeyValue label="Box">
                {node.box ? (
                  <span className="flex items-center gap-2">
                    <span className="font-medium">{node.box.code}</span>
                    <BoxStatusBadge status={node.box.status} />
                  </span>
                ) : (
                  "-"
                )}
              </KeyValue>

              <KeyValue label="Port">
                {node.port ? (
                  <span className="flex items-center gap-2">
                    <span className="font-medium">{node.port.code}</span>
                    <PortStatusBadge status={node.port.status} />
                  </span>
                ) : (
                  "-"
                )}
              </KeyValue>

              <KeyValue label="Line">
                {node.line ? (
                  <span className="flex items-center gap-2">
                    <span className="font-medium">{node.line.code}</span>
                    <LineStatusBadge status={node.line.status} />
                  </span>
                ) : (
                  "-"
                )}
              </KeyValue>

              {node.line ? (
                <KeyValue label="Capacity">
                  <span className="tabular-nums">
                    {node.line.usedCapacity} of {node.line.capacity} used
                    {typeof node.line.availableCapacity === "number"
                      ? ` (${node.line.availableCapacity} free)`
                      : ""}
                  </span>
                </KeyValue>
              ) : null}

              {node.line?.type ? <KeyValue label="Line type">{node.line.type}</KeyValue> : null}
              {node.line?.cableInfo ? <KeyValue label="Cable">{node.line.cableInfo}</KeyValue> : null}
            </KeyValueGrid>

            {node.line ? (
              <div className="space-y-1.5">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Route</p>
                <RouteChips path={path} />
              </div>
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  );
}