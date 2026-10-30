import crypto from 'crypto';
import { config } from '../config/index.js';

interface RoomSecurityEntry {
  roomName: string;
  hasPasscode: boolean;
  passcodeHash?: string;
  createdAt: number;
}

// Armazenamento em memória para dados de salas com TTL de 24 horas
const roomSecurityStore = new Map<string, RoomSecurityEntry>();
const ROOM_TTL_MS = 24 * 60 * 60 * 1000;

// Limpeza periódica de salas expiradas a cada 1 hora
setInterval(() => {
  const now = Date.now();
  for (const [room, entry] of roomSecurityStore.entries()) {
    if (now - entry.createdAt > ROOM_TTL_MS) {
      roomSecurityStore.delete(room);
    }
  }
}, 60 * 60 * 1000).unref();

/**
 * Função utilitária para hash seguro de senhas com HMAC-SHA256
 */
function hashPasscode(passcode: string): string {
  return crypto
    .createHmac('sha256', config.livekitApiSecret)
    .update(`passcode:${passcode.trim()}`)
    .digest('hex');
}

/**
 * Gera uma chave de convite criptográfica determinística para a sala baseada no segredo do servidor.
 * Ninguém consegue adivinhar esta chave apenas sabendo o nome da sala.
 */
export function generateRoomInviteKey(roomName: string): string {
  return crypto
    .createHmac('sha256', config.livekitApiSecret)
    .update(`room-auth-v1:${roomName.toLowerCase().trim()}`)
    .digest('hex')
    .substring(0, 12);
}

export interface RegisterRoomResult {
  success: boolean;
  roomName: string;
  inviteKey: string;
  hasPasscode: boolean;
  conflict?: boolean;
  reason?: string;
}

/**
 * Registra uma nova sala com senha opcional e gera a chave de convite correspondente.
 * Impede que uma sala existente seja sobrescrita para alterar ou remover sua segurança.
 */
export function registerRoom(
  roomName: string,
  passcode?: string
): RegisterRoomResult {
  const cleanName = roomName.toLowerCase().trim();
  const inviteKey = generateRoomInviteKey(cleanName);
  const cleanPasscode = passcode && passcode.trim().length > 0 ? passcode.trim() : undefined;
  const newPasscodeHash = cleanPasscode ? hashPasscode(cleanPasscode) : undefined;
  const newHasPasscode = !!newPasscodeHash;

  const existing = roomSecurityStore.get(cleanName);

  if (existing && Date.now() - existing.createdAt <= ROOM_TTL_MS) {
    // A sala já existe e está ativa no sistema
    if (existing.hasPasscode) {
      // Se a sala existente possui senha:
      // Quem já conhece a senha pode obter novamente as credenciais da sala
      if (cleanPasscode && existing.passcodeHash === newPasscodeHash) {
        return {
          success: true,
          roomName: cleanName,
          inviteKey,
          hasPasscode: true,
        };
      }
      return {
        success: false,
        conflict: true,
        roomName: cleanName,
        inviteKey,
        hasPasscode: true,
        reason: 'Esta sala já existe e está protegida por senha.',
      };
    } else {
      // Se a sala existente é pública:
      // Não permite adicionar senha a uma sala já criada publicamente
      if (newHasPasscode) {
        return {
          success: false,
          conflict: true,
          roomName: cleanName,
          inviteKey,
          hasPasscode: false,
          reason: 'Esta sala já existe como pública e não pode ter suas configurações alteradas.',
        };
      }
      // Se solicitada novamente sem senha, retorna os dados da sala pública existente
      return {
        success: true,
        roomName: cleanName,
        inviteKey,
        hasPasscode: false,
      };
    }
  }

  // Se não existia ou havia expirado, registra com novas configurações
  roomSecurityStore.set(cleanName, {
    roomName: cleanName,
    hasPasscode: newHasPasscode,
    passcodeHash: newPasscodeHash,
    createdAt: Date.now(),
  });

  return {
    success: true,
    roomName: cleanName,
    inviteKey,
    hasPasscode: newHasPasscode,
  };
}

