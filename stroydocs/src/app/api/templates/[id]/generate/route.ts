/**
 * POST /api/templates/[id]/generate
 *
 * Генерирует заполненный .docx документ на основе шаблона.
 *
 * Параметры пути:
 *   [id] — имя шаблона ('aosr', 'ozr', ...) или cuid DocumentTemplate
 *
 * Тело запроса (JSON):
 *   contractId   String  — обязательно, идентификатор договора
 *   workRecordId String? — для АОСР: привязка к конкретной записи о работе
 *   docId        String? — для привязки к существующему ExecutionDoc (overrideFields)
 *
 * Ответ: application/vnd.openxmlformats-officedocument.wordprocessingml.document
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { generateDocx, TemplateNotFoundError, TemplateRenderError } from '@/lib/templates/docxGenerator';
import type { AosrDocxData } from '@/types/templates';
import type { ContractParticipant, Organization } from '@prisma/client';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const RequestSchema = z.object({
  contractId: z.string().min(1),
  workRecordId: z.string().optional(),
  docId: z.string().optional(),
});

type ParticipantWithOrg = ContractParticipant & { organization: Organization };

/** Форматирует дату как dd mm yyyy (отдельные компоненты) */
function formatDateParts(date: Date): { D: string; M: string; Y: string } {
  return {
    D: String(date.getDate()).padStart(2, '0'),
    M: String(date.getMonth() + 1).padStart(2, '0'),
    Y: String(date.getFullYear()),
  };
}

