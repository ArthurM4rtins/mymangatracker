import type { Metadata } from "next";
import Link from "next/link";
import { FormularioDeCadastro } from "./formulario";

export const metadata: Metadata = { title: "Criar conta" };

export default function Cadastrar()
{
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-sm flex-col gap-8 px-6 py-16">
      <header className="flex flex-col gap-2">
        <h1 className="font-marca text-3xl font-bold tracking-tight">Criar conta</h1>
        <p className="text-texto-suave">
          Estante, progresso e resenhas — a leitura fica só sua.
        </p>
      </header>

      <FormularioDeCadastro />

      <p className="text-sm text-texto-suave">
        Já tem conta?{" "}
        <Link href="/entrar" className="text-acento underline underline-offset-4">
          Entrar
        </Link>
      </p>
    </main>
  );
}
