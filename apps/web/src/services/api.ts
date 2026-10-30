export interface TokenRequest {
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

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export async function requestRoomToken(params: TokenRequest): Promise<TokenResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `Erro ${response.status}: Falha ao solicitar acesso à sala.`);
    }

    return data as TokenResponse;
  } catch (err: unknown) {
    if (err instanceof TypeError && err.message.includes('fetch')) {
      throw new Error('Não foi possível conectar ao servidor ScreenParty (backend). Verifique se o backend está em execução na porta 3001.');
    }
    throw err;
  }
}

