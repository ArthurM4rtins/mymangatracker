# Handoff da curadoria de estrutura narrativa

Atualizado em 2026-09-01. Leia este arquivo antes de continuar a curadoria.

## Estado atual

- Catálogo-alvo: 100 mangás populares do AniList, sem conteúdo adulto, em `catalog-snapshot.json`.
- Obras curadas: 100.
- Restantes: 0.
- Não há próxima obra: a fila de 100 títulos foi concluída.
- Checkpoint em `progress.json`: 1 `VERIFIED`, 44 `DRAFT`, 6 `DISPUTED`, 41 `INSUFFICIENT_EVIDENCE` e 8 `NOT_APPLICABLE`.
- O campo `nextAnilistId` está `null`, pois não restam obras pendentes.

Correção de identidade: o handoff anterior chamava Fullmetal Alchemist de AniList `30004`, mas o catálogo e o arquivo da obra confirmam `30025`.

O contador foi reconciliado neste handoff: uma linha duplicada de One Piece em `reports/batch-0001.md` havia feito o checkpoint anterior registrar uma curadoria a mais. A fonte de verdade é a contagem de arquivos com `curation.researchedAt` preenchido em `titles/`.

## Regras de trabalho

1. Leia `Obsidian/02. Implementacoes/story-curation/CLAUDE.md` e este arquivo.
2. Abra `data/story-structures/titles/<anilistId>.json` antes de pesquisar.
3. Confirme a numeração pela fonte oficial quando possível e pesquise uma taxonomia de arcos.
4. Registre URL, tipo de fonte, data de acesso, status, confiança e conflitos. Não crie limites sem evidência.
5. Use `DRAFT` para fontes comunitárias ou uma única fonte não confirmada; apenas `VERIFIED` é publicável.
6. Atualize o JSON da obra, `progress.json` e o relatório/addendum ao finalizar uma obra.
7. Valide com:

   ```powershell
   pnpm test tests/domain/story-structure.test.ts
   ```

   E faça uma checagem local do JSON/contadores com `node -e`.

## Modelo de dados

- Arquivo por obra: `data/story-structures/titles/<anilistId>.json`.
- Intervalos são inclusivos e usam `CHAPTER` com strings numéricas.
- Um segmento usa `range` quando contínuo e `ranges` quando possui dois ou mais intervalos contínuos.
- `ranges` foi incluído para Steel Ball Run: o arco `D4C` abrange 66-70 e 73-82, separado por `Ticket to Ride` (71-72). O validador e os testes já suportam isso.
- Não alterar Prisma nem UI nesta fase.

## Obras concluídas

