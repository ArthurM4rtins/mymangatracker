-- AlterTable
ALTER TABLE "Media" ADD COLUMN     "authors" JSONB,
ADD COLUMN     "averageScore" INTEGER,
ADD COLUMN     "bannerImageUrl" TEXT,
ADD COLUMN     "genres" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "startYear" INTEGER;
