import { Role } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';

import { prisma } from '../../db.js';
import { asyncHandler } from '../../lib/async-handler.js';
import { paginationMeta } from '../../lib/pagination.js';
import { validate } from '../../middleware/validate.js';
import { requireRoles, siteScopeWhere } from '../auth/authorization.js';

export const auditRouter = Router();

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  action: z.string().max(100).optional(),
  entityType: z.string().max(100).optional(),
});

auditRouter.get(
  '/',
  requireRoles(Role.ADMINISTRATOR, Role.FACILITY_MANAGER, Role.AUDITOR),
  validate('query', querySchema),
  asyncHandler(async (request, response) => {
    const query = request.query as unknown as z.infer<typeof querySchema>;
    const where = {
      ...siteScopeWhere(request),
      ...(query.action ? { action: query.action } : {}),
      ...(query.entityType ? { entityType: query.entityType } : {}),
    };
    const [data, total] = await prisma.$transaction([
      prisma.auditLog.findMany({
        where,
        include: { actor: { select: { name: true } }, site: { select: { name: true } } },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      prisma.auditLog.count({ where }),
    ]);
    response.json({ data, meta: paginationMeta(query.page, query.pageSize, total) });
  }),
);
