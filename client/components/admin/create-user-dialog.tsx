"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { Alert } from "@/components/app/alert";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { ApiError } from "@/lib/api/client";
import { fieldIssuesOf, shortFieldName, toApiError } from "@/lib/api/errors";
import { usersApi } from "@/lib/api/users";
import type { UserRole } from "@/lib/api/types";

export interface CreateUserDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function CreateUserDialog({ open, onClose, onCreated }: CreateUserDialogProps) {
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("TECHNICIAN");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [employeeCode, setEmployeeCode] = useState("");
  const [zone, setZone] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const isTechnician = role === "TECHNICIAN";
  const issues = fieldIssuesOf(error);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await usersApi.create({
        username: username.trim(),
        fullName: fullName.trim(),
        password,
        role,
        phoneNumber: phoneNumber.trim() || null,
        employeeCode: isTechnician ? employeeCode.trim() || null : null,
        zone: isTechnician ? zone.trim() || null : null,
      });

      onCreated();
    } catch (cause) {
      setError(toApiError(cause, "Could not create the account"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="New account"
      description="Technician accounts also get a technician profile with an employee code."
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" form="create-user-form" disabled={submitting}>
            {submitting ? <Loader2 aria-hidden className="animate-spin" /> : null}
            Create account
          </Button>
        </>
      }
    >
      <form id="create-user-form" className="space-y-4" onSubmit={handleSubmit} noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="user-username">Username</Label>
            <Input
              id="user-username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoCapitalize="none"
              required
              aria-invalid={Boolean(issues.find((issue) => issue.path.endsWith("username")))}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="user-fullname">Full name</Label>
            <Input
              id="user-fullname"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              required
              aria-invalid={Boolean(issues.find((issue) => issue.path.endsWith("fullName")))}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="user-password">Temporary password</Label>
            <Input
              id="user-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={8}
              aria-invalid={Boolean(issues.find((issue) => issue.path.endsWith("password")))}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="user-role">Role</Label>
            <Select id="user-role" value={role} onChange={(event) => setRole(event.target.value as UserRole)}>
              <option value="TECHNICIAN">Field technician</option>
              <option value="SUPERVISOR">Supervisor</option>
              <option value="ADMIN">Administrator</option>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="user-phone">Phone</Label>
            <Input
              id="user-phone"
              value={phoneNumber}
              onChange={(event) => setPhoneNumber(event.target.value)}
              placeholder="+251..."
            />
          </div>

          {isTechnician ? (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="user-employee">
                  Employee code <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="user-employee"
                  value={employeeCode}
                  onChange={(event) => setEmployeeCode(event.target.value)}
                  placeholder="014"
                  required
                  aria-invalid={Boolean(issues.find((issue) => issue.path.endsWith("employeeCode")))}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="user-zone">Zone</Label>
                <Input id="user-zone" value={zone} onChange={(event) => setZone(event.target.value)} />
              </div>
            </>
          ) : null}
        </div>

        {error ? (
          <Alert tone="danger" title={error.message}>
            {issues.length > 0 ? (
              <ul className="list-disc space-y-0.5 pl-4">
                {issues.map((issue) => (
                  <li key={`${issue.path}-${issue.message}`}>
                    <span className="font-medium">{shortFieldName(issue.path)}</span>: {issue.message}
                  </li>
                ))}
              </ul>
            ) : null}
          </Alert>
        ) : null}
      </form>
    </Dialog>
  );
}