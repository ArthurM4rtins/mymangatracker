# Revisão do de — o que olhar primeiro

Este arquivo existe porque **ninguém do time fala de**.

A tradução foi feita com revisão adversarial independente, mas isso não
substitui um falante nativo. O que ele substitui é a leitura das 346 strings:
os agentes marcaram, chave a chave, onde a tradução foi arriscada e por quê.
**Comece por aqui, não pelo catálogo inteiro.**

Corrigir é trocar um valor em `messages/de.json`. As chaves são as mesmas em
todos os idiomas, e `tests/i18n/` impede que a correção quebre os outros.


> **ATUALIZAÇÃO — duas pendências deste guia já foram RESOLVIDAS.**
>
> **1. O termo `obra`.** Quando este guia foi escrito, `obra` estava mantida em
> português em todos os idiomas, e várias entradas abaixo comentam isso. A decisão
> mudou: **cada idioma passou a usar a palavra dele.** O alemão passou a usar **`Werk`** (neutro, `das Werk` / `die Werke`), o que mudou artigo, negação, demonstrativo e pronome em 36 chaves.
> Ignore as observações abaixo que pedem para "manter obra" ou que a marcam como
> pendente.
>
> **2. `comum.formato.NOVEL`.** Agora é **`Novel`** em todos os idiomas, pelo mesmo
> motivo de manga/manhwa/manhua: é empréstimo do nicho, não palavra a traduzir.
> As entradas abaixo que discutem `Novela`/`Roman` estão superadas.
>
> O resto do guia continua válido.

| tipo | chaves |
|---|---|
| Falso amigo — o mais perigoso | 1 |
| Termo do produto | 18 |
| Expressão idiomática | 16 |
| Plural e gênero | 6 |
| Registro incerto | 16 |
| Cresceu de tamanho | 17 |
| Marcado pelo revisor | 85 |

## Falso amigo — o mais perigoso

Palavras que **estão certas** e que um revisor lusófono vai querer "corrigir" para o cognato do português. Se isso acontecer, o texto passa a dizer outra coisa e **continua parecendo certo**. Confirme antes de mexer.

### `estante.progresso.campo`

"Aktuelles Kapitel" usa aktuell no sentido correto (ATUAL, capitulo em que voce esta), nao "real/verdadeiro". Registro so para que um revisor vindo do portugues nao "corrija" para outra coisa. O pt e "Capitulo em leitura"; se quiser mais literal, "Kapitel, das du liest" — mas fica longo demais para label de campo.

## Termo do produto

Escolhas de vocabulário que valem para o idioma inteiro. Mudar uma aqui obriga mudar todas as outras ocorrências.

### `autor.obras.vazia`

Duas decisoes de produto colidem nesta unica frase: "Auf AniList sind keine Obras zu Manga oder Roman eingetragen." Primeiro, "Obras" e palavra portuguesa dentro de uma frase alema — para o leitor nativo parece erro de digitacao, nao termo de marca (a palavra alema seria "Werke"). Segundo, NOVEL virou "Roman", que em alemao significa romance literario e nao evoca o nicho; o publico de manga diz "Light Novel" ou so "Novel", e o ingles manteve "Novel". Se so uma das duas for revista, comece por esta chave: e a unica do grupo onde as duas aparecem juntas numa frase corrida.

### `autor.obras.titulo`

Titulo de secao na pagina do autor, exibido sozinho: "Obras". Sem frase em volta, o leitor alemao nao tem contexto para decodificar a palavra estrangeira — le como rotulo quebrado. Mantive por decisao do repo, com maiuscula de substantivo e genero feminino (die Obra / die Obras). Se a decisao for revista, "Werke" e a traducao direta e cabe no mesmo espaco.

### `cartao.formatoGenerico`

Badge de formato no cartao do catalogo, exibido lado a lado com Manga / Manhwa / Manhua / Roman. "Obra" sozinha, sem artigo e sem contexto, e onde a decisao de manter a palavra em portugues fica MAIS visivel: um leitor alemao le uma palavra que nao existe no idioma, cercada de termos que ele conhece. Se a decisao for rediscutida, este e o primeiro lugar a mudar; a alternativa alema seria "Werk" (curta, correta, e substantivo neutro: das Werk).

### `subtitulo`

"Such die Obra, leg sie ins Regal…" — aqui a Obra recebe artigo definido alemao no acusativo (die) e depois e retomada pelo pronome "sie", assumindo genero feminino conforme a decisao do dono do repo. Um nativo estranha a concordancia de uma palavra estrangeira. Mesma questao, em menor grau, em busca.rotulo ("Obra suchen"), onde ela aparece sem artigo e incomoda menos. Confirmar tambem se "zaehlt ab sofort mit" transmite "a leitura comeca a contar" — usei mitzaehlen (ser contabilizado junto), que e o idiomatico; o literal "beginnt zu zaehlen" soaria como se a leitura estivesse contando alguma coisa.

### `erros.obra_invalida`

Aplicacao da decisao de manter 'obra' em portugues. Um leitor alemao le 'ungueltige Obra' como erro de digitacao ou string nao traduzida, porque Obra nao e palavra do idioma e a flexao feminina (die Obra) e invencao nossa. Mesmo efeito em obra_nao_encontrada, obra_fora_do_catalogo e lista_ou_obra_nao_encontrada. Em alemao isso pesa MAIS que em ingles ou espanhol: espanhol tem a palavra, ingles nao flexiona adjetivo, mas o alemao obriga a escolher terminacao de genero em cada frase — cada ocorrencia carimba um genero inventado. Candidatos nativos se a decisao for revista: Werk (neutro, das Werk / die Werke) ou Titel. Marcado porque a decisao ja esta anotada como sujeita a rediscussao.

### `comum.formato.NOVEL`

Traduzi 'Novel' -> 'Roman' conforme instrucao. Risco real de significado: em alemao 'Roman' e romance literario impresso (Thomas Mann), nao a categoria de web novel asiatica que o produto cataloga. O nicho de fato diz 'Light Novel' ou so 'Novel', que e o que o ingles manteve. Um usuario alemao vendo a aba 'Roman' pode achar que o Kidoku cataloga literatura geral. Alternativa: manter 'Novel' ou usar 'Light Novel'. Vale para meta.descricao tambem, onde escrevi 'Manga, Manhwa und Roman'.

### `erros.corpo_invalido`

Traduzi o 'corpo' da requisicao como 'Body' (anglicismo corrente em contexto de API alemao). A alternativa purista e 'Anfragekoerper', que e correta mas soa a documentacao de norma e e quase o dobro do tamanho. Como e mensagem que o usuario final pode ver e nao so log de dev, um nativo deve decidir entre 'ungueltiger Body', 'ungueltiger Inhalt' e 'ungueltige Anfrage'. Mesma familia de duvida em erros.template_invalido, onde deixei 'Template' em vez de 'Vorlage'.

### `estante.descricao`

"Deine Obras, nach Status." — plural portugues (-s) de uma palavra estrangeira dentro de frase alema. Um nativo pode ler como erro de digitacao ou tentar declinar (Obren/Obraen). Se a decisao sobre manter "obra" for reaberta, esta chave e a mais exposta: "Werk/Werke" seria a palavra alema natural. Vale para vazia, obra e continuar.abrirObra tambem.

### `home.apresentacao.descricao`

Primeira frase que um visitante deslogado le. Dois pontos: (1) NOVEL virou "Roman" conforme o combinado, mas o nicho alemao de fato diz "Light Novel" e o ingles manteve "Novel" — "Manga, Manhwa und Roman" pode soar como literatura geral, fora do nicho; (2) "historico privado" virou "privater Leseverlauf" e nao "privater Verlauf", porque "Verlauf" sozinho em alemao le como historico de navegador. "Leseverlauf" e composta e mais longa, mas desambigua.

### `home.contagem.obras`

Marcando conforme combinado: renderiza como "5 Obras" / "1 Obra" no rodape do card de lista. Em alemao "Obra" nao existe, entao o leitor le uma palavra estrangeira com maiuscula no meio de uma contagem — e o ponto mais visivelmente artificial do grupo. Tratei como feminina (die Obra, die Obras) com plural portugues. Se a decisao for revista, os candidatos naturais sao "Werk/Werke" ou "Titel" (invariavel, e o que uma plataforma de leitura usaria).

### `home.resenha.spoiler`

"leia na pagina da obra" virou "lies sie auf der Seite der Obra" — genitivo alemao com substantivo estrangeiro, que soa pesado. A alternativa e a composta hifenizada "auf der Obra-Seite", que e como o alemao normalmente absorve palavra estrangeira, mas mistura os dois idiomas dentro de uma palavra so. Escolhi a primeira por ser menos hibrida. Mesmo tema em home.boasVindas.estanteVazia ("fuege die erste Obra hinzu"), que ficou mais natural.

### `listas.detalhe.autoria`

"von {username} · # Obra / # Obras". A decisao de manter "obra" em portugues bate de frente com o alemao aqui: o leitor nativo le "3 Obras" como palavra estrangeira sem genero obvio, e o plural em -s nao existe assim em alemao (o padrao seria Obren/Obraen ou invariavel). Se a decisao for rediscutida, este e o lugar mais visivel — aparece sob o titulo de toda lista. Alternativa nativa: "# Werk / # Werke".

### `listas.detalhe.vazia`

"Leere Liste — fuege Obras ueber den Listen-Button auf der Seite jeder Obra hinzu." Tres coisas para o nativo checar: (1) "Obras" acusativo plural e "jeder Obra" dativo feminino singular — tratei Obra como die-Wort conforme instruido, confirmar se soa aceitavel; (2) "Listen-Button" — escolhi Button (curto, corrente) em vez de "Schaltflaeche" (formal, longo); (3) a frase ficou bem mais longa que o portugues por causa do verbo separavel "hinzufuegen", cujo "hinzu" cai no fim — e texto de estado vazio, entao cabe, mas confirmar se nao quebra feio no mobile.

### `obra.contagem.aberturas`

Escolhi "Aufruf/Aufrufe" (linguagem de analytics: quantas vezes o capitulo foi aberto no site de leitura). O ingles e o espanhol foram por outro caminho e disseram "read/reads" e "lectura/lecturas", ou seja, reenquadraram como LEITURA. As duas leituras sao defensaveis e a tela conta o mesmo numero. Se o time preferir alinhar com en/es, a substituicao e "{n} Lektuere / {n} Lektueren". Decidir isto ANTES de traduzir os outros namespaces, porque a palavra pode reaparecer.

### `obra.similares`

"Aehnliche Obras" — aqui a decisao de manter "obra" em portugues fica mais visivel do que em qualquer outra chave do grupo. Um leitor alemao le "Obras" como palavra estrangeira nao declinada, com plural em -s que nao existe no padrao alemao. Funciona (o alemao aceita plural em -s em estrangeirismos: Autos, Sofas), mas soa como marca, nao como palavra. Se a decisao for revista, o natural seria "Aehnliche Titel" ou "Aehnliche Werke".

### `obra.indisponivel`

"diese Obra" — tratei obra como FEMININA conforme instruido, entao o demonstrativo e "diese". Um nativo pode achar que soa mais natural como neutro ("dieses Obra") justamente por ser palavra estrangeira sem genero obvio. Confirmar o genero AQUI e propagar: e a unica chave do grupo com artigo/demonstrativo colado em Obra, entao a decisao sai barata agora e cara depois.

### `numeros.seguindo`

"Gefolgt" vem do glossario, mas depois de um numero na linha de estatisticas — "12 Gefolgt" — soa estranho em alemao. As redes alemas dizem "Folge ich" (X) ou "Abonniert" (Instagram, YouTube). A MESMA palavra e reusada em social.seguindo, que e o texto do botao quando ja se segue (acoes-sociais.tsx:91) — ali "Gefolgt" passa melhor. Decidir as duas juntas: se trocar por "Folge ich", trocar nas duas.

