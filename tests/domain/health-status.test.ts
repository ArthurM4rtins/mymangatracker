import { describe, expect, it } from "vitest";
import {
  estadoGeral,
  httpStatusPara,
  type Dependencia,
} from "@/server/domain/health-status";

function dep(name: string, status: Dependencia["status"]): Dependencia
{
  return { name, status };
}

describe("estadoGeral", () =>
{
  it("é ok quando toda dependência está ok", () =>
  {
    expect(estadoGeral([dep("database", "ok"), dep("anilist", "ok")])).toBe("ok");
  });

  it("é degraded quando falta configuração e nada está fora", () =>
  {
    expect(
      estadoGeral([dep("database", "not_configured"), dep("anilist", "ok")]),
    ).toBe("degraded");
  });

  it("é degraded quando nada foi configurado", () =>
  {
    expect(
      estadoGeral([dep("database", "not_configured"), dep("anilist", "not_configured")]),
    ).toBe("degraded");
  });

  it("é down quando alguma dependência está fora", () =>
  {
    expect(estadoGeral([dep("database", "down"), dep("anilist", "ok")])).toBe("down");
  });

  it("down vence not_configured — falha real não vira aviso de configuração", () =>
  {
    expect(
      estadoGeral([dep("database", "not_configured"), dep("anilist", "down")]),
    ).toBe("down");
  });

  it("recusa lista vazia em vez de dizer que está tudo bem", () =>
  {
    expect(() => estadoGeral([])).toThrow(/nenhuma dependência/i);
  });
});

describe("httpStatusPara", () =>
{
  it("responde 200 quando está ok", () =>
  {
    expect(httpStatusPara("ok")).toBe(200);
  });

  it("responde 200 quando está degraded — configuração pendente não é falha do serviço", () =>
  {
    expect(httpStatusPara("degraded")).toBe(200);
  });

  it("responde 503 quando está down", () =>
  {
    expect(httpStatusPara("down")).toBe(503);
  });
});
