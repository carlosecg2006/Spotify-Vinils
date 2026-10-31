# Spotify-Vinils: relatório completo da pesquisa

Data: 31/10/2026 · Tudo o que foi levantado até agora, num lugar só.
Os arquivos detalhados continuam ao lado: `recon.md`, `features.csv`,
`reels.md`, `spotifast.md` e `spotify-api.md`.

**Índice**
1. Como a pesquisa foi feita
2. Os 7 posts (6 reels e 1 carrossel), um por um
3. Spotify Web por dentro (recon)
4. Spotifast: o "Spotify grátis"
5. Spotify Web API: o que tem dentro
6. O que tudo isso significa para o Spotify-Vinils
7. Próximos passos
8. Fontes

---

## 1. Como a pesquisa foi feita

| etapa | ferramenta | observação |
| --- | --- | --- |
| Assistir aos reels | skill **watch-video** (já instalada no ambiente) + `yt-dlp` + `ffmpeg` | 20 quadros por vídeo, montados em pranchas para leitura |
| Ver o carrossel (post 6) | Playwright no *embed* público do post | o `yt-dlp` não extrai imagens de carrossel; capturei os 7 slides um a um |
| Ouvir os reels | **faster-whisper** (modelo `small`, multilíngue) | o pipeline da skill quebrou por incompatibilidade com o PyAV; contornei passando o áudio direto como array |
| Mapear o Spotify Web | skill **replica-recon** (repo `Jakeschincariol/replica-skill`) + Playwright | navegação **sem login**, em ritmo humano, só páginas públicas; sem ler o código nem copiar APIs internas |
| Investigar o Spotifast | clone de leitura do repo `crmne/fastpotify` + busca na web | `spotifast.rocks` e `techradar.com` continuam bloqueados no ambiente |
| API do Spotify | documentação oficial (referência, changelog de 2026, guias) | **nenhuma chamada real**: sem Client ID/Secret a API responde 401 |

Domínios que foram liberados no ambiente durante o processo:
`instagram.com`, `*.cdninstagram.com`, `*.fbcdn.net`, `open.spotify.com`,
`*.spotify.com`, `*.spotifycdn.com`, `*.scdn.co`, `huggingface.co`, `*.hf.co`.

---

## 2. Os 7 posts, um por um

| # | perfil | o que é | relevância para o projeto |
| --- | --- | --- | --- |
| 1 | @rick.theengineer | como o Spotify funciona por dentro (system design) | entender playback, CDN, buffer e estado |
| 2 | @adrian.wmv | tutorial do Spicetify (temas e extensões no Spotify Desktop) | demanda por personalização |
| 3 | @synsation_ | CD player web feito no Replit | estojo que abre, capa personalizada, "presente" |
| 4 | @aelisstudio | app MD Vinyl (iPad como toca-discos) | **referência visual principal** |
| 5 | @oreidosites | "criaram o Spotify de graça" (Spotifast) | checagem de fatos; modelo de auth |
| 6 | @_asheerwad_ | Feelora: biblioteca do Spotify como universo 3D | letras sincronizadas, modo foco, tela de conexão |
| 7 | @asimov.academy | "Spotify 3D" com fitas cassete e iPod feito com IA | **o método de construção** com IA + Three.js |

### Reel 1: @rick.theengineer, "Let's design Spotify"
- **Link:** instagram.com/reel/DcBhby3sl7_ · **Duração:** 2min53s · **Idioma:** inglês · ~60 mil curtidas
- **Formato:** animação de *system design*. Fundo preto com pontilhado, detalhes em verde neon e tipografia de terminal. Um personagem no estilo Rick (Rick and Morty), segurando um notebook com adesivos, narra. A legenda aparece palavra a palavra numa caixa embaixo. No topo há uma barra com 6 etapas: **Storage → CDN → Search → Recs → Pipeline → DB**, e um contador de cenas ("04 / 74").

**Linha do tempo (fala + o que aparece):**
| tempo | fala (resumo) | na tela |
| --- | --- | --- |
| 0:00 | "Vamos desenhar o Spotify. Parece simples: abrir, buscar, dar play" | caixa de busca "rumours" e grade de capas |
| 0:11 | "Primeiro, guardar a música. Milhões de faixas, várias qualidades" | capas enfileiradas |
| 0:17 | "No upload, a faixa vira várias versões codificadas: bitrate baixo para celular, alto para Premium, codecs diferentes por aparelho" | gráfico de barras com 320, 160, 96 e 24 kbps |
| 0:29 | "Tudo fica num storage distribuído" | 3 cilindros, "OBJECT STORAGE", "DISTRIBUTED STORAGE" |
| 0:33 | "No play, o backend checa: quem é você? tem Premium? que música? pode tocar no seu país? onde parou?" | painel "BACK END" com as perguntas, depois "ALLOWED" e "THE BACK END SAYS YES" |
| 0:42 | "Mas o backend não manda os bytes do áudio, seria um gargalo. Quem entrega é uma CDN perto de você" | diagrama "CONTROL PLANE" (decisões) separado de "MEDIA DELIVERY" |
| 1:00 | "A música tem que começar na hora; ninguém espera 5 segundos" | spinner com "4.3 seconds of waiting" |
| 1:06 | "O cliente faz buffer: no segundo 10 já baixou o 20 ou o 30. Se a rede piora, troca para um bitrate menor e não para" | barra "SECOND 10 · ALREADY FETCHED: 30", depois "IT KEEPS PLAYING" |
| 1:23 | "Busca: não dá para varrer milhões de músicas num banco comum; usa-se um índice dedicado" | caixa do índice |
| 1:36 | "Recomendações: o que tocar depois? o que entra no Discover Weekly?" | capa "NOW PLAYING" → "?" e "WHAT SHOULD PLAY NEXT?" |
| 1:47 | "Usa histórico, pulos, curtidas e similaridade; é pré-computado em lote porque fazer ao vivo é caro" | "SIGNALS: HISTORY", "ON EVERY OPEN" vs. "ONCE, IN BATCH" |
| 1:59 | "Álbum novo à meia-noite: milhões pedem a mesma música. Caso perfeito para cache e CDN" | "CACHING AND CDNs" |
| 2:13 | "Estado sincronizado: pausa no notebook e o celular já sabe onde você parou" | notebook ↔ celular, "1:42", "IT ALREADY KNOWS" |
| 2:29 | "No fim, são vários sistemas juntos: storage, CDN, índice de busca, recomendador, bancos e pipelines" | blocos "SEVERAL SYSTEMS WORKING TOGETHER" |
| 2:45 | "O difícil não é tocar um MP3, é fazer milhões sentirem que toda música está ali, pronta" | grade de pessoas, "MILLIONS OF PEOPLE" |