### `avaliadas.vaziaPropria`

"obra" em portugues dentro de frase alema, com maiuscula e tratada como feminina: "Bewerte eine Obra und sie erscheint hier." Mesmo caso em avaliadas.vaziaComFiltro ("Keine Obra mit diesem Filter."), avaliadas.vaziaOutro e resenhas.vaziaPropria. Em alemao "Obra" nao e palavra do idioma e a maiuscula obrigatoria faz o leitor processar como nome proprio — o efeito e mais forte que em ingles ou frances, onde a minuscula sinaliza estrangeirismo. A decisao do dono do repo diz que sera rediscutida; este e o namespace onde ela mais aparece.

## Expressão idiomática

Frases em que a tradução literal perde o sentido ou o tom. É onde um nativo agrega mais.

### `componentes.estrelas.limpar`

Escolhi "entfernen" e nao o "löschen" do glossario. O glossario mapeia apagar -> löschen, mas aqui a acao e tirar a nota que o usuario deu, nao destruir dado — e "löschen" numa estrela sugere apagar algo maior. "entfernen" tambem alinha com "Like entfernen" do glossario. Deixei minuscula para espelhar o "limpar" minusculo do pt-BR; se essa string aparecer sozinha num botao (e nao concatenada), o nativo deve subir para "Entfernen".

### `componentes.carrossel.anterior`

Rotulo de acessibilidade dos botoes do carrossel: usei "Zurück" / "Weiter" (par curto e idiomatico em alemao, mesmo padrao do pt "Anterior"/"Proximo"). O risco e que "Zurück" tambem e o termo de navegacao "voltar" no resto do produto, entao num leitor de tela pode soar como sair da pagina em vez de voltar um slide. Alternativa mais explicita, se o nativo achar ambiguo: "Vorheriges" / "Nächstes".

### `cadastrar.subtitulo`

'Regal, Fortschritt und Rezensionen — deine Lektüre gehört nur dir.' O pt 'a leitura fica só sua' e uma promessa de PRIVACIDADE (ninguem mais ve), e 'gehört nur dir' pode ser lido como posse/propriedade do conteudo. Conferir se transmite privacidade; alternativas: 'deine Lektüre bleibt ganz privat' ou 'deine Lektüre sieht niemand außer dir'. Tambem e a string mais longa do grupo: 66 caracteres contra 52 do portugues, embaixo do titulo da pagina de cadastro.

### `vazio.semResultado`

Escolhi "Keine Treffer fuer {termo}" (nenhum resultado/acerto) em vez do literal "Nichts gefunden fuer {termo}". Treffer e o termo padrao de busca em alemao e soa natural; o literal e gramatical mas tem ordem de palavras torta para um nativo. Decisao de naturalidade acima de literalidade — se o revisor preferir colar no portugues, "Nichts gefunden fuer <forte>{termo}</forte>." e a troca direta e mantem a tag intacta.

### `filtros.ordens.alta`

"Em alta" virou "Im Trend". Nao existe equivalente literal; as candidatas correntes sao "Im Trend" (o que usei, 8 caracteres, cabe no dropdown), "Angesagt" (mais jovem e coloquial, combina com publico leitor de manga) e o anglicismo "Trending" (que o ingles usa). Julgamento de registro que so nativo resolve. Confirmar tambem que "Beliebt" (ordens.popular) e "Gerade beliebt" (destaques) nao ficam repetitivos demais na mesma tela, ja que o portugues repete "Populares"/"Populares agora".

### `erros.ja_em_uso`

'schon vergeben' e o fragmento que aparece colado embaixo do campo, sem sujeito, exatamente como o pt 'ja esta em uso'. Funciona perfeito para nome de usuario. Precisa de confirmacao de que tambem soa natural para e-mail — 'vergeben' carrega ideia de algo atribuido a alguem, e para e-mail um nativo talvez prefira 'wird bereits verwendet'. Se a chave for reutilizada nos dois campos, a escolha tem que servir aos dois.

### `erros.url_de_capitulo_invalida`

Verbo separavel: 'fuege die vollstaendige URL von Kapitel 1 ein, mit https://'. O prefixo 'ein' fecha a oracao e o 'mit https://' fica pendurado depois dele, imitando a virgula do portugues. E gramaticalmente admissivel (Nachtrag) mas um nativo pode achar desleixado e preferir 'fuege die vollstaendige URL von Kapitel 1 mit https:// ein'. Escolhi manter o ritmo do portugues; confirmar se vale a pena.

### `erros.tipo_de_arquivo_invalido`

'lade ein JPEG-, PNG- oder WebP-Bild hoch' usa Durchkopplung — os hifens suspensos antes de 'Bild'. E a grafia correta e a forma compacta, mas e visualmente densa numa mensagem de erro curta e facil de alguem 'corrigir' errado depois removendo os hifens. Confirmar que passa. Tambem troquei o verbo: pt e es dizem 'envie/envia', eu escrevi 'lade hoch' (fazer upload), que descreve melhor a acao real da tela.

### `estante.lendoEm`

pt "lendo em {host}" e en "reading on {host}" usam gerundio, que o alemao nao tem. Traduzi para "liest du auf {host}" (verbo conjugado, du). Alternativas: "wird auf {host} gelesen" (passiva, mais longo e frio) ou so "auf {host}". Se essa string aparecer fora de um cartao com contexto de sujeito, "liest du" pode soar deslocado — precisa de olho na tela.

### `home.feed.resenhou`

PRIORIDADE 1. O componente monta a frase em tres pedacos soltos: <usuario> <esta string> <titulo da obra> (feed-da-comunidade.tsx:88-93). Em alemao o Perfekt normal ("hat rezensiert") jogaria o participio ANTES do objeto e a frase sairia agramatical ("Nutzer hat rezensiert Titel"). Escolhi Praeteritum — "rezensierte" — que aceita a ordem sujeito-verbo-objeto sem mexer no codigo. Mesma decisao em home.feed.criouLista ("erstellte die Liste"). Um nativo precisa dizer se prefere o Praeteritum (levemente literario num feed) ou a alternativa "hat rezensiert:" / "hat die Liste erstellt:" com dois-pontos, que soa mais coloquial mas adiciona pontuacao que os outros idiomas nao tem.

### `home.boasVindas.titulo`

"Boa leitura" nao tem equivalente literal usavel: "Gute Lektuere" existe mas soa livresco e frio. Usei "Viel Spass beim Lesen, {username}." — e a saudacao calorosa corrente, mas e bem mais longa que o pt e e o h1 da home logada, junto com o nome do usuario. Se ficar comprido demais no titulo, a alternativa curta e "Schoenes Lesen" (menos idiomatica) ou cortar para "Viel Spass beim Lesen." sem o nome — decisao de quem revisa, nao mexi.

### `listas.detalhe.ordenar.antes`

"{titulo} nach vorne verschieben" (e o par "nach hinten" em .depois). O alemao empurrou o argumento para o inicio da string, ao contrario do pt ("Mover {titulo} para antes"), porque o verbo vai para o fim — se {titulo} for um titulo longo de obra, o aria-label comeca com ele e so no fim diz o que o botao faz. Alternativa que preserva a ordem do pt: "Verschiebe {titulo} nach vorne" (imperativo du, coerente com o resto do arquivo). Nativo escolhe entre infinitivo de UI e imperativo aqui.

### `obra.apagar.confirmar`

Reescrevi a frase inteira para "Wenn du den Rezensionstext loeschst, loeschst du auch {itens}. Weiter?". Motivo tecnico: se {itens} virasse sujeito, o verbo teria que ser "wird" com 1 item e "werden" com varios, e nao ha argumento no contrato para escolher. Com "du" como sujeito o problema some. O custo e que "loeschst" aparece duas vezes na mesma frase — quero confirmacao de que isso soa aceitavel e nao pesado. Alternativa se incomodar: "Wenn du den Rezensionstext loeschst, verlierst du auch {itens}". Conferir tambem se "Weiter?" e o botao/pergunta certa de um dialogo de confirmacao ou se o padrao da casa e "Fortfahren?".

### `obra.painel.convite`

"um sie ins Regal zu stellen" — o "sie" nao tem antecedente DENTRO da string; ele depende de a pagina inteira ser sobre uma obra. O portugues escapa disso porque "adicionar a estante" nao pede objeto, mas "stellen" em alemao pede. Vale conferir na tela montada se o "sie" fica claro ou se e melhor explicitar "um die Obra ins Regal zu stellen". Mesma questao em painel.adicionar, que ainda repete o pronome duas vezes ("Stell sie… um sie zu bewerten").

### `estante.vazia`

PROBLEMA DE CODIGO, nao de traducao, e so aparece em alemao. minha-estante.tsx:77 faz c(`status.${aba}`).toLowerCase() antes de interpolar. Em alemao isso renderiza "Nichts unter „am lesen“." — "Lesen" e verbo substantivado e PRECISA de maiuscula; "am lesen" e erro de ortografia. Os outros quatro status (abgeschlossen, geplant, pausiert, abgebrochen) sao particpios e sobrevivem minusculos. Precisa de decisao no codigo (nao aplicar toLowerCase no locale de), fora do meu escopo.

### `listas.vaziaPropria`

O texto do <link> ficou eliptico: "Du hast noch keine Liste erstellt. Erstelle die erste" — "die erste" retoma "Liste" da frase anterior, e a elipse justifica a minuscula em "erste". E gramatical, mas soa clipado para link de acao. Alternativas: "Erstelle die erste Liste" (repete Liste, inequivoco) ou "Jetzt die erste erstellen" (infinitivo, registro mais neutro).

## Plural e gênero

Concordância que o português não tem, ou tem diferente.

### `erros.ordem_invalida`

Pior caso do 'obra': 'die Obras der Liste' usa o plural em -s do portugues dentro de sintaxe alema. Plural alemao em -s existe (Autos, Sofas) mas e minoritario e marcado como estrangeirismo, entao aqui ele grita. Se a decisao de manter 'obra' ficar de pe, um nativo precisa dizer se 'die Obras' passa ou se seria melhor 'die Obren'/'die Obra' invariavel — nenhuma das tres e obviamente certa.

### `estante.seletorStatus`

"Status der Obra" — genitivo feminino de palavra estrangeira sem genero definido em alemao. Assumi feminino (die Obra > der Obra), conforme a instrucao. Um nativo pode achar que soa como neutro ("des Obra") ou querer evitar o genitivo com "Status vom Obra". Mesma decisao em fonte.paginaComCandidatos, fonte.paginaSemCandidatos e fonte.salvarPagina ("die Seite der Obra").

### `estante.capitulos`

"{capitulo} Kapitel" — Kapitel tem plural IGUAL ao singular, entao 1 Kapitel e 5 Kapitel estao os dois certos e a string simples serve para toda contagem. Nao ha ICU plural aqui no pt-BR e nao introduzi nenhum. Registro para ninguem "consertar" para Kapiteln (forma so de dativo plural) nem achar que falta um ramo de plural.

### `obra.resenhas.verAnteriores`

Declinacao de adjetivo DENTRO dos ramos do plural, que e onde erro passa despercebido: ramo one = "{n} fruehEREN Kommentar" (acusativo masc. sg., declinacao forte depois de numeral sem artigo), ramo other = "{n} fruehERE Kommentare". A terminacao muda entre os ramos e nao ha teste que pegue isso. Conferir tambem a ordem invertida: virou "{plural} ansehen", com o verbo no fim, e nao "ansehen {plural}".

