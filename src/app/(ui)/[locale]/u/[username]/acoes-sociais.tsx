"use client";

/**
 * Seguir e curtir o perfil (issue #74): dois toggles otimistas, no mesmo
 * jeito da curtida de lista. Cada botão carrega o próprio número. Anônimo vai
 * para /entrar. O dono não vê isto — a página não renderiza para ele.
 */
import { useRouter } from "next/navigation";
import { useState } from "react";

type Toggle = { ativo: boolean; total: number };

function useToggle(url: string, inicial: Toggle, logado: boolean)
{
  const roteador = useRouter();
  const [estado, setEstado] = useState(inicial);
  const [ocupado, setOcupado] = useState(false);

  async function alternar()
  {
    if (!logado)
    {
      roteador.push("/entrar");
      return;
    }

    const antes = estado;
    setEstado({ ativo: !antes.ativo, total: antes.total + (antes.ativo ? -1 : 1) });
    setOcupado(true);

    try
    {
      const resposta = await fetch(url, { method: "POST" });

      if (!resposta.ok)
      {
        setEstado(antes);
        return;
      }

      setEstado((await resposta.json()) as Toggle);
    }
    catch
    {
      setEstado(antes);
    }
    finally
    {
      setOcupado(false);
    }
  }

  return { estado, ocupado, alternar };
}

export function AcoesSociais({
  username,
  seguidores,
  sigo,
  curtidas,
  curti,
  logado,
}: {
  username: string;
  seguidores: number;
  sigo: boolean;
  curtidas: number;
  curti: boolean;
  logado: boolean;
})
{
  const base = `/api/v1/usuarios/${encodeURIComponent(username)}`;
  const seguir = useToggle(`${base}/seguir`, { ativo: sigo, total: seguidores }, logado);
  const curtir = useToggle(`${base}/curtida`, { ativo: curti, total: curtidas }, logado);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={seguir.alternar}
        disabled={seguir.ocupado}
        aria-pressed={seguir.estado.ativo}
        className={`inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm transition-colors disabled:opacity-60 ${
          seguir.estado.ativo
            ? "border-acento bg-acento text-acento-contraste hover:opacity-90"
            : "border-borda text-texto hover:border-acento hover:text-acento"
        }`}
      >
        {seguir.estado.ativo ? "Seguindo" : "Seguir"}
        <span className="tabular-nums opacity-80">{seguir.estado.total}</span>
      </button>

      <button
        type="button"
        onClick={curtir.alternar}
        disabled={curtir.ocupado}
        aria-pressed={curtir.estado.ativo}
        aria-label={curtir.estado.ativo ? "Descurtir perfil" : "Curtir perfil"}
        title={curtir.estado.ativo ? "Descurtir perfil" : "Curtir perfil"}
        className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm transition-colors disabled:opacity-60 ${
          curtir.estado.ativo
            ? "border-acento text-acento"
            : "border-borda text-texto-suave hover:border-acento hover:text-acento"
        }`}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill={curtir.estado.ativo ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
        <span className="tabular-nums">{curtir.estado.total}</span>
      </button>
    </div>
  );
}
