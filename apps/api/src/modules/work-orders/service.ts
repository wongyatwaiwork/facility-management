import { randomUUID } from 'node:crypto';

import { Prisma, Role, WorkOrderStatus } from '@prisma/client';
import type { Request } from 'express';
import type { z } from 'zod';

import { prisma } from '../../db.js';
import { dateOnlyToEndOfDayUtc } from '../../lib/calendar-date.js';
import { AppError, notFound } from '../../lib/errors.js';
import { assertSiteAccess, siteScopeWhere } from '../auth/authorization.js';
import { validateTransition } from './domain.js';
import type { assignmentSchema, transitionSchema, workOrderCreateSchema } from './schemas.js';

const makeNumber = (prefix = 'WO') =>
  `${prefix}-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${randomUUID().slice(0, 6).toUpperCase()}`;

export async function validateHierarchy(input: {
  siteId: string;
  buildingId?: string;
  locationId?: string;
  assetId?: string;
}) {
  const [building, location, asset] = await Promise.all([
    input.buildingId ? prisma.building.findUnique({ where: { id: input.buildingId } }) : null,
    input.locationId ? prisma.location.findUnique({ where: { id: input.locationId } }) : null,
    input.assetId ? prisma.asset.findUnique({ where: { id: input.assetId } }) : null,
  ]);
  if (building && building.siteId !== input.siteId) {
    throw new AppError(400, 'HIERARCHY_MISMATCH', 'Building does not belong to the site');
  }
  if (
    location &&
    (location.siteId !== input.siteId ||
      (input.buildingId && location.buildingId !== input.buildingId))
  ) {
    throw new AppError(
      400,
      'HIERARCHY_MISMATCH',
      'Location does not belong to the selected hierarchy',
    );
  }
  if (
    asset &&
    (asset.siteId !== input.siteId || (input.locationId && asset.locationId !== input.locationId))
  ) {
    throw new AppError(
      400,
      'HIERARCHY_MISMATCH',
      'Asset does not belong to the selected hierarchy',
    );
  }
  if (input.assetId && (!asset || !asset.isActive)) {
    throw new AppError(409, 'ASSET_INACTIVE', 'Inactive assets cannot receive new work');
  }
}

export async function createWorkOrder(
  request: Request,
  input: z.infer<typeof workOrderCreateSchema>,
) {
  if (!request.authUser) throw new AppError(401, 'AUTH_REQUIRED', 'Authentication required');
  assertSiteAccess(request, input.siteId);
  const site = await prisma.site.findUnique({
    where: { id: input.siteId },
    select: { timezone: true },
  });
  if (!site) throw notFound('Site');
  await validateHierarchy(input);
  const { dueDate, ...workOrderData } = input;
  const dueAt = dateOnlyToEndOfDayUtc(dueDate, site.timezone);
  return prisma.$transaction(async (transaction) => {
    const workOrder = await transaction.workOrder.create({
      data: { ...workOrderData, dueAt, number: makeNumber(), reporterId: request.authUser!.id },
    });
    await transaction.workOrderStatusHistory.create({
      data: {
        workOrderId: workOrder.id,
        toStatus: WorkOrderStatus.OPEN,
        actorId: request.authUser!.id,
        note: 'Work order created',
      },
    });
    await transaction.auditLog.create({
      data: {
        actorId: request.authUser!.id,
        siteId: input.siteId,
        action: 'WORK_ORDER_CREATED',
        entityType: 'WorkOrder',
        entityId: workOrder.id,
        requestId: request.requestId,
        summary: {
          number: workOrder.number,
          priority: workOrder.priority,
          type: workOrder.type,
        },
      },
    });
    return workOrder;
  });
}