### `listas.obras`

"{valor} Obras" usa o plural PORTUGUES (-s) num texto alemao, onde nenhum substantivo forma plural assim. Fica visivel no card de cada lista (page.tsx:304), com numero ao lado. Se a decisao sobre "obra" for mantida, vale escolher explicitamente entre plural invariavel ("3 Obra") e plural portugues ("3 Obras"); escolhi Obras seguindo a instrucao (die Obra, die Obras), mas e a chave onde a mistura mais chama atencao.

### `numeros.curtidasDadas`

"1 vergebenes Like" / "5 vergebene Likes": exige que "das Like" seja neutro (e e, conforme Duden) e flexao forte do adjetivo depois de numeral sem artigo. Se o revisor achar o adjetivo pesado, a alternativa e "1 Like vergeben" / "5 Likes vergeben", que quebra o paralelo nominal com as outras estatisticas mas e mais curta.

## Registro incerto

O tradutor ficou em dúvida sobre o tom, ou entre variantes regionais.

### `componentes.tema.grupo`

"Tema do site" nao tem equivalente alemao de uma palavra so. Escolhi "Design der Website" (rotulo do grupo de radio, so leitor de tela — comprimento nao aperta). Alternativas que um nativo pode preferir: "Theme der Website" (corrente em contexto tecnico) ou "Farbschema der Website" (mais preciso, sao esquemas de cor). Decidir aqui decide junto componentes.tema.escolher, que ficou "Design {nome}" e e lido como "Design Sumi" / "Design Noturno" — soa a rotulo de categoria, nao a nome de tema; "Theme {nome}" leria melhor se a escolha mudar.

### `entrar.erros.geral`

Vale pelas 6 chaves de erro dos dois namespaces. O pt/en/es abrem erro em minuscula de proposito; em alemao 'Anmeldung' e 'Registrierung' sao substantivos e TEM que subir, entao 4 dos 6 erros comecam com maiuscula e so os 2 de conexao ('keine Verbindung…') comecam minusculo. Pergunta pro nativo: esse conjunto misto incomoda na tela? Se incomodar, a saida e reescrever geral/falhaInterna comecando por verbo ou adverbio (ex. 'konnte nicht angemeldet werden'), que soa mais burocratico. Nao inverter: minusculizar 'Anmeldung' seria erro de ortografia, nao escolha de estilo.

### `entrar.contaCriada`

'Konto erstellt. Melde dich jetzt an.' O pt 'Agora é entrar.' e eliptico e calmo; o imperativo alemao com 'jetzt' pode soar como chamada de marketing ('cadastre-se ja!'), o que seria estranho num aviso que aparece DEPOIS da conta ja existir. Alternativa mais neutra: 'Konto erstellt. Jetzt anmelden.' (infinitivo, mais curto), mas ai perde o tom du que o resto do arquivo mantem. Decisao de tom, precisa de ouvido nativo.

### `entrar.subtitulo`

'Zurück zum Lesen.' Escolhi 'Lesen' e nao 'Lektüre' aqui porque 'Lektüre' soa levemente livresco/culto, e o publico e leitor jovem de manga. Mas isso deixa o arquivo com os dois termos do glossario em uso: 'Lesen' aqui e 'Lektüre' no subtitulo do cadastro. Se o nativo achar que precisa de um so, 'Zurück zur Lektüre.' unifica — so confirmar que nao fica pomposo na tela de login.

### `filtros.limpar`

No portugues e um link em minuscula proposital ("limpar filtros"). Em alemao o substantivo vem primeiro e a maiuscula e ORTOGRAFIA, nao estilo: "Filter zuruecksetzen" tem de comecar com F maiusculo e nao ha como reproduzir o efeito visual de link minusculo. Alem disso ficou mais longo (19 vs 14). Se o link precisar encurtar, "Filter loeschen" (15) tambem funciona, mas loeschen e o verbo do glossario para "apagar" e pode confundir com apagar dados.

### `erros.url_invalida`

'ungueltige Lese-URL' e composto ad hoc que inventei para 'URL de leitura'. E formavel e curto, mas nao e termo estabelecido; o glossario so fixa 'Lesequelle' para fonte de leitura. Um nativo deve dizer se 'Lese-URL' passa ou se e melhor 'ungueltige URL zum Lesen'. Baixo impacto isolado, mas se a mesma composicao aparecer em outros grupos convem padronizar agora.

### `estante.progresso.salvar`

Rotulos de botao inline em minuscula: "speichern", "abbrechen" (progresso.cancelar) e "öffnen" (continuar.abrir). Ortograficamente correto (verbo e minusculo) e fiel a escolha do pt-BR, que tambem usa minuscula nesses botoes pequenos. Mas UI alema quase sempre capitaliza rotulo de botao (Speichern / Abbrechen / Öffnen), entao um nativo tende a marcar como erro. Decidir de uma vez e aplicar igual no arquivo todo.

### `estante.erros.acao`

"hat nicht geklappt — versuche es noch einmal" comeca com verbo sem sujeito, imitando a elipse do pt "nao deu". E coloquial legitimo em alemao falado, mas escrito pode parecer string truncada. Mesmo padrao em erros.rede. Em erros.salvar/remover/derivar resolvi com infinitivo substantivado ("Speichern hat nicht geklappt"), que sobe a inicial e diverge do pt, que e minusculo. Conferir se o conjunto fica coerente.

### `home.vitrine.resenhas.vazio`

Traduzi "vitrine" por "Vitrine", que e palavra alema de verdade — mas significa movel de vidro / mostruario, e usar para uma secao de site e emprestimo do portugues. Alternativas: "Schaufenster" (mais marketing, tambem estranho para secao de pagina) ou simplesmente reescrever o final como "die erste erscheint hier". Vale a mesma decisao para home.vitrine.listas.vazio — as duas strings sao gemeas e devem mudar juntas.

### `home.saude.resumo.ok`

As tres strings de resumo (ok/degraded/down) entram como {estado} no INICIO da frase de home.saude.aviso e tambem no rodape depois do ●. Deixei em minuscula ("alles laeuft") para acompanhar pt/en/es, mas em alemao isso vira uma frase comecando com minuscula — desvio ortografico visivel, diferente do caso do substantivo. Substantivo interno esta correto (Konfiguration, Abhaengigkeit). Se um nativo preferir, e so subir a primeira letra das tres: nao quebra nada, e a mesma string tambem cabe maiuscula depois do ● no rodape.

### `listas.indice.ordenar.curtidas`

"Meiste Likes" para "Mais curtidas". E um item de dropdown de ordenacao ao lado de "Neueste", entao priorizei curto. Gramaticalmente e forma clipada de UI (o correto pleno seria "Die meisten Likes" ou "Am beliebtesten"). Nativo decide se a forma clipada passa nesse contexto ou se prefere "Beliebteste" (mesmo tamanho, mais idiomatico, mas perde a referencia explicita a Like).

### `listas.indice.subtitulo`

"Sammlungen von Lesern — von den Klassikern bis zum Quatsch." Dois pontos: (1) "Quatsch" traduz "brincadeiras" com o tom leve e jovem que o pt tem, mas e coloquial — se o time quiser algo mais neutro, "Unsinn"; (2) "von" aparece duas vezes seguidas ("von Lesern — von den Klassikern"), o que pode soar repetitivo; alternativa sem a repeticao: "Sammlungen aus der Community — von den Klassikern bis zum Quatsch". Tambem usei masculino generico "Lesern", sem gendering — decisao de politica do produto, nao minha.

### `obra.erros.rede`

"hat gerade nicht geklappt — versuch es noch mal" comeca com verbo finito e sem sujeito, imitando a elipse do portugues ("nao deu agora"). Em alemao isso e fala coloquial, nao escrita — pode soar solto demais num toast, ou pode soar exatamente com a leveza que o produto quer. Alternativa mais assentada: "Klappt gerade nicht — versuch es noch mal" ou "Hat gerade nicht geklappt…" com maiuscula. Um nativo resolve em dois segundos; eu nao.

### `obra.modal.placeholder`

"sie ist oeffentlich fuer andere Leser" e traducao fiel do portugues, mas "oeffentlich fuer" nao e a colocacao mais corrente em alemao — o normal seria "fuer andere Leser sichtbar" (visivel) ou "andere Leser koennen sie lesen". Mantive "oeffentlich" porque o portugues faz questao da palavra publica. Confirmar qual soa melhor num placeholder de textarea.

### `obra.historico.maisRecentes`

"die {n} neuesten" — precisei acrescentar o artigo "die", porque "3 neueste" nao fecha em alemao (superlativo pede artigo). Deixei o "die" em minuscula para acompanhar o estilo do portugues e do espanhol, que tambem nao capitalizam. Se este rotulo aparece isolado como titulo de secao e nao como continuacao de outro texto, o correto seria "Die {n} neuesten". Depende de onde ele e renderizado — nao consegui verificar sem abrir o codigo, o que esta fora do meu escopo.

### `numeros.avaliadas`

A contagem virou substantivo ("12 Bewertungen") e o titulo da secao ficou particpio (avaliadas.titulo = "Bewertet", page.tsx:179, renderizado em CAIXA ALTA). Sao dois registros diferentes para a mesma coisa. Escolhi assim porque cada um le melhor no seu lugar, mas um nativo pode preferir uniformizar: ou "Bewertungen" nos dois, ou "Bewertet" nos dois. Decisao de uma linha, vale confirmar.

## Cresceu de tamanho

Não é erro de tradução: é risco de layout. Vale olhar na tela, em telas estreitas.

### `autor.bio.verMenos`

Botao de recolher a bio do autor: "Weniger anzeigen" tem 16 caracteres contra 9 de "Ver menos" (o par verMais foi de 8 para 13). Se o botao quebrar linha ou empurrar o layout da bio, a forma curta corrente e so "Weniger" / "Mehr", que o alemao aceita sem o verbo. Nao encurtei por conta propria porque perde o paralelo com o portugues.

### `entrar.acoes.enviando`

'Wird angemeldet…' tem o dobro do texto de 'Anmelden' (16 vs 8 caracteres), e e o MESMO botao trocando de estado — o botao vai esticar ou o texto vai truncar no meio do envio. Mesmo risco em cadastrar.acoes.enviando ('Wird erstellt…' contra 'Konto erstellen', esse encolhe). Escolhi a forma 'Wird …' porque e o padrao que o glossario fixou para salvando/carregando; se o botao nao aguentar, a alternativa curta e 'Anmeldung…'. Vale abrir a pagina de login e olhar o botao em estado de envio.

### `cadastrar.acoes.enviar`

'Konto erstellen' (15 caracteres) contra 'Criar conta' (11), e aparece em tres lugares: titulo da pagina, botao de envio e o link dentro de entrar.semConta. O glossario oferece 'Registrieren' (12, uma palavra so) como sinonimo — candidato natural para o BOTAO e para o link, mantendo 'Konto erstellen' no titulo e no meta.titulo. Nao apliquei por conta propria porque quebraria a repeticao literal que o portugues faz de proposito nos tres pontos.

### `botaoEstante.erro`

Texto de erro DENTRO do botao estreito da estante (o mesmo espaco de "+ Regal"). "hat nicht geklappt — versuch es noch mal" tem 39 caracteres contra 23 do portugues "nao deu — tente de novo": e o maior estouro do grupo. Mantive o registro coloquial e o travessao. Se nao couber, encurtar para "ging nicht — noch mal" (21, cabe) ou "klappt nicht — noch mal" (23). Nao encurtei por conta propria porque perde o imperativo que o portugues tem.

### `filtros.decada`

