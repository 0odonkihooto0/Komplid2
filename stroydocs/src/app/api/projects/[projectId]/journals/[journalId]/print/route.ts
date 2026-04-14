import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { errorResponse } from '@/utils/api';
import { generateJournalPdf, renderJournalHtml } from '@/lib/journal-pdf-generator';
import type { JournalPdfEntry } from '@/lib/journal-pdf-generator';
import { generateJournalXls } from '@/lib/journal-excel-generator';
import type { JournalEntryStatus, SpecialJournalType } from '@prisma/client';

export const dynamic = 'force-dynamic';

type Params = { params: { projectId: string; journalId: string } };

const ENTRY_STATUS_LABELS: Record<JournalEntryStatus, string> = {
  DRAFT: 'Черновик',
  SUBMITTED: 'На проверке',
  APPROVED: 'Утверждена',
  REJECTED: 'Отклонена',
};

const JOURNAL_STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Активен',
  STORAGE: 'На хранении',
  CLOSED: 'Закрыт',
};

function formatDate(date: Date): string {
  const d = date.getDate().toString().padStart(2, '0');
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const y = date.getFullYear();
  return `${d}.${m}.${y}`;
}

function formatName(user: { firstName: string | null; lastName: string | null }): string {
  return [user.lastName, user.firstName].filter(Boolean).join(' ') || 'Не указан';
}

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

/**
 * POST .../print?format=pdf|doc|xls — генерация файла печати журнала
 * Возвращает бинарный файл напрямую (без S3).
 */
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();
    const format = req.nextUrl.searchParams.get('format') ?? 'pdf';

    if (format !== 'pdf' && format !== 'doc' && format !== 'xls') {
      return errorResponse('Неверный формат. Допустимы: pdf, doc, xls', 400);
    }

    const object = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
      select: { id: true, name: true, address: true },
    });
    if (!object) return errorResponse('Объект не найден', 404);

    const journal = await db.specialJournal.findFirst({
      where: { id: params.journalId, projectId: params.projectId },
      include: {
        responsible: { select: { id: true, firstName: true, lastName: true } },
        contract: { select: { id: true, number: true } },
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

    const filename = journal.number;

    // === XLS ===
    if (format === 'xls') {
      const xlsEntries = journal.entries.map((e) => ({
        entryNumber: e.entryNumber,
        date: new Date(e.date),
        status: e.status,
        description: e.description,
        location: e.location,
        normativeRef: e.normativeRef,
        weather: e.weather,
        temperature: e.temperature,
        data: e.data as Record<string, unknown> | null,
      }));

      const buffer = await generateJournalXls(
        { number: journal.number, title: journal.title, type: journal.type },
        xlsEntries
      );

      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          'Content-Type':
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}.xlsx"`,
        },
      });
    }

    // Подготовка данных для PDF/DOC шаблона
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
      title: journal.title ?? '',
      projectName: object.name,
      projectAddress: object.address ?? '',
      contractNumber: journal.contract?.number ?? null,
      responsibleName: formatName(journal.responsible),
      normativeRef: journal.normativeRef,
      statusLabel: JOURNAL_STATUS_LABELS[journal.status] ?? journal.status,
      openedAt: formatDate(new Date(journal.openedAt)),
      closedAt: journal.closedAt ? formatDate(new Date(journal.closedAt)) : null,
      generatedAt: formatDate(new Date()),
      entries,
    };

    // === PDF ===
    if (format === 'pdf') {
      const pdfBuffer = await generateJournalPdf(journal.type, pdfData);
      return new NextResponse(new Uint8Array(pdfBuffer), {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}.pdf"`,
        },
      });
    }

    // === DOC (HTML с Content-Type application/msword) ===
    const html = await renderJournalHtml(journal.type, pdfData);
    return new NextResponse(html, {
      headers: {
        'Content-Type': 'application/msword',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}.doc"`,
      },
    });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка генерации файла печати журнала');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
