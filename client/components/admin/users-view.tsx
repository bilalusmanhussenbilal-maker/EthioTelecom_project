"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { KeyRound, Plus, Power, Search, UserPlus } from "lucide-react";
import { Alert } from "@/components/app/alert";
import { AsyncBoundary } from "@/components/app/async-boundary";
import { PageHeader } from "@/components/app/page-header";
import { CreateUserDialog } from "@/components/admin/create-user-dialog";
import { ResetPasswordDialog } from "@/components/admin/reset-password-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableContainer, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ApiError } from "@/lib/api/client";
import { toApiError } from "@/lib/api/errors";
import { usersApi } from "@/lib/api/users";
import { USER_ROLE_LABELS } from "@/lib/domain";
import { formatDate } from "@/lib/format";
import { useAsync } from "@/lib/hooks/use-async";
import { cn } from "@/lib/utils";
import type { ManagedUser, UserRole } from "@/lib/api/types";

export function UsersView() {
  const [term, setTerm] = useState("");
  const [appliedTerm, setAppliedTerm] = useState("");
  const [role, setRole] = useState<UserRole | "">("");
  const [isActive, setIsActive] = useState<"all" | "true" | "false">("all");
  const [page, setPage] = useState(1);

  const [refreshToken, setRefreshToken] = useState(0);
  const [creating, setCreating] = useState(false);
  const [resetting, setResetting] = useState<ManagedUser | null>(null);
  const [rowError, setRowError] = useState<ApiError | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const state = useAsync(
    `users:${appliedTerm}:${role}:${isActive}:${page}:${refreshToken}`,
    () =>
      usersApi.list({
        page,
        pageSize: 20,
        ...(appliedTerm ? { search: appliedTerm } : {}),
        ...(role ? { role } : {}),
        ...(isActive === "all" ? {} : { isActive: isActive === "true" }),
      }),
  );

  const refresh = () => setRefreshToken((value) => value + 1);

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    setAppliedTerm(term.trim());
  }

  async function toggleActive(user: ManagedUser) {
    setBusyId(user.id);
    setRowError(null);

    try {
      await usersApi.setActive(user.id, !user.isActive);
      refresh();
    } catch (cause) {
      setRowError(toApiError(cause, "Could not change the account status"));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Users and roles"
        description="Create accounts, assign roles and control who can sign in."
        actions={
          <Button size="sm" onClick={() => setCreating(true)}>
            <UserPlus aria-hidden />
            New account
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
        <form className="flex gap-2" onSubmit={handleSearch}>
          <label className="sr-only" htmlFor="user-search">
            Search accounts
          </label>
          <Input
            id="user-search"
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            placeholder="Name, username or employee code"
          />
          <Button type="submit" variant="outline">
            <Search aria-hidden />
            <span className="sr-only sm:not-sr-only">Search</span>
          </Button>
        </form>

        <Select
          aria-label="Filter by role"
          value={role}
          onChange={(event) => {
            setRole(event.target.value as UserRole | "");
            setPage(1);
          }}
        >
          <option value="">All roles</option>
          <option value="TECHNICIAN">Field technician</option>
          <option value="SUPERVISOR">Supervisor</option>
          <option value="ADMIN">Administrator</option>
        </Select>

        <Select
          aria-label="Filter by status"
          value={isActive}
          onChange={(event) => {
            setIsActive(event.target.value as "all" | "true" | "false");
            setPage(1);
          }}
        >
          <option value="all">Active and inactive</option>
          <option value="true">Active only</option>
          <option value="false">Inactive only</option>
        </Select>
      </div>

      {rowError ? <Alert tone="danger" title={rowError.message} /> : null}

      <AsyncBoundary state={state} loadingLabel="Loading accounts">
        {(data) => (
          <div className="space-y-3">
            <TableContainer>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Account</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="hidden md:table-cell">Employee code</TableHead>
                    <TableHead className="hidden lg:table-cell">Phone</TableHead>
                    <TableHead className="hidden sm:table-cell">Created</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.items.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="space-y-0.5">
                          <p className="font-medium">{user.fullName}</p>
                          <p className="text-xs text-muted-foreground">@{user.username}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="muted">{USER_ROLE_LABELS[user.role]}</Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {user.technician?.employeeCode ?? "-"}
                      </TableCell>
                      <TableCell className="hidden text-sm lg:table-cell">{user.phoneNumber ?? "-"}</TableCell>
                      <TableCell className="hidden text-sm sm:table-cell">{formatDate(user.createdAt)}</TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            "text-xs font-medium",
                            user.isActive ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground",
                          )}
                        >
                          {user.isActive ? "Active" : "Inactive"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Reset password for ${user.username}`}
                            onClick={() => setResetting(user)}
                          >
                            <KeyRound aria-hidden />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`${user.isActive ? "Deactivate" : "Activate"} ${user.username}`}
                            disabled={busyId === user.id}
                            onClick={() => void toggleActive(user)}
                          >
                            <Power aria-hidden className={user.isActive ? "text-destructive" : "text-emerald-600"} />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {data.items.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No account matched.{" "}
                <button type="button" className="underline" onClick={() => setCreating(true)}>
                  Create one
                </button>
                .
              </p>
            ) : null}

            {data.total > 0 ? (
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">
                  Page {data.page} of {data.totalPages} - {data.total} accounts
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>
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

      <CreateUserDialog
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={() => {
          setCreating(false);
          refresh();
        }}
      />

      {resetting ? (
        <ResetPasswordDialog
          userId={resetting.id}
          username={resetting.username}
          open
          onClose={() => setResetting(null)}
          onDone={() => setResetting(null)}
        />
      ) : null}

      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <Plus aria-hidden className="size-3.5" />
        A technician account always has an employee code, and the profile is created with the account.
      </p>
    </div>
  );
}