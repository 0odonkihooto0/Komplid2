import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { downloadFile } from '@/lib/s3-utils';
import { detectFormatByMime } from '@/lib/estimates/detect-format';
import { parseXmlEstimate } from '@/lib/estimates/parsers/xml-parser';
import { extractExcelText, tryDirectExcelParse } from '@/lib/estimates/parsers/excel-parser';
import { YandexSafetyFilterError } from '@/lib/estimates/yandex-gpt';
import { parseWithGemini } from '@/lib/estimates/gemini';
import { extractPdfText } from '@/lib/estimates/parsers/pdf-parser';
import { parseWithYandexGpt } from '@/lib/estimates/yandex-gpt';
import { mapItemsToKsi } from '@/lib/estimates/ksi-mapper';
import { computeFileHash, getCachedImportId, cacheImportHash } from '@/lib/estimates/file-cache';
import { EstimateFormat } from '@prisma/client';
import { logger } from '@/lib/logger';
import type { ParsedEstimateItem } from '@/lib/estimates/types';

export const dynamic = 'force-dynamic';

/**
 * Схема тела запроса для режима pre-processed (chunked Excel pipeline).
 * Фронтенд передаёт уже распознанные позиции — бэкенд пропускает парсинг.
 */
const preProcessedBodySchema = z.object({
  preProcessed: z.literal(true),
  items: z.array(
    z.object({
      sortOrder: z.number(),
      rawName: z.string(),
      rawUnit: z.string().nullable(),
      volume: z.number().nullable(),
      price: z.number().nullable(),
      total: z.number().nullable(),
      itemType: z.enum(['WORK', 'MATERIAL']),
      parentIndex: z.number().optional(),
    })
  ),
});

/** Проверяет, является ли ошибка YandexGPT "неустранимой" (сеть, авторизация, лимиты) */
function isYandexRecoverableError(error: Error): boolean {
  return (
    error instanceof YandexSafetyFilterError ||
    error.message.includes('все попытки исчерпаны') ||
    error.message.includes('fetch failed') ||
    error.message.includes('ECONNREFUSED') ||
    error.message.includes('HTTP error') ||
    error.message.includes('401') ||
    error.message.includes('403') ||
    error.message.includes('429')
  );
}

