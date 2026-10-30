import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { z } from 'zod';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carrega variáveis tanto a partir da raiz do monorepo quanto da pasta apps/server
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(process.cwd(), 'apps/server/.env') });

const isProd = process.env.NODE_ENV === 'production';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3001').transform((val) => parseInt(val, 10)),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  LIVEKIT_API_KEY: z.string().min(1, 'LIVEKIT_API_KEY é obrigatória'),
  LIVEKIT_API_SECRET: z.string().min(1, 'LIVEKIT_API_SECRET é obrigatória'),
  LIVEKIT_URL: z.string().default('ws://127.0.0.1:7880'),
  TOKEN_TTL_SECONDS: z.string().default('21600').transform((val) => parseInt(val, 10)),
});

const parsedEnv = envSchema.safeParse(process.env);

if (isProd) {
  // Verificações rigorosas de produção: NUNCA permitir credenciais padrão de desenvolvimento
  const key = process.env.LIVEKIT_API_KEY;
  const secret = process.env.LIVEKIT_API_SECRET;
  const url = process.env.LIVEKIT_URL;

  if (!key || key.trim() === '' || key === 'devkey') {
    console.error('❌ [PRODUÇÃO] ERRO FATAL DE SEGURANÇA: LIVEKIT_API_KEY válida é obrigatória em produção. O uso de "devkey" é estritamente proibido.');
    process.exit(1);
  }

  if (!secret || secret.trim() === '' || secret === 'secret') {
    console.error('❌ [PRODUÇÃO] ERRO FATAL DE SEGURANÇA: LIVEKIT_API_SECRET seguro é obrigatório em produção. O uso de segredos padrão ("secret") é estritamente proibido.');
    process.exit(1);
  }

  if (!url || url.includes('localhost') || url.includes('127.0.0.1')) {
    console.error('❌ [PRODUÇÃO] ERRO FATAL DE CONFIGURAÇÃO: LIVEKIT_URL em produção não pode apontar para localhost. Forneça a URL do LiveKit Cloud (ex: wss://seu-projeto.livekit.cloud).');
    process.exit(1);
  }
} else if (!parsedEnv.success) {
  console.warn('⚠️ [DESENVOLVIMENTO] Usando valores padrão para LiveKit local (--dev)...');
}

/**
 * Normaliza a URL do LiveKit garantindo o uso correto do protocolo WebSocket seguro (wss://) em produção ou nuvem.
 */
export function normalizeLiveKitUrl(rawUrl: string, inProduction: boolean): string {
  let normalized = rawUrl.trim();

  // Converte HTTP(S) para WS(S) caso o usuário tenha colado a URL do dashboard LiveKit
  if (normalized.startsWith('https://')) {
    normalized = 'wss://' + normalized.substring(8);
  } else if (normalized.startsWith('http://')) {
    normalized = (inProduction ? 'wss://' : 'ws://') + normalized.substring(7);
  } else if (!normalized.startsWith('ws://') && !normalized.startsWith('wss://')) {
    normalized = (inProduction ? 'wss://' : 'ws://') + normalized;
  }

  // Se estiver em produção ou no LiveKit Cloud (*.livekit.cloud), assegura o uso de wss://
  if ((inProduction || normalized.includes('.livekit.cloud')) && normalized.startsWith('ws://')) {
    normalized = 'wss://' + normalized.substring(5);
  }

  return normalized;
}

const rawLiveKitUrl = parsedEnv.success ? parsedEnv.data.LIVEKIT_URL : (process.env.LIVEKIT_URL || 'ws://127.0.0.1:7880');
const normalizedLiveKitUrl = normalizeLiveKitUrl(rawLiveKitUrl, isProd);

export const config = {
  isProduction: isProd,
  port: parsedEnv.success ? parsedEnv.data.PORT : Number(process.env.PORT || 3001),
  corsOrigin: parsedEnv.success ? parsedEnv.data.CORS_ORIGIN : (process.env.CORS_ORIGIN || 'http://localhost:5173'),
  livekitApiKey: parsedEnv.success ? parsedEnv.data.LIVEKIT_API_KEY : (process.env.LIVEKIT_API_KEY || 'devkey'),
  livekitApiSecret: parsedEnv.success ? parsedEnv.data.LIVEKIT_API_SECRET : (process.env.LIVEKIT_API_SECRET || 'secret'),
  livekitUrl: normalizedLiveKitUrl,
  tokenTtlSeconds: parsedEnv.success ? parsedEnv.data.TOKEN_TTL_SECONDS : 21600,
};
