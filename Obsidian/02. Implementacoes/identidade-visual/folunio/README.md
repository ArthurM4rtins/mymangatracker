# Folunio — propostas de identidade

Estudo de 11/09/2026, a partir de [rebrand-folunio.md](../../../05.%20Divulgacao/rebrand-folunio.md), do logo atual e do pedido para preservar os dois checks, substituir os kanji e trocar o K da extensão. **As três direções são propostas; nenhuma foi aplicada ao produto.**

Abra [index.html](index.html) no Chrome. Funciona offline, sem servidor e sem fontes externas. Troque a direção, o tema e o peso; compare cabeçalho, popup, ícones em escala real, monocromia e divulgação. Os botões exportam a seleção atual. O ZIP contém os três kits no peso-base 12.

## Direções

| Direção | Assinatura | Ícone | Consideração |
|---|---|---|---|
| A — Página & estrela | Checks + nome arredondado + página com estrela | F com dobra de página | Recomendada por continuidade e relação direta com Folha + Universo |
| B — Órbita | Checks + órbita no último o + estrela | F com órbita | Mais cósmica; detalhes exigem redução nos tamanhos pequenos |
| C — Fólio | Checks + nome com terminações retas + livro aberto | F reto com dobra | Mais editorial; a frase de apresentação explica “universo” |

As três preservam a geometria do double-check atual. O nome foi desenhado em SVG com curvas e traços, sem texto dependente de fonte. A assinatura completa usa viewBox 625 × 120; a compacta, 545 × 120. A versão compacta omite o detalhe à direita e a órbita do último o. As letras mantêm a legibilidade em qualquer sistema operacional.

O “F” do ícone deriva da construção geométrica do nome, mas usa uma forma maiúscula simplificada para caber na barra do navegador. Na variante A, o canto dobrado evoca uma página; a estrela fica reservada à assinatura maior. Em 16 e 32 px, as três propostas compartilham o F simplificado, variando as terminações na C. Cor fixa: índigo `#12141f` e âmbar `#f0a842`, com detalhe claro `#e8e4f0` nos tamanhos grandes. Evita que o ícone dependa do tema escolhido no site.

## Arquivos de cada direção

Em `assets/pagina/`, `assets/orbita/` e `assets/folio/`:

- `logo-{sumi,noturno,matcha}.svg`: assinatura completa em cada tema.
- `logo-compacto-{sumi,noturno,matcha}.svg`: cabeçalho e popup.
- `logo-{preto,branco}.svg`: monocromia.
- `logo-noturno.png`: 2500 × 480, fundo transparente, letras claras.
- `icon-{16,32,48,128,192,512}.{svg,png}`: extensão, favicon e base visual para futuro PWA.
- `favicon.ico`: contêiner com PNGs de 16, 32 e 48 px.
- `avatar-1024.png`: avatar quadrado de 1024 px.
- `social-1200x630.{svg,png}`: cartão com a frase de apresentação.
- `manifest.fragment.json`: apenas as propriedades de ícones a incorporar no manifesto existente.

O cartão social SVG usa Georgia e Segoe UI/Arial para o texto de apoio; o **logo** continua vetorial e independente de fonte. O PNG congela a aparência do cartão. Os ícones para PWA são bases de desenho: manifesto, instalação, Apple touch icon e variante maskable ainda precisam de integração e validação próprias.

Para a extensão: copiar os quatro PNGs de 16, 32, 48 e 128 px para `extension/icons/`. Mesclar `icons` e `action.default_icon` do fragmento no manifesto, **preservando `action.default_popup` e `action.default_title`**. Não substituir o manifesto inteiro pelo fragmento. O manifesto atual não declara ícones; o K observado é compatível com o fallback automático do Chrome, não foi encontrado como asset no repositório.

## Regras de uso propostas

- Manter ambos os checks; primeiro no acento e segundo na cor do nome.
- Usar assinatura compacta abaixo de 240 px de largura. Mínimo proposto: 144 px para a compacta; conferir no contexto real antes de adotar definitivamente.
- Reservar o F para superfícies quadradas; não encaixar a palavra inteira em um favicon.
- Preservar proporções e margens. Não substituir o kanji por outro kanji sem relação com o novo nome.
- Temas atuais permanecem: Sumi, Noturno e Matcha. A escolha do tema não redefine o símbolo da marca.
- Frase de introdução: **Um universo para suas leituras.** Origem construída: **Folha + Universo**. Pronúncia: **fo-LÚ-nio**.
- A recomendação A é julgamento de desenho, não resultado de pesquisa de marca ou aprovação do usuário.

## Implicações para o produto

O pedido desta sessão é preparar e comparar a nova identidade. A migração de código deve usar a direção escolhida e ser validada como uma etapa própria:

1. Atualizar logo, cabeçalho, rodapé, metadata, favicon, popup e comunicação; revisar ícones e documentação do futuro PWA.
2. Revisar todas as ocorrências de Kidoku/既読, inclusive identificadores, mensagens, User-Agent e allowlist do lint. A medição de 29 arquivos pertence à nota de 10/09; não tratá-la como inventário imutável.
3. Renomear `nota-kidoku.tsx` junto dos imports. Atualizar os cinco idiomas do site e os cinco da extensão; renomear o global `KIDOKU` junto de seus consumidores.
4. Coordenar `kidoku_sessao` no servidor e na extensão. Troca direta desloga; migração compatível exige leitura transitória do cookie antigo. Definir a estratégia antes de aplicar.
5. Migrar `kidoku-tema` tanto no seletor quanto no script anti-flash. Recuperar o valor antigo antes do primeiro paint preserva a preferência existente.
6. Atualizar README, notas de identidade e plano de redes sociais, preservando decisões históricas e registrando qual nota as substitui.
7. Rodar lint, testes e build após a integração. Validar visualmente temas sem flash, cinco idiomas, login/logout, extensão encontrando sessão e ícones em contexto.

A nota de rebrand registra conflito de categoria com outro Kidoku encontrado em 10/09, corrigindo a antiga premissa das notas de identidade. As verificações de domínio, handle e INPI também pertencem a 10/09; **não houve nova verificação nesta entrega**. Não interpretar os registros como disponibilidade atual. Nenhuma conta, domínio ou publicação foi criada. O nome técnico do repositório pode continuar `mymangatracker`, conforme a decisão anterior.

## Reprodução

Da raiz do repositório, executar:

```powershell
node "Obsidian/02. Implementacoes/identidade-visual/folunio/gerar-kit.mjs"
```

O gerador reutiliza o motor SVG embutido no HTML e a dependência local `sharp` do Next.js. Não instala pacotes nem faz chamadas de rede. Gera também [comparacao.png](comparacao.png). Para reconstruir o ZIP, compactar `assets`, `index.html`, `README.md`, `gerar-kit.mjs` e `comparacao.png` como `folunio-kit.zip` nesta pasta. A geração do ZIP é separada e não deve incluir o próprio ZIP.

Método: desenho vetorial em código, adequado à continuidade do logo SVG existente. Sem geração raster por IA; PNGs são rasterizações dos mesmos vetores.

## Conferência desta entrega

Conferido no Chromium em 11/09: nove combinações de direção/tema, SVGs sem erro de XML, página sem transbordamento horizontal em 1360 px e 390 px, controle de peso, downloads reais de SVG e PNG e ausência de exceções JavaScript. Prévias de desktop, celular e aplicações inspecionadas visualmente. Dimensões dos 18 ícones PNG verificadas na geração. A integração no site e na extensão permanece pendente; não houve execução de lint/testes/build do produto por se tratar de um estudo isolado.
