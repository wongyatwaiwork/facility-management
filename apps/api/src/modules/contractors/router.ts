import { Role } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';

import { prisma } from '../../db.js';
import { asyncHandler } from '../../lib/async-handler.js';
import { validate } from '../../middleware/validate.js';
import { requireRoles } from '../auth/authorization.js';

export const contractorRouter = Router();

contractorRouter.get(
  '/',
  asyncHandler(async (request, response) => {
    const allowedSiteIds =
      request.authUser!.role === Role.ADMINISTRATOR ? undefined : request.authUser!.siteIds;
    const contractors = await prisma.contractor.findMany({
      where: allowedSiteIds ? { sites: { some: { siteId: { in: allowedSiteIds } } } } : {},
      include: {
        sites: { include: { site: { select: { id: true, name: true } } } },
        _count: { select: { workOrders: true } },
      },
      orderBy: [{ isActive: 'desc' }, { companyName: 'asc' }],
    });
    response.json({ data: contractors });
  }),
);

const contractorSchema = z.object({
  companyName: z.string().trim().min(2).max(160),
  email: z.string().email(),
  phone: z.string().max(40).optional(),
  serviceCategories: z.array(z.string().max(80)).max(20),
  siteIds: z.array(z.string()).min(1),
  isActive: z.boolean().default(true),
  approvedForDemo: z.boolean().default(true),
  notes: z.string().max(1000).optional(),
});

contractorRouter.post(
  '/',
  requireRoles(Role.ADMINISTRATOR, Role.FACILITY_MANAGER),
  validate('body', contractorSchema),
  asyncHandler(async (request, response) => {
    const { siteIds, ...input } = request.body as z.infer<typeof contractorSchema>;
    const contractor = await prisma.contractor.create({
      data: { ...input, sites: { create: siteIds.map((siteId) => ({ siteId })) } },
    });
    response.status(201).json({ data: contractor });
  }),
);
