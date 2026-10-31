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
