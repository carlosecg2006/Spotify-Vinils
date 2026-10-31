# Reels de referência

Assistidos com a skill watch-video (quadros + transcrição faster-whisper).
São referência de ideia/UX; nenhum asset deles entra no projeto.

## 1. @rick.theengineer — "Let's design Spotify" (2min53s, EN)
https://www.instagram.com/reel/DcBhby3sl7_/

Animação de system design (fundo preto, verde neon, personagem narrador,
legenda palavra a palavra, barra de etapas Storage → CDN → Search → Recs →
Pipeline → DB). Pontos:
- Upload vira várias versões codificadas (bitrates/codecs diferentes) em storage distribuído.
- Ao dar play, o backend checa: quem é você, tem Premium, que música, pode tocar no seu país, onde parou.
- Plano de controle separado da entrega de mídia: o backend decide, a CDN entrega o áudio.
- O cliente faz buffer à frente (no segundo 10 já baixou até o 20/30) e cai de bitrate se a rede piora.
- Busca usa índice dedicado; recomendações são pré-computadas em lote.
- Lançamento à meia-noite = caso clássico de cache/CDN.
- Estado de reprodução sincronizado entre dispositivos.
- "A parte difícil não é tocar um MP3, é fazer milhões sentirem que toda música está ali, pronta."

**Para o Spotify-Vinils:** não precisamos de nada disso no servidor — o
Web Playback SDK já faz buffer/CDN. Vale a lição de UX: play instantâneo e
estado lembrado (retomar onde parou).

## 2. @adrian.wmv — "Isso vai mudar completamente seu Spotify" (42s, PT-BR)
https://www.instagram.com/reel/Deuivi5x7yc/

Tutorial de Spicetify no Spotify Desktop (Windows): pesquisar o site, copiar
o comando de instalação, rodar no PowerShell, aceitar o Marketplace (Y). O
Spotify abre com um ícone de carrinho → Marketplace de extensões (letras em
tela cheia, wiki do artista, bloqueio de anúncios) e temas aplicados com um
clique. Mostra vários temas (azul, roxo com ilustração, preto/vermelho).

**Para o Spotify-Vinils:** prova de demanda por personalização visual e
temas. Observação: a extensão de bloquear anúncios viola os termos do
Spotify — não é algo para o projeto copiar.

## 3. @synsation_ — CD player feito no Replit (24s, EN, sem fala)
https://www.instagram.com/reel/DcB2EJRPAuk/

App web "CD Cover Studio": um estojo de CD com arte colorida; "OPEN CASE"
tira o disco e o coloca num boombox prateado com adesivos, "conectado à minha
playlist do Spotify", para compartilhar com um amigo. Vários modelos de
player (boombox, discman com adesivos), editor de capa (camadas, cores,
elementos) e "WRITE TO DISC" com compartilhar por URL. Fecha com "Replit.com
— dá pra construir qualquer coisa que você desenhar sem saber programar".

**Para o Spotify-Vinils:** ideia de "presente" — montar um disco com capa
personalizada a partir de uma playlist e compartilhar por link.

## 4. @aelisstudio — app "MD Vinyl" (33s)
https://www.instagram.com/reel/DbKosHuxAN7/

iPad virando toca-discos: biblioteca em coverflow 3D (capas em pé,
inclinadas, abas Álbuns/Playlists); player visto de cima com a capa atrás,
vinil girando com rótulo (título/artista) e braço da agulha; fundo muda com
a cor da capa; seletor de estilo do vinil (marmorizado, transparente,
respingado, preto, colorido); contador de músicas tocadas e playlist curada.

**Para o Spotify-Vinils:** a referência visual principal (ver linhas
"vinil" em `features.csv`).

## 5. @oreidosites (Herbert Souza): "Criaram o SPOTIFY de graça!" (1min01s, PT-BR)
https://www.instagram.com/reel/DecCjQyufza/

Vídeo de reação (selfie) com um print de um post no X de Carmine Paolino
(@paolino) no topo: *"Spotifast 0.12 is out! Spotify, fast, in 200MB of RAM,
for all OSs. It now consumes 0% CPU when idle. spotifast.rocks"*, com um
card de download "spotifast 18 MB". A fala: "recriaram o Spotify 100% de
graça, mais otimizado, mais rápido… depois criaram todos os apps da Adobe…
um repositório no GitHub que você coloca no seu Claude/Codex cria
habilidades para clonar qualquer aplicação… qualquer leigo vai conseguir
criar um software nível Spotify… isso é legal".

**Checagem dos fatos:** detalhes em `replica/spotifast.md`. Resumo: o
Spotifast existe, mas **não é** um Spotify grátis nem foi feito por uma skill
de clonagem. É um *cliente* open source em Rust que usa a sua conta e
**exige Premium** para tocar música.

## 6. @_asheerwad_: "Feelora" (post em carrossel, 7 imagens, 14/06/2026)
https://www.instagram.com/p/DZkZu1CmgPY/

Conceito de app web que mostra a biblioteca do Spotify como um universo 3D.
Legenda: "E se você pudesse entrar na sua música em vez de só ouvir?…
visuais 3D imersivos, letras sincronizadas e atmosferas guiadas pela emoção.
Sem rolagem infinita, sem playlists estáticas." Hashtags #ui #spotify
#uidesign #webdesigner #vibecoding.

