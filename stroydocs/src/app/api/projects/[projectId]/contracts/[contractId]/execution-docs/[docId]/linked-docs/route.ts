import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { z } from 'zod';
import { Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';

// Схема валидации тела POST-запроса
const createLinkSchema = z.object({
  targetDocId: z.string().uuid(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: { projectId: string; contractId: string; docId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    // Проверка принадлежности объекта к организации пользователя
    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const { searchParams } = new URL(req.url);
    const mode = searchParams.get('mode');

    // Режим поиска документов для привязки
    if (mode === 'search') {
      const q = searchParams.get('q') ?? '';
      const orgFilter = searchParams.get('orgFilter') === 'true';

      // Собираем ID уже связанных документов (оба направления)
      const existingLinks = await db.executionDocLink.findMany({
        where: {
          OR: [
            { sourceDocId: params.docId },
            { targetDocId: params.docId },
          ],
        },
        select: { sourceDocId: true, targetDocId: true },
      });

      // Формируем набор ID которые нужно исключить (сам документ + уже связанные)
      const excludedIds = new Set<string>([params.docId]);
      for (const link of existingLinks) {
        excludedIds.add(link.sourceDocId);
        excludedIds.add(link.targetDocId);
      }

      // Условие поиска по номеру или заголовку
      const searchCondition: Prisma.ExecutionDocWhereInput = q
        ? {
            OR: [
              { number: { contains: q, mode: 'insensitive' } },
              { title: { contains: q, mode: 'insensitive' } },
            ],
          }
        : {};

      // При orgFilter=true — ограничиваем поиск в рамках той же организации
      const orgCondition: Prisma.ExecutionDocWhereInput = orgFilter
        ? {
            contract: {
              buildingObject: {
                organizationId: session.user.organizationId,
              },
            },
          }
        : {};

      const docs = await db.executionDoc.findMany({
        where: {
          id: { notIn: Array.from(excludedIds) },
          ...searchCondition,
          ...orgCondition,
        },
        select: {
          id: true,
          number: true,
          type: true,
          status: true,
          title: true,
          createdAt: true,
          contract: {
            select: { id: true, name: true },
          },
        },
        take: 50,
        orderBy: { createdAt: 'desc' },
      });

      return successResponse(docs);
    }

    // Режим по умолчанию — возвращаем существующие связи документа
    const links = await db.executionDocLink.findMany({
      where: {
        OR: [
          { sourceDocId: params.docId },
          { targetDocId: params.docId },
        ],
      },
      include: {
        sourceDoc: {
          select: {
            id: true,
            number: true,
            type: true,
            status: true,
            title: true,
            createdAt: true,
            contract: { select: { id: true, name: true } },
          },
        },
        targetDoc: {
          select: {
            id: true,
            number: true,
            type: true,
            status: true,
            title: true,
            createdAt: true,
            contract: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Приводим к виду { linkId, linkedDoc } — противоположный документ относительно текущего
    const result = links.map((link) => ({
      linkId: link.id,
      linkedDoc: link.sourceDocId === params.docId ? link.targetDoc : link.sourceDoc,
    }));

    return successResponse(result);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения связанных документов ИД');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { projectId: string; contractId: string; docId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    // Проверка принадлежности объекта к организации пользователя
    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    // Проверка существования исходного документа
    const sourceDoc = await db.executionDoc.findFirst({
      where: { id: params.docId, contractId: params.contractId },
    });
    if (!sourceDoc) return errorResponse('Документ не найден', 404);

    const body = await req.json();
    const parsed = createLinkSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Ошибка валидации', 400, parsed.error.issues);
    }

    const { targetDocId } = parsed.data;

    // Нельзя привязать документ к самому себе
    if (targetDocId === params.docId) {
      return errorResponse('Нельзя привязать документ к самому себе', 400);
    }

    try {
      const link = await db.executionDocLink.create({
        data: {
          sourceDocId: params.docId,
          targetDocId,
        },
      });

      return successResponse(link);
    } catch (dbError) {
      // P2002 — нарушение уникального ограничения (связь уже существует)
      if (
        dbError instanceof Prisma.PrismaClientKnownRequestError &&
        dbError.code === 'P2002'
      ) {
        return errorResponse('Связь уже существует', 409);
      }
      throw dbError;
    }
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка создания связи документов ИД');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