**Lição para o projeto:** o Web Playback SDK já cuida de buffer e CDN. O que
fica para nós é a experiência: play instantâneo e retomar de onde parou.

---

### Reel 2: @adrian.wmv, "Isso vai mudar completamente seu Spotify"
- **Link:** instagram.com/reel/Deuivi5x7yc · **Duração:** 42s · **Idioma:** português · ~22 mil curtidas
- **Cenário:** setup gamer branco/laranja, monitor ultrawide curvo, Stream Deck, teclado mecânico branco, plantas e fita de LED (azul/roxo/rosa).

**Passo a passo (fala + tela):**
1. "Como ter Spotify sem anúncios e com temas, de graça" (mostra o Spotify Desktop com tema roxo e um gato).
2. "No navegador, pesquise spicetify e entre no primeiro link" (busca no navegador → site spicetify.app, "truly yours").
3. "Role até o final da página e copie o comando."
4. "Procure o Windows PowerShell, cole o comando e dê Enter" (`iwr -useb https://raw.githubusercontent.com/spicetify/cli/...`).
5. "Aguarde" (o terminal baixa o Spicetify v2.4x e mostra "successfully installed!").
6. "Quando perguntar se deseja instalar o Marketplace, digite **Y** e Enter."
7. "Quando terminar, o Spotify abre sozinho com um novo ícone de **Marketplace**" (um carrinho no topo da biblioteca).
8. "Aqui você encontra extensões e temas" (aparecem *Spicy Lyrics* com letras sincronizadas e em tela cheia, *WikiFy*, *adblockify*, *Format colors* e *Phrase to Playlist*).
9. "Instale essa extensão e seu Spotify não terá mais anúncios."
10. "Para os temas, é só escolher e instalar que ele aplica" (temas azul/ciano, roxo com ilustração, preto/vermelho com *Interstellar*).
11. "Curte e me segue para mais."

**Atenção:** a extensão que bloqueia anúncios viola os termos do Spotify. O
que vale para o projeto é a **demanda por personalização visual e temas**.

---

### Reel 3: @synsation_ (Katerina Smith), CD Player feito no Replit
- **Link:** instagram.com/reel/DcB2EJRPAuk · **Duração:** 24s · **Idioma:** inglês, só legenda (sem fala, só música) · ~630 curtidas
- **Legenda do post:** "Comente REPLIT para tentar construir algo legal… há poucos anos isso exigiria anos de experiência; o limite do CSS e do front-end é a sua imaginação."

**Cena a cena:**
| tempo | o que aparece | texto na tela |
| --- | --- | --- |
| 0:00 | app web de fundo claro com um **estojo de CD** (arte de flores, corações e arco-íris) e o botão "OPEN CASE" | "Let's share a playlist with my friend" |
| 0:01 | o estojo abre e o CD sai | idem |
| 0:02 | o CD vai para um **boombox prateado** com adesivos (borboletas, guitarra rosa, corações, fita cassete) | idem |
| 0:04 | boombox com o CD girando e display azul; URL `…worf.replit.dev/gift/…` | "It's connected to my Spotify playlist" |
| 0:07 | título "MY LOVE <3" | — |
| 0:08 | painel com "WRITE TO DISC" e opções de compartilhar (URL / VIEW) | "I added more than one CD player option" |
| 0:09 | ela no notebook, de chapéu de pelúcia zebrado | "Waiting for changes…" |
| 0:12 | **discman** lilás ("CD Walkman") com adesivos de golfinho, gato, panda, água-viva e estrelas | — |
| 0:14 | **"CD Cover Studio"**: editor de capa com camadas, elementos (flores, corações, arco-íris) e paleta | "And I can create any custom CD cover" |
| 0:18 | ela | "How did I do it?!" |
| 0:19 | tela do Replit: "Hi Katia, what do you want to make?" | "Replit.com" |
| 0:21 | ela | "And you can build anything you can design without knowing programming" |
| 0:22 | ela fazendo coração com as mãos | "Comment REPLIT for the link" |

**Ideia para o projeto:** o "presente". Montar um disco com capa personalizada
a partir de uma playlist e compartilhar por link.

---

