export interface TokenRequest {
  roomName: string;
  identity: string;
  name?: string;
  passcode?: string;
}

export interface TokenResponse {
  token: string;
  serverUrl: string;
  roomName: string;
  identity: string;
  expiresInSeconds: number;
}

export interface CreateRoomRequest {
  roomName: string;
  passcode?: string;
}

export interface CreateRoomResponse {
  roomName: string;
  inviteKey: string;
  hasPasscode: boolean;
}

export interface ApiError extends Error {
  status?: number;
  code?: string;
  requiresAuth?: boolean;
}

/**
 * Resolve a URL base da API de acordo com o ambiente.
 * Em produção, NUNCA recorre silenciosamente ao localhost: exige a variável VITE_API_URL.
 */
export function getApiBaseUrl(): string {
  const envUrl = import.meta.env.VITE_API_URL;

  if (envUrl && typeof envUrl === 'string' && envUrl.trim().length > 0) {
    let clean = envUrl.trim().replace(/\/+$/, '');
    // Garante que o endpoint termine com /api
    if (!clean.endsWith('/api')) {
      clean += '/api';
    }
    return clean;
  }

  // Se estiver em produção (Cloudflare Pages), falha explicitamente caso a variável falte
  if (import.meta.env.PROD) {
    throw new Error(
      'Configuração pendente: A variável VITE_API_URL não foi informada nas variáveis de ambiente do Cloudflare Pages. ' +
        'Configure VITE_API_URL apontando para o seu backend no Render (ex: https://screenparty-api.onrender.com/api).'
    );
  }

  // Fallback restrito unicamente ao ambiente local de desenvolvimento
  return 'http://localhost:3001/api';
}

/**
 * Registra a criação de uma sala no backend para gerar a chave de convite oficial e registrar senha opcional.
 */
export async function createRoomApi(params: CreateRoomRequest): Promise<CreateRoomResponse> {
  const baseUrl = getApiBaseUrl();

  try {
    const response = await fetch(`${baseUrl}/room/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    let data: { error?: string; code?: string; roomName?: string; inviteKey?: string; hasPasscode?: boolean } = {};
    try {
      data = await response.json();
    } catch {
      data = {};
    }

    if (!response.ok) {
      const err: ApiError = new Error(data.error || `Erro ${response.status}: Falha ao registrar a sala.`);
      err.status = response.status;
      err.code = data.code;
      throw err;
    }

    return data as CreateRoomResponse;
  } catch (err: unknown) {
    handleApiFetchError(err, baseUrl);
    throw err;
  }
}

/**
 * Solicita um token de participante com validação de autorização (chave de convite ou senha).
 */
export async function requestRoomToken(params: TokenRequest): Promise<TokenResponse> {
  const baseUrl = getApiBaseUrl();

  try {
    const response = await fetch(`${baseUrl}/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    let data: { error?: string; code?: string; requiresAuth?: boolean } & Partial<TokenResponse> = {};
    try {
      data = await response.json();
    } catch {
      data = {};
    }

    if (!response.ok) {
      const error: ApiError = new Error(
        data.error || `Erro ${response.status}: Falha ao solicitar acesso à sala.`
      );
      error.status = response.status;
      error.code = data.code;
      error.requiresAuth = !!data.requiresAuth;
      throw error;
    }

    return data as TokenResponse;
  } catch (err: unknown) {
    handleApiFetchError(err, baseUrl);
    throw err;
  }
}

function handleApiFetchError(err: unknown, baseUrl: string) {
  if (err instanceof TypeError && err.message.includes('fetch')) {
    if (import.meta.env.PROD) {
      throw new Error(
        `Não foi possível conectar ao backend ScreenParty (${baseUrl}). ` +
          'Se o serviço do Render estiver na camada gratuita, ele pode demorar cerca de 50 segundos para despertar caso esteja inativo. ' +
          'Certifique-se também de que a URL do Cloudflare Pages está autorizada na variável CORS_ORIGIN do Render.'
      );
    }
    throw new Error(
      `Não foi possível conectar ao servidor backend local (${baseUrl}). Verifique se o servidor Express está em execução.`
    );
  }
}
