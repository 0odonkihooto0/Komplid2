import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { errorResponse } from '@/utils/api';
import { logger } from '@/lib/logger';
import { generateInspectionActPdf, type InspectionActPdfData } from '@/lib/sk-pdf-generator';

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

// POST /api/projects/[projectId]/inspection-acts/[id]/print — генерация PDF акта проверки
export async function POST(_req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();
    const { projectId, id } = params;

    const act = await db.inspectionAct.findFirst({
      where: {
        id,
        inspection: { projectId, buildingObject: { organizationId: session.user.organizationId } },
      },
      include: {
        inspection: {
          include: {
            inspector: { select: { firstName: true, lastName: true } },
            responsible: { select: { firstName: true, lastName: true } },
            buildingObject: { select: { name: true, address: true } },
            defects: {
              select: {
                title: true,
                description: true,
                category: true,
                deadline: true,
                requiresSuspension: true,
              },
              orderBy: { createdAt: 'asc' },
            },
          },
        },
        issuedBy: { select: { firstName: true, lastName: true } },
      },
    });

    if (!act) {
      return errorResponse('Акт проверки не найден', 404);
    }

    const { inspection } = act;
    const obj = inspection.buildingObject;
    const inspector = inspection.inspector;
    const responsible = inspection.responsible;

    const data: InspectionActPdfData = {
      number: act.number,
      objectName: obj.name,
      objectAddress: obj.address ?? '',
      inspectedAt: (inspection.completedAt ?? inspection.startedAt).toLocaleDateString('ru-RU'),
      inspectorName: `${inspector.lastName} ${inspector.firstName}`,
      inspectorOrg: '',
      responsibleName: responsible
        ? `${responsible.lastName} ${responsible.firstName}`
        : 'не назначен',
      contractorPresent: inspection.contractorPresent ?? null,
      defects: inspection.defects.map((d, i) => ({
        number: i + 1,
        category: CATEGORY_LABELS[d.category] ?? d.category,
        description: d.title + (d.description ? `: ${d.description}` : ''),
        deadline: d.deadline ? d.deadline.toLocaleDateString('ru-RU') : '—',
        requiresSuspension: d.requiresSuspension,
      })),
      generatedAt: new Date().toLocaleDateString('ru-RU'),
    };

    const buffer = await generateInspectionActPdf(data);

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="inspection-act-${act.number}.pdf"`,
      },
    });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка генерации PDF акта проверки');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
