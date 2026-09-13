import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';

import { config } from './config.js';
import { prisma } from './db.js';
import { AppError } from './lib/errors.js';
import { logger } from './lib/logger.js';
import { verifyOrigin } from './middleware/csrf.js';
import { errorHandler } from './middleware/error-handler.js';
import { requestContext } from './middleware/request-context.js';
import { assetRouter } from './modules/assets/router.js';
import { auditRouter } from './modules/audit/router.js';
import { authRouter } from './modules/auth/router.js';
import { authenticate } from './modules/auth/session.js';
import { contractorRouter } from './modules/contractors/router.js';
import { dashboardRouter } from './modules/dashboard/router.js';
import { facilitiesRouter } from './modules/facilities/router.js';
import { inspectionRouter } from './modules/inspections/router.js';
import { preventiveRouter } from './modules/preventive/router.js';
import { userRouter } from './modules/users/router.js';
import { workOrderRouter } from './modules/work-orders/router.js';

export const createApp = () => {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(requestContext);
  app.use(pinoHttp({ logger, customProps: (request) => ({ requestId: request.requestId }) }));
  app.use(helmet());
  app.use(
    cors({
      origin: config.WEB_ORIGIN,
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'OPTIONS'],
    }),
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());
  app.use(verifyOrigin);

  app.get('/api/health', (_request, response) => {
    response.json({ status: 'ok', service: 'musterwerk-api' });
  });
  app.get('/api/ready', async (_request, response) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      response.json({ status: 'ready' });
    } catch {
      response.status(503).json({ status: 'not_ready' });
    }
  });

  app.use(
    '/api/auth',
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: config.NODE_ENV === 'test' ? 1000 : 30,
      standardHeaders: true,
      legacyHeaders: false,
    }),
    authRouter,
  );
  app.use('/api', authenticate);
  app.use('/api/sites', facilitiesRouter);
  app.use('/api/assets', assetRouter);
  app.use('/api/work-orders', workOrderRouter);
  app.use('/api/preventive-plans', preventiveRouter);
  app.use('/api/inspections', inspectionRouter);
  app.use('/api/contractors', contractorRouter);
  app.use('/api/dashboard', dashboardRouter);
  app.use('/api/audit-logs', auditRouter);
  app.use('/api/users', userRouter);

  app.use((_request, _response, next) =>
    next(new AppError(404, 'ROUTE_NOT_FOUND', 'Route not found')),
  );
  app.use(errorHandler);
  return app;
};
