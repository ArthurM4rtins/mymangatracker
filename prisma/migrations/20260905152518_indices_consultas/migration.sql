-- CreateIndex
CREATE INDEX "Entry_mediaId_idx" ON "Entry"("mediaId");

-- CreateIndex
CREATE INDEX "List_userId_createdAt_idx" ON "List"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "ListLike_userId_idx" ON "ListLike"("userId");

-- CreateIndex
CREATE INDEX "ReviewLike_userId_idx" ON "ReviewLike"("userId");

-- Índice parcial (não sai do schema do Prisma): o feed da comunidade na home
-- lê `Entry WHERE review IS NOT NULL ORDER BY reviewedAt DESC LIMIT n`.
-- Só as linhas com resenha entram, na direção da ordenação (#65, itens 11/15).
CREATE INDEX "Entry_review_reviewedAt_idx" ON "Entry" ("reviewedAt" DESC) WHERE "review" IS NOT NULL;
