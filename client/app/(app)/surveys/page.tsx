"use client";

import { Suspense } from "react";
import { SurveysQueue } from "@/components/survey/surveys-queue";
import { LoadingState } from "@/components/ui/loading-state";

export default function SurveysPage() {
  return (
    <Suspense fallback={<LoadingState label="Loading surveys" />}>
      <SurveysQueue />
    </Suspense>
  );
}