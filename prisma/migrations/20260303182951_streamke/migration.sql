/*
  Warnings:

  - A unique constraint covering the columns `[streamKey]` on the table `incidents` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "UserRole" ADD VALUE 'EMERGENCY_DISPATCHER';
ALTER TYPE "UserRole" ADD VALUE 'MEDICAL_RESPONDER';
ALTER TYPE "UserRole" ADD VALUE 'FIRE_RESPONDER';

-- AlterTable
ALTER TABLE "incidents" ADD COLUMN     "streamKey" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "isAvailable" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE UNIQUE INDEX "incidents_streamKey_key" ON "incidents"("streamKey");
