import { Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const integration = describe.runIf(Boolean(process.env.TEST_DATABASE_URL));

integration('Express 5 validated query routes', () => {
  let prisma: import('@prisma/client').PrismaClient;
  let app: import('express').Express;
  const siteId = 'itest_query_site';
  const userId = 'itest_query_manager';

  beforeAll(async () => {
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
    process.env.NODE_ENV = 'test';
    process.env.WEB_ORIGIN = 'http://localhost:5173';
    ({ prisma } = await import('../../src/db.js'));
    const appModule = await import('../../src/app.js');
    app = appModule.createApp();

    const passwordHash = await bcrypt.hash('Integration!2026', 4);
    await prisma.site.create({
      data: {
        id: siteId,
        code: 'IT-Q',
        name: 'Query Validation Site',
        city: 'Demo',
        region: 'Demo',
      },
    });
    await prisma.user.create({
      data: {
        id: userId,
        email: 'itest-query@example.com',
        name: 'Query Integration Manager',
        passwordHash,
        role: Role.FACILITY_MANAGER,
        siteAccess: { create: { siteId } },
      },
    });
  });

  afterAll(async () => {
    await prisma.session.deleteMany({ where: { userId } });
    await prisma.auditLog.deleteMany({ where: { actorId: userId } });
    await prisma.workOrderStatusHistory.deleteMany({ where: { workOrder: { siteId } } });
    await prisma.workOrder.deleteMany({ where: { siteId } });
    await prisma.userSiteAccess.deleteMany({ where: { userId } });
    await prisma.user.delete({ where: { id: userId } });
    await prisma.site.delete({ where: { id: siteId } });
    await prisma.$disconnect();
  });

  it('supports validated site and work-order list queries under Express 5', async () => {
    const agent = request.agent(app);
    await agent
      .post('/api/auth/login')
      .send({ email: 'itest-query@example.com', password: 'Integration!2026' })
      .expect(200);

    const sites = await agent.get('/api/sites?search=Query%20Validation').expect(200);
    expect(sites.body.data).toHaveLength(1);
    expect(sites.body.data[0]).toMatchObject({ id: siteId, name: 'Query Validation Site' });

    const workOrders = await agent.get('/api/work-orders?search=&status=&page=1').expect(200);
    expect(workOrders.body).toMatchObject({ data: [], meta: { page: 1, total: 0 } });
  });

  it('rejects malformed date-only input when creating a work order', async () => {
    const agent = request.agent(app);
    await agent
      .post('/api/auth/login')
      .send({ email: 'itest-query@example.com', password: 'Integration!2026' })
      .expect(200);

    const response = await agent
      .post('/api/work-orders')
      .send({
        title: 'Invalid due date',
        description: 'This request must fail API validation.',
        type: 'REACTIVE',
        priority: 'MEDIUM',
        siteId,
        dueDate: '2026-02-30',
      })
      .expect(400);

    expect(response.body.error).toMatchObject({ code: 'VALIDATION_ERROR' });
  });

  it('stores a manual due date as the end of that day in the site timezone', async () => {
    const agent = request.agent(app);
    await agent
      .post('/api/auth/login')
      .send({ email: 'itest-query@example.com', password: 'Integration!2026' })
      .expect(200);

    const response = await agent
      .post('/api/work-orders')
      .send({
        title: 'Berlin calendar deadline',
        description: 'Verify the persisted timezone-aware deadline.',
        type: 'REACTIVE',
        priority: 'MEDIUM',
        siteId,
        dueDate: '2026-09-15',
      })
      .expect(201);

    expect(response.body.data.dueAt).toBe('2026-09-15T21:59:59.999Z');
  });
});
