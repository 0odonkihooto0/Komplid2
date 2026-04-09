import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { parseChunkWithYandexGpt, YandexSafetyFilterError } from '@/lib/estimates/yandex-gpt';
import { parseChunkWithGemini } from '@/lib/estimates/gemini';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const processChunkSchema = z.object({
  /** 0-based номер чанка (для логирования и отчёта об ошибках) */
  chunkIndex: z.number().int().min(0),
  /** Заголовки таблицы (первая строка Excel) */
  headers: z.array(z.string()),
  /** Строки данных этого чанка */
  rows: z.array(z.array(z.string())),
});

/**
 * POST — обработка одного чанка Excel-сметы через YandexGPT (с Gemini fallback).
 *
 * Этап 2 нового конвейера: фронтенд последовательно отправляет чанки,
 * накапливает результаты и применяет стратегию "Skip & Mark" при ошибках.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { objectId: string; contractId: string; importId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.objectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const estimateImport = await db.estimateImport.findFirst({
      where: { id: params.importId, contractId: params.contractId },
    });
    if (!estimateImport) return errorResponse('Импорт не найден', 404);

    const body = await req.json();
    const parsed = processChunkSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Некорректные данные чанка', 400);
    }

    const { chunkIndex, headers, rows } = parsed.data;

    if (rows.length === 0) {
      return successResponse({ items: [], warnings: [], usedFallback: false });
    }

    logger.info(
      { importId: params.importId, chunkIndex, rowsCount: rows.length },
      'Обработка чанка сметы'
    );

    let usedFallback = false;
    const warnings: string[] = [];

    try {
      // Основной парсер — YandexGPT
      const items = await parseChunkWithYandexGpt(headers, rows);

      logger.info(
        { importId: params.importId, chunkIndex, itemsFound: items.length },
        'Чанк обработан через YandexGPT'
      );

      return successResponse({ items, warnings, usedFallback });
    } catch (yandexError) {
      const isSafetyFilter = yandexError instanceof YandexSafetyFilterError;
      const isNetworkError =
        yandexError instanceof Error &&
        (yandexError.message.includes('fetch failed') ||
          yandexError.message.includes('ECONNREFUSED') ||
          yandexError.message.includes('все попытки исчерпаны'));

      // Gemini fallback при safety-фильтре или сетевой ошибке
      if ((isSafetyFilter || isNetworkError) && process.env.GEMINI_API_KEY) {
        logger.warn(
          { importId: params.importId, chunkIndex, reason: isSafetyFilter ? 'safety_filter' : 'network_error' },
          'YandexGPT недоступен, переключение на Gemini'
        );

        warnings.push(
          isSafetyFilter
            ? `Блок ${chunkIndex + 1}: YandexGPT отклонил запрос, обработан через резервный AI`
            : `Блок ${chunkIndex + 1}: YandexGPT недоступен, обработан через резервный AI`
        );

        try {
          const items = await parseChunkWithGemini(headers, rows);
          usedFallback = true;

          logger.info(
            { importId: params.importId, chunkIndex, itemsFound: items.length },
            'Чанк обработан через Gemini fallback'
          );

          return successResponse({ items, warnings, usedFallback });
        } catch (geminiError) {
          logger.error({ err: geminiError, chunkIndex }, 'Gemini fallback тоже не сработал');
        }
      }

      // Оба AI недоступны — возвращаем ошибку для "Skip & Mark" на фронтенде
      logger.error(
        { err: yandexError, importId: params.importId, chunkIndex },
        'Не удалось обработать чанк'
      );

      return NextResponse.json(
        {
          success: false,
          error: `Ошибка обработки блока ${chunkIndex + 1}. Заполните вручную.`,
          chunkIndex,
        },
        { status: 422 }
      );
    }
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Внутренняя ошибка process-chunk');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
