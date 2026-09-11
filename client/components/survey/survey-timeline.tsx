import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDateTime } from "@/lib/format";
import { History } from "lucide-react";
import type { ActivityEntry } from "@/lib/api/types";

export function SurveyTimeline({ activity }: { activity: ActivityEntry[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History aria-hidden className="size-4 text-muted-foreground" />
          Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        {activity.length === 0 ? (
          <EmptyState title="No activity yet" description="Actions on this survey will appear here." />
        ) : (
          <ol className="space-y-4">
            {activity.map((entry) => (
              <li key={entry.id} className="flex gap-3">
                <span aria-hidden className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />
                <div className="space-y-0.5">
                  <p className="text-sm">{entry.message}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDateTime(entry.createdAt)}
                    {entry.user ? ` - ${entry.user.fullName}` : ""}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}