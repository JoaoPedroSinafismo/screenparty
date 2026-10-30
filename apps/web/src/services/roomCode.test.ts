import { generateHighEntropyRoomCode, sanitizeRoomCode } from './roomCode.js';

console.log('--- INICIANDO TESTE DO GERADOR DE CÓDIGOS DE SALA (FRONTEND) ---');

// Teste de sanitização
const dirty = '  SP-Room_123!@#$  ';
const clean = sanitizeRoomCode(dirty);
if (clean !== 'sp-room_123') {
  throw new Error(`Sanitização incorreta: esperado 'sp-room_123', obtido '${clean}'`);
}
console.log(`✅ [TESTE 1] Sanitização de código validada: "${dirty}" -> "${clean}"`);

// Teste de geração e unicidade (entropia)
const generatedCodes = new Set<string>();
const SAMPLES = 1000;

for (let i = 0; i < SAMPLES; i++) {
  const code = generateHighEntropyRoomCode();
  if (!code.startsWith('sp-') || code.length !== 12) {
    throw new Error(`Código em formato inválido: ${code}`);
  }
  if (generatedCodes.has(code)) {
    throw new Error(`Colisão detectada na amostra de ${SAMPLES}! Código duplicado: ${code}`);
  }
  generatedCodes.add(code);
}

console.log(`✅ [TESTE 2] Gerados ${SAMPLES} códigos sem nenhuma colisão.`);
console.log(`   - Amostra: ${Array.from(generatedCodes).slice(0, 3).join(', ')}`);
console.log('🎉 TESTES DO UTILITÁRIO DE SALAS FINALIZADOS COM SUCESSO!\n');

