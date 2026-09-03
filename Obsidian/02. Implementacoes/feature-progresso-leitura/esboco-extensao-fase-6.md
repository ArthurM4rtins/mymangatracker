# Esboço — extensão de navegador (Fase 6)

Conversa de 01/09/2026. NÃO é a tarefa atual — a Fase 2 (esta pasta) constrói a
API que a extensão vai consumir. Guardado aqui até a Fase 6 ganhar branch própria.

## O que o usuário quer

Popup da extensão com:

- lista das obras da estante, com filtro por nome;
- último capítulo lido de cada obra;
- clique → abre o site da fonte direto no capítulo certo.

## Viabilidade (Chrome, Manifest V3)

Tudo acima é possível e barato: o popup é uma mini-página web comum que chama a
MESMA API do app.

| Necessidade | Como | Limite |
|---|---|---|
| Listar estante + progresso | `fetch` em `/api/v1/estante` | declarar o domínio do app em `host_permissions` |
| Login | cookie httpOnly da sessão vai junto no fetch se o usuário está logado no site | nada a fazer; sem token novo |
| Abrir capítulo | `chrome.tabs.create({ url })` | — |
| Filtro por nome | JS local no popup | — |
| Registrar abertura | `POST /api/v1/progresso` (rota da Fase 2) | — |

## Limites reais (parte automática, além do popup)

- Detectar sozinho o capítulo aberto num site de scan = content script em site
  de terceiro → `host_permissions` amplas (`<all_urls>` ou lista). A revisão da
  Chrome Web Store escrutina permissão ampla e o usuário vê aviso agressivo.
- Service worker MV3 dorme: detecção por evento (navegação/content script),
  nunca processo permanente. Suficiente para o nosso caso.
- Publicação: conta de dev (taxa única ~US$5), revisão leva dias.

## Comportamento decidido (01/09, conversa 2)

Para fonte sem template (MangaFire e afins), o modelo definitivo é a extensão:

- Usuário clica na extensão **estando na página do capítulo** → ela registra o
  capítulo que ele está lendo (número extraído da página/URL real).
- O botão de abrir passa a usar a **última URL registrada** — abre exatamente
  onde a pessoa parou, sem o app adivinhar link de capítulo.
- Até lá, no app: fonte de página é link direto "Abrir a obra" (sem fingir
  registro) e o capítulo é editado à mão na entrada da estante
  (`PATCH /api/v1/estante/:id { capitulo }` — já existe).
- `ReadingProgress.resolvedUrl` já guarda URL por abertura — a extensão vai
  gravar a URL real do capítulo ali; nada de schema novo previsto.

## Decisão de arquitetura que a Fase 2 já garante

- Extensão = front alternativo. Nenhuma lógica própria: as rotas
  `/api/v1/estante` e `/api/v1/progresso` servem app e extensão igualmente.
- Registro de abertura é server-side — a extensão manda só o número do
  capítulo, nunca URL pronta.
