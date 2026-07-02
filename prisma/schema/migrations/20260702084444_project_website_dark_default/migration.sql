-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "website" TEXT;

-- AlterTable
ALTER TABLE "settings" ALTER COLUMN "theme" SET DEFAULT 'DARK';
