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

const envSchema = z.object({
  PORT: z.string().default('3001').transform((val) => parseInt(val, 10)),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  LIVEKIT_API_KEY: z.string().min(1, 'LIVEKIT_API_KEY é obrigatória'),
  LIVEKIT_API_SECRET: z.string().min(1, 'LIVEKIT_API_SECRET é obrigatória'),
  LIVEKIT_URL: z.string().default('ws://127.0.0.1:7880'),
  TOKEN_TTL_SECONDS: z.string().default('21600').transform((val) => parseInt(val, 10)),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('❌ Erro na validação das variáveis de ambiente do servidor:');
  parsedEnv.error.issues.forEach((issue) => {
    console.error(` - ${issue.path.join('.')}: ${issue.message}`);
  });
  console.warn('⚠️ Usando valores de desenvolvimento padrão para LiveKit (--dev)...');
}

export const config = {
  port: parsedEnv.success ? parsedEnv.data.PORT : Number(process.env.PORT || 3001),
  corsOrigin: parsedEnv.success ? parsedEnv.data.CORS_ORIGIN : (process.env.CORS_ORIGIN || 'http://localhost:5173'),
  livekitApiKey: parsedEnv.success ? parsedEnv.data.LIVEKIT_API_KEY : (process.env.LIVEKIT_API_KEY || 'devkey'),
  livekitApiSecret: parsedEnv.success ? parsedEnv.data.LIVEKIT_API_SECRET : (process.env.LIVEKIT_API_SECRET || 'secret'),
  livekitUrl: parsedEnv.success ? parsedEnv.data.LIVEKIT_URL : (process.env.LIVEKIT_URL || 'ws://127.0.0.1:7880'),
  tokenTtlSeconds: parsedEnv.success ? parsedEnv.data.TOKEN_TTL_SECONDS : 21600,
};

