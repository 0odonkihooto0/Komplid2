import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

const createVersionSchema = z.object({
  name: z.string().min(1, 'Название обязательно').max(200),
  stageId: z.string().uuid().optional().nullable(),
  contractId: z.string().uuid().optional().nullable(),
  description: z.string().max(1000).optional().nullable(),
  isDirective: z.boolean().optional(),
  isActive: z.boolean().optional(),
  isBaseline: z.boolean().optional(),
  delegatedFromOrgId: z.string().uuid().optional().nullable(),
  delegatedToOrgId: z.string().uuid().optional().nullable(),
  accessOrgIds: z.array(z.string().uuid()).optional(),
  linkedVersionIds: z.array(z.string().uuid()).optional(),
  lockWorks: z.boolean().optional(),
  lockPlan: z.boolean().optional(),
  lockFact: z.boolean().optional(),
  calculationMethod: z.enum(['MANUAL', 'VOLUME', 'AMOUNT', 'MAN_HOURS', 'MACHINE_HOURS', 'LABOR']).optional(),
  disableVolumeRounding: z.boolean().optional(),
  allowOverplan: z.boolean().optional(),
  showSummaryRow: z.boolean().optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Объект не найден', 404);

    const stageId = req.nextUrl.searchParams.get('stageId') ?? undefined;

    const versions = await db.ganttVersion.findMany({
      where: {
        projectId: params.projectId,
        ...(stageId ? { stageId } : {}),
      },
      include: {
        stage: { select: { id: true, name: true } },
        // Минимальный набор полей задач для вычисления агрегатов
        tasks: {
          select: { planStart: true, planEnd: true, amount: true, progress: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Вычисляем агрегаты из задач и возвращаем без сырого массива задач
    const result = versions.map(({ tasks, ...version }) => {
      const taskCount = tasks.length;
      const planStart =
        taskCount > 0
          ? new Date(Math.min(...tasks.map((t) => t.planStart.getTime())))
          : null;
      const planEnd =
        taskCount > 0
          ? new Date(Math.max(...tasks.map((t) => t.planEnd.getTime())))
          : null;
      const totalAmount = tasks.reduce((acc, t) => acc + (t.amount ?? 0), 0);
      const avgProgress =
        taskCount > 0
          ? tasks.reduce((acc, t) => acc + t.progress, 0) / taskCount
          : 0;

      return {
        ...version,
        taskCount,
        planStart,
        planEnd,
        totalAmount,
        progress: Math.round(avgProgress),
      };
    });

    return successResponse(result);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения версий ГПР');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Объект не найден', 404);

    const body = await req.json();
    const parsed = createVersionSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Ошибка валидации', 400, parsed.error.issues);
    }

    // Если указана стадия — проверяем что она принадлежит этому объекту
    if (parsed.data.stageId) {
      const stage = await db.ganttStage.findFirst({
        where: { id: parsed.data.stageId, projectId: params.projectId },
      });
      if (!stage) return errorResponse('Стадия не найдена', 404);
    }

    const {
      name, description, stageId, contractId, isDirective, isActive, isBaseline,
      delegatedFromOrgId, delegatedToOrgId, accessOrgIds, linkedVersionIds,
      lockWorks, lockPlan, lockFact, calculationMethod,
      disableVolumeRounding, allowOverplan, showSummaryRow,
    } = parsed.data;

    // При установке «Актуальная» — архивируем все другие активные версии проекта
    if (isActive) {
      await db.ganttVersion.updateMany({
        where: { projectId: params.projectId, isActive: true },
        data: { isActive: false, isBaseline: false },
      });
    }

    const version = await db.ganttVersion.create({
      data: {
        name,
        description: description ?? null,
        stageId: stageId ?? null,
        contractId: contractId ?? null,
        projectId: params.projectId,
        isDirective: isDirective ?? false,
        isActive: isActive ?? true,
        isBaseline: isBaseline ?? false,
        delegatedFromOrgId: delegatedFromOrgId ?? null,
        delegatedToOrgId: delegatedToOrgId ?? null,
        accessOrgIds: accessOrgIds ?? [],
        linkedVersionIds: linkedVersionIds ?? [],
        lockWorks: lockWorks ?? false,
        lockPlan: lockPlan ?? false,
        lockFact: lockFact ?? false,
        calculationMethod: calculationMethod ?? 'MANUAL',
        disableVolumeRounding: disableVolumeRounding ?? true,
        allowOverplan: allowOverplan ?? false,
        showSummaryRow: showSummaryRow ?? false,
        createdById: session.user.id,
      },
      include: {
        stage: { select: { id: true, name: true } },
      },
    });

    return successResponse({ ...version, taskCount: 0, planStart: null, planEnd: null, totalAmount: 0, progress: 0 });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка создания версии ГПР');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