/** POST — запуск парсинга файла сметы */
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

    // Проверяем, является ли это финализацией chunked Excel pipeline
    const body = await req.json().catch(() => null);
    const preProcessedParsed = preProcessedBodySchema.safeParse(body);
    const isPreProcessed = preProcessedParsed.success;

    if (isPreProcessed) {
      return await finalizeChunkedImport(
        params,
        preProcessedParsed.data.items as ParsedEstimateItem[]
      );
    }

    // Стандартный pipeline: XML / PDF / прямой Excel
    const estimateImport = await db.estimateImport.findFirst({
      where: {
        id: params.importId,
        contractId: params.contractId,
        status: 'UPLOADING',
      },
    });

    if (!estimateImport) {
      return errorResponse('Импорт не найден или уже обработан', 404);
    }

    // Скачиваем файл из S3
    const buffer = await downloadFile(estimateImport.fileS3Key);

    // Вычисляем хэш для кэширования
    const fileHash = computeFileHash(buffer);
    const cachedImportId = await getCachedImportId(fileHash);

    if (cachedImportId && cachedImportId !== params.importId) {
      // Файл уже был обработан ранее — возвращаем ссылку на предыдущий импорт
      await db.estimateImport.update({
        where: { id: params.importId },
        data: { fileHash, status: 'FAILED', errorMessage: `Дубликат файла. См. импорт: ${cachedImportId}` },
      });
      return successResponse({ duplicateOf: cachedImportId });
    }

    // Определяем формат
    const format = detectFormatByMime(estimateImport.fileName, estimateImport.mimeType);
    if (!format) {
      await db.estimateImport.update({
        where: { id: params.importId },
        data: { status: 'FAILED', errorMessage: 'Неподдерживаемый формат файла' },
      });
      return errorResponse('Неподдерживаемый формат файла', 400);
    }

    // Обновляем статус
    await db.estimateImport.update({
      where: { id: params.importId },
      data: { format, fileHash, status: 'PARSING' },
    });

    // Парсим в зависимости от формата
    let parsedItems: ParsedEstimateItem[] = [];

    try {
      if (format === EstimateFormat.XML_GRAND_SMETA || format === EstimateFormat.XML_RIK) {
        // XML — детерминированный парсинг без GPT
        const result = await parseXmlEstimate(buffer);
        parsedItems = result.items;

        if (result.warnings.length > 0) {
          logger.warn({ warnings: result.warnings }, 'Предупреждения парсинга XML');
        }
      } else if (format === EstimateFormat.EXCEL) {
        // Excel — сначала пробуем прямой парсинг
        const directItems = await tryDirectExcelParse(buffer);

        if (directItems && directItems.length > 0) {
          parsedItems = directItems;
        } else {
          // Если структура неочевидна — отправляем в YandexGPT (с Gemini fallback)
          await db.estimateImport.update({
            where: { id: params.importId },
            data: { status: 'AI_PROCESSING' },
          });
          const textChunks = await extractExcelText(buffer);
          try {
            parsedItems = await parseWithYandexGpt(textChunks);
          } catch (yandexError) {
            if (
              yandexError instanceof Error &&
              isYandexRecoverableError(yandexError) &&
              process.env.GEMINI_API_KEY
            ) {
              logger.warn({ importId: params.importId }, 'YandexGPT недоступен, Gemini fallback для Excel');
              parsedItems = await parseWithGemini(textChunks.join('\n'));
            } else {
              throw yandexError;
            }
          }
        }
      } else if (format === EstimateFormat.PDF) {
        // PDF — извлекаем текст и отправляем в YandexGPT
        await db.estimateImport.update({
          where: { id: params.importId },
          data: { status: 'AI_PROCESSING' },
        });
        const textChunks = await extractPdfText(buffer);

        if (textChunks.length === 0) {
          await db.estimateImport.update({
            where: { id: params.importId },
            data: { status: 'FAILED', errorMessage: 'PDF не содержит текста (возможно, скан)' },
          });
          return errorResponse('PDF не содержит извлекаемого текста', 400);
        }

        try {
          parsedItems = await parseWithYandexGpt(textChunks);
        } catch (yandexError) {
          if (
            yandexError instanceof Error &&
            isYandexRecoverableError(yandexError) &&
            process.env.GEMINI_API_KEY
          ) {
            logger.warn({ importId: params.importId }, 'YandexGPT недоступен, Gemini fallback для PDF');
            parsedItems = await parseWithGemini(textChunks.join('\n'));
          } else {
            throw yandexError;
          }
        }
      }

      if (parsedItems.length === 0) {
        await db.estimateImport.update({
          where: { id: params.importId },
          data: { status: 'FAILED', errorMessage: 'Не удалось извлечь позиции из файла' },
        });
        return errorResponse('Не удалось извлечь позиции из файла', 400);
      }

      const result = await saveItemsToDb(params.importId, parsedItems);

      // Кэшируем хэш файла
      await cacheImportHash(fileHash, params.importId);

      logger.info(
        { importId: params.importId, itemsTotal: parsedItems.length },
        'Парсинг сметы завершён'
      );

      return successResponse(result);
    } catch (parseError) {
      logger.error({ err: parseError, importId: params.importId }, 'Ошибка парсинга сметы');

      await db.estimateImport.update({
        where: { id: params.importId },
        data: {
          status: 'FAILED',
          errorMessage: parseError instanceof Error ? parseError.message : 'Ошибка парсинга',
        },
      });

      return errorResponse('Ошибка парсинга файла', 500);
    }
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка запуска парсинга сметы');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

