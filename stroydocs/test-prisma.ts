import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();
async function main() {
  console.log(typeof db.workItem.createManyAndReturn);
}
main().catch(console.error).finally(() => db.$disconnect());
