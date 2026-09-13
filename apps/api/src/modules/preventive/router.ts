import { RecurrenceInterval, Role } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';

import { prisma } from '../../db.js';
import { asyncHandler } from '../../lib/async-handler.js';
import { validate } from '../../middleware/validate.js';
import { assertSiteAccess, requireRoles, siteScopeWhere } from '../auth/authorization.js';
import { generateDuePreventiveWork } from './service.js';

export const preventiveRouter = Router();

preventiveRouter.get(
  '/',
  asyncHandler(async (request, response) => {
    const plans = await prisma.preventiveMaintenancePlan.findMany({
      where: siteScopeWhere(request),
      include: {
        site: { select: { name: true } },
        asset: { select: { internalCode: true, name: true } },
        defaultAssignee: { select: { id: true, name: true } },
        _count: { select: { occurrences: true } },
      },
      orderBy: [{ nextDueAt: 'asc' }, { id: 'asc' }],
    });
    response.json({ data: plans });
  }),
);

const planSchema = z
  .object({
    title: z.string().trim().min(3).max(160),
    instructions: z.string().trim().min(5).max(5000),
    siteId: z.string(),
    assetId: z.string().optional(),
    assetCategoryId: z.string().optional(),
    defaultAssigneeId: z.string().optional(),
    recurrence: z.nativeEnum(RecurrenceInterval),
    timezone: z.string().default('Europe/Berlin'),
    nextDueAt: z.coerce.date(),
    leadDays: z.number().int().min(0).max(365).default(7),
    procedureReference: z.string().max(500).optional(),
  })
  .refine((value) => Boolean(value.assetId) !== Boolean(value.assetCategoryId), {
    message: 'Choose either a specific asset or an asset category',
  });

preventiveRouter.post(
  '/',
  requireRoles(Role.ADMINISTRATOR, Role.FACILITY_MANAGER),
  validate('body', planSchema),
  asyncHandler(async (request, response) => {
    const input = request.body as z.infer<typeof planSchema>;
    assertSiteAccess(request, input.siteId);
    const plan = await prisma.preventiveMaintenancePlan.create({ data: input });
    response.status(201).json({ data: plan });
  }),
);

preventiveRouter.post(
  '/generate-due',
  requireRoles(Role.ADMINISTRATOR, Role.FACILITY_MANAGER),
  validate('body', z.object({ cutoff: z.coerce.date().optional() })),
  asyncHandler(async (request, response) => {
    const { cutoff } = request.body as { cutoff?: Date };
    const result = await generateDuePreventiveWork(cutoff, request.authUser!.id, request.requestId);
    response.json({ data: result });
  }),
);
