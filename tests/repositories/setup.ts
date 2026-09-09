// Roda antes dos testes de repositório. Promove DATABASE_URL_TEST a DATABASE_URL
// só dentro deste processo, para que o cliente do Prisma abra no banco de teste e
// nunca no de desenvolvimento.
//
// A guarda do sufixo vem do módulo compartilhado (#148, item 7): este arquivo é
// alcançado mesmo quando alguém roda o vitest direto, sem passar pelo script de
// migration — e é a suíte, não o script, que apaga as tabelas.
import "dotenv/config";
import { urlDoBancoDeTeste } from "../../scripts/banco-de-teste.mjs";

process.env.DATABASE_URL = urlDoBancoDeTeste(process.env);