### Reel 4: @aelisstudio (DIGITAL HUB), app "MD Vinyl"
- **Link:** instagram.com/reel/DbKosHuxAN7 · **Duração:** 33s · sem fala (só música) · ~120 curtidas
- **Legenda:** "Tudo fica melhor quando seu player de música é fofo assim 🎧💿 · App: MD Vinyl"
- **Texto fixo na tela:** "Turn my iPad into a vinyl player ✨"

**Cena a cena:**
| tempo | o que aparece |
| --- | --- |
| 0:00-0:05 | biblioteca em **coverflow 3D**: capas em pé, inclinadas, como discos numa prateleira; abas **Albums / Playlists**; o dedo arrasta e as capas passam |
| 0:06-0:08 | **toca-discos visto de cima**: capa amarela atrás, vinil **respingado** (branco com manchas pretas) girando, rótulo "Talking to the Moon · Bruno Mars", **braço da agulha** à direita |
| 0:09-0:13 | transições: o fundo vira um **degradê da cor da capa** (verde/rosa, roxo); uma capa em aquarela desliza para fora e o disco aparece |
| 0:14-0:16 | capa "Chill Select" em tela cheia; menu "For How About This" com **seletor de estilo do vinil** (ícones de disco) e **cores** (branco, cinza, preto, rosa…) |
| 0:17-0:22 | o mesmo disco ("How About This · JazzyHan") troca de estilo: **marmorizado azul → azul translúcido → transparente → preto clássico** |
| 0:24 | tela "Wondering / Chill Select", card "Curated Playlist for You" e contador **"Songs played since 2026.7.24"** |
| 0:26-0:31 | vinil **rosa marmorizado** ("Canela · Guidolain, beats, malbmax") com a capa de ondas laranja/rosa ao fundo; a agulha é tocada com o dedo; zoom out mostrando o iPad inteiro |

**Este é a referência visual principal do Spotify-Vinils.**

---

### Reel 5: @oreidosites (Herbert Souza), "Criaram o SPOTIFY de graça!"
- **Link:** instagram.com/reel/DecCjQyufza · **Duração:** 1min01s · **Idioma:** português · ~41 mil curtidas
- **Formato:** selfie de reação (camisa salmão, quadro pop-art ao fundo) com um print fixo no topo: um post no X de **Carmine Paolino (@paolino)**: *"Spotifast 0.12 is out! Spotify, fast, in 200MB of RAM, for all OSs. It now consumes 0% CPU when idle. spotifast.rocks"*, e embaixo um card verde "spotifast · 18 MB".

**O que ele fala (transcrição):**
| tempo | fala |
| --- | --- |
| 0:00 | "Pessoal, que absurdo o que está acontecendo com o mercado." |
| 0:04 | "Recriaram o Spotify 100% de graça, mais otimizado, mais rápido, e não pararam por aí." |
| 0:11 | "Depois do Spotify, criaram todos os aplicativos da Adobe, Photoshop, Premiere. Tudo 100% de graça." |
| 0:19 | "A engenharia reversa chegou num nível fora do normal." |
| 0:24 | "Um repositório no GitHub que você coloca dentro do seu Claude, do seu Codex, cria habilidades para clonar qualquer aplicação, para fazer engenharia reversa." |
| 0:35 | "Qualquer leigo, com isso instalado, vai conseguir criar um software nível Spotify." |
| 0:43 | "O que vai acontecer com o mercado? Isso deveria ser proibido… mas não é. Isso é legal." |
| 0:49 | "Deixem a opinião de vocês nos comentários… segue o meu perfil." |

**Checagem:** veja a seção 4. O Spotifast é real, mas **não é um Spotify
grátis** e **não foi feito por uma skill de clonagem**.

---

### Post 6: @_asheerwad_, "Feelora" (carrossel de 7 imagens)
- **Link:** instagram.com/p/DZkZu1CmgPY · **Publicado:** 14/06/2026 · 73 curtidas, 13 comentários
- **Legenda:** "E se você pudesse *entrar* na sua música em vez de só ouvir? Apresentando Feelora: um novo jeito de viver sua biblioteca do Spotify com visuais 3D imersivos, letras sincronizadas e atmosferas guiadas pela emoção. Sem rolagem infinita. Sem playlists estáticas. Só você, sua música e um universo construído em volta de cada canção. ✨ Explore suas faixas numa esfera viva · 🎤 Siga as letras em tempo real · 🌌 Viva a música de forma visual, emocional e espacial. Não escute música. Entre nela."
- **Hashtags:** #ui #spotify #uidesign #webdesigner #vibecoding

**Imagem por imagem:**
| slide | o que mostra |
| --- | --- |
| 1 | **Tela inicial**: fundo preto, esfera de pontos em degradê rosa → roxo → azul com uma estrela branca no centro; "SPATIAL MUSIC UNIVERSE", **Feelora**, "Step inside your 3D music universe. Every song becomes a star in your personal galaxy, ready to be explored from the center."; botão verde **Connect Spotify**; link "Explore demo universe →" |
| 2 | **Carregando**: a esfera em pontos brancos, "Building your universe · Loading Spotify library…", quatro bolinhas coloridas e uma barra de progresso |
| 3 | **Universe**: a câmera fica *dentro* de uma esfera forrada de centenas de capas de álbum, que curvam nas bordas. No topo: logo FEELORA, abas **Universe / Discover / Library**, filtro "Sphere: All", busca "Search Universe" e "Disconnect". Embaixo: mini player tocando "blue" |
| 4 | **Letras sincronizadas**: painel de vidro fosco "Synced lyrics · blue" sobre as capas; o verso atual em branco, os seguintes esmaecidos |
| 5 | **Modo foco**: capa grande (aquarela de praia) com brilho dourado em volta; "blue · yung kai"; a letra em destaque; barra de tempo (0:46 / 3:34) e botões anterior / pause / próxima; um X para fechar |
| 6 | **Discover · Space** ("algorithmic curation"): lista lateral de músicas (my light, Drawer, I Think They Call This Love, Beautiful Things, Azizam…) sobre a esfera, com o painel de letras ao lado; nos trechos instrumentais, `[01:17.50] ♫♫♫` |
| 7 | **Library · Music Universe** ("Your library"): abas All tracks / Liked songs / Spotify e a lista das músicas do usuário (Hey There Delilah, MONEY, Sunflower, Until I Die, Starboy…) |

