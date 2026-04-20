import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { errorResponse, successResponse } from '@/utils/api';
import { logger } from '@/lib/logger';
import { checkGeofence } from '@/lib/geofencing/distance';
import { z } from 'zod';
import { Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';

type Params = { params: { projectId: string; contractId: string; docId: string } };

const signBodySchema = z.object({
  gpsLat: z.number().optional(),
  gpsLng: z.number().optional(),
  gpsAccuracy: z.number().optional(),
});

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
      select: { id: true, latitude: true, longitude: true },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const route = await db.signingRoute.findUnique({
      where: { executionDocId: params.docId },
      include: { steps: true },
    });

    if (!route || route.status !== 'PENDING') {
      return errorResponse('Активный маршрут подписания не найден', 400);
    }

    const step = route.steps.find(
      (s) => s.userId === session.user.id && s.status === 'WAITING'
    );

    if (!step) {
      return errorResponse('Вы не входите в маршрут подписания или уже подписали документ', 400);
    }

    let body: z.infer<typeof signBodySchema> = {};
    try {
      const raw = await req.json();
      body = signBodySchema.parse(raw);
    } catch {
      // body опционально — игнорируем ошибку парсинга
    }

    const { gpsLat, gpsLng, gpsAccuracy } = body;

    // Вычисляем геозону если переданы GPS и у объекта есть координаты
    let signedAtLocation: Prisma.InputJsonValue | null = null;
    if (
      gpsLat !== undefined &&
      gpsLng !== undefined &&
      project.latitude !== null &&
      project.longitude !== null
    ) {
      const geoResult = checkGeofence(gpsLat, gpsLng, project.latitude, project.longitude);
      signedAtLocation = {
        objectId: project.id,
        distance: Math.round(geoResult.distance),
        isWithinGeofence: geoResult.isWithin,
      } as unknown as Prisma.InputJsonValue;
    }

    // Создать запись подписи
    await db.signature.create({
      data: {
        signatureType: 'SIMPLE',
        userId: session.user.id,
        executionDocId: params.docId,
        gpsLat: gpsLat ?? null,
        gpsLng: gpsLng ?? null,
        gpsAccuracy: gpsAccuracy ?? null,
        signedAtLocation: signedAtLocation ?? Prisma.JsonNull,
      },
    });

    // Пометить шаг как подписанный
    await db.signingStep.update({
      where: { id: step.id },
      data: { status: 'SIGNED', signedAt: new Date() },
    });

    // Если все шаги подписаны — завершить маршрут
    const allSigned = route.steps.every(
      (s) => s.id === step.id ? true : s.status === 'SIGNED'
    );
    if (allSigned) {
      await db.signingRoute.update({
        where: { id: route.id },
        data: { status: 'SIGNED' },
      });
    }

    return successResponse({ message: 'Документ подписан' });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка подписания документа');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
