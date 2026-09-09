/**
 * Abre issue no repositório (issue #158). É a única escrita que o Kidoku faz
 * fora do próprio banco.
 *
 * Por que issue e não tabela: aproveita um fluxo que já existe e não cria nada
 * para manter — tabela pediria moderação, limitador próprio e uma tela de
 * administração que não existe. Decisão de 09/09/2026.
 *
 * A credencial vive só em variável de ambiente, e o token quer o escopo mínimo
 * que abre issue no repositório — nada além disso.
 */
import { relatoConfigurado, repositorioDeRelatos, tokenDeRelatos } from "./config";

const TIMEOUT_MS = 8000;

export type ResultadoDaPublicacao =
  | { estado: "ok"; url: string }
  | { estado: "nao_configurado" }
  | { estado: "falhou" };

/**
 * Publica e devolve o link. `nao_configurado` é estado de primeira classe de
 * propósito: sem o token, a rota tem que dizer que o canal está fora, e não
 * fingir que enviou. Relato que some em silêncio é pior que canal ausente.
 */
export async function abrirIssueDeRelato(
  titulo: string,
  corpo: string,
): Promise<ResultadoDaPublicacao>
{
  if (!relatoConfigurado())
  {
    return { estado: "nao_configurado" };
  }

  try
  {
    const resposta = await fetch(
      `https://api.github.com/repos/${repositorioDeRelatos()}/issues`,
      {
        method: "POST",
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${tokenDeRelatos()}`,
          "X-GitHub-Api-Version": "2022-11-28",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title: titulo, body: corpo, labels: ["traducao"] }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      },
    );

    if (!resposta.ok)
    {
      // O corpo do erro do GitHub pode trazer detalhe da instalação; fica no log
      // da plataforma, nunca na tela.
      console.error("[github] issue de relato recusada:", resposta.status);
      return { estado: "falhou" };
    }

    const criada: unknown = await resposta.json();
    const url = typeof criada === "object" && criada !== null && "html_url" in criada
      ? String((criada as { html_url: unknown }).html_url)
      : "";

    return { estado: "ok", url };
  }
  catch (erro)
  {
    console.error("[github] falha ao abrir issue:", erro instanceof Error ? erro.message : erro);
    return { estado: "falhou" };
  }
}
