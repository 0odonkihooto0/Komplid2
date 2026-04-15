import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { errorResponse } from '@/utils/api';
import { logger } from '@/lib/logger';
import { generatePrescriptionPdf, renderPrescriptionHtml, type PrescriptionPdfData } from '@/lib/sk-pdf-generator';

export const dynamic = 'force-dynamic';

const CATEGORY_LABELS: Record<string, string> = {
  QUALITY_VIOLATION: 'Охрана труда',
  TECHNOLOGY_VIOLATION: 'Нарушение технологии',
  FIRE_SAFETY: 'Пожарная безопасность',
  ECOLOGY: 'Экология',
  DOCUMENTATION: 'Документация',
  OTHER: 'Прочее',
};

interface Params { params: { projectId: string; id: string } }

// POST /api/projects/[projectId]/prescriptions/[id]/print — генерация PDF предписания
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();
    const { projectId, id } = params;

    const prescription = await db.prescription.findFirst({
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
        issuedBy: { select: { firstName: true, lastName: true } },
        responsible: { select: { firstName: true, lastName: true } },
        defects: {
          select: {
            title: true,
            description: true,
            category: true,
            deadline: true,
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!prescription) {
      return errorResponse('Предписание не найдено', 404);
    }

    const obj = prescription.inspection.buildingObject;
    const inspector = prescription.inspection.inspector;
    const responsible = prescription.responsible;

    const type = prescription.type === 'DEFECT_ELIMINATION' ? 'UN' : 'PR';

    const data: PrescriptionPdfData = {
      type,
      number: prescription.number,
      objectName: obj.name,
      objectAddress: obj.address ?? '',
      issuedAt: prescription.issuedAt.toLocaleDateString('ru-RU'),
      deadline: prescription.deadline
        ? prescription.deadline.toLocaleDateString('ru-RU')
        : 'не установлен',
      inspectorName: `${inspector.lastName} ${inspector.firstName}`,
      responsibleName: responsible
        ? `${responsible.lastName} ${responsible.firstName}`
        : 'не назначен',
      defects: prescription.defects.map((d, i) => ({
        number: i + 1,
        description: d.title + (d.description ? `: ${d.description}` : ''),
        category: CATEGORY_LABELS[d.category] ?? d.category,
        deadline: d.deadline ? d.deadline.toLocaleDateString('ru-RU') : '—',
      })),
      generatedAt: new Date().toLocaleDateString('ru-RU'),
    };

    const format = req.nextUrl.searchParams.get('format');
    if (format === 'docx') {
      const html = await renderPrescriptionHtml(data);
      return new NextResponse(html, {
        headers: {
          'Content-Type': 'application/msword',
          'Content-Disposition': `attachment; filename="prescription-${prescription.number}.doc"`,
        },
      });
    }

    const buffer = await generatePrescriptionPdf(data);

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="prescription-${prescription.number}.pdf"`,
      },
    });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка генерации PDF предписания');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
