import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { config } from './config/index.js';
import { tokenRouter } from './routes/tokenRoutes.js';

const app = express();

// Proteção contra payloads excessivos
app.use(express.json({ limit: '100kb' }));

// Lista de origens autorizadas configuradas
const allowedOriginsList = config.corsOrigin
  .split(',')
  .map((o) => o.trim())
  .filter((o) => o.length > 0);

// Configuração robusta de CORS para produção (Cloudflare Pages) e desenvolvimento
app.use(
  cors({
    origin: (origin, callback) => {
      // 1. Permite requisições sem origin (como testes internos curl, monitoramento Render, etc.)
      if (!origin) {
        return callback(null, true);
      }

      // 2. Permite origens explicitamente listadas no CORS_ORIGIN
      if (allowedOriginsList.includes(origin) || allowedOriginsList.includes('*')) {
        return callback(null, true);
      }

      // 3. Permite qualquer subdomínio oficial do Cloudflare Pages (*.pages.dev)
      if (/^https:\/\/[a-zA-Z0-9-]+\.pages\.dev$/.test(origin)) {
        return callback(null, true);
      }

      // 4. Em desenvolvimento, permite origens localhost
      if (!config.isProduction && origin.startsWith('http://localhost:')) {
        return callback(null, true);
      }

      callback(new Error(`Origem "${origin}" não autorizada pela política de CORS do ScreenParty.`));
    },
    credentials: true,
  })
);

// Rota de verificação direta solicitada (Render Health Checks)
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Rota de verificação de integridade estendida
app.get('/api/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'ScreenParty Token Server',
    version: '0.3.0',
    environment: config.isProduction ? 'production' : 'development',
    livekitUrl: config.livekitUrl,
    timestamp: new Date().toISOString(),
  });
});

// Rotas de geração de token e salas
app.use('/api', tokenRouter);

// Middleware centralizado de tratamento de erro (incluindo bloqueios de CORS limpos em JSON)
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const message = err instanceof Error ? err.message : 'Erro interno do servidor';
  console.warn(`[CORS / Requisição bloqueada]: ${message}`);
  res.status(403).json({ error: message });
});

app.listen(config.port, () => {
  console.log(`[ScreenParty Server] Rodando na porta http://localhost:${config.port}`);
  console.log(`[ScreenParty Server] Ambiente: ${config.isProduction ? 'PRODUÇÃO' : 'DESENVOLVIMENTO'}`);
  console.log(`[ScreenParty Server] Apontando para LiveKit em ${config.livekitUrl}`);
  console.log(`[ScreenParty Server] CORS autorizado para: ${allowedOriginsList.join(', ')} (e *.pages.dev)`);
});
