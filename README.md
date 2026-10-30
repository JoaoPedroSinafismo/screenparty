# ScreenParty (Etapa 2 - V0.2)

> Plataforma web de compartilhamento de tela e áudio em tempo real de baixa latência para amigos, desenvolvida com React, TypeScript, Express e LiveKit.

---

## 📋 Sumário
- [Visão Geral](#-visão-geral)
- [Novidades da V0.2](#-novidades-da-v02)
- [Arquitetura & Stack](#-arquitetura--stack)
- [Pré-requisitos](#-pré-requisitos)
- [Passo a Passo de Instalação e Execução](#-passo-a-passo-de-instalação-e-execução)
- [Como Iniciar o Servidor LiveKit no Windows](#-como-iniciar-o-servidor-livekit-no-windows)
- [Variáveis de Ambiente](#-variáveis-de-ambiente)
- [Como Testar Localmente (Duas Abas / Navegadores)](#-como-testar-localmente-duas-abas--navegadores)
- [Áudio do Sistema: Requisitos e Limitações do Navegador](#-áudio-do-sistema-requisitos-e-limitações-do-navegador)
- [Segurança & Privacidade](#-segurança--privacidade)
- [Estrutura do Projeto](#-estrutura-do-projeto)
- [Documentações Complementares](#-documentações-complementares)

---

## 🚀 Visão Geral
O **ScreenParty** permite compartilhar telas e áudio de alta qualidade entre amigos diretamente pelo navegador.

### 🌟 Novidades da V0.2
- **Controles de Qualidade**: Perfis selecionáveis de resolução (`720p`, `1080p`, `1440p`) e taxa de quadros (`30 FPS` e `60 FPS`) com aplicação dinâmica via `applyConstraints` sem reiniciar a sala.
- **Medição Real vs Solicitada**: Inspeção de `track.getSettings()` diferenciando a qualidade desejada da resolução e FPS efetivamente capturados pelo hardware/navegador.
- **Controle de Áudio do Espectador**: Controle deslizante individual de volume (0 a 100%) e botão de silenciar/desmutar (Mute/Unmute), sem alterar o volume original da transmissão.
- **Aprimoramentos do Player**: Alternância de modo de ajuste de proporção ("Ajustar" `contain` vs "Preencher" `cover`), tela cheia nativa e auto-ocultação de controles após inatividade do cursor.
- **Indicadores em Tempo Real**: Status de conexão WebSocket/WebRTC (Conectado, Reconectando, Desconectado) e contagem real de participantes.
- **Estabilidade Avançada**: Sequenciador assíncrono para o ciclo de vida da sala LiveKit, prevenindo colisões de identidade (`DUPLICATE_IDENTITY`) e loops de reconexão.

---

## 🛠 Arquitetura & Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons, LiveKit Client SDK.
- **Backend**: Node.js, Express, TypeScript, Zod, LiveKit Server SDK.
- **Media Engine**: LiveKit WebRTC Server (execução local).
- **Gerenciador de Pacotes**: npm workspaces.

---

## ⚙️ Pré-requisitos
- **Node.js**: v18.x ou superior (v20+ LTS recomendado).
- **npm**: v9+ (suporte nativo a workspaces).
- **Navegador**: Google Chrome ou Microsoft Edge (suporte pleno à captura de áudio com `systemAudio: 'include'`).

---

## 💻 Passo a Passo de Instalação e Execução

### 1. Clonar e Instalar Dependências do Monorepo
Na raiz do projeto (`screenparty/`):

```bash
npm install
```

### 2. Configurar Variáveis de Ambiente

No backend (`apps/server`):
```bash
cp apps/server/.env.example apps/server/.env
```
*(No Windows PowerShell: `Copy-Item apps/server/.env.example apps/server/.env`)*

No frontend (`apps/web`):
```bash
cp apps/web/.env.example apps/web/.env
```
*(No Windows PowerShell: `Copy-Item apps/web/.env.example apps/web/.env`)*

### 3. Iniciar o Servidor LiveKit Local
Consulte a seção abaixo para iniciar o LiveKit no Windows. Ele deve estar rodando em `ws://127.0.0.1:7880`.

### 4. Iniciar os Serviços

Para rodar **frontend** e **backend** simultaneamente:
```bash
npm run dev
```

Ou, se preferir terminais separados:
- **Terminal 1 (Backend - porta 3001)**:
  ```bash
  npm run dev:server
  ```
- **Terminal 2 (Frontend - porta 5173)**:
  ```bash
  npm run dev:web
  ```

Acesse a aplicação no navegador em: **`http://localhost:5173`**

---

## 🪟 Como Iniciar o Servidor LiveKit no Windows

Para desenvolvimento local, você pode executar o LiveKit Server no modo de desenvolvimento (`--dev`), que utiliza as chaves de teste padrão (`devkey` e `secret`).

### Opção A: Via Binário Oficial Standalone (Sem Docker - Mais rápido)
1. Baixe a versão mais recente para Windows (ex: `livekit_..._windows_amd64.tar.gz` ou `.zip`) dos lançamentos oficiais do LiveKit no GitHub:
   - [LiveKit Releases no GitHub](https://github.com/livekit/livekit/releases)
2. Extraia o executável `livekit-server.exe` em uma pasta (ex: `C:\tools\livekit` ou na própria pasta do projeto).
3. Abra um terminal do PowerShell e execute:
   ```powershell
   .\livekit-server.exe --dev
   ```
4. O servidor iniciará na porta `7880` (WebSocket) e `7881`/`7882` para tráfego WebRTC UDP.

### Opção B: Via Docker no Windows (Se tiver Docker Desktop)
Abra o PowerShell e execute:
```powershell
docker run --rm -p 7880:7880 -p 7881:7881 -p 7882:7882/udp livekit/livekit-server --dev
```

### Opção C: Via Chocolatey / Scoop (se instalado)
```powershell
scoop install livekit-server
livekit-server --dev
```

---

## 🔐 Variáveis de Ambiente

### Backend (`apps/server/.env`)
| Variável | Padrão | Descrição |
| :--- | :--- | :--- |
| `PORT` | `3001` | Porta HTTP da API de tokens |
| `CORS_ORIGIN` | `http://localhost:5173` | Origem autorizada no CORS |
| `LIVEKIT_API_KEY` | `devkey` | Chave de API do LiveKit Server |
| `LIVEKIT_API_SECRET`| `secret` | **SEGREDO CRÍTICO** (Nunca expor ao cliente) |
| `LIVEKIT_URL` | `ws://127.0.0.1:7880` | URL do WebSocket do LiveKit |
| `TOKEN_TTL_SECONDS` | `21600` (6h) | Tempo de vida dos tokens gerados |

### Frontend (`apps/web/.env`)
| Variável | Padrão | Descrição |
| :--- | :--- | :--- |
| `VITE_API_URL` | `http://localhost:3001/api` | Endpoint do backend para tokens |

---

## 🧪 Como Testar Localmente (Duas Abas / Navegadores)

1. Certifique-se de que o **LiveKit Server**, o **Backend** (`port 3001`) e o **Frontend** (`port 5173`) estão em execução.
2. Abra a **Janela 1** (ex: Google Chrome) em `http://localhost:5173`:
   - Digite o apelido `Alice` e clique em **Criar e Entrar na Sala**.
   - Você será direcionado para `/room/sp-xxxx-xxxx`.
3. Copie o código ou link da sala clicando em **Convidar Amigos** ou no cabeçalho.
4. Abra a **Janela 2** (uma aba anônima ou Microsoft Edge) e acerte a URL da sala ou digite o código na Home:
   - Digite o apelido `Bob` e entre.
   - Veja o painel lateral atualizar com os dois participantes (`Alice` e `Bob`).
5. Na janela de `Alice`, clique em **Compartilhar Tela com Áudio**:
   - Selecione uma aba (ex: YouTube tocando um vídeo) ou tela inteira.
   - **IMPORTANTE**: No diálogo do navegador, marque a caixa *"Compartilhar áudio do sistema"* ou *"Compartilhar áudio da guia"*.
6. Na janela de `Bob`:
   - O vídeo da transmissão aparecerá imediatamente.
   - Caso o navegador bloqueie o som por política de autoplay, clique no botão **Ouvir Áudio** exibido no banner superior.
   - O áudio será reproduzido sincronizado.
7. Clique em **Parar Compartilhamento** em Alice ou encerre na barra do navegador:
   - Ambas as telas atualizam de volta para o estado de espera com elegância.

---

## 🔊 Áudio do Sistema: Requisitos e Limitações do Navegador

- **Google Chrome e Microsoft Edge no Windows**: Oferecem suporte à captura de áudio da tela inteira ou de abas individuais quando o usuário ativa explicitamente a caixa de seleção na janela de permissão do navegador.
- **Faixa de Áudio Não Garantida**: O ScreenParty verifica explicitamente via `mediaStream.getAudioTracks().length > 0`. Se o usuário desmarcar o som ou se o navegador não fornecer a faixa, a aplicação informa:
  > *"Nenhuma faixa de áudio detectada nesta captura. O navegador não enviou áudio..."*
- O sistema **nunca alega que há áudio** sem antes validar a presença do track.

---

## 🛡 Segurança & Privacidade
- O segredo `LIVEKIT_API_SECRET` permanece restrito exclusivamente ao backend.
- A API `/api/token` valida os parâmetros de entrada com `zod` e impõe limites rígidos de tamanho e caracteres.
- Os tokens JWT do LiveKit possuem tempo de expiração (`TTL`) limitado e permissões estritas para aquela sala específica.
- Nenhuma gravação de áudio ou vídeo é feita no servidor ou no cliente.
- O compartilhamento de tela requer ação explícita e confirmação no diálogo de permissão do sistema operacional.

---

## 📁 Estrutura do Projeto
```text
screenparty/
├── apps/
│   ├── web/                     # SPA React + Vite + Tailwind
│   ├── server/                  # API Express + LiveKit Server SDK
│   └── desktop/                 # Reservado para versão desktop nativa futura
├── docs/
│   ├── architecture.md          # Arquitetura e decisões técnicas
│   ├── testing.md               # Roteiro de testes manuais e checklist
│   └── roadmap.md               # Planejamento das próximas etapas
├── package.json                 # Monorepo workspaces
└── README.md
```

---

## 📚 Documentações Complementares
- [Arquitetura do Sistema](docs/architecture.md)
- [Plano de Testes e Checklist de Aceitação](docs/testing.md)
- [Roadmap de Evolução](docs/roadmap.md)

