-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "currentStep" TEXT,
ADD COLUMN     "errorMessage" TEXT,
ADD COLUMN     "jobId" TEXT,
ADD COLUMN     "lastActivity" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "progress" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "startedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "JobStatus" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "projectId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "queueName" TEXT NOT NULL,
    "jobType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "currentStep" TEXT,
    "message" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "metadata" JSONB,

    CONSTRAINT "JobStatus_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "JobStatus_projectId_idx" ON "JobStatus"("projectId");

-- CreateIndex
CREATE INDEX "JobStatus_jobId_idx" ON "JobStatus"("jobId");

-- CreateIndex
CREATE INDEX "JobStatus_status_idx" ON "JobStatus"("status");

-- CreateIndex
CREATE INDEX "JobStatus_queueName_idx" ON "JobStatus"("queueName");

-- CreateIndex
CREATE INDEX "JobStatus_createdAt_idx" ON "JobStatus"("createdAt");

-- CreateIndex
CREATE INDEX "Project_status_idx" ON "Project"("status");

-- CreateIndex
CREATE INDEX "Project_jobId_idx" ON "Project"("jobId");

-- CreateIndex
CREATE INDEX "Project_lastActivity_idx" ON "Project"("lastActivity");

-- AddForeignKey
ALTER TABLE "JobStatus" ADD CONSTRAINT "JobStatus_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
