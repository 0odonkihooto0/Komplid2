import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { uploadFile, getDownloadUrl, buildS3Key } from '@/lib/s3-utils';
import { Prisma } from '@prisma/client';
import type { ExecutionDocType, ExecutionDocStatus, IdCategory } from '@prisma/client';
import {
  EXECUTION_DOC_TYPE_LABELS,
  EXECUTION_DOC_STATUS_LABELS,
  ID_CATEGORY_LABELS,
} from '@/utils/constants';
import { z } from 'zod';
import ExcelJS from 'exceljs';
import fs from 'fs';

export const dynamic = 'force-dynamic';

/** Проверка доступа к договору */
async function verifyContractAccess(contractId: string, organizationId: string) {
  return db.contract.findFirst({
    where: { id: contractId, buildingObject: { organizationId } },
  });
}

const exportTableSchema = z.object({
  format: z.enum(['xlsx', 'pdf']),
  columns: z.array(z.string()).min(1).max(20),
  filters: z
    .object({
      types: z.array(z.string()).optional(),
      statuses: z.array(z.string()).optional(),
      idCategory: z.string().nullable().optional(),
      categoryId: z.string().nullable().optional(),
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
      authorId: z.string().nullable().optional(),
    })
    .optional(),
});

/** Русские заголовки колонок для экспорта */
const COLUMN_HEADERS: Record<string, string> = {
  number: '№',
  type: 'Тип',
  idCategory: 'Группа ИД',
  title: 'Наименование',
  status: 'Статус',
  stamp: 'Штамп',
  linkedDocs: 'Связанные',
  documentDate: 'Дата документа',
  category: 'Категория',
  lastEditedAt: 'Версия (правки)',
  approvalStatus: 'Статус согласования',
  openComments: 'Акт. замечания',
  approvalStartDate: 'Начало согласования',
  generatedAt: 'PDF сгенерирован',
  comments: 'Замечания (всего)',
  createdAt: 'Создан',
};

/** Форматирование даты для Excel */
function fmtDate(value: Date | string | null | undefined): string {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleDateString('ru-RU');
  } catch {
    return '—';
  }
}

/** Получить значение ячейки по id колонки */
function getCellValue(
  doc: Awaited<ReturnType<typeof fetchDocs>>[number],
  colId: string
): string | number {
  switch (colId) {
    case 'number': return doc.number;
    case 'type': return EXECUTION_DOC_TYPE_LABELS[doc.type as ExecutionDocType] ?? doc.type;
    case 'idCategory':
      return doc.idCategory ? (ID_CATEGORY_LABELS[doc.idCategory as IdCategory] ?? doc.idCategory) : '—';
    case 'title': return doc.title;
    case 'status':
      return EXECUTION_DOC_STATUS_LABELS[doc.status as ExecutionDocStatus] ?? doc.status;
    case 'stamp': return doc.stampS3Key ? 'Есть' : '—';
    case 'linkedDocs': {
      const total = (doc._count?.linksAsSource ?? 0) + (doc._count?.linksAsTarget ?? 0);
      return total > 0 ? total : '—';
    }
    case 'documentDate': return fmtDate(doc.documentDate);
    case 'category': return doc.category?.name ?? '—';
    case 'lastEditedAt': return fmtDate(doc.lastEditedAt);
    case 'approvalStatus':
      return doc.approvalRoute?.status ?? '—';
    case 'openComments':
      return typeof doc.openCommentsCount === 'number' ? doc.openCommentsCount : '—';
    case 'approvalStartDate':
      return doc.approvalRoute ? fmtDate(doc.approvalRoute.createdAt) : '—';
    case 'generatedAt': return fmtDate(doc.generatedAt);
    case 'comments': return doc._count?.comments ?? '—';
    case 'createdAt': return fmtDate(doc.createdAt);
    default: return '—';
  }
}

