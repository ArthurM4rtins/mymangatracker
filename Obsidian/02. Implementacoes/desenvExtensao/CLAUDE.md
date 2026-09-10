# Tela de tutorial da extensão — desenvExtensao

## Objetivo

Uma página no site que ensina a instalar e usar a extensão do Kidoku. A extensão
está pronta (`extension/`, #52/#91), mas não publicada — então a página nasce
numa branch encostada e só vai para a `main` no dia em que existir link da
Chrome Web Store.

## Escopo

```
src/app/(ui)/[locale]/extensao/page.tsx    rota nova, servidor, estática
messages/{pt-BR,en,es,fr,de}.json          bloco "extensao"
src/app/(ui)/[locale]/componentes/rodape.tsx   link em "Explorar"
public/extensao/*.png                      as capturas
```

Nada de camada de serviço, repositório ou API: é conteúdo. A rota não lê banco,
não lê sessão e não vai dinâmica.

## Decisões tomadas

1. **A instalação é pela Chrome Web Store.** O passo 1 é o botão da loja. O
   endereço vive numa constante única (`LOJA_DA_EXTENSAO`); publicar é trocar
   uma string. Enquanto ela for nula, o botão aparece desativado com "em breve"
   e o resto da página funciona normalmente.
   - Descartado: ensinar "carregar sem compactação". É passo de desenvolvedor,
     envelhece no dia da publicação e pede que o visitante ligue o modo do
     desenvolvedor do navegador — não é o que se pede a quem só quer ler mangá.
2. **A branch fica encostada.** Merge só com o link da loja em mãos. Por isso o
   link do rodapé já entra aqui: página e link acendem no mesmo commit, e não
   sobra um "acender o link depois" para alguém lembrar.
3. **A página fala de permissão antes de o navegador falar.** O Chrome apresenta
   `tabs` como "Ler seu histórico de navegação", e quem instala merece ler isso
   aqui, não descobrir no diálogo (#148, item 10). É a mesma honestidade que o
   `extension/README.md` já pratica.

## A página

| Seção | O que diz |
|---|---|
| Abertura | O que a extensão faz em duas frases: registra o capítulo que você está lendo, sem sair da aba. |
| Instalar | 1. Instalar pela Chrome Web Store. 2. Entrar no Kidoku pelo site — a extensão usa a sessão do navegador. 3. Abrir um capítulo e clicar no ícone. |
| Usar | Escolher a obra na lista da estante; o capítulo vem do título da página, e campo vazio quando não dá para saber — nunca chute. A obra fica pareada com o site, e no próximo capítulo já vem escolhida. O badge ● acende quando a página é de obra pareada. |
| Registro automático | O que a caixinha faz e o que ela não faz. |
| Privacidade | Lê URL e título da aba; não injeta script nem lê o conteúdo do site. O progresso é privado do dono — a mesma invariante do resto do sistema. |
| Não funcionou? | Sem sessão (entrar pelo site), capítulo não detectado (digitar à mão), obra fora da estante (adicionar pelo catálogo — hoje a extensão não adiciona). |

## Regras específicas

- Cinco idiomas, como toda tela. Chave órfã sai junto.
- Captura entra com `next/image`, `alt` traduzido e largura fixa: imagem de
  interface não é decorativa, quem usa leitor de tela precisa do texto.
- Sem número de versão da extensão na página: sai de sincronia sozinho.

## Feito

Página, cinco idiomas, link do rodapé e as quatro capturas — popup sem sessão,
popup em uso, badge âmbar e badge verde. Conferida na tela nos cinco idiomas.

No caminho apareceu um defeito na própria extensão: o par site→obra só era
gravado quando a resposta era 200, e o `nao_avanca` responde 409 — então obra já
lida além daquele capítulo nunca pareava, e o badge nunca acendia naquele site.
A decisão virou `deveParear` no `comum.js`, com teste.

## Pendências

- Ícone próprio da extensão continua pendente no `extension/README.md`.
- No dia da publicação: preencher `LOJA_DA_EXTENSAO` e mergear.

## Referências

- `extension/README.md` — o comportamento real, de onde a página foi escrita
- `Obsidian/02. Implementacoes/feature-extensao-navegador/CLAUDE.md` — o desenho da extensão
- #52, #91 — a extensão; #148 item 10 — a permissão apresentada com honestidade
