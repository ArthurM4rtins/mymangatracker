# Revisão do fr — o que olhar primeiro

Este arquivo existe porque **ninguém do time fala fr**.

A tradução foi feita com revisão adversarial independente, mas isso não
substitui um falante nativo. O que ele substitui é a leitura das 346 strings:
os agentes marcaram, chave a chave, onde a tradução foi arriscada e por quê.
**Comece por aqui, não pelo catálogo inteiro.**

Corrigir é trocar um valor em `messages/fr.json`. As chaves são as mesmas em
todos os idiomas, e `tests/i18n/` impede que a correção quebre os outros.

| tipo | chaves |
|---|---|
| Falso amigo — o mais perigoso | 5 |
| Termo do produto | 29 |
| Expressão idiomática | 16 |
| Plural e gênero | 15 |
| Registro incerto | 13 |
| Cresceu de tamanho | 10 |
| Marcado pelo revisor | 94 |

## Falso amigo — o mais perigoso

Palavras que **estão certas** e que um revisor lusófono vai querer "corrigir" para o cognato do português. Se isso acontecer, o texto passa a dizer outra coisa e **continua parecendo certo**. Confirme antes de mexer.

### `erros.limite_excedido`

AVISO AO REVISOR: "attends avant de reessayer" esta CORRETO e nao deve ser "corrigido". "attendre" e o falso amigo classico (parece "atender", e "esperar") e aqui o sentido pretendido e justamente esperar, que e o do pt "aguarde". Deixo a chave na lista so para que ninguem troque por "reponds" ou "sers" achando que consertou. Confirmar apenas o imperativo tu "attends" (com s), que e a forma certa.

### `erros.pedido_invalido`

"requete invalide". Evitei "demande" de proposito: "demander" e PEDIR, e "demande invalide" soaria como pedido/solicitacao humana, nao como HTTP request. "requete" e o termo tecnico certo. So confirmar que combina com erros.corpo_invalido ("corps invalide — JSON attendu"), que fala do corpo da mesma requisicao.

### `perfil.estante.titulo`

"Minha estante" -> "Ma bibliotheque". Intocavel: em frances "etagere" e a prateleira/tabua de madeira e "librairie" e a loja de livros, nao a colecao. Um revisor que so le portugues vai achar "bibliotheque" (= biblioteca) errado e vai querer "corrigir", e a tela passa a falar de moveis. Vale igual para estante.gerenciar ("gerer dans la bibliotheque"). O nativo so precisa confirmar se, no titulo da secao do proprio perfil, ele diria "Ma bibliotheque" ou "Ma collection" — as duas existem, mas o glossario ja fixou bibliotheque.

### `obra.erros.limite`

"trop de commentaires en peu de temps — attends un peu". "attends" esta CERTO aqui: attendre = esperar, e e exatamente esse o sentido. O risco e o inverso do normal — um revisor lusofono que conhece a armadilha "attendre nao e atender" pode achar que a palavra esta errada por reflexo e trocar por "patiente" ou "repond". "repondre" seria um erro grave. Marcar como intocavel; a unica alternativa legitima e "patiente un peu", que e sinonimo e um pouco mais formal.

### `obra.nota.distribuicao`

"Repartition des notes" (aria-label do grafico de histograma). Um revisor lusofono vai querer "Distribution", pelo cognato — e "distribution" existe em frances, mas puxa para distribuicao comercial/entrega; para grafico estatistico o frances corrente e "repartition". Confirmar com o nativo e, se ele aprovar, marcar como intocavel para nao voltar no proximo passe de revisao.

## Termo do produto

Escolhas de vocabulário que valem para o idioma inteiro. Mudar uma aqui obriga mudar todas as outras ocorrências.

### `autor.obras.titulo`

Titulo de secao da pagina de autor, uma palavra sozinha na tela: "Obras". Em espanhol a decisao passa despercebida porque a palavra existe no idioma; em frances "obras" nao existe e nao lembra nada — o leitor le como bug ou texto nao traduzido, sem nenhum contexto ao redor para salvar. E o pior caso da decisao de manter o termo em portugues em todo o app. Se a decisao for revista, o frances natural aqui e "Œuvres".

### `autor.obras.vazia`

Traduzi o formato NOVEL como "roman", conforme a tabela. "Roman" em frances e romance literario comum; o publico de manga fala "light novel" ou "novel" e pode nao reconhecer a categoria por esse nome. O mesmo termo deve estar no filtro do catalogo e no rotulo de formato da obra — decidir de uma vez para os dois lugares.

### `entrar.meta.titulo / entrar.titulo / entrar.acoes.enviar`

Usei "Se connecter" nas tres, seguindo o glossario e a repeticao de "Entrar" no pt. O idioma frances tende a separar: substantivo no titulo da pagina e no <title> do navegador ("Connexion"), infinitivo so no botao ("Se connecter"). Um verbo no infinitivo como titulo de pagina e aceitavel mas nao e o default. Se o revisor concordar em separar, e mudanca de glossario, nao de string solta — precisa voltar para quem definiu o glossario, e afeta tambem o texto dentro de <link> em cadastrar.jaTemConta.

### `cadastrar.erros.geral / cadastrar.erros.falhaInterna`

