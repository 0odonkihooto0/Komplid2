import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { getCachedAnalytics } from '@/lib/analytics/cache';

export const dynamic = 'force-dynamic';

interface Params {
  projectId: string;
}

interface CountsResult {
  sidebar: {
    info: null;
    sed: number;
    management: number;
    pir: number;
    gpr: number;
    resources: number;
    journals: number;
    id: number;
    stroykontrol: number;
  };
  infoTabs: {
    participants: number;
    indicators: number;
    limitsRisks: number;
    correspondence: number;
    rfi: number;
    tasks: number;
    photos: null;
    videos: null;
    files: number;
  };
}

export async function GET(_req: NextRequest, { params }: { params: Params }) {
  try {
    const session = await getSessionOrThrow();
    const orgId = session.user.organizationId;
    const { projectId } = params;

    const project = await db.buildingObject.findFirst({
      where: { id: projectId, organizationId: orgId },
      select: { id: true },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const cacheKey = `counts:project:${projectId}`;

    const data = await getCachedAnalytics<CountsResult>(cacheKey, async () => {
      const [
        sedCount,
        contractCount,
        designTaskCount,
        designDocCount,
        ganttTaskCount,
        materialRequestCount,
        journalCount,
        executionDocCount,
        defectCount,
        orgParticipantCount,
        personParticipantCount,
        indicatorCount,
        limitRiskCount,
        correspondenceCount,
        rfiCount,
        taskCount,
        filesCount,
      ] = await Promise.all([
        db.sEDDocument.count({ where: { projectId } }),
        db.contract.count({ where: { projectId } }),
        db.designTask.count({ where: { projectId } }),
        db.designDocument.count({ where: { projectId } }),
        db.ganttTask.count({ where: { contract: { projectId } } }),
        db.materialRequest.count({ where: { projectId } }),
        db.specialJournal.count({ where: { projectId } }),
        db.executionDoc.count({ where: { contract: { projectId } } }),
        db.defect.count({ where: { projectId } }),
        db.objectOrganization.count({ where: { buildingObjectId: projectId } }),
        db.objectPerson.count({ where: { buildingObjectId: projectId } }),
        db.projectIndicator.count({ where: { projectId } }),
        db.limitRisk.count({ where: { projectId } }),
        db.correspondence.count({ where: { projectId } }),
        db.rFI.count({ where: { projectId } }),
        db.task.count({ where: { projectId } }),
        db.projectDocument.count({ where: { folder: { projectId } } }),
      ]);

      return {
        sidebar: {
          info: null,
          sed: sedCount,
          management: contractCount,
          pir: designTaskCount + designDocCount,
          gpr: ganttTaskCount,
          resources: materialRequestCount,
          journals: journalCount,
          id: executionDocCount,
          stroykontrol: defectCount,
        },
        infoTabs: {
          participants: orgParticipantCount + personParticipantCount,
          indicators: indicatorCount,
          limitsRisks: limitRiskCount,
          correspondence: correspondenceCount,
          rfi: rfiCount,
          tasks: taskCount,
          photos: null,   // TODO: полиморфный Photo.entityType требует сложного JOIN
          videos: null,   // TODO: нет модели Video (VideoCamera — камеры, не записи)
          files: filesCount,
        },
      };
    });

    return successResponse(data);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения счётчиков объекта');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
