import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { limitarBuscaDoCatalogo } from "@/server/services/limite.service";
import { contarTentativas, registrarTentativa } from "@/server/repositories/auth-attempt.repository";

vi.mock("@/server/repositories/auth-attempt.repository", () => ({
  contarTentativas: vi.fn(), registrarTentativa: vi.fn(),
  limparTentativas: vi.fn(), recolherTentativasAntigas: vi.fn(),
}));

const AGORA = new Date("2026-09-11T18:40:00Z");
let tentativas: Date[];

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(AGORA);
  tentativas = [];
  vi.mocked(registrarTentativa).mockImplementation(async () => { tentativas.push(new Date()); });
  vi.mocked(contarTentativas).mockImplementation(async (_escopo, _chave, desde) => {
    const recentes = tentativas.filter(data => data >= desde);
    return { total: recentes.length, maisAntiga: recentes[0] ?? null };
  });
});

afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); vi.clearAllMocks(); });

function acumularHa(minutos: number) {
  tentativas = Array.from({ length: 120 }, () => new Date(AGORA.getTime() - minutos * 60_000));
}

describe("limite do catálogo durante testes locais", () => {
  it("no next dev uma rodada de testes de seis minutos atrás não bloqueia a busca atual", async () => {
    vi.stubEnv("NODE_ENV", "development");
    acumularHa(6);
    expect(await limitarBuscaDoCatalogo({ ip: "desconhecido" })).toEqual({ bloqueado: false });
  });

  it.each(["production", "test", undefined])("mantém a janela de uma hora fora do desenvolvimento: %s", async ambiente => {
    vi.stubEnv("NODE_ENV", ambiente);
    acumularHa(6);
    expect(await limitarBuscaDoCatalogo({ ip: "desconhecido" })).toMatchObject({ bloqueado: true });
  });

  it("desenvolvimento continua bloqueando uma rajada de mais de 120 buscas", async () => {
    vi.stubEnv("NODE_ENV", "development");
    acumularHa(1);
    expect(await limitarBuscaDoCatalogo({ ip: "127.0.0.1" })).toMatchObject({ bloqueado: true });
  });
});
