# Recon: Spotify Web Player (open.spotify.com)

Gerado com `replica-recon` (clean-room). Fonte: navegação pública do
open.spotify.com/intl-pt **sem login**, em 31/10/2026, viewport 1440x900 e
390x844. Nada de código, marca, textos ou conteúdo do Spotify entra no
clone: aqui só se descreve **o que o app faz e como o usuário se move nele**.

## 1. Escopo

| pergunta | resposta |
| --- | --- |
| app / plataforma | Spotify Web Player, desktop web (com observação do layout mobile) |
| fatia | Core loop: **descobrir → abrir álbum/playlist → tocar → controlar a reprodução → salvar na biblioteca** |
| para quem | Spotify-Vinils: um player com estética de toca-discos/vinil sobre o catálogo do próprio usuário |

## 2. Fontes

| fonte | URL | o que deu |
| --- | --- | --- |
| Home (deslogado) | https://open.spotify.com/intl-pt | layout de 3 colunas, carrosséis da home |
| Artista | /intl-pt/artist/{id} | header com imagem, populares, discografia |
| Álbum / single | /intl-pt/album/{id} | header com capa, tracklist, créditos |
| Playlist | /playlist/{id} | tracklist com colunas Álbum / Adicionada em |
| Faixa | /intl-pt/track/{id} | letra (bloqueada deslogado), recomendações |
| Buscar (vazio) | /search | grade de categorias coloridas |
| Buscar (termo) | /search/{q} | filtros em chips, melhor resultado, músicas |
| Seção | /section/{id} | "Mostrar tudo" de um carrossel |
| Podcasts | /intl-pt/genre/podcasts-web | carrosséis de episódios e programas |
| Reels de referência | ver `replica/reels.md` | arquitetura do player, temas, players de CD/vinil |

## 3. Inventário de telas

Estados vistos: **D** = deslogado (visto), **L** = logado (inferido, não visto).

