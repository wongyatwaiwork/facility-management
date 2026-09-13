import { AssetCriticality, AssetStatus, Prisma, Role } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';

import { prisma } from '../../db.js';
import { asyncHandler } from '../../lib/async-handler.js';
import { notFound } from '../../lib/errors.js';
import { paginationMeta } from '../../lib/pagination.js';
import { validate } from '../../middleware/validate.js';
import { assertSiteAccess, requireRoles, siteScopeWhere } from '../auth/authorization.js';
import { validateHierarchy } from '../work-orders/service.js';

export const assetRouter = Router();

const assetQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(100).optional(),
  siteId: z.string().optional(),
  categoryId: z.string().optional(),
  status: z.nativeEnum(AssetStatus).optional(),
  criticality: z.nativeEnum(AssetCriticality).optional(),
  sort: z.enum(['name', 'internalCode', 'updatedAt', 'criticality']).default('name'),
  direction: z.enum(['asc', 'desc']).default('asc'),
});

const assetSchema = z.object({
  internalCode: z.string().trim().min(2).max(40),
  name: z.string().trim().min(2).max(160),
  siteId: z.string(),
  buildingId: z.string(),
  locationId: z.string(),
  categoryId: z.string(),
  manufacturer: z.string().trim().max(120).optional(),
  model: z.string().trim().max(120).optional(),
  status: z.nativeEnum(AssetStatus).default(AssetStatus.OPERATIONAL),
  criticality: z.nativeEnum(AssetCriticality).default(AssetCriticality.MEDIUM),
  responsibleTeam: z.string().trim().min(2).max(100),
  notes: z.string().trim().max(2000).optional(),
  tags: z.array(z.string().max(40)).max(20).default([]),
});

assetRouter.get(
  '/',
  validate('query', assetQuerySchema),
  asyncHandler(async (request, response) => {
    const query = request.query as unknown as z.infer<typeof assetQuerySchema>;
    const where: Prisma.AssetWhereInput = {
      ...siteScopeWhere(request),
      ...(query.siteId ? { siteId: query.siteId } : {}),
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.criticality ? { criticality: query.criticality } : {}),
      ...(query.search
        ? {
            OR: ['internalCode', 'name', 'manufacturer', 'model'].map((field) => ({
              [field]: { contains: query.search, mode: 'insensitive' },
            })),
          }
        : {}),
    };
    const [data, total] = await prisma.$transaction([
      prisma.asset.findMany({
        where,
        include: {
          site: { select: { name: true } },
          location: { select: { name: true } },
          category: true,
        },
        orderBy: [{ [query.sort]: query.direction }, { id: 'asc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      prisma.asset.count({ where }),
    ]);
    response.json({ data, meta: paginationMeta(query.page, query.pageSize, total) });
  }),
);

assetRouter.post(
  '/',
  requireRoles(Role.ADMINISTRATOR, Role.FACILITY_MANAGER, Role.COORDINATOR),
  validate('body', assetSchema),
  asyncHandler(async (request, response) => {
    const input = request.body as z.infer<typeof assetSchema>;
    assertSiteAccess(request, input.siteId);
    await validateHierarchy(input);
    const asset = await prisma.$transaction(async (transaction) => {
      const created = await transaction.asset.create({ data: input });
      await transaction.auditLog.create({
        data: {
          actorId: request.authUser!.id,
          siteId: input.siteId,
          action: 'ASSET_CREATED',
          entityType: 'Asset',
          entityId: created.id,
          requestId: request.requestId,
          summary: { internalCode: created.internalCode },
        },
      });
      return created;
    });
    response.status(201).json({ data: asset });
  }),
);

assetRouter.get(
  '/:id',
  validate('params', z.object({ id: z.string() })),
  asyncHandler(async (request, response) => {
    const asset = await prisma.asset.findFirst({
      where: { id: request.params.id, ...siteScopeWhere(request) },
      include: {
        site: true,
        building: true,
        location: true,
        category: true,
        workOrders: {
          include: { assignedTechnician: { select: { name: true } } },
          orderBy: { createdAt: 'desc' },
        },
        preventivePlans: { orderBy: { nextDueAt: 'asc' } },
        inspections: { orderBy: { dueAt: 'desc' }, take: 20 },
        documents: true,
      },
    });
    if (!asset) throw notFound('Asset');
    response.json({ data: asset });
  }),
);