"Jahrzehnt" (9) contra "Decada" (6) e o rotulo mais longo da linha de filtros, que tem Typ / Genre / Jahrzehnt / Sortieren em sequencia. Nao ha forma curta corrente em alemao para decada — "Dekade" existe mas soa tecnico e nao economiza quase nada. Vale so conferir na tela se a linha de filtros ainda cabe; se estourar, a decisao e de layout, nao de traducao.

### `comum.status.COMPLETED e comum.status.DROPPED`

Sao ABAS numa linha so. A linha inteira passou de 37 para 47 caracteres (Lendo/Concluido/Planejado/Pausado/Largado -> Am Lesen/Abgeschlossen/Geplant/Pausiert/Abgebrochen), +27%. Nao encurtei por conta propria como instruido. Alternativa sugerida: Fertig (COMPLETED) e Abbruch (DROPPED), que derruba a linha para 36 caracteres, MENOS que o portugues. Problema adicional alem do tamanho: 'Abgeschlossen' e 'Abgebrochen' compartilham o prefixo 'Abge-' e tem comprimento parecido, entao num relance lateral de aba viram a mesma palavra — o par Fertig/Abbruch resolve os dois problemas de uma vez. Decisao de quem revisa.

### `comum.salvando`

'Wird gespeichert…' tem 17 caracteres contra 9 de 'Salvando…' — quase o dobro, e o par salvar/salvando trocam de lugar dentro do MESMO botao, entao o botao pula de 'Speichern' (9) para 'Wird gespeichert…' (17) durante o clique. E a forma do glossario e a correta em alemao, mas se o botao tiver largura fixa isso quebra. Se quebrar, a saida usual e 'Speichern…' ou so o spinner. Nao mexi porque veio do glossario.

### `estante.filtros.tudo`

Esta aba ("Alle") divide a MESMA linha com as cinco abas de status, que vivem em comum.status (outro grupo). Em alemao a linha fica Alle / Am Lesen / Abgeschlossen / Geplant / Pausiert / Abgebrochen — "Abgeschlossen" (13) e "Abgebrochen" (11) juntos sao bem mais largos que "Concluido"/"Largado", e as duas ainda comecam igual (Abge-), o que atrapalha o reconhecimento rapido. Nao encurtei por conta propria: se estourar, as candidatas curtas sao "Fertig" e "Abbruch". Precisa de teste visual na aba, nao de opiniao.

### `estante.fonte.usar`

"Diese Lesequelle verwenden" tem 26 caracteres contra 15 de "Usar esta fonte" — e botao. Mesmo caso em fonte.trocar ("Lesequelle wechseln", 19 vs 12) e fonte.configurar ("Lesequelle einrichten", 21 vs 18). Usei "Lesequelle" porque e o termo do glossario; dentro do painel de fonte o contexto ja deixa claro do que se trata, entao "Quelle verwenden" / "Quelle wechseln" caberia melhor. Decisao de quem revisa, nao minha.

### `home.boasVindas.semFonte`

A string mais longa do grupo e a que mais se afastou da estrutura do pt. Tres pontos a conferir: (a) a construcao "Gerade hat keine Obra, die du liest, eine Lesequelle" — foi o jeito que achei de dizer "nada em leitura com fonte configurada" sem verbo empilhado no fim; (b) coloquei o rotulo da aba entre aspas alemas — „Am Lesen“ — porque sem elas "markiere eine Obra als Am Lesen" fica ambiguo em alemao, mas pt/en/es nao usam aspas ali; (c) "der Button zum Weiterlesen" para "o botao de continuar". Corpo de texto na home logada, tem espaco, mas o volume de palavra composta cresceu.

### `listas.detalhe.curtida.descurtir`

"Like von der Liste entfernen" (28 chars) contra "descurtir a lista" (17). O alemao nao tem verbo simples para descurtir, e o glossario fixa "Like entfernen". E aria-label do botao de coracao, entao o comprimento nao ocupa pixel — mas confirmar que e mesmo aria-label e nao tooltip visivel, e conferir o par com "die Liste liken" (curtir), que ficou assimetrico em estrutura.

### `listas.indice.criar.enviando`

"Wird erstellt…" (14) contra "Criando…" (8), e o botao troca de "Erstellen" (9) para esse texto durante o envio — o botao vai alargar em pleno clique se a largura nao estiver fixa. Segui o padrao do glossario ("Wird gespeichert…"); a alternativa curta seria "Erstelle…", que quebra o padrao. Vale um olho no CSS do botao antes de decidir.

### `listas.campos.nome`

"Name der Liste" e "Beschreibung der Liste" (campos.descricao) — preferi o genitivo aos compostos "Listenname"/"Listenbeschreibung" para nao empilhar substantivo, mas o composto e mais curto e igualmente corrente em formulario alemao. Se o label do formulario for estreito, trocar pelos compostos e a saida obvia; decidir os dois juntos para manter o par simetrico.

### `obra.avaliacao.resenhar`

BOTAO. "Rezension schreiben…" tem 20 caracteres contra 10 de "Resenhar…" — dobrou. A chave irma editarResenha ("Rezension bearbeiten…", 21) fica ainda maior. Alemao nao tem verbo curto para isto: "Rezensieren…" (13) existe e caberia melhor, mas tem cheiro de critica literaria de jornal, o que destoa de um site de manga com publico jovem. Se os dois botoes quebrarem linha, a saida e "Rezension…" e "Bearbeiten…" — mas isso perde informacao e nao quis decidir sozinho.

### `obra.resenhas.verConversa`

LINK INLINE dentro do card de resenha, junto com "kommentieren" e "loeschen". "Gespraech ansehen" (16) contra "ver conversa" (12). Escolhi "Gespraech" em vez de "Unterhaltung" so por tamanho — "Unterhaltung ansehen" daria 20 e e o termo que o X/Twitter alemao usa para thread. Se couber, "Unterhaltung" e a palavra mais idiomatica para fio de comentarios; se nao couber, considerar "Kommentare" direto.

### `filtros.limpar`

"zuruecksetzen" (12 caracteres) contra "limpar" (6). E um link pequeno que divide a MESMA linha com dois selects, "Sortieren" e "Bewertung" (filtros-avaliadas.tsx:53-71), e a linha aparece no cabecalho da secao de avaliadas. Se estourar, "leeren" (6) cabe exatamente no espaco do portugues.

### `filtros.ordens.menor_nota`

"Niedrigste Bewertung" (20) contra "Menor nota" (10); o par "Hoechste Bewertung" tem 17. Sao <option> dentro do select de ordenacao, entao o texto define a largura do proprio select fechado. Se ficar largo demais, a alternativa curta e "Beste Note" / "Schlechteste Note" — mas isso contraria o glossario, que fixa nota = Bewertung. Nao encurtei por conta propria.

## Marcado pelo revisor

Apontado na revisão adversarial, sem categoria específica.

### `autor.obras.vazia`

Termo de produto, alem do problema de "zu" ja relatado. Duas decisoes do dono se acumulam nesta unica frase corrida e o tradutor marcou certo: "Obras" e palavra portuguesa dentro de frase alema (o alemao seria "Werke") e NOVEL virou "Roman", que em alemao e romance literario e nao evoca o nicho — o publico de manga diz "Light Novel" ou "Novel", e o en manteve "Novel". Confirmo as duas marcacoes: nao sao erro do tradutor, ele seguiu a instrucao. Registro so que a revisao do fr (messages/revisao/fr.md) levantou exatamente as mesmas duas nesta mesma chave, o que reforca que a decisao precisa ser tomada de uma vez para todos os idiomas em vez de rediscutida por idioma.

### `autor.obras.titulo`

Contexto que o tradutor nao tinha: o <h2> desta secao em src/app/(ui)/[locale]/autor/[staffId]/page.tsx tem a classe `uppercase`, entao a tela mostra "OBRAS" em caixa alta, nao "Obras". Consequencia pratica: a discussao de maiuscula de substantivo aqui e inocua (o CSS decide), o que sobra e so a escolha da palavra — o leitor alemao ve uma palavra estrangeira de cinco letras sozinha, sem frase em volta para decodificar. Se a decisao for revista, "Werke" cabe no mesmo espaco (e "WERKE" em caixa alta).

### `componentes.estrelas.semNota`

Irma do problema de componentes.estrelas.limpar, mas mais fraca — por isso nao entrou como erro. "keine Bewertung" tambem esta minuscula, e no codigo ela e o conteudo isolado de um <span> que substitui o NUMERO da nota quando nao ha nota. Como ela ocupa uma casa de valor (e nao de acao), a minuscula e defensavel; se o nativo subir "Entfernen", perguntar na mesma passada se ele sobe tambem para "Keine Bewertung", para os dois textos do mesmo widget nao ficarem com criterios diferentes.

### `componentes.estrelas.nota`

Bug pre-existente de codigo, NAO da traducao alema — registro porque o alemao e o idioma onde ele fica visivel. Em estrelas.tsx o valor e passado como string (`t("estrelas.nota", { nota: `${posicao - 0.5}` })`), entao o next-intl nao formata por locale e o leitor de tela ouve "0.5 von 5" com PONTO, enquanto o rotulo do grupo logo ao lado, componentes.estrelas.grupo, diz "von 0,5 bis 5" com VIRGULA. Em pt/es/fr o mesmo defeito existe, mas passa mais despercebido. Corrigir e mudar o componente (passar numero, nao string), nao o catalogo — nao mexer no de.json por causa disto.

### `componentes.tema.grupo`

Registro incerto, marcacao do tradutor que confirmo. "Design der Website" e correto e compreensivel, mas pesado; as alternativas correntes sao "Theme der Website" (contexto tecnico) e "Farbschema der Website" (mais preciso — sao esquemas de cor). Sem aperto de espaco: em seletor-tema.tsx a string e so aria-label de um role="group", nunca aparece na tela. Decidir aqui decide junto componentes.tema.escolher, que ficou "Design {nome}" e e lido como "Design Sumi"; se o nativo preferir, "Sumi-Design" (composto com hifen) e a forma mais alema que "Design Sumi".

### `componentes.carrossel.anterior`

Marcacao do tradutor, confirmada com uma ressalva a favor dele. "Zurueck"/"Weiter" sao aria-labels das setas do carrossel (funcao Seta em carrossel.tsx) e formam um par curto e idiomatico, mas "Zurueck" e tambem o termo de glossario para "voltar" no resto do produto — num leitor de tela pode soar como sair da pagina em vez de andar um slide. Alternativa explicita se o nativo achar ambiguo: "Vorheriges"/"Naechstes". Como o de.json ainda esta por traduzir, nao da para checar hoje se "Weiter" colide com um "continuar" de formulario; refazer essa checagem quando o catalogo inteiro estiver traduzido.

### `autor.bio.verMenos`

REBAIXO o risco que o tradutor levantou — nao ha ameaca de layout, e nao vale gastar tempo do nativo aqui. Em bio-do-autor.tsx o botao fica num `flex flex-col items-start`, sozinho na propria linha, abaixo do paragrafo da bio; "Weniger anzeigen" (16 chars contra 9 de "Ver menos") nao empurra nada nem quebra linha. Manter a forma completa, que preserva o paralelo com o portugues; nao encurtar para "Weniger"/"Mehr".

### `entrar.erros.geral / entrar.erros.falhaInterna / cadastrar.erros.geral / cadastrar.erros.falhaInterna / entrar.erros.conexao / cadastrar.erros.conexao`

