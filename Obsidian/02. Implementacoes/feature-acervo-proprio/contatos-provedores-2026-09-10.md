# Contato com os provedores de metadados — rascunhos prontos para envio

Data: 10/09/2026. Referência: [issue #238](https://github.com/ArthurM4rtins/mymangatracker/issues/238) e `analise-anilist-2026-09-09.md` desta pasta.

**Estado: nada foi enviado.** Nenhum provedor foi contatado, contratado ou autorizado. Estes são rascunhos para revisar e enviar manualmente.

Os textos estão em inglês — é a língua dos três destinatários. Assinam como **equipe de desenvolvimento do Kidoku**, sem nome de pessoa. Os três avisam que o produto **ainda não está público**: hoje roda na Vercel em ambiente não aberto ao público, sem link de produção acessível. Único trecho entre `[colchetes]` é o e-mail de resposta.

## Antes de mandar qualquer um

- [ ] Preencher o e-mail de resposta da equipe nos três textos.
- [ ] Conferir se a decisão continua sendo não passar link: como o produto não está público ([#210](https://github.com/ArthurM4rtins/mymangatracker/issues/210) — sem `SESSION_SECRET`, ninguém entra), os e-mails dizem isso na cara em vez de mandar um link quebrado. Quando abrir ao público, vale um follow-up com a URL.
- [ ] Decidir a ordem. A resposta do AniList é a que muda o desenho da Fase 2; MangaBaka e MyAnimeList são plano B. Mandar o do AniList primeiro é o caminho recomendado.
- [ ] Depois de enviar: comentar na #238 com data, destinatário e teor de cada contato.

## Onde cada um vai parar

| Provedor | Canal | Observação |
|---|---|---|
| AniList | `contact@anilist.co` | Único com e-mail público, indicado na documentação deles |
| MangaBaka | Formulário "Contact us" em [mangabaka.org](https://mangabaka.org) + servidor no Discord | **Sem e-mail público** — colar o texto no formulário |
| MyAnimeList | [Customer Support Form](https://myanimelist.net/about.php?go=support) | **Sem e-mail público**. O contrato da API exige autorização escrita (§3(a)(xiv)) |

---

## 1. AniList

**Canal:** `contact@anilist.co`

**Assunto:** `Licensing inquiry — storing AniList metadata in an independent reading tracker (Kidoku)`

**O que este e-mail resolve:** os seis pontos da seção "O que precisamos esclarecer com o AniList" da análise — produto, acervo, monetização, conteúdo/atribuição, operação e saída.

```text
Hello AniList team,

We are the development team behind Kidoku, a reading tracker for manga, manhwa,
manhua and novels. The project started as a university assignment and currently
uses the public AniList GraphQL API for catalogue search and work details, keying
every work by its AniList id.

One thing up front: Kidoku is not live yet. It is deployed on Vercel, but the
environment is not open to the public and there is no publicly reachable URL we
can point you to today. We are writing at this stage precisely because nothing is
launched and nothing has been imported — we would rather agree on what is
acceptable before building on it. We are glad to share a walkthrough, screenshots
or private access if that would help you evaluate the request.

We intend to continue Kidoku as an independent product beyond the academic scope.
There is no revenue today; the plan is advertising and, later, an optional paid
membership. Pricing and dates are not defined.

What we would like to do, and why
The AniList API was unavailable for several days in September 2026, and our
catalogue stopped working entirely while user data (shelves, ratings, reviews,
reading progress) kept working, because that data lives in our own database. To
survive outages like that, we would like to store AniList metadata locally and
use your API as a synchronisation source rather than a runtime dependency.

We have read the Terms of Use, including the commercial section and the
restrictions on bulk collection and competing services, and we do not read the
under-$150/month clause as permission to mirror the catalogue. That is exactly
what we would like your position on.

Questions we'd like confirmed in writing
1. Product: is our use acceptable — an independent tracker with its own accounts,
   ratings and community — and would you require any integration with AniList
   accounts?
2. Catalogue: may we import and persist metadata, for how long, and may we serve
   it while your API is unavailable? Is there an official export or an authorised
   synchronisation channel, or a scope we should limit ourselves to (for example
   only works our users actually open)?
3. Monetisation: what conditions apply to advertising and a future subscription,
   how is the relevant revenue calculated, and what is the cost and process of a
   commercial licence?
4. Content and attribution: which fields may we store and display, what credit do
   you require, and what are the conditions for cover images specifically? We
   assume you may not be able to license third-party rights over artwork.
5. Operation: what request rate and update frequency would you consider
   acceptable for a periodic sync, and is any availability commitment negotiable
   separately?
6. Exit: if an agreement ends, what should we do with stored metadata, and what
   transition period would you expect?

We plan permanent attribution to AniList with a visible source credit, links back
to the AniList page of each work, and the date of the last synchronisation.

We are happy to adjust scope, rate, or fields to whatever you consider
acceptable, and equally happy to hear that a mirror is not something you want to
authorise — we would rather know that now than build on it.

Thank you for your time,

The Kidoku development team
[e-mail de contato]
```

---

## 2. MangaBaka

**Canal:** formulário "Contact us" no site. Discord serve para conversa informal, mas o pedido de licença convém ir por escrito no formulário.

**Assunto:** `Data licence scope — which fields can MangaBaka license for commercial use?`

**O que este e-mail resolve:** a pergunta que decide se o MangaBaka é viável — a seção 4 da licença de dados deles diz que **não** detêm direito de redistribuir dados de terceiros. Sem saber quais campos são efetivamente licenciáveis, pagar a modalidade comercial não resolve nada.

**Contexto de preço (lido em 10/09/2026):** Community tier é pay-what-you-want até US$ 25 mil/mês de receita, sugestão de ~2% da receita bruta, com atribuição obrigatória. Partner tier acima disso, negociado caso a caso.

```text
Hello,

We are the development team behind Kidoku, a reading tracker for manga, manhwa,
manhua and novels. We are evaluating MangaBaka as the metadata source for our own
local catalogue, and your daily JSON/JSONL/SQLite database downloads are the
distribution format that fits us best by far.

For context: Kidoku is not live yet. It is deployed on Vercel, but the
environment is not open to the public and there is no publicly reachable URL at
the moment. Nothing has been imported and there is no revenue. We are asking
before building, not after.

Before going further we want to be clear about one thing, because it decides
whether this is viable for us: we read section 4 of your data licence as saying
MangaBaka does not hold redistribution or sublicensing rights over third-party
data in the aggregate database, and that permissions for that data must come from
the original sources.

Our questions
1. Field-level provenance: for the fields we actually need — titles and
   alternative titles, synopses, authors and artists, chapter/volume counts,
   content rating, external identifiers, and cover images — which of them can
   MangaBaka license to us commercially, and which remain subject to the
   originating provider's terms?
2. Is there a practical way to tell, per record or per field, which source a value
   came from, so we can keep only what is covered?
3. Is the portion you can license, on its own, usable as a standalone catalogue,
   or is it expected that a commercial user also holds agreements with the
   upstream providers?
4. Commercial tier: our current revenue is zero and the product is not launched.
   We plan advertising and a possible membership later. Under the Community tier
   (pay-what-you-want, ~2% of gross monthly revenue), how do you handle a project
   with no revenue yet, and what attribution do you require?
5. Update cadence: the documentation mentions source records refreshed on a 1-7
   day interval. Is there a changed-records feed, or is a full daily download the
   intended way to stay current?
6. If we later stop using MangaBaka, what are the conditions on data we already
   imported?

Happy to talk on Discord if that's easier.

Thanks,

The Kidoku development team
[e-mail de contato]
```

---

## 3. MyAnimeList

**Canal:** [Customer Support Form](https://myanimelist.net/about.php?go=support). O contrato aponta esse formulário nas seções 3(a)(xiv) e 19(b); não há e-mail publicado.

**Assunto:** `API Agreement — written authorization request for a commercial reading tracker`

**O que este e-mail resolve:** o contrato da API proíbe gerar receita através de uma Commercial Application "without the express authorization of the Company in writing". É pedido de autorização, não pergunta exploratória.

```text
Hello,

We are the development team behind Kidoku, an independent reading tracker for
manga, manhwa, manhua and novels. We are evaluating the official MyAnimeList API
as the metadata source for our catalogue, and we are writing to request the
written authorization required by the API Agreement before we build anything on
it.

For context: Kidoku is not live yet. It is deployed on Vercel, but the
environment is not open to the public and there is no publicly reachable URL at
the moment. There is no revenue and no data has been imported. We can provide a
walkthrough, screenshots or private access if you need to evaluate the product.

Section 3(a)(xiv) prohibits generating fees, profits or revenue through a
Commercial Application "without the express authorization of the Company in
writing". Kidoku has no revenue today, but the plan is advertising and, later, an
optional paid membership, so we assume we need that authorization rather than
hoping our current scale exempts us.

What we would like authorization for
1. Commercial operation: an independent tracker with its own accounts, ratings,
   reviews and reading progress, funded by advertising and a future optional
   membership. Overlap with MAL's own features is something we want you to weigh
   explicitly, not something we want to discover later.
2. Local storage of metadata: importing and persisting work metadata in our
   database and serving it to users, including while your API is unavailable,
   rather than querying per page view. What scope and retention would you accept?
3. Bulk access: is there an official export, a changed-records endpoint, or an
   acceptable request rate for a periodic full synchronisation? If bulk import is
   not authorised at all, we'd like to know that plainly.
4. Fields and attribution: which fields may we store and display — titles and
   alternative titles, synopses, authors, chapter/volume counts, content rating,
   identifiers — what credit do you require, and what are the conditions for cover
   images specifically?
5. Termination: what happens to metadata we have stored if the authorization
   ends, and what transition period would apply?

Please let us know if there is a better channel or a form for this kind of
request, or any additional information you need about the project.

Thank you,

The Kidoku development team
[e-mail de contato]
```

---

## Registro de envio

Preencher conforme for mandando, e replicar como comentário na #238.

| Provedor | Data de envio | Canal usado | Resposta recebida | Resultado |
|---|---|---|---|---|
| AniList | — | — | — | — |
| MangaBaka | — | — | — | — |
| MyAnimeList | — | — | — | — |
