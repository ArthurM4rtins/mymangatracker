# Revisão do es — o que olhar primeiro

Este arquivo existe porque **ninguém do time fala es**.

A tradução foi feita com revisão adversarial independente, mas isso não
substitui um falante nativo. O que ele substitui é a leitura das 346 strings:
os agentes marcaram, chave a chave, onde a tradução foi arriscada e por quê.
**Comece por aqui, não pelo catálogo inteiro.**

Corrigir é trocar um valor em `messages/es.json`. As chaves são as mesmas em
todos os idiomas, e `tests/i18n/` impede que a correção quebre os outros.


> **ATUALIZAÇÃO — duas pendências deste guia já foram RESOLVIDAS.**
>
> **1. O termo `obra`.** Quando este guia foi escrito, `obra` estava mantida em
> português em todos os idiomas, e várias entradas abaixo comentam isso. A decisão
> mudou: **cada idioma passou a usar a palavra dele.** Não afeta o espanhol: `obra` já é palavra do espanhol e foi mantida.
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
| Falso amigo — o mais perigoso | 13 |
| Termo do produto | 14 |
| Expressão idiomática | 16 |
| Plural e gênero | 13 |
| Registro incerto | 15 |
| Cresceu de tamanho | 11 |
| Marcado pelo revisor | 80 |

## Falso amigo — o mais perigoso

Palavras que **estão certas** e que um revisor lusófono vai querer "corrigir" para o cognato do português. Se isso acontecer, o texto passa a dizer outra coisa e **continua parecendo certo**. Confirme antes de mexer.

### `cadastrar.subtitulo`

"Estante" do pt virou "Estantería". Esse e o falso amigo central do produto e ele aparece aqui, na primeira tela que um usuario novo le. Se um revisor que so fala portugues "corrigir" para "Estante", o texto passa a dizer "prateleira, progreso y resenas" e ninguem percebe. Marcar como intocavel.

### `componentes.estrelas.limpar`

pt 'limpar' -> es 'quitar'. Um revisor lusofono vai estranhar por nao parecer com o portugues, mas 'limpiar' e limpeza fisica e 'borrar' e apagar/rabiscar. Confirmar se, no widget de estrelas, o nativo diria 'quitar' ou 'quitar la valoracion' (mais explicito, porem mais longo). E texto de acao dentro do grupo de estrelas, minusculo como no pt.

### `listas.detalhe.remover`

pt "remover" -> escrevi "quitar". A traducao literal "remover" existe em espanhol mas significa mexer/agitar (revolver la sopa) — um revisor que so le portugues aprovaria "remover" sem piscar. Confirmar que "quitar" e o verbo certo para tirar a obra da lista (alternativa: "eliminar", mas ja e o verbo de apagar a lista inteira, entao evitei para nao colidir).

### `erros.comentario_tamanho_invalido`

"comentario vacio o demasiado largo". Em espanhol largo = comprido, entao esta correto — mas para revisor lusofono parece dizer "largo demais" (ancho). E o item numero 1 da lista porque a tentacao de "corrigir" para "extenso" e alta e desnecessaria. Nativo so precisa confirmar que largo e a palavra natural aqui (e e).

### `erros.url_de_capitulo_invalida`

"pega la URL completa del capitulo 1, con https://". Pegar = colar (paste) em espanhol, padrao em Espanha e America Latina. Em portugues pegar = agarrar, entao a frase soa estranha ao revisor lusofono. Nativo confirma se prefere "pega" ou a variante mais explicita "pega aqui la URL".

### `erros.pedido_invalido`

"solicitud invalida". Nao usei "pedido" (que em espanhol e encomenda de compra) nem "peticion" (correto, mais usado em documentacao tecnica de Espanha). Escolha entre solicitud e peticion e de gosto do nativo; o que nao pode e voltar para pedido.

### `estante.avaliacao.remover`

pt "Remover" nao pode virar "Remover" em es (que e revolver/mexer). Escrevi "Eliminar", alinhado ao glossario apagar->eliminar. Mas o botao remove a SUA valoracao/resena, nao apaga dado de outra pessoa — um nativo talvez prefira "Quitar", que e mais suave e mais preciso para desfazer a propria nota. Vale para erros.remover tambem.

### `home.apresentacao.descricao`

Linha de venda do produto, primeira coisa que um visitante de fora le. Dois pontos: (a) 'histórico privado' -> 'historial privado' — 'histórico' em espanhol so serve para 'de valor historico', e um revisor que so le portugues vai achar que 'histórico' estava certo; (b) o fecho 'estante sua' virou 'una estantería que es tuya', 3 palavras a mais que o pt, porque 'estantería tuya' solto nao existe em espanhol. Conferir se o texto ainda cabe no hero sem quebrar feio. Alternativas mais curtas se apertar: 'y una estantería tuya' ou 'tu estantería, solo tuya'.

### `home.boasVindas.estanteVazia`

Traduzi 'estante' como 'estantería' aqui, em boasVindas.semFonte e em apresentacao.descricao. E a decisao mais perigosa do arquivo para quem revisa em portugues: 'estante' EXISTE em espanhol e vai parecer certo, mas significa prateleira/tabua, nao o movel nem a colecao. Se o nativo mudar para 'estante' em algum lugar, tem que mudar em todos e no glossario. Nesta chave tambem escolhi 'añade' (Espanha e LatAm entendem) em vez de 'agrega' (mais LatAm) — vale confirmar qual soa mais neutro para o publico do produto.

### `obra.historico.titulo`

"Historial de lectura", nao "Histórico" — em espanhol "histórico" e adjetivo (que fez historia). Revisor que so fala portugues leria "Histórico de lectura" como certo, por isso esta aqui. Vale conferir tambem se "Historial de lectura" e o rotulo que um leitor espanhol procura, ou se seria "Historial de lecturas".

### `obra.painel.convite`

"añadirla a tu estantería": "estante" em espanhol e a prateleira, o movel/colecao e "estantería" — erro que passaria batido para quem le portugues. Junto disso, acrescentei o pronome objeto que o pt nao tem ("añadirla", "valorarla", e "Añádela" em painel.adicionar): confirmar que o referente (la obra) fica claro no painel e que "registrar tu lectura" nao soa possessivo demais frente a "registrar la lectura".

### `obra.resenhas.apagar`

Traduzi "apagar" como "eliminar" aqui, em resenhas.apagarComentario ("Eliminar comentario") e em historico.fonteRemovida ("fuente eliminada"), seguindo o glossario — "borrar" seria o cognato tentador e significa apagar/rabiscar. Confirmar que "eliminar" e a palavra do produto para as tres e que "fuente eliminada" (fonte de leitura que sumiu) nao se confunde com fonte tipografica.

### `perfil.foto.remover`

'remover' virou 'quitar', nao 'borrar' (que e apagar/rabiscar) nem 'eliminar' (reservado pelo glossario para 'apagar'). Aparece minusculo, ao lado de 'cambiar', como acao destrutiva da foto. Se o produto quiser peso maior nessa acao, 'eliminar' seria a escolha — mas ai colide com o termo de apagar.

## Termo do produto

Escolhas de vocabulário que valem para o idioma inteiro. Mudar uma aqui obriga mudar todas as outras ocorrências.

### `cadastrar.erros.geral / cadastrar.erros.falhaInterna`

"cadastro" virou "registro" ("no se pudo completar el registro"). Escolha consciente para nao usar o falso amigo "catastro". Um nativo deve confirmar que "completar el registro" e o fraseado natural do fluxo de signup em es — alternativas plausiveis: "crear la cuenta" (alinha com o botao "Crear cuenta", que e o que o usuario acabou de clicar) ou "finalizar el registro". Se preferir alinhar ao botao, as duas chaves mudam juntas.

### `componentes.estrelas.grupo`

pt 'Nota de 0,5 a 5' -> es 'Valoracion de 0,5 a 5'. O glossario manda nota/avaliacao -> valoracion, entao nao usei 'Nota' (que existe em espanhol, mas puxa para nota escolar). Decidir se o produto quer 'Valoracion' aqui e em componentes.estrelas.semNota ('sin valoracion'), ja que sao os dois pontos onde o termo aparece em texto de acessibilidade. Decimal com virgula (0,5) mantido, correto em espanhol.

### `listas.indice.ordenar.curtidas`

"Mais curtidas" -> "Con mas me gusta". Como "me gusta" e invariavel, nao da para dizer "mas gustadas"; "Mas me gusta" sozinho fica ambiguo com "gosto mais". Ficou mais longo que "Recientes" ao lado, num seletor de ordenacao. Alternativa se apertar: "Mas populares" (perde precisao).

### `listas.detalhe.curtida.descurtir`

"quitar el me gusta a la lista" — conferir a preposicao (a la lista vs de la lista) e o fato de "quitar" aparecer tambem em detalhe.remover com outro sentido; se incomodar, o par curtir/descurtir pode virar "dar/quitar me gusta".

### `cabecalho.estante`

"Estanteria" — o termo do glossario, porque estante em espanhol e a prateleira (a tabua), nao o movel/colecao. Vale a checagem do nativo porque e a palavra mais repetida do produto e porque cresce de 7 para 10 caracteres num item de barra de navegacao, ao lado de Catalogo e Listas.

