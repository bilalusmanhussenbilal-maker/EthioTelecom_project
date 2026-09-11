"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  ClipboardEdit,
  MapPin,
  TriangleAlert,
  UserCog,
} from "lucide-react";
import { Alert } from "@/components/app/alert";
import { AsyncBoundary } from "@/components/app/async-boundary";
import { KeyValue, KeyValueGrid } from "@/components/app/key-value";
import { PageHeader } from "@/components/app/page-header";
import { AssignDialog } from "@/components/survey/assign-dialog";
import { NetworkPathView } from "@/components/survey/network-path-view";
import { ReviewDialog } from "@/components/survey/review-dialog";
import {
  BoxStatusBadge,
  FeasibilityBadge,
  LineStatusBadge,
  PortStatusBadge,
  SurveyStatusBadge,
} from "@/components/app/survey-badges";
import { SurveyTimeline } from "@/components/survey/survey-timeline";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { surveysApi } from "@/lib/api/surveys";
import { useAuth } from "@/lib/auth/auth-provider";
import { CHANGE_TYPE_LABELS, FEASIBILITY_REASON_LABELS, SERVICE_TYPE_LABELS } from "@/lib/domain";
import { formatCoordinate, formatDateTime, formatMeters } from "@/lib/format";
import { useAsync } from "@/lib/hooks/use-async";