export type RoomAccessResult =
  | { authorized: true; hasPasscode: boolean }
  | {
      authorized: false;
      status: 401 | 403 | 404;
      code: 'ROOM_NOT_FOUND' | 'ROOM_EXPIRED' | 'AUTH_REQUIRED' | 'INVALID_CREDENTIALS';
      reason: string;
      requiresAuth: boolean;
    };

/**
 * Valida o acesso de um participante a uma sala:
 * 1. Salas criadas sem senha são públicas e aceitam acesso direto.
 * 2. Salas criadas com senha exigem senha correta ou link de convite oficial (?key=...).
 * 3. Salas inexistentes ou expiradas retornam 404 e não devem solicitar senha.
 * 4. Links com chave de convite oficial (HMAC) são válidos mesmo após reinício do Render.
 */
export function verifyRoomAccess(
  roomName: string,
  providedKeyOrPasscode?: string
): RoomAccessResult {
  const cleanName = roomName.toLowerCase().trim();
  const expectedInviteKey = generateRoomInviteKey(cleanName);
  const cleanInput = providedKeyOrPasscode ? providedKeyOrPasscode.trim() : '';

  // 1. Suporte a convites oficiais autorizados (?key=...)
  // A chave de convite é gerada via HMAC do segredo do servidor; provê autorização sem expor senhas.
  // Permite entrada imediata de convidados mesmo se o servidor Render reiniciar sua memória.
  if (cleanInput.length > 0 && cleanInput === expectedInviteKey) {
    if (!roomSecurityStore.has(cleanName)) {
      roomSecurityStore.set(cleanName, {
        roomName: cleanName,
        hasPasscode: false,
        createdAt: Date.now(),
      });
    }
    return { authorized: true, hasPasscode: false };
  }

  const entry = roomSecurityStore.get(cleanName);

  // 2. SEGURANÇA: Não permitir que ausência de registro seja interpretada como sala pública
  if (!entry) {
    return {
      authorized: false,
      status: 404,
      code: 'ROOM_NOT_FOUND',
      reason: 'Sala não encontrada ou expirada. Crie uma nova sala para iniciar.',
      requiresAuth: false,
    };
  }

  // 3. Verificação de TTL (expiração)
  if (Date.now() - entry.createdAt > ROOM_TTL_MS) {
    roomSecurityStore.delete(cleanName);
    return {
      authorized: false,
      status: 404,
      code: 'ROOM_EXPIRED',
      reason: 'Esta sala expirou por inatividade. Crie uma nova sala para iniciar.',
      requiresAuth: false,
    };
  }

  // 4. Sala criada SEM senha (pública registrada explicitamente)
  // COMPORTAMENTO DESEJADO: Sala criada sem senha: não solicitar senha para entrar.
  if (!entry.hasPasscode) {
    return { authorized: true, hasPasscode: false };
  }

  // 5. Sala criada COM senha: exigir senha válida
  if (!cleanInput) {
    return {
      authorized: false,
      status: 401,
      code: 'AUTH_REQUIRED',
      reason: 'Esta sala é protegida por senha. Digite a senha para entrar.',
      requiresAuth: true,
    };
  }

  // Validação segura de senha com proteção contra timing attack
  if (entry.passcodeHash) {
    const candidateHash = hashPasscode(cleanInput);
    const candidateBuf = Buffer.from(candidateHash, 'hex');
    const expectedBuf = Buffer.from(entry.passcodeHash, 'hex');

    if (
      candidateBuf.length === expectedBuf.length &&
      crypto.timingSafeEqual(candidateBuf, expectedBuf)
    ) {
      return { authorized: true, hasPasscode: true };
    }
  }

  // 6. Senha incorreta
  return {
    authorized: false,
    status: 401,
    code: 'INVALID_CREDENTIALS',
    reason: 'Senha de acesso incorreta.',
    requiresAuth: true,
  };
}

/**
 * Utilitário de testes para limpar o armazenamento
 */
export function clearRoomSecurityStoreForTests(): void {
  roomSecurityStore.clear();
}
