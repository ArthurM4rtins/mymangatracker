import { describe, expect, it } from "vitest";
import { LIMITE_DO_AVATAR_BYTES, validarAvatar } from "@/server/domain/avatar";

// Issue #76: o navegador manda 256x256 JPEG (~30 KB). O servidor não processa
// imagem — só recusa o que não é imagem comum ou passou do limite.
describe("validarAvatar", function ()
{
  it("aceita jpeg, png e webp dentro do limite", function ()
  {
    expect(validarAvatar("image/jpeg", 30_000)).toBeNull();
    expect(validarAvatar("image/png", 30_000)).toBeNull();
    expect(validarAvatar("image/webp", LIMITE_DO_AVATAR_BYTES)).toBeNull();
  });

  it("recusa outro tipo", function ()
  {
    expect(validarAvatar("image/gif", 10)).toBe("tipo_invalido");
    expect(validarAvatar("text/html", 10)).toBe("tipo_invalido");
    expect(validarAvatar("", 10)).toBe("tipo_invalido");
  });

  it("recusa vazio e acima do limite", function ()
  {
    expect(validarAvatar("image/jpeg", 0)).toBe("tamanho_invalido");
    expect(validarAvatar("image/jpeg", LIMITE_DO_AVATAR_BYTES + 1)).toBe("tamanho_invalido");
  });
});
