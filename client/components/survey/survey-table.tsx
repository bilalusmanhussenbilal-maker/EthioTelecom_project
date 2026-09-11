import Link from "next/link";
import { SurveyStatusBadge } from "@/components/app/survey-badges";
import { FeasibilityBadge } from "@/components/app/survey-badges";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TableBody, TableCell, TableContainer, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatRelative } from "@/lib/format";
import { SERVICE_TYPE_LABELS } from "@/lib/domain";
import type { SurveyListItem } from "@/lib/api/types";
import { ClipboardList } from "lucide-react";

export interface SurveyTableProps {
  surveys: SurveyListItem[];
  emptyTitle?: string;
  emptyDescription?: string;
}

export function SurveyTable({
  surveys,
  emptyTitle = "No surveys",
  emptyDescription = "Nothing matches this filter yet.",
}: SurveyTableProps) {
  if (surveys.length === 0) {
    return <EmptyState icon={ClipboardList} title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <TableContainer>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Survey</TableHead>
            <TableHead>Service</TableHead>
            <TableHead className="hidden md:table-cell">Area</TableHead>
            <TableHead className="hidden lg:table-cell">Technician</TableHead>
            <TableHead className="hidden xl:table-cell">Feasibility</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="hidden sm:table-cell">Updated</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {surveys.map((survey) => (
            <TableRow key={survey.id}>
              <TableCell className="font-medium">
                <Link
                  href={`/surveys/${survey.id}`}
                  className="underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {survey.surveyCode}
                </Link>
              </TableCell>
              <TableCell>
                <div className="space-y-0.5">
                  <p className="font-medium">{survey.service.customerName}</p>
                  <p className="text-xs text-muted-foreground">
                    {survey.service.serviceCode} - {SERVICE_TYPE_LABELS[survey.service.serviceType]}
                  </p>
                </div>
              </TableCell>
              <TableCell className="hidden md:table-cell">
                <span className="text-sm">{survey.service.area.name}</span>
              </TableCell>
              <TableCell className="hidden lg:table-cell">
                {survey.technician ? (
                  <div className="space-y-0.5">
                    <p className="text-sm">{survey.technician.user.fullName}</p>
                    <p className="text-xs text-muted-foreground">{survey.technician.employeeCode}</p>
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">Unassigned</span>
                )}
              </TableCell>
              <TableCell className="hidden xl:table-cell">
                <FeasibilityBadge status={survey.feasibilityStatus} />
              </TableCell>
              <TableCell>
                <SurveyStatusBadge
                  status={survey.status}
                  reviewState={survey.status === "COMPLETED" ? (survey.completedAt ? "APPROVED" : "AWAITING_REVIEW") : undefined}
                />
              </TableCell>
              <TableCell className="hidden text-sm text-muted-foreground sm:table-cell">
                {formatRelative(survey.updatedAt)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}