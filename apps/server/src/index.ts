import express from 'express';
import cors from 'cors';
import { config } from './config/index.js';
import { tokenRouter } from './routes/tokenRoutes.js';

const app = express();

// Proteção contra payloads excessivos
app.use(express.json({ limit: '100kb' }));

// Configuração de CORS para permitir requisições do frontend local
app.use(
  cors({
    origin: (origin, callback) => {
      // Permite requisições sem origin (como curl/Postman locais) ou vindas do frontend configurado
      if (!origin || origin === config.corsOrigin || origin.startsWith('http://localhost:')) {
        callback(null, true);
      } else {
        callback(new Error('Origem não permitida pela política de CORS.'));
      }
    },
    credentials: true,
  })
);

// Rota de verificação direta solicitada
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Rota de verificação de integridade estendida
app.get('/api/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'ScreenParty Token Server',
    version: '0.1.0',
    livekitUrl: config.livekitUrl,
    timestamp: new Date().toISOString(),
  });
});

// Rotas de geração de token
app.use('/api', tokenRouter);

app.listen(config.port, () => {
  console.log(`[ScreenParty Server] Rodando na porta http://localhost:${config.port}`);
  console.log(`[ScreenParty Server] Apontando para LiveKit em ${config.livekitUrl}`);
  console.log(`[ScreenParty Server] CORS autorizado para: ${config.corsOrigin}`);
});

