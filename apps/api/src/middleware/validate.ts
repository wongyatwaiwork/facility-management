import type { RequestHandler } from 'express';
import type { ZodTypeAny } from 'zod';

import { AppError } from '../lib/errors.js';

type Target = 'body' | 'params' | 'query';

export const validate =
  (target: Target, schema: ZodTypeAny): RequestHandler =>
  (request, _response, next) => {
    const parsed = schema.safeParse(request[target]);
    if (!parsed.success) {
      next(
        new AppError(400, 'VALIDATION_ERROR', 'Request validation failed', {
          field: parsed.error.issues[0]?.path.join('.') ?? target,
        }),
      );
      return;
    }

    if (target === 'query') {
      // Express 5 exposes query through a getter. Shadow it with the validated,
      // coerced value instead of assigning to the getter-only prototype property.
      Object.defineProperty(request, 'query', {
        value: parsed.data,
        configurable: true,
        enumerable: true,
      });
    } else {
      request[target] = parsed.data;
    }
    next();
  };
