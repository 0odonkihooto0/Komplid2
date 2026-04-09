import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { generateKs3Pdf } from '@/lib/ks2-pdf-generator';
import { uploadFile, buildS3Key } from '@/lib/s3-utils';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

type Params = { params: { objectId: string; contractId: string; ks2Id: string } };

/** POST — сгенерировать PDF справки КС-3 */
export async function POST(_req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.objectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const act = await db.ks2Act.findFirst({
      where: { id: params.ks2Id, contractId: params.contractId },
      include: {
        ks3Certificate: true,
        contract: {
          select: {
            number: true,
            buildingObject: { select: { name: true, address: true } },
            participants: {
              include: { organization: { select: { name: true } } },
            },
          },
        },
      },
    });
    if (!act) return errorResponse('Акт КС-2 не найден', 404);
    if (!act.ks3Certificate) return errorResponse('Сначала создайте КС-3', 404);

    const contractor = act.contract.participants.find((p) => p.role === 'CONTRACTOR');
    const contractorName = contractor?.organization?.name || act.contract.buildingObject.name;

    const participants = act.contract.participants.map((p) => ({
      role: p.role === 'DEVELOPER' ? 'Застройщик'
        : p.role === 'CONTRACTOR' ? 'Подрядчик'
        : p.role === 'SUPERVISION' ? 'Стройконтроль'
        : 'Субподрядчик',
      organizationName: p.organization?.name || '',
      representativeName: '___________________',
      position: '___________________',
    }));

    const totalAmountFormatted = act.totalAmount.toLocaleString('ru-RU', { minimumFractionDigits: 2 });

    const pdfBuffer = await generateKs3Pdf({
      ks2Number: act.number,
      contractNumber: act.contract.number,
      projectName: act.contract.buildingObject.name,
      projectAddress: act.contract.buildingObject.address || '',
      contractorName,
      periodStart: act.periodStart.toLocaleDateString('ru-RU'),
      periodEnd: act.periodEnd.toLocaleDateString('ru-RU'),
      totalAmount: totalAmountFormatted,
      totalAmountWords: `${totalAmountFormatted} рублей`,
      participants,
    });

    const fileName = `ks3-${act.number.replace(/[^a-zA-Z0-9-]/g, '_')}.pdf`;
    const s3Key = buildS3Key(session.user.organizationId, 'ks3', fileName);
    await uploadFile(pdfBuffer, s3Key, 'application/pdf');

    await db.ks3Certificate.update({
      where: { id: act.ks3Certificate.id },
      data: { s3Key, fileName, generatedAt: new Date() },
    });

    return successResponse({ s3Key, fileName });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка генерации PDF КС-3');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
