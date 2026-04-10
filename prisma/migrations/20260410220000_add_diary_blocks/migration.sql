-- AlterTable: add blocks (JSON) to DiaryEntry for rich content
ALTER TABLE "DiaryEntry" ADD COLUMN "blocks" JSONB;
