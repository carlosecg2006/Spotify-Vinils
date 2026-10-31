# Spotify Web API: o que tem dentro (out/2026)

Fonte: developer.spotify.com/documentation/web-api (referência, changelog
de fev/mar/mai/jul 2026, guia de migração de fev/2026 e página de quota modes).
Base: `https://api.spotify.com/v1` · Auth: OAuth 2.0.

## Regras do jogo para um app novo (Development Mode)
- O **dono do app precisa ter Premium**, senão o app para de funcionar.
- No máximo **5 usuários** por app, cada um adicionado manualmente na
  allowlist. Até 25 Client IDs por desenvolvedor (desde jul/2026), mas a
  **quota é somada por conta de desenvolvedor**; ao estourar, vem `429
  QUOTA_EXCEEDED`.
- **Extended quota** (usuários ilimitados): desde mai/2025 só para
  **empresas**, com 250 mil+ usuários ativos por mês e revisão de até 6 semanas.
- Fluxos de auth: **Authorization Code com PKCE** (front-end/SPA),
  Authorization Code (com backend) e Client Credentials (só catálogo, sem
  usuário). Implicit grant e redirect `http` (exceto `127.0.0.1`) foram
  descontinuados.
- Política: proibido baixar o conteúdo; capas devem ficar na forma
  original, com atribuição ao Spotify.

## Endpoints disponíveis (app novo, em Development Mode)

### Catálogo
| endpoint | o que traz |
| --- | --- |
| `GET /albums/{id}` · `GET /albums/{id}/tracks` | álbum: nome, tipo, capas (640/300/64px), data, artistas, faixas, copyrights |
| `GET /artists/{id}` · `GET /artists/{id}/albums` | artista: nome, imagens, gêneros; discografia |
| `GET /tracks/{id}` | faixa: nome, duração, explícito, nº, álbum, artistas, `preview_url` (muitas vezes null) |
| `GET /search?q=&type=` | busca em album, artist, playlist, track, show, episode, audiobook; **máx. 10 por página** (padrão 5); paginar com `offset` |
| `GET /shows/{id}` (+ episodes) · `GET /episodes/{id}` | podcasts |
| `GET /audiobooks/{id}` (+ chapters) · `GET /chapters/{id}` | audiolivros (alguns mercados) |
| `GET /playlists/{id}` | metadados de qualquer playlist; **o conteúdo (`items`) só vem se a playlist for sua ou colaborativa** |
| `GET /playlists/{id}/images` | capa da playlist |

### Usuário e biblioteca
| endpoint | o que traz / faz |
| --- | --- |
| `GET /me` | perfil: nome, imagem, `id` e `account_id` (o id estável, desde mai/2026). Não traz mais e-mail, país, plano nem seguidores |
| `GET /me/top/{artists|tracks}` | mais ouvidos (4 semanas, 6 meses, ~1 ano) |
| `GET /me/player/recently-played` | últimas 50 reproduções |
| `GET /me/tracks`, `/me/albums`, `/me/shows`, `/me/episodes`, `/me/audiobooks` | listar o que está salvo |
| `GET /me/following?type=artist` | artistas seguidos |
| `PUT` / `DELETE /me/library` · `GET /me/library/contains` | **novo:** salvar, remover ou checar qualquer coisa (faixa, álbum, artista, playlist…) por URI |
| `GET /me/playlists` · `POST /me/playlists` | suas playlists; criar uma |
| `PUT /playlists/{id}` · `PUT /playlists/{id}/images` | renomear, descrição, pública/privada; subir capa (JPEG base64) |
| `GET/POST/PUT/DELETE /playlists/{id}/items` | ler, adicionar, reordenar/substituir e remover faixas (antes `/tracks`) |

### Player (Spotify Connect, exige Premium)
`GET /me/player` (estado) · `GET /me/player/devices` · `PUT /me/player`
(transferir) · `GET /me/player/currently-playing` · `PUT .../play` ·
`PUT .../pause` · `POST .../next` · `POST .../previous` · `PUT .../seek` ·
`PUT .../repeat` · `PUT .../volume` · `PUT .../shuffle` ·
`GET /me/player/queue` · `POST /me/player/queue`.
Para o **navegador virar um aparelho que toca**, usa-se o **Web Playback
SDK** (JS), que cria um device Connect na própria página.

## O que NÃO dá mais (removido ou bloqueado para apps novos)
| removido | desde |
| --- | --- |
| Recommendations, Audio Features, Audio Analysis, Related Artists, Featured Playlists, Category's Playlists, Genre seeds, playlists editoriais/algorítmicas do Spotify | nov/2024 (apps novos) |
| Busca em lote (`GET /tracks?ids=`, `/albums`, `/artists`, `/shows`, `/episodes`, `/audiobooks`, `/chapters`): agora é um por um | fev/2026 |
| Artist Top Tracks, New Releases, Browse Categories, Markets | fev/2026 |
| Perfil e playlists de **outros** usuários (`/users/{id}`, `/users/{id}/playlists`) | fev/2026 |
| Endpoints de salvar/seguir por tipo (`/me/tracks` PUT/DELETE, `/me/following` etc.), trocados por `/me/library` | fev/2026 |
| Campos: `popularity` (faixa, álbum, artista), `followers` e `genres`* do artista, `label`, `available_markets`, `album_group`, `linked_from`; do `/me`: e-mail, país, plano, filtro de explícito, seguidores | fev/2026 (`external_ids` voltou em mar/2026) |

\* conforme a lista de campos removidos para Artist; trate qualquer campo como opcional.

## Impacto para o Spotify-Vinils
- **Funciona bem:** login do usuário, a biblioteca dele (álbuns e playlists
  salvos, curtidas), busca, capas em alta resolução (o coração do visual de
  vinil), páginas de álbum e artista, controle do player e o Web Playback SDK
  tocando no navegador (o vinil gira com o estado do SDK).
- **Não dá:** home cheia de recomendações, playlists editoriais, nº de
  plays/popularidade, conteúdo de playlists de terceiros.
- **Limites práticos:** 5 usuários (fora isso, cada usuário cria o próprio
  Client ID, como o Spotifast faz) e Premium obrigatório para tocar.
- A cor dinâmica do fundo tem que ser extraída da própria capa (a API não
  fornece a cor).
