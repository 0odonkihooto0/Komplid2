import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

type Params = { projectId: string; contractId: string };

async function findContract(projectId: string, contractId: string, organizationId: string) {
  const project = await db.buildingObject.findFirst({ where: { id: projectId, organizationId } });
  if (!project) return null;
  return db.contract.findFirst({ where: { id: contractId, projectId } });
}

const createLinkSchema = z.object({
  documentId: z.string().uuid('Некорректный ID документа'),
  linkType: z.enum(['ZNP', 'ZNII']),
});

// Получить список привязанных документов (фильтр по ?linkType=ZNP или ZNII)
export async function GET(req: NextRequest, { params }: { params: Params }) {
  try {
    const session = await getSessionOrThrow();
    const contract = await findContract(params.projectId, params.contractId, session.user.organizationId);
    if (!contract) return errorResponse('Договор не найден', 404);

    const linkType = req.nextUrl.searchParams.get('linkType');
    if (!linkType || !['ZNP', 'ZNII'].includes(linkType)) {
      return errorResponse('Параметр linkType обязателен (ZNP или ZNII)', 400);
    }

    const links = await db.contractDocLink.findMany({
      where: { contractId: params.contractId, linkType },
      include: {
        document: {
          select: {
            id: true,
            name: true,
            fileName: true,
            mimeType: true,
            fileSize: true,
            createdAt: true,
            folder: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return successResponse(links);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения привязанных документов');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

// Привязать проектный документ к договору (ЗнП или ЗнИИ)
export async function POST(req: NextRequest, { params }: { params: Params }) {
  try {
    const session = await getSessionOrThrow();
    const contract = await findContract(params.projectId, params.contractId, session.user.organizationId);
    if (!contract) return errorResponse('Договор не найден', 404);

    const body = await req.json();
    const parsed = createLinkSchema.safeParse(body);
    if (!parsed.success) return errorResponse(parsed.error.issues[0].message, 400);

    // Проверяем что документ принадлежит тому же проекту (защита cross-project)
    const document = await db.projectDocument.findFirst({
      where: { id: parsed.data.documentId },
      include: { folder: { select: { projectId: true } } },
    });

    if (!document || document.folder.projectId !== params.projectId) {
      return errorResponse('Документ не найден в данном проекте', 404);
    }

    // Создаём привязку с защитой от дубликатов (@@unique)
    try {
      const link = await db.contractDocLink.create({
        data: {
          contractId: params.contractId,
          documentId: parsed.data.documentId,
          linkType: parsed.data.linkType,
        },
        include: {
          document: {
            select: {
              id: true, name: true, fileName: true, mimeType: true, fileSize: true, createdAt: true,
              folder: { select: { name: true } },
            },
          },
        },
      });
      return successResponse(link);
    } catch (dbError) {
      // Prisma P2002 — нарушение уникального ограничения
      if (
        typeof dbError === 'object' &&
        dbError !== null &&
        'code' in dbError &&
        (dbError as { code: string }).code === 'P2002'
      ) {
        return errorResponse('Этот документ уже привязан к договору с данным типом', 409);
      }
      throw dbError;
    }
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка привязки документа к договору');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