Confirmado que o conjunto fica visualmente misto: 4 erros comecam com maiuscula (Anmeldung, Registrierung) e 2 com minuscula (keine Verbindung...). O raciocinio do tradutor esta certo e nao ha saida por baixo — minusculizar substantivo e erro de ortografia alema, nao estilo. Se o nativo achar que incomoda, a unica correcao possivel e reescrever geral/falhaInterna comecando por verbo/adverbio. Contexto extra que ele nao tinha: em messages/de.json o namespace `erros` (vocabulario compartilhado: credenciais_invalidas, email_invalido, etc.) ainda esta em portugues, e essas frases caem no MESMO <p role="alert"> destas seis (src/app/(ui)/[locale]/entrar/formulario.tsx:41-49). Ou seja: hoje a tela mostra alemao e portugues lado a lado, e o julgamento de "conjunto misto" so fecha depois que `erros` for traduzido.

### `entrar.erros.conexao / cadastrar.erros.conexao`

O travessao usado e U+2014 (Geviertstrich), igual ao pt/en/es. Isso segue a instrucao dada (mesmo caractere dos outros idiomas) e portanto NAO e defeito — mas e o unico ponto do arquivo que um nativo estranha de imediato: a convencao alema (Duden) para Gedankenstrich e o Halbgeviertstrich U+2013 com espacos, o U+2014 e convencao inglesa. Decisao de casa, nao de traducao: se o dono do repo quiser fidelidade tipografica por idioma, essas duas chaves (e cadastrar.subtitulo) sao as afetadas.

### `entrar.subtitulo / cadastrar.subtitulo`

Os dois termos do glossario para leitura convivem: 'Zurück zum Lesen.' no login e 'deine Lektüre' no cadastro. Ambos gramaticalmente corretos e ambos no glossario, mas sao a mesma ideia em duas telas irmas que o usuario ve em sequencia. Vale o nativo decidir se unifica ('Zurück zur Lektüre.') ou mantem o split de registro.

### `cadastrar.subtitulo`

'deine Lektüre gehört nur dir.' — conferi contra os irmaos: en 'your reading stays yours alone' e es 'tu lectura es solo tuya' tem exatamente a mesma ambiguidade posse/privacidade, entao o alemao nao se afastou do padrao ja aprovado; nao tratei como sentido mudado. Se o nativo quiser a promessa de privacidade explicita, a alteracao teria que valer para os quatro idiomas, nao so para o de. Sobre comprimento: 66 caracteres num <p> dentro de container max-w-sm (~336px uteis) — quebra em ~3 linhas contra ~2 do portugues, sem estouro, e o layout e flex-col que quebra livremente.

### `entrar.contaCriada`

'Konto erstellt. Melde dich jetzt an.' — gramatica e verbo separavel corretos, tom du consistente. Fica so a duvida de registro levantada pelo tradutor (imperativo com 'jetzt' soando a chamada de marketing num aviso pos-cadastro). Renderiza dentro de um <p role="status"> com borda em src/app/(ui)/[locale]/entrar/page.tsx:33, no lugar do subtitulo — cabe sem problema.

### `entrar.acoes.enviando / cadastrar.acoes.enviar`

Risco de comprimento levantado pelo tradutor NAO se confirma no codigo: o botao e block dentro de <form className="flex flex-col gap-4"> num <main> max-w-sm (src/app/(ui)/[locale]/entrar/formulario.tsx:92,122-127) — ocupa a largura toda da coluna, nao tem largura fixa e nao trunca. 'Wird angemeldet…' (16) contra 'Anmelden' (8) so muda o texto centralizado, sem esticar nada. 'Konto erstellen' (15) como h1 text-3xl cabe numa linha nos ~336px uteis. Conclusao: nao trocar para 'Anmeldung…' nem para 'Registrieren' por medo de layout; se trocar, que seja por gosto do nativo, e ai vale a observacao do tradutor de que o pt repete a mesma frase de proposito nos tres pontos (titulo, botao, link de entrar.semConta).

### `entrar.erros.geral`

Correcao factual ao racional entregue: no codigo, `erros.geral` NAO e o caso de credencial errada — credencial errada vem do namespace `erros` (credenciais_invalidas, 'e-mail ou senha incorretos'). `erros.geral` e o fallback para codigo que a tela nao reconhece (src/app/(ui)/[locale]/entrar/formulario.tsx:38-42 e o mesmo em cadastrar/formulario.tsx:41-46). 'Anmeldung fehlgeschlagen' funciona bem como fallback generico, entao a string nao muda — mas o nativo deve julga-la como 'erro desconhecido', nao como 'senha errada'.

### `erros.ja_em_uso`

CONFIRMADO NO CODIGO e mais forte do que o tradutor supos. src/server/repositories/usuario.repository.ts:159-160 lanca ErroCampoDuplicado("username") OU ErroCampoDuplicado("email"), e src/app/api/v1/usuarios/route.ts:79 devolve o mesmo codigo ja_em_uso nos dois casos, colado embaixo do campo que falhou (src/app/(ui)/[locale]/cadastrar/formulario.tsx). Entao "schon vergeben" TEM que servir para os dois. Para nome de usuario e a frase natural e idiomatica em alemao. Para e-mail, "vergeben" carrega a ideia de algo atribuido/reservado a alguem e um nativo tende a "wird bereits verwendet". Um nativo precisa escolher uma formulacao que sirva aos dois campos, ou o time precisa quebrar em duas chaves — decisao de produto, nao de traducao.

### `comum.status.COMPLETED e comum.status.DROPPED`

Fui no codigo: o risco de ESTOURO nao existe. Os rotulos aparecem em dois lugares e nenhum corta texto — a barra de abas em src/app/(ui)/[locale]/estante/page.tsx:87 e uma nav com "flex flex-wrap gap-2", que quebra para a segunda linha em vez de cortar, e seletor-status.tsx:85 e um <select> de largura livre. O pior caso alemao e a barra de filtros virar duas linhas em tela estreita. O que SOBRA e real e o outro ponto que ele levantou: "Abgeschlossen" e "Abgebrochen" compartilham o prefixo Abge- e tem comprimento parecido, e ficam na mesma linha (a ordem das abas e tudo/READING/COMPLETED/PLANNED/PAUSED/DROPPED, entao separadas por duas abas apenas). Isso e legibilidade, nao layout. Fertig/Abbruch resolve mas sai do glossario. Decisao de quem revisa — nao mexi.

### `comum.salvando`

Tambem superestimado. Os tres botoes que trocam salvar->salvando sao auto-width, sem largura fixa: avaliar.tsx:191 e avaliacao-da-obra.tsx:339 ("px-3 py-1") e botao-estante.tsx:76 ("px-3 py-1.5"). "Wird gespeichert…" (17) nao corta e nao quebra layout; o botao so muda de largura durante o clique, saindo de "Speichern" (9). Vale registrar um caso a mais que ele nao viu: em botao-estante.tsx a mesma chave substitui `catalogo.botaoEstante.adicionar`, nao `comum.salvar`, entao o tamanho do salto ali depende de uma chave que esta FORA deste grupo e ainda vai ser traduzida — quem fizer aquele namespace precisa olhar os dois juntos. Se algum dia incomodar, "Speichern…" resolve sem sair do glossario.

### `erros.obra_invalida (e obra_nao_encontrada, obra_fora_do_catalogo, lista_ou_obra_nao_encontrada, ordem_invalida)`

Concordo integralmente com a leitura do tradutor e reforco: o alemao e o pior idioma dos quatro para a decisao de manter "obra" em portugues. O espanhol tem a palavra; o ingles nao flexiona adjetivo ("invalid obra" passa despercebido); o francES flexiona pouco. O alemao obriga a escolher terminacao de genero em CADA frase, entao "ungueltige Obra" carimba um genero feminino inventado toda vez, e a maiuscula obrigatoria faz "Obra" parecer nome proprio ou string nao traduzida. Pior caso e ordem_invalida: "die Obras der Liste" enfia plural portugues em -s dentro de sintaxe alema; o plural em -s existe em alemao (Autos, Sofas) mas e minoritario e marcado como estrangeirismo. Um nativo precisa dizer se "die Obras" passa. Se a decisao for rediscutida, os candidatos nativos sao Werk (das Werk / die Werke) ou Titel (der Titel / die Titel, plural igual ao singular — encaixa bem em UI). 5 chaves afetadas.

### `comum.formato.NOVEL e meta.descricao`

Concordo com o risco e ele se conecta ao problema de plural que apontei. "Roman" em alemao e romance literario impresso (Thomas Mann), nao a categoria de web/light novel asiatica que o Kidoku cataloga; o nicho alemao diz "Light Novel" ou so "Novel", e o ingles do proprio repo manteve "Novel". O rotulo aparece como filtro de formato e na descricao da pagina, entao um usuario alemao pode achar que o produto cataloga literatura geral. Nota util: se a decisao virar "Light Novel", meta.descricao muda para "Manga, Manhwa und Light Novels", que ja nasce plural e faz o problema gramatical que apontei desaparecer junto. O francES tambem usou "roman", entao se mudar aqui vale reabrir la.

### `erros.corpo_invalido e erros.template_invalido`

"ungueltiger Body" e "ungueltiges Template" mantem anglicismos. Defendo a escolha melhor do que o proprio tradutor: o PORTUGUES ORIGINAL tambem usa "template" (anglicismo em pt), entao "Template" espelha o registro da fonte, e "Body" e o termo corrente em contexto de API em alemao. As alternativas puristas (Anfragekoerper, Vorlage) sao corretas mas mudam o registro para documentacao de norma. So confirmar com nativo se essas mensagens chegam mesmo ao usuario final ou so a dev — corpo_invalido e resposta 400 de API, entao provavelmente e o caso raro.

### `erros.url_de_capitulo_invalida`

O tradutor marcou como duvida, e minha avaliacao e que NAO e erro: "fuege die vollstaendige URL von Kapitel 1 ein, mit https://" e Ausklammerung com sintagma preposicional, que e construcao licita e comum em alemao (o PP com "mit" sai da moldura verbal e vem depois do prefixo, com virgula, como Nachtrag). Deixo em risco e nao em problema por isso. Dito isso, e exatamente o tipo de linha que um revisor nativo reordena por reflexo para a ordem canonica "fuege die vollstaendige URL von Kapitel 1 mit https:// ein". Se alguem reordenar, e melhoria de estilo, nao correcao de erro — nao deixe passar como se o entregue estivesse errado.

### `erros.url_invalida`

"ungueltige Lese-URL" e composto ad hoc, como o proprio tradutor admite. E formavel, curto e o genero esta certo (die URL), mas nao e termo estabelecido e o glossario so fixa "Lesequelle". Como URL de leitura provavelmente reaparece em outros namespaces (obra, estante), vale um nativo bater o martelo AGORA entre "Lese-URL" e "URL zum Lesen", antes que o proximo lote invente uma terceira forma.

### `erros.tipo_de_arquivo_invalido`

Dois pontos, ambos defensaveis. (1) A Durchkopplung "ein JPEG-, PNG- oder WebP-Bild" esta ORTOGRAFICAMENTE CORRETA — os hifens suspensos sao obrigatorios nessa construcao. O risco real nao e a grafia, e alguem no time achar que sao erro de digitacao e "corrigir" removendo os hifens depois; vale um comentario ou uma linha no guia de revisao alemao. (2) O verbo mudou de enviar (pt/es/en "envie/envia/send") para "hochladen" (fazer upload). Descreve melhor a acao da tela, mas e desvio deliberado dos outros tres idiomas — confirmar que a tela realmente faz upload de arquivo e nao aceita URL.

### `erros.avaliacao_invalida`

Alem da virgula que reportei como problema: o tradutor cortou o segundo termo do pt ("nota"), porque avaliacao e nota caem ambos em Bewertung/Note e "Bewertung … Note" ficaria redundante. Concordo com o corte e o sentido se preserva, mas registro para que ninguem "reponha" a palavra achando que faltou traduzir. "in halben Sternen" (dativo plural) esta correto; um nativo talvez prefira "in 0,5er-Schritten", mais tecnico e menos pitoresco.

