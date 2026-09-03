import { describe, expect, it } from "vitest";
import { interpretarOrdemDasListas } from "@/server/domain/lista-listagem";

// Issue #80: /listas ordena por URL (?ordem=). Whitelist como no catálogo:
// valor desconhecido ou ausente cai em "recentes", nunca vira consulta solta.
describe("interpretarOrdemDasListas", function ()
{
  it("aceita recentes e curtidas", function ()
  {
    expect(interpretarOrdemDasListas("recentes")).toBe("recentes");
    expect(interpretarOrdemDasListas("curtidas")).toBe("curtidas");
  });

  it("ausente ou desconhecido vira recentes", function ()
  {
    expect(interpretarOrdemDasListas(undefined)).toBe("recentes");
    expect(interpretarOrdemDasListas("")).toBe("recentes");
    expect(interpretarOrdemDasListas("DROP TABLE")).toBe("recentes");
    expect(interpretarOrdemDasListas(["curtidas", "recentes"])).toBe("recentes");
  });
});
