import { logger } from '@/lib/logger';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { NextRequest, NextResponse } from 'next/server';
import type { ExecutionDocStatus, ExecutionDocType, ArchiveCategory } from '@prisma/client';

export const dynamic = 'force-dynamic';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionOrThrow();
    const orgId = session.user.organizationId;

    const { searchParams } = req.nextUrl;
    const type = searchParams.get('type') ?? 'execution'; // execution | archive
    const projectId = searchParams.get('projectId') ?? undefined;
    const contractId = searchParams.get('contractId') ?? undefined;
    const status = searchParams.get('status') as ExecutionDocStatus | null;
    const docType = searchParams.get('docType') as ExecutionDocType | null;
    const category = searchParams.get('category') as ArchiveCategory | null;
    const search = searchParams.get('search') ?? undefined;
    const page = Math.max(1, Number(searchParams.get('page') ?? 1));
    const limit = Math.min(MAX_LIMIT, Math.max(1, Number(searchParams.get('limit') ?? DEFAULT_LIMIT)));
    const skip = (page - 1) * limit;

    if (type === 'execution') {
      const where = {
        contract: {
          buildingObject: {
            organizationId: orgId,
            ...(projectId && { id: projectId }),
          },
          ...(contractId && { id: contractId }),
        },
        ...(status && { status }),
        ...(docType && { type: docType }),
        ...(search && {
          OR: [
            { title: { contains: search, mode: 'insensitive' as const } },
            { number: { contains: search, mode: 'insensitive' as const } },
          ],
        }),
      };

      const [docs, total] = await Promise.all([
        db.executionDoc.findMany({
          where,
          take: limit,
          skip,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            number: true,
            title: true,
            type: true,
            status: true,
            generatedAt: true,
            createdAt: true,
            contract: {
              select: {
                id: true,
                number: true,
                name: true,
                buildingObject: { select: { id: true, name: true } },
              },
            },
          },
        }),
        db.executionDoc.count({ where }),
      ]);

      return successResponse({ data: docs, total, page, limit });
    }

    // Archive documents
    const archiveWhere = {
      contract: {
        buildingObject: {
          organizationId: orgId,
          ...(projectId && { id: projectId }),
        },
        ...(contractId && { id: contractId }),
      },
      ...(category && { category }),
      ...(search && {
        fileName: { contains: search, mode: 'insensitive' as const },
      }),
    };

    const [docs, total] = await Promise.all([
      db.archiveDocument.findMany({
        where: archiveWhere,
        take: limit,
        skip,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          fileName: true,
          category: true,
          mimeType: true,
          size: true,
          certifiedCopy: true,
          createdAt: true,
          contract: {
            select: {
              id: true,
              number: true,
              name: true,
              buildingObject: { select: { id: true, name: true } },
            },
          },
        },
      }),
      db.archiveDocument.count({ where: archiveWhere }),
    ]);

    return successResponse({ data: docs, total, page, limit });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения глобального архива документов');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
