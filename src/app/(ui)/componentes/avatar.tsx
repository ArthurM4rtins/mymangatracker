/**
 * A foto de perfil em miniatura (issue #87), onde um username aparece: a foto
 * pela rota própria (com `?v=` para furar o cache) ou a inicial, sem foto.
 * Sem estado, serve em componente server ou client.
 */
const TAMANHO = {
  sm: "h-6 w-6 text-[10px]",
  md: "h-8 w-8 text-xs",
} as const;

export function Avatar({
  username,
  versao,
  tamanho = "md",
}: {
  username: string;
  /** Timestamp da última troca; `null` sem foto. */
  versao: number | null;
  tamanho?: keyof typeof TAMANHO;
})
{
  const classe = `${TAMANHO[tamanho]} shrink-0 rounded-full border border-borda object-cover`;

  if (versao === null)
  {
    return (
      <span
        aria-hidden
        className={`${classe} inline-flex items-center justify-center bg-superficie font-marca font-bold text-acento`}
      >
        {username.charAt(0).toUpperCase()}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- rota própria, sem otimização
    <img
      src={`/api/v1/usuarios/${encodeURIComponent(username)}/avatar?v=${versao}`}
      alt=""
      width={32}
      height={32}
      loading="lazy"
      className={classe}
    />
  );
}
