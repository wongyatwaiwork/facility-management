import { Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const integration = describe.runIf(Boolean(process.env.TEST_DATABASE_URL));

integration('PostgreSQL authentication and object authorization', () => {
  let prisma: import('@prisma/client').PrismaClient;
  let app: import('express').Express;
  const ids = {
    siteA: 'itest_site_a',
    siteB: 'itest_site_b',
    buildingB: 'itest_building_b',
    locationB: 'itest_location_b',
    category: 'itest_category',
    assetB: 'itest_asset_b',
    manager: 'itest_manager',
    technician: 'itest_technician',
  };

  beforeAll(async () => {
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
    process.env.NODE_ENV = 'test';
    process.env.WEB_ORIGIN = 'http://localhost:5173';
    ({ prisma } = await import('../../src/db.js'));
    const appModule = await import('../../src/app.js');
    app = appModule.createApp();
    const passwordHash = await bcrypt.hash('Integration!2026', 4);
    await prisma.site.createMany({
      data: [
        { id: ids.siteA, code: 'IT-A', name: 'Integration Site A', city: 'Demo', region: 'Demo' },
        { id: ids.siteB, code: 'IT-B', name: 'Integration Site B', city: 'Demo', region: 'Demo' },
      ],
    });
    await prisma.user.createMany({
      data: [
        {
          id: ids.manager,
          email: 'itest-manager@example.com',
          name: 'Integration Manager',
          passwordHash,
          role: Role.FACILITY_MANAGER,
        },
        {
          id: ids.technician,
          email: 'itest-tech@example.com',
          name: 'Integration Technician',
          passwordHash,
          role: Role.TECHNICIAN,
        },
      ],
    });
    await prisma.userSiteAccess.createMany({
      data: [
        { userId: ids.manager, siteId: ids.siteA },
        { userId: ids.technician, siteId: ids.siteA },
      ],
    });
    await prisma.assetCategory.create({
      data: { id: ids.category, code: 'ITEST', name: 'Integration category' },
    });
    await prisma.building.create({
      data: { id: ids.buildingB, siteId: ids.siteB, code: 'IT-B1', name: 'Building B' },
    });
    await prisma.location.create({
      data: {
        id: ids.locationB,
        siteId: ids.siteB,
        buildingId: ids.buildingB,
        code: 'IT-L1',
        name: 'Room B',
        kind: 'ROOM',
      },
    });
    await prisma.asset.create({
      data: {
        id: ids.assetB,
        internalCode: 'IT-ASSET-B',
        name: 'Scoped asset B',
        siteId: ids.siteB,
        buildingId: ids.buildingB,
        locationId: ids.locationB,
        categoryId: ids.category,
        responsibleTeam: 'Integration',
      },
    });
  });

  afterAll(async () => {
    await prisma.session.deleteMany({ where: { userId: { in: [ids.manager, ids.technician] } } });
    await prisma.auditLog.deleteMany({
      where: {
        OR: [
          { actorId: { in: [ids.manager, ids.technician] } },
          { entityId: { in: [ids.manager, ids.technician] } },
        ],
      },
    });
    await prisma.asset.delete({ where: { id: ids.assetB } });
    await prisma.location.delete({ where: { id: ids.locationB } });
    await prisma.building.delete({ where: { id: ids.buildingB } });
    await prisma.assetCategory.delete({ where: { id: ids.category } });
    await prisma.userSiteAccess.deleteMany({
      where: { userId: { in: [ids.manager, ids.technician] } },
    });
    await prisma.user.deleteMany({ where: { id: { in: [ids.manager, ids.technician] } } });
    await prisma.site.deleteMany({ where: { id: { in: [ids.siteA, ids.siteB] } } });
    await prisma.$disconnect();
  });

  it('returns 401 without a session', async () => {
    await request(app).get('/api/assets').expect(401);
  });

  it('returns 403 when a technician calls a manager command', async () => {
    const agent = request.agent(app);
    await agent
      .post('/api/auth/login')
      .send({ email: 'itest-tech@example.com', password: 'Integration!2026' })
      .expect(200);
    await agent
      .post('/api/work-orders')
      .send({
        title: 'Not permitted',
        description: 'Backend must reject this request',
        type: 'REACTIVE',
        priority: 'LOW',
        siteId: ids.siteA,
        dueDate: '2026-09-15',
      })
      .expect(403);
  });

  it('hides a detail object outside the user site scope', async () => {
    const agent = request.agent(app);
    await agent
      .post('/api/auth/login')
      .send({ email: 'itest-manager@example.com', password: 'Integration!2026' })
      .expect(200);
    await agent.get(`/api/assets/${ids.assetB}`).expect(404);
  });
});
