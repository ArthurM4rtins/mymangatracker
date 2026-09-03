-- CreateTable
CREATE TABLE "Entry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mediaId" TEXT NOT NULL,
    "rating" DECIMAL(2,1),
    "review" TEXT,
    "containsSpoilers" BOOLEAN NOT NULL DEFAULT false,
    "reviewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Entry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Entry_userId_mediaId_key" ON "Entry"("userId", "mediaId");

-- AddForeignKey
ALTER TABLE "Entry" ADD CONSTRAINT "Entry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Entry" ADD CONSTRAINT "Entry_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "Media"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Escrito à mão (o Prisma não gera CHECK): a regra do domínio repetida no
-- banco — nota 0,5 a 5,0 em passos de 0,5; e avaliação vazia não existe.
ALTER TABLE "Entry" ADD CONSTRAINT "Entry_rating_meia_estrela"
  CHECK ("rating" IS NULL OR ("rating" >= 0.5 AND "rating" <= 5.0 AND mod("rating" * 2, 1) = 0));

ALTER TABLE "Entry" ADD CONSTRAINT "Entry_nao_vazia"
  CHECK ("rating" IS NOT NULL OR "review" IS NOT NULL);
