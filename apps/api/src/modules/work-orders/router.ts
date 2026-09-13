import { Prisma, Role, WorkOrderPriority } from '@prisma/client';
import { Router } from 'express';
import type { z } from 'zod';

import { prisma } from '../../db.js';
import { asyncHandler } from '../../lib/async-handler.js';
import { notFound } from '../../lib/errors.js';
import { paginationMeta } from '../../lib/pagination.js';
import { validate } from '../../middleware/validate.js';
import { requireRoles, siteScopeWhere } from '../auth/authorization.js';
import {
  assignmentSchema,
  idParamsSchema,
  transitionSchema,
  workOrderCreateSchema,
  workOrderQuerySchema,
} from './schemas.js';
import { assignWorkOrder, createWorkOrder, transitionWorkOrder } from './service.js';

export const workOrderRouter = Router();

workOrderRouter.get(
  '/',
  validate('query', workOrderQuerySchema),
  asyncHandler(async (request, response) => {
    const query = request.query as unknown as z.infer<typeof workOrderQuerySchema>;
    const scoped = siteScopeWhere(request);
    const where: Prisma.WorkOrderWhereInput = {
      ...scoped,
      ...(query.siteId ? { siteId: query.siteId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.priority ? { priority: query.priority } : {}),
      ...(query.type ? { type: query.type } : {}),
      ...(query.assigneeId ? { assignedTechnicianId: query.assigneeId } : {}),
      ...(query.contractorId ? { contractorId: query.contractorId } : {}),
      ...(query.mine === 'true' ? { assignedTechnicianId: request.authUser!.id } : {}),
      ...(query.dueFrom || query.dueTo
        ? {
            dueAt: {
              ...(query.dueFrom ? { gte: query.dueFrom } : {}),
              ...(query.dueTo ? { lte: query.dueTo } : {}),
            },
          }
        : {}),
      ...(query.search
        ? {
            OR: [
              { number: { contains: query.search, mode: 'insensitive' } },
              { title: { contains: query.search, mode: 'insensitive' } },
              { asset: { name: { contains: query.search, mode: 'insensitive' } } },
              { asset: { internalCode: { contains: query.search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };
    const priorityOrder = query.sort === 'priority';
    const orderBy: Prisma.WorkOrderOrderByWithRelationInput[] = priorityOrder
      ? [{ priority: query.direction }, { dueAt: 'asc' }, { id: 'asc' }]
      : [{ [query.sort]: query.direction }, { id: 'asc' }];
    const [data, total] = await prisma.$transaction([
      prisma.workOrder.findMany({
        where,
        include: {
          site: { select: { name: true, timezone: true } },
          asset: { select: { internalCode: true, name: true } },
          assignedTechnician: { select: { id: true, name: true } },
          contractor: { select: { id: true, companyName: true } },
        },
        orderBy,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      prisma.workOrder.count({ where }),
    ]);
    response.json({ data, meta: paginationMeta(query.page, query.pageSize, total) });
  }),
);

workOrderRouter.post(
  '/',
  requireRoles(Role.ADMINISTRATOR, Role.FACILITY_MANAGER, Role.COORDINATOR),
  validate('body', workOrderCreateSchema),
  asyncHandler(async (request, response) => {
    const result = await createWorkOrder(
      request,
      request.body as z.infer<typeof workOrderCreateSchema>,
    );
    response.status(201).json({ data: result });
  }),
);

workOrderRouter.get(
  '/:id',
  validate('params', idParamsSchema),
  asyncHandler(async (request, response) => {
    const workOrder = await prisma.workOrder.findFirst({
      where: { id: request.params.id, ...siteScopeWhere(request) },
      include: {
        site: true,
        building: true,
        location: true,
        asset: true,
        reporter: { select: { id: true, name: true } },
        assignedTechnician: { select: { id: true, name: true } },
        contractor: true,
        statusHistory: {
          include: { actor: { select: { name: true } } },
          orderBy: { createdAt: 'asc' },
        },
        documents: true,
      },
    });
    if (!workOrder) throw notFound('WorkOrder');
    response.json({ data: workOrder });
  }),
);

workOrderRouter.post(
  '/:id/assignments',
  requireRoles(Role.ADMINISTRATOR, Role.FACILITY_MANAGER, Role.COORDINATOR),
  validate('params', idParamsSchema),
  validate('body', assignmentSchema),
  asyncHandler(async (request, response) => {
    const result = await assignWorkOrder(
      request,
      request.params.id,
      request.body as z.infer<typeof assignmentSchema>,
    );
    response.json({ data: result });
  }),
);

workOrderRouter.post(
  '/:id/transitions',
  validate('params', idParamsSchema),
  validate('body', transitionSchema),
  asyncHandler(async (request, response) => {
    const result = await transitionWorkOrder(
      request,
      request.params.id,
      request.body as z.infer<typeof transitionSchema>,
    );
    response.json({ data: result });
  }),
);

void WorkOrderPriority;
