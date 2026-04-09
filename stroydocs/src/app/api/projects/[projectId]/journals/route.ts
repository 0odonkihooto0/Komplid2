import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { createJournalSchema } from '@/lib/validations/journal-schemas';
import { getNextJournalNumber } from '@/lib/numbering';
import type { JournalStatus, SpecialJournalType } from '@prisma/client';

export const dynamic = 'force-dynamic';

/** Названия по умолчанию для типов журналов */
const DEFAULT_TITLES: Record<string, string> = {
  CONCRETE_WORKS: 'Журнал бетонных работ',
  WELDING_WORKS: 'Журнал сварочных работ',
  AUTHOR_SUPERVISION: 'Журнал авторского надзора',
  MOUNTING_WORKS: 'Журнал монтажа строительных конструкций',
  ANTICORROSION: 'Журнал антикоррозионных работ',
  GEODETIC: 'Журнал геодезических работ',
  EARTHWORKS: 'Журнал производства земляных работ',
  PILE_DRIVING: 'Журнал погружения свай',
  CABLE_LAYING: 'Журнал прокладки кабелей',
  FIRE_SAFETY: 'Журнал инструктажа по пожарной безопасности',
  CUSTOM: 'Специальный журнал',
};

/** GET /api/projects/[projectId]/journals — список журналов с пагинацией и фильтрами */
export async function GET(
  req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
      select: { id: true },
    });
    if (!project) return errorResponse('Объект не найден', 404);

    const sp = req.nextUrl.searchParams;
    const page = Math.max(1, Number(sp.get('page') ?? 1));
    const limit = Math.min(200, Math.max(1, Number(sp.get('limit') ?? 50)));
    const skip = (page - 1) * limit;
    const type = sp.get('type') ?? undefined;
    const status = sp.get('status') ?? undefined;
    const contractId = sp.get('contractId') ?? undefined;

    const where = {
      projectId: params.projectId,
      ...(type ? { type: type as SpecialJournalType } : {}),
      ...(status ? { status: status as JournalStatus } : {}),
      ...(contractId ? { contractId } : {}),
    };

    const [data, total] = await db.$transaction([
      db.specialJournal.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          responsible: { select: { id: true, firstName: true, lastName: true } },
          createdBy: { select: { id: true, firstName: true, lastName: true } },
          contract: { select: { id: true, number: true, name: true } },
          _count: { select: { entries: true } },
        },
      }),
      db.specialJournal.count({ where }),
    ]);

    return successResponse(data, {
      total,
      page,
      pageSize: limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения списка журналов');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

/** POST /api/projects/[projectId]/journals — создание журнала */
export async function POST(
  req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
      select: { id: true },
    });
    if (!project) return errorResponse('Объект не найден', 404);

    const body = await req.json();
    const parsed = createJournalSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Ошибка валидации', 400, parsed.error.issues);
    }

    const { type, title, contractId, responsibleId, normativeRef } = parsed.data;

    // Проверка ответственного — принадлежит организации
    const responsible = await db.user.findFirst({
      where: { id: responsibleId, organizationId: session.user.organizationId },
      select: { id: true },
    });
    if (!responsible) return errorResponse('Ответственный не найден', 404);

    // Проверка договора — принадлежит проекту
    if (contractId) {
      const contract = await db.contract.findFirst({
        where: { id: contractId, projectId: params.projectId },
        select: { id: true },
      });
      if (!contract) return errorResponse('Договор не найден', 404);
    }

    // Авто-нумерация с advisory lock
    const number = await getNextJournalNumber(params.projectId, type);

    const journal = await db.specialJournal.create({
      data: {
        type: type as SpecialJournalType,
        number,
        title: title || DEFAULT_TITLES[type] || 'Специальный журнал',
        projectId: params.projectId,
        contractId: contractId ?? null,
        responsibleId,
        normativeRef: normativeRef ?? null,
        createdById: session.user.id,
      },
      include: {
        responsible: { select: { id: true, firstName: true, lastName: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        contract: { select: { id: true, number: true, name: true } },
        _count: { select: { entries: true } },
      },
    });

    return successResponse(journal);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка создания журнала');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
