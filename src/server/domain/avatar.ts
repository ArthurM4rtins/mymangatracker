/**
 * Regras puras da foto de perfil (issue #76). O navegador recorta e reduz
 * para 256x256 JPEG antes de enviar; o servidor não processa imagem, só
 * recusa o que não é imagem comum ou passou do limite.
 *
 * O tipo sai dos BYTES (#148, item 2). Antes só o MIME declarado pelo cliente
 * era conferido, e o GET devolvia esse mesmo MIME de volta, com cache de um ano
 * — quem enviasse bytes de HTML dizendo `image/png` ficava com um arquivo
 * servido do nosso domínio com o tipo que ele escolheu. Não era explorável, mas
 * só porque o allowlist é exato e o navegador não fareja HTML a partir de
 * `image/*`. Era um gadget esperando alguém afrouxar uma das duas coisas.
 */
export const LIMITE_DO_AVATAR_BYTES = 512 * 1024;

export type TipoDeAvatar = "image/jpeg" | "image/png" | "image/webp";

export type ErroDoAvatar = "tipo_invalido" | "tamanho_invalido";

const JPEG = [0xff, 0xd8, 0xff];
const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const RIFF = [0x52, 0x49, 0x46, 0x46];
const WEBP = [0x57, 0x45, 0x42, 0x50];

function comecaCom(bytes: Uint8Array, assinatura: number[], deslocamento = 0): boolean
{
  if (bytes.length < deslocamento + assinatura.length)
  {
    return false;
  }

  return assinatura.every(function (valor, indice)
  {
    return bytes[deslocamento + indice] === valor;
  });
}

/** O tipo real, pela assinatura. `null` quando não é imagem que aceitamos. */
export function tipoPelosBytes(bytes: Uint8Array): TipoDeAvatar | null
{
  if (comecaCom(bytes, JPEG))
  {
    return "image/jpeg";
  }

  if (comecaCom(bytes, PNG))
  {
    return "image/png";
  }

  // WebP é um contêiner RIFF: os quatro primeiros bytes são "RIFF", o tamanho
  // ocupa os quatro seguintes, e só então vem "WEBP". Um .avi também é RIFF.
  if (comecaCom(bytes, RIFF) && comecaCom(bytes, WEBP, 8))
  {
    return "image/webp";
  }

  return null;
}

/**
 * O declarado só vale se combinar com os bytes. O tipo declarado é guardado no
 * banco e devolvido no GET, então ele precisa ser verdade.
 */
export function validarAvatar(mime: string, bytes: Uint8Array): ErroDoAvatar | null
{
  const real = tipoPelosBytes(bytes);

  if (real === null || mime !== real)
  {
    return "tipo_invalido";
  }

  if (bytes.byteLength <= 0 || bytes.byteLength > LIMITE_DO_AVATAR_BYTES)
  {
    return "tamanho_invalido";
  }

  return null;
}
