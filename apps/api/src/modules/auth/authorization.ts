import { Role } from '@prisma/client';
import type { Request, RequestHandler } from 'express';

import { forbidden, unauthorized } from '../../lib/errors.js';

export const requireRoles =
  (...roles: Role[]): RequestHandler =>
  (request, _response, next) => {
    if (!request.authUser) return next(unauthorized());
    if (!roles.includes(request.authUser.role)) return next(forbidden());
    next();
  };

const assertRequestedSiteFilter = (request: Request) => {
  if (!request.authUser) throw unauthorized();
  const requestedSiteId = request.query.siteId;
  if (
    request.authUser.role !== Role.ADMINISTRATOR &&
    typeof requestedSiteId === 'string' &&
    !request.authUser.siteIds.includes(requestedSiteId)
  ) {
    throw forbidden();
  }
};

export const siteScopeWhere = (request: Request): { siteId?: { in: string[] } } => {
  if (!request.authUser) throw unauthorized();
  assertRequestedSiteFilter(request);
  return request.authUser.role === Role.ADMINISTRATOR
    ? {}
    : { siteId: { in: request.authUser.siteIds } };
};

export const siteRecordScopeWhere = (request: Request): { id?: { in: string[] } } => {
  if (!request.authUser) throw unauthorized();
  return request.authUser.role === Role.ADMINISTRATOR
    ? {}
    : { id: { in: request.authUser.siteIds } };
};

export const assertSiteAccess = (request: Request, siteId: string) => {
  if (!request.authUser) throw unauthorized();
  if (request.authUser.role !== Role.ADMINISTRATOR && !request.authUser.siteIds.includes(siteId)) {
    throw forbidden();
  }
};

const workManagerRoles = new Set<Role>([
  Role.ADMINISTRATOR,
  Role.FACILITY_MANAGER,
  Role.COORDINATOR,
]);

export const canManageWork = (role: Role) => workManagerRoles.has(role);
