import Image from "next/image";
import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { caminhoDaObra, referenciaDaChave } from "@/server/domain/referencia-da-obra";

/** A mesma capa e identificação nas grades e no painel da prateleira. */
export function CartaoObra({ chave, titulo, capa, children, acoes }: {
  /** A obra pela chave (#254): `anilist:30002` ou `kitsu:54598`. */
  chave: string;
  titulo: string;
  capa: string | null;
  children?: ReactNode;
  acoes?: ReactNode;
})
{
  const referencia = referenciaDaChave(chave);
  // Chave que o servidor não soube montar não vira link para lugar nenhum.
  const caminho = referencia === null ? "/catalogo" : caminhoDaObra(referencia);

  return (
    <li data-cartao-obra className="flex min-w-0 flex-col gap-2">
      <Link href={caminho} title={titulo} className="group flex min-w-0 flex-col gap-1.5">
        {capa ? (
          <Image src={capa} alt="" width={160} height={240} unoptimized
            className="aspect-[2/3] w-full rounded object-cover transition-opacity group-hover:opacity-80" />
        ) : (
          <div data-capa-vazia aria-hidden
            className="flex aspect-[2/3] w-full items-center justify-center rounded bg-superficie text-texto-suave">
            —
          </div>
        )}
        <h3 data-titulo-obra className="line-clamp-2 text-xs leading-snug text-texto-suave group-hover:text-texto">
          {titulo}
        </h3>
      </Link>
      {children}
      {acoes && <div className="mt-auto pt-1">{acoes}</div>}
    </li>
  );
}