/** Форматирует дату как "01 января 2025" */
function formatDateRu(date: Date): string {
  return date.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

/** Строка реквизитов организации для шапки акта */
function formatOrgFull(org: Organization | null | undefined): string {
  if (!org) return '—';
  const parts: string[] = [org.name];
  if (org.inn) parts.push(`ИНН ${org.inn}`);
  if (org.ogrn) parts.push(`ОГРН ${org.ogrn}`);
  return parts.join(', ');
}

/** Строка представителя: должность, ФИО, приказ */
function formatParticipantFull(participant: ParticipantWithOrg | null | undefined): string {
  if (!participant) return '—';
  const parts: string[] = [];
  if (participant.position) parts.push(participant.position);
  if (participant.representativeName) parts.push(participant.representativeName);
  else parts.push('—');
  if (participant.appointmentOrder) parts.push(`приказ № ${participant.appointmentOrder}`);
  return parts.join(', ') || '—';
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Проверка авторизации
  const session = await getServerSession(authOptions);
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Валидация тела запроса
  let body: z.infer<typeof RequestSchema>;
  try {
    body = RequestSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: 'Некорректные параметры запроса' }, { status: 400 });
  }

  const { contractId, workRecordId, docId } = body;
  const templateId = params.id;

  // Определяем имя шаблона: пробуем найти DocumentTemplate по id,
  // если не нашли — трактуем [id] как имя файла шаблона
  let templateName = templateId;
  const dbTemplate = await db.documentTemplate.findFirst({
    where: { id: templateId, isActive: true },
  }).catch(() => null);

  if (dbTemplate?.localPath) {
    const match = dbTemplate.localPath.match(/([^/\\]+)\.docx$/i);
    if (match) templateName = match[1];
  }

  // Загружаем договор с необходимыми связями
  const contract = await db.contract.findFirst({
    where: {
      id: contractId,
      buildingObject: { organizationId: session.user.organizationId },
    },
    include: {
      buildingObject: true,
      participants: {
        include: { organization: true },
      },
    },
  });

  if (!contract) {
    return NextResponse.json({ error: 'Договор не найден' }, { status: 404 });
  }

  // Загружаем ExecutionDoc для overrideFields и номера акта (если docId передан)
  const execDoc = docId
    ? await db.executionDoc.findFirst({ where: { id: docId, contractId } })
    : null;
  const overrideFields = (execDoc?.overrideFields as Record<string, string> | null) ?? null;

  // Помощник: найти участника по роли
  const participantByRole = (role: string) =>
    contract.participants.find((p) => p.role === role) as ParticipantWithOrg | undefined;

  const developer     = participantByRole('DEVELOPER');
  const contractor    = participantByRole('CONTRACTOR');
  const supervision   = participantByRole('SUPERVISION');
  const subcontractor = participantByRole('SUBCONTRACTOR');

  // Генерация по типу шаблона
  let data: Record<string, string>;

  if (templateName === 'aosr') {
    // Для АОСР нужна запись о выполненной работе
    const workRecord = workRecordId
      ? await db.workRecord.findFirst({
          where: { id: workRecordId, contractId },
          include: {
            workItem: true,
            writeoffs: {
              include: {
                material: {
                  include: { documents: true },
                },
              },
            },
          },
        })
      : null;

    const now = new Date();
    const actDate = workRecord?.date ?? now;
    // startDate — дата начала работ (новое поле), fallback на дату окончания
    const startDate = (workRecord as (typeof workRecord & { startDate?: Date | null }) | null)?.startDate ?? actDate;

    const { D, M, Y } = formatDateParts(actDate);
    const { D: D1, M: M1, Y: Y1 } = formatDateParts(startDate);
    const { D: D2, M: M2, Y: Y2 } = formatDateParts(actDate);

    // Формируем строку перечня материалов
    const materialsList =
      workRecord?.writeoffs
        .map(({ material }) => {
          const cert = material.documents[0];
          const certRef = cert ? ` (${cert.type}, № ${cert.fileName})` : '';
          return `${material.name}${certRef}`;
        })
        .join(';\n') ?? '—';

    const aosrData: AosrDocxData = {
      object: `${contract.buildingObject.name}, ${contract.buildingObject.address ?? ''}`.trim().replace(/,\s*$/, ''),
      '№': execDoc?.number?.slice(-6) ?? workRecord?.id?.slice(-6) ?? '—',
      date: formatDateRu(actDate),
      D, M, Y,
      D1, M1, Y1,
      D2, M2, Y2,

      // Org blocks (шапка акта — реквизиты организации без ФИО)
      zakazchik:       formatOrgFull(developer?.organization),
      stroiteli:       formatOrgFull(contractor?.organization),
      projectirovshik: formatOrgFull(supervision?.organization),

      // Представители в теле акта (должность + ФИО + приказ)
      stroiteli11:      formatParticipantFull(contractor),
      stroiteli12:      formatParticipantFull(supervision),
      projectirovshik1: formatParticipantFull(supervision),
      stroiteli3:       formatParticipantFull(subcontractor ?? contractor),

      // Работы и материалы
      rabota:     workRecord?.workItem.name ?? '—',
      project:    workRecord?.workItem.projectCipher ?? '—',
      material:   materialsList,
      shema:      '—',
      ispitaniya: '—',

      // Нормативы
      SNIP: workRecord?.normative ?? '—',
      Next: overrideFields?.Next ?? '—',
      N:    overrideFields?.N ?? '3',
      DOP:  '—',

      // Подписи (только ФИО)
      zakazchik2:       developer?.representativeName ?? '—',
      stroiteli21:      contractor?.representativeName ?? '—',
      stroiteli22:      supervision?.representativeName ?? '—',
      projectirovshik2: supervision?.representativeName ?? '—',
      stroiteli32:      subcontractor?.representativeName ?? '—',
    };

    // Мердж пользовательских overrideFields поверх сгенерированных данных
    data = overrideFields
      ? { ...(aosrData as object), ...(overrideFields as object) } as Record<string, string>
      : (aosrData as unknown as Record<string, string>);
  } else {
    // Для остальных шаблонов — базовый набор полей
    data = {
      object: `${contract.buildingObject.name}, ${contract.buildingObject.address ?? ''}`.trim(),
      contractNumber: contract.number,
      projectName: contract.buildingObject.name,
      projectAddress: contract.buildingObject.address ?? '—',
    };
  }

  // Генерация .docx
  let buffer: Buffer;
  try {
    buffer = await generateDocx(templateName, data);
  } catch (err) {
    if (err instanceof TemplateNotFoundError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    if (err instanceof TemplateRenderError) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
    throw err;
  }

  const fileName = `${templateName}_${contract.number.replace(/[^a-zA-Z0-9а-яА-Я]/g, '_')}.docx`;

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
      'Content-Length': String(buffer.length),
    },
  });
}