| AniList | Obra | Status | Segmentos |
|---:|---|---|---:|
| 105398 | Solo Leveling | DRAFT | 22 |
| 30002 | Berserk | DISPUTED | 0 |
| 101517 | Jujutsu Kaisen | DISPUTED | 0 |
| 30013 | One Piece | DRAFT | 45 |
| 53390 | Attack on Titan | VERIFIED | 9 |
| 105778 | Chainsaw Man | DRAFT | 9 |
| 87216 | Demon Slayer: Kimetsu no Yaiba | DRAFT | 13 |
| 30011 | Naruto | DRAFT | 22 |
| 63327 | Tokyo Ghoul | DRAFT | 9 |
| 34632 | Goodnight Punpun | NOT_APPLICABLE | 0 |
| 85486 | My Hero Academia | DRAFT | 26 |
| 74347 | One-Punch Man | INSUFFICIENT_EVIDENCE | 0 |
| 30656 | Vagabond | DRAFT | 10 |
| 108556 | SPY x FAMILY | INSUFFICIENT_EVIDENCE | 0 |
| 30642 | Vinland Saga | DRAFT | 4 |
| 87423 | The Promised Neverland | DRAFT | 11 |
| 119257 | Omniscient Reader | INSUFFICIENT_EVIDENCE | 0 |
| 106130 | Blue Lock | DRAFT | 7 |
| 72451 | Horimiya | NOT_APPLICABLE | 0 |
| 30012 | Bleach | DRAFT | 5 |
| 86635 | Kaguya-sama: Love is War | DRAFT | 24 |
| 102988 | Tokyo Revengers | DRAFT | 9 |
| 132029 | Dandadan | INSUFFICIENT_EVIDENCE | 0 |
| 30026 | Hunter x Hunter | DRAFT | 9 |
| 30003 | 20th Century Boys | NOT_APPLICABLE | 0 |
| 86123 | Black Clover | DRAFT | 11 |
| 30001 | Monster | NOT_APPLICABLE | 0 |
| 97852 | Komi Can't Communicate | INSUFFICIENT_EVIDENCE | 0 |
| 117195 | [Oshi no Ko] | DRAFT | 11 |
| 120760 | Kaiju No.8 | DRAFT | 9 |
| 31706 | JoJo's Bizarre Adventure: Part 7 - Steel Ball Run | DRAFT | 25 |
| 87170 | Fire Punch | DRAFT | 5 |
| 30025 | Fullmetal Alchemist | INSUFFICIENT_EVIDENCE | 0 |
| 140475 | The Fragrant Flower Blooms With Dignity | INSUFFICIENT_EVIDENCE | 0 |
| 107237 | Blue Period | INSUFFICIENT_EVIDENCE | 0 |
| 86964 | Bastard | INSUFFICIENT_EVIDENCE | 0 |
| 46765 | Kingdom | DRAFT | 28 |
| 100664 | Don't Toy With Me, Miss Nagatoro | INSUFFICIENT_EVIDENCE | 0 |
| 30051 | Slam Dunk | INSUFFICIENT_EVIDENCE | 0 |
| 54705 | The Flowers of Evil | INSUFFICIENT_EVIDENCE | 0 |
| 33009 | JoJo's Bizarre Adventure Part 6: Stone Ocean | DRAFT | 26 |
| 30936 | Homunculus | INSUFFICIENT_EVIDENCE | 0 |
| 105469 | Jujutsu Kaisen 0 | DRAFT | 1 |
| 98842 | Toilet-Bound Hanako-kun | DRAFT | 17 |
| 37375 | The Climber | DRAFT | 7 |
| 30564 | Gantz | DRAFT | 3 |
| 100230 | The Quintessential Quintuplets | DRAFT | 2 |
| 169355 | Kagurabachi | INSUFFICIENT_EVIDENCE | 0 |
| 30908 | Soul Eater | INSUFFICIENT_EVIDENCE | 0 |
| 101233 | The Way of the Househusband | NOT_APPLICABLE | 0 |
| 107098 | Record of Ragnarok | DRAFT | 12 |
| 87395 | Grand Blue Dreaming | INSUFFICIENT_EVIDENCE | 0 |
| 140407 | The Greatest Estate Developer | INSUFFICIENT_EVIDENCE | 0 |
| 128067 | SSS-Class Revival Hunter | INSUFFICIENT_EVIDENCE | 0 |
| 144946 | Gachiakuta | DRAFT | 10 |
| 30583 | Claymore | INSUFFICIENT_EVIDENCE | 0 |
| 86310 | Fire Force | DRAFT | 25 |
| 86218 | Bloom Into You | INSUFFICIENT_EVIDENCE | 0 |
| 98397 | Blood on the Tracks | INSUFFICIENT_EVIDENCE | 0 |
| 111233 | Call of the Night | INSUFFICIENT_EVIDENCE | 0 |
| 30149 | BLAME! | INSUFFICIENT_EVIDENCE | 0 |
| 86717 | Wotakoi: Love is Hard for Otaku | INSUFFICIENT_EVIDENCE | 0 |
| 100568 | The Horizon | INSUFFICIENT_EVIDENCE | 0 |
| 136807 | Look Back | NOT_APPLICABLE | 0 |
| 85611 | Tokyo Ghoul:re | DISPUTED | 0 |
| 65243 | Haikyu!! | DRAFT | 6 |
| 85143 | Tower of God | DISPUTED | 0 |
| 30021 | Death Note | INSUFFICIENT_EVIDENCE | 0 |
| 100994 | Hell's Paradise: Jigokuraku | DRAFT | 4 |
| 98416 | Dr. STONE | DRAFT | 14 |
| 125828 | Sakamoto Days | DRAFT | 10 |
| 31133 | Dorohedoro | INSUFFICIENT_EVIDENCE | 0 |
| 118586 | Frieren: Beyond Journey's End | DISPUTED | 0 |
| 74489 | Land of the Lustrous | DRAFT | 11 |
| 98263 | Witch Hat Atelier | DISPUTED | 0 |
| 79865 | Ajin: Demi-Human | INSUFFICIENT_EVIDENCE | 0 |
| 54692 | Noragami: Stray God | DRAFT | 9 |
| 55515 | JoJo's Bizarre Adventure Part 8: JoJolion | DRAFT | 22 |
| 86399 | That Time I Got Reincarnated as a Slime | INSUFFICIENT_EVIDENCE | 0 |
| 114960 | Mashle: Magic and Muscles | DRAFT | 5 |
| 86551 | Made in Abyss | DRAFT | 9 |
| 33031 | Pandora Hearts | DRAFT | 9 |
| 30598 | Fairy Tail | DRAFT | 17 |
| 126297 | Teenage Mercenary | INSUFFICIENT_EVIDENCE | 0 |
| 100954 | Sweet Home | INSUFFICIENT_EVIDENCE | 0 |
| 86082 | Delicious in Dungeon | DRAFT | 14 |
| 74485 | The Seven Deadly Sins | INSUFFICIENT_EVIDENCE | 0 |
| 101583 | My Dress-Up Darling | DRAFT | 12 |
| 85135 | A Silent Voice | INSUFFICIENT_EVIDENCE | 0 |
| 30436 | Uzumaki: Spiral into Horror | INSUFFICIENT_EVIDENCE | 0 |
| 97553 | Three Days of Happiness | INSUFFICIENT_EVIDENCE | 0 |
| 99943 | Rent-A-Girlfriend | INSUFFICIENT_EVIDENCE | 0 |
| 54294 | Ao Haru Ride | INSUFFICIENT_EVIDENCE | 0 |
| 30028 | Nana | INSUFFICIENT_EVIDENCE | 0 |
| 116186 | Boy's Abyss | INSUFFICIENT_EVIDENCE | 0 |
| 61499 | Nisekoi: False Love | DRAFT | 3 |
| 30336 | GTO: Great Teacher Onizuka | INSUFFICIENT_EVIDENCE | 0 |
| 85849 | ReLIFE | INSUFFICIENT_EVIDENCE | 0 |
| 146983 | Goodbye, Eri | NOT_APPLICABLE | 0 |
| 30104 | Yotsuba&! | NOT_APPLICABLE | 0 |

## Observações importantes

- A lista em `reports/batch-0001.md` é histórica e contém a duplicação de One Piece; o addendum contém JoJo e Fire Punch.
- Muitos arquivos pendentes ainda possuem `curation.status: DRAFT` como valor inicial. Uma obra só está de fato processada se `curation.researchedAt` estiver preenchido.
- A documentação de fontes está nos próprios JSONs, não copie sinopses externas para o repositório.
