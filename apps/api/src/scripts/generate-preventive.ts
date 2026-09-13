import { prisma } from '../db.js';
import { logger } from '../lib/logger.js';
import { generateDuePreventiveWork } from '../modules/preventive/service.js';

async function main() {
  try {
    const result = await generateDuePreventiveWork();
    logger.info(result, 'Preventive generation complete');
  } finally {
    await prisma.$disconnect();
  }
}

void main().catch((error: unknown) => {
  logger.error({ error }, 'Preventive generation failed');
  process.exitCode = 1;
});
