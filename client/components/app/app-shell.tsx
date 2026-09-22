"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import type { ReactNode } from "react";
import { LogOut, Menu, Network, PanelLeft, X } from "lucide-react";
import {
  AnimatedSidebar,
  AnimatedSidebarClose,
  AnimatedSidebarContent,
  AnimatedSidebarFooter,
  AnimatedSidebarGroup,
  AnimatedSidebarGroupContent,
  AnimatedSidebarGroupLabel,
  AnimatedSidebarHeader,
  AnimatedSidebarInset,
  AnimatedSidebarMenu,
  AnimatedSidebarMenuButton,
  AnimatedSidebarMenuItem,
  AnimatedSidebarProvider,
  AnimatedSidebarRail,
  AnimatedSidebarTrigger,
} from "@/components/motion/animated-sidebar";
import { SyncStatusIndicator } from "@/components/app/sync-status-indicator";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth/auth-provider";
import { USER_ROLE_LABELS } from "@/lib/domain";
import { navSectionsForRole } from "@/lib/navigation";

function isActivePath(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const [confirmSignOut, setConfirmSignOut] = useState(false);

  const sections = user ? navSectionsForRole(user.role) : [];

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
    <AnimatedSidebarProvider>
      <AnimatedSidebar collapsible="icon">
        <AnimatedSidebarHeader>
          <div className="flex items-center gap-1">
            <Link
              href="/dashboard"
              className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden px-1 py-1"
            >
              <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Network aria-hidden className="size-4" />
              </span>
              <span className="truncate text-sm font-semibold leading-tight">
                Network Service Survey
              </span>
            </Link>
            {/*
              On a phone the sheet is the whole navigation. Tapping the scrim or pressing
              Escape closes it, but neither is discoverable, so give it a close control. The
              desktop rail hides this with CSS instead of branching on `isMobile`, which keeps
              the server render and the first client render identical.
            */}
            <AnimatedSidebarClose
              aria-label="Close navigation"
              className="size-9 shrink-0 text-muted-foreground hover:bg-accent hover:text-accent-foreground md:hidden"
            >
              <X aria-hidden className="size-5" />
            </AnimatedSidebarClose>
          </div>
        </AnimatedSidebarHeader>

        <AnimatedSidebarContent>
          {sections.map((section) => (
            <AnimatedSidebarGroup key={section.group}>
              <AnimatedSidebarGroupLabel>{section.group}</AnimatedSidebarGroupLabel>
              <AnimatedSidebarGroupContent>
                <AnimatedSidebarMenu>
                  {section.items.map((item) => (
                    <AnimatedSidebarMenuItem key={item.href}>
                      <AnimatedSidebarMenuButton
                        href={item.href}
                        isActive={isActivePath(pathname, item.href)}
                        icon={<item.icon aria-hidden className="size-4" />}
                      >
                        {item.label}
                      </AnimatedSidebarMenuButton>
                    </AnimatedSidebarMenuItem>
                  ))}
                </AnimatedSidebarMenu>
              </AnimatedSidebarGroupContent>
            </AnimatedSidebarGroup>
          ))}
        </AnimatedSidebarContent>

        <AnimatedSidebarFooter>
          {user ? (
            <div className="flex items-center gap-2 overflow-hidden rounded-lg px-1 py-1">
              <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold uppercase">
                {user.fullName.slice(0, 2)}
              </span>
              <div className="min-w-0 leading-tight">
                <p className="truncate text-xs font-medium">{user.fullName}</p>
                <p className="truncate text-[11px] text-muted-foreground">
                  {USER_ROLE_LABELS[user.role]}
                  {user.employeeCode ? ` - ${user.employeeCode}` : ""}
                </p>
              </div>
            </div>
          ) : null}
        </AnimatedSidebarFooter>

        <AnimatedSidebarRail />
      </AnimatedSidebar>

      <AnimatedSidebarInset>
        <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
          <div className="flex w-full items-center gap-2 px-4 py-3">
            {/*
              The only navigation control on a phone: it opens the sidebar as a sheet. On
              desktop the same button collapses the panel to the icon rail, and it already
              reserved this space in the row. The icon is chosen with CSS, not `isMobile`, so
              the server render and the first client render agree.
            */}
            <AnimatedSidebarTrigger className="text-foreground hover:bg-accent hover:text-accent-foreground">
              <Menu aria-hidden className="size-5 md:hidden" />
              <PanelLeft aria-hidden className="hidden size-5 md:block" />
            </AnimatedSidebarTrigger>

            <div className="ml-auto flex items-center gap-1.5">
              <SyncStatusIndicator />
              <ThemeToggle />
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

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-10 pt-4 sm:pt-6">{children}</main>
      </AnimatedSidebarInset>

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
    </AnimatedSidebarProvider>
  );
}
