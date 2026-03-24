-- AlterEnum
ALTER TYPE "MeetingStatus" ADD VALUE 'FAILED';

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'PENDING';
