import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { errorResponse } from '@/utils/api';
import { generateClosureActPdf } from '@/lib/pir-pdf-generator';
import type { ClosureActPdfData } from '@/lib/pir-pdf-generator';

export const dynamic = 'force-dynamic';

type Params = { params: { projectId: string; actId: string } };

/** POST — генерация PDF Акта закрытия ПИР */
export async function POST(_req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();

    const act = await db.pIRClosureAct.findFirst({
      where: {
        id: params.actId,
        projectId: params.projectId,
        buildingObject: { organizationId: session.user.organizationId },
      },
      include: {
        items: { orderBy: { id: 'asc' } },
      },
    });
    if (!act) return errorResponse('Акт не найден', 404);

    // Получаем названия организаций (contractorOrgId и customerOrgId — строки-UUID)
    const [contractorOrg, customerOrg] = await Promise.all([
      act.contractorOrgId
        ? db.organization.findUnique({
            where: { id: act.contractorOrgId },
            select: { name: true },
          })
        : Promise.resolve(null),
      act.customerOrgId
        ? db.organization.findUnique({
            where: { id: act.customerOrgId },
            select: { name: true },
          })
        : Promise.resolve(null),
    ]);

    const fmt = (n: number | null | undefined) =>
      (n ?? 0).toLocaleString('ru-RU', { minimumFractionDigits: 2 });

    const data: ClosureActPdfData = {
      number: act.number,
      periodStart: act.periodStart.toLocaleDateString('ru-RU'),
      periodEnd: act.periodEnd.toLocaleDateString('ru-RU'),
      contractorOrgName: contractorOrg?.name ?? '___________________',
      customerOrgName: customerOrg?.name ?? '___________________',
      items: act.items.map((i) => ({
        workName: i.workName,
        unit: i.unit ?? '—',
        volume: i.volume != null ? String(i.volume) : '—',
        amount: i.amount != null ? fmt(i.amount) : '—',
      })),
      totalAmount: fmt(act.totalAmount),
      generatedAt: new Date().toLocaleString('ru-RU'),
    };

    const buffer = await generateClosureActPdf(data);
    const filename = `closure-act-${act.number.replace(/[^\w-]/g, '_')}.pdf`;

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка генерации PDF акта закрытия ПИР');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
