/**
 * Hash e verificação de senha com `scrypt` do `node:crypto`.
 *
 * Sem argon2/bcrypt nativo de propósito: binário nativo quebra o build da Vercel.
 * O formato gravado carrega algoritmo e parâmetros — `scrypt$N$r$p$salt$derivada`
 * em base64url — então dá para endurecer os parâmetros no futuro sem invalidar
 * hash antigo: a verificação lê os parâmetros do próprio hash.
 */
import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

const CUSTO_N_PADRAO = 16384;
const BLOCO_R = 8;
const PARALELISMO_P = 1;
const TAMANHO_SALT = 16;
const TAMANHO_DERIVADA = 64;

type OpcoesDeHash = {
  /** Só para teste de compatibilidade de parâmetros — produção usa o padrão. */
  custoN?: number;
};

export async function gerarHashDeSenha(
  senha: string,
  opcoes?: OpcoesDeHash,
): Promise<string>
{
  const custoN = opcoes?.custoN ?? CUSTO_N_PADRAO;
  const salt = randomBytes(TAMANHO_SALT);
  const derivada = await derivar(senha, salt, custoN, BLOCO_R, PARALELISMO_P);

  return [
    "scrypt",
    custoN,
    BLOCO_R,
    PARALELISMO_P,
    salt.toString("base64url"),
    derivada.toString("base64url"),
  ].join("$");
}

export async function verificarSenha(
  senha: string,
  hashGravado: string,
): Promise<boolean>
{
  const partes = hashGravado.split("$");

  if (partes.length !== 6 || partes[0] !== "scrypt")
  {
    return false;
  }

  const custoN = Number(partes[1]);
  const blocoR = Number(partes[2]);
  const paralelismoP = Number(partes[3]);

  if (!Number.isInteger(custoN) || !Number.isInteger(blocoR) || !Number.isInteger(paralelismoP))
  {
    return false;
  }

  const salt = Buffer.from(partes[4], "base64url");
  const esperada = Buffer.from(partes[5], "base64url");

  if (salt.length === 0 || esperada.length === 0)
  {
    return false;
  }

  let derivada: Buffer;
  try
  {
    derivada = await derivar(senha, salt, custoN, blocoR, paralelismoP);
  }
  catch
  {
    // Parâmetros absurdos (N que não é potência de 2, custo acima do limite):
    // hash inválido, não erro do chamador.
    return false;
  }

  // Comparação em tempo constante — `===` de string vaza o prefixo pelo tempo.
  return derivada.length === esperada.length && timingSafeEqual(derivada, esperada);
}

function derivar(
  senha: string,
  salt: Buffer,
  custoN: number,
  blocoR: number,
  paralelismoP: number,
): Promise<Buffer>
{
  return new Promise(function (resolve, reject)
  {
    scrypt(
      senha,
      salt,
      TAMANHO_DERIVADA,
      { N: custoN, r: blocoR, p: paralelismoP, maxmem: 128 * 1024 * 1024 },
      function (erro, derivada)
      {
        if (erro)
        {
          reject(erro);
          return;
        }
        resolve(derivada);
      },
    );
  });
}
