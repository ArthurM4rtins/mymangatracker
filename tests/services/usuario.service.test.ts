import { describe, expect, it, vi } from "vitest";
import { perfilDoUsuario } from "@/server/services/usuario.service";

// A home cumprimenta pelo username. O serviço só repassa o recorte público —
// o repositório já garante que hash nunca sai.

describe("perfilDoUsuario", function ()
{
  it("devolve o perfil público pelo id", async function ()
  {
    const buscarPorId = vi.fn(async function ()
    {
      return { id: "u1", username: "rankine", email: "r@x.test" };
    });

    const perfil = await perfilDoUsuario("u1", { buscarPorId });

    expect(buscarPorId).toHaveBeenCalledWith("u1");
    expect(perfil).toEqual({ id: "u1", username: "rankine", email: "r@x.test" });
  });

  it("usuário inexistente é null, não erro", async function ()
  {
    const buscarPorId = vi.fn(async function () { return null; });

    await expect(perfilDoUsuario("morto", { buscarPorId })).resolves.toBeNull();
  });
});
