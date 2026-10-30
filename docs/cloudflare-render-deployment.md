# Guia de Publicação em Produção: Cloudflare Pages & Render

Este documento descreve o passo a passo exato para publicar o **ScreenParty (V0.3)** em produção utilizando o **Cloudflare Pages** para o frontend SPA e o **Render** para a API Node.js/Express, integrados ao **LiveKit Cloud**.

---

## 1. Visão Geral da Arquitetura em Produção

```text
+------------------------------------------+
|          Cloudflare Pages (SPA)          |
|  - Domínio: https://screenparty.pages.dev|
|  - Roteamento SPA com _redirects         |
|  - Conecta com HTTPS ao Render           |
+--------------------+---------------------+
                     |
                     | Requisições HTTP REST (/api/room/create, /api/token)
                     v
+------------------------------------------+
|            Render Web Service            |
|  - Domínio: https://sua-api.onrender.com |
|  - Emissão de Tokens JWT seguros         |
|  - Validação de autorização das salas    |
+--------------------+---------------------+
                     |
                     | Retorna credenciais efêmeras com wss://
                     v
+------------------------------------------+
|              LiveKit Cloud               |
|  - WebSocket seguro: wss://*.livekit.cloud|
|  - Tráfego WebRTC P2P/SFU de baixa       |
|    latência para tela e áudio            |
+------------------------------------------+
```

---

## 2. Configuração do Backend no Render

O backend Node.js já foi publicado no Render. Para garantir a segurança de produção e evitar que a aplicação falhe na inicialização:

### Variáveis de Ambiente no Painel do Render (*Environment Variables*):
Acesse seu serviço no Render -> **Environment** e configure:

| Variável | Valor Recomendado | Descrição |
| :--- | :--- | :--- |
| `NODE_ENV` | `production` | Ativa o modo de produção e as validações estritas de segurança. |
| `CORS_ORIGIN` | `https://screenparty.pages.dev` | URL do seu frontend no Cloudflare Pages. Caso tenha múltiplos domínios, separe por vírgula. Subdomínios `*.pages.dev` são aceitos. |
| `LIVEKIT_URL` | `wss://seu-projeto.livekit.cloud` | URL WebSocket segura do LiveKit Cloud (deve começar com `wss://`). |
| `LIVEKIT_API_KEY` | *(Sua chave LiveKit Cloud)* | **Obrigatória**. Valores de teste (`devkey`) são bloqueados em produção. |
| `LIVEKIT_API_SECRET` | *(Seu segredo LiveKit Cloud)* | **Obrigatório e sigiloso**. Nunca exponha no frontend. |
| `TOKEN_TTL_SECONDS` | `21600` | Duração de 6 horas para tokens das salas. |

> [!IMPORTANT]
> **Camada Gratuita do Render (Cold Start)**: Se o serviço ficar inativo por mais de 15 minutos, a instância entra em modo de hibernação (*sleep*). A primeira requisição para o backend pode demorar cerca de 45 a 50 segundos para despertar. O frontend do ScreenParty já trata essa latência informando o usuário de forma amigável.

---

## 3. Configuração do Frontend no Cloudflare Pages

O repositório é um monorepo configurado com npm workspaces. Siga as instruções abaixo no painel da Cloudflare:

### 3.1. Criar o Projeto no Cloudflare Pages
1. Acesse o **Cloudflare Dashboard** -> **Workers & Pages** -> **Create application** -> Aba **Pages** -> **Connect to Git**.
2. Selecione o repositório `JoaoPedroSinafismo/screenparty`.
3. Na tela de configuração de build (*Set up builds and deployments*):

| Campo de Configuração | Valor a Preencher |
| :--- | :--- |
| **Project name** | `screenparty` (ou o nome desejado) |
| **Production branch** | `main` |
| **Framework preset** | `None` ou `Vite` |
| **Root directory** | `/` *(deixe a raiz do repositório)* |
| **Build command** | `npm run build:web` |
| **Build output directory** | `apps/web/dist` |

### 3.2. Variáveis de Ambiente no Cloudflare Pages
Na mesma tela (ou em **Settings** -> **Environment variables** do projeto):

| Variável | Valor Obrigatório | Observação |
| :--- | :--- | :--- |
| `VITE_API_URL` | `https://sua-api.onrender.com/api` | **Atenção**: Deve terminar estritamente com `/api`. |

> [!WARNING]
> Na build de produção do ScreenParty, **não há fallback silencioso para localhost**. Se a variável `VITE_API_URL` não for preenchida no Cloudflare Pages, a aplicação exibirá um alerta em português instruindo a configuração da variável.

### 3.3. Roteamento SPA e Atualização de Página (F5)
O projeto inclui o arquivo `apps/web/public/_redirects` com a regra:
```text
/* /index.html 200
```
Isso garante que ao recarregar ou abrir links diretos como `/room/sp-xxxx-xxxx?key=...`, o Cloudflare Pages entregue o `index.html` com código HTTP 200, permitindo ao React Router gerenciar a rota sem páginas 404 de erro.

---

## 4. Segurança das Salas e Chaves de Convite

Na **V0.3**, nenhuma sala é pública ou acessível apenas por adivinhar seu código:
- Ao criar uma nova sala na página inicial, o backend gera uma chave de convite criptográfica determinística (`inviteKey` baseada em HMAC SHA-256).
- O anfitrião também pode definir uma senha personalizada opcional.
- O botão **Convidar Amigos** no painel da sala copia o link completo contendo a chave de autorização:
  `https://screenparty.pages.dev/room/sp-xxxx-xxxx?key=abc12345`
- Convidados que entrarem com esse link são autorizados e conectados diretamente.
- Qualquer pessoa que tentar invadir uma sala pelo nome sem a chave ou senha receberá **HTTP 401 Unauthorized**.

---

## 5. Checklist de Verificação Pós-Deploy

- [ ] Acesse `https://sua-api.onrender.com/health` no navegador e verifique a resposta `{"status":"ok"}`.
- [ ] Acesse a URL do Cloudflare Pages (ex: `https://screenparty.pages.dev`).
- [ ] Crie uma sala com seu apelido.
- [ ] Verifique se o cabeçalho exibe *"Conectado"* com o ponto verde em tempo real.
- [ ] Clique em *"Convidar Amigos"* e abra o link em uma janela anônima para testar a entrada de espectadores.
- [ ] Inicie a transmissão de tela com áudio e teste o controle de volume do espectador.
