import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

export const dynamic = 'force-dynamic';

type Params = { params: { projectId: string; journalId: string; sectionId: string } };

/** POST /api/.../sections/[sectionId]/fill — автозаполнение раздела ОЖР из данных договора */
export async function POST(_req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
      select: { id: true },
    });
    if (!project) return errorResponse('Объект не найден', 404);

    const journal = await db.specialJournal.findFirst({
      where: { id: params.journalId, projectId: params.projectId },
      select: { id: true, status: true, contractId: true },
    });
    if (!journal) return errorResponse('Журнал не найден', 404);

    if (journal.status !== 'ACTIVE') {
      return errorResponse('Журнал в режиме хранения — редактирование запрещено', 403);
    }

    const section = await db.journalSection.findFirst({
      where: { id: params.sectionId, journalId: params.journalId },
      select: { id: true, sectionNumber: true, title: true },
    });
    if (!section) return errorResponse('Раздел не найден', 404);

    // Разделы 4 и 6 заполняются вручную
    if (section.sectionNumber === 4 || section.sectionNumber === 6) {
      return errorResponse('Раздел заполняется вручную', 422);
    }

    // Для разделов 1, 2, 3, 5 нужен договор
    if (!journal.contractId) {
      return errorResponse('Журнал не привязан к договору — автозаполнение недоступно', 422);
    }

    // Собираем описания будущих записей в зависимости от номера раздела
    const descriptions: string[] = [];

    if (section.sectionNumber === 1 || section.sectionNumber === 2) {
      // Р.1: ИТП подрядчика (CONTRACTOR), Р.2: ИТП стройконтроля (SUPERVISION)
      const role = section.sectionNumber === 1 ? 'CONTRACTOR' : 'SUPERVISION';
      const participants = await db.contractParticipant.findMany({
        where: { contractId: journal.contractId, role },
        include: {
          organization: { select: { name: true } },
        },
        orderBy: { createdAt: 'asc' },
      });

      for (const p of participants) {
        const parts: string[] = [];
        if (p.representativeName) parts.push(p.representativeName);
        if (p.position) parts.push(p.position);
        parts.push(p.organization.name);
        if (p.appointmentOrder) {
          const orderDate = p.appointmentDate
            ? ` от ${format(new Date(p.appointmentDate), 'd MMM yyyy', { locale: ru })}`
            : '';
          parts.push(`Приказ №${p.appointmentOrder}${orderDate}`);
        }
        descriptions.push(parts.join(', '));
      }
    } else if (section.sectionNumber === 3) {
      // Р.3: из WorkRecord + ExecutionDoc(AOSR) по договору
      const [workRecords, aosrs] = await Promise.all([
        db.workRecord.findMany({
          where: { contractId: journal.contractId },
          orderBy: { date: 'asc' },
          take: 50,
          select: { description: true, location: true, date: true },
        }),
        db.executionDoc.findMany({
          where: { contractId: journal.contractId, type: 'AOSR' },
          orderBy: { createdAt: 'asc' },
          take: 50,
          select: { number: true, title: true },
        }),
      ]);

      for (const wr of workRecords) {
        const dateStr = format(new Date(wr.date), 'd MMM yyyy', { locale: ru });
        const desc = wr.description ? `${wr.description}` : 'Запись о выполнении работ';
        const loc = wr.location ? `, место: ${wr.location}` : '';
        descriptions.push(`${dateStr}: ${desc}${loc}`);
      }
      for (const doc of aosrs) {
        descriptions.push(`АОСР ${doc.number}: ${doc.title}`);
      }
    } else if (section.sectionNumber === 5) {
      // Р.5: подписанные ИД по договору
      const signedDocs = await db.executionDoc.findMany({
        where: { contractId: journal.contractId, status: 'SIGNED' },
        orderBy: { createdAt: 'asc' },
        take: 50,
        select: { number: true, title: true, type: true },
      });

      for (const doc of signedDocs) {
        descriptions.push(`${doc.number}: ${doc.title}`);
      }
    }

    if (descriptions.length === 0) {
      return successResponse({ created: 0, message: 'Нет данных для автозаполнения' });
    }

    // Создаём записи в транзакции с advisory lock для корректной авто-нумерации
    const lockKey = `journal-entry:${params.journalId}`;
    const now = new Date();

    const created = await db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`;

      const result = await tx.$queryRaw<Array<{ max_num: number | null }>>`
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

      return descriptions.length;
    });

    return successResponse({ created });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка автозаполнения раздела журнала');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
