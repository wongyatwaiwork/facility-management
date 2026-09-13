import { InspectionStatus, Role } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';

import { prisma } from '../../db.js';
import { asyncHandler } from '../../lib/async-handler.js';
import { notFound } from '../../lib/errors.js';
import { validate } from '../../middleware/validate.js';
import { assertSiteAccess, requireRoles, siteScopeWhere } from '../auth/authorization.js';
import {
  completeInspectionSchema,
  correctiveSchema,
  scheduleInspectionSchema,
  templateSchema,
} from './schemas.js';
import { completeInspection, createCorrectiveWork } from './service.js';

export const inspectionRouter = Router();

inspectionRouter.get(
  '/',
  asyncHandler(async (request, response) => {
    const inspections = await prisma.inspection.findMany({
      where: siteScopeWhere(request),
      include: {
        site: { select: { name: true } },
        asset: { select: { internalCode: true, name: true } },
        inspector: { select: { id: true, name: true } },
        templateVersion: { include: { template: { select: { title: true } } } },
        _count: { select: { findings: true } },
      },
      orderBy: [{ dueAt: 'asc' }, { id: 'asc' }],
    });
    response.json({ data: inspections });
  }),
);

inspectionRouter.post(
  '/templates',
  requireRoles(Role.ADMINISTRATOR, Role.FACILITY_MANAGER),
  validate('body', templateSchema),
  asyncHandler(async (request, response) => {
    const { items, reference, ...input } = request.body as z.infer<typeof templateSchema>;
    assertSiteAccess(request, input.siteId);
    const template = await prisma.inspectionTemplate.create({
      data: {
        ...input,
        versions: {
          create: {
            version: 1,
            reference,
            items: { create: items.map((item, index) => ({ ...item, position: index + 1 })) },
          },
        },
      },
      include: { versions: { include: { items: true } } },
    });
    response.status(201).json({ data: template });
  }),
);

inspectionRouter.post(
  '/',
  requireRoles(Role.ADMINISTRATOR, Role.FACILITY_MANAGER, Role.COORDINATOR),
  validate('body', scheduleInspectionSchema),
  asyncHandler(async (request, response) => {
    const input = request.body as z.infer<typeof scheduleInspectionSchema>;
    assertSiteAccess(request, input.siteId);
    const version = await prisma.inspectionTemplateVersion.findUnique({
      where: { id: input.templateVersionId },
      include: { template: true, items: { orderBy: { position: 'asc' } } },
    });
    if (!version || version.template.siteId !== input.siteId)
      throw notFound('InspectionTemplateVersion');
    const inspector = await prisma.user.findFirst({
      where: {
        id: input.inspectorId,
        isActive: true,
        siteAccess: { some: { siteId: input.siteId } },
      },
    });
    if (!inspector) throw notFound('Inspector');
    const count = await prisma.inspection.count();
    const inspection = await prisma.inspection.create({
      data: {
        ...input,
        number: `INSP-${String(count + 1).padStart(5, '0')}`,
        checklistSnapshot: version.items.map(
          ({ itemKey, label, answerType, isRequired, guidance }) => ({
            itemKey,
            label,
            answerType,
            isRequired,
            guidance,
          }),
        ),
      },
    });
    response.status(201).json({ data: inspection });
  }),
);

inspectionRouter.get(
  '/:id',
  validate('params', z.object({ id: z.string() })),
  asyncHandler(async (request, response) => {
    const inspection = await prisma.inspection.findFirst({
      where: { id: request.params.id, ...siteScopeWhere(request) },
      include: {
        site: true,
        asset: true,
        location: true,
        inspector: { select: { id: true, name: true } },
        responses: true,
        findings: { include: { correctiveWorkOrder: true } },
        documents: true,
      },
    });
    if (!inspection) throw notFound('Inspection');
    response.json({ data: inspection });
  }),
);

inspectionRouter.post(
  '/:id/complete',
  validate('params', z.object({ id: z.string() })),
  validate('body', completeInspectionSchema),
  asyncHandler(async (request, response) => {
    const result = await completeInspection(
      request,
      request.params.id,
      request.body as z.infer<typeof completeInspectionSchema>,
    );
    response.json({ data: result });
  }),
);

inspectionRouter.post(
  '/findings/:id/work-order',
  requireRoles(Role.ADMINISTRATOR, Role.FACILITY_MANAGER, Role.COORDINATOR),
  validate('params', z.object({ id: z.string() })),
  validate('body', correctiveSchema),
  asyncHandler(async (request, response) => {
    const result = await createCorrectiveWork(
      request,
      request.params.id,
      request.body as z.infer<typeof correctiveSchema>,
    );
    response.status(201).json({ data: result });
  }),
);

void InspectionStatus;
