# Arquitetura do ScreenParty - Etapa 3 (V0.3 Online)

## 1. Visão Geral

O **ScreenParty** é uma plataforma focada em transmissão e consumo síncrono de tela e áudio entre amigos, com latência sub-segundo via WebRTC e LiveKit SFU (Selective Forwarding Unit).

Na versão **V0.3**, a arquitetura foi estendida para suportar operação em nuvem distribuída:
- **Frontend SPA**: Hospedado no **Cloudflare Pages** com build de monorepo e roteamento dinâmico via `_redirects`.
- **Backend API**: Publicado no **Render** com HTTPS, validação de autorização de salas e CORS controlado.
- **Media Engine**: Conectado ao **LiveKit Cloud** com protocolo seguro `wss://`.
- **Segurança de Acesso**: Proteção por chave de convite determinística (HMAC SHA-256) e senhas opcionais por sala. Nenhuma sala é acessível sem autorização.

---

## 2. Diagrama de Comunicação e Fluxos de Mídia

```text
+-------------------------------------------------------+                    +-------------------------------------------------------+
|                 Cliente Web (Alice - Apresentador)    |                    |                 Cliente Web (Bob - Espectador)        |
|  - getDisplayMedia com preferências (720p/1080p/1440p)|                    |  - Inscrição automática em vídeo e áudio              |
|  - Inspeção de actualSettings (Resolução/FPS reais)   |                    |  - Controle local de volume (0-100%) sem mudar fonte  |
|  - applyConstraints dinâmico sem reiniciar sala       |                    |  - Modos de ajuste: contain vs cover                  |
+---------------------------+---------------------------+                    +---------------------------+---------------------------+
                            |                                                                            |
                            | 1. POST /api/token                                                         | 1. POST /api/token
                            v                                                                            v
+------------------------------------------------------------------------------------------------------------------------------------+
|                                                Backend ScreenParty (Node.js + Express)                                             |
|                                            Gera JWT com permissões mínimas e TTL restrito                                          |
+------------------------------------------------------------------------------------------------------------------------------------+
                            |                                                                            |
                            | 2. Retorna Token JWT e LiveKit URL                                         | 2. Retorna Token JWT e LiveKit URL
                            v                                                                            v
+---------------------------+---------------------------+                    +---------------------------+---------------------------+
|   Alice (Conexão Segura)                              |                    |   Bob (Conexão Segura)                                    |
+---------------------------+---------------------------+                    +---------------------------+---------------------------+
                            |                                                                            |
                            | 3. Conexão Sequencial Única (ws://127.0.0.1:7880)                          | 3. Conexão Sequencial Única
                            v                                                                            v
+------------------------------------------------------------------------------------------------------------------------------------+
|                                                    LiveKit Media Server (SFU)                                                      |
|                                                                                                                                    |
|                  [Alice publica: videoTrack (ScreenShare) + audioTrack (ScreenShareAudio) vinculados]                             |
|                  [SFU encaminha faixas com Dynacast e AdaptiveStream para os assinantes autorizados]                               |
|                                                                                                                                    |
+------------------------------------------------------------------------------------------------------------------------------------+
                                                                   |
                                                                   | 4. Bob recebe TrackSubscribed
                                                                   v
                                     [Reproduz vídeo de baixa latência e áudio com volume independente]
```

---

## 3. Componentes e Decisões Técnicas da V0.2

### 3.1. Pipeline de Captura e Preferências de Qualidade (`useScreenShare.ts`)
- **Preferências Flexíveis**: Perfis `720p` (1280x720), `1080p` (1920x1080) e `1440p` (2560x1440) combinados com `30 FPS` ou `60 FPS`.
- **Ideal vs Exato**: As opções são passadas como `{ ideal, max }`. Isso impede que navegadores rejeitem a chamada caso o monitor ou janela selecionada possua dimensões diferentes da preferência solicitada.
- **Medição Real**: Utiliza `videoTrack.getSettings()` para ler `width`, `height`, `frameRate` e `displaySurface`. O sistema diferencia visualmente a preferência escolhida da medição efetiva realizada pelo navegador.
- **`applyConstraints` Dinâmico**: Ao alterar a resolução ou FPS durante uma transmissão ativa, o track recebe as novas restrições sem derrubar a conexão WebSocket ou recriar a sala.

### 3.2. Controle de Áudio Local do Espectador (`AudioPlayer.tsx` e `VideoPlayer.tsx`)
- **Isolamento de Volume**: O volume do espectador (0% a 100%) e o estado de silenciamento (`isMuted`) são aplicados diretamente no elemento `<audio>` do cliente receptor via `audioEl.volume` e `audioEl.muted`.
- Isso não afeta o sinal original transmitido nem o volume dos demais participantes na sala.
- Tratamento de Autoplay: Evento `AudioPlaybackStatusChanged` do LiveKit detecta bloqueios de autoplay e exibe banner intuitivo com botão de liberação via interação do usuário.

### 3.3. Estabilidade de Conexão e Sequenciador (`useLiveKitRoom.ts`)
- **Instância Room Única**: Criada e persistida em `useRef` estável para evitar recriações sucessivas de conexões WebRTC.
- **Fila Sequencial**: Encadeamento determinístico de `Promise` para garantir que `room.connect()` e `room.disconnect()` nunca ocorram concorrentemente.
- **Isolamento de Callbacks**: Callbacks como `onDisconnected` e funções de atualização de interface são consumidos via `useRef`, eliminando re-execuções espúrias do `useEffect` causadas por re-renderizações de componentes pais.
- **Resiliência a StrictMode**: Suporte nativo ao ciclo duplo de montagem do React 18 sem provocar colisão de identificador (`DUPLICATE_IDENTITY`).
