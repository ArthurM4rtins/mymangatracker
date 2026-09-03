"use client";

/**
 * A foto no header do perfil (issue #76). Para o dono, clicar abre o seletor
 * de arquivo; o navegador recorta ao quadrado e reduz para 256x256 JPEG
 * antes de enviar — o servidor não processa imagem. "Remover" volta à
 * inicial. Para os outros, só a foto (ou a inicial).
 */
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

const LADO = 256;

export function FotoDePerfil({
  username,
  versao,
  souEu,
}: {
  username: string;
  /** `null` sem foto; senão o timestamp da última troca, para furar o cache. */
  versao: number | null;
  souEu: boolean;
})
{
  const roteador = useRouter();
  const entrada = useRef<HTMLInputElement>(null);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const url = versao === null
    ? null
    : `/api/v1/usuarios/${encodeURIComponent(username)}/avatar?v=${versao}`;

  async function enviar(arquivo: File)
  {
    setOcupado(true);
    setErro(null);

    try
    {
      const jpeg = await recortarEReduzir(arquivo);
      const resposta = await fetch("/api/v1/perfil/avatar", {
        method: "PUT",
        headers: { "Content-Type": "image/jpeg" },
        body: jpeg,
      });

      if (!resposta.ok)
      {
        const corpo = (await resposta.json().catch(function () { return null; })) as
          | { erros?: { _geral?: string } }
          | null;
        setErro(corpo?.erros?._geral ?? "não foi possível agora");
        return;
      }

      roteador.refresh();
    }
    catch
    {
      setErro("não deu para ler essa imagem");
    }
    finally
    {
      setOcupado(false);
      if (entrada.current) entrada.current.value = "";
    }
  }

  async function remover()
  {
    setOcupado(true);
    setErro(null);

    try
    {
      const resposta = await fetch("/api/v1/perfil/avatar", { method: "DELETE" });

      if (!resposta.ok)
      {
        setErro("não foi possível agora");
        return;
      }

      roteador.refresh();
    }
    finally
    {
      setOcupado(false);
    }
  }

  const circulo = url ? (
    // eslint-disable-next-line @next/next/no-img-element -- rota própria, sem otimização
    <img
      src={url}
      alt={souEu ? "Sua foto de perfil" : `Foto de ${username}`}
      width={80}
      height={80}
      className="h-20 w-20 shrink-0 rounded-full border border-borda object-cover"
    />
  ) : (
    <div
      aria-hidden
      className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full border border-borda bg-superficie font-marca text-3xl font-bold text-acento"
    >
      {username.charAt(0).toUpperCase()}
    </div>
  );

  if (!souEu)
  {
    return circulo;
  }

  return (
    <div className="flex shrink-0 flex-col items-center gap-1.5">
      <button
        type="button"
        onClick={function () { entrada.current?.click(); }}
        disabled={ocupado}
        title="Trocar foto"
        aria-label="Trocar foto de perfil"
        className="group relative rounded-full disabled:opacity-60"
      >
        {circulo}
        <span
          aria-hidden
          className="absolute inset-0 flex items-center justify-center rounded-full bg-fundo/70 text-xs font-medium text-texto opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
        >
          {ocupado ? "…" : "trocar"}
        </span>
      </button>
      <input
        ref={entrada}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={function (evento)
        {
          const arquivo = evento.target.files?.[0];
          if (arquivo) void enviar(arquivo);
        }}
      />
      {url && (
        <button
          type="button"
          onClick={remover}
          disabled={ocupado}
          className="text-xs text-texto-suave hover:text-acento disabled:opacity-60"
        >
          remover
        </button>
      )}
      {erro && <p className="max-w-[10rem] text-center text-xs text-acento">{erro}</p>}
    </div>
  );
}

/** Recorte central ao quadrado e redução para 256x256, saída JPEG. */
async function recortarEReduzir(arquivo: File): Promise<Blob>
{
  const bitmap = await createImageBitmap(arquivo);
  const lado = Math.min(bitmap.width, bitmap.height);
  const x = (bitmap.width - lado) / 2;
  const y = (bitmap.height - lado) / 2;

  const tela = document.createElement("canvas");
  tela.width = LADO;
  tela.height = LADO;
  const contexto = tela.getContext("2d");

  if (contexto === null)
  {
    throw new Error("canvas indisponível");
  }

  contexto.drawImage(bitmap, x, y, lado, lado, 0, 0, LADO, LADO);
  bitmap.close();

  return new Promise(function (resolver, rejeitar)
  {
    tela.toBlob(
      function (blob)
      {
        if (blob) resolver(blob);
        else rejeitar(new Error("sem blob"));
      },
      "image/jpeg",
      0.85,
    );
  });
}
