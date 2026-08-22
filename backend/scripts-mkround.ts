import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
(async () => {
  const now = Math.floor(Date.now() / 1000);
  const r = await prisma.round.create({ data: { startTimestamp: now, endTimestamp: now + 300, status: 'ACTIVE' } });
  console.log('created round', r.id);
  await prisma.$disconnect();
})();
