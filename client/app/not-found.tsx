import Link from "next/link";
import { FileQuestion, Home } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

export const metadata = {
  title: "Page not found",
};

export default function NotFound() {
  return (
    <main className="flex min-h-dvh items-center justify-center p-4">
      <div className="mx-auto flex w-full max-w-md flex-col items-center gap-4 rounded-xl border border-border bg-card p-6 text-center">
        <FileQuestion aria-hidden className="size-7 text-muted-foreground" />

        <div className="space-y-1">
          <h1 className="text-base font-semibold">Page not found</h1>
          <p className="text-sm text-muted-foreground">
            That address does not exist. It may have been moved, or the survey it pointed at is no
            longer assigned to you.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2">
          <Link href="/dashboard" className={buttonVariants()}>
            <Home aria-hidden className="size-4" />
            Go to dashboard
          </Link>
          <Link href="/surveys" className={buttonVariants({ variant: "outline" })}>
            My surveys
          </Link>
        </div>
      </div>
    </main>
  );
}
