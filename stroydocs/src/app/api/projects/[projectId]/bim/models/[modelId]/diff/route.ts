import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { logger } from '@/lib/logger';
import type { IfcDiffResult, IfcDiffElement, IfcDiffChangedElement } from '@/types/bim-diff';

/** Схема тела запроса: две версии одной модели */
const diffSchema = z.object({
  versionIdOld: z.string().uuid('Некорректный идентификатор старой версии'),
  versionIdNew: z.string().uuid('Некорректный идентификатор новой версии'),
});

/** Тип ответа IfcOpenShell-сервиса /diff */
interface IfcServiceDiffResponse {
  added: string[];
  deleted: string[];
  changed: { guid: string; changedAttributes: string[] }[];
  geometryChanged: string[];
}

const IFC_SERVICE = process.env.IFC_SERVICE_URL ?? 'http://localhost:8001';

/**
 * POST /api/projects/[projectId]/bim/models/[modelId]/diff
 * Сравнивает две версии IFC-модели через IfcOpenShell ifcdiff.
 *
 * Тело: { versionIdOld, versionIdNew }
 * Возвращает: { added, deleted, changed, geometryChanged } — каждый элемент обогащён
 * именем и типом из таблицы BimElement текущей модели.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { projectId: string; modelId: string } }
) {
  try {
    const session = await getSessionOrThrow();
    const body: unknown = await req.json();
    const parsed = diffSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0].message, 400);
    }

    const { versionIdOld, versionIdNew } = parsed.data;

    if (versionIdOld === versionIdNew) {
      return errorResponse('Выберите две разные версии для сравнения', 400);
    }

    // Проверяем принадлежность модели организации
    const model = await db.bimModel.findFirst({
      where: {
        id: params.modelId,
        projectId: params.projectId,
        buildingObject: { organizationId: session.user.organizationId },
      },
      select: { id: true },
    });

    if (!model) return errorResponse('Модель не найдена', 404);

    // Получаем s3Key обеих версий, проверяем что версии принадлежат модели
    const [versionOld, versionNew] = await Promise.all([
      db.bimModelVersion.findFirst({
        where: { id: versionIdOld, modelId: params.modelId },
        select: { id: true, version: true, s3Key: true },
      }),
      db.bimModelVersion.findFirst({
        where: { id: versionIdNew, modelId: params.modelId },
        select: { id: true, version: true, s3Key: true },
      }),
    ]);

    if (!versionOld) return errorResponse('Старая версия не найдена', 404);
    if (!versionNew) return errorResponse('Новая версия не найдена', 404);

    // Вызываем IfcOpenShell-сервис /diff
    let serviceDiff: IfcServiceDiffResponse;
    try {
      const serviceRes = await fetch(`${IFC_SERVICE}/diff`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ s3KeyOld: versionOld.s3Key, s3KeyNew: versionNew.s3Key }),
      });

      if (!serviceRes.ok) {
        const detail = await serviceRes.text().catch(() => '');
        logger.error({ status: serviceRes.status, detail }, 'IfcOpenShell-сервис вернул ошибку /diff');
        return errorResponse('Ошибка IfcOpenShell-сервиса при сравнении версий', 502);
      }

      serviceDiff = (await serviceRes.json()) as IfcServiceDiffResponse;
    } catch (fetchErr) {
      logger.error({ err: fetchErr }, 'Не удалось подключиться к IfcOpenShell-сервису');
      return errorResponse('IfcOpenShell-сервис недоступен', 502);
    }

    // Собираем все уникальные GUIDы для обогащения данными из БД
    const allGuids = Array.from(
      new Set([
        ...serviceDiff.added,
        ...serviceDiff.deleted,
        ...serviceDiff.changed.map((c) => c.guid),
        ...serviceDiff.geometryChanged,
      ])
    );

    // Загружаем элементы из БД по GUIDам (best-effort: удалённые могут отсутствовать)
    const elements = allGuids.length > 0
      ? await db.bimElement.findMany({
          where: { modelId: params.modelId, ifcGuid: { in: allGuids } },
          select: { ifcGuid: true, ifcType: true, name: true },
        })
      : [];

    // Индекс GUID → { ifcType, name } для O(1) обогащения
    const elementMap = new Map(
      elements.map((el) => [el.ifcGuid, { ifcType: el.ifcType, name: el.name }])
    );

    /** Создаёт обогащённый элемент diff по GUID */
    const enrichElement = (guid: string): IfcDiffElement => {
      const info = elementMap.get(guid);
      return { guid, name: info?.name ?? null, ifcType: info?.ifcType ?? null };
    };

    const result: IfcDiffResult = {
      added: serviceDiff.added.map(enrichElement),
      deleted: serviceDiff.deleted.map(enrichElement),
      changed: serviceDiff.changed.map((c): IfcDiffChangedElement => ({
        ...enrichElement(c.guid),
        changedAttributes: c.changedAttributes,
      })),
      geometryChanged: serviceDiff.geometryChanged.map(enrichElement),
    };

    logger.info(
      {
        modelId: params.modelId,
        versionOld: versionOld.version,
        versionNew: versionNew.version,
        added: result.added.length,
        deleted: result.deleted.length,
        changed: result.changed.length,
        geometryChanged: result.geometryChanged.length,
      },
      'IFC diff завершён'
    );

    return successResponse(result);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'BIM diff route failed');
    return errorResponse('Внутренняя ошибка', 500);
  }
}
