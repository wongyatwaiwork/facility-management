import { createHash, randomBytes } from 'node:crypto';

import bcrypt from 'bcryptjs';
import type { CookieOptions, RequestHandler } from 'express';
import { z } from 'zod';

import { config } from '../../config.js';
import { prisma } from '../../db.js';
import { AppError, unauthorized } from '../../lib/errors.js';

export const loginSchema = z.object({
  email: z
    .string()
    .email()
    .transform((value) => value.toLowerCase()),
  password: z.string().min(8).max(128),
});

export const hashSessionToken = (token: string) =>
  createHash('sha256').update(token, 'utf8').digest('hex');

export const sessionCookieOptions = (): CookieOptions => ({
  httpOnly: true,
  sameSite: config.NODE_ENV === 'production' ? 'none' : 'lax',
  secure: config.SESSION_COOKIE_SECURE,
  path: '/',
  maxAge: config.SESSION_TTL_HOURS * 60 * 60 * 1000,
});

export async function createSession(email: string, password: string, requestId: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.isActive || !(await bcrypt.compare(password, user.passwordHash))) {
    await prisma.auditLog.create({
      data: {
        action: 'AUTH_LOGIN_FAILED',
        entityType: 'User',
        requestId,
        summary: { email },
      },
    });
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect');
  }

  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + config.SESSION_TTL_HOURS * 60 * 60 * 1000);
  const session = await prisma.$transaction(async (transaction) => {
    const created = await transaction.session.create({
      data: { tokenHash: hashSessionToken(token), userId: user.id, expiresAt },
    });
    await transaction.auditLog.create({
      data: {
        actorId: user.id,
        action: 'AUTH_LOGIN_SUCCEEDED',
        entityType: 'Session',
        entityId: created.id,
        requestId,
        summary: { expiresAt: expiresAt.toISOString() },
      },
    });
    return created;
  });

  return { token, session, user };
}

export const authenticate: RequestHandler = async (request, _response, next) => {
  try {
    const token = request.cookies[config.SESSION_COOKIE_NAME] as string | undefined;
    if (!token) throw unauthorized();

    const session = await prisma.session.findUnique({
      where: { tokenHash: hashSessionToken(token) },
      include: { user: { include: { siteAccess: { select: { siteId: true } } } } },
    });
    if (
      !session ||
      session.revokedAt ||
      session.expiresAt <= new Date() ||
      !session.user.isActive
    ) {
      throw unauthorized();
    }

    request.sessionId = session.id;
    request.authUser = {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      role: session.user.role,
      locale: session.user.locale,
      theme: session.user.theme,
      siteIds: session.user.siteAccess.map(({ siteId }) => siteId),
    };
    next();
  } catch (error) {
    next(error);
  }
};
