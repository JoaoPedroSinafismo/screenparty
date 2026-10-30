/**
 * Gera um código de sala aleatório com alta entropia usando a Web Crypto API nativa do navegador.
 * Formato amigável: sp-xxxx-xxxx (ex: sp-7a9b-4k2x)
 */
export function generateHighEntropyRoomCode(): string {
  const chars = '23456789abcdefghjkmnpqrstuvwxyz'; // Base 31 segura sem caracteres ambíguos (0, o, 1, l, i)
  const randomBytes = new Uint8Array(8);
  globalThis.crypto.getRandomValues(randomBytes);

  let result1 = '';
  for (let i = 0; i < 4; i++) {
    result1 += chars[randomBytes[i] % chars.length];
  }

  let result2 = '';
  for (let i = 4; i < 8; i++) {
    result2 += chars[randomBytes[i] % chars.length];
  }

  return `sp-${result1}-${result2}`;
}

/**
 * Normaliza e sanitiza o código da sala
 */
export function sanitizeRoomCode(code: string): string {
  return code.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
}