async function fetchDocs(contractId: string, filters: z.infer<typeof exportTableSchema>['filters']) {
  const where: Prisma.ExecutionDocWhereInput = { contractId };
  if (filters?.types && filters.types.length > 0) where.type = { in: filters.types as ExecutionDocType[] };
  if (filters?.statuses && filters.statuses.length > 0) where.status = { in: filters.statuses as ExecutionDocStatus[] };
  if (filters?.idCategory) where.idCategory = filters.idCategory as IdCategory;
  if (filters?.categoryId) where.categoryId = filters.categoryId;
  if (filters?.authorId) where.createdById = filters.authorId;
  if (filters?.dateFrom || filters?.dateTo) {
    where.createdAt = {
      ...(filters.dateFrom ? { gte: new Date(filters.dateFrom) } : {}),
      ...(filters.dateTo ? { lte: new Date(`${filters.dateTo}T23:59:59.999Z`) } : {}),
    };
  }

  const docs = await db.executionDoc.findMany({
    where,
    include: {
      category: { select: { name: true } },
      approvalRoute: { select: { status: true, createdAt: true } },
      _count: {
        select: { signatures: true, comments: true, linksAsSource: true, linksAsTarget: true },
      },
      comments: { where: { status: 'OPEN' }, select: { id: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 200, // Лимит экспорта
  });

  return docs.map((doc) => {
    const { comments, ...rest } = doc;
    return { ...rest, openCommentsCount: comments.length };
  });
}

/** Генерация XLSX через ExcelJS */
async function generateXlsx(
  docs: Awaited<ReturnType<typeof fetchDocs>>,
  columns: string[]
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'StroyDocs';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Реестр ИД');

  // Заголовки колонок
  sheet.columns = columns.map((colId) => ({
    header: COLUMN_HEADERS[colId] ?? colId,
    key: colId,
    width: colId === 'title' ? 40 : 20,
  }));

  // Стиль заголовка
  sheet.getRow(1).eachCell((cell) => {
    cell.font = { bold: true };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE8EEF7' },
    };
  });

  // Строки данных
  for (const doc of docs) {
    const row: Record<string, string | number> = {};
    for (const colId of columns) {
      row[colId] = getCellValue(doc, colId);
    }
    sheet.addRow(row);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

/** Генерация PDF через Puppeteer — простая HTML-таблица */
async function generatePdf(
  docs: Awaited<ReturnType<typeof fetchDocs>>,
  columns: string[]
): Promise<Buffer> {
  const puppeteer = await import('puppeteer-core');
  let executablePath = process.env.CHROMIUM_PATH;
  if (!executablePath) {
    for (const p of ['/usr/bin/chromium-browser', '/usr/bin/chromium', '/usr/bin/google-chrome']) {
      if (fs.existsSync(p)) { executablePath = p; break; }
    }
  }
  if (!executablePath) throw new Error('Chromium не найден');

  const headers = columns.map((c) => `<th>${COLUMN_HEADERS[c] ?? c}</th>`).join('');
  const rows = docs.map((doc) => {
    const cells = columns.map((c) => `<td>${getCellValue(doc, c)}</td>`).join('');
    return `<tr>${cells}</tr>`;
  }).join('');

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>
  body { font-family: Arial, sans-serif; font-size: 10px; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #e8eef7; font-weight: bold; padding: 4px 6px; border: 1px solid #ccc; }
  td { padding: 3px 6px; border: 1px solid #ddd; }
  tr:nth-child(even) { background: #f8f9fa; }
</style></head><body>
<h3 style="margin-bottom:8px">Реестр исполнительной документации</h3>
<table><thead><tr>${headers}</tr></thead><tbody>${rows}</tbody></table>
</body></html>`;

  const browser = await puppeteer.default.launch({
    executablePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({
      format: 'A4',
      landscape: true,
      printBackground: true,
      margin: { top: '10mm', bottom: '10mm', left: '10mm', right: '10mm' },
    });
    return Buffer.from(pdfBuffer);
  } finally {
    await browser.close();
  }
}

/** POST /api/contracts/[contractId]/execution-docs/export-table
 *  Экспорт таблицы ИД в xlsx или pdf по выбранным колонкам */
export async function POST(
  req: NextRequest,
  { params }: { params: { contractId: string } }
) {
  try {
    const session = await getSessionOrThrow();
    const contract = await verifyContractAccess(params.contractId, session.user.organizationId);
    if (!contract) return errorResponse('Договор не найден', 404);

    const body = await req.json();
    const parsed = exportTableSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Ошибка валидации', 400, parsed.error.issues);
    }

    const { format, columns, filters } = parsed.data;
    const docs = await fetchDocs(params.contractId, filters);

    let fileBuffer: Buffer;
    let mimeType: string;
    let ext: string;

    if (format === 'xlsx') {
      fileBuffer = await generateXlsx(docs, columns);
      mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      ext = 'xlsx';
    } else {
      fileBuffer = await generatePdf(docs, columns);
      mimeType = 'application/pdf';
      ext = 'pdf';
    }

    const fileName = `id-table-${Date.now()}.${ext}`;
    const s3Key = buildS3Key(session.user.organizationId, 'exports', fileName);
    await uploadFile(fileBuffer, s3Key, mimeType);
    const url = await getDownloadUrl(s3Key);

    return successResponse({ url, fileName, rowCount: docs.length });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка экспорта таблицы ИД');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
