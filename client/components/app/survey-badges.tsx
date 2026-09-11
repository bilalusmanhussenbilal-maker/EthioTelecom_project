import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  BOX_STATUS_LABELS,
  BOX_STATUS_TONES,
  FEASIBILITY_LABELS,
  FEASIBILITY_TONES,
  LINE_STATUS_LABELS,
  LINE_STATUS_TONES,
  PORT_STATUS_LABELS,
  PORT_STATUS_TONES,
  REVIEW_STATE_LABELS,
  SURVEY_STATUS_LABELS,
  SURVEY_STATUS_TONES,
} from "@/lib/domain";
import type {
  BoxStatus,
  FeasibilityStatus,
  LineStatus,
  PortStatus,
  ReviewState,
  SurveyStatus,
} from "@/lib/api/types";

export function SurveyStatusBadge({
  status,
  reviewState,
}: {
  status: SurveyStatus;
  reviewState?: ReviewState | undefined;
}) {
  if (status === "COMPLETED" && reviewState === "AWAITING_REVIEW") {
    return <StatusBadge tone="warning">{REVIEW_STATE_LABELS.AWAITING_REVIEW}</StatusBadge>;
  }

  if (status === "COMPLETED" && reviewState === "APPROVED") {
    return <StatusBadge tone="success">{REVIEW_STATE_LABELS.APPROVED}</StatusBadge>;
  }

  return <StatusBadge tone={SURVEY_STATUS_TONES[status]}>{SURVEY_STATUS_LABELS[status]}</StatusBadge>;
}

export function FeasibilityBadge({ status }: { status: FeasibilityStatus | null | undefined }) {
  if (!status) {
    return <Badge>Not assessed</Badge>;
  }

  return <StatusBadge tone={FEASIBILITY_TONES[status]}>{FEASIBILITY_LABELS[status]}</StatusBadge>;
}

export function BoxStatusBadge({ status }: { status: BoxStatus | null | undefined }) {
  if (!status) {
    return <Badge>-</Badge>;
  }

  return <StatusBadge tone={BOX_STATUS_TONES[status]}>{BOX_STATUS_LABELS[status]}</StatusBadge>;
}

export function PortStatusBadge({ status }: { status: PortStatus | null | undefined }) {
  if (!status) {
    return <Badge>-</Badge>;
  }

  return <StatusBadge tone={PORT_STATUS_TONES[status]}>{PORT_STATUS_LABELS[status]}</StatusBadge>;
}

export function LineStatusBadge({ status }: { status: LineStatus | null | undefined }) {
  if (!status) {
    return <Badge>-</Badge>;
  }

  return <StatusBadge tone={LINE_STATUS_TONES[status]}>{LINE_STATUS_LABELS[status]}</StatusBadge>;
}