"use client";

import { useState } from "react";
import type { KeyboardEvent } from "react";
import { AreasManager } from "@/components/admin/areas-manager";
import { BoxesManager } from "@/components/admin/boxes-manager";
import { LinesManager } from "@/components/admin/lines-manager";
import { ServicesManager } from "@/components/admin/services-manager";
import { PageHeader } from "@/components/app/page-header";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "areas", label: "Service areas", hint: "AGENTS.md #8" },
  { id: "boxes", label: "Boxes and ports", hint: "AGENTS.md #6" },
  { id: "lines", label: "Lines and routes", hint: "AGENTS.md #7" },
  { id: "services", label: "Services", hint: "AGENTS.md #4 and #5" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function NetworkView() {
  const [tab, setTab] = useState<TabId>("areas");

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const index = TABS.findIndex((item) => item.id === tab);
    let next = index;

    if (event.key === "ArrowRight") {
      next = (index + 1) % TABS.length;
    } else if (event.key === "ArrowLeft") {
      next = (index - 1 + TABS.length) % TABS.length;
    } else if (event.key === "Home") {
      next = 0;
    } else if (event.key === "End") {
      next = TABS.length - 1;
    } else {
      return;
    }

    event.preventDefault();

    const target = TABS[next];

    if (target) {
      setTab(target.id);
      document.getElementById(`network-tab-${target.id}`)?.focus();
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Network and service data"
        description="Administrator-only master data: service areas, boxes, ports, lines and services. Every change is written to the activity log."
      />

      <div
        role="tablist"
        aria-label="Network data"
        onKeyDown={handleKeyDown}
        className="flex flex-wrap gap-1 rounded-lg border border-border bg-muted/40 p-1"
      >
        {TABS.map((item) => {
          const selected = tab === item.id;

          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              id={`network-tab-${item.id}`}
              aria-selected={selected}
              aria-controls={`network-panel-${item.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setTab(item.id)}
              title={item.hint}
              className={cn(
                "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                selected
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        id={`network-panel-${tab}`}
        aria-labelledby={`network-tab-${tab}`}
        className="focus-visible:outline-none"
      >
        {tab === "areas" ? <AreasManager /> : null}
        {tab === "boxes" ? <BoxesManager /> : null}
        {tab === "lines" ? <LinesManager /> : null}
        {tab === "services" ? <ServicesManager /> : null}
      </div>
    </div>
  );
}