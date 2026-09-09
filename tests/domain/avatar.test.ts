import { describe, expect, it } from "vitest";
import { LIMITE_DO_AVATAR_BYTES, tipoPelosBytes, validarAvatar } from "@/server/domain/avatar";

// Issue #76: o navegador manda 256x256 JPEG (~30 KB). O servidor não processa
// imagem — só recusa o que não é imagem comum ou passou do limite.
//
// #148, item 2: até aqui só o MIME DECLARADO pelo cliente era conferido, e o GET
// devolvia esse mesmo MIME com cache de um ano. Agora o tipo sai dos bytes, e o
// declarado só é aceito se combinar com eles.

function comCabecalho(assinatura: number[], tamanho = 64): Uint8Array
{
  const bytes = new Uint8Array(tamanho);
  bytes.set(assinatura, 0);
  return bytes;
}

const JPEG = comCabecalho([0xff, 0xd8, 0xff, 0xe0]);
const PNG = comCabecalho([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function webp(): Uint8Array
{
  const bytes = comCabecalho([0x52, 0x49, 0x46, 0x46]);
  bytes.set([0x57, 0x45, 0x42, 0x50], 8);
  return bytes;
}

describe("tipoPelosBytes", function ()
{
  it("reconhece jpeg, png e webp pela assinatura", function ()
  {
    expect(tipoPelosBytes(JPEG)).toBe("image/jpeg");
    expect(tipoPelosBytes(PNG)).toBe("image/png");
    expect(tipoPelosBytes(webp())).toBe("image/webp");
  });

  it("não reconhece o que não é imagem aceita", function ()
  {
    // "<svg" e "<!DO" — os dois gadgets que só não passavam porque o allowlist
    // do MIME declarado é exato.
    expect(tipoPelosBytes(comCabecalho([0x3c, 0x73, 0x76, 0x67]))).toBeNull();
    expect(tipoPelosBytes(comCabecalho([0x3c, 0x21, 0x44, 0x4f]))).toBeNull();
    expect(tipoPelosBytes(comCabecalho([0x47, 0x49, 0x46, 0x38]))).toBeNull();
    expect(tipoPelosBytes(new Uint8Array([0xff, 0xd8]))).toBeNull();
    expect(tipoPelosBytes(new Uint8Array())).toBeNull();
  });

  it("RIFF que não é WEBP não passa", function ()
  {
    const riffQualquer = comCabecalho([0x52, 0x49, 0x46, 0x46]);
    riffQualquer.set([0x41, 0x56, 0x49, 0x20], 8);

    expect(tipoPelosBytes(riffQualquer)).toBeNull();
  });
});

describe("validarAvatar", function ()
{
  it("aceita jpeg, png e webp dentro do limite", function ()
  {
    expect(validarAvatar("image/jpeg", JPEG)).toBeNull();
    expect(validarAvatar("image/png", PNG)).toBeNull();
    expect(validarAvatar("image/webp", webp())).toBeNull();
  });

  it("recusa outro tipo declarado", function ()
  {
    expect(validarAvatar("image/gif", JPEG)).toBe("tipo_invalido");
    expect(validarAvatar("text/html", JPEG)).toBe("tipo_invalido");
    expect(validarAvatar("", JPEG)).toBe("tipo_invalido");
  });

  it("recusa quando os bytes não são do tipo declarado", function ()
  {
    expect(validarAvatar("image/png", JPEG)).toBe("tipo_invalido");
    expect(validarAvatar("image/jpeg", comCabecalho([0x3c, 0x73, 0x76, 0x67]))).toBe("tipo_invalido");
  });

  it("corpo vazio nao tem assinatura, entao e tipo invalido", function ()
  {
    expect(validarAvatar("image/jpeg", new Uint8Array())).toBe("tipo_invalido");
  });

  it("recusa acima do limite", function ()
  {
    expect(
      validarAvatar("image/jpeg", comCabecalho([0xff, 0xd8, 0xff, 0xe0], LIMITE_DO_AVATAR_BYTES + 1)),
    ).toBe("tamanho_invalido");
  });

  it("no limite exato ainda passa", function ()
  {
    expect(
      validarAvatar("image/jpeg", comCabecalho([0xff, 0xd8, 0xff, 0xe0], LIMITE_DO_AVATAR_BYTES)),
    ).toBeNull();
  });
});
