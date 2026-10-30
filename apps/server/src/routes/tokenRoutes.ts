import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { createParticipantToken } from '../services/tokenService.js';
import { registerRoom, verifyRoomAccess, generateRoomInviteKey } from '../services/roomAuthService.js';

export const tokenRouter = Router();

const createRoomSchema = z.object({
  roomName: z
    .string({ required_error: 'O código/nome da sala é obrigatório.' })
    .trim()
    .min(3, 'O código da sala deve ter no mínimo 3 caracteres.')
    .max(64, 'O código da sala deve ter no máximo 64 caracteres.')
    .regex(/^[a-zA-Z0-9_-]+$/, 'O código da sala deve conter apenas letras, números, hífens ou sublinhados.'),
  passcode: z
    .string()
    .trim()
    .min(2, 'A senha da sala deve ter no mínimo 2 caracteres.')
    .max(32, 'A senha da sala deve ter no máximo 32 caracteres.')
    .optional(),
});

const tokenRequestSchema = z.object({
  roomName: z
    .string({ required_error: 'O código/nome da sala é obrigatório.' })
    .trim()
    .min(3, 'O código da sala deve ter no mínimo 3 caracteres.')
    .max(64, 'O código da sala deve ter no máximo 64 caracteres.')
    .regex(/^[a-zA-Z0-9_-]+$/, 'O código da sala deve conter apenas letras, números, hífens ou sublinhados.'),
  identity: z
    .string({ required_error: 'A identidade do participante é obrigatória.' })
    .trim()
    .min(2, 'O identificador deve ter no mínimo 2 caracteres.')
    .max(64, 'O identificador deve ter no máximo 64 caracteres.'),
  name: z
    .string()
    .trim()
    .min(2, 'O apelido deve ter no mínimo 2 caracteres.')
    .max(64, 'O apelido deve ter no máximo 64 caracteres.')
    .optional(),
  passcode: z
    .string()
    .trim()
    .min(1, 'A chave de autorização ou senha é obrigatória.')
    .max(64, 'Código de acesso excede o tamanho permitido.')
    .optional(),
});

// Endpoint para registrar sala com senha opcional e obter chave de convite
tokenRouter.post('/room/create', async (req: Request, res: Response): Promise<void> => {
  try {
    const parseResult = createRoomSchema.safeParse(req.body);

    if (!parseResult.success) {
      const errorMsg = parseResult.error.issues.map((i) => i.message).join(' ');
      res.status(400).json({ error: errorMsg });
      return;
    }

    const { roomName, passcode } = parseResult.data;
    const roomInfo = registerRoom(roomName, passcode);

    res.status(200).json(roomInfo);
  } catch (error) {
    console.error('Erro ao registrar sala:', error instanceof Error ? error.message : error);
    res.status(500).json({ error: 'Falha interna ao registrar a sala.' });
  }
});

// Endpoint para emissão de token com verificação de autorização da sala
tokenRouter.post('/token', async (req: Request, res: Response): Promise<void> => {
  try {
    const parseResult = tokenRequestSchema.safeParse(req.body);

    if (!parseResult.success) {
      const errorMsg = parseResult.error.issues.map((i) => i.message).join(' ');
      res.status(400).json({ error: errorMsg });
      return;
    }

    const { roomName, identity, name, passcode } = parseResult.data;

    // Verificação rigorosa de autorização: nenhuma sala é acessível sem chave de convite ou senha
    const authCheck = verifyRoomAccess(roomName, passcode);
    if (!authCheck.authorized) {
      res.status(401).json({
        error: authCheck.reason || 'Acesso não autorizado à sala. Chave de convite ou senha necessária.',
        requiresAuth: true,
      });
      return;
    }

    const tokenData = await createParticipantToken({
      roomName,
      identity,
      name,
    });

    res.status(200).json(tokenData);
  } catch (error) {
    console.error('Erro interno ao gerar token LiveKit:', error instanceof Error ? error.message : error);
    res.status(500).json({
      error: 'Falha interna ao gerar o token de conexão com a sala. Verifique a configuração do servidor.',
    });
  }
});