/**
 * Финализация chunked Excel pipeline.
 * Принимает уже распознанные позиции от фронтенда (результаты process-chunk),
 * выполняет KSI-маппинг и сохраняет в БД.
 *
 * Если items пустой массив (все чанки были пропущены) — статус становится PREVIEW
 * с 0 позициями, пользователь добавит вручную.
 */
async function finalizeChunkedImport(
  params: { objectId: string; contractId: string; importId: string },
  items: ParsedEstimateItem[]
) {
  const estimateImport = await db.estimateImport.findFirst({
    where: {
      id: params.importId,
      contractId: params.contractId,
      status: { in: ['UPLOADING', 'PARSING', 'AI_PROCESSING'] },
    },
  });

  if (!estimateImport) {
    return errorResponse('Импорт не найден или уже обработан', 404);
  }

  logger.info(
    { importId: params.importId, itemsCount: items.length },
    'Финализация chunked Excel импорта'
  );

  if (items.length === 0) {
    // Все чанки пропущены — переводим в PREVIEW с 0 позициями
    await db.estimateImport.update({
      where: { id: params.importId },
      data: { status: 'PREVIEW', parsedAt: new Date(), itemsTotal: 0, itemsMapped: 0 },
    });

    const result = await db.estimateImport.findUnique({
      where: { id: params.importId },
      include: { items: { orderBy: { sortOrder: 'asc' } } },
    });

    logger.info({ importId: params.importId }, 'Chunked import финализирован с 0 позициями');
    return successResponse(result);
  }

  const result = await saveItemsToDb(params.importId, items);

  logger.info(
    { importId: params.importId, itemsTotal: items.length },
    'Chunked Excel импорт финализирован'
  );

  return successResponse(result);
}

/**
 * KSI-маппинг и сохранение позиций в БД.
 * Двухэтапная транзакция для разрешения self-FK parentItemId.
 */
async function saveItemsToDb(importId: string, parsedItems: ParsedEstimateItem[]) {
  const mappedItems = await mapItemsToKsi(parsedItems);
  const itemsMapped = mappedItems.filter((m) => m.ksiNodeId !== null).length;

  await db.$transaction(async (tx) => {
    // Этап 1: создаём все позиции без parentItemId
    await tx.estimateImportItem.createMany({
      data: mappedItems.map((m) => ({
        sortOrder: m.item.sortOrder,
        rawName: m.item.rawName,
        rawUnit: m.item.rawUnit,
        volume: m.item.volume,
        price: m.item.price,
        total: m.item.total,
        status: m.status,
        itemType: m.item.itemType,
        suggestedKsiNodeId: m.ksiNodeId,
        importId,
      })),
    });

    // Этап 2: проставляем parentItemId для материалов (если указан parentIndex)
    const createdItems = await tx.estimateImportItem.findMany({
      where: { importId },
      orderBy: { sortOrder: 'asc' },
      select: { id: true, sortOrder: true },
    });

    const updates = mappedItems
      .filter((m) => m.item.itemType === 'MATERIAL' && typeof m.item.parentIndex === 'number')
      .map((m) => {
        const parentItem = createdItems[m.item.parentIndex!];
        const thisItem = createdItems[m.item.sortOrder - 1];
        if (!parentItem || !thisItem) return null;
        return tx.estimateImportItem.update({
          where: { id: thisItem.id },
          data: { parentItemId: parentItem.id },
        });
      })
      .filter(Boolean);

    await Promise.all(updates);

    await tx.estimateImport.update({
      where: { id: importId },
      data: {
        status: 'PREVIEW',
        parsedAt: new Date(),
        itemsTotal: mappedItems.length,
        itemsMapped,
      },
    });
  });

  // Возвращаем полный результат с items
  return db.estimateImport.findUnique({
    where: { id: importId },
    include: {
      items: {
        include: {
          suggestedKsiNode: {
            select: { id: true, code: true, name: true },
          },
        },
        orderBy: { sortOrder: 'asc' },
      },
    },
  });
}
