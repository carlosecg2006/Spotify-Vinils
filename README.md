# Spotify Vinils

Um espaço "físico" digital para a sua conta Spotify: uma sala escura em 3D com
névoa no chão, uma esfera de capas flutuando em volta de você e, no centro, uma
mesa com vitrola, pilhas de discos, caixas de fitas, ingressos e uma estante.

Primeiro o site (este repositório); depois o app.

## Rodar

```bash
npm install
npm run dev
```

Abra **http://127.0.0.1:5173/** (use `127.0.0.1`, não `localhost`: o Spotify só
aceita redirect `http` nesse endereço).

### Conectar o seu Spotify Premium

1. Entre em [developer.spotify.com/dashboard](https://developer.spotify.com/dashboard) com uma conta **Premium**.
2. Crie um app e marque **Web API** e **Web Playback SDK**.
3. Em *Redirect URIs*, cole `http://127.0.0.1:5173/` (o site mostra o endereço certo para copiar).
4. Em *User Management*, adicione o seu e-mail (apps novos aceitam até 5 usuários).
5. Cole o **Client ID** na tela de entrada e clique em *Entrar com Spotify Premium*.

O login é Authorization Code + PKCE, feito só no navegador: nenhuma senha ou
segredo passa pelo site. O Client ID também pode vir de `VITE_SPOTIFY_CLIENT_ID` num `.env`.

Sem conta? Clique em **Explorar a sala em modo demo**: biblioteca fictícia com
capas geradas, tudo funciona menos o áudio.

## O que já tem

| Na sala | O que faz |
| --- | --- |
| Entrada | Formulário + barra com porcentagem; as capas vão surgindo e formando a esfera enquanto carrega |
| Chão | Névoa baixa e aura que muda num degradê das 3 cores centrais do álbum tocando |
| Esfera | Ao tocar, as capas somem e fica a capa do álbum sutil no fundo |
| Pilha de discos | Álbuns tocados recentemente caindo um a um; clique abre em leque, o mouse mostra o nome e as músicas tocadas |
| Vitrola | Disco descendo no prato, braço com geometria real, pontos de cada faixa posicionados pela duração (sulco proporcional ao tempo, lado A/B como num LP), clique na agulha toca do começo e arrastar escolhe o ponto |
| Plaqueta do artista | Na frente da vitrola; abre a Caixa do Artista |
| Caixa do Artista | Nome à caneta, polaroid com fita adesiva, fitas cassete da mais nova (frente) à mais antiga (fundo, na sombra); folheie com a roda do mouse; sempre cheia. No topo: foto, nome e **Seguir** |
| Ingressos | Um para cada artista seguido; clique abre a caixa dele |
| Papel da fila | Pausar, tocar, voltar, avançar, aleatório, repetir música, repetir álbum, tudo a lápis com círculo desenhado quando ativo; arrastar para reordenar; borracha risca e apaga |
| Caixa "busque aqui" | Vista de cima com os 10 últimos álbuns clicados; a busca no topo enche a caixa com 10 álbuns (busca por música também traz o álbum dela) |
| Disco em destaque | Zoom no álbum, gira frente/verso, contracapa **real** quando existe (MusicBrainz + Cover Art Archive pelo código de barras) ou gerada com a cor central da capa e títulos clicáveis; "Abrir" tira o disco, "Só o disco" deixa só ele para girar; faixas flutuando ao lado |
| Player translúcido | Nome, letra ao vivo (LRCLIB), duração e botões clássicos |
| Letras que faltam | "sincronizar letra": cole a letra e toque espaço a cada verso; fica salva e dá para baixar o `.lrc` para enviar ao LRCLIB |
| Estante | Coração talhado: álbuns curtidos + 3 suportes com singles; fitas salvas (músicas curtidas) com desenho talhado; playlists com o troféu **+** que abre o criador de álbum; 3 gavetas: excluídos (restaurar), mais tocados, recentes |
| Criador de álbum | Capa livre estilo Canva (texto, fontes, formas, vinil, imagem, degradê), faixas por busca; vira uma playlist sua com a capa enviada |
| Caixas de som | Nas pontas, cones batendo no BPM; display de volume (arrastar, rolar ou clicar) |
| Engrenagem | Papel com as configurações a lápis: busca sempre visível (5 resultados com rolagem e troca rápida de disco), estilo do vinil, luzes no ritmo, BPM, névoa, qualidade |

Atalhos: `Esc` volta, `Espaço` toca/pausa, `Shift + ←/→` faixa anterior/próxima,
roda do mouse na mesa afasta/aproxima.

## Limites honestos (API do Spotify em 2026)

- **Tocar exige Premium.** Em navegadores de celular o Web Playback SDK não toca;
  o site controla outro aparelho seu pelo Spotify Connect.
- **BPM:** o Spotify removeu "audio features" para apps novos. As luzes usam o BPM
  padrão das configurações ou o que você marcar tocando no ritmo ("marcar BPM" no player).
- **Contracapas:** o Spotify não fornece; vêm do Cover Art Archive quando alguém
  já enviou. Sem ela, a contracapa é gerada.
- **Letras:** o Spotify não tem API pública de letras; usamos o LRCLIB e as que você sincronizar.
- **"Excluídos":** a API não lista playlists apagadas; a gaveta guarda o que você
  excluir por aqui (e permite restaurar).
- App em modo de desenvolvimento aceita até 5 usuários cadastrados.

## Estrutura

```
src/
  main.js            orquestra vistas, eventos e reprodução
  store.js           estado, eventos e configurações
  spotify/           auth (PKCE), api, player (fila própria + SDK)
  data/              library (Spotify ou demo), demo
  services/          letras (LRCLIB), cores da capa, contracapa
  scene/             world (render/interação), room (chão, névoa, esfera),
                     desk, turntable, artistBox, shelf, speakers, inspect, sleeve, textures
  ui/                intro, hud, fila, player, busca, artista, gaveta, configurações, criador
replica/             pesquisa e referências do projeto
```

Conteúdo e capas via Spotify. Letras via LRCLIB.
