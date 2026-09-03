/**
 * Erros de domínio que atravessam camadas com significado, em vez de deixar
 * vazar erro de infraestrutura (código do Prisma, mensagem de driver) para cima.
 */

/** Violação de unicidade que o formulário sabe mostrar: qual campo já existe. */
export class ErroCampoDuplicado extends Error
{
  readonly campo: "username" | "email";

  constructor(campo: "username" | "email")
  {
    super(`${campo} já está em uso`);
    this.name = "ErroCampoDuplicado";
    this.campo = campo;
  }
}