| slide | o que mostra |
| --- | --- |
| 1 | tela inicial preta: esfera de pontos em degradê rosa→azul com uma estrela no centro, "SPATIAL MUSIC UNIVERSE", **Feelora**, "Every song becomes a star in your personal galaxy", botão verde **Connect Spotify** e link "Explore demo universe →" |
| 2 | carregando: esfera de pontos brancos, "Building your universe · Loading Spotify library…" com bolinhas coloridas e barra de progresso |
| 3 | **"Universe"**: a câmera está *dentro* de uma esfera forrada de capas de álbum (centenas), que curva nas bordas; topo com logo FEELORA, abas **Universe / Discover / Library**, filtro "Sphere: All", busca "Search Universe" e "Disconnect"; mini player embaixo |
| 4 | o mesmo, com um painel de vidro fosco **"Synced lyrics"**: verso atual em branco e os próximos esmaecidos |
| 5 | **modo foco**: capa grande à esquerda com brilho dourado, título e artista, letra em destaque, barra de progresso com tempo e controles (anterior / pause / próxima) |
| 6 | **"Discover · Space"** ("algorithmic curation"): lista lateral de músicas sobre a esfera, com as letras ao lado (inclusive marcação de instrumental `[01:17.50] ♫♫♫`) |
| 7 | **"Library · Music Universe"**: abas All tracks / Liked songs / Spotify e lista das músicas do usuário |

**Como parece ter sido feito (inferido, sem código público encontrado):**
login OAuth do Spotify + Web API (biblioteca e curtidas), capas mapeadas
numa esfera 3D em WebGL (provavelmente Three.js), letras no formato LRC com
tempo (o padrão do LRCLIB; o Spotify não tem API pública de letras),
"Discover" com lógica própria (recomendações não estão disponíveis para apps
novos) e a hashtag #vibecoding sugere que foi feito com ajuda de IA.

**Para o Spotify-Vinils:** referências diretas para tela de conexão,
carregamento animado, letras sincronizadas via LRCLIB e "modo foco" com a
capa grande e brilho na cor da capa (combina com o vinil girando).

## 7. @asimov.academy: "Spotify 3D" com fitas cassete e iPod (2min05s, PT-BR)
https://www.instagram.com/reel/DerUf07GArm/

Rapaz em frente à câmera (fundo roxo) explicando, com telas inseridas no topo,
como montou um "Spotify 3D" **sem escrever código**, só guiando a IA.

**Resultado:** site "SPOTIFY 3D · Arquivo de fitas"; cada **playlist/álbum
vira uma fita cassete 3D** (ex.: "Greatest Hits II · Queen", "Appetite for
Destruction", "Back in Black", "reputation"), empilhadas como livros numa
estante. Ao clicar, a fita se liga por um **fio 3D com física** a um **iPod
clássico 3D** (click wheel, tela com capa e "Bohemian Rhapsody") que toca a
música; o **fundo (persiana canelada animada) muda de cor conforme a capa** e
alguns elementos reagem à batida.

**Passo a passo que ele mostra:**
1. Baixou os MP3 do YouTube no **Y2meta** e as capas no Google Imagens.
2. Criou um projeto em branco no **Astro** (`npm create astro@latest`, pasta `spotify3d`).
3. Abriu no **Google Antigravity IDE** (editor com agente de IA; o painel mostra um modelo Gemini Flash).
4. Buscou referência no **Awwwards** (seção 3D) e escolheu um site de livros empilhados, trocando livros por fitas.
5. Pediu à IA para usar **Three.js** e passou um documento de contexto ("Contrato Canônico": arquivos e o prompt de cada um, estado global em `index.astro`, IDs e z-index, fontes **Fraunces** + **JetBrains Mono**, Font Awesome, interface 100% pt-BR, `extractCoverPalette` devolvendo `{top, bottom, accent}`) "para ela não alucinar".
6. Prompts numerados por arquivo, ex.: "Prompt 2: Modelo 3D da fita cassete → `src/scripts/tape-shelf.js`". Outros arquivos vistos: `tape-cable.js`, `color-palette.js`, `fluted-background.js`, `generate-covers.mjs`.
7. Pediu o iPod 3D e o fio com física.
8. Fundo e efeitos de batida: copiou prompts prontos de sites de componentes (cita "React Bits"; na tela aparece o fundo "Green Vertical Blinds" de uma biblioteca de backgrounds).
9. "Comenta SPOTIFY que eu te mando o link."

**Observações:** é um player de **arquivos locais**, sem Spotify de verdade.
Baixar MP3 do YouTube viola os termos do YouTube e direitos autorais; serve
só como protótipo pessoal, não para publicar.

**Para o Spotify-Vinils:** é o mesmo conceito com outra mídia (fita no lugar
do vinil). Vale copiar o **método**: referência no Awwwards, documento de
contexto fixo para a IA, um prompt por arquivo, Three.js, paleta extraída da
capa (`top/bottom/accent`) para o fundo, e elementos que reagem ao áudio.
