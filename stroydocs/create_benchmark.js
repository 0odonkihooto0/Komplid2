const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("Setting up benchmark data...");
  const user = await prisma.user.create({
    data: {
      email: "bench@example.com",
      passwordHash: "hash",
      firstName: "Bench",
      lastName: "Mark",
      organization: {
        create: {
          name: "Bench Org",
          inn: "1234567890",
        }
      }
    },
    include: { organization: true }
  });

  const project = await prisma.buildingObject.create({
    data: {
      name: "Bench Project",
      address: "123 Bench St",
      organizationId: user.organizationId,
    }
  });

  const contract = await prisma.contract.create({
    data: {
      number: "1",
      title: "Bench Contract",
      projectId: project.id,
      date: new Date(),
      status: "ACTIVE",
    }
  });

  const journal = await prisma.specialJournal.create({
    data: {
      title: "Bench Journal",
      type: "GENERAL",
      projectId: project.id,
      contractId: contract.id,
    }
  });

  const section = await prisma.journalSection.create({
    data: {
      title: "Bench Section",
      sectionNumber: 1,
      journalId: journal.id,
    }
  });

  console.log("Inserting participants to simulate section 1 fill...");
  const participants = [];
  for (let i = 0; i < 1000; i++) {
    participants.push({
      contractId: contract.id,
      organizationId: user.organizationId,
      role: "CONTRACTOR",
      representativeName: `Rep ${i}`,
      position: "Engineer",
      appointmentOrder: `Ord-${i}`,
      appointmentDate: new Date(),
    });
  }
  await prisma.contractParticipant.createMany({ data: participants });

  console.log("Data setup complete. Running benchmark...");

  const descriptions = [];
  for (let i = 0; i < 1000; i++) {
    descriptions.push(`Rep ${i}, Engineer, Bench Org, Приказ №Ord-${i}`);
  }

  const params = {
    journalId: journal.id,
    sectionId: section.id,
  };
  const session = { user: { id: user.id } };

  // Sequential inserts (current code)
  console.log("Testing sequential inserts...");
  let startSeq = Date.now();

  const lockKey = `journal-entry:${params.journalId}`;
  const now = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`;

    const result = await tx.$queryRaw`
      SELECT MAX("entryNumber") AS max_num
      FROM special_journal_entries
      WHERE "journalId" = ${params.journalId}
    `;
    let nextNum = (result[0]?.max_num ?? 0) + 1;

    for (const description of descriptions) {
      await tx.specialJournalEntry.create({
        data: {
          entryNumber: nextNum++,
          date: now,
          description,
          journalId: params.journalId,
          sectionId: params.sectionId,
          authorId: session.user.id,
        },
      });
    }
  });
  let endSeq = Date.now();
  console.log(`Sequential inserts took ${endSeq - startSeq}ms`);

  // Reset entries
  await prisma.specialJournalEntry.deleteMany({
    where: { journalId: params.journalId }
  });

  // Batch inserts (proposed code)
  console.log("Testing batch inserts...");
  let startBatch = Date.now();

  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`;

    const result = await tx.$queryRaw`
      SELECT MAX("entryNumber") AS max_num
      FROM special_journal_entries
      WHERE "journalId" = ${params.journalId}
    `;
    let nextNum = (result[0]?.max_num ?? 0) + 1;

    const dataToInsert = descriptions.map((description) => ({
      entryNumber: nextNum++,
      date: now,
      description,
      journalId: params.journalId,
      sectionId: params.sectionId,
      authorId: session.user.id,
    }));

    await tx.specialJournalEntry.createMany({
      data: dataToInsert,
    });
  });
  let endBatch = Date.now();
  console.log(`Batch inserts took ${endBatch - startBatch}ms`);

  console.log("Cleaning up...");
  await prisma.specialJournalEntry.deleteMany({ where: { journalId: journal.id } });
  await prisma.contractParticipant.deleteMany({ where: { contractId: contract.id } });
  await prisma.journalSection.deleteMany({ where: { id: section.id } });
  await prisma.specialJournal.deleteMany({ where: { id: journal.id } });
  await prisma.contract.deleteMany({ where: { id: contract.id } });
  await prisma.buildingObject.deleteMany({ where: { id: project.id } });
  await prisma.user.deleteMany({ where: { id: user.id } });
  await prisma.organization.deleteMany({ where: { id: user.organizationId } });
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
