"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { AsyncBoundary } from "@/components/app/async-boundary";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { activityGroups, activityPresentation } from "@/lib/activity";
import { activityApi } from "@/lib/api/users";
import { USER_ROLE_LABELS } from "@/lib/domain";
import { formatDateTime } from "@/lib/format";
import { useAsync } from "@/lib/hooks/use-async";
import { cn } from "@/lib/utils";

/** Built once: the groupings never change at runtime. */
const ACTION_GROUPS = activityGroups();

/**
 * The system-wide audit trail (AGENTS.md #20).
 *
 * Activity has been recorded from the start, but only a single survey's own history was ever
 * shown. This is the screen that answers "who changed this, and when" for everything else.
 */
export function ActivityView() {
  const [term, setTerm] = useState("");
  const [appliedTerm, setAppliedTerm] = useState("");
  const [action, setAction] = useState("");
  const [page, setPage] = useState(1);

  const state = useAsync(
    `activity:${appliedTerm}:${action}:${page}`,
    () =>
      activityApi.list({
        page,
        pageSize: 25,
        ...(appliedTerm ? { search: appliedTerm } : {}),
        ...(action ? { action } : {}),
      }),
  );

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    setAppliedTerm(term.trim());
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Activity log"
        description="Who did what across the system, most recent first. Each survey also carries its own history."
      />

      <form className="flex flex-wrap gap-2" onSubmit={handleSearch}>
        <label className="sr-only" htmlFor="activity-search">
          Search the activity log
        </label>
        <Input
          id="activity-search"
          className="max-w-md min-w-56 flex-1"
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          placeholder="Account, survey code or wording"
        />
        <Button type="submit" variant="outline">
          <Search aria-hidden />
          <span className="sr-only sm:not-sr-only">Search</span>
        </Button>
        <Select
          aria-label="Filter by action"
          className="max-w-64"
          value={action}
          onChange={(event) => {
            setAction(event.target.value);
            setPage(1);
          }}
        >
          <option value="">All actions</option>
          {ACTION_GROUPS.map((group) => (
            <optgroup key={group.label} label={group.label}>
              {group.actions.map((entry) => (
                <option key={entry.action} value={entry.action}>
                  {entry.label}
                </option>
              ))}
            </optgroup>
          ))}
        </Select>
      </form>

      <AsyncBoundary state={state} loadingLabel="Loading the activity log">
        {(data) => (
          <div className="space-y-3">
            {data.items.length === 0 ? (
              <EmptyState
                title="Nothing recorded yet"
                description="Entries appear here as soon as someone signs in, works on a survey or edits network data."
              />
            ) : (
              <TableContainer>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="whitespace-nowrap">When</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Detail</TableHead>
                      <TableHead className="hidden md:table-cell">Account</TableHead>
                      <TableHead className="hidden lg:table-cell">Survey</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.items.map((entry) => {
                      const { icon: Icon, className, label } = activityPresentation(entry.action);

                      return (
                        <TableRow key={entry.id}>
                          <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                            {formatDateTime(entry.createdAt)}
                          </TableCell>
                          <TableCell>
                            <span className="inline-flex items-center gap-2">
                              <span
                                aria-hidden
                                className={cn(
                                  "inline-flex size-6 shrink-0 items-center justify-center rounded-full",
                                  className,
                                )}
                              >
                                <Icon className="size-3.5" />
                              </span>
                              <span className="text-sm">{label}</span>
                            </span>
                          </TableCell>
                          <TableCell className="min-w-64 max-w-md text-sm">{entry.message}</TableCell>
                          <TableCell className="hidden md:table-cell">
                            {entry.user ? (
                              <div className="space-y-0.5">
                                <p className="text-sm">{entry.user.fullName}</p>
                                <p className="text-xs text-muted-foreground">
                                  {USER_ROLE_LABELS[entry.user.role]}
                                </p>
                              </div>
                            ) : (
                              <span className="text-sm text-muted-foreground">System</span>
                            )}
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            {entry.survey ? (
                              <Link
                                href={`/surveys/${entry.survey.id}`}
                                className="text-sm underline-offset-4 hover:underline"
                              >
                                {entry.survey.surveyCode}
                              </Link>
                            ) : (
                              <span className="text-sm text-muted-foreground">-</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}

            {data.total > 0 ? (
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">
                  Page {data.page} of {data.totalPages} - {data.total} entries
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((value) => value - 1)}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= data.totalPages}
                    onClick={() => setPage((value) => value + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </AsyncBoundary>
    </div>
  );
}