import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import type { JournalRequisiteEntry, JournalRequisites } from '@/components/objects/journals/journal-constants';

export const dynamic = 'force-dynamic';

type Params = { params: { projectId: string; journalId: string } };

// Маппинг roleName → ключ реквизита
const ROLE_PATTERNS: Array<{ pattern: RegExp; key: keyof JournalRequisites }> = [
  { pattern: /заказчик/i, key: 'customer' },
  { pattern: /генподрядчик|генеральный\s+подрядчик/i, key: 'generalContractor' },
  { pattern: /стройконтроль|строительный\s+контроль/i, key: 'constructionControl' },
  { pattern: /авторский\s+надзор/i, key: 'authorSupervision' },
  { pattern: /гос.*надзор|государственный\s+надзор/i, key: 'stateSupervision' },
];

function matchRole(roleName: string): keyof JournalRequisites | null {
  for (const { pattern, key } of ROLE_PATTERNS) {
    if (pattern.test(roleName)) return key;
  }
  return null;
}

/**
 * POST /api/projects/[projectId]/journals/[journalId]/fill-requisites
 * Автозаполнение реквизитов журнала из участников объекта.
 * Возвращает заполненный JSON — НЕ записывает в БД.
 */
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
      select: { id: true },
    });
    if (!journal) return errorResponse('Журнал не найден', 404);

    // Загружаем участников объекта: юрлица + физлица с ролями
    const [orgs, persons] = await Promise.all([
      db.objectOrganization.findMany({
        where: { buildingObjectId: params.projectId },
        include: {
          organization: { select: { id: true, name: true } },
          roles: { select: { roleName: true } },
        },
        orderBy: { createdAt: 'asc' },
      }),
      db.objectPerson.findMany({
        where: { buildingObjectId: params.projectId },
        include: {
          organization: { select: { name: true } },
          roles: { select: { roleName: true } },
        },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    const requisites: JournalRequisites = {};

    // Перебираем юрлица: ищем совпадение роли с ключами реквизитов
    for (const org of orgs) {
      for (const { roleName } of org.roles) {
        const key = matchRole(roleName);
        if (key && !requisites[key]) {
          const entry: JournalRequisiteEntry = {
            orgId: org.id,
            name: org.organization.name,
          };
          requisites[key] = entry;
        }
      }
    }

    // Перебираем физлиц: заполняем только незанятые ключи
    for (const person of persons) {
      for (const { roleName } of person.roles) {
        const key = matchRole(roleName);
        if (key && !requisites[key]) {
          const fullName = [person.lastName, person.firstName, person.middleName]
            .filter(Boolean)
            .join(' ');
          const entry: JournalRequisiteEntry = {
            personId: person.id,
            name: person.organization
              ? `${fullName} (${person.organization.name})`
              : fullName,
          };
          requisites[key] = entry;
        }
      }
    }

    return successResponse({ requisites });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка автозаполнения реквизитов журнала');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
