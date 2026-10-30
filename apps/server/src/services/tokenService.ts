import { AccessToken } from 'livekit-server-sdk';
import { config } from '../config/index.js';

export interface GenerateTokenParams {
  roomName: string;
  identity: string;
  name?: string;
}

export interface TokenResponse {
  token: string;
  serverUrl: string;
  roomName: string;
  identity: string;
  expiresInSeconds: number;
}

export async function createParticipantToken({
  roomName,
  identity,
  name,
}: GenerateTokenParams): Promise<TokenResponse> {
  // Configuração do AccessToken com TTL limitado
  const at = new AccessToken(config.livekitApiKey, config.livekitApiSecret, {
    identity,
    name: name || identity,
    ttl: `${config.tokenTtlSeconds}s`,
  });

  // Concessão de permissões mínimas necessárias para a experiência de compartilhamento e visualização
  at.addGrant({
    roomJoin: true,
    room: roomName,
    canPublish: true,      // Permite publicar áudio e tela quando solicitado
    canSubscribe: true,    // Permite assistir às transmissões da sala
    canPublishData: true,  // Permite enviar mensagens de controle/dados na sala
  });

  const jwt = await at.toJwt();

  // ATENÇÃO DE SEGURANÇA: Nunca logamos o JWT completo em console ou arquivos.
  return {
    token: jwt,
    serverUrl: config.livekitUrl,
    roomName,
    identity,
    expiresInSeconds: config.tokenTtlSeconds,
  };
}