### `erros.status_invalido`

Traduzi para "estado invalido". Duas coisas a decidir: (1) o campo da API se chama literalmente status, entao se a mensagem pretende nomear o campo, "estado" perde o vinculo (comparar com anilist_id_invalido e cursor_invalido, onde mantive anilistId e antesDe intactos); (2) o pt usa "status" como vocabulario de tela ("Filtrar por status", "Status da obra", namespace estante) — se o tradutor daquele grupo escrever "estado", casa; se mantiver "status", o arquivo fica inconsistente. Decisao vale para o idioma inteiro, nao so para esta chave.

### `erros.template_invalido`

"plantilla invalida — vuelve a derivarla". Duas escolhas minhas: traduzi template por plantilla (o ingles manteve "template"; parte do publico dev hispanico tambem diz template), e o "refaca a derivacao" virou "vuelve a derivarla" para casar com o botao Derivar/Derivando… do namespace estante. Se aquele grupo nao usar o verbo derivar, esta frase perde a referencia.

### `comum.formato.NOVEL`

"Novela" (glossario), que tambem aparece em meta.descricao. Em espanhol novela e primeiro o romance literario e, em muita gente, telenovela — nao o formato web novel asiatico. Confirmar com nativo se a etiqueta do card fica clara ou se o publico do nicho espera "Novela ligera"/"Novel"; mudar aqui obriga mudar a descricao do site tambem.

### `estante.fonte.derivar`

Mantive "Derivar"/"Derivando…" do pt e do en. Em es "derivar" puxa para matematica (derivada) ou para "encaminhar", e como botao solto pode ficar opaco — "Detectar" seria mais claro. Se mudar, mudar junto fonte.derivando, erros.derivar e o "deriva de nuevo" no fim de fonte.paginaDica.

### `home.resenha.notaAria`

'Nota {nota} de 5' -> 'Valoración {nota} de 5', seguindo o glossario (avaliacao -> valoración). E aria-label de estrela, so leitor de tela ouve. Existem chaves notaAria tambem nos namespaces perfil/obra/estante, traduzidos por outra pessoa: se la sair 'Puntuación' ou 'Nota', o produto fica com tres palavras para a mesma coisa. Ponto de conferencia entre arquivos, nao dentro deste.

### `obra.contagem.aberturas`

Escolhi "{n} lectura / {n} lecturas" para o que o pt chama "abertura" (cada vez que a pessoa abriu o capitulo no site de leitura). Literal seria "apertura/aperturas", que em espanhol soa a inauguracao/abertura de xadrez. O texto aparece no cabecalho do bloco, logo depois de "Historial de lectura ·" — o nativo deve ler os dois juntos ("Historial de lectura · 7 lecturas") e dizer se repete demais e se "lecturas" nao sugere "7 capitulos lidos" em vez de "7 vezes que abriu". Alternativas na mesa: aperturas, veces, accesos.

### `obra.nota.titulo`

"Valoración de Kidoku" para a media do site. O pt distingue "Nota" (o numero) de "avaliação" (o ato/contagem); eu colapsei tudo em "valoración", afetando tambem nota.distribuicao, avaliacao.titulo ("Tu valoración") e resenhas.nota ("Valoración {nota} de 5"). Decidir de uma vez entre valoración, puntuación e nota — se mudar, muda nas quatro chaves e em contagem.avaliacoes.

### `perfil.estante.abas`

pt e en mantiveram 'Status'; escrevi 'Estado' (rotulo aria do grupo de abas de status da estanteria). Precisa bater com como o namespace 'estante' traduziu os rotulos READING/COMPLETED/etc. — se aquele arquivo usar 'Status', a tela fica com dois nomes para a mesma coisa.

### `perfil.filtros.nota`

'Nota' virou 'Valoración' (glossario: avaliacao = valoración), o que se propaga para notaAria 'Valoración {nota} de 5' e para as ordens 'Mayor/Menor valoración'. Verificar que nao fica ambiguo com perfil.avaliadas.titulo 'Valoradas' na mesma tela, e que 'Mayor valoración' se le como nota alta e nao como quantidade de valoracoes.

## Expressão idiomática

Frases em que a tradução literal perde o sentido ou o tom. É onde um nativo agrega mais.

### `entrar.contaCriada`

"Agora é entrar." e uma construcao coloquial do pt que nao tem equivalente literal em es. Traduzi como imperativo: "Ahora inicia sesión." Um nativo julga se soa direto e caloroso (intencao do original) ou seco/imperioso demais; "Ya puedes iniciar sesión." seria a alternativa mais suave, porem mais longa.

### `autor.obras.vazia`

pt 'Nenhuma obra de manga ou novel registrada no AniList.' -> es 'No hay obras de manga ni novela registradas en AniList.' Reescrevi como oracao completa e troquei 'o' por 'ni' (obrigatorio depois de negacao) e o singular pelo plural com concordancia. Um nativo deve confirmar se prefere o singular 'Ninguna obra de manga ni novela registrada en AniList.' — as duas sao corretas, mudam o tom.

### `componentes.carrossel.proximo`

pt 'Proximo' -> es 'Siguiente', nao o cognato 'Proximo'. Em espanhol 'proximo' puxa para proximidade/tempo; o par padrao de navegacao e 'Anterior / Siguiente'. Vale a checagem porque, ao lado de 'Anterior' (identico ao pt), a assimetria pode parecer erro para quem le portugues.

### `catalogo.subtitulo`

"Busca la obra, anadela a tu estanteria y la lectura empieza a contar." Duas coisas para o nativo checar: o imperativo em tu ("Busca", "anadela" — nao "Busque", que seria usted) e a escolha de "anadir" em vez de "agregar". "Anadir" e o termo da Espanha e e entendido na America Latina; "agregar" e o mais comum em es-419. Se o produto for mirar mais LatAm, esta e a chave a trocar.

### `catalogo.filtros.ordens.alta`

"Em alta" virou "En tendencia" (o ingles usou "Trending"). Traducao literal ("En alza") soaria a mercado financeiro. "En tendencia" e neutro e nao colide com "Populares", que e a opcao vizinha, mas "Tendencias" tambem e usado — escolha de nativo entre as duas.

### `catalogo.botaoEstante.erro`

"nao deu — tente de novo" e coloquial no pt. Traduzi por "no se pudo — intentalo de nuevo", que e neutro mas mais seco que o original. Opcoes com mais calor sao regionais demais ("no salio") ou mais longas ("no funciono"). Vale confirmar com nativo se o registro coloquial se perdeu.

### `listas.indice.subtitulo`

"dos classicos as brincadeiras" -> "de los clasicos a las locuras". Nao usei "bromas" (le-se piada/pegadinha, muda o sentido) nem "juegos". "Locuras" mantem o tom leve, mas e a escolha mais autoral do arquivo — nativo decide se soa bem numa linha de subtitulo.

### `listas.indice.criar.erros.falhou`

"nao deu — tente de novo" -> "no salio — intentalo de nuevo" (mesma escolha em .rede). "No salio" e coloquial e curto como o pt; conferir se soa neutro fora do Cone Sul. Alternativa mais fria: "no funciono".

### `erros.lista_ou_obra_nao_encontrada`

"lista U obra no encontrada". A conjuncao o vira u antes de palavra que comeca com o-. Esta certo, mas parece erro de digitacao para quem le portugues — risco real de alguem "consertar" para "lista o obra", que ai sim fica errado.

### `estante.erros.avaliacaoVazia`

pt "dá uma nota ou escreve a resenha" -> "pon una valoración o escribe la reseña". A colocacao certa em es neutro pode ser "da una valoración" ou simplesmente "valora o escribe la reseña" (mais curto e usa o verbo do glossario). "poner nota" existe, mas carrega tom escolar.

### `estante.progresso.atual`

"no cap. {capitulo}" -> "en el cap. {capitulo}". Falando de progresso de leitura, o es coloquial e "voy POR el cap. 57", nao "en el". Preferi "en el" por ser rotulo solto e nao frase em primeira pessoa. Se mudar, progresso.prefixo ("en el cap.") tem que mudar junto — as duas chaves aparecem no mesmo componente e precisam casar.

### `estante.progresso.campo`

Desviei do pt: "Capítulo em leitura" virou "Capítulo actual", como o en fez. "Capítulo en lectura" e entendivel mas soa traduzido. Um nativo decide se "actual" perde a nuance de "o que voce esta lendo agora" — e o label do campo onde a pessoa digita o progresso.

### `estante.vazia`

Usei "añade la primera obra". "añadir" e mais peninsular, "agregar" mais latino-americano; os dois se entendem nos dois lados, mas a escolha precisa valer para o produto inteiro, nao so aqui. Definir agora e propagar.

### `home.boasVindas.titulo`

'Boa leitura' -> 'Feliz lectura, {username}.' E o h1 da home de quem esta logado. 'Buena lectura' seria o calco literal do portugues e tambem se usa; escolhi 'Feliz lectura' por soar mais como saudacao espontanea em espanhol. Escolha de gosto — se o nativo achar 'Feliz lectura' seco ou de contracapa de livro, trocar por 'Buena lectura' ou 'Que disfrutes la lectura'.

