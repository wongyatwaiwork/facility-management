import type { RequestHandler } from 'express';

import { config } from '../config.js';
import { AppError } from '../lib/errors.js';

const safeMethods = new Set(['GET', 'HEAD', 'OPTIONS']);

export const verifyOrigin: RequestHandler = (request, _response, next) => {
  if (safeMethods.has(request.method) || config.NODE_ENV === 'test') {
    next();
    return;
  }

  const origin = request.header('origin');
  if (origin !== config.WEB_ORIGIN) {
    next(new AppError(403, 'INVALID_ORIGIN', 'Request origin is not allowed'));
    return;
  }

  next();
};
