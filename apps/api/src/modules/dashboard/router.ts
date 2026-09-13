import { InspectionStatus, Role, WorkOrderStatus } from '@prisma/client';
import { Router } from 'express';

import { prisma } from '../../db.js';
import { asyncHandler } from '../../lib/async-handler.js';
import { siteScopeWhere } from '../auth/authorization.js';

export const dashboardRouter = Router();

dashboardRouter.get(
  '/summary',
  asyncHandler(async (request, response) => {
    const scope = siteScopeWhere(request);
    const now = new Date();
    const next30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const terminal = [
      WorkOrderStatus.CLOSED,
      WorkOrderStatus.CANCELLED,
      WorkOrderStatus.COMPLETED,
      WorkOrderStatus.VERIFIED,
    ];
    const technicianFilter =
      request.authUser!.role === Role.TECHNICIAN
        ? { assignedTechnicianId: request.authUser!.id }
        : {};
    const workWhere = { ...scope, ...technicianFilter };

    const [
      openByStatus,
      openByPriority,
      overdueCount,
      dueSoonCount,
      inspectionDueCount,
      inspectionOverdueCount,
      recentWork,
      recentActivity,
    ] = await prisma.$transaction([
      prisma.workOrder.groupBy({
        by: ['status'],
        where: {
          ...workWhere,
          status: { notIn: [WorkOrderStatus.CLOSED, WorkOrderStatus.CANCELLED] },
        },
        orderBy: { status: 'asc' },
        _count: true,
      }),
      prisma.workOrder.groupBy({
        by: ['priority'],
        where: {
          ...workWhere,
          status: { notIn: [WorkOrderStatus.CLOSED, WorkOrderStatus.CANCELLED] },
        },
        orderBy: { priority: 'asc' },
        _count: true,
      }),
      prisma.workOrder.count({
        where: { ...workWhere, dueAt: { lt: now }, status: { notIn: terminal } },
      }),
      prisma.workOrder.count({
        where: {
          ...workWhere,
          dueAt: { gte: now, lte: next30Days },
          status: { notIn: terminal },
        },
      }),
      prisma.inspection.count({
        where: {
          ...scope,
          dueAt: { gte: now, lte: next30Days },
          status: { in: [InspectionStatus.SCHEDULED, InspectionStatus.IN_PROGRESS] },
        },
      }),
      prisma.inspection.count({
        where: {
          ...scope,
          dueAt: { lt: now },
          status: { in: [InspectionStatus.SCHEDULED, InspectionStatus.IN_PROGRESS] },
        },
      }),
      prisma.workOrder.findMany({
        where: workWhere,
        include: {
          site: { select: { name: true, timezone: true } },
          assignedTechnician: { select: { name: true } },
        },
        orderBy: { updatedAt: 'desc' },
        take: 6,
      }),
      prisma.auditLog.findMany({
        where: scope,
        include: { actor: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 8,
      }),
    ]);
    response.json({
      data: {
        openByStatus,
        openByPriority,
        overdueCount,
        dueSoonCount,
        inspectionDueCount,
        inspectionOverdueCount,
        recentWork,
        recentActivity,
      },
    });
  }),
);
