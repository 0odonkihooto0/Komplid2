import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import type { AosrRegistryRow, AosrRegistryContext, AosrRegistryResponse } from '@/types/aosr-registry';
import type { ParticipantRole } from '@prisma/client';

export const dynamic = 'force-dynamic';

const ROLE_LABELS: Record<ParticipantRole, string> = {
  DEVELOPER: 'Застройщик',
  CONTRACTOR: 'Подрядчик',
  SUPERVISION: 'Авторский надзор',
  SUBCONTRACTOR: 'Субподрядчик',
};

export async function GET(
  _req: NextRequest,
  { params }: { params: { projectId: string; contractId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const [docs, archiveDocs, contract] = await Promise.all([
      db.executionDoc.findMany({
        where: { contractId: params.contractId, type: 'AOSR' },
        include: {
          workRecord: {
            include: {
              workItem: true,
              writeoffs: {
                include: {
                  material: {
                    include: { documents: { take: 1, orderBy: { uploadedAt: 'asc' } } },
                  },
                },
              },
            },
          },
        },
        orderBy: { number: 'asc' },
      }),
      db.archiveDocument.findMany({
        where: { contractId: params.contractId, category: 'EXECUTION_DRAWINGS' },
        select: { fileName: true, cipher: true },
      }),
      db.contract.findUnique({
        where: { id: params.contractId },
        include: {
          buildingObject: true,
          participants: {
            include: {
              organization: {
                select: { name: true, inn: true, ogrn: true, address: true, sroName: true, sroNumber: true },
              },
            },
          },
        },
      }),
    ]);

    if (!contract) return errorResponse('Договор не найден', 404);

    const schemas = archiveDocs.map((d) => d.cipher ?? d.fileName);

    // Формируем строки реестра
    const rows: AosrRegistryRow[] = docs.map((doc) => {
      const overrides = (doc.overrideFields as Record<string, string>) ?? {};
      const dbMaterials = doc.workRecord
        ? doc.workRecord.writeoffs.map((w) => w.material.name).join(', ')
        : '';
      const dbCertificates = doc.workRecord
        ? doc.workRecord.writeoffs
            .flatMap((w) => w.material.documents)
            .map((d) => d.fileName)
            .join(', ')
        : '';

      return {
        id: doc.id,
        number: doc.number,
        status: doc.status,
        workName: doc.workRecord?.workItem?.name ?? '',
        materials: overrides.materials ?? dbMaterials,
        certificates: overrides.certificates ?? dbCertificates,
        schemaRef: overrides.schemaRef ?? '',
        nextWorks: overrides.nextWorks ?? '',
        dbMaterials,
        dbCertificates,
        overrides,
      };
    });

    // Формируем контекст проекта
    const findParticipant = (role: ParticipantRole) =>
      contract.participants.find((p) => p.role === role);

    const buildOrgStr = (role: ParticipantRole): string => {
      const p = findParticipant(role);
      if (!p) return '';
      const { name, inn, ogrn } = p.organization;
      return [name, inn ? `ИНН: ${inn}` : '', ogrn ? `ОГРН: ${ogrn}` : ''].filter(Boolean).join(', ');
    };

    const buildRepStr = (role: ParticipantRole): string => {
      const p = findParticipant(role);
      if (!p) return '';
      const parts: string[] = [];
      if (p.position) parts.push(p.position);
      if (p.representativeName) parts.push(p.representativeName);
      if (p.appointmentOrder) parts.push(`приказ №${p.appointmentOrder}`);
      return parts.join(' ');
    };

    const missingReps: string[] = [];
    const checkRep = (role: ParticipantRole) => {
      const p = findParticipant(role);
      if (p && (!p.representativeName || !p.position)) {
        missingReps.push(ROLE_LABELS[role]);
      }
    };
    (['DEVELOPER', 'CONTRACTOR', 'SUPERVISION', 'SUBCONTRACTOR'] as ParticipantRole[]).forEach(checkRep);

    const projectContext: AosrRegistryContext = {
      object: [contract.buildingObject.name, contract.buildingObject.address].filter(Boolean).join(', '),
      contractNumber: contract.number,
      developerOrg: buildOrgStr('DEVELOPER'),
      contractorOrg: buildOrgStr('CONTRACTOR'),
      supervisionOrg: buildOrgStr('SUPERVISION'),
      subcontractorOrg: buildOrgStr('SUBCONTRACTOR'),
      developerRep: buildRepStr('DEVELOPER'),
      contractorRep: buildRepStr('CONTRACTOR'),
      supervisionRep: buildRepStr('SUPERVISION'),
      subcontractorRep: buildRepStr('SUBCONTRACTOR'),
      developerRepName: findParticipant('DEVELOPER')?.representativeName ?? '',
      contractorRepName: findParticipant('CONTRACTOR')?.representativeName ?? '',
      supervisionRepName: findParticipant('SUPERVISION')?.representativeName ?? '',
      subcontractorRepName: findParticipant('SUBCONTRACTOR')?.representativeName ?? '',
      missingReps,
    };

    const response: AosrRegistryResponse = { rows, schemas, projectContext };
    return successResponse(response);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения реестра АОСР');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
