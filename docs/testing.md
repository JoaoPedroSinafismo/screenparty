# Roteiro de Testes e Checklist de Aceitação - Etapa 2 (V0.2)

Este documento descreve os cenários de teste manuais e o checklist de aceitação para validação da **V0.2** do ScreenParty.

---

## 1. Checklist de Aceitação da Etapa 2 (V0.2)

| Item | Critério de Aceitação | Status |
| :---: | :--- | :---: |
| **01** | Seletor de qualidade com 720p, 1080p e 1440p disponível no painel de controles | ✅ Implementado |
| **02** | Seletor de taxa de quadros com 30 FPS e 60 FPS disponível | ✅ Implementado |
| **03** | Preferências usadas como `ideal/max` sem quebrar chamadas `getDisplayMedia` | ✅ Validado |
| **04** | Medições reais de `videoTrack.getSettings()` diferenciadas de qualidade desejada | ✅ Validado |
| **05** | Mudança dinâmica de resolução/FPS via `applyConstraints` sem reiniciar a sala | ✅ Validado |
| **06** | Controle de volume individual (0 a 100%) no player do espectador | ✅ Implementado |
| **07** | Botão de silenciar/desmutar (Mute/Unmute) no player do espectador | ✅ Implementado |
| **08** | Botão de alternar ajuste à tela ("Ajustar" `contain` vs "Preencher" `cover`) | ✅ Implementado |
| **09** | Botão de tela cheia funcional com saída via tecla `Esc` ou botão | ✅ Implementado |
| **10** | Ocultação automática de controles do player após 3.5s sem movimento do mouse | ✅ Implementado |
| **11** | Indicador dinâmico de status: Conectado (verde), Reconectando (amarelo), Desconectado (vermelho) | ✅ Implementado |
| **12** | Contagem em tempo real de participantes conectados na sala | ✅ Implementado |
| **13** | Botão de copiar link de convite com confirmação visual imediata | ✅ Implementado |
| **14** | Instância Room única com sequenciador assíncrono (sem ciclo repetido de reconexão) | ✅ Validado |

---

## 2. Cenários de Teste Passo a Passo

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
