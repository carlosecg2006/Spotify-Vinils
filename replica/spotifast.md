# Spotifast: como foi criado

Fonte primária: o repositório https://github.com/crmne/fastpotify (lido em
31/10/2026, versão 0.15.0). Ele foi clonado só para leitura; nenhum código
dele foi copiado para este projeto.

## O que é
- Cliente **não oficial** do Spotify para desktop (Linux, macOS, Windows),
  "Spotify, native and fast". Licença MIT. Antes se chamava **Fastpotify**.
- Autor: **Carmine Paolino** (GitHub `crmne`). É praticamente um projeto
  de uma pessoa só, com contribuições pontuais da comunidade.
- **Não é Spotify grátis:** o catálogo continua vindo do Spotify. Contas
  Free só navegam e buscam; **tocar exige Premium**.

## Como foi construído
| camada | tecnologia |
| --- | --- |
| linguagem | Rust (~142 mil linhas em `src/`) |
| interface | **egui/eframe** (UI imediata desenhada via OpenGL) com forks próprios de egui/winit, mais o framework próprio "fastframe". **Sem navegador embutido** (o app oficial usa Chromium/CEF), e é daí que vem a economia de RAM |
| áudio | **librespot 0.8** (reimplementação open source do protocolo dos clientes oficiais; até 320 kbps, gapless, cache), num fork próprio; saída por rodio/cpal |
| dados | **Spotify Web API** (biblioteca, playlists, busca, controle de player) com o **app pessoal do usuário** (cada um cria o seu Client ID no developer dashboard, redirect `http://127.0.0.1:8989/login`) |
| extras | requisições privadas que os apps oficiais fazem (Pathfinder, Home personalizada, contagem de plays, letras), só leitura e via sessão librespot; opcionalmente o player **Soloist**, do próprio Spotify |
| outros | tokio/reqwest (rede), keyring (credenciais protegidas), mini player com skins Winamp `.wsz`, equalizador, visualizador MilkDrop (projectM), Spotify Connect, Google Cast, Sonos |
| empacotamento | Homebrew, AUR, Flatpak, AppImage, Nix, instaladores Windows; CI no GitHub Actions |

## Foi feito por IA / por uma skill de clonagem?
- O repo tem um `AGENTS.md` (regras para agentes de código), CodeRabbit
  (revisão automática) e Renovate. Ou seja, **usa IA como ferramenta** no
  desenvolvimento, com regras de arquitetura rígidas escritas pelo autor.
- Não há nenhum sinal de que tenha sido gerado por uma skill de "clonar
  qualquer app" (como a replica-skill). É engenharia de baixo nível que só
  funciona porque o librespot já existia, além de muitos meses de commits.
- **O que o reel exagera:** "100% de graça" (precisa de Premium), "recriaram
  o Spotify" (é um *cliente*: o catálogo, o servidor e as licenças continuam
  sendo do Spotify) e "qualquer leigo cria" (são ~142 mil linhas de Rust).

## Aspecto legal
Open source sob MIT, mas os termos do Spotify proíbem clientes não
autorizados e engenharia reversa, e o uso de endpoints privados pode quebrar
ou levar a bloqueio a qualquer momento. Projetos como esse ficam numa zona
cinzenta e dependem da tolerância do Spotify.

## O que serve para o Spotify-Vinils
- **Copiar o modelo de auth:** cada usuário usa o próprio Client ID, porque
  o modo de desenvolvimento só permite 5 usuários por app.
- Interface leve: player com estética retrô (skins Winamp) mostra que há
  demanda por "Spotify com outra cara", que é exatamente a ideia do vinil.
- **Não seguir:** endpoints privados e librespot. Para web, o caminho
  oficial é a Web API + Web Playback SDK.
