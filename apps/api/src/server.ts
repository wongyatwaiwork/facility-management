import { createServer } from 'node:http';

import { createApp } from './app.js';
import { config } from './config.js';
import { prisma } from './db.js';
import { logger } from './lib/logger.js';

const server = createServer(createApp());

server.listen(config.PORT, () => {
  logger.info({ port: config.PORT }, 'Musterwerk API listening');
});

const shutdown = (signal: string) => {
  logger.info({ signal }, 'Shutting down');
  server.close(() => {
    void prisma.$disconnect().finally(() => process.exit(0));
  });
  setTimeout(() => process.exit(1), 10_000).unref();
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
