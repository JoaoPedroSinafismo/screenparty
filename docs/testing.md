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
| **05** | Emissão de tokens protegida: sala protegida exige senha/chave (HTTP 401); sala pública conecta diretamente | ✅ Testado via suite (13 testes) |
| **06** | Registro de salas (`POST /api/room/create`) com suporte a salas públicas e protegidas | ✅ Testado via suite |
| **07** | Link copiado em *"Convidar Amigos"* contém a chave de convite oficial (`?key=...`) | ✅ Validado |
| **08** | URL do LiveKit Cloud normalizada garantindo `wss://` em produção | ✅ Validado |
| **09** | Backend recusa inicialização se credenciais forem padrão (`devkey`/`secret`) com `NODE_ENV=production` | ✅ Validado |
| **10** | Sem fallback silencioso para `localhost` na build de produção do frontend (`VITE_API_URL` obrigatório) | ✅ Validado |
| **11** | Tratamento de cold-start do Render e erros de CORS com avisos legíveis em português | ✅ Validado |
| **12** | Seletor de qualidade (720p, 1080p, 1440p) e FPS (30/60) preservados e operacionais | ✅ Validado |
| **13** | Controle individual de volume e botão mute do espectador preservados | ✅ Validado |
| **14** | Ajuste de proporção (contain/cover) e tela cheia preservados | ✅ Validado |
| **15** | Estabilidade de conexão com LiveKit sem loops de reconexão preservada | ✅ Validado |
| **16** | Resiliência stateless a reinícios do Render gratuito via chaves HMAC assinadas | ✅ Testado via suite |
| **17** | Proteção contra sobrescrita indevida de salas ativas (409 Conflict) | ✅ Testado via suite |

---

## 2. Cenários de Teste do Sistema de Autenticação de Salas

### Cenário A: Sala criada sem senha (Pública)
1. Crie uma sala sem preencher o campo de senha.
2. Acesse a sala pelo código em outra aba.
3. **Resultado Esperado**: O participante conecta imediatamente, sem exibição de formulário de senha.

### Cenário B: Sala criada com senha (Protegida)
1. Crie uma sala com uma senha definida.
2. Acesse a sala sem o link de convite oficial.
3. **Resultado Esperado**: O backend retorna HTTP 401 (`requiresAuth: true`, `code: AUTH_REQUIRED`) e o frontend exibe o formulário de senha.
4. Digite a senha correta: a sala autoriza e conecta com sucesso.

### Cenário C: Senha incorreta
1. Em uma sala protegida, digite uma senha errada no formulário.
2. **Resultado Esperado**: O backend retorna HTTP 401 (`code: INVALID_CREDENTIALS`). O frontend mantém o formulário aberto e exibe mensagem em destaque: *"Senha de acesso incorreta."*.

### Cenário D: Sala inexistente ou expirada
1. Tente acessar diretamente um código de sala que não existe (ex: `/room/sp-sala-fantasma-999`).
2. **Resultado Esperado**: O backend retorna HTTP 404 (`code: ROOM_NOT_FOUND`, `requiresAuth: false`). O frontend exibe a tela de erro *"Sala não encontrada ou expirada"* com opções de voltar ao início ou tentar novamente, sem exibir formulário de senha.

### Cenário E: Falha no backend ou conexão offline
1. Com o backend temporariamente inativo ou offline, acesse qualquer sala.
2. **Resultado Esperado**: O frontend exibe mensagem explicativa de conectividade / cold-start do Render, sem exibir formulário de senha.

### Cenário F: Acesso via Link de Convite Oficial (`?key=...`)
1. Compartilhe o link gerado com chave HMAC.
2. O convidado clica no link.
3. **Resultado Esperado**: O participante é admitido imediatamente, mesmo que a sala tenha senha ou o Render tenha reiniciado a memória.

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
