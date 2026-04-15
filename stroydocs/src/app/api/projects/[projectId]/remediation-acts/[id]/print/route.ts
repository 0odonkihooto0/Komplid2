import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { errorResponse } from '@/utils/api';
import { logger } from '@/lib/logger';
import { generateRemediationActPdf, renderRemediationActHtml, type RemediationActPdfData } from '@/lib/sk-pdf-generator';

export const dynamic = 'force-dynamic';

interface Params { params: { projectId: string; id: string } }

/** Безопасное извлечение строки из unknown */
function safeStr(val: unknown): string {
  return typeof val === 'string' ? val : '';
}

// POST /api/projects/[projectId]/remediation-acts/[id]/print — генерация PDF акта устранения
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();
    const { projectId, id } = params;

    const act = await db.defectRemediationAct.findFirst({
      where: {
        id,
        inspection: { projectId, buildingObject: { organizationId: session.user.organizationId } },
      },
      include: {
        inspection: {
          include: {
            inspector: { select: { firstName: true, lastName: true } },
            buildingObject: { select: { name: true, address: true } },
          },
        },
        prescription: { select: { number: true } },
        issuedBy: { select: { firstName: true, lastName: true } },
      },
    });

    if (!act) {
      return errorResponse('Акт устранения не найден', 404);
    }

    // Загружаем дефекты по сохранённым ID
    const defects = act.defectIds.length > 0
      ? await db.defect.findMany({
          where: { id: { in: act.defectIds } },
          select: { id: true, title: true, description: true },
          orderBy: { createdAt: 'asc' },
        })
      : [];

    // Детали устранения: { [defectId]: { measures?: string, notes?: string } }
    const details =
      act.remediationDetails !== null &&
      typeof act.remediationDetails === 'object' &&
      !Array.isArray(act.remediationDetails)
        ? (act.remediationDetails as Record<string, unknown>)
        : {};

    const obj = act.inspection.buildingObject;
    const inspector = act.inspection.inspector;

    const data: RemediationActPdfData = {
      number: act.number,
      prescriptionNumber: act.prescription.number,
      objectName: obj.name,
      objectAddress: obj.address ?? '',
      issuedAt: act.issuedAt.toLocaleDateString('ru-RU'),
      inspectorName: `${inspector.lastName} ${inspector.firstName}`,
      defects: defects.map((d, i) => {
        const detail = typeof details[d.id] === 'object' && details[d.id] !== null
          ? (details[d.id] as Record<string, unknown>)
          : {};
        return {
          number: i + 1,
          description: d.title + (d.description ? `: ${d.description}` : ''),
          measures: safeStr(detail['measures']),
          notes: safeStr(detail['notes']),
        };
      }),
      generatedAt: new Date().toLocaleDateString('ru-RU'),
    };

    const format = req.nextUrl.searchParams.get('format');
    if (format === 'docx') {
      const html = await renderRemediationActHtml(data);
      return new NextResponse(html, {
        headers: {
          'Content-Type': 'application/msword',
          'Content-Disposition': `attachment; filename="remediation-act-${act.number}.doc"`,
        },
      });
    }

    const buffer = await generateRemediationActPdf(data);

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="remediation-act-${act.number}.pdf"`,
      },
    });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка генерации PDF акта устранения');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