export function SurveyDetailView() {
  const params = useParams<{ id: string }>();
  const id = typeof params?.id === "string" ? params.id : "";
  const { user } = useAuth();

  const [refreshToken, setRefreshToken] = useState(0);
  const [reviewing, setReviewing] = useState(false);
  const [assigning, setAssigning] = useState(false);

  const detail = useAsync(`survey:${id}:${refreshToken}`, () => surveysApi.get(id).then((response) => response.survey));
  const timeline = useAsync(`survey-timeline:${id}:${refreshToken}`, () => surveysApi.getTimeline(id).then((response) => response.activity));

  const refresh = () => setRefreshToken((value) => value + 1);

  const isSupervisor = user?.role === "SUPERVISOR" || user?.role === "ADMIN";
  const isTechnician = user?.role === "TECHNICIAN";

  return (
    <div className="space-y-5">
      <Link
        href="/surveys"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
      >
        <ArrowLeft aria-hidden className="size-4" />
        Back to surveys
      </Link>

      <AsyncBoundary state={detail} loadingLabel="Loading the survey">
        {(survey) => {
          const canEditFieldData =
            isTechnician && (survey.status === "NEW" || survey.status === "IN_PROGRESS" || survey.status === "RETURNED");
          const canReview = isSupervisor && survey.status === "COMPLETED";
          const reasons = survey.feasibilityReasons ?? survey.feasibility?.reasons ?? [];

          return (
            <div className="space-y-5">
              <PageHeader
                title={`Survey ${survey.surveyCode}`}
                description={`${survey.service.serviceCode} - ${survey.service.customerName}`}
                actions={
                  <>
                    {canEditFieldData ? (
                      <Link href={`/surveys/${survey.id}/survey`} className={buttonVariants({ size: "sm" })}>
                        <ClipboardEdit aria-hidden className="size-4" />
                        {survey.status === "NEW" ? "Start survey" : "Continue survey"}
                      </Link>
                    ) : null}
                    {isSupervisor ? (
                      <Button variant="outline" size="sm" onClick={() => setAssigning(true)}>
                        <UserCog aria-hidden />
                        {survey.technician ? "Reassign" : "Assign"}
                      </Button>
                    ) : null}
                    {canReview ? (
                      <Button size="sm" onClick={() => setReviewing(true)}>
                        <CheckCircle2 aria-hidden />
                        Review
                      </Button>
                    ) : null}
                  </>
                }
              />

              <div className="flex flex-wrap items-center gap-2">
                <SurveyStatusBadge status={survey.status} reviewState={survey.reviewState} />
                <FeasibilityBadge status={survey.feasibilityStatus} />
                <span className="text-xs text-muted-foreground">
                  Created {formatDateTime(survey.createdAt)}
                </span>
              </div>

              {survey.status === "RETURNED" || survey.status === "REJECTED" ? (
                <Alert tone="warning" title={`Supervisor remark (${survey.reviewState.toLowerCase()})`}>
                  <p>{survey.reviewRemark ?? "No remark was recorded."}</p>
                </Alert>
              ) : null}

              <Card>
                <CardHeader>
                  <CardTitle>Service</CardTitle>
                </CardHeader>
                <CardContent>
                  <KeyValueGrid>
                    <KeyValue label="Service ID">{survey.service.serviceCode}</KeyValue>
                    <KeyValue label="Customer">{survey.service.customerName}</KeyValue>
                    <KeyValue label="Request type">{SERVICE_TYPE_LABELS[survey.service.serviceType]}</KeyValue>
                    <KeyValue label="Address">{survey.service.serviceAddress}</KeyValue>
                    <KeyValue label="Service area">
                      {survey.service.area.name} ({survey.service.area.code})
                    </KeyValue>
                    <KeyValue label="Change">{CHANGE_TYPE_LABELS[survey.service.newNetwork ? "NEW_CONNECTION" : "VERIFICATION"]}</KeyValue>
                    <KeyValue label="Assigned technician">
                      {survey.technician
                        ? `${survey.technician.user.fullName} (${survey.technician.employeeCode})`
                        : "Unassigned"}
                    </KeyValue>
                    <KeyValue label="Service coordinates">
                      {survey.service.latitude === null || survey.service.longitude === null
                        ? "Not recorded"
                        : `${formatCoordinate(survey.service.latitude)}, ${formatCoordinate(survey.service.longitude)}`}
                    </KeyValue>
                  </KeyValueGrid>
                </CardContent>
              </Card>

              <div className="grid gap-4 lg:grid-cols-2">
                <NetworkPathView
                  title="Old network"
                  node={survey.service.oldNetwork}
                  emptyMessage="This service has no recorded old network."
                />
                <NetworkPathView
                  title="New network (proposed)"
                  node={survey.service.newNetwork}
                  emptyMessage="No new network has been proposed for this service."
                />
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Field survey</CardTitle>
                </CardHeader>
                <CardContent>
                  <KeyValueGrid>
                    <KeyValue label="Box condition">
                      <BoxStatusBadge status={survey.boxStatus} />
                    </KeyValue>
                    <KeyValue label="Port condition">
                      <PortStatusBadge status={survey.portStatus} />
                    </KeyValue>
                    <KeyValue label="Line condition">
                      <LineStatusBadge status={survey.lineStatus} />
                    </KeyValue>
                    <KeyValue label="Required capacity">
                      <span className="tabular-nums">{survey.requiredCapacity ?? "-"}</span>
                    </KeyValue>
                    <KeyValue label="Available capacity">
                      <span className="tabular-nums">{survey.availableCapacity ?? "-"}</span>
                    </KeyValue>
                    <KeyValue label="Technician remark">{survey.technicianRemark ?? "-"}</KeyValue>
                  </KeyValueGrid>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Technical feasibility</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <FeasibilityBadge status={survey.feasibilityStatus} />

                  {survey.feasibilityStatus === "NOT_FEASIBLE" ? (
                    <div className="space-y-2">
                      <p className="flex items-center gap-2 text-sm text-muted-foreground">
                        <TriangleAlert aria-hidden className="size-4 text-destructive" />
                        The backend refused this destination for the reasons below.
                      </p>
                      <ul className="list-inside list-disc space-y-1 text-sm">
                        {reasons.map((reason) => (
                          <li key={`${reason.code}-${reason.message}`}>
                            <span className="font-medium">
                              {FEASIBILITY_REASON_LABELS[reason.code] ?? reason.code}
                            </span>
                            : {reason.message}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {survey.feasibilityStatus === "TECHNICALLY_FEASIBLE" ? (
                    <p className="text-sm text-muted-foreground">
                      A free port and enough line capacity were confirmed at submission time.
                    </p>
                  ) : null}

                  {!survey.feasibilityStatus ? (
                    <p className="text-sm text-muted-foreground">
                      Feasibility is checked when the technician submits the survey.
                    </p>
                  ) : null}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin aria-hidden className="size-4 text-muted-foreground" />
                    GPS verification
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {survey.gpsRecord ? (
                    <KeyValueGrid>
                      <KeyValue label="Latitude">{formatCoordinate(survey.gpsRecord.latitude)}</KeyValue>
                      <KeyValue label="Longitude">{formatCoordinate(survey.gpsRecord.longitude)}</KeyValue>
                      <KeyValue label="Accuracy">
                        {formatMeters(survey.gpsRecord.accuracy)}
                      </KeyValue>
                      <KeyValue label="Captured at">{formatDateTime(survey.gpsRecord.capturedAt)}</KeyValue>
                      <KeyValue label="Distance from service">
                        {formatMeters(survey.gpsRecord.distanceFromServiceMeters)}
                      </KeyValue>
                      <KeyValue label="Within service area">
                        {survey.gpsRecord.isWithinServiceArea === null
                          ? "Not comparable"
                          : survey.gpsRecord.isWithinServiceArea
                            ? "Yes"
                            : "No"}
                      </KeyValue>
                    </KeyValueGrid>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No GPS record yet. The technician must capture a location to submit.
                    </p>
                  )}
                </CardContent>
              </Card>

              {survey.reviewedBy || survey.reviewRemark ? (
                <Card>
                  <CardHeader>
                    <CardTitle>Review</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <KeyValueGrid>
                      <KeyValue label="Reviewed by">{survey.reviewedBy?.fullName ?? "-"}</KeyValue>
                      <KeyValue label="Reviewed at">{formatDateTime(survey.reviewedAt)}</KeyValue>
                      <KeyValue label="Approved at">{formatDateTime(survey.completedAt)}</KeyValue>
                      <KeyValue label="Remark" className="sm:col-span-2">
                        {survey.reviewRemark ?? "-"}
                      </KeyValue>
                    </KeyValueGrid>
                  </CardContent>
                </Card>
              ) : null}

              <AsyncBoundary state={timeline} loadingLabel="Loading activity">
                {(activity) => <SurveyTimeline activity={activity} />}
              </AsyncBoundary>

              <ReviewDialog
                surveyId={survey.id}
                surveyCode={survey.surveyCode}
                open={reviewing}
                onClose={() => setReviewing(false)}
                onDone={() => {
                  setReviewing(false);
                  refresh();
                }}
              />

              <AssignDialog
                surveyId={survey.id}
                surveyCode={survey.surveyCode}
                currentTechnicianId={survey.technicianId}
                open={assigning}
                onClose={() => setAssigning(false)}
                onDone={() => {
                  setAssigning(false);
                  refresh();
                }}
              />
            </div>
          );
        }}
      </AsyncBoundary>
    </div>
  );
}