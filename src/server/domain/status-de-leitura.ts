/**
 * O que registrar um capítulo diz sobre o status da obra na estante.
 *
 * Quem abre um capítulo de obra Planejada começou a ler; quem volta à que tinha
 * pausado ou largado voltou a ler. Concluída é a exceção: reler um capítulo não
 * desmarca a obra como concluída, e desmarcar por engano apagaria um dado que o
 * usuário pôs à mão.
 *
 * A regra vale para os dois caminhos que registram leitura — o clique no site e
 * a extensão de navegador (issue #52) — e por isso mora no domínio, não dentro
 * de um dos dois serviços. Até aqui nenhum caminho mexia em status, e obra
 * Planejada ficava com progresso e o rótulo errado.
 */
import type { StatusDaEstante } from "./perfil";

const VOLTAM_A_LER = new Set<StatusDaEstante>(["PLANNED", "PAUSED", "DROPPED"]);

/**
 * O status que a entrada passa a ter depois da leitura, ou `null` quando não há
 * o que mudar — quem já lê continua lendo, quem concluiu continua concluído.
 */
export function statusAposLeitura(atual: StatusDaEstante): StatusDaEstante | null
{
  return VOLTAM_A_LER.has(atual) ? "READING" : null;
}
