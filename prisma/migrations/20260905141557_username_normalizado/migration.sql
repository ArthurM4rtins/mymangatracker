-- #114: username deixa de distinguir maiúsculas. A coluna nova nasce
-- anulável, recebe lower(username) de quem já existe, e só então vira
-- NOT NULL e única. Se já houver colisão de caixa nos dados, o índice único
-- falha aqui — e é para falhar: resolver à mão antes de aplicar.
ALTER TABLE "User" ADD COLUMN "usernameNormalizado" TEXT;

UPDATE "User" SET "usernameNormalizado" = lower(trim("username"));

ALTER TABLE "User" ALTER COLUMN "usernameNormalizado" SET NOT NULL;

CREATE UNIQUE INDEX "User_usernameNormalizado_key" ON "User"("usernameNormalizado");
