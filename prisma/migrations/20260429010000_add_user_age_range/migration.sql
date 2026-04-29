-- User.ageRange: opaque string bucket declared by the user during onboarding.
-- Valid values: "14_17" | "18_29" | "30_49" | "50_69" | "70_plus".
-- Nullable: existing users do not have this set and will be asked the next
-- time they return. Users declaring under_14 are blocked at the entry screen
-- and no row is created for them, so this column never holds that value.
ALTER TABLE "User" ADD COLUMN "ageRange" TEXT;
