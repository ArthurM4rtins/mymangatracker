/**
 * Sonda do banco. Nao le nem escreve dado de ninguem — so descobre se ha conexao.
 */
import { bancoConfigurado } from "@/server/infra/config";
import { getPrisma } from "./prisma";

/**
 * `not_configured` quando não há `DATABASE_URL`: não houve tentativa que pudesse
 * falhar, e chamar isso de falha faria o app parecer quebrado quando só falta
 * ligar o banco.
 *
 * @throws quando há URL e o banco não responde — quem traduz em `down` é o serviço.
 */
export async function pingBanco(): Promise<"ok" | "not_configured">
{
  if (!bancoConfigurado())
  {
    return "not_configured";
  }

  // A consulta mais barata que ainda prova ida e volta até o Postgres.
  await getPrisma().$queryRaw`SELECT 1`;

  return "ok";
}