### `home.vitrine.resenhas.vazio`

'nesta vitrine' -> 'en esta vitrina'. 'Vitrina' e o termo comum na America Latina; na Espanha o mais natural para montra de loja e 'escaparate', embora 'vitrina' se entenda. Se o nativo achar regional demais nos dois lados, a saida e nao nomear a secao: 'la primera aparece aquí'. Mesmo texto em home.vitrine.listas.vazio — mudar nos dois.

### `perfil.social.descurtir`

'Quitar el me gusta al perfil' — segui o glossario (descurtir = quitar el me gusta) mais o dativo 'al perfil'. Alternativas comuns em UI: 'Quitar el me gusta del perfil' ou 'Ya no me gusta'. Confirmar qual rege melhor e se o artigo 'el' fica ou cai.

## Plural e gênero

Concordância que o português não tem, ou tem diferente.

### `catalogo.filtros.todos`

"Todos" e uma unica string reaproveitada pelos tres filtros: Tipo (masc.), Genero (masc.) e Decada (FEMININO). Em espanhol o correto com decada seria "Todas". O pt-BR tem o mesmo problema e resolveu com "Todos"; mantive, mas se o codigo permitir string por filtro, um nativo vai querer "Todas" na decada.

### `catalogo.cartao.capitulos`

Unica chave onde alterei a forma da mensagem: o pt-BR e texto simples "{n} capitulos" e eu escrevi plural ICU one/other, porque "1 capitulos" seria erro de gramatica. O ingles ja fez a mesma transformacao nesta chave, entao o codigo aceita. Escrevi {n} dentro dos ramos (nao #) para nao mudar a formatacao do numero na tela.

### `listas.detalhe.autoria`

Troquei =1 por one e mantive other, sem ramo many. Mantive "obra/obras" por decisao do repo e mantive o # (nao ha {valor} aqui). Conferir que a concordancia com o ponto medio e o <autor> fica legivel: "por Ana · 3 obras".

### `erros.ordem_invalida`

"el orden debe contener exactamente las obras de la lista". Genero muda o sentido: EL orden = sequencia (o que a tela quer dizer), LA orden = ordem/comando. O pt "a ordem" e feminino e induz ao erro. Se alguem trocar para "la orden", a frase passa a falar de um comando militar.

### `estante.filtros.tudo`

Espelhei o pt "Tudo" / en "All" com "Todo", no singular neutro. Como o filtro corre sobre obras (feminino plural) e fica lado a lado com Leyendo/Completado/Pendiente/En pausa/Abandonado, um nativo pode achar que o chip natural e "Todas" (las obras) ou "Todos". E o rotulo mais visivel do namespace — decidir antes de traduzir os outros filtros do produto.

### `home.saude.estado.down`

Este valor e concatenado depois do nome da dependencia: 'base de datos sin respuesta' (feminino) e 'catálogo AniList sin respuesta' (masculino). Escolhi frases sem genero de proposito ('sin respuesta', 'sin configurar', 'respondiendo'). Se o nativo trocar por 'caído' ou 'no configurado', metade das combinacoes fica com concordancia errada na tela. Ler junto com home.saude.estado.not_configured, home.saude.dependencia.database e home.saude.aviso — e uma frase so, montada em tempo de execucao.

### `home.contagem.curtidas`

Escrevi so o ramo 'other' porque 'me gusta' nao varia: renderiza '1 me gusta' e '5 me gusta' (o numero vem de fora da mensagem, no JSX). Confirmar com nativo que a forma plural correta e mesmo 'me gusta' invariavel e nao 'me gustas'. Vale igual para home.contagem.curtidasLeitorDeTela, que e o texto lido por leitor de tela.

### `home.resenha.spoiler`

'leia na página da obra' -> 'léela en la página de la obra'. O 'la' de 'léela' se refere a la reseña (feminino). Confirmar que o referente fica claro sem a palavra 'reseña' na frase — a string aparece no card da vitrine SUBSTITUINDO o texto da resenha (vitrine-cards.tsx:73), entao o leitor nao tem o substantivo por perto. Se ficar ambiguo: 'Contiene spoiler — lee la reseña en la página de la obra.'

### `obra.contagem.curtidas`

"{n} me gusta" nos DOIS ramos (one e other), de proposito: "me gusta" nao varia, mas o teste de argumentos ICU exige o mesmo numero de ramos do pt-BR, entao nao da para deixar so o `other`. Confirmar que a forma de contagem correta e "5 me gusta" e nao "5 me gustas" nem "5 Me gusta" com maiuscula, e que ela funciona solta no meio da frase de apagar.confirmar ("también elimina 2 me gusta y 1 comentario").

### `obra.apagar.confirmar`

"Eliminar el texto de la reseña también elimina {itens}. ¿Continuar?" — {itens} chega do Intl.ListFormat e varia entre "1 comentario" e "2 me gusta y 1 comentario". Deixei o verbo no singular concordando com o infinitivo-sujeito para nao quebrar com 1 item; ler em voz alta nos dois casos e dizer se um nativo preferiria "se eliminan tambien" (que quebraria no singular) ou outra construcao.

### `perfil.numeros.curtidasDadas`

Escrevi one {<forte>{valor}</forte> me gusta dado} other {... me gusta dados}. O substantivo 'me gusta' e invariavel, mas o participio concorda com o numero do sintagma, entao os dois ramos existem e diferem so em dado/dados. Nativo precisa julgar se '1 me gusta dado' soa aceitavel numa linha de estatistica ou se prefere reformular sem participio (ex.: 'me gusta en total'). Foi o unico ponto onde nao consegui uma forma 100% invariavel e natural ao mesmo tempo.

### `perfil.numeros.curtidasNoPerfil`

Os ramos one e other tem texto IDENTICO ('me gusta en el perfil') de proposito: a frase nao varia, mas o teste de paridade de argumentos exige dois {valor}. Confirmar que '1 me gusta en el perfil' e '9 me gusta en el perfil' estao certos sem plural em 'gusta'. Mesmo padrao em perfil.resenhas.curtidas.

### `perfil.numeros.avaliadas`

'valorada / valoradas' e adjetivo eliptico concordando com 'obra' (feminino), copiando a eclipse do pt ('avaliada'). Sozinho na barra de estatisticas fica '12 valoradas', sem substantivo. Alternativa seria o substantivo 'valoración / valoraciones'. Decisao de estilo que muda a barra inteira e que so nativo fecha.

## Registro incerto

O tradutor ficou em dúvida sobre o tom, ou entre variantes regionais.

### `cadastrar.subtitulo`

"tu lectura es solo tuya" para "a leitura fica só sua". O pt carrega a promessa de privacidade do produto (ReadingSource/ReadingProgress sao privados). Confirmar com nativo se a frase transmite "ninguem mais ve" e nao apenas "e do teu gosto pessoal" — a ambiguidade existe em es e a alternativa seria "tu lectura queda solo para ti", mais longa e mais explicita.

### `autor.erros.indisponivel`

'AniList no respondio ahora. Intentalo de nuevo en unos instantes.' Duas escolhas de neutralidade: usei preterito simples ('no respondio') porque na Espanha o natural seria 'no ha respondido', e o simples se entende nos dois lados; e cortei o artigo do pt ('O AniList'), tratando AniList como nome proprio. Confirmar se 'en unos instantes' soa bem ou se o nativo prefere 'en un momento'.

### `catalogo.erros.indisponivel`

"AniList no respondio ahora. Intentalo de nuevo en unos instantes." Usei preterito simples ("no respondio") por ser o neutro que funciona na LatAm; na Espanha o natural para algo que acabou de acontecer seria o perfeito ("no ha respondido"). Mesma decisao vale em catalogo.vazio.semTermo ("no devolvio nada"). Se o alvo for Espanha, as duas chaves mudam juntas.

### `listas.detalhe.ordenar.antes`

"Mover {titulo} para antes/depois" -> "Mover {titulo} antes" e "Mover {titulo} despues" (mesma duvida vale para .depois). Sao aria-labels de reordenar. Evitei "mas arriba/mas abajo" porque o ingles fugiu do espacial (earlier/later) e o layout pode ser grade. Alternativa mais idiomatica: "Adelantar {titulo}" / "Retrasar {titulo}" — nativo escolhe.

### `listas.erros.semBanco`

"que no respondio ahora" segue a ordem do portugues de perto e pode soar traduzido; "que no respondio ahora mismo" e mais natural. Mantive a versao literal so para casar com as outras strings semBanco dos demais namespaces — se o revisor mudar, mudar em todas.

### `listas.detalhe.vazia`

"adicione obras pelo botao" -> "anade obras desde el boton". Escolhi "anadir" por ser aceito na Espanha e na America Latina; boa parte da LatAm diria "agrega". Decisao de neutralidade que vale fixar para todo o produto, nao so aqui.

### `erros.avaliacao_invalida`

"nota de 0,5 a 5 en media estrella, o resena". Mantive a virgula decimal (padrao CLDR do espanhol generico e igual ao pt), mas Mexico e o mercado hispanico dos EUA escrevem 0.5 com ponto. Se o publico-alvo for majoritariamente mexicano, esta e a unica string do grupo com numero escrito a mao que precisa mudar.

### `erros.falha_interna`

"no fue posible ahora". Evitei "no ha sido posible" porque o preterito perfeito composto marca Espanha; a forma simples funciona nos dois lados. O custo e que em espanhol a frase fica mais seca que o pt "nao foi possivel agora" — nativo julga se soa truncada e se prefere "no se pudo en este momento".

### `erros.sem_fonte`

Representa o grupo de imperativos que reescrevi: sem_fonte ("configura primero…"), cursor_invalido ("indica…"), tipo_de_arquivo_invalido ("envia…"), limite_excedido ("espera…"), sessao_necessaria ("inicia sesion…"), catalogo_indisponivel ("intentalo de nuevo"). As formas do pt (configure, informe, envie, aguarde) sao identicas ao imperativo de USTED em espanhol — se alguem "aproximar" do pt, o produto passa a tratar o usuario por usted sem que a diff pareca suspeita. Nativo confirma que todas estao em tu.

### `estante.erros.banco`

"que no respondió ahora mismo" usa preterito indefinido. Na Espanha o natural seria "no ha respondido"; na America Latina, "no respondió". Fiquei com o indefinido por ser o que passa nos dois, mas e a chave onde a divisao Espanha/LatAm mais aparece neste namespace.

### `home.rodape.verificado`

'verificado em {quando}' -> 'verificado el {quando}'. Confirmei no servico que {quando} e um ISO cru tipo '2026-09-07T14:03:22.123Z', nao uma hora formatada — por isso usei 'el' (data) e nao 'a las' (hora). Se o nativo preferir algo que funcione com qualquer formato: 'verificado: {quando}'. Ler junto com home.saude.resumo.*, que e o {estado} que entra antes do ponto medio.

### `obra.indisponivel`

"AniList no respondió esta vez y esta obra todavía no está en nuestra caché." Duas escolhas para conferir: (1) preterito simples "no respondió" em vez do composto "no ha respondido", que e o natural na Espanha para algo que acabou de acontecer — usei o simples por ser o mais neutro entre Espanha e America Latina; (2) o genero de "caché" ("nuestra caché" vs "nuestro caché"), que varia por regiao.

### `obra.resenhas.minha`

"tú" como etiqueta que marca a propria resenha na lista (o pt usa "você", o en usa "you"). Em espanhol o pronome solto como rotulo de interface e menos comum que em ingles; conferir se um nativo escreveria "tú", "tuya" ou "tu reseña" nesse selo.

### `perfil.estante.gerenciar`

'gestionar en la estantería': 'gestionar' e mais peninsular, 'administrar' mais rioplatense/mexicano. Ambos se entendem, mas quem decide o tom neutro do produto e o nativo. O substantivo 'estantería' esta travado pelo glossario (nao trocar por 'estante', que e a tabua).

### `perfil.avaliadas.vaziaPropria`

'Todavía no has valorado nada. Valora una obra y aparece aquí.' Usei preterito composto aqui e nas irmas (resenhas.vaziaPropria/vaziaOutro, listas.vaziaPropria/vaziaOutro), mas preterito simples em erros.semBanco ('no respondió'). Em boa parte da America Latina o composto soa peninsular; nativo deve decidir se uniformiza tudo no simples ('Todavía no valoraste nada').

## Cresceu de tamanho

Não é erro de tradução: é risco de layout. Vale olhar na tela, em telas estreitas.

### `entrar.acoes.enviar / entrar.titulo / entrar.meta.titulo`

"Entrar" (6 chars) virou "Iniciar sesión" (14). Botao de submit, titulo da pagina e title da aba mais que dobraram. O glossario proibe "Entrar", entao a decisao esta certa, mas alguem precisa olhar o botao no mobile: se quebrar em duas linhas, o unico corte aceitavel seria "Entrar" — que o glossario veta — ou reduzir o padding. Nao encurtar sem decisao de design.

### `entrar.acoes.enviando`

"Entrando…" virou "Iniciando sesión…" (18 chars) dentro do mesmo botao que ja cresceu no estado normal. E o pior caso de largura do grupo. Um nativo confirma se "Iniciando…" sozinho soa completo em es (em pt "Entrando…" soa); se soar, resolve o aperto sem perder sentido.

### `entrar.campos.email / cadastrar.campos.email`

"E-mail" virou "Correo electrónico" (18 chars) como label de campo. O ingles manteve "Email". O glossario permite "correo" onde ficar longo demais — decidir olhando o form real: se o label divide linha com "Contraseña", cortar para "Correo" nas duas chaves ao mesmo tempo.

### `componentes.sair`

'Sair' (4 caracteres) -> 'Cerrar sesion' (13). E o rotulo do glossario e nao ha alternativa curta correta ('Salir' seria ambiguo e foge do glossario), mas triplica a largura num item de menu/botao. Vale olhar a tela no idioma es para ver se quebra linha ou estoura o container.

### `catalogo.botaoEstante.adicionar`

"+ Estante" (8 caracteres) virou "+ Estanteria" (12). O glossario obriga "estanteria" porque "estante" em espanhol e a prateleira, mas isto e um botao curto dentro do cartao do catalogo. Vale um nativo olhar na tela se quebra o layout; alternativa mais curta seria "+ Anadir", perdendo a palavra estanteria.

### `catalogo.botaoEstante.naEstante`

"Na estante" virou "En la estanteria" (16 caracteres contra 10). Mesmo botao da chave acima, no estado ja-adicionado. Se o espaco apertar, "En tu estanteria" ou so "En la estanteria" abreviado precisa de decisao do nativo, nao minha.

### `catalogo.vazio.semResultado`

"Nada encontrado para <forte>{termo}</forte>." virou "No se encontro nada para <forte>{termo}</forte>." — a construcao telegrafica do pt nao existe em espanhol natural. Alternativa mais curta e igualmente idiomatica: "Sin resultados para <forte>{termo}</forte>." Um nativo decide qual combina com o tom quente do resto.

### `cabecalho.entrar`

"Iniciar sesion" (14 caracteres) contra "Entrar" (6) do pt e "Sign in" (7) do ingles. E o termo correto do glossario e nao deve virar "Entrar", mas e o unico item do cabecalho que mais que dobra de tamanho — precisa de olhada no layout do header em tela estreita, nao so na traducao.

### `estante.fonte.trocar`

"fuente" sozinho em es tambem e tipografia, entao num botao solto "Cambiar fuente" leria como "trocar a fonte da letra". Expandi para "Cambiar fuente de lectura" (12 -> 25 caracteres; fonte.configurar cresceu de 18 -> 28 do mesmo jeito). Confirmar se o botao do card aguenta esse comprimento; se nao aguentar, a saida e encurtar o termo do glossario, nao voltar para "fuente" puro. Reparar tambem que fonte.usar ficou curto ("Usar esta fuente") de proposito, por estar dentro do dialogo.

### `obra.avaliacao.resenhar`

"Escribir reseña…" tem mais que o dobro de "Resenhar…" e fica num botao ao lado das estrelas (avaliacao-da-obra.tsx:203), junto com "Editar reseña…". Se apertar no mobile, a alternativa curta e "Reseñar…" (o verbo existe em espanhol, mas soa jornalistico); decidir com a tela na frente.

### `perfil.social.curtir`

'Dar me gusta al perfil' tem 22 caracteres contra 13 de 'Curtir perfil'; e botao inline ao lado de 'Seguir' no cabecalho do perfil de outra pessoa. Se quebrar linha no mobile, a versao curta seria 'Me gusta'.

## Marcado pelo revisor

Apontado na revisão adversarial, sem categoria específica.

### `cadastrar.subtitulo`

INTOCÁVEL — "Estantería" está certo e é o alvo número um de uma "correção" errada. Um revisor que só fala português vai bater o olho em "Estantería" e querer trocar por "Estante", achando que é o cognato óbvio; se isso acontecer, o subtítulo passa a dizer "Prateleira, progresso e resenhas" e ninguém percebe, porque continua parecendo certo em português. Concordo com o tradutor: marcar a chave como fechada. Se for para reforçar, vale um comentário no PR, não uma mudança no valor.

"tu lectura es solo tuya" carrega a promessa de privacidade do produto (ReadingSource/ReadingProgress são privados do dono, invariante do sistema). Um nativo deve dizer se lê como "ninguém mais vê" ou como "é do teu gosto pessoal" — a ambiguidade existe. Alternativa mais explícita: "tu lectura es solo para ti". Não é erro; é a frase de maior custo se o sentido escorregar, porque é a primeira tela que um usuário novo lê.

### `entrar.contaCriada`

"Ahora inicia sesión." traduz o coloquial "Agora é entrar.". Gramaticalmente correto e no tratamento certo (tú), mas o imperativo nu pode soar mais seco em es do que o original soa em pt. Nativo julga; "Ya puedes iniciar sesión." é a alternativa mais calorosa e cabe folgado no `<p role="status">`, que não tem restrição de largura.

### `cadastrar.erros.geral / cadastrar.erros.falhaInterna`

"completar el registro" é fraseado válido e evita o falso amigo "catastro", mas o botão que o usuário acabou de clicar diz "Crear cuenta". Um nativo decide se vale alinhar para "no se pudo crear la cuenta" — mais coerente com a ação — ou manter "registro", que é o termo genérico do fluxo. Se mudar, as duas chaves mudam juntas, e junto com a correção do "ahora" que apontei.

### `entrar.subtitulo`

"De vuelta a la lectura." está correto e natural. O inglês foi possessivo ("Back to your reading.") e o espanhol ficou impessoal com artigo. Nativo diz se "De vuelta a tu lectura." fica mais alinhado ao tom pessoal do resto do catálogo (que usa tú em toda parte). Diferença de calor, não de sentido.

### `entrar.acoes.enviar / entrar.acoes.enviando / entrar.campos.email / cadastrar.campos.email`

Riscos de largura levantados pelo tradutor — verifiquei no código e não procedem: botão é `w-full` em coluna `max-w-sm` e os labels são empilhados, um por linha. "Iniciando sesión…" e "Correo electrónico" cabem sem quebra. Deixo na lista só para que ninguém encurte para "Correo" ou (pior) para "Entrar", que o glossário veta, resolvendo um problema que não existe.

### `componentes.tema.nomes.noturno`

"Noturno" ficou sem tradução, seguindo o precedente do en.json, que também mantém "Noturno". Em inglês isso funciona: a palavra é exótica e lê como nome próprio. Em ESPANHOL não funciona igual — existe a palavra "nocturno", a um caractere de distância, então "Noturno" tende a ser lido como ERRO DE DIGITAÇÃO, não como nome de produto. Sumi e Matcha não têm esse problema (não têm par espanhol quase-homógrafo). Não classifiquei como erro porque é decisão de produto já tomada no inglês, mas é a chave que mais merece o olhar do nativo: ou se assume "Noturno" como marca em todos os idiomas, ou em es vira "Nocturno".

### `autor.erros.indisponivel`

Além do defeito já reportado, sobra uma decisão de neutralidade que só nativo fecha: na Espanha o natural para passado recente é "no ha respondido"; na América Latina, "no respondió". Se a correção for para o presente ("no responde en este momento"), o problema some nos dois lados. Confirmar também "en unos instantes" vs "en un momento" / "en unos momentos" — as três são corretas, mudam o registro.

### `componentes.estrelas.limpar`

"quitar" é o nome acessível COMPLETO do botão: em src/app/(ui)/[locale]/componentes/estrelas.tsx:84-89 o botão não tem aria-label, então o leitor de tela anuncia só "quitar", um verbo transitivo sem objeto. O pt tem o mesmo problema ("limpar"), então há paridade e não é regressão — mas se o nativo for melhorar alguma coisa, "Quitar valoración" é o candidato natural. Também confirmar a caixa: ficou minúsculo espelhando o pt.

### `componentes.estrelas.semNota`

"sin valoración" (14 caracteres) contra "sem nota" (8) e "no rating" (9) do inglês. É texto visível, dentro de um span text-xs tabular-nums (estrelas.tsx:78-81) dimensionado para exibir um número curto como "3,5" quando há nota. Vale abrir a tela em es e ver o quanto o bloco de estrelas se alarga quando a obra não tem nota. Se apertar, "sin nota" é a saída curta — mas contraria o glossário, então é decisão do dono, não do tradutor.

### `autor.obras.vazia`

"No hay obras de manga ni novela registradas en AniList." A gramática está certa (o "ni" depois de negação é obrigatório, e a concordância de "registradas" fecha com "obras"). Restam duas escolhas de estilo para o nativo: "de manga ni novela" vs "de manga ni de novela" (a segunda soa um pouco mais solta), e a moldura no plural vs o singular "Ninguna obra de manga ni novela registrada en AniList.", que é o espelho exato do pt. As três são corretas.

### `componentes.estrelas.grupo`

PRÉ-EXISTENTE, não é culpa do tradutor, mas fica evidente na revisão: "Valoración de 0,5 a 5" usa vírgula decimal (correto em espanhol), enquanto o argumento {nota} da chave irmã componentes.estrelas.nota chega como string crua de número JS em estrelas.tsx:61 e :69 (`${posicao - 0.5}`), ou seja, com PONTO. O leitor de tela vai anunciar "Valoración de 0,5 a 5" no grupo e "0.5 de 5" no botão dentro dele. O mesmo bug existe no pt-BR, então não bloqueia esta entrega — mas convém abrir issue separada, porque a correção certa é formatar o número pelo locale (o componente já importa useFormatter e usa em estrelas.tsx:80) em vez de interpolar o número puro.

### `catalogo.filtros.todos`

A mais importante da lista. Confirmei no código: filtros-catalogo.tsx usa o mesmo t("filtros.todos") nos três Seletor — Tipo (masc.), Género (masc.) e Década (FEM.). Em espanhol o certo com década é "Todas". Não existe resposta única com uma string só; ou aceita a discordância (como o pt já aceita), ou o nativo pede chave por filtro e alguém mexe no componente. Decisão de produto + código, não de tradução.

### `catalogo.cartao.capitulos`

Única chave em que a FORMA da mensagem mudou: pt tem texto simples "{n} capítulos", o es virou plural ICU one/other. Está dentro das regras (sem many, sem =1), o en.json já fez a mesma conversão e page.tsx:167 passa n numérico, então funciona. Mas gera divergência entre locales: com 1 capítulo o es mostra "1 capítulo" (certo) e o pt-BR continua mostrando "1 capítulos" (errado). Ou o pt-BR ganha o mesmo plural, ou fica um bug só do português.

### `catalogo.subtitulo`

Duas decisões de nativo numa frase só. (a) Registro: o arquivo fixa imperativo em tú — "Busca", "añádela", "Inténtalo" (x3) — e está consistente internamente, mas messages/es.json ainda é cópia do pt, então NÃO existe convenção prévia no repo: este arquivo é que vai virar o precedente de tú vs usted para todos os próximos namespaces. Vale cravar agora. (b) "añádela" é a forma da Espanha; em es-419 o comum é "agrégala". Se o alvo for LatAm, esta é a chave a trocar.

### `catalogo.botaoEstante.adicionar`

"+ Estante" (9 chars) virou "+ Estantería" (12). O glossário obriga estantería, então o texto está certo; o risco é layout. É <button> com px-3 py-1.5 text-sm dentro do cartão do grid do catálogo — precisa de olho de nativo na tela renderizada, não de opinião minha. Se apertar, a saída curta é "+ Añadir", perdendo a palavra do glossário.

### `catalogo.botaoEstante.naEstante`

Mesmo botão no estado já-adicionado: "Na estante" (10) virou "En la estantería" (16), +60%. Renderiza como <span> com ícone de visto ao lado (botao-estante.tsx:66), então tem menos pressão que o botão, mas cresce na mesma linha. Alternativas para o nativo escolher: "En tu estantería" (mesmo tamanho, mais quente) ou "Añadida" (curta, perde a palavra do glossário).

### `catalogo.destaques`

"Populares ahora" é da mesma família dos dois problemas que reportei ("ahora" decalcado do "agora"), mas aqui sobrevive porque é título nominal, sem verbo no pretérito. Não marquei como erro. Ainda assim, o natural em espanhol é "Populares ahora mismo" ou "Tendencias ahora". Se o nativo mexer nas duas chaves de erro, olhar esta junto para o "ahora" não ficar meio corrigido.

### `catalogo.filtros.ordens.nota`

"Mejor valoración" respeita o glossário (nota -> valoración), mas quebra o paralelismo do dropdown: as vizinhas são adjetivos concordando com "obras" — "Populares", "Más recientes", "En tendencia" — e esta é sintagma nominal no singular. "Mejor valoradas" mantém a lista uniforme. As duas formas existem em produto espanhol; é escolha de nativo, não erro.

### `catalogo.filtros.ordens.alta`

"Em alta" virou "En tendencia" (o en usou "Trending"). Concordo em ter fugido de "En alza", que puxa para mercado financeiro. Resta escolher entre "En tendencia" e "Tendencias", que é o mais comum em UI espanhola. Nenhuma das duas colide com "Populares", a opção vizinha.

### `catalogo.vazio.semResultado`

"No se encontró nada para <forte>{termo}</forte>." está correto e preserva tag e argumento. O ponto é tom e comprimento: "Sin resultados para <forte>{termo}</forte>." é mais curto e igualmente idiomático, mas mais frio. Como esta mensagem divide a tela com as duas que eu marquei como erro, vale decidir o registro das três de uma vez.

### `listas.indice.subtitulo`

"de los clásicos a las locuras" para "dos classicos as brincadeiras". "Locuras" e loucuras/doidices; o pt "brincadeiras" aqui e listas de brincadeira, e o ingles resolveu com "the silly ones". Nao e erro e o registro leve se mantem, mas e o deslocamento de sentido mais autoral do arquivo e esta na linha mais visivel da pagina. Um nativo confirma se "locuras" nao soa forte demais; alternativa mais proxima do en seria "a las tonterías".

### `listas.indice.ordenar.curtidas`

"Con más me gusta" ao lado de "Recientes" num seletor de ordenacao. Esta correto e a invariabilidade de "me gusta" realmente impede "más gustadas", mas sao tres palavras contra uma do vizinho e pode quebrar o controle no mobile. Nativo decide entre manter, encurtar para "Más me gusta" (fica ambiguo com "gosto mais") ou "Más populares" (perde precisao).

### `listas.detalhe.vazia`

Dois pontos numa string so. "añade" vs "agrega": anadir e aceito nos dois lados do Atlantico e boa escolha de neutralidade, mas boa parte da LatAm diria "agrega" — e decisao que precisa valer para o produto inteiro, nao so para esta chave, entao fixe agora antes dos outros namespaces. E "desde el botón" para o pt "pelo botao": "desde" e usado em UI espanhola, mas "con el botón" (que e o caminho do ingles, "with the list button") e mais direto.

### `listas.detalhe.curtida.descurtir`

"quitar el me gusta a la lista" — a preposicao esta certa (quitar pede dativo com "a": quitarle el me gusta a algo), entao nao mexer para "de la lista" achando que corrige. O que merece olho nativo e a colisao: "quitar" aparece aqui como tirar a curtida e em detalhe.remover como tirar a obra da lista, dois sentidos do mesmo verbo em botoes da mesma tela. Ambos sao a traducao certa isoladamente; se incomodar em conjunto, o par curtida vira "dar/quitar me gusta" sem o complemento.

### `listas.detalhe.remover`

"quitar" esta correto e foi a decisao mais importante do arquivo — "remover" em espanhol e mexer/agitar (revolver la sopa) e teria passado batido por qualquer revisor lusofono. Marco so para que o nativo confirme que "quitar" sozinho, minusculo, funciona como rotulo de botao de link (acoes-da-lista.tsx:50) sem complemento; a alternativa seria "quitar de la lista", mais longa.

### `listas.detalhe.autoria`

"por <autor>{username}</autor> · {n, plural, one {# obra} other {# obras}}". Tecnicamente correto: one/other sem many, # mantido, obra/obras conforme decisao do dono do repo e concordancia feminina certa. Vale so o olho nativo na leitura em voz alta do conjunto com o ponto medio — "por Ana · 3 obras" — e a confirmacao de que "obra" nao soa a obra de construcao neste contexto de catalogo, que e a unica leitura concorrente da palavra em espanhol.

### `erros.status_invalido`

"estado invalido". Confirmei no pt-BR.json que "status" nao e so nome de campo de API: e vocabulario de tela em outros namespaces — estante.seletorStatus ("Status da obra"), estante.filtros.rotulo ("Filtrar por status"), perfil.estante.abas ("Status") — e perfil.estante.vazia tem o argumento ICU {status}, cujo NOME nao pode mudar. Se "estado" ficar aqui, quem traduzir estante/ e perfil/ tem que escrever "estado" tambem, senao o idioma fica com dois nomes para a mesma coisa. Decisao vale para o arquivo inteiro, e precisa ser tomada antes dos proximos grupos, nao depois.

### `erros.template_invalido`

"plantilla invalida — vuelve a derivarla". Verifiquei que o referente existe no pt: estante.fonte.derivar ("Derivar") e estante.fonte.derivando ("Derivando…"), entao "derivarla" tem ancora real — desde que o tradutor de estante/ use o verbo derivar. Segunda decisao independente: plantilla vs template; o en manteve "template" e parte do publico dev hispanico tambem diz template.

### `comum.formato.NOVEL`

"Novela" e do glossario, mas em espanhol novela remete primeiro a romance literario e, para muita gente, a telenovela — nao ao formato web novel asiatico. A palavra aparece duas vezes (aqui e em meta.descricao), entao mudar exige mudar as duas juntas. Nativo do nicho decide se fica Novela ou vira Novela ligera / Novel.

### `cabecalho.entrar`

"Iniciar sesion" (14 caracteres) contra "Entrar" (6) do pt e "Sign in" (7) do en. O termo esta correto pelo glossario e NAO deve virar "Entrar" — o risco e de layout, nao de traducao: e o item que mais cresce na barra de navegacao. Junto com estante (7 -> 10), o cabecalho inteiro fica mais largo em tela estreita.

### `cabecalho.estante`

"Estanteria" e a escolha certa (estante em espanhol e a prateleira), mas e a palavra mais repetida do produto e cresce de 7 para 10 caracteres ao lado de Catalogo e Listas. Vale a confirmacao do nativo de que Estanteria e o nome natural da colecao pessoal, e nao "Biblioteca", antes de o termo se espalhar pelos outros namespaces.

### `erros.proprio_perfil`

"no vale para tu propio perfil". Duas coisas: o registro de "no vale" e coloquial e soa peninsular (na America Latina o padrao seria "no aplica a tu propio perfil"); e o es introduziu "tu", que o pt nao tem ("o proprio perfil", impessoal) — nisso acompanha o en ("your own profile"), entao nao e erro, e escolha. Nativo julga o registro.

### `erros.entrada_nao_encontrada`

"entrada no encontrada". Em espanhol "entrada" e primeiro ingresso/bilhete; o sentido de registro (entrada de blog, de dicionario) existe mas e o secundario. O pt tem a mesma ambiguidade, entao a traducao e fiel — mas ninguem vai questionar isso numa revisao lusofona. Confirmar se "entrada" e o nome do registro da estante no produto ou se o certo e "elemento"/"registro".

### `erros.avaliacao_invalida`

Alem do achado de "en media estrella": esta e a unica string do grupo com numero escrito a mao. A virgula decimal (0,5) segue o CLDR do espanhol generico e o pt, mas Mexico e o mercado hispanico dos EUA escrevem 0.5 com ponto. Se o publico-alvo pender para la, e a unica chave que muda.

### `erros.cursor_invalido`

"indica antesDe con el id del comentario". O nome tecnico antesDe foi preservado, igual a anilistId em anilist_id_invalido — isso esta certo e nao pode ser traduzido. O que vale olhar e o verbo: "indicar ... con" e um pareamento estranho; o en usa "pass", que em espanhol seria "pasa antesDe con el id" ou "envia antesDe con el id".

### `erros.lista_ou_obra_nao_encontrada`

"lista U obra no encontrada" esta CERTO — a conjuncao o vira u antes de palavra iniciada por o-. Marco aqui como armadilha inversa: para quem le portugues parece erro de digitacao, e o risco real e alguem "consertar" para "lista o obra". NAO TOCAR.

### `erros.comentario_tamanho_invalido`

"comentario vacio o demasiado largo" esta CERTO — largo em espanhol e comprido. Mesmo caso da anterior: o perigo e a correcao indevida para "extenso" ou, pior, para "ancho". NAO TOCAR.

### `erros.url_de_capitulo_invalida`

"pega la URL completa del capitulo 1" esta CERTO — pegar e colar (paste), padrao em Espanha e America Latina. Soa errado ao revisor lusofono. Ponto secundario para o nativo: o arquivo trata URL como feminino nas duas chaves ("la URL", "URL de lectura invalida"), o que e consistente; se preferir masculino, muda nas duas. NAO TOCAR o verbo.

### `erros.ordem_invalida`

"el orden debe contener exactamente las obras de la lista" esta CERTO — el orden e sequencia, la orden e comando. O pt "a ordem" e feminino e induz ao erro. NAO TOCAR o artigo.

### `erros.pedido_invalido`

"solicitud invalida". Correto e bem escolhido ("pedido" em espanhol e encomenda comercial). Fica de gosto do nativo entre solicitud e peticion, mais comum em documentacao tecnica de Espanha; o que nao pode e voltar para pedido.

### `estante.avaliacao.remover`

Concordo com a duvida do proprio tradutor, e acrescento um dado que ele nao considerou: o pt DISTINGUE "Remover" (este botao, desfaz a sua propria nota) de "Apagar" (obra.apagar.confirmar = "Apagar o texto da resenha também apaga {itens}", destrutivo). O glossario so manda apagar -> eliminar. Traduzindo remover TAMBEM como "eliminar", as duas acoes viram a mesma palavra em es e a distincao do produto some. No codigo (avaliar.tsx:196-205) o botao e um link sublinhado discreto ao lado de Guardar/Cancelar, nao um botao de perigo — o peso de "Eliminar" nao casa com o desenho. Minha recomendacao: "Quitar" aqui e "no se pudo quitar" em erros.remover, deixando "eliminar" reservado para apagar. Um nativo decide, mas decide as duas chaves juntas.

### `estante.filtros.tudo`

"Todo" no neutro singular. O chip corre sobre obras (feminino plural) e fica numa <nav> de pills junto com os cinco status (page.tsx:103). O proprio pt do produto ja usa "Todos" em catalogo.filtros.todos e "Todas" em perfil.filtros.todas — so a estante usa "Tudo". Em es a leitura mais comum de chip de filtro sobre uma colecao feminina e "Todas". Nao consegui julgar em contexto porque comum.status.* ainda esta em portugues no es.json: a fileira hoje seria "Todo | Lendo | Concluído | ...". Fechar essa escolha antes de traduzir os outros filtros do produto, porque vira padrao.

### `estante.fonte.rotuloUrl`

"Pega el enlace del capítulo 1 del sitio donde lees" empilha dois genitivos (del... del...) e muda a ancoragem: o pt e o en dizem que o link esta NO site ("no site onde você lê" / "on the site where you read"), e o es diz que o capitulo 1 e DO site. Da no mesmo na pratica, mas soa a traducao. Um nativo provavelmente escreveria "Pega el enlace del capítulo 1 en el sitio donde lees". E o rotulo do campo onde o usuario faz a acao central do fluxo de fonte, entao vale a passada de olho.

### `estante.erros.registrar`

Terceira ocorrencia do padrao preterito + "ahora mismo" ("no se pudo registrar ahora mismo"). Diferente de erros.banco e erros.rede, essa le razoavelmente bem porque o verbo pleno absorve o adverbio, entao NAO listei como problema. Mas a decisao de estilo tem que ser uma so para as tres chaves — se o nativo trocar banco e rede para presente, esta aqui provavelmente acompanha.

### `estante.fonte.derivar`

Endosso o risco do tradutor. "Derivar" como botao solto em es puxa para derivada (matematica) ou encaminhar; "Detectar" seria transparente. Levantei o custo: mexer aqui move QUATRO chaves juntas — fonte.derivar, fonte.derivando ("Derivando…"), erros.derivar ("no se pudo derivar") e o "deriva de nuevo" no fim de fonte.paginaDica. E termo de produto, entao a decisao e do dono, nao do tradutor.

### `estante.vazia`

"añade" (peninsular) x "agregar" (latino-americano). Nao e erro, os dois se entendem em toda parte, mas e a primeira vez que o verbo aparece e vira precedente: catalogo.botaoEstante.adicionar, catalogo.subtitulo, home.boasVindas.estanteVazia, obra.painel.adicionar e listas.detalhe.vazia todos vao pedir o mesmo verbo. Fechar agora e propagar, senao o produto sai misturado.

### `estante.progresso.atual`

"en el cap. {capitulo}" x o coloquial "voy por el cap. 57". Confirmei no codigo que o acoplamento que o tradutor temia e real e apertado: editar-progresso.tsx:84 renderiza progresso.atual como rotulo do botao e a linha 91 renderiza progresso.prefixo colado no input, no mesmo componente — mudar uma sem a outra deixa a UI incoerente entre o estado de leitura e o de edicao. Como "prefixo" precede um <input> de 14 caracteres, "por el cap." tambem cabe. Nativo decide o par.

### `estante.progresso.campo`

Baixo o risco que o tradutor levantou: "Capítulo actual" e aria-label do input (editar-progresso.tsx:98), nunca renderiza como texto visivel — o rotulo que a pessoa VE e progresso.prefixo. A nuance perdida de "em leitura" custa quase nada aqui; so precisa continuar descrevendo bem o campo para leitor de tela.

### `estante.erros.avaliacaoVazia`

"pon una valoración o escribe la reseña". Endosso a duvida: "poner nota" carrega tom escolar em es, e o glossario ja da o verbo proprio (valorar). "valora o escribe la reseña" fica mais curto e mais idiomatico. Detalhe que trava a forma: a chave e minuscula sem ponto final e aparece como <p role="alert"> (avaliar.tsx:181-185), entao o substituto tem que continuar minusculo e curto.

### `estante.fonte.trocar`

O risco de layout que o tradutor levantou eu CONSIGO descartar: fonte.trocar/fonte.configurar nao renderizam num botao de largura fixa — sao um <button> estilizado como link sublinhado (configurar-fonte.tsx:139-146, className "text-sm text-acento underline"), num fluxo de coluna. 25 e 28 caracteres cabem sem quebrar nada. O que sobra para o nativo nao e comprimento, e se "fuente de lectura" e mesmo a expansao certa do glossario, ja que ela vai se repetir em fonte.usar depois da correcao.

### `obra.contagem.aberturas`

"lectura/lecturas" para "abertura" e defensavel (o en fez o mesmo com "reads"), mas colide com o termo de glossario: renderiza no MESMO summary de historico.titulo e com CSS uppercase (page.tsx:406-411) — "HISTORIAL DE LECTURA · 7 LECTURAS". Ler os dois juntos em voz alta. Alem da repeticao, "7 lecturas" perde o "7 vezes que abriu" e sugere "7 obras lidas". Na mesa: aperturas, veces, accesos.

### `obra.contagem.capitulos`

"{n} capítulos" cru, sem plural — confirmei renderizando: n=1 sai "1 capítulos". E decisao registrada no codigo para o pt (comentario em page.tsx:202-203, one-shot e agrupamento de milhar), e o en divergiu dela. Para um nativo espanhol "1 capítulos" le como erro de concordancia, nao como escolha. Decidir explicitamente se a excecao do pt vale para es.

### `obra.nota.titulo`

Colapso de "Nota" e "avaliação" num unico "valoración", afetando cinco chaves de uma vez: nota.titulo ("Valoración de Kidoku"), nota.distribuicao, avaliacao.titulo ("Tu valoración"), resenhas.nota ("Valoración {nota} de 5") e contagem.avaliacoes ("{n} valoraciones"). Segue o glossario e o en, mas o produto passa a nao distinguir o numero do ato. Se mudar para puntuación, muda nas cinco.

### `obra.resenhas.vazio`

"valórala con unas palabras y la tuya aparece": o "la" de valórala e SINGULAR, entao gramaticalmente nao pode se prender a "reseñas" (plural) — sobra a obra, que a string nunca nomeia, so o contexto da pagina. Junto com "la tuya" (= tu reseña) a frase carrega dois pronomes com referentes diferentes em uma linha. Nao esta errado, mas e a frase mais dependente de contexto do arquivo. Alternativa: "valora la obra con unas palabras".

### `obra.painel.convite`

Na mesma frase que comeca com "Inicia sesión", o final diz "registrar tu lectura" — e "registrarse" e justamente crear cuenta no glossario. O olho pode tropecar em "registrar" ali. Junto disso, "añadirla"/"valorarla" (e "Añádela" em painel.adicionar) sao cliticos que o pt nao tem e cujo referente so existe fora da string. Alternativas: "llevar el registro de tu lectura", "registrar tu progreso".

### `obra.resenhas.minha`

"tú" como selo ao lado do username (review-social.tsx:242). Ha precedente em apps em espanhol (WhatsApp e Instagram usam "Tú" para o proprio), entao provavelmente passa — confirmar so se o nativo prefere "tuya" ou "tu reseña", e se a minuscula incomoda num selo que fica dentro de uma pill.

### `obra.indisponivel`

Duas coisas: (1) "no respondió esta vez" traduz "não respondeu agora" — "esta vez" sugere que houve outras tentativas, o que o pt e o en ("just now") nao dizem; (2) o genero de "caché" varia por regiao ("nuestra caché" x "nuestro caché"). Nenhuma das duas quebra a mensagem, mas as duas sao invisiveis para quem le portugues.

### `obra.historico.fonteRemovida`

"fuente eliminada" aparece na lista do historico, na mesma linha que "cap. 12" e a data. "Fuente" tambem e a fonte tipografica em espanhol — a mesma ambiguidade que o pt tem, mas aqui sem "de lectura" para desfazer. O en resolveu expandindo ("reading source removed"). Confirmar se cabe "fuente de lectura eliminada".

### `obra.apagar.confirmar`

"Eliminar el texto de la reseña también elimina {itens}. ¿Continuar?" — {itens} vem do Intl.ListFormat (avaliacao-da-obra.tsx:134-136) e chega como "1 comentario" ou "2 me gusta y 1 comentario". A escolha de deixar o verbo no singular concordando com o infinitivo-sujeito nao quebra em nenhum dos casos, mas um nativo pode preferir "Al eliminar el texto de la reseña también se eliminan {itens}" — que ai quebra com 1 item. Ler nos dois casos antes de mexer.

### `obra.modal.placeholder`

"será pública para otros lectores": a colocacao idiomatica em espanhol e "visible para otros lectores"; "pública para alguien" e a transferencia direta do "fica pública para outros leitores". Nao esta errado, mas e o ponto do arquivo em que mais se ouve o portugues por baixo.

### `obra.avaliacao.resenhar`

"Escribir reseña…" tem mais que o dobro de "Resenhar…", num botao que fica ao lado das estrelas e alterna com "Editar reseña…" (avaliacao-da-obra.tsx:203). Se apertar no mobile, a alternativa curta e "Reseñar…". Decidir com a tela aberta em es.

### `obra.resenhas.verAnteriores`

"ver 1 anterior" / "ver 3 anteriores" espelha a elipse do pt; o en preferiu explicitar ("earlier comment(s)"). Em espanhol o adjetivo sozinho sem substantivo e mais seco — confirmar se, embaixo de uma thread de comentarios, um nativo entende de primeira ou se quer "ver 3 comentarios anteriores".

### `home.saude.estado.down`

A armadilha para QUEM EDITAR DEPOIS, nao para quem traduziu. Este valor e concatenado apos o nome da dependencia em page.tsx:60-77 (`${nome} ${estado}`), e os dois nomes tem genero oposto: "base de datos" (fem) e "catálogo AniList" (masc). Por isso as tres formas sao invariaveis: "respondiendo", "sin respuesta", "sin configurar". Se um nativo "melhorar" para "caído" ou "no configurado", metade das combinacoes sai com concordancia errada na tela e nenhum teste pega. Vale igual para home.saude.estado.not_configured. Se quiserem mesmo "caído", a saida e mudar o codigo para nao concatenar, e ai e mudanca de logica — parar e perguntar antes.

### `home`

VARIANTE REGIONAL MISTURADA — ninguem levantou isso. O locale e "es" neutro, mas o arquivo tem marcas dos dois lados: "añade" e "ahora mismo" puxam para Espanha; "vitrina" e o preterito indefinido em "no respondió ahora mismo" puxam para America Latina (na Espanha o natural com "ahora mismo" e o preterito perfecto, "no ha respondido"). Nada disso e erro isolado, mas o conjunto soa hibrido. Antes de traduzir os outros namespaces, decidir a variante (es neutro tendendo a es-419, que e o publico maior de manhwa/novel, ou es-ES) e registrar junto do glossario — depois de 346 strings sai caro uniformizar.

### `home.populares.indisponivel`

"El catálogo no respondió ahora mismo — inténtalo de nuevo en unos instantes." O par indefinido + "ahora mismo" e o ponto onde a variante mais aparece (ver item anterior). Um leitor da Espanha esperaria "no ha respondido". Saidas neutras que funcionam nos dois lados: "El catálogo no responde ahora mismo" (presente) ou "El catálogo no respondió — inténtalo de nuevo en unos instantes" (tirando o "ahora mismo"). O resto da frase esta impecavel.

### `home.resenha.spoiler`

"Contiene spoiler — léela en la página de la obra." O clitico "la" nao tem antecedente na string: o substantivo mais proximo antes dele e "spoiler", que e masculino. No card a string SUBSTITUI o texto da resenha (vitrine-cards.tsx:73), entao a palavra "reseña" nao aparece por perto, e no leitor de tela a frase e ouvida isolada. Nao e agramatical e o contexto visual resolve, mas e o unico ponto do arquivo onde a frase deixou de ser autossuficiente — o pt ("leia na página da obra") nao tem pronome nenhum. Se o nativo achar solto: "lee la reseña en la página de la obra".

### `home.vitrine.resenhas.vazio`

"vitrina": entendido em todo lugar, mas na Espanha "vitrina" e o movel de vidro e a montra de loja e "escaparate"; na America Latina "vitrina" e o termo corrente. O mesmo texto esta em home.vitrine.listas.vazio — se mudar, mudar nos dois. Alternativa que dispensa nomear a secao e resolve a variante: "la primera aparece aquí". Observacao a favor de manter: o en usou "showcase", que tambem nomeia a secao.

### `home.apresentacao.descricao`

Dois pontos, ambos de gosto. (a) O fecho "una estantería que es tuya" tem 3 palavras a mais que "estante sua" — e a linha do hero de quem nao esta logado; conferir na tela se nao quebra feio, alternativas curtas: "y una estantería tuya" ou "tu estantería, solo tuya". (b) "manga, manhwa y novela": "novela" segue o glossario de formato, mas em espanhol "novela" e a palavra corrente para romance/livro, entao numa lista corrida um nativo pode ler como categoria literaria, nao como o formato asiatico. Precedente do en registrado no doc da feature: la o tradutor usou o plural ("manga, manhwa, and novels") porque o singular nao fechava a lista — vale checar se "novelas" nao fica melhor aqui tambem.

### `home.boasVindas.semFonte`

"Ahora no hay nada en lectura con fuente configurada" — "nada en lectura" e o unico calco visivel do portugues ("nada em leitura") no arquivo. "En lectura" existe em espanhol de comunidade leitora e o app usa "Leyendo" como status, entao nao chamo de erro; mas um nativo escreveria "no hay ninguna obra en lectura con la fuente configurada" ou "nada de lo que estás leyendo tiene fuente configurada" (o en foi por esse caminho). Segundo ponto menor: o pt/en dizem "na sua estante"/"in your shelf" e o es diz "en la estantería" — "en tu estantería" fica mais proximo do original e mais quente. E a string mais longa do arquivo, conferir na tela.

### `home.contagem.curtidas`

"{n, plural, other {me gusta}}" — so o ramo `other`, declarando que a palavra nao varia. Isso e valido para o teste (a excecao "invariavel" existe de proposito) e bate com a norma: o plural de "me gusta" e invariavel ("cien me gusta"). Confirmar com nativo mesmo assim, porque na fala aparece "me gustas" e, se a decisao mudar, tem que virar one/other NAS DUAS chaves (home.contagem.curtidasLeitorDeTela e a versao do leitor de tela) — e ai `many` continua dobrado em `other`, que ja esta registrado. Conferi o render: o numero vem de fora da mensagem, entao sai "1 me gusta" e "5 me gusta".

### `home.resenha.notaAria`

"Valoración {nota} de 5" segue o glossario (avaliacao -> valoración) e e coerente com o en ("Rating"). O risco nao esta neste arquivo: existe notaAria tambem em obra, perfil e estante, que outra pessoa vai traduzir. Se la sair "Puntuación" ou "Nota", o produto fica com tres palavras para a mesma coisa e nenhum teste pega, porque paridade de chave e argumento continuam corretas. Fixar "valoración" no glossario antes do proximo namespace.

### `home.rodape.verificado`

"verificado el {quando}". Confirmei no codigo que {quando} e ISO cru — health.service.ts:51 faz toISOString() e page.tsx:150 injeta direto —, entao renderiza "verificado el 2026-09-07T14:03:22.123Z". Com "el" esta correto para data e evita o erro que "a las" seria; so fica estranho por causa do formato cru, que ja e feio no pt e no en tambem. Se um dia formatarem essa data, revisar esta chave junto (hora pediria "a las"). Alternativa a prova de formato: "verificado: {quando}".

### `perfil.social.curtir`

CORRIGE O RISCO RELATADO: o tradutor achou que "Dar me gusta al perfil" é botão inline que pode quebrar linha no mobile. Não é. Em src/app/(ui)/[locale]/u/[username]/acoes-sociais.tsx:99-101 essa string entra SÓ como aria-label e title de um botão que renderiza um ícone de coração + o total; não há texto visível. Comprimento é irrelevante e encurtar para "Me gusta" pioraria o leitor de tela. O que sobra para o nativo é só a regência: "al perfil" vs "del perfil" (o lote usa o mesmo padrão em listas.json:43-44, "dar/quitar el me gusta a la lista", então trocar aqui exigiria trocar lá).

### `perfil.estante.abas`

RISCO DO TRADUTOR PODE SER FECHADO: ele temeu que "Estado" brigasse com o namespace estante. Conferi o arquivo irmão — estante.json:12 "Estado de la obra", estante.json:14 "Filtrar por estado", base.json:39 "estado inválido". Está consistente. Só decidir se "Status" é termo de marca do produto (pt e en mantiveram).

### `perfil.numeros.curtidasDadas`

"one {me gusta dado} other {me gusta dados}" é o único ponto onde "me gusta" ganha modificador variável. A regra do glossário foi respeitada (o substantivo nunca recebeu -s), e a concordância do particípio com sintagma plural está formalmente certa, mas "1 me gusta dado" numa barra de estatística é estranho e "me gusta dados" é pouco usado em UI real. Alternativas para nativo julgar: "me gusta en total" (invariável) ou "me gusta que diste".

### `perfil.numeros.avaliadas`

"valorada / valoradas" é adjetivo elíptico concordando com "obra", copiando a elipse do pt. Na barra sai "12 valoradas" sem substantivo, e na mesma tela avaliadas.titulo é "Valoradas". O lote usa o substantivo em obra.json:14 ("{n} valoración / valoraciones") para um conceito PARECIDO mas diferente (avaliações recebidas pela obra). Decisão de estilo que muda a barra inteira; só nativo fecha.

### `perfil.filtros.ordens.maior_nota`

"Mayor valoración" / "Menor valoración": em espanhol "mayor" também lê como quantidade, então pode ser entendido como "mais valorações" em vez de "nota mais alta" — ambiguidade que "Maior nota" não tem em pt. Alternativas: "Valoración más alta / más baja" ou "Mejor valorada / Peor valorada".

### `perfil.estante.gerenciar`

"gestionar en la estantería" copiou a preposição do pt ("gerenciar NA estante"). O texto é o rótulo de um <Link href="/estante"> (minha-estante.tsx:42-47), ou seja, leva PARA a estanteria — o inglês reescreveu como "manage your shelf". "gestionar la estantería" seria mais direto. Some-se a isso o tom: "gestionar" é mais peninsular, "administrar" mais latino-americano.

### `perfil.voce`

"tú" em minúscula. Renderiza como pílula ao lado do próprio username (u/[username]/page.tsx:110). Em espanhol o rótulo de identidade nessa posição costuma vir maiúsculo ("Tú"); confirmar com nativo — o pt está minúsculo, então a escolha é defensável, mas é decisão de UI, não de tradução.

### `perfil.avaliadas.vaziaPropria`

Consistência de tempo/advérbio ALÉM do problema já relatado: perfil usa "Todavía" 7 vezes e pretérito composto ("no has valorado"), enquanto home.json usa "Aún" (linhas 34, 38, 48) e obra.json usa "Todavía". O lote inteiro está misturado — vale unificar antes do merge, e a escolha (composto peninsular vs simples latino) é do nativo.
