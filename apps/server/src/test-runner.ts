import http from 'http';
import express from 'express';
import cors from 'cors';
import { tokenRouter } from './routes/tokenRoutes.js';
import { config } from './config/index.js';
import { TokenVerifier } from 'livekit-server-sdk';

async function runBackendValidation() {
  console.log('--- INICIANDO TESTE DO BACKEND SCREENPARTY (V0.3) ---');

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

    // 2. Teste de Validação de Parâmetros com Payload Inválido
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

    // 3. Teste de Criação de Sala e Obtenção de Chave de Convite
    console.log('[TESTE 3] Registrando nova sala com senha protegida...');
    const createRoomRes = await fetch(`http://localhost:${TEST_PORT}/api/room/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roomName: 'sp-sala-protegida',
        passcode: 'segredo123',
      }),
    });
    const createRoomData = (await createRoomRes.json()) as {
      roomName: string;
      inviteKey: string;
      hasPasscode: boolean;
    };
    if (createRoomRes.status !== 200 || !createRoomData.inviteKey) {
      throw new Error(`Falha ao registrar sala: ${JSON.stringify(createRoomData)}`);
    }
    console.log(`✅ [TESTE 3] Sala registrada com sucesso. Chave de convite gerada: ${createRoomData.inviteKey}`);

    // 4. Teste de Segurança: Tentativa de Acesso SEM autorização deve retornar 401
    console.log('[TESTE 4] Verificando proteção de acesso sem senha/chave (deve retornar 401)...');
    const unauthorizedRes = await fetch(`http://localhost:${TEST_PORT}/api/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roomName: 'sp-sala-protegida',
        identity: 'user_invader',
        name: 'Invasor',
        // passcode ausente propositalmente
      }),
    });
    const unauthorizedData = (await unauthorizedRes.json()) as { error?: string; requiresAuth?: boolean };
    if (unauthorizedRes.status !== 401 || !unauthorizedData.requiresAuth) {
      throw new Error(`Esperado status 401 para acesso não autorizado, obtido ${unauthorizedRes.status}`);
    }
    console.log(`✅ [TESTE 4] Acesso não autorizado bloqueado com 401: "${unauthorizedData.error}"`);

    // 5. Teste de Segurança: Tentativa com senha incorreta deve retornar 401
    console.log('[TESTE 5] Verificando tentativa com senha incorreta (deve retornar 401)...');
    const wrongPassRes = await fetch(`http://localhost:${TEST_PORT}/api/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roomName: 'sp-sala-protegida',
        identity: 'user_tester_wrong',
        name: 'Carlos',
        passcode: 'senha_errada_999',
      }),
    });
    if (wrongPassRes.status !== 401) {
      throw new Error(`Esperado status 401 para senha incorreta, obtido ${wrongPassRes.status}`);
    }
    console.log('✅ [TESTE 5] Tentativa com senha incorreta devidamente rejeitada com 401.');

    // 6. Teste de Acesso Autorizado com a Chave de Convite
    console.log('[TESTE 6] Solicitando emissão de token com chave de convite válida...');
    const validRes = await fetch(`http://localhost:${TEST_PORT}/api/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roomName: 'sp-sala-protegida',
        identity: 'user_tester_01',
        name: 'Carlos Tester',
        passcode: createRoomData.inviteKey,
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
    console.log('✅ [TESTE 6] Token emitido com sucesso para participante autorizado.');
    console.log(`   - Sala: ${validData.roomName}`);
    console.log(`   - Identidade: ${validData.identity}`);
    console.log(`   - Protocolo LiveKit: ${validData.serverUrl.startsWith('ws') ? 'OK (WebSocket)' : 'ERRO'}`);

    // 7. Verificação Criptográfica do Token JWT e Permissões
    console.log('[TESTE 7] Verificando assinatura do token e permissões mínimas...');
    const verifier = new TokenVerifier(config.livekitApiKey, config.livekitApiSecret);
    const claims = await verifier.verify(validData.token);

    if (claims.video?.room !== 'sp-sala-protegida') {
      throw new Error(`Token associado à sala incorreta: ${claims.video?.room}`);
    }
    if (!claims.video?.roomJoin || !claims.video?.canPublish || !claims.video?.canSubscribe) {
      throw new Error(`Permissões incorretas no token: ${JSON.stringify(claims.video)}`);
    }
    console.log('✅ [TESTE 7] Token validado criptograficamente com sucesso!');

    console.log('\n🎉 TODOS OS TESTES DO BACKEND (V0.3) FORAM CONCLUÍDOS COM SUCESSO!');
  } finally {
    server.close();
    console.log('[TESTE] Servidor de teste temporário encerrado.');
  }
}

runBackendValidation().catch((err) => {
  console.error('❌ Falha nos testes do backend:', err);
  process.exit(1);
});
