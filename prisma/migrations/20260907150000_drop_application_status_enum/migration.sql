-- DropIndex
DROP INDEX "Application_status_idx";

-- AlterTable
ALTER TABLE "Application" DROP COLUMN "status";

-- DropEnum
DROP TYPE "ApplicationStatus";