### `travessao U+2014 (corpo_invalido, avaliacao_invalida, template_invalido, limite_excedido, catalogo_indisponivel)`

Ponto que so um nativo levanta e que o time nunca veria. A tipografia alema padrao (Duden) usa Halbgeviertstrich (en dash, U+2013) como Gedankenstrich; o Geviertstrich (em dash, U+2014) e convencao anglo-americana. O arquivo usa U+2014 nas 5 chaves, que e exatamente o que o briefing mandou ("travessao — como nos outros idiomas") e o que pt/en/es/fr ja fazem. Ou seja: seguir a instrucao foi o certo, e nao e problema do tradutor. Mas o primeiro nativo que olhar vai apontar. A decisao e do catalogo inteiro, nao do alemao sozinho — ou todos migram para U+2013 no de, ou se assume a inconsistencia com a norma alema em nome da consistencia entre idiomas.

### `erros.limite_excedido, erros.template_invalido e erros.catalogo_indisponivel`

O pt diz "de novo" duas vezes e "refaca" uma; o alemao usa TRES formas diferentes para a mesma ideia: "erneut" (limite_excedido), "neu" (template_invalido: "leite es neu ab") e "noch einmal" (catalogo_indisponivel). Cada uma isolada esta correta e a variacao ate soa mais natural que a repeticao, mas microcopy de erro costuma ganhar em ser previsivel. Baixa prioridade; so vale decidir agora se o resto do catalogo alemao vai padronizar em "erneut", porque sao ~350 chaves ainda por traduzir.

### `botaoEstante.erro`

CORRECAO DO RELATO DO TRADUTOR, antes de qualquer decisao de encurtar: ele diz que o texto fica "DENTRO do botao estreito da estante (o mesmo espaco de +Regal)". Falso. Em src/app/(ui)/[locale]/catalogo/botao-estante.tsx:72-86 o erro e um <span role="alert" class="text-xs text-texto-suave"> IRMAO do botao, dentro de um <div class="flex items-center gap-2">; o botao continua mostrando "+ Regal". Ou seja: os 40 caracteres (vs 23 do pt) disputam a largura do card do catalogo, nao a do botao. Ainda vale um olhar na tela, mas as alternativas que ele sugere ("ging nicht", "klappt nicht") foram propostas para resolver um problema que nao e o que existe. Nao encurtar por causa daquele diagnostico.

### `subtitulo`

Dois pontos para o nativo, alem do leg/stell ja relatado. (1) Registro: "Such" e "leg" sao imperativos du sem -e; a forma curta e coloquial e correta, mas "Such!" sozinho e tambem o comando classico que se da a cachorro, entao vale o nativo confirmar que na abertura da tela nao soa estranho - a alternativa neutra e "Suche die Obra, stell sie ins Regal". (2) A Obra aqui recebe artigo alemao no acusativo ("die Obra") e depois e retomada por "sie", assumindo genero feminino; e o lugar do grupo onde a decisao de manter a palavra em portugues fica mais exposta a concordancia. O tradutor ja levantou; concordo, e o mesmo padrao (die/der Obra, Deine Obras) esta consistente com estante.json e base.json, entao mudar a decisao e mudanca de glossario, nao de string.

### `cartao.formatoGenerico`

"Obra" sozinha no badge de formato (page.tsx:127-131), lado a lado com Manga / Manhwa / Manhua / Roman, que o leitor alemao reconhece. Uma palavra estrangeira isolada, sem artigo e sem frase em volta - e o pior caso da decisao do dono no idioma alemao, pior que no espanhol porque em alemao "obra" nao existe nem lembra nada. Se a decisao for rediscutida, o substituto e "Werk" (das Werk, neutro, 4 letras) e a concordancia feminina teria de ser refeita em todos os namespaces.

### `filtros.limpar`

"Filter zuruecksetzen" (19 vs 14 do pt). Duas coisas: o pt/en/es/fr usam minuscula proposital para o link discreto (filtros-catalogo.tsx:88-94, text-xs underline), e em alemao o F maiusculo de Filter e ORTOGRAFIA obrigatoria - o efeito visual de link minusculo se perde e nao ha como reproduzir. Isso e inevitavel, nao e erro. O que vale confirmar com nativo e a escolha do verbo: "zuruecksetzen" (resetar) descreve bem o que o botao faz (limpa os filtros e preserva o ?q=), e e o termo padrao de UI alema; "Filter loeschen" seria mais curto mas colide com loeschen = apagar dados do glossario.

'zuruecksetzen' (12) contra 'limpar' (6), no mesmo flex-wrap que os dois selects 'Sortieren' e 'Bewertung' (filtros-avaliadas.tsx:53-71). Semanticamente 'zuruecksetzen' esta correto (o handler faz replace(caminho), ou seja, reset). Se estourar a linha, 'leeren' (6) cabe no espaco do portugues.

### `vazio.semTermo`

O pt usa o mesmo verbo ("nao respondeu") em erros.indisponivel e em vazio.semTermo; o alemao usou verbos diferentes - "hat gerade nicht geantwortet" para o AniList e "hat gerade nichts geliefert" para o catalogo. Nao e erro ("Ergebnisse liefern" e colocacao corrente em alemao e ate soa melhor que o literal), e as duas mensagens nunca aparecem juntas - sao estados exclusivos do mesmo <p> em page.tsx:60-76. So confirmar que o nativo prefere "geliefert" mesmo, ja que home.json:44 usou "geantwortet" para o catalogo.

### `filtros.ordens.alta`

"Im Trend" para "Em alta" - julgamento de registro que so nativo fecha, entre "Im Trend", "Angesagt" (mais jovem, combina com publico de manga) e o anglicismo "Trending" (o que o en usa). Confirmar junto a repeticao vizinha: destaques = "Gerade beliebt" e renderizado com CSS uppercase + tracking-wide (page.tsx:81-84), entao aparece como "GERADE BELIEBT" logo acima do dropdown de ordem, que tem "Beliebt" como primeira opcao. O pt tem a mesma repeticao (Populares agora / Populares), mas em alemao as duas ficam mais parecidas ainda.

### `filtros.decada`

"Jahrzehnt" (9) e o rotulo mais longo da linha Typ / Genre / Jahrzehnt / Sortieren (26 caracteres somados, vs 23 do pt). Risco menor do que parece: o container e flex flex-wrap (filtros-catalogo.tsx:86), entao a linha quebra em vez de estourar. Nao ha forma curta corrente em alemao ("Dekade" soa tecnico e economiza 3 letras). Se incomodar visualmente, e decisao de layout, nao de traducao.

### `estante.filtros.tudo`

Confirmo o risco do tradutor. "Alle" divide a linha das abas com comum.status: Alle / Am Lesen / Abgeschlossen / Geplant / Pausiert / Abgebrochen. Alem da largura, "Abgeschlossen" e "Abgebrochen" comecam iguais (Abge-) e sao a aba de CONCLUIDO e a de LARGADO — significados opostos com prefixo identico, o que e pior que estouro: o usuario clica na errada. Precisa de teste visual na tela em 360px antes de decidir entre manter e trocar por Fertig/Abbruch. Nao e chave deste arquivo, mas quebra a tela deste arquivo.

### `estante.fonte.usar`

Botao: "Diese Lesequelle verwenden" (26) contra "Usar esta fonte" (15). Mesmo caso em fonte.trocar ("Lesequelle wechseln", 19 vs 12) e fonte.configurar ("Lesequelle einrichten", 21 vs 18). Concordo com a leitura do tradutor: dentro do painel de fonte o contexto ja e claro e "Quelle verwenden"/"Quelle wechseln" cabem melhor, mas isso desvia do glossario — decisao de quem manda no glossario, com o botao renderizado na frente.

### `estante.progresso.marcar`

"Kapitel setzen" e defensavel (o alemao diz "Lesezeichen setzen"), mas destoa do proprio arquivo: fonte.paginaSemCandidatos usa "das Kapitel trägst du hier ein" e erros.registrar usa "eingetragen" para exatamente a mesma acao. O botao (src/app/(ui)/[locale]/estante/editar-progresso.tsx:83) abre o campo onde se registra o capitulo, entao "Kapitel eintragen" alinharia com o resto. Num produto de livro, "setzen" tambem carrega o sentido tipografico (diagramar). Nao marquei como erro; um nativo decide em dois segundos.

### `estante.descricao`

"Deine Obras" — plural portugues -s num substantivo estrangeiro dentro de frase alema. Concordo com o tradutor: e a chave mais exposta da decisao "obra fica em portugues". Vale igual para estante.obra, estante.vazia ("die erste Obra") e continuar.abrirObra. Se a decisao for reaberta, "Werk/Werke" e a palavra alema natural e resolve tambem o item abaixo.

### `estante.seletorStatus`

"Status der Obra" assume genero feminino para palavra que nao tem genero em alemao. Um nativo pode hesitar entre der/des/dem. Aparece tambem em fonte.paginaComCandidatos, fonte.paginaSemCandidatos, fonte.paginaDica e fonte.salvarPagina ("die Seite der Obra"). O que importa e que esteja igual nas cinco — e esta.

### `estante.progresso.salvar`

Rotulos inline em minuscula: "speichern", "abbrechen" (progresso.cancelar), "öffnen" (continuar.abrir). Ortograficamente validos e fieis ao pt, mas UI alema capitaliza rotulo de botao quase sempre. Decidir uma vez e aplicar no arquivo todo — hoje convive com "Bewerten", "Entfernen", "Ableiten" em maiuscula na mesma tela, o que um nativo le como inconsistencia mesmo sabendo que o pt faz igual.

### `estante.erros.acao`

"hat nicht geklappt — versuche es noch einmal" comeca com verbo minusculo e sem sujeito, e a string aparece SOZINHA no DOM (seletor-status.tsx:92, continuar-leitura.tsx:58). Colocquial legitimo falado, mas escrito e isolado parece texto cortado. Mesmo padrao em erros.rede e erros.registrar ("konnte gerade nicht eingetragen werden"). Em contraste, erros.salvar/remover/derivar ganharam sujeito com infinitivo substantivado ("Speichern hat nicht geklappt"), que funciona bem — a inconsistencia entre os dois grupos e o que um nativo vai apontar.

### `estante.fonte.rotuloUrl`

"Füge den Link zu Kapitel 1 von der Seite ein, auf der du liest" carrega a mesma ambiguidade Seite = site/pagina dos dois achados de sentido, embora aqui o contexto salve. E label de campo com 58 caracteres (pt tem 43) e com a oracao relativa jogada depois do prefixo separavel "ein" — correto, mas pesado para label. Se corrigir paginaComCandidatos/paginaSemCandidatos para "Website", padronizar aqui tambem.

### `estante.fonte.paginaDica`

Fora da negacao ja reportada: "füge die URL der Obra oben ins Feld ein" poe o adverbio antes do sintagma preposicional; "in das Feld oben" ou "ins obere Feld" soa mais natural. Nao e erro, e ritmo.

### `estante.progresso.campo`

"Aktuelles Kapitel" esta CERTO — aktuell e ATUAL, nao real/verdadeiro. Registro so para que um revisor futuro vindo do portugues nao "conserte" isso. Idem estante.capitulos: "{capitulo} Kapitel" serve para 1 e para 5 porque o plural de Kapitel e igual ao singular; ninguem deve trocar para "Kapiteln" (so dativo plural) nem inventar ramo de plural que o pt-BR nao tem.

### `listas.indice.subtitulo`

