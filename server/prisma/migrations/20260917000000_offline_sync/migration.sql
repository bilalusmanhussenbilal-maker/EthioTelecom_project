ALTER TABLE "surveys" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;

CREATE TABLE "sync_receipts" (
    "userId" TEXT NOT NULL,
    "mutationId" UUID NOT NULL,
    "surveyId" TEXT NOT NULL,
    "payloadHash" TEXT NOT NULL,
    "response" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "sync_receipts_pkey" PRIMARY KEY ("userId", "mutationId")
);

CREATE INDEX "sync_receipts_surveyId_idx" ON "sync_receipts"("surveyId");
