import http from 'http';
import express from 'express';
import cors from 'cors';
import { tokenRouter } from './routes/tokenRoutes.js';
import { config } from './config/index.js';
import { TokenVerifier } from 'livekit-server-sdk';
import { generateRoomInviteKey } from './services/roomAuthService.js';

async function runBackendValidation() {
  console.log('--- INICIANDO TESTE COMPLETO DE AUTENTICAÇÃO DO SCREENPARTY (V0.3) ---');

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

    // 3. Teste: Registro de sala pública (sem senha)
    console.log('[TESTE 3] Registrando sala pública (sem senha)...');
    const pubRoomRes = await fetch(`http://localhost:${TEST_PORT}/api/room/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roomName: 'sp-sala-publica',
      }),
    });
    const pubRoomData = (await pubRoomRes.json()) as { roomName: string; inviteKey: string; hasPasscode: boolean };
    if (pubRoomRes.status !== 200 || pubRoomData.hasPasscode !== false) {
      throw new Error(`Falha ao registrar sala pública: ${JSON.stringify(pubRoomData)}`);
    }
    console.log('✅ [TESTE 3] Sala pública criada com sucesso (hasPasscode: false).');

    // 4. Teste: Acesso à sala pública sem senha (DEVE PERMITIR SEM SOLICITAR SENHA)
    console.log('[TESTE 4] Verificando acesso a sala pública sem senha (deve retornar 200 OK sem solicitar senha)...');
    const pubTokenRes = await fetch(`http://localhost:${TEST_PORT}/api/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roomName: 'sp-sala-publica',
        identity: 'user_amigo_01',
        name: 'Amigo Visitante',
        // sem passcode
      }),
    });
    const pubTokenData = (await pubTokenRes.json()) as { token?: string; error?: string };
    if (pubTokenRes.status !== 200 || !pubTokenData.token) {
      throw new Error(`Sala pública rejeitou acesso indevidamente: status ${pubTokenRes.status}, ${JSON.stringify(pubTokenData)}`);
    }
    console.log('✅ [TESTE 4] Sala pública permitiu acesso imediato sem solicitar senha (HTTP 200).');

    // 5. Teste: Registro de sala protegida com senha
    console.log('[TESTE 5] Registrando sala protegida com senha...');
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
    if (createRoomRes.status !== 200 || !createRoomData.inviteKey || createRoomData.hasPasscode !== true) {
      throw new Error(`Falha ao registrar sala protegida: ${JSON.stringify(createRoomData)}`);
    }
    console.log(`✅ [TESTE 5] Sala protegida registrada com sucesso. Chave de convite gerada: ${createRoomData.inviteKey}`);

    // 6. Teste: Tentativa de acesso à sala protegida SEM senha nem chave (deve retornar 401 com requiresAuth: true)
    console.log('[TESTE 6] Tentativa de acesso à sala protegida sem senha (deve retornar 401 e requiresAuth: true)...');
    const unauthRes = await fetch(`http://localhost:${TEST_PORT}/api/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roomName: 'sp-sala-protegida',
        identity: 'user_visitante',
        name: 'Visitante',
      }),
    });
    const unauthData = (await unauthRes.json()) as { error?: string; requiresAuth?: boolean; code?: string };
    if (unauthRes.status !== 401 || unauthData.requiresAuth !== true || unauthData.code !== 'AUTH_REQUIRED') {
      throw new Error(`Esperado status 401 e requiresAuth: true, recebido status ${unauthRes.status}, data: ${JSON.stringify(unauthData)}`);
    }
    console.log(`✅ [TESTE 6] Sala protegida exigiu autenticação corretamente (HTTP 401, code: ${unauthData.code}).`);

    // 7. Teste: Tentativa de acesso com senha incorreta (deve retornar 401 com INVALID_CREDENTIALS)
    console.log('[TESTE 7] Tentativa com senha incorreta (deve retornar 401 com INVALID_CREDENTIALS)...');
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
    const wrongPassData = (await wrongPassRes.json()) as { error?: string; requiresAuth?: boolean; code?: string };
    if (wrongPassRes.status !== 401 || wrongPassData.requiresAuth !== true || wrongPassData.code !== 'INVALID_CREDENTIALS') {
      throw new Error(`Esperado status 401 com INVALID_CREDENTIALS, obtido status ${wrongPassRes.status}, data: ${JSON.stringify(wrongPassData)}`);
    }
    console.log(`✅ [TESTE 7] Senha incorreta devidamente rejeitada com 401 (${wrongPassData.error}).`);

    // 8. Teste: Acesso com a senha correta (deve retornar 200)
    console.log('[TESTE 8] Acesso com senha correta (deve retornar 200 OK)...');
    const correctPassRes = await fetch(`http://localhost:${TEST_PORT}/api/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roomName: 'sp-sala-protegida',
        identity: 'user_tester_pass',
        name: 'Carlos Autenticado',
        passcode: 'segredo123',
      }),
    });
    const correctPassData = (await correctPassRes.json()) as { token?: string };
    if (correctPassRes.status !== 200 || !correctPassData.token) {
      throw new Error(`Falha no acesso com senha correta: status ${correctPassRes.status}`);
    }
    console.log('✅ [TESTE 8] Acesso com senha correta aprovado com sucesso (HTTP 200).');

    // 9. Teste: Acesso com chave de convite oficial (deve retornar 200)
    console.log('[TESTE 9] Acesso à sala protegida via chave de convite oficial (?key=...)...');
    const inviteKeyRes = await fetch(`http://localhost:${TEST_PORT}/api/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roomName: 'sp-sala-protegida',
        identity: 'user_amigo_convidado',
        name: 'Amigo Convidado',
        passcode: createRoomData.inviteKey,
      }),
    });
    const inviteKeyData = (await inviteKeyRes.json()) as { token?: string };
    if (inviteKeyRes.status !== 200 || !inviteKeyData.token) {
      throw new Error(`Falha no acesso via chave de convite: status ${inviteKeyRes.status}`);
    }
    console.log('✅ [TESTE 9] Acesso via chave de convite oficial autorizado com sucesso (HTTP 200).');

    // 10. Teste: Sala inexistente (DEVE RETORNAR 404 E requiresAuth: false)
    console.log('[TESTE 10] Acesso a sala inexistente (deve retornar 404 e requiresAuth: false)...');
    const notFoundRes = await fetch(`http://localhost:${TEST_PORT}/api/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roomName: 'sp-sala-inexistente-12345',
        identity: 'user_curioso',
        name: 'Curioso',
      }),
    });
    const notFoundData = (await notFoundRes.json()) as { error?: string; requiresAuth?: boolean; code?: string };
    if (notFoundRes.status !== 404 || notFoundData.requiresAuth !== false || notFoundData.code !== 'ROOM_NOT_FOUND') {
      throw new Error(`Esperado status 404 com requiresAuth: false, recebido status ${notFoundRes.status}, data: ${JSON.stringify(notFoundData)}`);
    }
    console.log(`✅ [TESTE 10] Sala inexistente tratada com 404 e requiresAuth: false: "${notFoundData.error}".`);

    // 11. Teste de Segurança: Tentativa de sobrescrever sala protegida com configurações diferentes (deve retornar 409 Conflict)
    console.log('[TESTE 11] Verificando proteção contra sobrescrita de configurações da sala (409 Conflict)...');
    const overwriteRes = await fetch(`http://localhost:${TEST_PORT}/api/room/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roomName: 'sp-sala-protegida',
        passcode: 'nova_senha_hacker',
      }),
    });
    const overwriteData = (await overwriteRes.json()) as { error?: string; code?: string };
    if (overwriteRes.status !== 409 || overwriteData.code !== 'ROOM_CONFLICT') {
      throw new Error(`Esperado status 409 ROOM_CONFLICT para tentativa de sobrescrita, recebido ${overwriteRes.status}`);
    }
    console.log(`✅ [TESTE 11] Sobrescrita de configurações de sala bloqueada com 409 Conflict: "${overwriteData.error}".`);

    // 12. Teste de Resiliência: Verificação de chave de convite HMAC após reinício de memória (Render stateless)
    console.log('[TESTE 12] Acesso com chave de convite oficial para sala sem registro prévio na memória (resiliência Render)...');
    const coldRoomName = 'sp-sala-render-reiniciado';
    const statelessInviteKey = generateRoomInviteKey(coldRoomName);
    const coldAccessRes = await fetch(`http://localhost:${TEST_PORT}/api/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roomName: coldRoomName,
        identity: 'user_retornando',
        name: 'Amigo do Link',
        passcode: statelessInviteKey,
      }),
    });
    const coldAccessData = (await coldAccessRes.json()) as { token?: string };
    if (coldAccessRes.status !== 200 || !coldAccessData.token) {
      throw new Error(`Falha na autorização stateless via HMAC: status ${coldAccessRes.status}`);
    }
    console.log('✅ [TESTE 12] Chave de convite HMAC oficial autorizou acesso com resiliência a reinício em memória.');

    // 13. Verificação Criptográfica do Token JWT e Permissões
    console.log('[TESTE 13] Verificando assinatura do token e permissões mínimas...');
    const verifier = new TokenVerifier(config.livekitApiKey, config.livekitApiSecret);
    const claims = await verifier.verify(pubTokenData.token!);

    if (claims.video?.room !== 'sp-sala-publica') {
      throw new Error(`Token associado à sala incorreta: ${claims.video?.room}`);
    }
    if (!claims.video?.roomJoin || !claims.video?.canPublish || !claims.video?.canSubscribe) {
      throw new Error(`Permissões incorretas no token: ${JSON.stringify(claims.video)}`);
    }
    console.log('✅ [TESTE 13] Token validado criptograficamente com sucesso!');

    console.log('\n🎉 TODOS OS 13 TESTES DE AUTENTICAÇÃO E SEGURANÇA FORAM CONCLUÍDOS COM SUCESSO!');
  } finally {
    server.close();
    console.log('[TESTE] Servidor de teste temporário encerrado.');
  }
}

runBackendValidation().catch((err) => {
  console.error('❌ Falha nos testes do backend:', err);
  process.exit(1);
});
