-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('MANGA', 'NOVEL');

-- CreateEnum
CREATE TYPE "CountryOfOrigin" AS ENUM ('JP', 'KR', 'CN');

-- CreateEnum
CREATE TYPE "ShelfStatus" AS ENUM ('READING', 'COMPLETED', 'PLANNED', 'PAUSED', 'DROPPED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Media" (
    "id" TEXT NOT NULL,
    "anilistId" INTEGER NOT NULL,
    "type" "MediaType" NOT NULL,
    "countryOfOrigin" "CountryOfOrigin",
    "titleRomaji" TEXT NOT NULL,
    "titleEnglish" TEXT,
    "titleNative" TEXT,
    "coverImageUrl" TEXT,
    "description" TEXT,
    "chapters" INTEGER,
    "syncedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShelfEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mediaId" TEXT NOT NULL,
    "status" "ShelfStatus" NOT NULL,
    "progressChapter" DECIMAL(8,2),
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShelfEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReadingSource" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mediaId" TEXT NOT NULL,
    "sourceHost" TEXT NOT NULL,
    "urlTemplate" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "confirmedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReadingSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReadingProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mediaId" TEXT NOT NULL,
    "readingSourceId" TEXT,
    "chapter" DECIMAL(8,2) NOT NULL,
    "resolvedUrl" TEXT NOT NULL,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReadingProgress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Media_anilistId_key" ON "Media"("anilistId");

-- CreateIndex
CREATE INDEX "ShelfEntry_userId_status_idx" ON "ShelfEntry"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ShelfEntry_userId_mediaId_key" ON "ShelfEntry"("userId", "mediaId");

-- CreateIndex
CREATE INDEX "ReadingSource_userId_mediaId_idx" ON "ReadingSource"("userId", "mediaId");

-- CreateIndex
CREATE INDEX "ReadingProgress_userId_mediaId_openedAt_idx" ON "ReadingProgress"("userId", "mediaId", "openedAt" DESC);

-- AddForeignKey
ALTER TABLE "ShelfEntry" ADD CONSTRAINT "ShelfEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShelfEntry" ADD CONSTRAINT "ShelfEntry_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "Media"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReadingSource" ADD CONSTRAINT "ReadingSource_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReadingSource" ADD CONSTRAINT "ReadingSource_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "Media"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReadingProgress" ADD CONSTRAINT "ReadingProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReadingProgress" ADD CONSTRAINT "ReadingProgress_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "Media"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReadingProgress" ADD CONSTRAINT "ReadingProgress_readingSourceId_fkey" FOREIGN KEY ("readingSourceId") REFERENCES "ReadingSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================================================
-- Daqui para baixo é escrito à mão: o Prisma não gera índice parcial nem CHECK.
-- ============================================================================

-- Muitas fontes cadastradas por obra, só uma ativa. O Postgres recusa a segunda,
-- então o serviço não precisa conferir.
CREATE UNIQUE INDEX "ReadingSource_userId_mediaId_active_key"
  ON "ReadingSource" ("userId", "mediaId")
  WHERE "isActive";

-- Não existe capítulo zero nem negativo.
ALTER TABLE "ReadingProgress"
  ADD CONSTRAINT "ReadingProgress_chapter_positivo"
  CHECK ("chapter" > 0);

ALTER TABLE "ShelfEntry"
  ADD CONSTRAINT "ShelfEntry_progressChapter_positivo"
  CHECK ("progressChapter" IS NULL OR "progressChapter" > 0);
