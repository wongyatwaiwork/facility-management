import { Role, ThemePreference } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';

import { prisma } from '../../db.js';
import { asyncHandler } from '../../lib/async-handler.js';
import { validate } from '../../middleware/validate.js';
import { requireRoles } from '../auth/authorization.js';

export const userRouter = Router();

userRouter.get(
  '/',
  requireRoles(Role.ADMINISTRATOR, Role.FACILITY_MANAGER, Role.COORDINATOR),
  asyncHandler(async (request, response) => {
    const scope =
      request.authUser!.role === Role.ADMINISTRATOR
        ? {}
        : { siteAccess: { some: { siteId: { in: request.authUser!.siteIds } } } };
    const users = await prisma.user.findMany({
      where: { ...scope, isActive: true },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        siteAccess: { select: { siteId: true } },
      },
      orderBy: [{ role: 'asc' }, { name: 'asc' }],
    });
    response.json({ data: users });
  }),
);

const preferenceSchema = z.object({
  locale: z.enum(['en', 'de-DE', 'zh-HK']),
  theme: z.nativeEnum(ThemePreference),
});

userRouter.patch(
  '/me/preferences',
  validate('body', preferenceSchema),
  asyncHandler(async (request, response) => {
    const preferences = request.body as z.infer<typeof preferenceSchema>;
    const user = await prisma.user.update({
      where: { id: request.authUser!.id },
      data: preferences,
      select: { id: true, locale: true, theme: true },
    });
    response.json({ data: user });
  }),
);
