import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { errorResponse } from '@/utils/api';
import { generateJournalTemplate } from '@/lib/journal-excel-generator';

export const dynamic = 'force-dynamic';

type Params = { params: { projectId: string; journalId: string } };

/** GET .../excel-template — скачать пустой xlsx-шаблон для импорта записей */
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();

    const object = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
      select: { id: true },
    });
    if (!object) return errorResponse('Объект не найден', 404);

    const journal = await db.specialJournal.findFirst({
      where: { id: params.journalId, projectId: params.projectId },
      select: { id: true, number: true, type: true },
    });
    if (!journal) return errorResponse('Журнал не найден', 404);

    const buffer = await generateJournalTemplate(journal.type, journal.number);

    const filename = `${journal.number}-template.xlsx`;

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
      },
    });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка генерации xlsx-шаблона журнала');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