**Como parece ter sido feito** (dedução: não há código, site ou demo
públicos, nem no GitHub nem na busca web):
- login OAuth do Spotify e a Web API para a biblioteca e as curtidas;
- a esfera de capas em WebGL, provavelmente **Three.js**;
- letras com tempo no formato LRC (`[01:17.50]`), o padrão do **LRCLIB**, uma base aberta de letras (o Spotify não tem API pública de letras);
- o "Discover" com lógica própria, já que as recomendações não estão mais disponíveis para apps novos;
- a hashtag #vibecoding indica que foi feito com ajuda de IA.

**O que aproveitar:** tela de conexão, carregamento animado, **letras
sincronizadas via LRCLIB** e o **modo foco** com a capa grande e um brilho na
cor dela.

---

### Reel 7: @asimov.academy, "Spotify 3D" com fitas cassete e iPod
- **Link:** instagram.com/reel/DerUf07GArm · **Duração:** 2min05s · **Idioma:** português · **Publicado:** 19/10/2026
- **Legenda:** "É assim que você transforma músicas do YouTube no seu próprio Spotify em formato 3D. Cada playlist virou uma fita cassete. Ao clicar em uma delas, as músicas tocam num iPod, com o fundo mudando de cor conforme a capa do álbum. E você não precisa escrever uma linha de código… Comenta SPOTIFY pra receber o link no direct."
- **Formato:** um rapaz de óculos em frente à câmera (fundo roxo), com gravações de tela inseridas no topo.

**O resultado:**
- O site se chama "SPOTIFY 3D · Arquivo de fitas". Cada **álbum ou playlist é uma fita cassete 3D**, com a capa no rótulo ("Greatest Hits II · Queen", "Appetite for Destruction", "Back in Black", "reputation"), empilhadas como livros numa estante.
- Ao clicar numa fita, um **fio 3D com física** a liga a um **iPod clássico 3D**, com roda de controle e tela mostrando a capa e "Bohemian Rhapsody". O iPod toca a música.
- O **fundo é uma persiana ondulada animada que muda de cor conforme a capa**, e alguns elementos reagem à batida.

**Linha do tempo:**
| tempo | fala (resumo) | na tela |
| --- | --- | --- |
| 0:00 | "Transformei as músicas que baixei no YouTube no meu próprio Spotify 3D, sem escrever uma linha de código" | o site pronto: fita + iPod + fio |
| 0:08 | "Só baixei músicas, as capas e mandei referências visuais para a IA" | — |
| 0:14 | "Ela criou a fita cassete em 3D, recriou o iPod e troca o fundo conforme a capa" | a pilha de fitas |
| 0:28 | "Baixei as músicas no **Y2meta** e extraí o MP3" | site do Y2meta com as opções 320 kbps / 256 kbps |
| 0:34 | "Busquei as capas no Google" | Google Imagens: "guns n roses album" |
| 0:37 | "Criei um projeto em branco no **Astro**, um framework para sites leves" | terminal: `npm create astro@latest`, pasta `spotify3d` |
| 0:44 | "Abri no editor de código com IA integrada" | **Antigravity IDE** (Google), com chat de agente e modelo Gemini Flash |
| 0:49 | "Busquei referências no **Awwwards**, um acervo de sites premiados" | awwwards.com/websites/3d |
| 0:58 | "Achei esse site de livros; em vez de livros, imaginei fitas" | site com livros empilhados |
| 1:05 | "Pedi para a IA configurar o projeto com **Three.js**, que roda 3D no navegador" | código no editor |
| 1:14 | "Passei todo o contexto para ela não alucinar" | documento "**Contrato Canônico**" (ver abaixo) |
| 1:21 | "Criei um prompt para gerar o modelo 3D da fita; ela empilhou as fitas como na referência" | "# Prompt 2: Modelo 3D da fita cassete · Você vai criar o arquivo `src/scripts/tape-shelf.js` de um projeto Astro chamado 'Spotify 3D'" |
| 1:32 | "Pedi o modelo 3D de um iPod para controlar a playlist" | — |
| 1:36 | "Pedi um fio 3D com física real, que reage quando mexo na fita" | fita conectada ao iPod |
| 1:44 | "Para o fundo e os componentes que reagem à batida, copiei prompts prontos de sites de componentes, como o **React Bits**" | fundo "Green Vertical Blinds" de uma biblioteca de backgrounds |
| 1:55 | "Não escrevi uma linha de código; só orientei e corrigi a IA" | diff de `index.astro` no editor |
| 2:01 | "Comenta SPOTIFY que eu te mando o link" | o site pronto |

**O "Contrato Canônico"** (o documento de contexto que ele deu à IA):
- uma tabela com cada arquivo e o prompt que o cria;
- componentes nomeados (`SolarisPlayer`) e a função `extractCoverPalette`, que devolve `{ top, bottom, accent }` (três cores tiradas da capa);
- variáveis de estado e funções globais em `index.astro`;
- IDs do DOM e camadas (z-index) fixos: `#detail-background`, `#cassette-cable`, `.workspace/.topbar`, `.side-rail`…;
- tipografia **Fraunces** + **JetBrains Mono** e Font Awesome 6.7.2;
- interface 100% em português.

