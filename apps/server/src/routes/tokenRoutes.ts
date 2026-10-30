import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { createParticipantToken } from '../services/tokenService.js';
import { registerRoom, verifyRoomAccess } from '../services/roomAuthService.js';

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
    .max(64, 'Código de acesso excede o tamanho permitido.')
    .optional(),
});

// Endpoint para registrar sala com senha opcional e obter chave de convite
tokenRouter.post('/room/create', async (req: Request, res: Response): Promise<void> => {
  try {
    const parseResult = createRoomSchema.safeParse(req.body);

    if (!parseResult.success) {
      const errorMsg = parseResult.error.issues.map((i) => i.message).join(' ');
      res.status(400).json({ error: errorMsg, code: 'VALIDATION_ERROR' });
      return;
    }

    const { roomName, passcode } = parseResult.data;
    const roomInfo = registerRoom(roomName, passcode);

    if (!roomInfo.success) {
      res.status(roomInfo.conflict ? 409 : 400).json({
        error: roomInfo.reason || 'Não foi possível registrar a sala.',
        code: roomInfo.conflict ? 'ROOM_CONFLICT' : 'REGISTRATION_FAILED',
      });
      return;
    }

    res.status(200).json({
      roomName: roomInfo.roomName,
      inviteKey: roomInfo.inviteKey,
      hasPasscode: roomInfo.hasPasscode,
    });
  } catch (error) {
    console.error('Erro ao registrar sala:', error instanceof Error ? error.message : error);
    res.status(500).json({ error: 'Falha interna ao registrar a sala.', code: 'INTERNAL_ERROR' });
  }
});

// Endpoint para emissão de token com verificação de autorização da sala
tokenRouter.post('/token', async (req: Request, res: Response): Promise<void> => {
  try {
    const parseResult = tokenRequestSchema.safeParse(req.body);

    if (!parseResult.success) {
      const errorMsg = parseResult.error.issues.map((i) => i.message).join(' ');
      res.status(400).json({ error: errorMsg, code: 'VALIDATION_ERROR' });
      return;
    }

    const { roomName, identity, name, passcode } = parseResult.data;

    // Verificação de autorização e existência da sala
    const authCheck = verifyRoomAccess(roomName, passcode);
    if (!authCheck.authorized) {
      res.status(authCheck.status).json({
        error: authCheck.reason,
        code: authCheck.code,
        requiresAuth: authCheck.requiresAuth,
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
      code: 'INTERNAL_ERROR',
    });
  }
});
