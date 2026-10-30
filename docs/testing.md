# Roteiro de Testes e Checklist de Aceitação - Etapa 3 (V0.3 Online)

Este documento descreve os cenários de teste manuais e o checklist de aceitação para validação da **V0.3** do ScreenParty.

---

## 1. Checklist de Aceitação da Etapa 3 (V0.3 Online)

| Item | Critério de Aceitação | Status |
| :---: | :--- | :---: |
| **01** | Frontend preparado para Cloudflare Pages com build a partir da raiz (`npm run build:web`) | ✅ Validado |
| **02** | Diretório de saída configurado exatamente como `apps/web/dist` | ✅ Validado |
| **03** | Arquivo `_redirects` com `/* /index.html 200` presente no diretório `dist` | ✅ Validado |
| **04** | Acesso direto ou recarga (F5) em `/room/:roomId` sem erro 404 | ✅ Validado |
| **05** | Emissão de tokens protegida: tentativa sem chave ou senha bloqueada com HTTP 401 | ✅ Testado via suite |
| **06** | Registro de salas (`POST /api/room/create`) com geração de chave HMAC determinística | ✅ Testado via suite |
| **07** | Link copiado em *"Convidar Amigos"* contém a chave de convite oficial (`?key=...`) | ✅ Validado |
| **08** | URL do LiveKit Cloud normalizada garantindo `wss://` em produção | ✅ Validado |
| **09** | Backend recusa inicialização se credenciais forem padrão (`devkey`/`secret`) com `NODE_ENV=production` | ✅ Validado |
| **10** | Sem fallback silencioso para `localhost` na build de produção do frontend (`VITE_API_URL` obrigatório) | ✅ Validado |
| **11** | Tratamento de cold-start do Render e erros de CORS com avisos legíveis em português | ✅ Validado |
| **12** | Seletor de qualidade (720p, 1080p, 1440p) e FPS (30/60) preservados e operacionais | ✅ Validado |
| **13** | Controle individual de volume e botão mute do espectador preservados | ✅ Validado |
| **14** | Ajuste de proporção (contain/cover) e tela cheia preservados | ✅ Validado |
| **15** | Estabilidade de conexão com LiveKit sem loops de reconexão preservada | ✅ Validado |

---

## 2. Checklist da V0.2 (Regressão de Recursos)

### Cenário 1: Seleção de Perfil de Qualidade e Medição Real
1. Na sala, abra o painel **Qualidade** nos controles inferiores.
2. Selecione a resolução desejada (ex: `1080p`) e a taxa de quadros (ex: `60 FPS`).
3. Clique em **Compartilhar Tela com Áudio** e selecione uma janela ou tela.
4. **Resultado Esperado**:
   - O painel exibe a medição efetiva real confirmada pelo navegador (ex: `1920x1080 @ 60 FPS`).
   - Se a tela capturada for de resolução diferente (ex: monitor 1366x768), o sistema exibe os dados reais sem inventar números fictícios.

---

### Cenário 2: Reconfiguração Dinâmica sem Queda de Transmissão
1. Durante uma transmissão ativa, abra o painel de configurações de qualidade.
2. Altere o perfil de `1080p` para `720p` ou a taxa de quadros de `60 FPS` para `30 FPS`.
3. **Resultado Esperado**:
   - A transmissão **NÃO cai**, o WebSocket permanece conectado e o player não reinicia.
   - O track recebe `applyConstraints` e a medição real efetiva é atualizada.

---

### Cenário 3: Controle de Volume e Silenciamento do Espectador
1. Abra a transmissão em uma segunda janela (espectador).
2. Na barra inferior do player, mova o slider de volume (ex: de 100% para 30%).
3. **Resultado Esperado**:
   - O som reproduzido para o espectador diminui suavemente.
   - A transmissão na janela do transmissor e nos outros participantes não é afetada.
4. Clique no ícone de alto-falante para mutar:
   - O ícone muda para mudo (`VolumeX`) e o som silencia.
   - Ao desmutar, o volume anterior é restaurado.

---

### Cenário 4: Modos de Ajuste de Proporção e Tela Cheia
1. No player com transmissão ativa, clique no botão **Preencher**:
   - A imagem se expande em `object-cover`.
2. Clique novamente em **Ajustar**:
   - A imagem volta a respeitar a proporção original em `object-contain`.
3. Clique no botão de **Tela Cheia** ou aperte tecla de tela cheia:
   - O player preenche todo o monitor.
   - Deixar o cursor parado por 3.5 segundos oculta suavemente as barras de controle.
   - Mover o mouse faz os controles reaparecerem instantaneamente.

---

### Cenário 5: Resiliência de Conexão e Saída
1. Clique no botão de copiar código da sala ou link de convite.
2. Observe o badge no cabeçalho: ele exibe o ponto verde pulsante com *"Conectado"* e a contagem real de participantes.
3. Clique em **Sair da Sala**:
   - Todas as faixas de tela e áudio são interrompidas (`track.stop()`).
   - A sala desconecta de forma ordenada e o usuário retorna à página inicial sem loops.