Arquivos que aparecem no projeto: `tape-shelf.js`, `tape-cable.js`,
`color-palette.js`, `fluted-background.js`, `generate-covers.mjs`,
`index.astro`, `data/albums.json` e pastas de MP3 e capas por artista.

**Atenção:**
- Não tem Spotify de verdade: é um **player de MP3 locais**.
- **Baixar MP3 do YouTube viola os termos do YouTube e os direitos autorais.** Serve como protótipo pessoal, não para publicar.

**O que aproveitar:** o **método**. Referência no Awwwards, documento de
contexto fixo, um prompt por arquivo, Three.js, paleta de três cores tirada
da capa para pintar o fundo e elementos que reagem ao áudio. No nosso, a
música vem da API do Spotify, não de MP3 baixados.

---

## 3. Spotify Web por dentro (recon)

Fonte: open.spotify.com/intl-pt, **sem login**, em 1440x900 e 390x844.
Só se descreve **o que o app faz**; nada de código, marca, textos ou conteúdo.

### 3.1 Estrutura (o "shell", presente em toda página)
- **Barra superior:**
  - logo à esquerda;
  - botão **Home** (círculo cinza);
  - campo de busca em pílula, "O que você quer ouvir?", com lupa à esquerda e um ícone de "navegar" à direita;
  - links de texto: Premium · Suporte · Baixar | Instalar aplicativo;
  - "Inscrever-se" e o botão **Entrar** (pílula branca, texto preto).
- **Coluna esquerda, "Sua Biblioteca":**
  - botão **+** no topo; a coluna é redimensionável;
  - sem login, mostra dois cards: "Crie sua primeira playlist / É fácil, vamos te ajudar" [Criar playlist] e "Que tal seguir um podcast novo? / Avisaremos você sobre novos episódios" [Explore podcasts];
  - no rodapé: links legais (Legal, Privacidade, Cookies, Sobre anúncios, Acessibilidade…) e o botão de idioma "🌐 Português do Brasil".
- **Coluna central:** o conteúdo da página, num painel arredondado.
- **Coluna direita** (recolhível pela seta "<" na borda): vazia, mostra "Encontrar algo para escutar" e o botão verde **Buscar**. Logado, vira a fila e "Tocando agora".
- **Rodapé:**
  - sem login, um banner com degradê **rosa → azul**: "Pré-visualização do Spotify · Inscreva-se para curtir música ilimitada e podcasts só com alguns anúncios. Não precisa de cartão de crédito" + [Inscreva-se grátis];
  - logado, a barra do player.
- **Carregamento:** *skeletons*, retângulos cinza arredondados no lugar das capas e dos textos.

