import { describe, expect, it } from "vitest";
import { podeSeRelacionar } from "@/server/domain/social";

// Issue #74: seguir e curtir perfil são relações entre DOIS usuários. A si
// mesmo não — o banco trava com CHECK, o domínio explica antes de chegar lá.
describe("podeSeRelacionar", function ()
{
  it("dois usuários distintos podem", function ()
  {
    expect(podeSeRelacionar("u1", "u2")).toBe(true);
  });

  it("consigo mesmo não", function ()
  {
    expect(podeSeRelacionar("u1", "u1")).toBe(false);
  });
});
