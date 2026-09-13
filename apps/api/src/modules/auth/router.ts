import { ThemePreference } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';

import { config } from '../../config.js';
import { prisma } from '../../db.js';
import { asyncHandler } from '../../lib/async-handler.js';
import { unauthorized } from '../../lib/errors.js';
import { validate } from '../../middleware/validate.js';
import { authenticate, createSession, loginSchema, sessionCookieOptions } from './session.js';

export const authRouter = Router();

authRouter.post(
  '/login',
  validate('body', loginSchema),
  asyncHandler(async (request, response) => {
    const { email, password } = request.body as z.infer<typeof loginSchema>;
    const { token, user } = await createSession(email, password, request.requestId);
    response.cookie(config.SESSION_COOKIE_NAME, token, sessionCookieOptions());
    response.json({
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    });
  }),
);

authRouter.post(
  '/logout',
  authenticate,
  asyncHandler(async (request, response) => {
    if (!request.sessionId || !request.authUser) throw unauthorized();
    await prisma.$transaction([
      prisma.session.update({
        where: { id: request.sessionId },
        data: { revokedAt: new Date() },
      }),
      prisma.auditLog.create({
        data: {
          actorId: request.authUser.id,
          action: 'AUTH_LOGOUT',
          entityType: 'Session',
          entityId: request.sessionId,
          requestId: request.requestId,
          summary: {},
        },
      }),
    ]);
    response.clearCookie(config.SESSION_COOKIE_NAME, { ...sessionCookieOptions(), maxAge: 0 });
    response.status(204).send();
  }),
);

authRouter.get('/me', authenticate, (request, response) => {
  response.json({ user: request.authUser });
});

const preferenceSchema = z.object({
  locale: z.enum(['en', 'de-DE', 'zh-HK']).optional(),
  theme: z.nativeEnum(ThemePreference).optional(),
});

authRouter.patch(
  '/preferences',
  authenticate,
  validate('body', preferenceSchema),
  asyncHandler(async (request, response) => {
    if (!request.authUser) throw unauthorized();
    const values = request.body as z.infer<typeof preferenceSchema>;
    const user = await prisma.user.update({
      where: { id: request.authUser.id },
      data: values,
      select: { locale: true, theme: true },
    });
    response.json({ preferences: user });
  }),
);
