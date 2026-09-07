-- DropForeignKey
ALTER TABLE "Application" DROP CONSTRAINT "Application_statusId_fkey";

-- AlterTable
ALTER TABLE "Status" ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_statusId_fkey" FOREIGN KEY ("statusId") REFERENCES "Status"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