Na mesma tela o botao diz "Creer un compte" e o erro diz "impossible de finaliser l'inscription". Sao dois vocabularios para a mesma acao — o glossario autoriza os dois (s'inscrire / creer un compte), mas o usuario que acabou de clicar em "Creer un compte" le um erro sobre "inscription". O pt tem o mesmo descompasso ("Criar conta" / "o cadastro"), entao pode ser intencional. Se o revisor quiser alinhar: "impossible de creer le compte" / "impossible de creer le compte pour le moment".

### `estante.seletorStatus`

"Statut de l’obra". Aqui a decisao de manter "obra" em portugues fica exposta: o leitor frances ve uma elisao francesa colada numa palavra que nao existe no idioma dele. Tratei "obra" como FEMININO no arquivo inteiro (l’obra, ta premiere obra, la page de l’obra) por causa da terminacao em -a e do paralelo com "oeuvre". Se a decisao mudar, o substituto natural e "oeuvre" e a concordancia ja esta pronta.

### `estante.fonte.paginaSemCandidatos`

Frase mais densa do namespace e onde "obra" mais incomoda: "Enregistre la page de l’obra : le bouton ouvre la page et tu indiques le chapitre ici." Duas ocorrencias de "page" e uma de "l’obra" em duas oracoes. Traduzi o segundo "registra" como "indiques" (e nao "enregistres") para nao repetir o verbo tres vezes na mesma frase, e porque "noter" esta reservado a avaliacao pelo glossario. Vale um nativo ler em voz alta.

### `estante.erros.registrar`

O pt distingue SALVAR e REGISTRAR (erros.salvar vs erros.registrar). O frances de UI colapsa os dois em "enregistrer": ficaram "impossible d’enregistrer — reessaie" e "impossible d’enregistrer pour le moment". Sao mensagens de contextos diferentes (salvar formulario vs registrar leitura) e nunca aparecem juntas, mas se aparecerem lado a lado no mesmo ecra vao parecer duplicadas. Alternativa se incomodar: "consigner" para registrar — mas e formal demais para o tom do produto.

### `estante.fonte.derivar`

"Deriver" / "Derivation…" (fonte.derivando). Em frances "deriver" carrega sentido matematico e linguistico; como acao de produto ("deduzir o padrao da URL a partir do link do cap. 1") pode soar opaco para o usuario final. Mantive porque e o termo da origem e o mesmo em en/es, e o fluxo inteiro do onboarding de fonte depende dessa palavra. Se um nativo achar hermetico, a troca teria que ser coordenada com os outros idiomas.

### `comum.formato.NOVEL`

Escrevi "Roman" como manda o glossario, mas o leitor de manga francofono diz "light novel" ou "novel" — "roman" evoca romance literario impresso, nao web novel coreana/chinesa. Como e rotulo de FORMATO ao lado de Manga/Manhwa/Manhua (todos mantidos em japones/coreano/chines), "Roman" e o unico da linha que foi traduzido, o que quebra o padrao visual da lista. Perguntar ao revisor: o filtro de formato deveria dizer "Roman", "Novel" ou "Light novel"?

### `erros.avaliacao_invalida`

O pt tem DUAS palavras ("avaliacao invalida — nota de 0,5 a 5") que o glossario manda traduzir para a MESMA palavra francesa (note). Traducao literal daria "note invalide — note de 0,5 a 5", repetitivo. Cortei a segunda: "note invalide — de 0,5 a 5 par demi-etoile, ou une critique". Alternativa se o revisor achar seco: usar "evaluation invalide" no primeiro, mas isso quebra o glossario. Confirmar tambem "par demi-etoile" (vs "par pas de 0,5") e que a virgula decimal "0,5" esta certa — esta, em frances.

### `erros.template_invalido`

Traduzi "template" por "modele" e "derivacao" por "derivation". O en manteve "template"; dev francofono tambem diz "template" no dia a dia. E jargao interno (o modelo de URL derivado do capitulo 1), entao a duvida real e se essa string chega a aparecer para o usuario final. Se aparece, "modele invalide — refais la derivation" e obscuro em qualquer idioma e vale reescrever junto com o pt.

### `erros.arquivo_grande_demais`

Usei "512 Ko" (kilo-octet), que e a unidade francesa correta, com espaco insecavel U+00A0 entre numero e unidade. Se a interface mostrar o tamanho do arquivo em outro lugar como "KB" (vindo do navegador ou de um componente nao traduzido), a mensagem vai contradizer a tela. Revisor precisa checar se o resto do fluxo de upload fala Ko ou KB e alinhar os dois.

### `erros.username_caracteres`

"uniquement lettres, chiffres, point, tiret et tiret bas". Dois pontos para nativo: (1) "tiret" vs "trait d'union" — o hifen como sinal de pontuacao e "trait d'union", mas ao listar caracteres permitidos num campo o uso corrente e "tiret"; (2) "tiret bas" e o termo oficial para underscore, mas boa parte do publico jovem diz "underscore". Se o revisor preferir clareza a purismo, trocar por "tiret bas (_)" ou "underscore".

### `comum.status.PLANNED`

"A lire" (com A maiusculo acentuado, U+00C0 — nao deixar virar "A lire" sem acento, e erro comum de quem digita maiuscula em frances). Escolhi pela brevidade na aba e porque e o que catalogo de leitura frances usa; alternativas seriam "Prevu" (mais literal ao pt "Planejado") ou "A commencer". Confirmar que combina com os outros quatro status, que sao todos participios ou locucoes em "en".

### `meta.descricao`

"Un Letterboxd pour manga, manhwa et roman, avec une progression de lecture automatique et privee." Duas duvidas: (1) mesmo problema de "roman" da chave comum.formato.NOVEL, e aqui e a primeira frase que o usuario le e o texto que vai para SEO/meta description; (2) deixei a enumeracao SEM artigo, no estilo de slogan, mas o frances corrente pediria "pour le manga, le manhwa et le roman" ou o plural "pour les mangas, manhwas et romans". Nativo decide qual das tres soa como produto e nao como traducao.

### `catalogo.cartao.formatoGenerico`

Ficou "Obra" pela decisao do dono. Este e o pior lugar da decisao no produto inteiro: e o selo de FORMATO do cartao, renderizado no mesmo <span> que mostra Manga / Manhwa / Manhua / Roman (comum.formato.*). O leitor frances vai ler "Obra" numa lista de formatos e entender que e um formato chamado Obra, ou que a traducao falhou. Se a decisao for rediscutida, comece por aqui: um fallback francês do tipo "Autre" ou "Format inconnu" resolveria sem tocar no resto.

### `catalogo.busca.rotulo`

"Rechercher une obra" — aria-label do campo, so lido por leitor de tela. Precisei dar artigo e genero a uma palavra que nao existe em frances; escolhi feminino (une/l'obra) por causa da terminacao -a e de œuvre. E a chave onde a decisao "obra fica em portugues" fica mais desconfortavel depois do formatoGenerico, porque o artigo francês colado na palavra estrangeira soa a erro. Se o revisor quiser evitar o problema so aqui, "Rechercher un titre" resolve sem mexer no glossario.

### `home.apresentacao.descricao`

A frase mais lida do site inteiro — e o pitch que um visitante frances le antes de decidir se cria conta. Traduzi NOVEL como 'roman' conforme o glossario, mas o nicho francofono de manga diz 'light novel' ou simplesmente 'novel'; 'manga, manhwa et roman' mistura dois registros e pode soar como se o produto tambem cobrisse romance literario frances. Alem disso 'une bibliotheque bien a toi' e minha traducao de 'estante sua' — quis manter o calor do possessivo do pt, mas um nativo precisa dizer se soa caloroso ou infantil. Se so uma string for revisada por um nativo, que seja esta.

### `home.contagem.obras`

Decisao do dono do repo: 'obra' fica em portugues. Aqui isso e mais grave que nas frases, porque a chave e SO o substantivo, sem nenhum contexto que ajude o leitor frances a inferir o sentido — a tela mostra literalmente '12 obras' e '0 obra'. 'obra'/'obras' nao existe em frances, e o plural em -s por acaso funciona, mas so por acaso. Note tambem que em frances o ramo `one` cobre o zero, entao a tela mostra '0 obra' no SINGULAR — correto pela regra francesa, mas verifique se nao parece bug para quem le. O equivalente natural seria 'oeuvre(s)' ou 'titre(s)'. Esta e a chave que mais expoe a decisao de manter 'obra', e o lugar certo para rediscuti-la.

### `home.boasVindas.semFonte`

Frase mais longa do namespace e a que mais acumula risco. (a) usa 'obra' cru em texto frances: 'marque une obra comme En cours' — tratei obra como FEMININO ('une obra'), decisao que precisa ser confirmada. (b) 'En cours' aparece duas vezes com sentidos diferentes: uma como frase comum ('Aucune lecture en cours') e outra como o ROTULO literal do status READING ('marque une obra comme En cours'). A repeticao pode ser lida como redundancia ou, pior, o usuario pode nao perceber que a segunda e o nome de um botao. Se o nativo achar confuso, a saida e reescrever a primeira metade sem 'en cours' (ex.: 'Aucune de tes lectures n'a de source configuree...').

### `listas.detalhe.autoria`

"obra/obras" ficou em portugues DENTRO de frase francesa e dentro do ramo de plural: "par <autor>{username}</autor> · # obras". Para um leitor frances "obras" nao e palavra nenhuma e o -s parece erro de digitacao. E o ponto onde a decisao do dono do repo mais aparece na tela, porque fica ao lado do nome do autor. Se a decisao for revista, esta chave e a primeira a mudar.

### `listas.detalhe.vazia`

Duas ocorrencias na mesma frase: "ajoute des obras avec le bouton de liste sur la page de chaque obra". Aqui aparece tambem a minha decisao de genero — tratei obra como FEMININO ("chaque obra"), mas como a palavra nao existe em frances o leitor nao tem como saber o genero, e "des obras" pode ser lido como "des obras" masculino. Nativo precisa dizer se prefere "œuvre" ou se aceita o termo cru.

### `perfil.avaliadas.vaziaComFiltro`

A decisao do dono de manter "obra" em portugues e o ponto mais fragil do arquivo em frances, porque a palavra NAO existe no idioma e aqui ela vem com artigo e concordancia: "Aucune obra avec ce filtre." Assumi FEMININO em todo o namespace, o que forca tambem "une obra" e "elle apparait ici" em avaliadas.vaziaPropria, "aucune obra" em avaliadas.vaziaOutro e "une obra avec un texte" em resenhas.vaziaPropria; listas.obras fica "{valor} obra / {valor} obras" com o plural portugues em -s (que por sorte coincide com o frances). Um leitor frances le "obra" como palavra estrangeira e vai hesitar no genero. Se a decisao for rediscutida, o substituto natural e "oeuvre" (feminino, mesma concordancia, troca so o substantivo) ou "titre" (masculino, obriga a refazer TODAS as concordancias deste namespace).

### `perfil.social.seguindo`

Estado do botao quando voce ja segue (pt "Seguindo", en "Following"). Escrevi "Suivi", concordando com "le profil" (masculino), justamente para fugir do genero. A convencao das redes em frances seria "Abonne", coerente com seguidores->abonnes do glossario, MAS "Abonne" concorda com QUEM esta lendo e exigiria "Abonne(e)" ou uma forma neutra — o app nao sabe o genero do usuario. Decidir entre "Suivi" (seguro, um pouco menos idiomatico) e "Abonne" (idiomatico, arrisca genero errado) e chamada de nativo. Se mudar para "Abonne", conferir se combina com o par social.seguir = "Suivre".

### `obra.contagem.aberturas`

"{n} ouverture / {n} ouvertures". E a decisao de vocabulario mais consequente do grupo: define o nome do evento que a extensao registra (cada vez que a pessoa abriu o capitulo no site de leitura). Aparece no resumo do historico, colado no rotulo vizinho: "Historique de lecture · 12 ouvertures". Perguntas para o nativo: "ouverture" soa como acao de um humano abrindo um capitulo, ou soa mecanico/estranho? "consultation" seria melhor? Nao usei "lecture" de proposito, porque colide com "Historique de lecture" na mesma linha. Se mudar, historico.maisRecentes tem de mudar junto (concordancia).

### `obra.resenhas.vazio`

"Pas encore de critique par ici — note l'obra avec quelques mots et la tienne apparait pour tout le monde." E a chave onde a decisao de manter "obra" em portugues fica MAIS exposta: um leitor frances le "note l'obra", com elisao aplicada a uma palavra que nao existe no idioma dele. Escrevi "l'obra" em vez do pronome "note-la" porque, gramaticalmente, o antecedente feminino mais proximo seria "critique" — e "noter la critique" diz outra coisa. O nativo precisa julgar duas coisas separadas: (1) o quanto "l'obra" atrapalha a leitura, que e o insumo para rediscutir a decisao do glossario; (2) se "noter avec quelques mots" transmite "avaliar com um texto" ou se soa como "dar nota as palavras".

### `obra.contagem.avaliacoes`

"{n} note / {n} notes", renderizado ao lado da media: "4,2 · 128 notes". Ponto de atencao geral do namespace: o portugues distingue "avaliacao" de "nota", o frances colapsa as duas em "note", entao quatro chaves diferentes usam a mesma palavra (esta, avaliacao.titulo "Ta note", nota.titulo "Note Kidoku", resenhas.nota "Note {nota} sur 5"). Nenhuma delas cai na mesma area da tela, mas quem revisar deve olhar as quatro em conjunto e dizer se o frances precisa de uma palavra separada para a contagem ("128 evaluations"?) ou se "128 notes" e o que um site frances escreveria — minha leitura e que e.

### `obra.similares`

"Obras similaires" — titulo de secao. Aqui a palavra portuguesa recebe adjetivo frances concordado no plural, o que expoe a decisao do glossario num cabecalho, em corpo grande. Confirmar se o hibrido e tolerável; se for, confirmar tambem que "similaires" e o adjetivo certo (a alternativa idiomatica seria "Obras du meme genre" ou "Dans le meme esprit", que se afastam do pt).

### `obra.curiosidades`

"Curiosidades" -> "Anecdotes" (titulo de secao; en "Trivia"). "Curiosites" existe em frances mas puxa para curiosidades turisticas/objetos raros, nao para fatos divertidos sobre uma obra. "Anecdotes" e o que revistas e fichas de obra usam. Alternativas se o nativo discordar: "Le savais-tu ?" (mais quente, coerente com o tu, mas exigiria U+00A0 antes do "?") ou "Infos insolites".

## Expressão idiomática

Frases em que a tradução literal perde o sentido ou o tom. É onde um nativo agrega mais.

### `componentes.estrelas.nota`

"{nota} sur 5", nao "{nota} de 5". Divergencia proposital do portugues: em frances a nota se expressa com "sur" (4 sur 5). Confirmar e nao reverter para a forma literal. Como e texto lido por leitor de tela junto do grupo "Note de 0,5 a 5", ouvir a frase inteira ajuda a validar.

### `entrar.contaCriada`

"Compte cree. Plus qu'a te connecter." O pt "Agora e entrar." e uma eliptica coloquial e calorosa; traduzi com outra eliptica coloquial francesa ("plus qu'a" = so falta). Nativo precisa julgar se isso soa acolhedor ou desleixado num aviso de sistema logo apos criar a conta. Alternativa neutra e um grau mais formal: "Compte cree. Connecte-toi." ou "Compte cree. Il ne reste plus qu'a te connecter." (esta ultima e longa demais para um banner).

### `cadastrar.subtitulo`

"Bibliotheque, progression et critiques — ta lecture n'appartient qu'a toi." O pt "a leitura fica so sua" e reformulado como posse ("nao pertence senao a ti") porque a traducao literal com "reste" pede concordancia de genero em "seul/seule" e vazaria genero do usuario. Verificar: (a) se a promessa de privacidade continua evidente e nao vira frase publicitaria; (b) largura — e a string mais longa do grupo, 73 caracteres contra 56 no pt, e vive sob o titulo num card de autenticacao estreito; (c) se "critiques" (glossario para resenha) nao e lido como "criticas negativas" nesse contexto de venda.

### `estante.continuar.proximo`

"Continuer au ch. {capitulo} →" e correto, mas o frances corrente para retomar leitura e REPRENDRE ("Reprendre au ch. 12"), que e o que um leitor de manga esperaria no botao. Fiquei com "Continuer" por paralelismo com o pt e com en/es. Alem disso o botao cresce: "Continuar cap." -> "Continuer au ch." (o "au" e obrigatorio, sem ele fica telegrafico).

### `estante.lendoEm`

"en lecture sur {host}". O pt usa gerundio ("lendo em"), que o frances nao tem como rotulo — nominalizei. Fica bem se o texto aparece sozinho sob a fonte de leitura, mas se a UI concatenar com algo antes (ex.: um prefixo ou o nome da obra) a construcao pode nao encaixar. Vale conferir no ecra, nao so no JSON.

### `catalogo.subtitulo`

"…et ta lecture commence à compter." O verbo compter significa contar (numerar) E importar. Em portugues o trocadilho existe e e charmoso; em frances o sentido "passa a importar" pode dominar e o leitor perde a ideia de que o progresso comeca a ser contabilizado. Se ficar ambiguo, a alternativa literal e "et ton suivi de lecture démarre". A frase tambem carrega duas decisoes: elisao l'obra e o feminino em "ajoute-la".

### `catalogo.filtros.ordens.alta`

"Em alta" -> "Tendances", enquanto ordens.popular e "Populaires". No mesmo dropdown, as duas opcoes ficam perto demais de sinonimo para o leitor frances (tendance e popularite se confundem), e ele nao ve os criterios por tras. Vale um nativo dizer se "Tendances" contra "Populaires" separa bem, ou se "En vogue" / "Populaires en ce moment" distingue melhor. Cuidado: "Populaires en ce moment" ja e o texto do cabecalho destaques.

### `home.boasVindas.continuarLendo`

Traduzi como 'Continuer la lecture', colado no pt 'Continuar lendo'. Mas o botao retoma a leitura de onde o usuario parou, e a convencao de produto em frances para isso e 'Reprendre la lecture' (mesmo verbo que Netflix/Kindle usam em frances). 'Continuer' nao esta errado, so e menos preciso: sugere prosseguir, nao voltar ao ponto de parada. Decidi nao trocar sozinho porque muda o sentido do botao principal da area logada; se o nativo confirmar, trocar para 'Reprendre la lecture'.

### `home.resenha.spoiler`

'Contient un spoiler — lis-la sur la page de l'obra.' Dois pontos a checar. (1) o pronome 'la' precisa referir 'la critique', que NAO aparece na frase — o antecedente e so implicito pelo contexto do card; um nativo pode achar que fica solto e preferir 'a lire sur la page de l'obra', sem pronome. (2) a elisao 'l'obra' aplica a regra francesa (obra comeca por vogal) a uma palavra que nao e francesa — visualmente funciona, mas e o tipo de coisa que so um nativo diz se parece natural ou parece erro de traducao automatica.

### `listas.indice.ordenar.curtidas`

Traduzi "Mais curtidas" como "Les plus aimées". Tensao com o glossario: ele fixa o SUBSTANTIVO "j’aime" (invariavel), mas aqui a ordenacao pede adjetivo, e "Les plus j’aime" nao existe. As alternativas reais sao "Les plus aimées", "Les plus likées" (anglicismo muito corrente nas redes em frances) ou "Le plus de j’aime". Escolhi a primeira para nao introduzir anglicismo, mas so um nativo sabe qual soa a produto de verdade num seletor ao lado de "Récentes".

### `listas.detalhe.ordenar.antes`

"Avancer {titulo} d’une position" (e "Reculer" na chave .depois). Risco: "avancer" em frances tambem carrega sentido TEMPORAL (antecipar um compromisso), entao num botao de reordenar pode ler como "adiantar" em vez de "subir na ordem". O en/es fugiram disso ("Move earlier", "una posición antes"). Se o nativo achar ambiguo, a saida e "Déplacer {titulo} plus haut / plus bas" — mas isso assume lista vertical. Sao aria-labels, entao comprimento nao e problema; clareza e.

### `perfil.avaliadas.titulo`

"Avaliadas" -> "Notees": participio feminino solto, sem substantivo, como titulo de secao. Funciona em portugues e espanhol ("Valoradas"), e o ingles fugiu para "Rated"; em frances um participio sozinho como cabecalho e mais duro. Mesma questao em numeros.avaliadas ("<forte>{valor}</forte> notees" na linha de contagens). Alternativas se o nativo achar seco: "Obras notees" (repete o termo em portugues, ver o primeiro item desta lista) ou "Notes" (= as notas dadas, muda ligeiramente o sentido: passa a contar notas em vez de obras). Escolher UMA e aplicar nas duas chaves juntas, senao titulo e contagem deixam de casar.

### `perfil.estante.vazia`

"Rien dans {status}." e {status} vem dos rotulos curtos do glossario: En cours, Termine, A lire, En pause, Abandonne. As frases montadas ficam "Rien dans En cours.", "Rien dans A lire." — sem aspas, como no pt. "Rien dans A lire" e a pior das cinco (preposicao seguida de preposicao). Se o nativo achar ruim, as saidas sao "Rien en {status}." (quebra em "Rien en A lire") ou por guillemets: "Rien dans « {status} »." com espaco insecavel por dentro — nesse caso o valor passa a ter U+00A0 e alguem precisa escrever os dois de verdade, nao espaco normal.

### `obra.apagar.confirmar`

"Supprimer le texte de la critique supprime aussi {itens}. Continuer ?". Dois pontos. (1) "supprime" repetido na mesma frase, eco que o portugues nao tem ("apagar ... apaga" soa melhor em pt). Mantive por consistencia com o glossario (apagar = supprimer); se o nativo achar pesado, a saida e "efface aussi" no segundo verbo, ou reescrever nominalizando ("La suppression du texte...", mais formal que o registro do produto). (2) Ha U+00A0 antes do "?" — se alguem reescrever esta frase, o espaco insecavel precisa sobreviver; e o unico do namespace. O {itens} chega montado por Intl.ListFormat: "2 j'aime et 1 commentaire".

### `obra.modal.rotulo`

"Ecrire une critique de {titulo}" (aria-label do modal). Armadilha conhecida e sem solucao perfeita: {titulo} vem do AniList e pode comecar com vogal, produzindo "une critique de Attack on Titan", onde o frances falado diria "d'Attack on Titan". Nao da para elidir condicionalmente sem mexer no codigo. Preferi "de" porque e a colocacao natural ("la critique de X"); a alternativa que elimina o problema e "Ecrire une critique pour {titulo}", um pouco mais chata mas sempre correta. Decisao do nativo: aceitar a nao-elisao ocasional (e so leitor de tela) ou trocar por "pour".

### `obra.painel.convite`

"<entrar>Connecte-toi</entrar> pour l'ajouter a ta bibliotheque, la noter et enregistrer ta lecture." Acrescentei os pronomes objeto "l'" e "la" (a obra), que nao existem no portugues — sem eles a enumeracao francesa fica com verbos transitivos pendurados. Confirmar se a cadeia de tres verbos com dois pronomes diferentes ainda le bem, e se "enregistrer ta lecture" transmite "registrar a leitura" (alternativa: "suivre ta lecture", mais proxima do en "track your reading"). Vale o mesmo para painel.adicionar ("Ajoute-la a ta bibliotheque..."), que fica ao lado do botao de estante.

## Plural e gênero

Concordância que o português não tem, ou tem diferente.

### `autor.obras.vazia`

"Aucune obra de manga ou de roman enregistree sur AniList." Como "obra" nao e palavra francesa, tive que arbitrar o genero para o determinante e o particpio: escolhi feminino (aucune / enregistree), por analogia com œuvre e pela terminacao em -a. Confirmar se soa aceitavel e, principalmente, se e a mesma escolha que os outros grupos fizeram — genero divergente entre telas seria pior que a escolha errada. Vale conferir tambem se "aucune" + substantivo estrangeiro nao pede reformulacao (ex.: "Aucune obra ... n'est enregistree").

### `estante.capitulos`

"{capitulo} chapitres" e plural fixo. Em frances a categoria one cobre ZERO E UM, entao uma obra com 1 capitulo (ou 0) renderiza "1 chapitres" / "0 chapitres" — errado, e mais chocante em frances que em pt. Mantive plano porque a ORIGEM pt tambem e plana ("{capitulo} capitulos") e en/es fizeram igual; corrigir so no frances criaria divergencia de estrutura entre idiomas. Decisao de produto: se quiserem consertar, o certo e virar ICU plural nos quatro idiomas de uma vez.

### `estante.filtros.tudo`

"Tout" (invariavel) numa aba de filtro que na pratica significa "todas as obras". O frances aceita "Tout", "Tous" ou "Toutes" conforme o subentendido; como "obra" nao e palavra francesa, o nativo nao tem como derivar a concordancia sozinho. Escolhi "Tout" por ser a forma neutra usada em filtros. Precisa de veredito humano.

### `erros.ja_em_uso`

"deja utilise" e um particpio SEM sujeito na string. Se essa mensagem cai sob o campo de e-mail, o sujeito implicito e "adresse e-mail", que e FEMININO, e o frances correto seria "deja utilisee". Sob "nom d'utilisateur" (masculino) a forma atual esta certa. Nao da para acertar os dois com uma string so. Se o revisor confirmar que a chave serve aos dois campos, trocar por uma forma invariavel: "n'est plus disponible" ou "indisponible".

### `erros.ordem_invalida`

"l'ordre doit contenir exactement les obras de la liste" — aqui a decisao de manter "obra" em portugues fica no ponto mais visivel: um plural em -s de uma palavra que nao existe no idioma, precedido de artigo frances. Um nativo le "les obras" como erro de digitacao. Vale como amostra da familia inteira: erros.obra_invalida, erros.obra_nao_encontrada, erros.obra_fora_do_catalogo, erros.lista_ou_obra_nao_encontrada e meta/cabecalho tem o mesmo problema. Se a decisao for revista, "oeuvre" (f.) encaixa direto em todas.

### `catalogo.filtros.todos`

"Tous". Esta UMA chave e a opcao vazia de TRES selects diferentes (filtros-catalogo.tsx): Type (masc.), Genre (masc.) e Décennie (FEMININO). Nao existe forma que concorde com os tres — "Toutes" quebra os dois primeiros, "Tous" quebra o terceiro. Escolhi o masculino generico, que e o mais comum em barra de filtro francesa, mas um nativo pode preferir o invariavel "Tout", ou pedir tres chaves separadas — o que e mudanca de codigo, nao de catalogo, e nao decidi sozinho.

### `catalogo.cartao.capitulos`

Troquei =1 por one de proposito: em frances a categoria one cobre ZERO e um, entao obra com 0 capitulos mostra "0 chapitre" (singular), que e o correto — e o contrario do portugues, que diz "0 capitulos". Vale confirmar na tela com uma obra sem capitulos registrados no AniList, porque se alguem "corrigir" isso de volta para =1 o bug volta calado.

### `catalogo.filtros.ordens.recente`

"Plus récents" no masculino generico, que e a convencao dos menus de ordenacao franceses — mas o arquivo inteiro trata "obra" como feminina, e o rotulo se refere justamente as obras. Um nativo pode exigir "Plus récentes" por coerencia. Desviei do problema em ordens.nota usando substantivo ("Meilleures notes"); aqui nao deu sem mudar o sentido. Alternativa sem concordancia: "Nouveautés".

### `home.saude.estado.not_configured`

Este valor e concatenado pelo codigo como `${nome} ${estado}` e o {nome} pode ser 'base de donnees' (FEMININO) ou 'catalogue AniList' (MASCULINO). Por isso NAO pude usar o obvio 'non configure' — sairia 'base de donnees non configure', com erro de concordancia visivel. Escolhi 'en attente de configuration', que e invariavel, mas e longo e resulta em 'catalogue AniList en attente de configuration' dentro de um aviso que ja e comprido. O nativo precisa julgar: existe forma curta E invariavel melhor? ('sans configuration'? 'a configurer'?). Mesma restricao vale para os irmaos 'repond' e 'hors service', que escolhi justamente por serem invariaveis — nao troque nenhum dos tres por adjetivo que concorde em genero.

### `home.boasVindas.estanteVazia`

'ajoute ta premiere obra' — aqui o genero atribuido a 'obra' fica exposto na concordancia de 'premiere' (feminino). Se a revisao decidir que obra e masculino, ou trocar por 'titre' (masculino) / 'oeuvre' (feminino), esta chave muda junto com semFonte e contagem.obras — as tres precisam ser revisadas em bloco, nunca isoladas. Tambem troquei 'a primeira obra' do pt por 'ta premiere obra' (possessivo), seguindo o en.json; confirmar se o possessivo soa melhor que o artigo em frances.

### `perfil.numeros.curtidasDadas`

"<forte>{valor}</forte> j'aime donne / j'aime donnes". O substantivo "j'aime" e invariavel (por isso a forma nao muda), mas o participio "donne" concorda e recebe o -s no plural — e a unica maneira de distinguir esta chave de curtidasNoPerfil, que conta as curtidas RECEBIDAS. Precisa de nativo em dois pontos: (a) se "j'aime donnes" soa natural numa linha de estatistica, ou se o padrao seria "mentions j'aime donnees" (convencao Facebook FR, feminino, e 8 caracteres mais longo numa linha que ja tem 7 contagens lado a lado); (b) se o -s em "donnes" e mesmo o que ele escreveria depois de um substantivo invariavel.

### `perfil.numeros.curtidasNoPerfil`

Escrevi SO o ramo `other`: "{n, plural, other {<forte>{valor}</forte> j'aime sur le profil}}", ou seja, "1 j'aime sur le profil" e "12 j'aime sur le profil" saem identicos. Isso e proposital — "j'aime" nao varia — e o teste do projeto le "so other" como declaracao de invariabilidade. Mesmo caso em resenhas.curtidas ("{valor} j'aime"). O que o nativo confirma: que ele realmente nao escreveria nada diferente no singular (algumas interfaces escrevem "1 j'aime" e "12 j'aime", que e o que fiz; outras usam "mention j'aime / mentions j'aime", que VARIA e obrigaria a voltar para one + other).

### `perfil.numeros.seguindo`

Unica chave onde o frances tem MAIS ramos que pt/en/es: eles tem so `other` (gerundio invariavel), eu escrevi one + other porque "abonnement" e substantivo e varia. Se um revisor comparar os quatro idiomas lado a lado vai parecer erro meu — nao e, e "1 abonnements" seria. Confirmar tambem a palavra: "abonnements" e o par natural de "abonnes" (seguidores) nas redes francesas, mas num perfil de leitura ele pode ler "abonnements" como assinatura paga; alternativa "suivis", menos ambigua e menos idiomatica.

### `obra.contagem.curtidas`

Unica chave do grupo com SO o ramo other: "{n, plural, other {{n} j'aime}}". Isso e proposital — "j'aime" e invariavel ("1 j'aime", "2 j'aime"), e o projeto trata "so other" como a declaracao formal de "esta palavra nao varia". Um revisor pode achar que falta o ramo one e "consertar" acrescentando um; nao ha nada para consertar. O que o nativo deve confirmar e outra coisa: se o substantivo aqui e mesmo "j'aime" ou se o produto ficaria melhor com "mention j'aime / mentions j'aime" (a forma completa, que ai SIM varia e exigiria one + other). Atencao: o valor tambem e injetado dentro de apagar.confirmar.

### `obra.historico.maisRecentes`

"les {n} plus recentes". Tres pontos. (1) Acrescentei o artigo "les", que nao existe no pt ("{n} mais recentes") nem no en — sem ele a frase e agramatical em frances; o es fez o mesmo ("las {n} mas recientes"). (2) A concordancia e feminino plural porque o substantivo elidido e "ouvertures"; se contagem.aberturas mudar de genero, esta chave quebra silenciosamente. (3) A tela so usa esta chave quando n e exatamente 20 (teto do historico), entao o resultado real e sempre "les 20 plus recentes" — conferir se o nativo nao prefere explicitar o substantivo ("les 20 ouvertures les plus recentes").

## Registro incerto

O tradutor ficou em dúvida sobre o tom, ou entre variantes regionais.

### `componentes.estrelas.limpar`

"effacer" para limpar a nota ja dada. Alternativas correntes: "retirer" (mais preciso — a nota e retirada, nao apagada de um campo de texto) ou "supprimer" (que o glossario reserva para "apagar"). Um nativo decide em dois segundos qual o controle de estrelas usa; e um rotulo de acessibilidade, entao o criterio e o que faz sentido ouvido em voz alta.

### `entrar.semConta / cadastrar.jaTemConta`

Sao as duas unicas frases do grupo em que o tutoiement aparece com sujeito explicito: "Tu n'as pas encore de compte ?" e "Tu as deja un compte ?". O pt e impessoal e nao expoe tratamento nenhum. Justamente na tela de login, muito produto frances usa vous, e um leitor adulto pode achar o tu abrupto num primeiro contato — o publico jovem de manga, nao. Se o revisor quiser recuar do tu, e AQUI que se decide, e a alternativa neutra existe sem mexer no resto do arquivo: "Pas encore de compte ?" e "Deja un compte ?", que aliem apagam o problema e ficam mais curtas. NOTA TECNICA: o espaco antes do "?" e U+00A0 de verdade nas duas — se o revisor reescrever a frase, tem que redigitar o insecavel, senao o "?" desce de linha.

### `entrar.acoes.enviando / cadastrar.acoes.enviando`

"Connexion…" e "Creation…" como estado de botao em envio. O frances nao tem gerundio de estado, entao virou nome verbal seco. "Connexion…" e absolutamente corrente em botao. "Creation…" sozinho e mais fraco — sem complemento fica ambiguo sobre o que esta sendo criado. Alternativa: "Creation du compte…", que e mais claro mas alonga o botao e pode passar da largura do rotulo em repouso ("Creer un compte").

### `estante.erros.acao`

"ca n’a pas marche — reessaie" (e a variante em erros.rede, "… a l’instant"). O pt e coloquial e curtissimo ("nao deu"), e essa e a forma francesa equivalente em registro — mas e bem falada, quase oral, para uma mensagem de erro. Um nativo tem que decidir se cabe no tom do produto ou se prefere o neutro "echec — reessaie" / "une erreur est survenue". Mantive as duas distintas como no pt.

### `erros.proprio_perfil`

O pt "nao vale para o proprio perfil" e coloquial. Escrevi "impossible sur ton propre profil", que e curto e nao culpa ninguem, mas e mais seco que o original. Se o revisor achar frio demais, "ca ne marche pas sur ton propre profil" devolve o tom informal do pt; se achar informal demais para uma resposta de API, "ne s'applique pas a ton propre profil" e o meio-termo neutro.

### `home.populares.titulo`

'Populares agora' virou 'Populaires en ce moment'. E um <h2> de secao, e em frances um adjetivo plural sozinho como titulo ('Populaires') e menos idiomatico que em portugues — o esperado seria um substantivo ('Tendances', 'Les plus populaires', 'Populaires en ce moment'). Escolhi a terceira por ser a mais proxima do pt, mas ela e visivelmente mais longa que o original num titulo de secao em caixa alta com tracking (uppercase tracking-wide no page.tsx), entao pode quebrar linha. 'Tendances' resolveria tamanho e naturalidade de uma vez, mas se afasta do pt — decisao para o nativo.

### `home.vitrine.resenhas.vazio`

Representante de um padrao que se repete em 4 chaves (vitrine.resenhas.vazio, vitrine.listas.vazio, atividade.vazia, e o final de boasVindas.semFonte): passei o presente do portugues ('a primeira aparece') para o FUTURO frances ('la premiere apparaitra'), que julgo mais natural para promessa de conteudo. Se o nativo preferir presente, as 4 mudam juntas para manter consistencia. Confirmar tambem 'par ici' como traducao de 'por aqui' — quis o tom coloquial e caloroso do pt, mas 'par ici' pode soar regional demais; a alternativa neutra seria 'ici' apenas.

### `listas.indice.subtitulo`

"des classiques aux plus farfelues" para "dos clássicos às brincadeiras". "Farfelu" e caloroso e idiomatico, mas tem um tom levemente datado/adulto que pode nao casar com publico jovem de manga. E o subtitulo da tela inteira, entao define o registro do produto em frances. Alternativas: "aux plus délirantes", "aux plus n’importe quoi" (bem mais jovem, talvez demais).

### `listas.indice.convite`

"<entrar>Connecte-toi</entrar> pour créer la tienne." Duas coisas para o nativo confirmar: (1) e a vitrine da decisao de tratar por TU num convite publico da home de listas — se o tu for aceito aqui, esta aceito no arquivo todo; (2) "la tienne" depende de o leitor deduzir "liste" do contexto, exatamente como "a sua" no pt. Se a frase aparecer longe do titulo "Listes", o referente se perde e precisa virar "pour créer la tienne" -> "pour créer ta liste".

### `listas.indice.criar.erros.rede`

"ça n’a pas marché à l’instant — réessaie" e a chave .falhou virou "ça n’a pas marché — réessaie". Em frances as duas ficaram quase indistinguiveis (so "à l’instant" separa), e "ça n’a pas marché" e bem falado/oral — pode ser informal demais para erro de rede. Se o nativo quiser distinguir de verdade, .rede aceita algo tipo "la connexion n’a pas suivi — réessaie".

### `perfil.voce`

Etiqueta que aparece colada no seu proprio username no cabecalho do perfil (pt "voce", en "you", es "tu"). Escrevi "toi", fiel a segunda pessoa do portugues e coerente com o tu do resto do arquivo. Mas a convencao francesa para marcar a propria conta numa lista/cabecalho e frequentemente "moi" (perspectiva do dono, como em Contacts/Drive FR). As duas cabem no pill; a escolha muda o tom (o app te chamando de "toi" vs voce se reconhecendo como "moi"). Chamada de nativo, custo zero de troca.

### `obra.resenhas.minha`

"toi" — chip de uma palavra ao lado do seu proprio nome na lista de resenhas (en "you", es "tu"). E o lugar onde a escolha do tutoiement fica mais nua: um produto frances que trate por vous poria "vous". "toi" e a forma tonica correta para um rotulo isolado, mas vale o olho do nativo — alguns produtos escrevem "moi" nesse chip (ponto de vista de quem le: "esta e minha"), o que em frances soa mais natural que "toi" para varias pessoas. Chave curta, alto contraste visual, barata de trocar.

### `obra.erros.rede`

"ca n'a pas marche — reessaie". O portugues aqui e vago e coloquial de proposito ("nao deu agora"), e as outras quatro chaves de erro deste namespace comecam com "impossible de...". Escolhi quebrar o padrao nesta para reproduzir essa diferenca de tom do original. Confirmar se o coloquial cabe numa mensagem de erro do produto ou se o nativo preferiria uniformizar ("impossible pour le moment — reessaie").

## Cresceu de tamanho

Não é erro de tradução: é risco de layout. Vale olhar na tela, em telas estreitas.

### `componentes.sair`

"Sair" (4 caracteres) virou "Se deconnecter" (14). E item de menu/cabecalho, o lugar mais apertado da interface — verificar se nao quebra linha ou estoura o botao. Se estourar, "Deconnexion" (11) e a alternativa padrao em frances para rotulo curto, mas foge do infinitivo usado no glossario.

### `estante.progresso.campo`

"Chapitre en cours de lecture" contra "Capitulo em leitura" — 28 vs 18 caracteres, num rotulo de campo. Pior: colide com o status READING, que no glossario e "En cours", entao o rotulo repete a palavra do status ao lado. Se apertar o layout, encurtar para "Chapitre en cours" ou "Chapitre actuel" (foi por ai que o espanhol foi: "Capitulo actual").

### `cabecalho.estante`

"Bibliotheque" tem 13 caracteres contra 7 de "Estante" e 5 de "Shelf" — e o item de navegacao mais longo do cabecalho em frances, risco de quebrar ou truncar no menu mobile. Alem do tamanho, ha colisao semantica: "Bibliotheque" e "Catalogue" soam como a mesma coisa para quem chega no produto, e a distincao (uma e minha, o outro e de todos) nao esta no nome. Se precisar encurtar, "Ma biblio" e corrente e informal; "Etagere" esta proibido pelo glossario e com razao.

### `catalogo.botaoEstante.adicionar`

"+ Estante" (9 caracteres) virou "+ Bibliothèque" (14) dentro de um botao pequeno no cartao, ao lado do texto de erro; e a mesma chave irma naEstante foi de "Na estante" (10) para "Dans ta bibliothèque" (20), num <span> com icone de visto. Em cartao de duas colunas (sm:grid-cols-2) isso pode quebrar linha. Se quebrar, encurtar naEstante para "Ajouté" e adicionar para "+ Ajouter" mantem o sentido, mas perde a palavra do glossario.

### `home.feed.resenhou`

'resenhou' (1 palavra) virou 'a publie une critique de' (4 palavras). Evitei o obvio 'a critique' porque em frances corrente 'critiquer quelqu'un/quelque chose' carrega conotacao NEGATIVA (criticar, censurar) — 'X a critique Y' seria lido como 'X falou mal de Y', que e exatamente o oposto de um feed neutro de resenhas. Sites franceses do genero se dividem: SensCritique usa 'a critique', Babelio usa 'a ecrit une critique de'. Impacto de layout: no feed-da-comunidade.tsx isso e um <span> num <p> com flex-wrap ao lado do nome do usuario e do titulo da obra, entao 4 palavras podem empurrar o titulo para a linha de baixo em telas estreitas. Se o nativo achar 'a critique' aceitavel, encurta e resolve os dois problemas.

### `listas.detalhe.curtida.descurtir`

"retirer le j’aime de la liste" contra "descurtir a lista" — quase o dobro, porque o frances nao tem verbo unico para descurtir. Pior: colide com listas.detalhe.remover, que traduzi como "retirer" (tirar a obra da lista). Na MESMA tela o usuario ve "retirer" e "retirer le j’aime de la liste" significando acoes diferentes. Nativo deve decidir se troca um dos dois (ex.: remover -> "enlever", ou descurtir -> "je n’aime plus").

### `perfil.social.descurtir`

"Descurtir perfil" (16) -> "Retirer le j'aime du profil" (27), quase o dobro, seguindo o glossario (descurtir = retirer le j'aime). Nao quebra layout — confirmei que a chave so alimenta aria-label e title do botao, nunca texto visivel —, mas e uma frase pesada para leitor de tela repetir. Alternativa mais curta e igualmente correta: "Ne plus aimer le profil" (23), que espelha melhor o par social.curtir = "Aimer le profil". Se o nativo preferir a curta, o glossario e que precisa mudar, nao so esta chave.

### `perfil.filtros.ordens.maior_nota`

"Maior nota" -> "Note la plus elevee" e "Menor nota" -> "Note la plus basse", ~70% mais longos, dentro de um seletor de ordenacao que ja tem "Plus recentes"/"Plus anciennes". Alternativas curtas e correntes em interface francesa: "Mieux notees"/"Moins bien notees" (mantem o ponto de vista das obras) ou "Note decroissante"/"Note croissante" (padrao, porem mais tecnico que o registro caloroso do resto do app). Vale conferir junto com filtros.limpar, onde escrevi "effacer" — em filtro o frances tambem usa "reinitialiser", mais longo e mais formal.

### `obra.avaliacao.resenhar`

"Resenhar…" (uma palavra) virou "Ecrire une critique…" (tres). O frances nao tem verbo simples para isso: "critiquer" significa criticar/censurar e daria o registro errado num botao. O botao e w-fit, entao nao quebra layout, mas ele alterna com "Modifier la critique…" e os dois ficam bem mais compridos que no pt. Confirmar se e assim que um site frances rotula esse botao, ou se o padrao seria so "Ecrire un avis" / "Donner mon avis" (que trocaria o termo do glossario, resenha = critique).

### `obra.resenhas.verAnteriores`

"voir {n} commentaire precedent / voir {n} commentaires precedents". O portugues e eliptico ("ver 3 anteriores") e eu explicitei o substantivo, como o ingles fez, porque "voir 3 precedents" solto soa truncado em frances. Custo: o botao cresce bastante dentro da thread de comentarios (e um link pequeno, com underline, dentro de uma lista ja indentada). Se o nativo achar que a elipse funciona, "voir les {n} precedents" com artigo e o meio-termo.

## Marcado pelo revisor

Apontado na revisão adversarial, sem categoria específica.

### `autor.obras.titulo`

Concordo integralmente com o tradutor e agravo: alem de "obras" nao existir em frances, o h2 tem classe CSS "uppercase" (src/app/(ui)/[locale]/autor/[staffId]/page.tsx:108-110), entao a tela mostra "OBRAS" sozinho, em caixa alta, sem nenhum texto ao redor. E o pior caso da decisao de manter o termo em portugues. Se for revista, o frances e "OEuvres" (uppercase renderiza OEUVRES sem problema nos navegadores).

### `autor.obras.vazia`

"Aucune obra de manga ou de roman enregistree sur AniList." Dois pontos para o nativo. (a) A construcao "obra de manga" e decalque do portugues: em frances "une oeuvre de manga" nao e a forma corrente — se diria "un manga ou un roman" direto, ou entao apor os formatos ("Aucune obra, manga ou roman, enregistree..."). O en fugiu disso reescrevendo como "No manga or novel obras". Nao marquei como erro porque a obrigacao de manter "obra" ja forca alguma estranheza, mas e exatamente o tipo de coisa que passa batido num revisor lusofono. (b) Com "aucun", o frances tambem admite "ni" no lugar de "ou" ("de manga ni de roman"); o es escolheu "ni". Ambos aceitaveis, decisao de nativo.

"enregistree" colide de leve com o glossario: salvar -> Enregistrer. Um leitor pode entender "salva no AniList" (acao do usuario) em vez de "registrada/catalogada la". O frances "etre enregistre dans une base" tambem significa registrado, entao nao e erro; mas "repertoriee" ou "referencee" separam melhor do botao Salvar. O en escolheu "listed", que evita a colisao. Decidir junto com o resto do catalogo, porque "Enregistrer" vai aparecer como botao em outras telas.

Formato NOVEL -> "roman", conforme a tabela. Mantenho o alerta do tradutor: o publico de manga em frances fala "light novel" / "novel"; "roman" e romance literario comum e parte do publico pode nao reconhecer a categoria. Tem que ser a mesma palavra no filtro do catalogo e no rotulo de formato da obra — decidir uma vez para os tres lugares.

### `componentes.estrelas.limpar`

CORRECAO DE FATO ao relatorio do tradutor: ele justificou "effacer" minusculo dizendo que e "um rotulo dentro do grupo de estrelas, nao um botao de acao principal". Nao e. Em src/app/(ui)/[locale]/componentes/estrelas.tsx:83-89 e um <button type="button"> visivel, com underline, e esta FORA do role="group" das estrelas (a div do grupo fecha na linha 77). Ou seja: e texto clicavel na tela, nao string so de leitor de tela. "Effacer" continua defensavel (e o padrao frances para "clear": effacer les filtres, effacer la recherche) e nao colide com o glossario, que reserva "supprimer" para apagar. Mas o nativo deve decidir ouvindo/vendo como botao: "Retirer" e mais preciso para desfazer a propria nota, e foi o caminho que o es tomou ("quitar"). Minuscula esta certa, espelha o pt.

### `componentes.estrelas.nota`

A string "{nota} sur 5" esta CERTA e nao deve ser "corrigida" para "de 5" — marcar como intocavel. O que pede olho e o valor injetado: estrelas.tsx:61 e 69 passam `${posicao - 0.5}` como template string crua, sem formato.number, entao o leitor de tela vai ler "0.5 sur 5" com PONTO decimal, enquanto o rotulo do grupo logo ao lado diz "Note de 0,5 a 5" com virgula. Em frances a virgula decimal e obrigatoria. Defeito de codigo, nao de traducao, e ja existe em pt/es — mas em frances fica mais visivel e vale abrir issue separada.

### `componentes.sair`

"Sair" (4) -> "Se deconnecter" (14), item de cabecalho. Confirmo o risco levantado: e o lugar mais apertado da UI. Se estourar, "Deconnexion" (11) e o rotulo curto padrao em frances, mas quebra o padrao infinitivo do glossario. Vale medir na tela antes de mergear, nao depois.

### `autor.erros.indisponivel`

Nao e erro: "AniList ne repond pas pour le moment. Reessaie dans un instant." O passado do pt ("nao respondeu agora") virou presente, mesma leitura que o es fez, e e a forma corrente de estado de erro em frances. Registro aqui so porque e a UNICA frase do grupo com tutoiement ("Reessaie") — se o nativo achar o tu inadequado em mensagem de erro de sistema, e esta chave que muda, e a decisao vale para todo o catalogo.

### `estante.capitulos`

PRIORIDADE 1. "{capitulo} chapitres" e plural fixo, e em frances a categoria `one` cobre ZERO E UM: uma obra com 1 capitulo renderiza "1 chapitres" e uma com 0 renderiza "0 chapitres". O tradutor justificou dizendo que a origem e plana e que introduzir ICU criaria divergencia — mas a premissa esta errada: o pt-BR JA usa ICU plural para a mesma contagem em `catalogo.cartao.capitulos` e `obra.contagem.capitulos` ("{n, plural, =1 {{n} capitulo} other {{n} capitulos}}"). Ou seja, estante.capitulos e a excecao, nao a regra. O conserto certo continua sendo nos quatro idiomas de uma vez (pt/en/es com =1|other, fr com one|other, NUNCA =1 no frances), mas vale abrir issue: o argumento de "nao ha plural neste projeto" nao se sustenta.

### `estante.avaliacao.resenha`

"Écris ta critique (facultatif)". `critique` e FEMININO, e a concordancia gramatical pediria "(facultative)". A forma invariavel "(facultatif)" e o que Google e boa parte das UIs francesas usam (subentendendo "champ facultatif"), mas guias de estilo — incluindo o da Microsoft em frances — mandam concordar com o substantivo. Ninguem do time vai perceber isso. Um nativo decide: "(facultatif)" invariavel em todo o produto, ou "(facultative)" aqui. O que nao pode e ficar inconsistente com as outras chaves "(opcional)" dos demais namespaces.

### `estante.erros.banco`

"qui n’a pas répondu à l’instant" e a mesma construcao em `erros.rede` ("ça n’a pas marché à l’instant"). "à l’instant" e idiomatico no AFIRMATIVO e recente ("il est parti à l’instant"); sob negacao fica torto ao ouvido frances. O sentido chega, mas soa a traducao. Alternativas naturais: "qui ne répond pas pour le moment" no banco e "ça n’a pas marché, réessaie" na rede (perdendo o "agora", que em frances quase nao acrescenta nada aqui). Nao mexi porque nao e erro de sentido — e ponto para nativo.

### `estante.erros.acao`

"ça n’a pas marché — réessaie". Concordo com o tradutor: e o equivalente exato do registro do pt ("nao deu"), mas e frances falado. Numa mensagem de erro de produto o neutro seria "Échec — réessaie" ou "Une erreur est survenue". Como o pt do Kidoku e deliberadamente coloquial, manter e defensavel — so precisa de veredito consciente, nao de omissao.

### `estante.seletorStatus`

"Statut de l’obra" e ARIA-LABEL (seletor-status.tsx:78), ou seja, e LIDO EM VOZ ALTA por leitor de tela frances. "obra" nao existe no idioma: o sintetizador vai pronuncia-lo como palavra francesa (algo como "obr"), colado numa elisao francesa. E o ponto onde a decisao de manter "obra" em portugues mais machuca, mais ainda que no texto visivel. Se a decisao for revista, `œuvre` encaixa sem tocar em concordancia — o arquivo inteiro ja trata obra como feminino.

### `estante.filtros.tudo`

"Tout" numa fila de abas ao lado de En cours / Terminé / À lire / En pause / Abandonné (estante/page.tsx:103, onde o resto vem de `comum.status.*`). "Tout" invariavel e a forma padrao de filtro em frances (YouTube, Gmail) e eu ficaria com ela; "Toutes" so faria sentido se o subentendido fosse explicitamente "toutes les œuvres", e como "obra" nao e palavra francesa o leitor nao tem como derivar. Baixo risco, mas e uma palavra visivel o tempo todo.

### `estante.progresso.campo`

CORRECAO ao relatorio: o tradutor marcou como risco de layout ("28 vs 18 caracteres num rotulo de campo"). Nao e rotulo visivel — e aria-label (editar-progresso.tsx:98) num input de largura fixa w-14. Nao aperta nada, e a suposta colisao com o status "En cours" nunca aparece na tela junto. "Chapitre en cours de lecture" ate funciona MELHOR como texto falado que "Chapitre en cours". Risco pode ser rebaixado; o mesmo vale para `continuar.campo` ("Chapitre précis", aria-label em continuar-leitura.tsx:157) — ali o unico ponto e se "précis" e a palavra certa falada, e "Chapitre exact" talvez seja mais clara.

### `estante.lendoEm`

CORRECAO ao relatorio: o tradutor pediu para conferir se a UI concatena algo antes. Nao concatena — a string sai sozinha num <p class="text-xs text-texto-suave"> (estante/page.tsx:215), so com o host interpolado. Entao "en lecture sur mangadex.org" aparece isolado sob o cartao. Sobra so a questao de gosto: a nominalizacao "en lecture sur" e correta mas seca; "lecture en cours sur {host}" seria mais corrente. Nao e erro.

### `estante.continuar.proximo`

Confirmo o apontamento do tradutor: "Continuer au ch. {capitulo}" e correto, mas o verbo que um leitor frances de manga espera no botao de retomar leitura e REPRENDRE ("Reprendre au ch. 12"). "Continuer" nao esta errado e mantem paralelo com pt/en/es. Se trocar, tem que ser nos quatro idiomas ou vira divergencia gratuita.

### `estante.erros.registrar`

`erros.salvar` ("impossible d’enregistrer — réessaie") e `erros.registrar` ("impossible d’enregistrer pour le moment") colapsaram no mesmo verbo, onde o pt distingue SALVAR de REGISTRAR. Em frances de UI isso e normal e nao vejo alternativa melhor ("consigner" e formal demais, como o proprio tradutor notou). So confirmar que nunca aparecem no mesmo ecra, senao parecem bug de duplicacao.

### `estante.fonte.derivar`

"Dériver"/"Dérivation…" carrega em frances forte carga matematica e linguistica; como acao de produto ("deduzir o padrao da URL a partir do link do cap. 1") pode soar hermetica. O termo atravessa todo o onboarding de fonte (fonte.derivar, fonte.derivando, erros.derivar, fonte.paginaDica "dérive à nouveau"), entao qualquer troca e coordenada e nos quatro idiomas. Concordo em manter; so registrar que se um nativo reclamar, sao 4 chaves.

### `estante.descricao`

"Ta progression de lecture ne regarde que toi." A expressao esta CERTA e e bem idiomatica ("ça ne regarde que toi" = e assunto so seu) — vale registrar justamente porque um revisor lusofono pode confundir `regarder` com "olhar" e achar que virou outra coisa. Nao mexer. Unica ressalva de tom: e mais assertiva que o pt ("fica so com voce") e que o en ("stays private to you"); se o produto quiser insistir na PRIVACIDADE e nao no "nao e da conta de ninguem", a forma seria "Ta progression de lecture reste privée".

### `cadastrar.subtitulo`

INTOCAVEL — e a chave de maior custo do grupo, por tres motivos. (a) FALSO AMIGO: "Bibliotheque" e o termo correto do glossario para "estante". Um revisor que so le portugues bate o olho, le "biblioteca", acha que esta errado e troca por "Etagere" — que em frances e a PRATELEIRA/tabua, nao a colecao. E exatamente a armadilha Estanteria/Estante que o messages/revisao/es.md marcou como intocavel em es. Mesma coisa com "critiques": em frances critique (f.) = resenha; um leitor de portugues le "criticas" e vai querer "avis"/"revues". Nenhuma das duas pode mudar sem decisao de glossario. (b) PRIVACIDADE: "ta lecture n'appartient qu'a toi" carrega a invariante do produto (ReadingSource/ReadingProgress sao privados do dono). Nativo precisa confirmar que le como "mais ninguem ve" e nao como "e do teu gosto pessoal" — o es.md levantou a duvida identica sobre "tu lectura es solo tuya". (c) O risco de LARGURA que o tradutor levantou NAO PROCEDE: verifiquei em src/app/(ui)/[locale]/cadastrar/page.tsx:23 e :28 — e um <p> dentro de <main class="flex flex-col max-w-sm">, quebra linha livremente. Ninguem deve encurtar uma string correta para resolver um problema que nao existe (o es.md chegou a mesma conclusao nas chaves equivalentes). Nota extra: a justificativa do tradutor para fugir do literal ("reste" obrigaria seul/seule e vazaria genero do usuario) esta ERRADA — "ta lecture reste la tienne" concorda com "lecture" (feminino), nao com o usuario, entao essa alternativa existia e era segura quanto a genero. A string entregue continua boa; so nao foi descartada pelo motivo que ele escreveu.

### `entrar.contaCriada`

"Compte cree. Plus qu'a te connecter." A eliptica "Plus qu'a + infinitivo" existe e e corrente em frances, mas e coloquial; num aviso de sistema logo apos criar a conta, nativo julga se soa acolhedor (intencao do pt "Agora e entrar.") ou desleixado. O es enfrentou a mesma pergunta e resolveu com imperativo puro ("Ahora inicia sesion."), com o revisor de es notando que o imperativo nu pode ficar seco. IMPORTANTE: o tradutor descartou "Il ne reste plus qu'a te connecter." por ser "longa demais para um banner" — isso nao procede. Verifiquei em src/app/(ui)/[locale]/entrar/page.tsx:32-35: renderiza num <p role="status"> com borda, dentro da coluna max-w-sm, sem restricao de largura, quebrando linha a vontade. A alternativa mais suave cabe; a escolha e so de tom.

### `entrar.acoes.enviando`

COLISAO DE PALAVRA que o time nao tem como enxergar: em frances "connexion" significa TANTO login QUANTO conexao de rede. Nesta tela o botao em envio diz "Connexion…" (= entrando) e o erro de rede da chave irma diz "pas de connexion au serveur" (= sem rede). As duas strings estao idiomaticas isoladamente e "Connexion…" e o rotulo padrao de botao de login em frances. Verifiquei o fluxo em src/app/(ui)/[locale]/entrar/formulario.tsx:82-88 — o finally zera `enviando` antes do erro aparecer, entao as duas nao ficam na tela ao mesmo tempo; nao e bug. Mesmo assim vale um nativo olhar a tela inteira e dizer se o eco incomoda. "Connexion en cours…" desambigua, e a largura nao e obstaculo: o botao e bloco numa coluna max-w-sm (formulario.tsx:118).

### `cadastrar.acoes.enviando`

"Creation…" sozinho e a string mais fraca do grupo. Frances normalmente diz o que esta sendo criado; "Creation…" solto fica ambiguo num botao. "Creation du compte…" e mais claro e a objecao de largura do tradutor nao se sustenta — o botao e bloco full-width numa coluna max-w-sm (src/app/(ui)/[locale]/cadastrar/formulario.tsx, mesmo padrao verificado em entrar/formulario.tsx:114-121), e o rotulo em repouso "Creer un compte" ja e mais longo que "Creation du compte…" nao chega a ser. Decisao de clareza, sem custo de layout.

### `entrar.meta.titulo / entrar.titulo`

"Se connecter" como <title> da aba e como <h1> da pagina. A convencao francesa e separar: substantivo "Connexion" no titulo da pagina e no title do navegador, infinitivo "Se connecter" so no botao. Nao esta errado, e segue o padrao da casa — pt, en e es repetem a mesma string nas tres posicoes (meta.titulo == titulo == acoes.enviar), confirmado nos tres catalogos. Se o nativo quiser separar, e mudanca de glossario e nao de string solta: afeta tambem o texto dentro de <link> em cadastrar.jaTemConta, que hoje casa exatamente com entrar.titulo.

### `cadastrar.erros.geral / cadastrar.erros.falhaInterna`

Na mesma tela o botao diz "Creer un compte" e o erro fala de "l'inscription". Dois vocabularios para a mesma acao. O glossario autoriza os dois (s'inscrire / creer un compte) e o pt tem o mesmo descompasso ("Criar conta" / "o cadastro"), entao pode ser intencional. PONTO NOVO: o messages/revisao/es.md levantou exatamente esta questao nestas mesmas duas chaves em espanhol ("completar el registro" x botao "Crear cuenta") e deixou em aberto — vale fechar uma vez so e aplicar nos dois idiomas, senao es e fr divergem por acidente. Se alinhar ao botao: "impossible de creer le compte" / "impossible de creer le compte pour le moment". Secundario: "finaliser" e levemente corporativo (o brief pede registro sem tom corporativo nos erros); "terminer" e mais chao.

### `entrar.semConta / cadastrar.jaTemConta`

As duas unicas frases do grupo em que o tutoiement aparece com sujeito explicito ("Tu n'as pas encore de compte ?", "Tu as deja un compte ?"). O pt e impessoal e nao expoe tratamento nenhum, entao a escolha do "tu" fica visivel aqui e em lugar nenhum mais. Se o time recuar do tu, e nesta chave que se decide, e a alternativa neutra nao mexe no resto do arquivo: "Pas encore de compte ?" e "Deja un compte ?". NOTA TECNICA CONFIRMADA: o espaco antes do "?" e U+00A0 de verdade nas duas (verifiquei byte a byte; e o unico NBSP do arquivo). Quem reescrever essas frases tem que redigitar o insecavel, senao o "?" desce sozinho de linha. Vale tambem confirmar que nenhum formatador/prettier do pipeline normaliza NBSP para espaco comum.

### `entrar.subtitulo`

"De retour a la lecture." esta correto e natural, mas e impessoal — com artigo — enquanto o resto do arquivo trata por tu. O ingles foi possessivo ("Back to your reading.") e o espanhol foi impessoal igual ao frances. O revisor de es levantou exatamente este ponto na chave equivalente e deixou para o nativo: "De retour a ta lecture." alinharia ao tom pessoal do catalogo. Diferenca de calor, nao de sentido — mas convem decidir igual em es e fr.

### `comum.formato.NOVEL`

"Roman" está conforme o glossário e não é erro, mas é a chave nº1 para um nativo do nicho olhar. Dois pontos concretos: (a) é o ÚNICO item traduzido de uma lista em que Manga/Manhwa/Manhua foram mantidos, então quebra o padrão visual do filtro de formato; (b) "roman" em francês evoca romance literário impresso, não web novel coreana/chinesa — o leitor francófono de scan diz "light novel" ou "novel". Pergunta fechada para o nativo: o filtro deve dizer "Roman", "Novel" ou "Light novel"? Se mudar, muda junto em meta.descricao.

### `meta.descricao`

"Un Letterboxd pour manga, manhwa et roman, avec une progression de lecture automatique et privée." Não marquei como problema porque enumeração sem determinante é aceitável em registro de slogan, mas é a decisão mais arriscada do lote por ser a meta description (SEO) e a primeira frase que o usuário lê. O francês corrente pediria "pour le manga, le manhwa et le roman" ou o plural "pour les mangas, les manhwas et les romans" — es e en escaparam porque os dois idiomas aceitam substantivo nu depois de "para"/"for", o francês é o mais resistente dos três. Recomendo "pour le manga, le manhwa et le roman" como padrão seguro. Concordância interna está certa: "une progression … automatique et privée" (progression é feminino).

### `erros.obra_invalida`

A decisão de manter "obra" em português (ordem do dono do repo) fica visível em EXATAMENTE 5 chaves, todas em `erros` — listo aqui as 5 porque o relatório do tradutor errou o escopo ao dizer que meta e cabecalho também têm o problema (não têm, a palavra não aparece lá): erros.obra_invalida ("obra invalide"), erros.obra_nao_encontrada ("obra introuvable"), erros.obra_fora_do_catalogo ("obra introuvable dans le catalogue"), erros.lista_ou_obra_nao_encontrada ("liste ou obra introuvable") e erros.ordem_invalida ("l’ordre doit contenir exactement les obras de la liste"). A mais estranha é ordem_invalida, a única com artigo francês + plural em -s numa palavra que não existe no idioma ("les obras") — um nativo lê como erro de digitação. Ponto positivo do trabalho: os adjetivos escolhidos (invalide, introuvable) são invariáveis em gênero, então trocar "obra" por "œuvre" (f.) nas 5 chaves é substituição direta, sem retoque de concordância.

### `erros.entrada_nao_encontrada`

"entrée introuvable". Nenhum dos outros idiomas resolve melhor (en "entry", es "entrada"), mas em francês "entrée" é ambíguo de um jeito que "entry"/"entrada" não são: significa entrada de prédio e prato de entrada antes de significar registro. É um 404 que aparece em 4 rotas de uso real — estante/[id] (2x), fontes, leitura e progresso — sempre para dizer "essa obra não está na sua estante". Nativo decide se "entrée introuvable" se entende no contexto ou se vale "élément introuvable" / "cette obra n’est pas dans ta bibliothèque".

### `erros.template_invalido`

"modèle invalide — refais la dérivation". A dúvida do tradutor era se a string chega ao usuário final: chega. É devolvida por `POST /api/v1/fontes` (src/app/api/v1/fontes/route.ts:75), que é a tela de configurar fonte de leitura. "dérivation" em francês é termo de linguística, matemática e eletricidade — para um leitor de mangá é opaco. A frase é obscura no pt também, então a correção certa é reescrever nos dois idiomas, não só no fr. Sobre "modèle" vs "template": "modèle" respeita a regra de não usar anglicismo tendo palavra francesa corrente e é a escolha certa se a string é para usuário; se virar mensagem de dev, "template" é o que o dev francófono fala.

### `cabecalho.estante`

"Bibliothèque" está certo pelo glossário (étagère seria a prateleira; librairie seria a loja — armadilha evitada corretamente). O tradutor superdimensionou o risco de layout: medi a soma dos 4 itens de navegação (catalogo+listas+estante+perfil) — pt 27, en 24, es 30, fr 33 caracteres. São só 3 a mais que o espanhol que já está em produção, e o header (src/app/(ui)/[locale]/layout.tsx:139-147) é um flex com gap-3 sem truncate, então o comportamento é o mesmo do es. O risco real que fica de pé é o outro que ele apontou: "Bibliothèque" e "Catalogue" soam como a mesma coisa para quem chega no produto, e o nome não carrega a distinção (uma é minha, o outro é de todos). Se o nativo quiser encurtar e diferenciar, "Ma biblio" é corrente e informal e combina com o tratamento tu do resto.

### `erros.arquivo_grande_demais`

"l’image dépasse 512 Ko" com U+00A0 entre número e unidade — tipografia francesa correta e "Ko" (kilo-octet) é a unidade certa. Dois pontos para checar fora da tradução: (a) se o resto do fluxo de upload mostrar "KB" vindo do navegador ou de componente não traduzido, a tela se contradiz; (b) o limite real é `LIMITE_DO_AVATAR_BYTES = 512 * 1024` em src/server/domain/avatar.ts, ou seja 512 KiB — "Ko" estritamente é 1000 octetos e o purista escreveria "Kio". Todos os idiomas arredondam igual, então só mudar se o time quiser precisão em todos.

### `erros.limite_excedido`

NÃO CORRIGIR. "attends avant de réessayer" está certo: attendre = ESPERAR (o pt "aguarde"), não atender. É o falso amigo mais provável de ser "consertado" por engano para "réponds" ou "sers". O imperativo tu "attends" com -s também está certo (verbo em -re mantém o s). Repasso o aviso do tradutor porque concordo com ele e ele precisa sobreviver à próxima revisão.

### `erros.pedido_invalido`

NÃO CORRIGIR. "requête invalide" é o termo técnico certo para HTTP request. "demande" seria o cognato tentador (demander = PEDIR) e faria a mensagem soar como solicitação humana. Combina bem com erros.corpo_invalido ("corps invalide — JSON attendu"), que fala do corpo da mesma requisição — conferi, os dois são coerentes.

### `erros.credenciais_invalidas`

NÃO CORRIGIR sem nativo. "e-mail ou mot de passe incorrect" está no singular masculino enquanto o pt está no plural ("incorretos"). Isso é a concordância padrão do francês com "ou" (acordo com o termo mais próximo) e é a formulação canônica em telas de login francesas. Um revisor lusófono vai querer "incorrects" para bater com o pt — seria uma piora.

### `erros.username_caracteres`

Além do problema de gramática que reportei, há uma escolha de registro para o nativo fechar: "tiret bas" é o termo oficial para underscore, mas boa parte do público jovem de mangá diz "underscore". E "tiret" (e não "trait d’union") está certo para listar caracteres permitidos num campo. Se o time preferir clareza a purismo: "tiret bas (_)" resolve os dois.

### `erros.proprio_perfil`

"impossible sur ton propre profil". Confirmei o uso: sai em duas rotas, curtir perfil (usuarios/[username]/curtida/route.ts:44) e seguir (usuarios/[username]/seguir/route.ts:44). O pt "não vale para o próprio perfil" é coloquial e a versão francesa ficou mais seca; o sentido está preservado. Se soar frio, "ne s’applique pas à ton propre profil" é o meio-termo neutro. Detalhe menor de repetição: "impossible" abre também erros.falha_interna ("impossible pour le moment"), então dois erros diferentes começam com a mesma palavra.

### `meta.titulo`

Não é defeito de tradução, é de ENTREGA, e ninguém levantou. `messages/fr.json` hoje é cópia integral do pt-BR (351 folhas, 14 namespaces). Simulei a mesclagem: com estas 63 chaves aplicadas, 291 das 351 folhas continuam idênticas ao pt = 82,9%. O teste "não é o português copiado" em tests/i18n/mensagens.test.ts corta em 50% (o comentário do próprio teste registra que isso já aconteceu ao acrescentar es e de novo ao acrescentar fr). Ou seja: mesclar só este lote deixa o CI vermelho e é esperado — não confundir com regressão da tradução. Faltam os namespaces entrar, cadastrar, autor, catalogo, componentes, estante, home, listas, obra e perfil.

### `catalogo.cartao.formatoGenerico`

"Obra" mantido por decisao do dono. Confirmei em page.tsx:126-130 que e o fallback do selo de FORMATO: quando a obra tem countryOfOrigin sai comum.formato.* (Manga / Manhwa / Manhua / Roman) e quando nao tem sai esta chave, no mesmo <span>. Numa lista de formatos franceses, "Obra" le como um formato chamado Obra ou como traducao esquecida. E o pior lugar da decisao no produto; se ela for rediscutida, comece por aqui — um fallback frances ("Autre", "Format inconnu") resolve sem tocar no glossario.

### `catalogo.cartao.capitulos`

NAO DEIXAR NINGUEM "CORRIGIR" DE VOLTA. O pt usa =1 e o fr usa one de proposito: em frances a categoria one cobre ZERO e um, entao obra sem capitulos mostra "0 chapitre" no singular, que e o correto. Para quem so le portugues isso parece bug ("0 capitulos"), e trocar one por =1 manda o zero para other e devolve "0 chapitres", errado e silencioso. Vale confirmar na tela com uma obra sem capitulos no AniList.

### `catalogo.filtros.todos`

Ja esta em problemas, mas repito aqui porque a decisao final e de nativo: uma chave para tres selects de generos diferentes (Type masc., Genre masc., Décennie fem.). Proponho "Tout" (invariavel). Se o nativo achar que perde forca de "todos os tipos", a alternativa e tres chaves separadas — ai e mudanca em filtros-catalogo.tsx, nao so no catalogo.

### `catalogo.busca.rotulo`

"Rechercher une obra" — aria-label do input (busca-catalogo.tsx:98), so ouvido por leitor de tela. E o segundo pior ponto da decisao "obra fica em portugues": obriga a dar artigo e genero franceses a uma palavra que nao existe no idioma, e "une obra" colado soa a erro de digitacao. Se quiserem contornar so aqui, sem mexer no glossario, "Rechercher un titre" resolve e ninguem ve na tela.

### `catalogo.filtros.ordens.recente`

"Plus récents" no masculino generico, mas o arquivo inteiro trata obra como feminina e o rotulo se refere as obras — um nativo pode exigir "Plus récentes". O tradutor desviou do mesmo problema em ordens.nota usando substantivo ("Meilleures notes"); aqui a saida sem concordancia seria "Nouveautés". Decidir junto com filtros.todos: as duas sao a mesma pergunta de concordancia.

### `catalogo.filtros.ordens.alta`

No mesmo dropdown convivem "Populaires" (adjetivo), "Meilleures notes" (substantivo), "Tendances" (substantivo) e "Plus récents" (adjetivo) — mistura gramatical que um menu de ordenacao frances normalmente nao faz. Alem disso "Tendances" e "Populaires" ficam perto demais de sinonimo, e o cabecalho destaques ja diz "Populaires en ce moment", entao a palavra "populaire" aparece duas vezes na mesma tela com sentidos diferentes. Um nativo diz se "En vogue" separa melhor de "Populaires".

### `catalogo.botaoEstante.adicionar`

Crescimento de largura em componente apertado: "+ Estante" (9) -> "+ Bibliothèque" (14) num botao pequeno do cartao, e a irma naEstante foi de "Na estante" (10) para "Dans ta bibliothèque" (20) num <span> que ja carrega icone de visto (botao-estante.tsx:66 e 79). Em cartao de duas colunas pode quebrar linha. Se quebrar: "Ajouté" e "+ Ajouter" cabem, mas perdem a palavra do glossario.

### `catalogo.subtitulo`

"…et ta lecture commence à compter." — compter e contar (numerar) E importar; o trocadilho do pt sobrevive, mas o sentido "passa a importar" pode dominar e o leitor perder a ideia de contabilizacao do progresso. Alternativa literal: "et ton suivi de lecture démarre". A frase concentra tres decisoes de uma vez (elisao l’obra, feminino em ajoute-la, e o verbo de busca do problema 1), entao e a linha que mais merece olho de nativo.

### `catalogo.botaoEstante.erro`

"ça n’a pas marché — réessaie": registro falado e minuscula inicial, fiel ao pt, mas e texto de ERRO. Se o nativo achar casual demais, a neutra e "échec — réessaie". Ponto tipografico menor: o travessao esta com espaco normal dos dois lados; a convencao francesa poria espaco insecavel antes, para o — nao abrir linha sozinho. Nao e obrigatorio pela regra deste projeto, so vale saber que e o unico ponto do arquivo onde isso aparece.

### `home.apresentacao.descricao`

Concordo com a prioridade do agente: é o pitch da home deslogada. Dois pontos para o nativo. (1) NOVEL -> "roman": o glossário manda, mas "manga, manhwa et roman" mistura dois registros e um leitor francês pode entender romance literário; o nicho francófono diz "light novel" ou "novel". (2) "une bibliothèque bien à toi" para "estante sua" — confirmar se soa caloroso ou infantil. Nada aqui está errado, é decisão de registro.

### `home.contagem.obras`

Onde a decisão de manter "obra" em português fica mais exposta: a chave é só o substantivo, sem frase que dê contexto, e a tela mostra literalmente "12 obras" e "0 obra". Confirmei que "0 obra" no singular é o comportamento CORRETO do francês (o ramo `one` cobre zero) — não é bug, mas vai parecer bug para quem revisar. Equivalentes naturais seriam "œuvre(s)" ou "titre(s)". Se a decisão sobre "obra" for reaberta, é por esta chave.

### `home.boasVindas.semFonte`

"En cours" aparece duas vezes com papéis diferentes: como frase comum ("Aucune lecture en cours") e como o RÓTULO do status READING ("marque une obra comme En cours"). O usuário pode não perceber que o segundo é o nome de um botão. Saída para o nativo, se confirmar a confusão: reescrever a primeira metade sem "en cours" (ex.: "Aucune de tes lectures n'a de source configurée pour l'instant — …"). O resto da frase está gramaticalmente correto e o uso de "une obra" (feminino) está consistente com as outras chaves.

### `home.boasVindas.estanteVazia`

Além da correção de glossário já listada em problemas: "ta première obra" expõe o gênero atribuído a "obra" na concordância de "première". Esta chave, home.boasVindas.semFonte ("une obra") e home.resenha.spoiler ("l'obra") formam um bloco — se a revisão trocar "obra" por "titre" (masculino) ou "œuvre" (feminino), as três mudam juntas. Nunca revisar uma isolada.

### `home.populares.titulo`

"Populaires en ce moment" é bem mais longo que "Populares agora" num <h2> com uppercase tracking-wide (page.tsx), então pode quebrar linha; e adjetivo plural sozinho como título de seção é menos idiomático em francês do que em português — "Tendances" resolveria tamanho e naturalidade. IMPORTANTE que o agente não notou: essa mesma string do pt ("Populares agora") é reutilizada em catalogo.destaques, então a escolha feita aqui tem de ser repetida lá quando o namespace catalogo for traduzido.

### `home.boasVindas.continuarLendo`

Concordo que "Reprendre la lecture" é mais preciso que "Continuer la lecture" para retomar de onde parou (é o que Netflix/Kindle usam em francês). CORRIJO a premissa do agente: isto NÃO é o botão principal — em page.tsx:210-212 é um <h2 uppercase tracking-wide> acima da lista de cards. Ou seja, trocar tem risco menor do que ele descreveu, e o comprimento é que importa, não o sentido do clique. Quem é chamado de botão é outro elemento, mencionado dentro de boasVindas.semFonte.

### `home.vitrine.resenhas.vazio`

Representa 4 chaves com o mesmo padrão (vitrine.resenhas.vazio, vitrine.listas.vazio, atividade.vazia e o fim de boasVindas.semFonte). Três coisas para o nativo, todas de bloco: (a) "vitrine" existe em francês mas evoca vitrine de loja / "site vitrine" — pode soar comercial para um carrossel de resenhas; note que a palavra não aparece em lugar nenhum da UI, o usuário vê só o título "Critiques"; (b) "par ici" pode soar coloquial demais, a alternativa neutra é "ici"; (c) o presente do pt virou futuro ("apparaîtra") — se o nativo preferir presente, as 4 mudam juntas.

### `home.saude.estado.down`

AVISO PARA QUEM FOR CORRIGIR, vale para as três chaves de saude.estado: elas são concatenadas por page.tsx:74 como `${nome} ${estado}`, e {nome} pode ser "base de données" (feminino) ou "catalogue AniList" (masculino). Qualquer substituição por adjetivo que concorde em gênero ("non configuré", "opérationnelle", "indisponible" é seguro, "coupé/coupée" não) sai errada em metade dos casos. As correções que proponho nos problemas — "en ligne", "inaccessible", "à configurer" — foram escolhidas por serem invariáveis. Não trocar por adjetivo com flexão.

### `home.resenha.spoiler`

Independente da correção do pronome que listei em problemas: a elisão "l'obra" aplica uma regra francesa a uma palavra que não é francesa. Visualmente funciona e é consistente com o resto do arquivo, mas é o tipo de coisa que só um nativo diz se lê como natural ou como erro de tradução automática. Anda junto com o bloco de gênero de "obra".

### `home.rodape.verificado`

Não é defeito da tradução, é para o nativo não se assustar: {quando} é o ISO cru de health.service.ts:51 (relogio().toISOString()), então o rodapé mostra "vérifié le 2026-09-07T12:00:00.000Z". Confirmei renderizando. "vérifié le" é a preposição certa para data completa, e a feiura do timestamp é igual nos 4 idiomas — se incomodar, o conserto é no código, não no fr.json.

### `listas.detalhe.curtida.descurtir`

PRIORIDADE 1. Confirmo o risco que o tradutor levantou, e ele e o mais concreto do arquivo: na MESMA tela de detalhe convivem detalhe.remover = "retirer" (tira a obra da lista) e detalhe.curtida.descurtir = "retirer le j’aime de la liste" (tira a curtida). Dois botoes, mesmo verbo, acoes diferentes e consequencias diferentes. O glossario amarra so o segundo ("retirer le j’aime"), entao a saida barata e trocar detalhe.remover para "enlever" ou "retirer de la liste" — nao ha violacao de glossario nisso. Nativo decide qual dos dois cede.

### `listas.campos.descricaoOpcional`

O tradutor NAO marcou esta. "Description (facultatif)" — o adjetivo esta no masculino ao lado de "Description", que e feminino. Existem as duas praticas em frances: "(facultatif)" como etiqueta invariavel de campo (estilo Microsoft/Google) ou "(facultative)" concordando com o substantivo. As duas se defendem, mas e exatamente o tipo de coisa que ninguem do time consegue julgar e que um leitor frances nota na hora. Como esta chave e de `campos` e vai reaparecer em outros formularios, a decisao aqui vira padrao do produto inteiro.

### `listas.indice.ordenar.curtidas`

Confirmo o risco do tradutor e acrescento o angulo que ele nao viu: alem do problema "j’aime nao vira adjetivo", ha QUEBRA DE PARALELISMO no seletor. As duas opcoes aparecem lado a lado e sao "Récentes" (sem artigo) e "Les plus aimées" (com artigo). Num select/segmented control isso fica visualmente desalinhado. Alternativas que mantem o paralelismo: "Récentes" / "Populaires", ou "Récentes" / "Aimées". A escolha de evitar o anglicismo "likées" me parece certa; o problema e o artigo.

### `listas.erros.semBanco`

O tradutor NAO marcou esta. "qui n’a pas répondu à l’instant" — "à l’instant" em frances ancora um evento afirmativo que acabou de acontecer ("il est parti à l’instant"). Sob NEGACAO fica marcado/desconfortavel. Mais natural: "qui ne répond pas pour le moment" ou simplesmente "qui n’a pas répondu". Junte com o item de indice.criar.erros.rede: "à l’instant" aparece negado em duas chaves diferentes, entao se o nativo reprovar a construcao, ela cai nas duas de uma vez.

### `listas.detalhe.ordenar.antes`

Confirmo. "Avancer {titulo} d’une position" / "Reculer {titulo} d’une position" — os dois verbos sao transitivos e gramaticais, mas ambos carregam leitura TEMPORAL forte em frances ("avancer un rendez-vous" = antecipar, "reculer un rendez-vous" = adiar). Num aria-label de reordenacao o usuario de leitor de tela ouve o rotulo fora de contexto visual, que e justamente onde a ambiguidade morde. en e es escaparam disso ("Move earlier", "una posición antes"). Alternativa neutra quanto a layout: "Déplacer {titulo} d’un cran vers le début / vers la fin". Comprimento nao e restricao aqui.

### `listas.detalhe.vazia`

Confirmo o risco do termo cru, mas CORRIJO uma afirmacao do relatorio do tradutor: ele diz que "chaque obra" expoe a decisao de genero feminino. Nao expoe — "chaque" e invariavel e "des obras" e partitivo, entao NENHUMA das duas ocorrencias mostra genero. Varri o arquivo inteiro: nao ha um unico artigo definido, demonstrativo ou adjetivo concordando com "obra". Ou seja, a decisao de genero declarada no relatorio nao esta testada em lugar nenhum deste lote e so vai aparecer no primeiro namespace que escrever "l’obra"/"cette obra"/"les obras publiées". Vale o nativo cravar o genero AGORA, por escrito, antes que dois namespaces divirjam.

### `listas.detalhe.autoria`

Confirmo. "par <autor>{username}</autor> · # obras" poe o termo portugues cru colado ao nome do autor, no lugar de maior visibilidade da tela, e ainda dentro do ramo de plural — para um leitor frances o `-s` de "obras" parece erro de digitacao, nao flexao. Tecnicamente a chave esta impecavel (one/other corretos, `#` preservado, tag intacta): o risco e so a decisao de produto. Se ela for revista para "œuvre/œuvres", esta chave e detalhe.vazia sao as duas unicas do lote a mudar.

### `listas.indice.subtitulo`

Confirmo o risco de registro de "farfelues" e acrescento duas coisas que o tradutor nao viu. (1) "des collections FAITES par les lecteurs" e uma colocacao fraca em frances — "faire une collection" nao e o verbo natural; um nativo escreveria "créées par les lecteurs" ou "des collections de lecteurs". Cheira a decalque de "feitas por". (2) "des classiques aux plus farfelues" mistura leituras de genero: "les classiques" le como masculino por default, "les plus farfelues" e feminino (concordando com collections). Fica assimetrico. "des plus classiques aux plus farfelues" resolveria de graca. E o subtitulo da tela, define o registro do produto em frances.

### `listas.indice.criar.erros.rede`

Confirmo. ".falhou" = "ça n’a pas marché — réessaie" e ".rede" = "ça n’a pas marché à l’instant — réessaie" ficaram praticamente indistinguiveis, e o unico diferenciador ("à l’instant") e justamente a construcao que eu questiono no item de erros.semBanco. O pt tambem separa mal ("não deu" vs "não deu agora"), entao herdar a fraqueza e defensavel — mas se o nativo for mexer, a versao de rede pede algo que nomeie a rede: "la connexion n’a pas suivi — réessaie".

### `listas.indice.convite`

Confirmo, prioridade baixa mas estruturante. "<entrar>Connecte-toi</entrar> pour créer la tienne." e a vitrine publica da decisao de tratar por TU: e o convite que aparece para visitante deslogado na home de listas. Se o tu passa aqui, passa no arquivo todo e nos 13 namespaces seguintes. O "la tienne" eliptico depende de o leitor recuperar "liste" do titulo acima — mesmo mecanismo do "a sua" no pt e do "la tuya" no es, entao o risco e o mesmo que o time ja aceitou, mas se o componente for reusado longe do titulo vira "pour créer ta liste".

### `perfil.avaliadas.titulo`

"Notees" como titulo de secao e "<forte>{valor}</forte> notees" na linha de contagens: participio feminino solto, sem substantivo, decalcado de "Avaliadas". Confirmo o risco que o tradutor levantou e vou um pouco alem — em pt e es a elipse funciona, em frances um participio sozinho como cabecalho lê como frase interrompida ("12 notees" faz o leitor perguntar "12 quoi ?"), e o ingles fugiu disso com "Rated", que e adjetivo. Nao marquei como erro porque a elipse existe em interface francesa de catalogo (SensCritique e afins) e a decisao depende de nativo. Se mudar, as duas chaves mudam juntas — o titulo da secao e a contagem tem que casar. Candidatos: "Notes" (substantivo, mas passa a contar notas, nao obras) ou "Obras notees" (mantem o sentido e arrasta o problema do termo em portugues).

### `perfil.avaliadas.vaziaComFiltro`

Termo "obra" mantido em portugues por decisao do dono. Concordo com o tradutor que este e o ponto mais fragil do arquivo: a palavra nao existe em frances e aqui ela vem com artigo e concordancia em quatro chaves ("Aucune obra avec ce filtre", "Note une obra et elle apparait ici", "n'a encore note aucune obra", "Note une obra avec un texte") mais o plural de listas.obras. O feminino foi aplicado sem excecao, o que era o pedido. Registro so o efeito colateral que o tradutor nao mencionou: se a decisao mudar para "oeuvre" a troca e mecanica (feminino tambem), mas se for "titre" (masculino) mudam tambem "Aucune"->"Aucun", "une"->"un", "elle"->"il" e a concordancia de avaliadas.titulo/numeros.avaliadas — ou seja, seis chaves, nao tres.

### `perfil.social.seguindo`

"Suivi" no botao ja-seguindo. Alem do que o tradutor levantou (Suivi vs Abonne e o genero de quem le), tem um ponto que ele nao citou: "le suivi" e um substantivo corrente em frances com o sentido de acompanhamento/monitoramento. Num botao de uma palavra, ao lado do par "Suivre", a leitura como participio ("seguido") e a mais provavel, mas a ambiguidade existe e um nativo decide em dois segundos. Verifiquei o uso em acoes-sociais.tsx:91 — e o texto VISIVEL do botao, nao aria-label, entao um erro aqui aparece na tela.

### `perfil.numeros.curtidasNoPerfil`

So o ramo `other`, aqui e em resenhas.curtidas. E valido em ICU e o teste do projeto aceita como "palavra invariavel", entao nao e erro — mas divergiu da casa: en e es escrevem os DOIS ramos com o texto identico quando a palavra nao varia (es curtidasNoPerfil e es resenhas.curtidas fazem exatamente isso, en numeros.avaliadas tambem, "rated"/"rated"). Vale alinhar por dois motivos: comparacao lado a lado dos quatro idiomas e a armadilha de manutencao — com so `other`, o teste passa a IGNORAR essa chave, entao se alguem trocar "j'aime" por "mention j'aime" (que varia) o singular errado entra sem o CI reclamar.

### `perfil.numeros.curtidasDadas`

"j'aime donne / j'aime donnes": o -s do participio depois de substantivo invariavel e defensavel (a concordancia acompanha o numero do sintagma, como em "des on-dit malveillants"), mas e o tipo de coisa que dois nativos discutem. Somando ao que o tradutor ja anotou: repare que esta chave e a UNICA que distingue curtidas dadas de curtidas recebidas, e a distincao inteira repousa nesse participio — se o nativo trocar por "mentions j'aime donnees", a linha de estatisticas ganha 8 caracteres num <p> que ja empilha sete contagens lado a lado (page.tsx:117-143).

### `perfil.numeros.seguindo`

Unica chave com mais ramos que pt/en/es (one+other contra so other). A justificativa gramatical esta certa — "abonnement" e substantivo e varia, manter so `other` daria "1 abonnements" — e o teste aceita. Deixo registrado para o revisor que comparar os quatro idiomas em coluna nao abrir issue por engano. A duvida real e vocabular, como o tradutor disse: num app de leitura "abonnements" pode ser lido como assinatura paga.

### `perfil.foto.remover`

"remover" -> "supprimer". Nao e erro e e o que interface francesa usa para apagar foto, mas o glossario reserva "supprimer" para APAGAR, e o pt distingue os dois verbos em varias telas (perfil.foto.remover e estante.avaliacao.remover contra obra.resenhas.apagar e listas.detalhe.apagar). Se "supprimer" for gasto aqui, os proximos namespaces perdem o par. "retirer" preserva a distincao e cabe no mesmo espaco (e um link minusculo, foto-de-perfil.tsx:181). Decisao de glossario, nao desta chave.

### `perfil.resenhas.vaziaPropria`

"Note une obra avec un texte et elle apparait ici." Dois pontos para nativo: "avec un texte" pode ser lido como "uma obra que tem um texto" em vez de "nota acompanhada de um texto" ("en y ajoutant un texte" desfaz); e "elle" fica ambiguo entre "obra" e "critique", as duas femininas — a mesma ambiguidade do pt, mas o espanhol resolveu explicitando ("y tu resena aparecera aqui"), e vale decidir se o frances segue o pt ou o es.

### `perfil.filtros.ordens.maior_nota`

"Note la plus elevee" / "Note la plus basse" num <select> que fica na mesma linha do seletor de nota e do botao de limpar (filtros-avaliadas.tsx:50-72). Confirmo o alerta de comprimento do tradutor. Junto com isso: o rotulo do proprio seletor e "Trier" solto antes do <select> — em frances o padrao e "Trier par", e o rotulo aqui e visivel, nao aria-label. E "effacer" em filtros.limpar so aparece quando ha filtro ativo; "effacer" e corrente, "reinitialiser" e o outro padrao, mais formal e bem mais longo.

### `perfil.voce`

"toi" na pilula colada ao proprio username (page.tsx:110). Coerente com o tu do arquivo; a alternativa "moi" (perspectiva do dono, padrao em Contacts/Drive FR) muda o tom. Custo zero de troca, so precisa de nativo. Anoto que a decisao deveria valer junto com obra.resenhas.minha ("voce"), que e a mesma etiqueta em outro namespace e ainda esta em portugues no fr.json — se as duas divergirem, a mesma ideia vai aparecer com duas palavras diferentes na mesma sessao de uso.

### `obra.contagem.aberturas`

Alem do problema que abri, e a decisao de vocabulario mais consequente do grupo: nomeia o evento que a extensao registra. Perguntar ao nativo de forma fechada: "12 ouvertures", "12 consultations" ou "12 lectures"? Explicar que "lecture" colide com o rotulo vizinho "Historique de lecture" na MESMA linha (page.tsx:408-411 monta "Historique de lecture · <contagem>"). Se a escolha final for masculina, obra.historico.maisRecentes quebra a concordancia silenciosamente e tem de mudar junto.

### `obra.historico.maisRecentes`

"les {n} plus récentes". Tres coisas. (1) O artigo "les" foi acrescentado e nao existe no pt nem no en — esta certo, sem ele a frase e agramatical, e o es fez igual ("las {n} mas recientes"). (2) O feminino plural concorda com o substantivo elidido de contagem.aberturas: e um acoplamento invisivel entre duas chaves, nao mexer numa sem olhar a outra. (3) Confirmei no codigo que a chave so e usada quando historico.length === 20 exatamente (page.tsx:409), entao o render real e sempre "les 20 plus récentes" — perguntar se o nativo nao prefere explicitar o substantivo.

### `obra.avaliacao.titulo`

RISCO QUE O TRADUTOR NAO VIU. "Ta note" e obra.nota.titulo "Note Kidoku" NAO estao em areas separadas da tela: sao cards empilhados na mesma coluna direita (page.tsx:219-232), um imediatamente abaixo do outro, os dois em uppercase. O nativo tem de ler o par junto — "TA NOTE" / "NOTE KIDOKU" — e dizer se o eco funciona (na minha leitura funciona, e ate melhor que o pt "Sua avaliacao" / "Nota do Kidoku", porque fica paralelo) ou se o segundo precisa de outra palavra. Ver tambem obra.contagem.avaliacoes ("128 notes"), que renderiza dentro do proprio card Note Kidoku, logo abaixo do titulo: a sequencia real e "NOTE KIDOKU / ★ 4,2 · 128 notes".

### `obra.resenhas.vazio`

"Pas encore de critique par ici — note l’obra avec quelques mots et la tienne apparaît pour tout le monde." E onde a decisao do dono de manter "obra" em portugues fica mais exposta: elisao francesa aplicada a uma palavra que nao existe no idioma ("l’obra"). Duas perguntas separadas para o nativo: (1) quanto "l’obra" atrapalha a leitura — insumo para rediscutir o glossario; (2) se "noter avec quelques mots" transmite "avaliar com um texto" ou soa como "dar nota as palavras". Observacao: a estranheza de (2) ja existe no pt ("avalie com um texto"), en e es, entao pode ser problema da frase de origem, nao da traducao.

### `obra.resenhas.minha`

"toi" — chip de uma palavra ao lado do proprio nome na lista de resenhas (review-social.tsx:240-244). E o ponto onde o tutoiement fica mais nu. "toi" e a forma tonica correta para rotulo isolado, mas muitos produtos franceses escrevem "moi" nesse chip (ponto de vista de quem le: "esta e minha") e um produto que trate por vous poria "vous". Chave curta, altissimo contraste visual, barata de trocar — boa primeira pergunta para o nativo.

### `obra.similares`

"Obras similaires" — a palavra portuguesa recebendo adjetivo frances concordado, num h2 de secao (page.tsx:447-450, uppercase por CSS). Junto com resenhas.vazio, e a vitrine da decisao do glossario. Confirmar se o hibrido e tolerável e, se for, se "similaires" e o adjetivo certo.

### `obra.apagar.confirmar`

"Supprimer le texte de la critique supprime aussi {itens}. Continuer ?" Dois pontos. (1) Eco "Supprimer… supprime" que o pt nao tem; se o nativo achar pesado, a saida barata e "efface aussi" no segundo verbo. (2) E a UNICA chave do namespace com espaco insecavel (U+00A0 antes do "?", conferido no hex) — quem reescrever esta frase tem de preservar o caractere, e um espaco normal deixa o "?" cair sozinho na linha. Conferi a composicao: {itens} vem de Intl.ListFormat('fr') sobre contagem.curtidas + contagem.comentarios (avaliacao-da-obra.tsx:118-136), e o conector frances e " et ", entao o render real e "…supprime aussi 2 j’aime et 1 commentaire. Continuer ?".

### `obra.contagem.curtidas`

INTOCAVEL — marcar como tal. "{n, plural, other {{n} j’aime}}", so o ramo other. Nao e esquecimento: conferi tests/i18n/mensagens.test.ts, que aceita "so other" como declaracao de que a palavra nao varia, e "j’aime" e mesmo invariavel. Um revisor futuro vai querer acrescentar um ramo `one`; nao ha nada para consertar e acrescentar nao muda o render (testei: 0/1/2/21 -> "0 j’aime"/"1 j’aime"/"2 j’aime"/"21 j’aime"). A unica pergunta legitima para o nativo e outra: se o produto ficaria melhor com a forma completa "mention j’aime / mentions j’aime" — que ai SIM varia e passaria a exigir one + other. Atencao: o valor so aparece na tela injetado dentro de apagar.confirmar (review-social.tsx:266-271 mostra a curtida como ♥ + numero cru, sem esta chave).

### `obra.erros.limite`

INTOCAVEL. "attends un peu" esta CERTO — attendre = esperar. O risco e inverso: um revisor lusofono que decorou a armadilha "attendre nao e atender" pode trocar por reflexo. "répondre" seria erro grave. Unica alternativa legitima: "patiente un peu" (sinonimo, levemente mais formal).

### `obra.nota.distribuicao`

INTOCAVEL. "Répartition des notes" (aria-label do histograma, nota-kidoku.tsx:42). Um revisor lusofono vai querer o cognato "Distribution" — existe em frances, mas puxa para distribuicao comercial/entrega; para grafico estatistico o corrente e "répartition". Confirmar com o nativo e marcar.

### `obra.painel.convite`

"<entrar>Connecte-toi</entrar> pour l’ajouter à ta bibliothèque, la noter et enregistrer ta lecture." Os pronomes objeto "l’" e "la" foram acrescentados (nao existem no pt) porque em frances a enumeracao de verbos transitivos soltos nao fecha — a adicao esta correta. Confirmar se a cadeia de tres verbos com dois pronomes diferentes ainda le bem, e se "enregistrer ta lecture" transmite "registrar a leitura" (alternativa mais proxima do en "track": "suivre ta lecture"). Mesma pergunta vale para obra.painel.adicionar ("Ajoute-la à ta bibliothèque…"). Nota: "Ajoute-la" esta gramaticalmente correto sem -s — nao aplicar aqui a correcao de listas.vazia.

### `obra.modal.rotulo`

"Écrire une critique de {titulo}" (aria-label do modal, avaliacao-da-obra.tsx:274). {titulo} vem do AniList e pode comecar com vogal, produzindo "une critique de Attack on Titan", onde o frances falado elidiria ("d’Attack on Titan"). Nao da para elidir condicionalmente sem mexer no codigo. Decisao do nativo: aceitar a nao-elisao ocasional (e so leitor de tela) ou trocar por "Écrire une critique pour {titulo}", que e um pouco mais chato e sempre correto.

### `obra.avaliacao.resenhar`

"Resenhar…" (1 palavra) virou "Écrire une critique…" (3), e alterna com "Modifier la critique…". O frances nao tem verbo simples equivalente — "critiquer" e criticar/censurar e daria registro errado num botao. Conferi que o botao e w-fit (avaliacao-da-obra.tsx:203), entao nao quebra layout. Pergunta para o nativo: um site frances rotula assim, ou usaria "Écrire un avis" / "Donner mon avis"? A segunda opcao trocaria o termo do glossario (resenha = critique) e teria de valer para o namespace inteiro.

### `obra.resenhas.verAnteriores`

"voir {n} commentaire précédent / voir {n} commentaires précédents". O pt e eliptico ("ver 3 anteriores") e o frances explicitou o substantivo, como o en fez, porque "voir 3 précédents" solto soa truncado. Custo: o link cresce bastante dentro da thread ja indentada. Se o nativo achar que a elipse funciona, "voir les {n} précédents" (com artigo) e o meio-termo.

### `obra.erros.rede`

"ça n’a pas marché — réessaie". As outras quatro chaves de erro do namespace comecam com "impossible de…"; esta quebra o padrao de proposito, para reproduzir o coloquial do pt ("nao deu agora"). Confirmar se o registro cabe numa mensagem de erro do produto ou se o nativo prefere uniformizar ("impossible pour le moment — réessaie").

### `obra.curiosidades`

"Anecdotes" (h2 de secao, page.tsx:240; en "Trivia"). Boa escolha na minha leitura — "Curiosités" em frances puxa para curiosidade turistica/objeto raro, e "Anecdotes" e o que ficha de obra e revista usam. Confirmar com o nativo. Alternativas se ele discordar: "Le savais-tu ?" (mais quente e coerente com o tu, mas exigiria U+00A0 antes do "?") ou "Infos insolites".
