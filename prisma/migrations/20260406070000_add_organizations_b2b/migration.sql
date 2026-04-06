-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'company',
    "plan" TEXT NOT NULL DEFAULT 'team',
    "maxUsers" INTEGER NOT NULL DEFAULT 50,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "contactName" TEXT,
    "contactEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrgAdmin" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'hr',
    "passwordHash" TEXT NOT NULL,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrgAdmin_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "User" ADD COLUMN "organizationId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");
CREATE INDEX "Organization_slug_idx" ON "Organization"("slug");
CREATE INDEX "Organization_type_isActive_idx" ON "Organization"("type", "isActive");
CREATE UNIQUE INDEX "OrgAdmin_organizationId_email_key" ON "OrgAdmin"("organizationId", "email");
CREATE INDEX "OrgAdmin_email_idx" ON "OrgAdmin"("email");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OrgAdmin" ADD CONSTRAINT "OrgAdmin_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed: Demo organization + admins
INSERT INTO "Organization" ("id", "name", "slug", "type", "plan", "maxUsers", "contactName", "contactEmail", "createdAt", "updatedAt")
VALUES ('org_demo', 'Demo Corp', 'demo-corp', 'company', 'team', 50, 'Admin Demo', 'admin@demo-corp.com', NOW(), NOW())
ON CONFLICT ("slug") DO NOTHING;

-- HR admin (password: demo1234 → HMAC-SHA256 with salt "org-admin-salt")
INSERT INTO "OrgAdmin" ("id", "organizationId", "email", "name", "role", "passwordHash", "createdAt", "updatedAt")
VALUES ('oadm_hr_demo', 'org_demo', 'hr@demo-corp.com', 'María García (HR)', 'hr', '11d94a2e41072a4bfdba2df955238cd117225b912029f9c4207eaccbaf7be4d9', NOW(), NOW())
ON CONFLICT ("organizationId", "email") DO NOTHING;

-- Therapist admin (same password)
INSERT INTO "OrgAdmin" ("id", "organizationId", "email", "name", "role", "passwordHash", "createdAt", "updatedAt")
VALUES ('oadm_th_demo', 'org_demo', 'psico@demo-corp.com', 'Dr. López (Terapeuta)', 'therapist', '11d94a2e41072a4bfdba2df955238cd117225b912029f9c4207eaccbaf7be4d9', NOW(), NOW())
ON CONFLICT ("organizationId", "email") DO NOTHING;
