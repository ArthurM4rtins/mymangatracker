import type { Metadata } from "next";
import Link from "next/link";
import { FormularioDeLogin } from "./formulario";

export const metadata: Metadata = { title: "Entrar" };

type Props = {
  searchParams: Promise<{ conta?: string }>;
};

export default async function Entrar({ searchParams }: Props)
{
  const { conta } = await searchParams;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-sm flex-col gap-8 px-6 py-16">
      <header className="flex flex-col gap-2">
        <h1 className="font-marca text-3xl font-bold tracking-tight">Entrar</h1>
        {conta === "criada" ? (
          <p role="status" className="rounded-md border border-borda bg-superficie p-3 text-sm">
            Conta criada. Agora é entrar.
          </p>
        ) : (
          <p className="text-texto-suave">De volta à leitura.</p>
        )}
      </header>

      <FormularioDeLogin />

      <p className="text-sm text-texto-suave">
        Ainda não tem conta?{" "}
        <Link href="/cadastrar" className="text-acento underline underline-offset-4">
          Criar conta
        </Link>
      </p>
    </main>
  );
}