export async function assignWorkOrder(
  request: Request,
  id: string,
  input: z.infer<typeof assignmentSchema>,
) {
  if (!request.authUser) throw new AppError(401, 'AUTH_REQUIRED', 'Authentication required');
  const workOrder = await prisma.workOrder.findFirst({
    where: { id, ...siteScopeWhere(request) },
  });
  if (!workOrder) throw notFound('WorkOrder');
  const assignableStatuses = new Set<WorkOrderStatus>([
    WorkOrderStatus.OPEN,
    WorkOrderStatus.TRIAGED,
    WorkOrderStatus.ASSIGNED,
  ]);
  if (!assignableStatuses.has(workOrder.status)) {
    throw new AppError(
      409,
      'ASSIGNMENT_NOT_ALLOWED',
      'Work cannot be assigned in its current status',
    );
  }

  if (input.technicianId) {
    const technician = await prisma.user.findFirst({
      where: {
        id: input.technicianId,
        isActive: true,
        role: Role.TECHNICIAN,
        siteAccess: { some: { siteId: workOrder.siteId } },
      },
    });
    if (!technician) {
      throw new AppError(409, 'TECHNICIAN_INELIGIBLE', 'Technician is not eligible for this site');
    }
  }
  if (input.contractorId) {
    const contractor = await prisma.contractor.findFirst({
      where: {
        id: input.contractorId,
        isActive: true,
        approvedForDemo: true,
        sites: { some: { siteId: workOrder.siteId } },
      },
    });
    if (!contractor) {
      throw new AppError(
        409,
        'CONTRACTOR_INELIGIBLE',
        'Contractor is not active and approved for this site',
      );
    }
  }

  return prisma.$transaction(async (transaction) => {
    const updated = await transaction.workOrder.updateMany({
      where: { id, version: input.version },
      data: {
        assignedTechnicianId: input.technicianId ?? null,
        contractorId: input.contractorId ?? null,
        status: WorkOrderStatus.ASSIGNED,
        version: { increment: 1 },
      },
    });
    if (updated.count !== 1) {
      throw new AppError(409, 'STALE_VERSION', 'The work order was updated by another user');
    }
    if (workOrder.status !== WorkOrderStatus.ASSIGNED) {
      await transaction.workOrderStatusHistory.create({
        data: {
          workOrderId: id,
          fromStatus: workOrder.status,
          toStatus: WorkOrderStatus.ASSIGNED,
          actorId: request.authUser!.id,
          note: input.note,
        },
      });
    }
    await transaction.auditLog.create({
      data: {
        actorId: request.authUser!.id,
        siteId: workOrder.siteId,
        action: 'WORK_ORDER_ASSIGNED',
        entityType: 'WorkOrder',
        entityId: id,
        requestId: request.requestId,
        summary: {
          technicianId: input.technicianId ?? null,
          contractorId: input.contractorId ?? null,
        },
      },
    });
    return transaction.workOrder.findUniqueOrThrow({ where: { id } });
  });
}

export async function transitionWorkOrder(
  request: Request,
  id: string,
  input: z.infer<typeof transitionSchema>,
) {
  if (!request.authUser) throw new AppError(401, 'AUTH_REQUIRED', 'Authentication required');
  const current = await prisma.workOrder.findFirst({
    where: { id, ...siteScopeWhere(request) },
  });
  if (!current) throw notFound('WorkOrder');
  if (current.version !== input.version) {
    throw new AppError(409, 'STALE_VERSION', 'The work order was updated by another user');
  }

  validateTransition({
    from: current.status,
    to: input.toStatus,
    actorRole: request.authUser.role,
    actorId: request.authUser.id,
    assignedTechnicianId: current.assignedTechnicianId,
    completedById: current.completedById,
    completionNotes: input.completionNotes,
    actualMinutes: input.actualMinutes,
    cancellationReason: input.cancellationReason,
  });

  const now = new Date();
  const data: Prisma.WorkOrderUncheckedUpdateManyInput = {
    status: input.toStatus,
    version: { increment: 1 },
  };
  if (input.toStatus === WorkOrderStatus.IN_PROGRESS && !current.actualStartAt) {
    data.actualStartAt = now;
  }
  if (input.toStatus === WorkOrderStatus.COMPLETED) {
    data.completedAt = now;
    data.completedById = request.authUser.id;
    data.completionNotes = input.completionNotes;
    data.actualMinutes = input.actualMinutes;
  }
  if (input.toStatus === WorkOrderStatus.VERIFIED) {
    data.verifiedAt = now;
    data.verifiedById = request.authUser.id;
  }
  if (input.toStatus === WorkOrderStatus.CANCELLED) {
    data.cancellationReason = input.cancellationReason;
  }

  return prisma.$transaction(async (transaction) => {
    const updated = await transaction.workOrder.updateMany({
      where: { id, version: input.version },
      data,
    });
    if (updated.count !== 1) {
      throw new AppError(409, 'STALE_VERSION', 'The work order was updated by another user');
    }
    await transaction.workOrderStatusHistory.create({
      data: {
        workOrderId: id,
        fromStatus: current.status,
        toStatus: input.toStatus,
        actorId: request.authUser!.id,
        note: input.note ?? input.completionNotes ?? input.cancellationReason,
      },
    });
    await transaction.auditLog.create({
      data: {
        actorId: request.authUser!.id,
        siteId: current.siteId,
        action: `WORK_ORDER_${input.toStatus}`,
        entityType: 'WorkOrder',
        entityId: id,
        requestId: request.requestId,
        summary: { from: current.status, to: input.toStatus, version: input.version + 1 },
      },
    });
    return transaction.workOrder.findUniqueOrThrow({ where: { id } });
  });
}

export { makeNumber };