Além do erro relatado, dois pontos de gosto para o nativo: (1) "Quatsch" traduz "brincadeiras" com o tom leve certo, mas é coloquial e ligeiramente depreciativo ("besteira"); en usa "the silly ones", es "las locuras" — se soar auto-depreciativo demais, "Nonsens" ou "Unsinn"; (2) masculino genérico "Lesern", sem gendering, é decisão de política do produto e vale valer para o arquivo inteiro, não só aqui.

### `listas.detalhe.autoria`

"von {username} · # Obra / # Obras" — renderizado com t.rich logo abaixo do título de toda lista (src/app/(ui)/[locale]/listas/[id]/page.tsx:62), é o lugar mais visível da decisão de manter "obra" em português. Concordo com o alerta do tradutor: em alemão "Obras" não tem plural válido (-s não é o padrão) e o leitor não consegue atribuir gênero. Se a decisão for rediscutida, comece por esta chave. Nativa: "# Werk / # Werke". A escolha das categorias ICU (one/other) e a maiúscula de Obra estão corretas conforme a instrução.

### `listas.detalhe.vazia`

"Leere Liste — füge Obras über den Listen-Button auf der Seite jeder Obra hinzu." Gramática ok (füge…hinzu, "jeder Obra" genitivo feminino), mas é onde a Obra-como-die-Wort mais aparece, com acusativo plural e genitivo singular na mesma frase. "Listen-Button" está bem escrito (hífen + B maiúsculo) e Button é corrente; "Schaltfläche" só se o time quiser registro formal. Sobre o comprimento: é <p> de estado vazio (page.tsx:98), sem restrição de layout — a preocupação do tradutor com mobile não se sustenta.

### `listas.indice.criar.enviando`

Único risco de layout confirmado no código. O botão de criar (src/app/(ui)/[locale]/listas/criar-lista.tsx:130) alterna o próprio texto entre "Erstellen" e "Wird erstellt…" e não tem largura fixa — className é "rounded-md bg-acento px-3 py-1 text-sm font-medium". Em pt vai de 6 para 8 caracteres; em alemão vai de 9 para 14, então o botão pula de tamanho no clique. Seguir o padrão do glossário ("Wird gespeichert…") está certo; se incomodar, a saída é min-width no botão, não encurtar para "Erstelle…".

### `listas.indice.ordenar.curtidas`

"Meiste Likes" é superlativo atributivo sem artigo — forma clipada de UI; o pleno seria "Die meisten Likes". Passa em dropdown/pílula de ordenação, mas o nativo decide se prefere "Beliebteste", que fica mais idiomático e paralelo a "Neueste" (o vizinho na mesma nav). Layout NÃO é problema aqui: são dois links num nav segmentado text-xs (listas/page.tsx:77-91) e "Meiste Likes" (12) é até mais curto que "Mais curtidas" (13).

### `listas.detalhe.curtida.descurtir`

Comprimento é irrelevante: confirmei que o par curtir/descurtir vive num <span className="sr-only"> dentro do botão de coração (listas/[id]/curtir-lista.tsx), leitor de tela apenas. O que vale olhar é o sentido: "Like von der Liste entfernen" usa o mesmo verbo "entfernen" que é o rótulo VISÍVEL do botão de tirar uma obra da lista na mesma página (listas.detalhe.remover). Não é ambíguo gramaticalmente (o objeto acusativo é "Like"), mas fica esquisito na mesma tela, e o par ficou assimétrico: "die Liste liken" x "Like von der Liste entfernen". Simétrico seria "die Liste nicht mehr liken".

### `listas.detalhe.ordenar.antes`

"{titulo} nach vorne verschieben" (e "nach hinten" em .depois). Confirmei que o prop rotulo vira aria-label E title no componente Seta (listas/[id]/itens-ordenaveis.tsx:141-143), ou seja, é tooltip visível também — o título da obra na frente aparece para quem enxerga, não só para leitor de tela, e a ação só é dita no fim. Alternativa que preserva a ordem do pt e o imperativo du do resto do arquivo: "Verschiebe {titulo} nach vorne". Nativo decide entre infinitivo de UI e imperativo.

### `listas.campos.nome`

"Name der Liste" / "Beschreibung der Liste" (campos.descricao). A dúvida do tradutor sobre label estreito não se aplica: campos.nome é placeholder do input em criar-lista.tsx:105 e aria-label em editar-lista.tsx:116; campos.descricao só existe como aria-label (editar-lista.tsx:125). Não há label visível estreito, então genitivo x composto ("Listenname"/"Listenbeschreibung") é escolha só de estilo — decidir os dois juntos para manter o par simétrico.

### `listas.indice.convite`

"<entrar>Melde dich an</entrar>, um deine eigene zu erstellen." O adjetivo elíptico feminino "deine eigene" não tem antecedente na própria frase — o referente é o H1 "Listen" (plural) da página. Fiel ao pt ("criar a sua") e ortograficamente correto em minúscula, mas o alemão costuma explicitar: "um deine eigene Liste zu erstellen". É corpo de texto num <p> (listas/page.tsx:63), sem restrição de espaço, então explicitar sai de graça.

### `listas.detalhe.apagar.sim`

"ja" / "nein" (e o par .nao) em minúscula, seguindo o estilo inline do pt ("sim"/"não") — são botões visíveis de confirmação (listas/[id]/acoes-da-lista.tsx:104 e 111). Ortograficamente legal (não são substantivos) e coerente com a instrução de manter a caixa do pt, mas convenção de botão em alemão é "Ja"/"Nein" com maiúscula. Vale um ok do nativo, e a decisão precisa valer para os outros namespaces também.

### `home.feed.resenhou`

PRIORIDADE 1 para nativo, e confirmo o diagnóstico do tradutor. A frase é montada em três pedaços soltos em feed-da-comunidade.tsx:88-93 (<Autor> + string + título como link), então o Perfekt normal ("hat rezensiert") jogaria o particípio antes do objeto e sairia agramatical. O Präteritum "rezensierte" resolve a ordem e é gramatical, mas em feed de atividade o alemão coloquial usa Perfekt — "X rezensierte Naruto" tem tom de jornal/narrativa literária, não de rede social. Vale igual para home.feed.criouLista ("erstellte die Liste", feed-da-comunidade.tsx:149). As três saídas: manter o Präteritum, aceitar dois-pontos ("hat rezensiert:"), ou mexer no componente para deixar o particípio no fim. Decisão de nativo + produto, não corrigi.

### `home.resenha.spoiler`

Independente da correção do pronome que listei em problemas: "auf der Seite der Obra" é genitivo alemão com substantivo estrangeiro, pesado. A alternativa que o alemão normalmente usa para absorver palavra estrangeira é a composta hifenizada "auf der Obra-Seite". Mais importante: esta chave forma BLOCO com home.boasVindas.semFonte ("keine Obra", "eine Obra"), home.boasVindas.estanteVazia ("die erste Obra") e home.contagem.obras ("Obra/Obras") — todas assumem obra = feminino (die Obra). Se a decisão de manter "obra" em português for revista (candidatos naturais: "Werk/Werke" neutro, "Titel" masculino invariável), as quatro mudam juntas e a concordância de artigo/pronome muda em todas. Nunca revisar uma isolada.

### `home.contagem.obras`

Renderiza inline no rodapé do card de lista como "· 5 Obras · ♥ 3" (vitrine-cards.tsx:145) e no feed (feed-da-comunidade.tsx:155). É o ponto mais visivelmente artificial do grupo: palavra estrangeira com maiúscula alemã e plural português no meio de uma contagem. Conforme combinado, segui a decisão do dono do repo e NÃO corrigi — mas registro que "Titel" (invariável, é o que uma plataforma de leitura alemã usaria) resolveria plural e maiúscula de uma vez.

### `home.boasVindas.titulo`

"Viel Spaß beim Lesen, {username}." — é a saudação calorosa corrente em alemão e a escolha está certa ("Gute Lektüre" soaria livresco), mas cresceu 38% (24 → 33 chars) e é o h1 da home logada, em font-marca text-3xl (page.tsx:205-207), com o nome do usuário concatenado. Conferir na tela em mobile se não quebra em duas linhas; se quebrar, a saída é cortar para "Viel Spaß beim Lesen." sem o nome, o que exige mexer no código, ou aceitar a quebra.

### `home.boasVindas.semFonte`

A string mais longa do grupo (+23%, 159 → 195 chars), corpo de texto na home logada, tem espaço — o risco aqui é de naturalidade, não de layout. Três pontos: (a) "Gerade hat keine Obra, die du liest, eine Lesequelle" é gramatical, mas com a negação e a relativa encaixadas fica pesado de ler; um nativo provavelmente escreveria "Für keine Obra, die du gerade liest, ist eine Lesequelle eingestellt"; (b) "die Lesequelle einstellen" — "einstellen" é ajustar um parâmetro (rádio, temperatura); para escolher uma fonte, "festlegen" ou "eintragen" colam melhor; (c) as aspas alemãs em „Am Lesen“ são uma adição que pt/en/es não têm — estão tipograficamente corretas (baixa-alta) e desambiguam, mas é divergência consciente do original.

### `home.apresentacao.descricao`

Além da flexão que listei em problemas: (a) "Roman" segue o glossário, mas o nicho alemão diz "Light Novel" e o inglês manteve "Novel" — numa lista corrida "Manga, Manhwa und Roman(en)" pode ser lido como literatura geral, fora do nicho; é a mesma tensão que o es registrou com "novela"; (b) "privater Leseverlauf" em vez de "privater Verlauf" está certo ("Verlauf" sozinho lê como histórico de navegador), só é mais longo; (c) "Halte deine Lektüre … fest" — "festhalten" combina bem com "Eindrücke/Gedanken"; com "Lektüre" é aceitável mas incomum, alternativas: "Verfolge, was du liest" / "Behalte deine Lektüre im Blick".

### `home.saude.resumo.ok`

Bloco das três (ok/degraded/down). Entram como {estado} no INÍCIO da frase de home.saude.aviso e logo depois do ●/○ no rodapé (page.tsx:57, 150). Ficaram em minúscula ("alles läuft") acompanhando pt/en/es, o que faz uma frase alemã começar com letra minúscula. Não é erro de tradução — é escolha do pt-BR replicada —, mas em alemão salta mais aos olhos. Subir a inicial das três não quebra nada (o substantivo interno já está correto: Konfiguration, Abhängigkeit) e também cabe depois do ● no rodapé; só divergiria dos outros três idiomas.

### `home.saude.estado.down`

AVISO PARA QUEM FOR CORRIGIR, vale para as três chaves de saude.estado: são concatenadas em page.tsx:74 como `${nome} ${estado}`, gerando "Datenbank antwortet nicht" / "AniList-Katalog nicht konfiguriert". Duas coisas: (1) o nome chega SEM artigo, então a frase é telegráfica, estilo linha de status — coerente com o pt ("banco de dados fora do ar"), mas quem "melhorar" a string não pode contar com artigo; (2) ao contrário do francês, aqui não há armadilha de gênero: as formas escolhidas são verbo/particípio predicativo, que em alemão não flexionam. Qualquer substituição deve continuar sendo predicativa ("nicht erreichbar", "ausgefallen") e nunca um adjetivo atributivo.

### `home.atividade.vazia`

"Hier gibt es noch keine Rezension und keine Liste" é gramatical, mas o alemão idiomático para negar dois itens é "weder … noch": "Hier gibt es weder Rezensionen noch Listen — die erste erscheint in diesem Bereich." Nit de naturalidade, não erro; anoto porque a frase é irmã das duas de vitrine e, se as três forem retrabalhadas, convém decidir o padrão uma vez só.

### `home.rodape.verificado`

