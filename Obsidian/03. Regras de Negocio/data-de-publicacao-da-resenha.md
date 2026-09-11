# Regra: a data de publicação da resenha é carimbada uma vez só

Decidida em 09/09/2026, na #143, revisitando a #111. Vale para o feed da home, o
perfil público e a página da obra.

## A regra

**Uma resenha tem uma data de publicação, gravada quando o texto aparece pela
primeira vez, e essa data nunca muda depois.**

Consequências, todas intencionais:

- Editar o texto não reposiciona a resenha em lugar nenhum.
- Mudar a nota não reposiciona.
- **Apagar o texto e escrever de novo também não.** Mesmo sendo um texto novo, a
  linha guarda a data da primeira publicação. É este ponto que a regra existe
  para garantir.
- Uma resenha que nunca teve texto não tem data de publicação. Nota sozinha não
  publica nada.

## Por que assim

A #111 tinha fixado "a data avança quando o texto nasce, e só aí" — para editar
uma resenha antiga não a trazer de volta ao topo. A intenção estava certa, mas
"nascer" era um estado que dava para reproduzir à vontade: salvar mantendo a nota
e esvaziando o texto, salvar o mesmo texto de volta, e o sistema via um texto
nascendo. Duas requisições, sem limite nenhum na rota, repetível para sempre.

Ninguém via dado de ninguém e nada vazava — era manipulação da vitrine pública,
que é o que o feed é.

Guardar a data numa coluna própria, escrita uma vez, fecha isso pela forma e não
pela vigilância: não existe sequência de ações do usuário que mude o valor depois
de gravado.

## O custo aceito

Quem apaga uma resenha e escreve outra, de verdade, meses depois, não volta ao
topo do feed. O texto é novo, a data não é.

Foi escolhido conscientemente em 09/09/2026: reposicionar quem reescreve é
exatamente o comportamento que a regra existe para impedir, e não há como
distinguir, do lado do servidor, quem reescreveu de boa-fé de quem está
manipulando a vitrine.

## O que NÃO é essa regra

`reviewedAt` continua existindo e continua sendo atualizado como antes. Ele é
histórico da linha, não a data pública. **Nenhuma superfície pública ordena nem
exibe por ele.**

O teto de avaliações por hora, que entrou junto, é defesa em profundidade: protege
a rota, que não tinha limite nenhum, mas não é o que fecha esta regra. A regra é
fechada pela coluna escrita uma vez.

## Onde isso vive no código

- `Entry.publishedAt` — nulo enquanto a resenha nunca teve texto.
- `avaliacao.repository.ts` — grava só na transição de vazio para texto, e só
  quando ainda está nulo.
- `atividade.repository.ts`, `perfil.repository.ts`, `review-social.repository.ts`
  — ordenam e exibem por ela.

## Referências

- Issues #143 (esta decisão) e #111 (a anterior, que ela revisita)
- Auditoria de 06/09/2026, achado 13
