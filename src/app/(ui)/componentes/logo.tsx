import Link from "next/link";

// O double-check do "visualizado": o primeiro visto leva a cor de acento do tema,
// o segundo herda a cor do texto. Marca registrada em Obsidian/02. Implementacoes/identidade-visual.
export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2" aria-label="Kidoku — início">
      <svg
        width="28"
        height="20"
        viewBox="0 0 76 36"
        aria-hidden="true"
        className="shrink-0"
      >
        <polyline
          points="4,18 18,32 46,4"
          fill="none"
          stroke="var(--acento)"
          strokeWidth="7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <polyline
          points="30,18 44,32 72,4"
          fill="none"
          stroke="currentColor"
          strokeWidth="7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className="font-marca text-xl font-bold tracking-tight">kidoku</span>
    </Link>
  );
}
