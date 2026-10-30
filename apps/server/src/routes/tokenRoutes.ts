import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { createParticipantToken } from '../services/tokenService.js';

export const tokenRouter = Router();

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
});

tokenRouter.post('/token', async (req: Request, res: Response): Promise<void> => {
  try {
    const parseResult = tokenRequestSchema.safeParse(req.body);

    if (!parseResult.success) {
      const errorMsg = parseResult.error.issues.map((i) => i.message).join(' ');
      res.status(400).json({ error: errorMsg });
      return;
    }

    const { roomName, identity, name } = parseResult.data;

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

