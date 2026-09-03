/**
 * Regras puras da foto de perfil (issue #76). O navegador recorta e reduz
 * para 256x256 JPEG antes de enviar; o servidor não processa imagem, só
 * recusa o que não é imagem comum ou passou do limite.
 */
export const LIMITE_DO_AVATAR_BYTES = 512 * 1024;

const TIPOS_ACEITOS = ["image/jpeg", "image/png", "image/webp"];

export type ErroDoAvatar = "tipo_invalido" | "tamanho_invalido";

export function validarAvatar(mime: string, tamanho: number): ErroDoAvatar | null
{
  if (!TIPOS_ACEITOS.includes(mime))
  {
    return "tipo_invalido";
  }

  if (!Number.isInteger(tamanho) || tamanho <= 0 || tamanho > LIMITE_DO_AVATAR_BYTES)
  {
    return "tamanho_invalido";
  }

  return null;
}
