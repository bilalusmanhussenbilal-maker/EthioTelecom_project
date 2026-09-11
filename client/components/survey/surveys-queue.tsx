"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import type { FormEvent } from "react";
import { ClipboardList, Plus, Search } from "lucide-react";
import { AsyncBoundary } from "@/components/app/async-boundary";
import { PageHeader } from "@/components/app/page-header";
import { CreateSurveyDialog } from "@/components/survey/create-survey-dialog";
import { SurveyTable } from "@/components/survey/survey-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { surveysApi } from "@/lib/api/surveys";
import { useAuth } from "@/lib/auth/auth-provider";
import { SURVEY_STATUS_LABELS } from "@/lib/domain";
import { useAsync } from "@/lib/hooks/use-async";
import { cn } from "@/lib/utils";
import type { SurveyStatus } from "@/lib/api/types";

const STATUS_VALUES: SurveyStatus[] = ["NEW", "IN_PROGRESS", "COMPLETED", "RETURNED", "REJECTED"];

const TABS: Array<{ value: SurveyStatus | "ALL"; label: string }> = [
  { value: "ALL", label: "All" },
  ...STATUS_VALUES.map((status) => ({ value: status, label: SURVEY_STATUS_LABELS[status] })),
];

function isSurveyStatus(value: string | null): value is SurveyStatus {
  return value !== null && (STATUS_VALUES as string[]).includes(value);
}

export function SurveysQueue() {
  const searchParams = useSearchParams();
  const { user } = useAuth();

  const initialStatus = searchParams.get("status");

  const [status, setStatus] = useState<SurveyStatus | "ALL">(
    isSurveyStatus(initialStatus) ? initialStatus : "ALL",
  );
  const [term, setTerm] = useState("");
  const [appliedTerm, setAppliedTerm] = useState("");
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);

  const state = useAsync(
    `surveys:${status}:${appliedTerm}:${page}:${refreshToken}`,
    () =>
      surveysApi.list({
        page,
        pageSize: 20,
        ...(status === "ALL" ? {} : { status }),
        ...(appliedTerm ? { search: appliedTerm } : {}),
      }),
  );

  const canCreate = user?.role === "SUPERVISOR" || user?.role === "ADMIN";

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    setAppliedTerm(term.trim());
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title={user?.role === "TECHNICIAN" ? "My surveys" : "Survey queue"}
        description={
          user?.role === "TECHNICIAN"
            ? "Everything assigned to you, including work that was returned."
            : "Every survey in the system. Open one to review or reassign it."
        }
        actions={
          canCreate ? (
            <Button size="sm" onClick={() => setCreating(true)}>
              <Plus aria-hidden />
              New survey
            </Button>
          ) : null
        }
      />

      <div className="space-y-3">
        <div
          role="tablist"
          aria-label="Filter by status"
          className="flex gap-1 overflow-x-auto rounded-lg border border-border p-1"
        >
          {TABS.map((tab) => {
            const active = tab.value === status;

            return (
              <button
                key={tab.value}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => {
                  setStatus(tab.value);
                  setPage(1);
                }}
                className={cn(
                  "whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <form className="flex gap-2" onSubmit={handleSearch}>
          <label className="sr-only" htmlFor="survey-search">
            Search surveys
          </label>
          <Input
            id="survey-search"
            placeholder="Survey code, service ID or customer name"
            value={term}
            onChange={(event) => setTerm(event.target.value)}
          />
          <Button type="submit" variant="outline">
            <Search aria-hidden />
            <span className="sr-only sm:not-sr-only">Search</span>
          </Button>
        </form>
      </div>

      <AsyncBoundary state={state} loadingLabel="Loading surveys">
        {(data) => (
          <div className="space-y-3">
            <SurveyTable
              surveys={data.items}
              emptyTitle="No surveys match"
              emptyDescription={
                appliedTerm
                  ? `Nothing matched "${appliedTerm}". Try a different search.`
                  : "Adjust the status filter or create a survey."
              }
            />

            {data.total > 0 ? (
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">
                  Page {data.page} of {data.totalPages} - {data.total} surveys
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((value) => Math.max(1, value - 1))}
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

      {canCreate ? (
        <CreateSurveyDialog
          open={creating}
          onClose={() => setCreating(false)}
          onCreated={() => {
            setCreating(false);
            setRefreshToken((value) => value + 1);
          }}
        />
      ) : null}

      <Card className="sm:hidden">
        <CardContent className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
          <ClipboardList aria-hidden className="size-4 shrink-0" />
          Tap a survey code to open it.
        </CardContent>
      </Card>
    </div>
  );
}