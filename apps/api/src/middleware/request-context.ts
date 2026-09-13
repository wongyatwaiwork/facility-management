import { randomUUID } from 'node:crypto';

import type { RequestHandler } from 'express';

export const requestContext: RequestHandler = (request, response, next) => {
  const supplied = request.header('x-request-id');
  request.requestId = supplied && supplied.length <= 100 ? supplied : randomUUID();
  response.setHeader('x-request-id', request.requestId);
  next();
};
