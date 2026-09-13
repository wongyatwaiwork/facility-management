import { RecurrenceInterval, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const integration = describe.runIf(Boolean(process.env.TEST_DATABASE_URL));

integration('PostgreSQL preventive generation', () => {
  let prisma: import('@prisma/client').PrismaClient;
  let generateDuePreventiveWork: typeof import('../../src/modules/preventive/service.js').generateDuePreventiveWork;
  const siteId = 'itest_preventive_site';
  const userId = 'itest_preventive_manager';
  const categoryId = 'itest_preventive_category';
  const planId = 'itest_preventive_plan';
  let workOrderIds: string[] = [];

  beforeAll(async () => {
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
    process.env.NODE_ENV = 'test';
    ({ prisma } = await import('../../src/db.js'));
    ({ generateDuePreventiveWork } = await import('../../src/modules/preventive/service.js'));
    const passwordHash = await bcrypt.hash('Integration!2026', 4);
    await prisma.site.create({
      data: {
        id: siteId,
        code: 'IT-PM',
        name: 'Preventive integration site',
        city: 'Demo',
        region: 'Demo',
      },
    });
    await prisma.user.create({
      data: {
        id: userId,
        email: 'itest-preventive@example.com',
        name: 'Preventive Manager',
        passwordHash,
        role: Role.FACILITY_MANAGER,
      },
    });
    await prisma.userSiteAccess.create({ data: { userId, siteId } });
    await prisma.assetCategory.create({
      data: { id: categoryId, code: 'IT-PM-CAT', name: 'Preventive integration category' },
    });
    await prisma.preventiveMaintenancePlan.create({
      data: {
        id: planId,
        title: 'Idempotent integration plan',
        instructions: 'Generate exactly once for this occurrence.',
        siteId,
        assetCategoryId: categoryId,
        recurrence: RecurrenceInterval.MONTHLY,
        timezone: 'Europe/Berlin',
        nextDueAt: new Date(Date.now() - 60 * 60 * 1000),
      },
    });
  });

  afterAll(async () => {
    const occurrences = await prisma.maintenanceOccurrence.findMany({
      where: { planId },
      select: { workOrderId: true },
    });
    workOrderIds = occurrences.map((item) => item.workOrderId);
    await prisma.auditLog.deleteMany({ where: { siteId } });
    await prisma.maintenanceOccurrence.deleteMany({ where: { planId } });
    await prisma.workOrderStatusHistory.deleteMany({
      where: { workOrderId: { in: workOrderIds } },
    });
    await prisma.workOrder.deleteMany({ where: { id: { in: workOrderIds } } });
    await prisma.preventiveMaintenancePlan.delete({ where: { id: planId } });
    await prisma.assetCategory.delete({ where: { id: categoryId } });
    await prisma.userSiteAccess.delete({ where: { userId_siteId: { userId, siteId } } });
    await prisma.user.delete({ where: { id: userId } });
    await prisma.site.delete({ where: { id: siteId } });
    await prisma.$disconnect();
  });

  it('creates one occurrence and work order when the generator is rerun', async () => {
    const cutoff = new Date();
    const first = await generateDuePreventiveWork(cutoff, userId, 'itest-request-1');
    const second = await generateDuePreventiveWork(cutoff, userId, 'itest-request-2');
    expect(first.generated).toHaveLength(1);
    expect(second.generated).toHaveLength(0);
    expect(await prisma.maintenanceOccurrence.count({ where: { planId } })).toBe(1);
  });
});