### 3.2 Telas
| ID | tela | o que tem |
| --- | --- | --- |
| S02 | **Home** | carrosséis "Músicas em alta", "Artistas populares" (fotos redondas), "Singles e álbuns que todo mundo gosta", cada um com "Mostrar tudo" à direita; no hover, a capa clareia e um **botão Play verde** sobe no canto inferior direito |
| S03 | **Seção ("Mostrar tudo")** | a grade completa do carrossel |
| S04 | **Buscar (vazio)** | "Navegar por todas as seções": grade de 4 colunas de **cartões coloridos** (Música, Podcasts, Audiolivros, Eventos ao vivo, Feito para você, New Releases, Pop, Country, Música latina, Paradas, Mistério e suspense…, mais de 80 categorias), cada um com o título no canto e uma capa girada ~25° no canto inferior |
| S05 | **Buscar (com termo)** | chips de filtro (**Tudo**, Playlists, Músicas, Álbuns, Artistas, Podcasts e programas, Audiolivros, Perfis, Gêneros e momentos); "**Melhor resultado**" em card grande à esquerda; "Músicas" (4 linhas com capa, nome, artistas e duração) à direita; depois carrosséis de Artistas, Álbuns e Playlists |
| S06 | **Artista** | foto de capa ocupando a largura, nome em letras gigantes, "38,7 mi ouvintes mensais"; Play verde, aleatório, [Seguir] em pílula com contorno, ⋯; "Populares" (5 faixas com capa, nº de plays e duração + "Ver mais"); "Contagem regressiva pro lançamento"; "Escolha do artista"; "Discografia" com abas (Lançamentos populares / Álbuns / Singles e EPs); "Com {artista}"; "Fãs também curtem" |
| S07 | **Álbum / Single** | capa de ~230px à esquerda, "Single", título gigante, mini foto do artista • ano • "1 música, 2min 50s"; o **fundo do topo pega a cor da capa** (vermelho, no exemplo) e esmaece para o preto; Play, aleatório, **+** (salvar), ⋯ e alternância "Lista"; tabela (# · Título · ⏱); data de lançamento; © e ℗; "Mais de {artista}" + "Ver discografia" |
| S08 | **Playlist** | imagem de fundo ocupando o topo, "Playlist pública", nome gigante, descrição, dono • "33.647.832 salvamentos" • "50 músicas, cerca de 2h 45min"; tabela com **# · Título (capa+artistas) · Álbum · Adicionada em · ⏱** |
| S09 | **Música** | igual ao álbum, com nº de plays; bloco "**Letra**" que, sem login, é um card azul "Entre para ver a letra e ouvir a música completa" [Entrar] [Inscrever-se]; card do artista; "Recomendações: com base nesta música"; "Faixas populares de {artista}" |
| S10 | **Podcasts** | carrosséis de episódios (data • duração) e de programas novos |
| S11 | **Painel direito** | vazio com CTA Buscar (logado: fila) |
| S12 | **Idioma** | janela com a lista de idiomas |
| S14/S15 | **Biblioteca logada / Tela cheia** | não vistas sem login; a biblioteca aparece no reel 2: filtros Playlists/Álbuns/Artistas, busca, ordenação "Recentes" |

**No celular (390px):** a coluna da biblioteca ocupa quase a tela inteira, a
busca vira só um ícone e o conteúdo fica espremido à direita. O site é ruim
no celular, e isso é uma oportunidade para o nosso.

### 3.3 Fluxos
1. **Descobrir e tocar:** Home → hover na capa → Play (ou abrir o álbum → Play). 2 cliques. Sem login, só pré-visualização e convite para cadastro.
2. **Buscar e tocar:** campo de busca → resultados → (filtro) → Play. 2-3 cliques.
3. **Navegar por categoria:** Buscar → cartão colorido → página do gênero → playlist → Play.
4. **Explorar artista:** Populares / Discografia / Seguir.
5. **Salvar** (logado): botão + → aparece na biblioteca; criar playlist pelo + da biblioteca.
6. **Controlar a reprodução** (logado): play/pause, anterior/próxima, aleatório, repetir, barra de progresso, volume, fila, dispositivos, tela cheia.

### 3.4 Visual
- Fundo quase preto; painéis cinza muito escuro com cantos de ~8px e 8px de espaço entre colunas.
- **Verde** só nas ações de tocar; texto branco e cinza médio para o secundário.
- Fonte sem serifa geométrica; títulos de página **enormes e pesados** (≈72-96px); títulos de carrossel ≈24px em negrito.
- **Cor dinâmica:** o topo de álbum, playlist e artista herda a cor da capa.
- Microinterações: o Play sobe no hover do card; na tabela, o número da faixa vira ▶ no hover.

### 3.5 Dados por trás (inferidos)
Artista · Álbum (tipo album/single/ep/compilation, capa, data, faixas,
copyrights) · Faixa (duração, explícito, plays, letra) · Playlist (dono,
pública, salvamentos, itens com "adicionada em") · Usuário (plano free/premium)
· Biblioteca · Seguidos · Estado de reprodução (aparelho, posição, fila,
aleatório/repetir) · Categoria (nome, cor, capa) · Carrossel.

---

## 4. Spotifast: o "Spotify grátis"

**Fonte principal:** o próprio código, github.com/crmne/fastpotify (versão 0.15.0, 31/10/2026).

### 4.1 O que é
- Um **cliente não oficial** do Spotify para computador (Linux, macOS e Windows), lema "Spotify, native and fast". Licença **MIT**. Antes se chamava **Fastpotify**.
- Autor: **Carmine Paolino** (`crmne` no GitHub, `@paolino` no X). Na prática, um projeto de uma pessoa, com contribuições pontuais.
- Números: o autor fala em 100-250 MB de RAM e abertura em menos de 1 segundo; o teste da PCGH mediu **168 MB** contra **1.124 MB** do app oficial, mas teve falhas ao carregar playlists. O instalador tem 15-18 MB.

### 4.2 Como foi construído
| peça | o que usa | para quê |
| --- | --- | --- |
| Linguagem | **Rust** (~142 mil linhas) | desempenho e baixo consumo |
| Interface | **egui/eframe** (desenhada direto na GPU) + framework próprio "fastframe" | **sem navegador embutido**: o app oficial roda sobre o Chromium, e é aí que está a economia |
| Áudio | **librespot** (reimplementação open source do protocolo dos apps oficiais), num fork próprio | tocar até 320 kbps, sem pausa entre faixas, com cache; aparece como aparelho "Spotifast" no Spotify Connect |
| Dados | **Spotify Web API oficial** com um **app pessoal do usuário** | biblioteca, playlists, busca e controle |
| Extras | requisições privadas dos apps oficiais (só leitura) e o player **Soloist** do próprio Spotify (opcional) | coisas que a API pública não dá: letras, plays, Home personalizada, lançamentos, rádio |
| Recursos | mini player com **skins do Winamp**, equalizador, visualizador **MilkDrop**, Google Cast, Sonos, temas claro/escuro/personalizado, atalhos, bandeja | — |
| Distribuição | Homebrew, AUR, Flatpak, AppImage, Nix, instalador Windows; GitHub Actions | — |

**Como o usuário começa a usar:**
1. Cria um app grátis no painel de desenvolvedor do Spotify (redirect `http://127.0.0.1:8989/login`, Web API marcada).
2. Cola o **Client ID** no Spotifast e faz login.
3. Ativa "Set up playback here" para tocar no computador (uma segunda autorização).

### 4.3 Foi feito por IA ou por uma skill de clonagem?
- O repositório tem um `AGENTS.md` (regras para agentes de IA que mexem no código), revisão automática (CodeRabbit) e atualização automática de dependências (Renovate). Ou seja, **o autor usa IA como ferramenta**, dentro de regras de arquitetura que ele mesmo escreveu.
- **Não há sinal** de que tenha sido gerado por uma skill de "clonar qualquer app". Ele só existe porque o librespot já existia, e por centenas de commits do autor.

### 4.4 O que o reel 5 errou
| o reel diz | a realidade |
| --- | --- |
| "Recriaram o Spotify 100% de graça" | É um **cliente**: as músicas, os servidores e as licenças continuam sendo do Spotify. **Tocar exige Premium.** |
| "Mais otimizado, mais rápido" | Verdade quanto à memória (168 MB × 1.124 MB), com falhas de carregamento relatadas |
| "Um repositório no Claude/Codex clona qualquer app" | Não foi assim que o Spotifast nasceu. Skills como a replica ajudam a mapear e reconstruir **funcionalidades**, não entregam um Spotify pronto |
| "Qualquer leigo cria um software nível Spotify" | São ~142 mil linhas de Rust feitas por um desenvolvedor experiente |
| "Isso é legal" | O código é MIT, mas os **termos do Spotify proíbem clientes não autorizados** e engenharia reversa. É zona cinzenta |

---

## 5. Spotify Web API: o que tem dentro

Fonte: developer.spotify.com (referência e changelogs de fev, mar, mai e jul de 2026).
Endereço: `https://api.spotify.com/v1` · Autenticação: OAuth 2.0.

### 5.1 As regras para quem cria um app hoje
- O **dono do app precisa ter Premium**; se o Premium vencer, o app para.
- **No máximo 5 usuários**, cada um adicionado manualmente no painel. Sem isso, o login até funciona, mas as chamadas dão erro 403.
- Até **25 apps** por desenvolvedor (desde jul/2026), mas o **limite de uso é somado por conta**; estourando, vem o erro `429 QUOTA_EXCEEDED`.
- **Liberar para todo mundo** (extended quota): desde mai/2025 só para **empresas**, com **250 mil+ usuários ativos por mês**, serviço já lançado e revisão de até 6 semanas.
- Login recomendado: **Authorization Code com PKCE** (dá para fazer só no front-end). Client Credentials serve só para o catálogo, sem usuário. O implicit grant e o redirect `http` (exceto `127.0.0.1`) foram descontinuados.
- Política: não pode baixar o conteúdo; as capas precisam ficar na forma original e com atribuição ao Spotify.

### 5.2 O que dá para usar
**Catálogo**
- `GET /albums/{id}` e `/albums/{id}/tracks`: nome, tipo, **capas em 640/300/64px**, data, artistas, faixas, copyrights, códigos externos (UPC).
- `GET /artists/{id}` e `/artists/{id}/albums`: nome, imagens, discografia.
- `GET /tracks/{id}`: nome, duração, explícito, número, álbum, artistas, `preview_url` (muitas vezes vazio), ISRC.
- `GET /search`: álbum, artista, playlist, faixa, podcast, episódio, audiolivro. **Máximo de 10 por página** (padrão 5); para ver mais, use `offset`.
- Podcasts (`/shows`, `/episodes`) e audiolivros (`/audiobooks`, `/chapters`).
- `GET /playlists/{id}`: o **nome e a capa** de qualquer playlist; as **faixas só vêm se a playlist for sua** (ou colaborativa).

**Usuário e biblioteca**
- `GET /me`: nome, foto, `id` e `account_id` (o identificador estável, desde mai/2026).
- `GET /me/top/artists` e `/me/top/tracks`: os mais ouvidos em ~4 semanas, ~6 meses e ~1 ano.
- `GET /me/player/recently-played`: as últimas 50 músicas tocadas.
- `GET /me/tracks`, `/me/albums`, `/me/shows`, `/me/episodes`, `/me/audiobooks`, `/me/following`: tudo o que está salvo ou seguido.
- **Novo:** `PUT /me/library` (salvar ou seguir), `DELETE /me/library` (remover) e `GET /me/library/contains` (checar), para qualquer tipo, por URI.
- Playlists: `GET /me/playlists`, `POST /me/playlists` (criar), `PUT /playlists/{id}` (nome, descrição, pública/privada), `PUT /playlists/{id}/images` (capa em JPEG) e `GET/POST/PUT/DELETE /playlists/{id}/items` (ler, adicionar, reordenar, remover).

**Player** (exige Premium)
- Estado, aparelhos, transferir, o que está tocando, play, pause, próxima, anterior, ir para um ponto, repetir, volume, aleatório, ver e adicionar à fila.
- O **Web Playback SDK** (JavaScript) faz a **própria página virar um aparelho** que toca. É o que vai fazer o vinil girar de verdade.

### 5.3 O que não dá mais (removido ou bloqueado para apps novos)
| o quê | desde |
| --- | --- |
| Recomendações, características de áudio (audio features) e análise de áudio, artistas relacionados, playlists em destaque, playlists por categoria, sementes de gênero, playlists editoriais e algorítmicas do Spotify | nov/2024 |
| Pedir vários itens de uma vez (`/tracks?ids=`, `/albums`, `/artists`…): agora é um por um | fev/2026 |
| Músicas mais tocadas do artista, lançamentos, categorias da busca, lista de países | fev/2026 |
| Perfil e playlists de **outros usuários** | fev/2026 |
| Endpoints antigos de salvar/seguir por tipo (trocados por `/me/library`) e `/playlists/{id}/tracks` (renomeado para `/items`) | fev/2026 |
| Campos: popularidade (faixa, álbum e artista), seguidores do artista, gravadora, países disponíveis, `album_group`, `linked_from`; no `/me`: e-mail, país, plano, filtro de explícito, seguidores | fev/2026 (`external_ids` voltou em mar/2026) |

### 5.4 Chamadas reais
Ainda não foram feitas: a API respondeu **401** porque falta credencial.
Para eu puxar os dados reais da sua conta:
1. Crie um app em developer.spotify.com/dashboard.
2. Coloque `SPOTIFY_CLIENT_ID` e `SPOTIFY_CLIENT_SECRET` como variáveis secretas nas configurações do ambiente. **Não cole no chat.**

---

## 6. O que tudo isso significa para o Spotify-Vinils

### 6.1 O que dá para fazer com a API oficial
| recurso | inspiração | viável? |
| --- | --- | --- |
| Login com a conta Spotify | Spotifast | ✅ PKCE |
| Biblioteca do usuário em **coverflow 3D** de capas | reel 4 | ✅ álbuns e playlists salvos, capas 640px |
| **Toca-discos visto de cima**: vinil girando, rótulo com nome e artista, **braço da agulha** que entra no play e sai no pause | reel 4 | ✅ Web Playback SDK (estado tocando/pausado e posição) |
| **Fundo na cor da capa** | Spotify Web + reel 4 | ✅ extraindo a cor da imagem no navegador (a API não dá a cor) |
| **Estilos de vinil**: preto, marmorizado, transparente, respingado, colorido | reel 4 | ✅ tudo visual, é nosso |
| **Estojo que abre** e o disco entra no player | reel 3 | ✅ animação |
| **Capa personalizada / "presente" por link** | reel 3 | ⚠️ dá para criar uma playlist e subir a capa, mas o amigo precisa de conta (e de Premium para tocar inteiro) |
| **Temas** | reel 2 | ✅ |
| **Letras sincronizadas** | post 6 (Feelora) | ✅ via **LRCLIB** (base aberta, formato LRC com tempo), casando pela faixa e pela duração; a API do Spotify não tem letras |
| **Modo foco**: capa grande com brilho na cor dela | post 6 | ✅ |
| Tela de conexão e **carregamento animado** ("montando sua coleção") | post 6 | ✅ |
| Objeto 3D (vinil/toca-discos) em **Three.js**, com cabo ou braço com física | reel 7 | ✅ |
| **Paleta de 3 cores** tirada da capa (`top/bottom/accent`) para o fundo | reel 7 | ✅ |
| Elementos que **reagem à batida** | reel 7 | ⚠️ o Web Playback SDK não dá acesso ao áudio; dá para simular pelo tempo da música, mas não analisar o som de verdade |
| Busca | Spotify Web | ✅ 10 por página |
| Play instantâneo e retomar de onde parou | reel 1 | ✅ o SDK e o Spotify Connect guardam o estado |
| Funcionar bem no celular | site original é fraco | ⚠️ o Web Playback SDK não toca em navegadores de celular; no celular, o app vira um **controle remoto** de outro aparelho |

### 6.2 O que não dá
- Home cheia de recomendações, playlists editoriais, nº de plays e popularidade, faixas de playlists de outras pessoas, letras.
- Tocar sem Premium.
- Mais de 5 usuários no mesmo app, a não ser que cada usuário use o **próprio Client ID** (como o Spotifast faz).

### 6.3 O que evitar
- Bloquear anúncios, usar librespot ou rotas privadas: viola os termos e pode ser bloqueado.
- Usar MP3 baixados do YouTube (como no reel 7): viola direitos autorais.
- Usar o nome, o logo, o verde ou os textos do Spotify: a identidade precisa ser própria (`/replica-brand`), com atribuição "conteúdo via Spotify".

### 6.4 Tamanho do projeto
**M (algumas semanas)** para um player de vinil sobre a Web API.
As partes difíceis são:
1. Login e reprodução (OAuth, SDK, Premium).
2. A animação do vinil e a cor da capa com bom desempenho.
3. A experiência no celular.

---

## 7. Próximos passos (método replica)

1. **`/replica-architect`**: decidir as tecnologias (sugestão: Vite + React/TypeScript ou Astro, **Three.js** para o vinil, só front-end com PKCE, Web Playback SDK, letras pelo LRCLIB, sem servidor próprio), as rotas e o modelo de dados. Escrever um **documento de contexto fixo** para a IA, como o "Contrato Canônico" do reel 7: arquivos, nomes, camadas, fontes e idioma.
2. **`/replica-design`**: tokens próprios (cores, fontes, espaçamentos) e os componentes do vinil.
3. **`/replica-build`**: na ordem: login (tela de conexão + carregamento) → biblioteca em coverflow → toca-discos → controles → busca → letras sincronizadas e modo foco → personalização do vinil → temas → estojo e presente. Um prompt por arquivo, como no reel 7.
4. **`/replica-test`** e **`/replica-diff`**: comparar com o mapa e com a lista de funcionalidades (`features.csv`).
5. **`/replica-brand`** e **`/replica-launch`**: nome e cara próprios.

---

## 8. Fontes
- Reels: instagram.com/reel/DcBhby3sl7_ · /Deuivi5x7yc · /DcB2EJRPAuk · /DbKosHuxAN7 · /DecCjQyufza · /DerUf07GArm
- Carrossel: instagram.com/p/DZkZu1CmgPY (Feelora)
- Spotify Web: open.spotify.com/intl-pt (visitado sem login em 31/10/2026)
- Replica skill: github.com/Jakeschincariol/replica-skill
- Spotifast: github.com/crmne/fastpotify · sourceforge.net/projects/fastpotify.mirror · pcgameshardware.de (teste de RAM) · techradar.com · alternativeto.net/software/fastpotify
- Spotify Web API: developer.spotify.com/documentation/web-api (referência; concepts/quota-modes; references/changes/february-2026, march-2026, may-2026, july-2026; tutorials/february-2026-migration-guide)