| ID | tela | rota / como chega | propósito | componentes-chave | estados |
| --- | --- | --- | --- | --- | --- |
| S01 | Shell (layout global) | toda rota | moldura do app | TopBar, LibrarySidebar, MainView, RightPanel, NowPlayingBar / SignupBanner | D; L inferido |
| S02 | Home | `/` | descoberta | Shelf (carrossel) com "Mostrar tudo", CardSquare, CardCircle (artista) | loading (skeleton), filled |
| S03 | Seção ("Mostrar tudo") | `/section/{id}` | grade completa de um carrossel | Grid de Cards | filled |
| S04 | Buscar – navegar | `/search` ou ícone ao lado do campo de busca | explorar por categoria | CategoryTile (cor sólida + capa inclinada) em grade de 4 colunas | filled |
| S05 | Buscar – resultados | digitar no campo, `/search/{q}` | achar conteúdo | FilterChips (Tudo, Playlists, Músicas, Álbuns, Artistas, Podcasts, Audiolivros, Perfis, Gêneros), TopResultCard, TrackRow compacto, Shelf por tipo | filled; vazio/sem resultado não visto |
| S06 | Artista | clicar num artista | perfil do artista | HeroImage com nome gigante, ouvintes mensais, PlayBig, Shuffle, Seguir, menu ⋯, Populares (5 + "Ver mais"), Contagem regressiva p/ lançamento, Escolha do artista, Discografia com abas (Lançamentos populares / Álbuns / Singles e EPs), "Com {artista}", Fãs também curtem | filled |
| S07 | Álbum / Single | clicar num card de álbum | ouvir o álbum | HeaderCapa (capa 232px + tipo + título + artista • ano • nº músicas, duração), ActionBar (Play, Shuffle, Salvar +, ⋯, alternância "Lista"), TrackTable (#, Título, ⏱), data de lançamento, ©/℗, "Mais de {artista}" | filled; highlight de faixa via `?highlight=` |
| S08 | Playlist | clicar num card de playlist | ouvir a playlist | Header com imagem de fundo, "Playlist pública", descrição, dono • salvamentos • nº músicas, duração; TrackTable (#, Título+capa, Álbum, Adicionada em, ⏱) | filled |
| S09 | Faixa | clicar no título de uma faixa | detalhe da música | Header igual ao álbum (+ nº de plays), Play, +, ⋯, bloco **Letra** (deslogado: CTA "Entre para ver a letra"), card do artista, Recomendações "Com base nesta música", Faixas populares do artista | D |
| S10 | Podcasts | `/genre/podcasts-web` | descoberta de podcasts | Shelf de episódios (data • duração), Shelf de programas | filled |
| S11 | Painel direito | seta "<" na borda direita | fila / tocando agora | vazio: "Encontrar algo para escutar" + botão Buscar; botão recolher | vazio |
| S12 | Seletor de idioma | botão "Português do Brasil" | trocar idioma | Dialog com lista de idiomas | aberto |
| S13 | Login / cadastro | Entrar / Inscrever-se | auth | (fora do escopo; vai para accounts.spotify.com) | — |
| S14 | Biblioteca (logado) | sidebar | lista do que o usuário salvou | filtros Playlists / Álbuns / Artistas, busca na biblioteca, ordenar "Recentes", modo lista/grade (visto no reel 2) | L inferido |
| S15 | Tela cheia / "Tocando agora" | botão na barra do player | arte grande + letra | (não visto; relevante para a visão de vinil) | L inferido |

**Layout mobile (390px):** a sidebar continua visível ocupando a largura,
o campo de busca vira só um ícone, e o conteúdo principal é empurrado para a
direita (layout pouco adaptado; o app nativo é o caminho no mobile).
Oportunidade clara para o clone.

## 4. Fluxos

```
F01 Descobrir e tocar (deslogado)
    S02 home -> hover no card (aparece botão Play verde no canto) -> S07 álbum -> Play
    resultado deslogado: abre o painel direito / pede cadastro; letra e faixa completa exigem login
    cliques no caminho feliz: 2

F02 Buscar e tocar
    S01 campo "O que você quer ouvir?" -> S05 resultados -> chip de filtro (opcional)
    -> Melhor resultado / linha de música -> Play
    edge: termo sem resultado, digitando rápido (debounce), filtro sem itens
    cliques: 2-3

F03 Navegar por categoria
    S04 grade -> categoria -> página de gênero (shelves) -> S08 playlist -> Play

F04 Explorar artista
    qualquer "Artista" -> S06 -> Populares (Play numa linha) | Discografia -> S07 | Seguir

F05 Salvar na biblioteca (logado, inferido)
    S07/S08/S09 botão "+" -> item aparece em S14 sidebar; criar playlist pelo "+" da sidebar

F06 Controlar reprodução (logado, inferido)
    barra inferior: play/pause, anterior/próxima, shuffle, repetir, barra de progresso (arrastar),
    volume, fila (S11), dispositivos, tela cheia (S15)
    edge: rede ruim (buffer), troca de dispositivo, fim da fila (autoplay de recomendações)
```

## 5. Componentes

| componente | variantes / estados | usado em |
| --- | --- | --- |
| TopBar | logo, botão Home (círculo), SearchInput (pílula com ícone lupa + atalho de "navegar"), links de texto, botão "Entrar" (pílula branca) | S01 |
| LibrarySidebar | header "Sua Biblioteca" + botão "+"; vazio: cards CTA "Crie sua primeira playlist" / "Que tal seguir um podcast novo?"; rodapé com links legais e seletor de idioma; redimensionável | S01 |
| SignupBanner | barra inferior com gradiente rosa→azul, texto + botão pílula branca | S01 deslogado (no lugar do player) |
| NowPlayingBar | (logado) capa + título/artista + curtir, controles centrais, progresso, volume/fila/dispositivos | S01 |
| Shelf | título + "Mostrar tudo" + carrossel horizontal com setas | S02, S06, S09, S10 |
| CardSquare | capa quadrada com raio 6-8px, título 2 linhas, subtítulo cinza, badge "E" (explícito); hover: fundo sobe + botão Play verde circular desliza no canto inferior direito | S02, S03, S05, S06 |
| CardCircle | igual, imagem redonda, subtítulo "Artista" | S02, S05 |
| CategoryTile | retângulo colorido, título bold no topo-esquerdo, capa girada ~25° no canto | S04 |
| PageHeader | gradiente vertical tirado da cor dominante da capa; capa à esquerda ou imagem full-bleed (artista/playlist), título display gigantesco | S06-S09 |
| ActionBar | PlayBig (círculo verde 56px), Shuffle, Add (+ circular), Seguir (pílula outline), ⋯, alternância Lista/Compacto | S06-S09 |
| TrackTable / TrackRow | nº (vira ▶ no hover), capa 40px, título + artistas, badge E, colunas opcionais (Álbum, Adicionada em, plays), duração; hover destaca a linha | S06-S09, S05 |
| FilterChips | pílulas; ativa = branca com texto preto | S05 |
| TopResultCard | card grande com imagem, nome, tipo • dono | S05 |
| LyricsBlock | título "Letra"; deslogado = card azul com CTA | S09 |
| RightPanel | recolhível; vazio com CTA Buscar | S11 |
| Dialog | idioma (lista longa com rolagem) | S12 |
| Skeleton | retângulos cinza arredondados enquanto carrega | S02 loading |

## 6. Design (observado, para o replica-design reconstruir com tokens próprios)

- Tema escuro: fundo da página quase preto, painéis cinza muito escuro com cantos arredondados (~8px) e gutters de 8px entre colunas.
- Acento: um verde saturado só para ações primárias de reprodução. Texto branco + cinza médio para secundários.
- Tipografia: sans geométrica; títulos de página em display enorme (≈72-96px, peso 900); títulos de shelf ≈24px bold.
- Cor dinâmica: o header de álbum/playlist/artista herda a cor dominante da arte e esmaece para o fundo. **Ponto-chave para o Spotify-Vinils** (o reel 4 faz o mesmo com o fundo do toca-discos).
- Microinterações: botão Play aparece no hover do card com leve translateY; a linha da faixa troca o número por ▶.

## 7. Modelo de dados inferido

```
Artist      id, name, image, header_image, monthly_listeners, verified?
            evidência: S06 · confiança: alta
Album       id, title, type (album | single | ep | compilation), cover, release_date,
            artists[], tracks[], total_duration, copyrights (© / ℗), label
            evidência: S07 · confiança: alta
Track       id, title, artists[], album_id, duration_ms, explicit, play_count,
            track_number, has_lyrics
            evidência: S07, S09 · confiança: alta
Playlist    id, name, description, cover, owner (user | editorial), public,
            saves_count, items[]
            evidência: S08 · confiança: alta
PlaylistItem playlist_id, track_id, added_at, added_by
            evidência: coluna "Adicionada em" · confiança: alta
User        id, display_name, plan (free | premium), country, language
            evidência: banner de cadastro, reel 1 ("tem premium?") · confiança: média
LibraryItem user_id, item_type, item_id, saved_at, pinned
            evidência: S14 (reel 2) · confiança: média
Follow      user_id, artist_id | user_id
PlaybackState user_id, device_id, track_id, position_ms, is_playing, shuffle, repeat, queue[]
            evidência: reel 1 ("o celular já sabe onde você parou") · confiança: média
Category    id, name, color, cover · evidência: S04 · confiança: alta
Shelf       id, title, items[] (personalizados por usuário) · evidência: S02 · confiança: alta
```

## 8. O que não dá para clonar

| item | motivo | alternativa no clone |
| --- | --- | --- |
| Catálogo de música, capas, letras | licenciado | **Spotify Web API + Web Playback SDK com a conta do próprio usuário** (Premium exigido para tocar faixa completa), ou arquivos locais do usuário |
| Recomendações / playlists editoriais | dados e ML do Spotify | usar o que a API pública devolve, ou heurística própria |
| Marca, logo, nome, verde e textos | propriedade do Spotify | identidade própria via `/replica-brand` |
| Contas e rede de usuários | dados do Spotify | login OAuth do usuário |
| Endpoints internos do web player | regra do replica: sem API privada | só a Web API pública documentada |

## 9. Tamanho

- 13 telas relevantes (S01-S12 + S14/S15 inferidas), 6 fluxos, 10 entidades.
- Partes difíceis: (1) reprodução real (SDK, auth OAuth, Premium); (2) cor dinâmica a partir da capa + animações do vinil; (3) sincronizar estado de reprodução/fila.
- **Tamanho: M** (algumas semanas) para um player de vinil sobre a Web API; XL se a ideia fosse replicar o Spotify inteiro, por isso o recorte.

## Resumo

- **Core loop:** descobrir → abrir álbum/playlist → tocar → controlar → salvar.
- **13 telas, 6 fluxos, 10 entidades** mapeadas.
- **Mais difícil:** playback via SDK + OAuth; cor dinâmica/animação do vinil; estado sincronizado.
- **Fora do escopo:** catálogo, letras, recomendações e marca do Spotify (vêm da API do usuário ou são próprios).
- **Próximo passo:** `/replica-architect`.
