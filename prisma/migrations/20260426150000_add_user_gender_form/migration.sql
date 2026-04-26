-- Add genderForm to UserPreferences
-- Values: 'feminine' | 'masculine' | 'neutral' | NULL (default = neutral grammar in coach)
ALTER TABLE "UserPreferences" ADD COLUMN "genderForm" TEXT;
