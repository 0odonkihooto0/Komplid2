import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { generateJournalPdf } from '@/lib/journal-pdf-generator';
import type { JournalPdfEntry } from '@/lib/journal-pdf-generator';
import { uploadFile, getDownloadUrl, buildJournalKey } from '@/lib/s3-utils';
import type { JournalEntryStatus, SpecialJournalType } from '@prisma/client';

export const dynamic = 'force-dynamic';

type Params = { params: { projectId: string; journalId: string } };

/** Лейблы статусов записей для PDF */
const ENTRY_STATUS_LABELS: Record<JournalEntryStatus, string> = {
  DRAFT: 'Черновик',
  SUBMITTED: 'На проверке',
  APPROVED: 'Утверждена',
  REJECTED: 'Отклонена',
};

/** Лейблы статусов журнала */
const JOURNAL_STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Активен',
  STORAGE: 'На хранении',
  CLOSED: 'Закрыт',
};

/** Форматирование даты в DD.MM.YYYY */
function formatDate(date: Date): string {
  const d = date.getDate().toString().padStart(2, '0');
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const y = date.getFullYear();
  return `${d}.${m}.${y}`;
}

/** Форматирование ФИО из firstName/lastName */
function formatName(user: { firstName: string | null; lastName: string | null }): string {
  return [user.lastName, user.firstName].filter(Boolean).join(' ') || 'Не указан';
}

/** Извлечение типо-специфичных полей из JSON data */
function extractDataFields(
  type: SpecialJournalType,
  data: Record<string, unknown> | null
): Partial<JournalPdfEntry> {
  if (!data) return {};

  if (type === 'CONCRETE_WORKS') {
    return {
      structureName: (data.structureName as string) ?? '',
      concreteClass: (data.concreteClass as string) ?? '',
      volume: (data.volume as number) ?? undefined,
      placementMethod: (data.placementMethod as string) ?? '',
      mixTemperature: (data.mixTemperature as number) ?? undefined,
      curingMethod: (data.curingMethod as string) ?? '',
    };
  }

  if (type === 'WELDING_WORKS') {
    return {
      jointType: (data.jointType as string) ?? '',
      baseMetal: (data.baseMetal as string) ?? '',
      thickness: (data.thickness as number) ?? undefined,
      electrodeMark: (data.electrodeMark as string) ?? '',
      weldingMethod: (data.weldingMethod as string) ?? '',
      welderStampNumber: (data.welderStampNumber as string) ?? '',
      welderFullName: (data.welderFullName as string) ?? '',
      controlType: (data.controlType as string) ?? '',
      controlResult: (data.controlResult as string) ?? '',
    };
  }

  if (type === 'AUTHOR_SUPERVISION') {
    return {
      designOrgRepresentative: (data.designOrgRepresentative as string) ?? '',
      deviationsFound: (data.deviationsFound as string) ?? '',
      instructions: (data.instructions as string) ?? '',
      instructionDeadline: (data.instructionDeadline as string) ?? '',
      implementationNote: (data.implementationNote as string) ?? '',
    };
  }

  return {};
}

/** POST .../generate-pdf — генерация PDF журнала */
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
      select: { id: true, name: true, address: true },
    });
    if (!project) return errorResponse('Объект не найден', 404);

    // Загружаем журнал с записями, ответственным и договором
    const journal = await db.specialJournal.findFirst({
      where: { id: params.journalId, projectId: params.projectId },
      include: {
        responsible: { select: { id: true, firstName: true, lastName: true } },
        contract: { select: { id: true, number: true, name: true } },
        entries: {
          take: 1000,
          orderBy: { entryNumber: 'asc' },
          select: {
            entryNumber: true,
            date: true,
            status: true,
            description: true,
            location: true,
            normativeRef: true,
            weather: true,
            temperature: true,
            data: true,
          },
        },
      },
    });
    if (!journal) return errorResponse('Журнал не найден', 404);

    // Подготовка данных для шаблона
    const entries: JournalPdfEntry[] = journal.entries.map((entry) => ({
      entryNumber: entry.entryNumber,
      date: formatDate(new Date(entry.date)),
      description: entry.description,
      location: entry.location,
      normativeRef: entry.normativeRef,
      weather: entry.weather,
      temperature: entry.temperature,
      statusLabel: ENTRY_STATUS_LABELS[entry.status],
      ...extractDataFields(journal.type, entry.data as Record<string, unknown> | null),
    }));

    const pdfData = {
      number: journal.number,
      title: journal.title,
      projectName: project.name,
      projectAddress: project.address ?? '',
      contractNumber: journal.contract?.number ?? null,
      responsibleName: formatName(journal.responsible),
      normativeRef: journal.normativeRef,
      statusLabel: JOURNAL_STATUS_LABELS[journal.status] ?? journal.status,
      openedAt: formatDate(new Date(journal.openedAt)),
      closedAt: journal.closedAt ? formatDate(new Date(journal.closedAt)) : null,
      generatedAt: formatDate(new Date()),
      entries,
    };

    // Генерация PDF
    const pdfBuffer = await generateJournalPdf(journal.type, pdfData);

    // Загрузка в S3
    const fileName = `${journal.number}.pdf`;
    const s3Key = buildJournalKey(
      session.user.organizationId,
      params.projectId,
      journal.type,
      fileName
    );
    await uploadFile(pdfBuffer, s3Key, 'application/pdf');

    // Pre-signed URL для скачивания
    const downloadUrl = await getDownloadUrl(s3Key);

    return successResponse({ s3Key, fileName, downloadUrl });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка генерации PDF журнала');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
