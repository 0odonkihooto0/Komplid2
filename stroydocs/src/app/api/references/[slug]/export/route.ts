import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { errorResponse } from '@/utils/api';
import { getReferenceSchema } from '@/lib/references/registry';
import type { ReferenceFieldSchema } from '@/lib/references/types';
import { z } from 'zod';
import ExcelJS from 'exceljs';

export const dynamic = 'force-dynamic';

type PrismaModelClient = {
  findMany: (args: Record<string, unknown>) => Promise<Record<string, unknown>[]>;
};

function getModelClient(modelName: string): PrismaModelClient {
  return (db as unknown as Record<string, PrismaModelClient>)[modelName];
}

const bodySchema = z.object({
  mode: z.enum(['visible', 'all-columns', 'all-data']),
  columns: z.array(z.string()).optional(),
});

function formatCellValue(value: unknown, field: ReferenceFieldSchema): string {
  if (value === null || value === undefined) return '';
  if (field.type === 'boolean') return value ? 'Да' : 'Нет';
  if (field.type === 'date' && typeof value === 'string') {
    try {
      return new Date(value).toLocaleDateString('ru-RU');
    } catch {
      return String(value);
    }
  }
  if (field.type === 'select' && field.options) {
    const opt = field.options.find((o) => o.value === value);
    return opt ? opt.label : String(value);
  }
  return String(value);
}

/** POST /api/references/[slug]/export — экспорт в Excel */
export async function POST(req: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const session = await getSessionOrThrow();
    const schema = getReferenceSchema(params.slug);
    if (!schema) return errorResponse('Справочник не найден', 404);

    const body = await req.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) return errorResponse('Ошибка валидации', 400, parsed.error.issues);

    const { mode, columns } = parsed.data;

    const exportFields =
      mode === 'visible' && columns && columns.length > 0
        ? schema.fields.filter((f) => columns.includes(f.key))
        : schema.fields;

    const where: Record<string, unknown> = {};
    if (schema.scope === 'organization') where.organizationId = session.user.organizationId;

    const take = mode === 'all-data' ? 1000 : 200;
    const modelClient = getModelClient(schema.model);
    const rows = await modelClient.findMany({ where, take, orderBy: { createdAt: 'desc' } });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'StroyDocs';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet(schema.pluralName);
    sheet.columns = exportFields.map((f) => ({
      header: f.label,
      key: f.key,
      width: f.width ?? 20,
    }));

    sheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8EEF7' } };
    });

    for (const row of rows) {
      const rowData: Record<string, string> = {};
      for (const field of exportFields) {
        rowData[field.key] = formatCellValue(row[field.key], field);
      }
      sheet.addRow(rowData);
    }

    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
    const date = new Date().toISOString().slice(0, 10);
    const filename = encodeURIComponent(`${schema.pluralName}_${date}.xlsx`);

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename*=UTF-8''${filename}`,
        'Content-Length': String(buffer.length),
      },
    });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка экспорта справочника');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
