import { Prisma } from '@prisma/client';
import type { ErrorRequestHandler } from 'express';

import { AppError } from '../lib/errors.js';
import { logger } from '../lib/logger.js';

export const errorHandler: ErrorRequestHandler = (error, request, response, _next) => {
  if (error instanceof AppError) {
    response.status(error.status).json({
      error: { code: error.code, message: error.message, params: error.params },
      requestId: request.requestId,
    });
    return;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
    response.status(409).json({
      error: { code: 'CONFLICT', message: 'A record with that identifier already exists' },
      requestId: request.requestId,
    });
    return;
  }

  logger.error({ err: error, requestId: request.requestId }, 'Unhandled request error');
  response.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' },
    requestId: request.requestId,
  });
};
