"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Loader2, LogIn, Network } from "lucide-react";
import { Alert } from "@/components/app/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/api/client";
import { fieldIssuesOf, shortFieldName } from "@/lib/api/errors";
import { useAuth } from "@/lib/auth/auth-provider";

const DEMO_ACCOUNTS = [
  { role: "Administrator", username: "admin", password: "Admin@12345" },
  { role: "Supervisor", username: "supervisor", password: "Super@12345" },
  { role: "Technician", username: "tech014", password: "Tech@12345" },
];


export default function LoginPage() {
  const router = useRouter();
  const { status, signIn } = useAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/dashboard");
    }
  }, [status, router]);

  const issues = fieldIssuesOf(error);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!username.trim() || !password) {
      setError(new ApiError(422, { code: "VALIDATION_ERROR", message: "Enter your username and password" }));
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await signIn(username.trim(), password);
      router.replace("/dashboard");
    } catch (cause) {
      setError(
        cause instanceof ApiError
          ? cause
          : new ApiError(0, { code: "UNKNOWN", message: "Sign-in failed. Please try again." }),
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-6 p-4 sm:p-6">
      <div className="flex items-center gap-2">
        <span className="inline-flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Network aria-hidden className="size-4" />
        </span>
        <div>
          <p className="text-sm font-semibold leading-tight">Network Service Survey</p>
          <p className="text-xs text-muted-foreground">Field survey platform</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
          <CardDescription>Use the account your administrator created for you.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form className="space-y-4" onSubmit={handleSubmit} noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                name="username"
                autoComplete="username"
                autoCapitalize="none"
                autoFocus
                required
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                aria-invalid={issues.some((issue) => issue.path.endsWith("username"))}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                aria-invalid={issues.some((issue) => issue.path.endsWith("password"))}
              />
            </div>

            {error ? (
              <Alert tone={error.status === 0 ? "warning" : "danger"} title={error.message}>
                {error.status === 0 ? <p>Start the API server and try again.</p> : null}
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

            <Button type="submit" block disabled={submitting}>
              {submitting ? <Loader2 aria-hidden className="animate-spin" /> : <LogIn aria-hidden />}
              {submitting ? "Signing in" : "Sign in"}
            </Button>
          </form>

          <div className="space-y-2 border-t border-border pt-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Demo accounts
            </p>
            <div className="flex flex-wrap gap-2">
              {DEMO_ACCOUNTS.map((account) => (
                <Button
                  key={account.username}
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setUsername(account.username);
                    setPassword(account.password);
                    setError(null);
                  }}
                >
                  {account.role}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}