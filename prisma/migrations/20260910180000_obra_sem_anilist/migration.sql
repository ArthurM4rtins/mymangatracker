-- A obra deixa de depender do AniList (#254).
--
-- Era `anilistId Int @unique`, obrigatório, e o que o AniList não conhecia era
-- descartado em silêncio: "The Beginning After the End" tem três registros no
-- Kitsu e NENHUM com mapeamento, então a obra não existia no Kidoku. Medido em
-- 10/09/2026, isso apagava 75% do resultado de "omniscient reader" e 40% do de
-- "tower of god" — justamente o manhwa coreano.
--
-- Agora a identidade é o par (fonte, id). Os dois campos são anuláveis porque
-- nem toda obra existe nas duas fontes, mas UM dos dois é obrigatório.
--
-- Seguro para o que já existe: toda linha de hoje tem `anilistId`, então
-- afrouxar para anulável não invalida nada, e `kitsuId` nasce nulo.
ALTER TABLE "Media" ADD COLUMN     "kitsuId" INTEGER,
ALTER COLUMN "anilistId" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Media_kitsuId_key" ON "Media"("kitsuId");

-- O Prisma não gera CHECK; escrito à mão, como o índice parcial de
-- `ReadingSource`. Sem isto, uma linha sem nenhuma das duas identidades entraria
-- no banco e ficaria inalcançável por qualquer URL.
ALTER TABLE "Media"
  ADD CONSTRAINT "Media_identidade_externa_check"
  CHECK ("anilistId" IS NOT NULL OR "kitsuId" IS NOT NULL);
