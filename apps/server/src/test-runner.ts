import http from 'http';
import express from 'express';
import cors from 'cors';
import { tokenRouter } from './routes/tokenRoutes.js';
import { config } from './config/index.js';
import { TokenVerifier } from 'livekit-server-sdk';

async function runBackendValidation() {
  console.log('--- INICIANDO TESTE DO BACKEND SCREENPARTY ---');

  const app = express();
  app.use(express.json());
  app.use(cors());
  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok' });
  });
  app.get('/api/health', (_req, res) => {
    res.status(200).json({ status: 'ok', service: 'ScreenParty Token Server' });
  });
  app.use('/api', tokenRouter);

  const server = http.createServer(app);
  const TEST_PORT = 3099;

  await new Promise<void>((resolve) => server.listen(TEST_PORT, resolve));
  console.log(`[TESTE] Servidor de teste temporário iniciado na porta ${TEST_PORT}`);

  try {
    // 1. Teste de Health Check
    console.log('[TESTE 1] Verificando rota /health...');
    const healthDirectRes = await fetch(`http://localhost:${TEST_PORT}/health`);
    const healthDirectData = (await healthDirectRes.json()) as { status: string };
    if (healthDirectRes.status !== 200 || healthDirectData.status !== 'ok') {
      throw new Error(`Health check direto falhou: ${JSON.stringify(healthDirectData)}`);
    }
    console.log('✅ [TESTE 1] /health respondeu 200 OK com {"status":"ok"}.');

    console.log('[TESTE 1.1] Verificando rota /api/health...');
    const healthRes = await fetch(`http://localhost:${TEST_PORT}/api/health`);
    const healthData = (await healthRes.json()) as { status: string; service: string };
    if (healthRes.status !== 200 || healthData.status !== 'ok') {
      throw new Error(`Health check estendido falhou: ${JSON.stringify(healthData)}`);
    }
    console.log('✅ [TESTE 1.1] /api/health respondeu 200 OK com sucesso.');

    // 2. Teste de Validação de Erro (código de sala curto demais)
    console.log('[TESTE 2] Verificando validação de parâmetros com payload inválido...');
    const invalidRes = await fetch(`http://localhost:${TEST_PORT}/api/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomName: 'ab', identity: 'u' }), // muito curto
    });
    const invalidData = (await invalidRes.json()) as { error?: string };
    if (invalidRes.status !== 400) {
      throw new Error(`Esperado status 400, recebido ${invalidRes.status}`);
    }
    console.log(`✅ [TESTE 2] Validação rejeitou payload inválido com 400: "${invalidData.error}"`);

    // 3. Teste de Emissão de Token Válido
    console.log('[TESTE 3] Solicitando emissão de token LiveKit para sala válida...');
    const validRes = await fetch(`http://localhost:${TEST_PORT}/api/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roomName: 'sp-teste-sala1',
        identity: 'user_tester_01',
        name: 'Carlos Tester',
      }),
    });

    const validData = (await validRes.json()) as {
      token: string;
      serverUrl: string;
      roomName: string;
      identity: string;
      expiresInSeconds: number;
    };
    if (validRes.status !== 200 || !validData.token) {
      throw new Error(`Falha na emissão de token: ${JSON.stringify(validData)}`);
    }
    console.log('✅ [TESTE 3] Token gerado com sucesso pelo endpoint /api/token.');
    console.log(`   - Sala: ${validData.roomName}`);
    console.log(`   - Identidade: ${validData.identity}`);
    console.log(`   - Expiração: ${validData.expiresInSeconds}s`);
    console.log(`   - Server URL: ${validData.serverUrl}`);

    // 4. Verificação Criptográfica do Token JWT e Permissões
    console.log('[TESTE 4] Verificando assinatura do token e permissões mínimas...');
    const verifier = new TokenVerifier(config.livekitApiKey, config.livekitApiSecret);
    const claims = await verifier.verify(validData.token);

    if (claims.video?.room !== 'sp-teste-sala1') {
      throw new Error(`Token associado à sala incorreta: ${claims.video?.room}`);
    }
    if (!claims.video?.roomJoin || !claims.video?.canPublish || !claims.video?.canSubscribe) {
      throw new Error(`Permissões incorretas no token: ${JSON.stringify(claims.video)}`);
    }
    console.log('✅ [TESTE 4] Token validado criptograficamente com sucesso!');
    console.log(`   - Permissões concedidas: roomJoin=${claims.video.roomJoin}, canPublish=${claims.video.canPublish}, canSubscribe=${claims.video.canSubscribe}`);

    console.log('\n🎉 TODOS OS TESTES DO BACKEND FORAM CONCLUÍDOS COM SUCESSO!');
  } finally {
    server.close();
    console.log('[TESTE] Servidor de teste temporário encerrado.');
  }
}

runBackendValidation().catch((err) => {
  console.error('❌ Falha nos testes do backend:', err);
  process.exit(1);
});