Duas observações, nenhuma é defeito da tradução. (1) {quando} é o ISO cru de health.service.ts:51 (relogio().toISOString()), então o rodapé mostra "geprüft: 2026-09-07T12:00:00.000Z" — feiura igual nos quatro idiomas, conserto é no código; (2) o alemão trocou a preposição do pt ("verificado em") por dois-pontos ("geprüft: {quando}"). Com timestamp cru os dois-pontos até ajudam, mas é pontuação que en/es/fr não têm; se preferirem espelhar, "zuletzt geprüft um {quando}".

### `home.apresentacao.criarConta`

Chaves curtas que cresceram, todas conferidas quanto a onde aparecem e nenhuma preocupante: criarConta "Konto erstellen" (11 → 15) e entrar "Anmelden" (6 → 8) são os dois botões do hero deslogado num flex-wrap com gap (page.tsx:347-359), cabem; populares.verMais "mehr anzeigen →" (10 → 15) é link de seção; vitrine.resenhas.titulo "Rezensionen" (8 → 11) é h2; saude.estado.down "antwortet nicht" (10 → 15) entra numa lista separada por vírgula no aviso, não em elemento estreito; resenha.notaAria (16 → 22) é aria-label, comprimento é irrelevante. Nenhuma cai em aba ou item de menu — a compressão do alemão não gerou problema de layout neste namespace.

### `obra.contagem.aberturas`

Concordo com o tradutor em levar a decisao ao time, mas com um dado que ele nao tinha: verifiquei o render (page.tsx:395 e 409-411) e esta contagem so aparece DENTRO do painel do dono logado, no <details> do historico de leitura, que o CLAUDE.md define como privado do dono. Ou seja, o numero nunca e "quantas pessoas leram" — e "quantas vezes VOCE abriu um capitulo". Nesse contexto "Aufrufe" e mais preciso que o caminho de en/es ("reads"/"lecturas"), que ali diriam "20 leituras suas". Recomendo manter Aufrufe e registrar a decisao antes dos outros namespaces.

### `obra.painel.convite`

Duas coisas na mesma string. (1) O "sie" de "um sie ins Regal zu stellen" nao tem antecedente dentro da string — confirmo a preocupacao do tradutor. (2) O tradutor nao mencionou: o infinitivo do meio, "zu bewerten", fica sem objeto proprio e precisa tomar emprestado o "sie" do primeiro infinitivo. E gramatical, mas o leitor tropeca. Se for explicitar o objeto uma vez, resolve os dois: "…um die Obra ins Regal zu stellen, sie zu bewerten und deine Lektuere festzuhalten". Mesma questao em obra.painel.adicionar, que repete o pronome duas vezes.

### `obra.erros.salvar`

Nao virou achado porque e defensavel, mas quero olho nativo: "Speichern hat nicht geklappt" usa infinitivo substantivado NU como sujeito. Sem artigo, essa construcao e licenciada para afirmacao generica ("Rauchen verboten"); para um evento especifico (esta tentativa de salvar falhou) o alemao normalmente pede o artigo — "das Speichern hat nicht geklappt" — ou reestrutura para "Speichern fehlgeschlagen". Vale para obra.erros.comentar tambem ("Kommentieren hat nicht geklappt"), onde soa ainda mais duro. Se confirmarem o artigo, a correcao que sugeri em erros.listas fica coerente com as tres.

### `obra.resenhas.verAnteriores`

Conferi as duas declinacoes e AMBAS estao certas: ramo one "1 frueheren Kommentar" (acusativo masculino singular, declinacao forte depois de numeral sem artigo, terminacao -en) e ramo other "3 fruehere Kommentare" (acusativo plural forte, -e). Registro aqui so porque o tradutor pediu confirmacao e porque nenhum teste cobre terminacao de adjetivo dentro de ramo de plural — se alguem "uniformizar" as duas no futuro, quebra em silencio. A inversao ("{plural} ansehen", verbo no fim) tambem esta correta.

### `obra.avaliacao.resenhar`

Rebaixo o risco do tradutor com evidencia do codigo: o botao e `className="w-fit …"` (avaliacao-da-obra.tsx:199-204), ou seja, largura acompanha o conteudo — nao ha truncamento nem corte. "Rezension schreiben…" (20) e "Rezension bearbeiten…" (21) so empurram o layout em tela estreita. Nao vejo motivo para sacrificar informacao indo para "Rezension…"/"Bearbeiten…". Confirmar visualmente em 360px e encerrar o assunto.

### `obra.resenhas.verConversa`

Mesmo caso: renderiza dentro de um <summary> livre (review-social.tsx:279-281), alternando com obra.resenhas.comentar conforme haja ou nao comentarios. Nao e chip de largura fixa, entao "Unterhaltung ansehen" (20) caberia. A escolha entre "Gespraech" e "Unterhaltung" e de gosto/idiomatismo, nao de espaco — deixar o nativo decidir sem a pressao de tamanho que o tradutor supos.

### `obra.apagar.confirmar`

Validei a mecanica e o raciocinio do tradutor se sustenta: {itens} e montado com `Intl.ListFormat(idioma)` (avaliacao-da-obra.tsx:134) a partir de contagem.curtidas e contagem.comentarios, produzindo "2 Likes und 1 Kommentar"; como objeto acusativo nao ha armadilha de declinacao nem de concordancia verbal. A string cai em `window.confirm()` (linha 168), entao os botoes sao os do navegador (OK/Abbrechen) — "Weiter?" e respondido por "OK", pequeno descompasso que o pt ja tem com "Continuar?". Abertas so as duas duvidas de estilo do tradutor: o "loeschst" repetido e Weiter?/Fortfahren?.

### `obra.indisponivel`

Concordo integralmente: "diese Obra" e a UNICA ocorrencia no namespace com artigo/demonstrativo colado em Obra, entao e onde o genero da palavra estrangeira fica decidido de fato. Fixar aqui (feminino, conforme glossario) e propagar, ou reabrir agora — depois sai caro.

### `obra.similares`

"Aehnliche Obras": o adjetivo esta certo (nominativo plural forte) e o plural em -s e o que o glossario determina. Renderiza como titulo de secao com CSS uppercase (page.tsx:447-449), saindo "AEHNLICHE OBRAS" — o que acentua a leitura de marca, nao de palavra. E a chave onde a decisao de manter "obra" em portugues fica mais exposta ao leitor alemao.

### `obra.resenhas.minha`

"du" isolado num badge ao lado do proprio nome de usuario (review-social.tsx:240-244). Segue o pt ("voce") e o en ("you"), mas em alemao um rotulo solto costuma vir capitalizado ("Du"), e ha produtos que preferem "Ich" nessa posicao. Chamada de voz do produto, nao erro.

### `obra.modal.placeholder`

Concordo com o tradutor: "oeffentlich fuer andere Leser" e fiel ao pt mas nao e a colocacao corrente; "fuer andere Leser sichtbar" e o alemao natural. Some-se o masculino generico "Leser", que o tradutor deixou em aberto — e a unica marca de genero do namespace, entao decidir aqui define o padrao para perfil/comunidade.

### `numeros.seguindo`

Confirmo o risco levantado, com um dado a favor da escolha atual: o Instagram alemao usa exatamente 'Gefolgt' como rotulo da contagem de quem voce segue, entao '12 Gefolgt' tem precedente de plataforma grande. Contra: o frances do proprio repo SEPAROU os dois usos (botao 'Suivi', contagem 'abonnements'), o que mostra que rotulo de estatistica nao precisa ser igual ao texto do botao. Decidir social.seguindo e numeros.seguindo juntos; se trocar, 'Abonniert' (botao) + 'Abonnements' (contagem) e o par mais corrente hoje.

### `numeros.avaliadas`

Ponto que o tradutor NAO levantou e que so um nativo pega: em alemao coloquial 'Bewertung' e 'Rezension' sao quase sinonimos (Amazon chama resenha de 'Bewertung'). A linha de estatisticas vai ler '12 Bewertungen - 3 Rezensionen' e o leitor alemao pode nao perceber que sao coisas diferentes (nota sem texto vs nota com texto) - distincao que em pt ('avaliadas' vs 'resenhas') e obvia. Somado ao descompasso de registro que ele mesmo apontou (avaliadas.titulo='Bewertet' em caixa alta, page.tsx:179), essa e a chave que eu poria na frente do nativo. Alternativa a considerar: 'bewertet' minusculo como particpio na contagem, mantendo 'Bewertet' no titulo.

### `voce`

'du' e um badge autonomo dentro do h1, ao lado do username (page.tsx:110), nao parte de frase. Em alemao rotulo isolado costuma comecar com maiuscula, e o Duden autoriza 'Du' no tratamento direto; 'du' minusculo isolado pode ler como descuido. Contra-argumento: pt/en/es/fr usam todos minuscula ('voce', 'you', 'tu', 'toi'), entao e coerencia de design. Decisao de uma linha, mas so um nativo julga bem.

### `membroDesde`

'auf Kidoku seit {mes}' - 'auf' para plataforma e corrente ('auf Instagram'), mas 'bei Kidoku seit' tambem se usa para servico/conta. Aparece na segunda linha de todo perfil. Confirmei que {mes} rende 'September 2026' / 'Maerz 2026' com Intl de-DE, entao a concordancia da frase esta ok em qualquer mes.

### `numeros.curtidasDadas`

A flexao esta correta (das Like e neutro; forte apos numeral sem artigo: -es no sg neutro, -e no pl). Ressalva que o tradutor nao mencionou: 'vergeben' tambem significa 'perdoado' e 'ja comprometido', e o participio antes de 'Like' pode gerar leitura de tropeco por meio segundo. Alternativa mais leve e mais curta: '1 Like vergeben' / '5 Likes vergeben', ao custo do paralelo nominal com as outras estatisticas.

### `avaliadas.vaziaPropria`

Decisao 'obra em portugues' - concordo integralmente com o alerta. Em alemao o efeito e pior que em ingles/frances porque a maiuscula obrigatoria ('Keine Obra', 'eine Obra') faz 'Obra' ler como nome proprio, nao como estrangeirismo. Mesmo caso em avaliadas.vaziaComFiltro, avaliadas.vaziaOutro e resenhas.vaziaPropria. Este e o namespace onde a decisao mais aparece: 5 chaves.

### `listas.obras`

'{valor} Obras' usa plural portugues -s dentro de texto alemao, onde nenhum substantivo forma plural assim; fica ao lado de um numero no card de cada lista (page.tsx:302-305). Se a decisao sobre 'obra' for mantida, escolher explicitamente entre plural invariavel ('3 Obra') e plural portugues ('3 Obras') - e registrar a escolha, porque ela vaza para todos os idiomas.

### `filtros.ordens.menor_nota`

'Niedrigste Bewertung' (20) contra 'Menor nota' (10); o par 'Hoechste Bewertung' tem 17. Sao <option>, entao definem a largura do select fechado. Concordo em nao encurtar por conta propria: 'Beste/Schlechteste Note' contraria o glossario (nota = Bewertung).

### `listas.vaziaPropria`

Concordo: '<link>Erstelle die erste</link>' e gramatical mas eliptico demais para link de acao - 'die erste' depende da frase anterior, e se o link for lido isolado (leitor de tela pulando por links) fica sem referente. 'Erstelle die erste Liste' resolve e continua curto.

### `estante.vazia`

Alem do defeito de codigo relatado em problemas: as aspas alemas U+201E/U+201C foram acrescentadas pelo tradutor e nao existem no pt. Verifiquei o precedente citado e ele procede (fr.json usa 'Rien dans « {status} ».'), mas en e es nao delimitam. Vale decidir se o padrao passa a ser delimitar em todos os idiomas ou so onde o idioma exige.
