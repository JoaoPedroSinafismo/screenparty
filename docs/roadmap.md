# Roadmap do ScreenParty

Planejamento de evolução técnica e funcional do ScreenParty em etapas incrementais.

---

## 📌 Etapa 1: Fundação Local & WebRTC (V0.1 - Concluída)
- [x] Monorepo npm workspaces (`apps/web`, `apps/server`, `apps/desktop placeholder`).
- [x] Frontend React 18 + Vite + Tailwind CSS em tema escuro moderno.
- [x] Criação de salas com códigos aleatórios de alta entropia.
- [x] Backend Express com emissão de tokens LiveKit com permissões mínimas e TTL limitado.
- [x] Captura `getDisplayMedia` com `video: true, audio: true, systemAudio: 'include'`.
- [x] Verificação ativa de existência da faixa de áudio na captura.
- [x] Reprodução síncrona remota com tratamento de autoplay do navegador.
- [x] Limpeza e tratamento de encerramento nativo pelo navegador.
- [x] Documentação e instruções de execução do LiveKit no Windows.

---

## 🚀 Etapa 2: Controles de Qualidade, Player e Experiência do Espectador (V0.2 - Concluída)
- [x] Seletor de qualidade com perfis 720p, 1080p e 1440p.
- [x] Seletor de taxa de quadros com 30 FPS e 60 FPS.
- [x] Diferenciação transparente entre qualidade solicitada e qualidade efetivamente capturada (`videoTrack.getSettings()`).
- [x] Aplicação dinâmica de restrições via `applyConstraints` sem reiniciar a sala.
- [x] Controle de volume individual (0% a 100%) para o espectador.
- [x] Botão de silenciar/desmutar (Mute / Unmute) com ícones dinâmicos.
- [x] Modo de ajuste de imagem ("Ajustar à tela" `contain` vs "Preencher" `cover`).
- [x] Botão de tela cheia nativo com controle de foco e atalhos.
- [x] Ocultação automática de controles por inatividade de cursor (3.5s) preservando acessibilidade.
- [x] Indicador em tempo real do estado de conexão: Conectado, Reconectando e Desconectado.
- [x] Contagem dinâmica e real de participantes conectados na sala.
- [x] Resolução de ciclo repetido de conexão com instância Room única e fila assíncrona sequencial.

---

## 🌐 Etapa 3: Publicação em Produção & Segurança de Salas (V0.3 - Concluída)
- [x] Preparação para Cloudflare Pages a partir da raiz do monorepo.
- [x] Script de build direcionado para `apps/web/dist` (`npm run build:web`).
- [x] Suporte a SPA routing no Cloudflare Pages com `_redirects` (`/* /index.html 200`) para recarga de `/room/:roomId`.
- [x] Proteção das salas com chaves de convite criptográficas (HMAC) e senhas personalizadas (sem acesso por adivinhação).
- [x] Rejeição de credenciais padrão de desenvolvimento (`devkey`/`secret`) em ambiente de produção (`NODE_ENV=production`).
- [x] Normalização e garantia de protocolo seguro `wss://` para LiveKit Cloud.
- [x] Sem fallback silencioso para localhost na build de produção do frontend (`VITE_API_URL` obrigatório).
- [x] Tratamento de cold-start do Render e erros amigáveis de rede e CORS.
- [x] Documentação completa de publicação no Render e Cloudflare Pages em `docs/cloudflare-render-deployment.md`.

---

## 💬 Etapa 4: Interação Social & Chat em Tempo Real (Planejado)
- [ ] Chat de texto em tempo real via DataChannels do LiveKit.
- [ ] Reações flutuantes na tela (emojis animados).
- [ ] Indicador visual de fala e nível de volume (VU meter).
- [ ] Suporte a múltiplos apresentadores simultâneos (grade de telas).
