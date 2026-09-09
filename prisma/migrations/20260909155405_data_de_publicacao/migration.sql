-- A data PUBLICA da resenha (#143), escrita uma vez na transicao de vazio para
-- texto e nunca mais. Ate aqui o feed ordenava por `reviewedAt`, que era
-- recarimbado a cada "nascimento" do texto — e apagar e reescrever contava como
-- nascer, entao qualquer conta voltava ao topo em duas requisicoes.
ALTER TABLE "Entry" ADD COLUMN "publishedAt" TIMESTAMP(3);

-- Backfill: quem ja tem texto publicado herda a data que o feed usava. Sem isto
-- toda resenha existente sairia do feed, que so olha linha com data.
UPDATE "Entry" SET "publishedAt" = "reviewedAt" WHERE "review" IS NOT NULL;

-- O indice parcial acompanha a coluna que passou a ordenar. Indice parcial nao
-- sai do schema do Prisma: vive aqui, a mao, como o anterior.
CREATE INDEX "Entry_review_publishedAt_idx" ON "Entry" ("publishedAt" DESC) WHERE "review" IS NOT NULL;

-- O antigo perde o unico leitor que tinha.
DROP INDEX "Entry_review_reviewedAt_idx";
