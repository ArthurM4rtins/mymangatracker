import { describe, expect, it } from "vitest";
import {
  verificarSaude,
  type RelatorioSaude,
} from "@/server/services/health.service";

const AGORA = new Date("2026-08-28T00:00:00.000Z");

function relogio()
{
  return AGORA;
}

async function ok()
{
  return "ok" as const;
}

async function naoConfigurado()
{
  return "not_configured" as const;
}

function demora(ms: number)
{
  return function ()
  {
    return new Promise<"ok">(function (resolve)
    {
      setTimeout(function () { resolve("ok"); }, ms);
    });
  };
}

function achar(relatorio: RelatorioSaude, nome: string)
{
  return relatorio.dependencies.find(function (d) { return d.name === nome; });
}

describe("verificarSaude", () =>
{
  it("reporta ok quando as três dependências respondem", async () =>
  {
    const relatorio = await verificarSaude({ database: ok, anilist: ok, sessionSecret: ok, relogio });

    expect(relatorio.status).toBe("ok");
    expect(relatorio.checkedAt).toBe("2026-08-28T00:00:00.000Z");
    expect(relatorio.dependencies).toHaveLength(3);
  });

  it("mede a latência de quem respondeu", async () =>
  {
    const relatorio = await verificarSaude({ database: ok, anilist: ok, sessionSecret: ok, relogio });

    expect(typeof achar(relatorio, "database")?.latencyMs).toBe("number");
  });

  it("mantém a ordem: database antes de anilist", async () =>
  {
    const relatorio = await verificarSaude({ database: ok, anilist: ok, sessionSecret: ok, relogio });

    expect(relatorio.dependencies.map(function (d) { return d.name; })).toEqual([
      "database",
      "anilist",
      "session_secret",
    ]);
  });

  // #65, item 23: SESSION_SECRET é obrigatória em runtime, mas nenhuma
  // verificação de deploy olhava para ela — deploy sem a variável passava como saudável.
  it("fica degraded quando o segredo da sessão não está configurado", async () =>
  {
    const relatorio = await verificarSaude({
      database: ok,
      anilist: ok,
      sessionSecret: naoConfigurado,
      relogio,
    });

    expect(relatorio.status).toBe("degraded");
    expect(achar(relatorio, "session_secret")?.status).toBe("not_configured");
    expect(achar(relatorio, "session_secret")).not.toHaveProperty("latencyMs");
  });

  it("fica degraded quando o banco não está configurado", async () =>
  {
    const relatorio = await verificarSaude({
      database: naoConfigurado,
      anilist: ok,
      
      sessionSecret: ok,
      relogio,
    });

    expect(relatorio.status).toBe("degraded");
    expect(achar(relatorio, "database")?.status).toBe("not_configured");
  });

  it("não mede latência do que nem foi chamado", async () =>
  {
    const relatorio = await verificarSaude({
      database: naoConfigurado,
      anilist: ok,
      
      sessionSecret: ok,
      relogio,
    });

    expect(achar(relatorio, "database")).not.toHaveProperty("latencyMs");
  });

  it("fica down quando a sonda levanta erro", async () =>
  {
    const relatorio = await verificarSaude({
      database: async function () { throw new Error("connection refused"); },
      anilist: ok,
      
      sessionSecret: ok,
      relogio,
    });

    expect(relatorio.status).toBe("down");
    expect(achar(relatorio, "database")?.status).toBe("down");
  });

  it("NUNCA deixa o erro vazar para o payload", async () =>
  {
    const segredo =
      "postgresql://usuario:senha-secreta@ep-abc-123.us-east-2.aws.neon.tech/neondb";

    const relatorio = await verificarSaude({
      database: async function () { throw new Error(`falha ao conectar em ${segredo}`); },
      anilist: ok,
      
      sessionSecret: ok,
      relogio,
    });

    const serializado = JSON.stringify(relatorio);

    expect(serializado).not.toContain("senha-secreta");
    expect(serializado).not.toContain("neon.tech");
    expect(serializado).not.toContain("postgresql://");
    expect(serializado).not.toContain("usuario");
  });

  it("fica down quando a sonda trava, em vez de pendurar a resposta", async () =>
  {
    const relatorio = await verificarSaude({
      database: demora(400),
      anilist: ok,
      
      sessionSecret: ok,
      relogio,
      timeoutMs: 20,
    });

    expect(achar(relatorio, "database")?.status).toBe("down");
    expect(relatorio.status).toBe("down");
  });

  it("checa as duas dependências em paralelo, não uma depois da outra", async () =>
  {
    let simultaneas = 0;
    let pico = 0;

    function sondaLenta()
    {
      simultaneas += 1;
      pico = Math.max(pico, simultaneas);

      return new Promise<"ok">(function (resolve)
      {
        setTimeout(function ()
        {
          simultaneas -= 1;
          resolve("ok");
        }, 30);
      });
    }

    await verificarSaude({ database: sondaLenta, anilist: sondaLenta, sessionSecret: ok, relogio });

    expect(pico).toBe(2);
  });
});
