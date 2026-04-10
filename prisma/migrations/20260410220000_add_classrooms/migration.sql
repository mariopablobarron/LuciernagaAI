
-- AlterTable
ALTER TABLE "DiaryEntry" ADD COLUMN     "blocks" JSONB;

-- AlterTable
ALTER TABLE "OrgAdmin" ADD COLUMN     "classroomId" TEXT;

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "logoUrl" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "classroomId" TEXT;

-- CreateTable
CREATE TABLE "Classroom" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "teacherId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Classroom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassroomCode" (
    "id" TEXT NOT NULL,
    "classroomId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT,
    "maxUses" INTEGER NOT NULL DEFAULT 0,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMP(3),
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClassroomCode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Classroom_organizationId_isActive_idx" ON "Classroom"("organizationId", "isActive");

-- CreateIndex
CREATE INDEX "Classroom_organizationId_createdAt_idx" ON "Classroom"("organizationId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ClassroomCode_code_key" ON "ClassroomCode"("code");

-- CreateIndex
CREATE INDEX "ClassroomCode_code_idx" ON "ClassroomCode"("code");

-- CreateIndex
CREATE INDEX "ClassroomCode_classroomId_isActive_idx" ON "ClassroomCode"("classroomId", "isActive");

-- CreateIndex
CREATE INDEX "OrgAdmin_classroomId_idx" ON "OrgAdmin"("classroomId");

-- CreateIndex
CREATE INDEX "User_classroomId_idx" ON "User"("classroomId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_classroomId_fkey" FOREIGN KEY ("classroomId") REFERENCES "Classroom"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrgAdmin" ADD CONSTRAINT "OrgAdmin_classroomId_fkey" FOREIGN KEY ("classroomId") REFERENCES "Classroom"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Classroom" ADD CONSTRAINT "Classroom_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassroomCode" ADD CONSTRAINT "ClassroomCode_classroomId_fkey" FOREIGN KEY ("classroomId") REFERENCES "Classroom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

