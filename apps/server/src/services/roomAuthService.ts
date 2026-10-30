import crypto from 'crypto';
import { config } from '../config/index.js';

interface RoomSecurityEntry {
  roomName: string;
  passcode?: string;
  createdAt: number;
}

// Armazenamento em memória para senhas de salas com TTL de 24 horas
const roomSecurityStore = new Map<string, RoomSecurityEntry>();
const ROOM_TTL_MS = 24 * 60 * 60 * 1000;

// Limpeza periódica de salas antigas a cada 1 hora
setInterval(() => {
  const now = Date.now();
  for (const [room, entry] of roomSecurityStore.entries()) {
    if (now - entry.createdAt > ROOM_TTL_MS) {
      roomSecurityStore.delete(room);
    }
  }
}, 60 * 60 * 1000).unref();

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

/**
 * Registra uma nova sala com senha opcional e gera a chave de convite correspondente.
 */
export function registerRoom(
  roomName: string,
  passcode?: string
): { roomName: string; inviteKey: string; hasPasscode: boolean } {
  const cleanName = roomName.toLowerCase().trim();
  const inviteKey = generateRoomInviteKey(cleanName);

  roomSecurityStore.set(cleanName, {
    roomName: cleanName,
    passcode: passcode && passcode.trim().length > 0 ? passcode.trim() : undefined,
    createdAt: Date.now(),
  });

  return {
    roomName: cleanName,
    inviteKey,
    hasPasscode: !!(passcode && passcode.trim().length > 0),
  };
}

/**
 * Valida se uma solicitação de token para a sala possui a autorização necessária (chave de convite ou senha).
 */
export function verifyRoomAccess(
  roomName: string,
  providedKeyOrPasscode?: string
): { authorized: boolean; reason?: string } {
  const cleanName = roomName.toLowerCase().trim();

  if (!providedKeyOrPasscode || providedKeyOrPasscode.trim().length === 0) {
    return {
      authorized: false,
      reason: 'Acesso não autorizado: Esta sala requer uma chave de convite ou senha de acesso.',
    };
  }

  const cleanInput = providedKeyOrPasscode.trim();
  const expectedInviteKey = generateRoomInviteKey(cleanName);

  // 1. Chave de convite do link oficial confere
  if (cleanInput === expectedInviteKey) {
    return { authorized: true };
  }

  // 2. Verifica se a sala possui uma senha personalizada cadastrada
  const entry = roomSecurityStore.get(cleanName);
  if (entry && entry.passcode) {
    if (entry.passcode === cleanInput) {
      return { authorized: true };
    }
    return {
      authorized: false,
      reason: 'Senha de acesso à sala incorreta.',
    };
  }

  // Se não coincidiu nem com a chave de convite nem com a senha
  return {
    authorized: false,
    reason: 'Chave de convite ou senha inválida para esta sala.',
  };
}

