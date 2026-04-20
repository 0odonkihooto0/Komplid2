import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';
// GET /api/dashboard/objects-summary
// Возвращает список строительных объектов организации с % готовности ИД
// Поддерживает фильтрацию по objectIds (через запятую)
export async function GET(req: NextRequest) {
  try {
    const session = await getSessionOrThrow();

    const objectIdsParam = req.nextUrl.searchParams.get('objectIds');
    const objectIds = objectIdsParam
      ? objectIdsParam.split(',').filter(Boolean)
      : [];

    const objects = await db.buildingObject.findMany({
      where: {
        organizationId: session.user.organizationId,
        ...(objectIds.length > 0 && { id: { in: objectIds } }),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        contracts: {
          select: {
            id: true,
            executionDocs: {
              select: { status: true },
            },
          },
        },
      },
    });

    const result = objects.map((obj) => {
      // Суммируем ИД по всем договорам объекта
      const allDocs = obj.contracts.flatMap((c) => c.executionDocs);
      const totalDocs = allDocs.length;
      const signedDocs = allDocs.filter((d) => d.status === 'SIGNED').length;
      const contractsCount = obj.contracts.length;
      const idReadinessPct = totalDocs > 0 ? Math.round((signedDocs / totalDocs) * 100) : 0;

      return {
        id: obj.id,
        name: obj.name,
        address: obj.address,
        status: obj.status,
        region: obj.region,
        constructionType: obj.constructionType,
        plannedStartDate: obj.plannedStartDate,
        plannedEndDate: obj.plannedEndDate,
        contractsCount,
        totalDocs,
        signedDocs,
        idReadinessPct,
      };
    });

    return NextResponse.json(result);
  } catch {
    return errorResponse('Не удалось получить данные по объектам', 500);
  }
}
