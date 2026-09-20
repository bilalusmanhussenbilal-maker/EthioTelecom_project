"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import type { ReactNode } from "react";
import { LogOut, Network } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { SyncStatusIndicator } from "@/components/app/sync-status-indicator";
import { useAuth } from "@/lib/auth/auth-provider";
import { USER_ROLE_LABELS } from "@/lib/domain";
import { navItemsForRole } from "@/lib/navigation";
import { cn } from "@/lib/utils";

function isActivePath(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const [confirmSignOut, setConfirmSignOut] = useState(false);

  const items = user ? navItemsForRole(user.role) : [];

  async function handleSignOut() {
    setSigningOut(true);

    try {
      await signOut();
      router.replace("/login");
    } finally {
      setSigningOut(false);
      setConfirmSignOut(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-3 px-4 py-3">
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="inline-flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Network aria-hidden className="size-4" />
            </span>
            <span className="hidden text-sm font-semibold leading-tight sm:inline">
              Network Service Survey
            </span>
          </Link>

          <nav aria-label="Main" className="ml-2 hidden flex-1 items-center gap-1 sm:flex">
            {items.map((item) => {
              const active = isActivePath(pathname, item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    active
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                  )}
                >
                  <item.icon aria-hidden className="size-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-1.5">
            <ThemeToggle />
            {user ? (
              <div className="hidden items-center gap-2 rounded-lg border border-border px-2.5 py-1.5 sm:flex">
                <div className="text-right leading-tight">
                  <p className="text-xs font-medium">{user.fullName}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {USER_ROLE_LABELS[user.role]}
                    {user.employeeCode ? ` - ${user.employeeCode}` : ""}
                  </p>
                </div>
              </div>
            ) : null}
            <SyncStatusIndicator />
            <Button
              variant="ghost"
              size="icon"
              aria-label="Sign out"
              onClick={() => setConfirmSignOut(true)}
            >
              <LogOut aria-hidden />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-24 pt-4 sm:pb-10 sm:pt-6">
        {children}
      </main>

      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden"
      >
        <ul className="flex items-stretch overflow-x-auto">
          {items.map((item) => {
            const active = isActivePath(pathname, item.href);

            return (
              <li key={item.href} className="min-w-16 flex-1">
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex flex-col items-center gap-1 px-2 py-2.5 text-[11px] font-medium",
                    active ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  <item.icon aria-hidden className={cn("size-5", active && "text-primary")} />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <Dialog
        open={confirmSignOut}
        onClose={() => setConfirmSignOut(false)}
        title="Sign out"
        description="You will need to sign in again to work on your surveys."
        footer={
          <>
            <Button variant="outline" onClick={() => setConfirmSignOut(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleSignOut} disabled={signingOut}>
              {signingOut ? "Signing out" : "Sign out"}
            </Button>
          </>
        }
      />
    </div>
  );
}