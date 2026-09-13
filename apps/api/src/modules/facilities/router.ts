import { Router } from 'express';
import { z } from 'zod';

import { prisma } from '../../db.js';
import { asyncHandler } from '../../lib/async-handler.js';
import { notFound } from '../../lib/errors.js';
import { validate } from '../../middleware/validate.js';
import { siteRecordScopeWhere } from '../auth/authorization.js';

export const facilitiesRouter = Router();

const querySchema = z.object({ search: z.string().trim().max(100).optional() });

facilitiesRouter.get(
  '/',
  validate('query', querySchema),
  asyncHandler(async (request, response) => {
    const { search } = request.query as z.infer<typeof querySchema>;
    const sites = await prisma.site.findMany({
      where: {
        ...siteRecordScopeWhere(request),
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { code: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: {
        _count: { select: { buildings: true, assets: true, workOrders: true, inspections: true } },
      },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
    });
    response.json({ data: sites });
  }),
);

facilitiesRouter.get(
  '/:id',
  validate('params', z.object({ id: z.string() })),
  asyncHandler(async (request, response) => {
    const site = await prisma.site.findFirst({
      where: {
        id: request.params.id,
        AND: [siteRecordScopeWhere(request)],
      },
      include: {
        buildings: {
          include: { locations: true, _count: { select: { assets: true, workOrders: true } } },
          orderBy: { name: 'asc' },
        },
        assets: { include: { category: true, location: true }, orderBy: { name: 'asc' }, take: 50 },
        workOrders: {
          where: { status: { notIn: ['CLOSED', 'CANCELLED'] } },
          orderBy: { dueAt: 'asc' },
          take: 10,
        },
        inspections: {
          where: { status: { in: ['SCHEDULED', 'IN_PROGRESS'] } },
          orderBy: { dueAt: 'asc' },
          take: 10,
        },
      },
    });
    if (!site) throw notFound('Site');
    response.json({ data: site });
  }),
);
