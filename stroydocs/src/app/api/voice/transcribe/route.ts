import { NextRequest } from 'next/server';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { errorResponse, successResponse } from '@/utils/api';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionOrThrow();
    void session; // используется для auth-проверки

    const formData = await req.formData();
    const audio = formData.get('audio');

    if (!audio || !(audio instanceof Blob)) {
      return errorResponse('Аудио не передано', 400);
    }

    const speechkitKey = process.env.YANDEX_SPEECHKIT_API_KEY;
    const folderId = process.env.YANDEX_FOLDER_ID;

    if (!speechkitKey || !folderId) {
      return errorResponse('Yandex SpeechKit не настроен', 503);
    }

    const audioBuffer = Buffer.from(await audio.arrayBuffer());

    const yaRes = await fetch(
      `https://stt.api.cloud.yandex.net/speech/v1/stt:recognize?folderId=${folderId}&lang=ru-RU`,
      {
        method: 'POST',
        headers: { Authorization: `Api-Key ${speechkitKey}` },
        body: audioBuffer,
      }
    );

    if (!yaRes.ok) {
      logger.error({ status: yaRes.status }, 'Yandex SpeechKit error');
      return errorResponse('Ошибка сервиса распознавания речи', 502);
    }

    const result = await yaRes.json() as { result?: string };
    return successResponse({ text: result.result ?? '' });
  } catch (error) {
    if (error instanceof Response) return error;
    logger.error({ err: error }, 'Ошибка транскрипции');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
