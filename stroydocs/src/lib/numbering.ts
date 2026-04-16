import { db, type PrismaTx } from '@/lib/db';

/**
 * Авто-нумерация деловой переписки.
 * Формат: ИСХ-{год}-{порядковый номер} / ВХ-{год}-{порядковый номер}
 * Пример: ИСХ-2025-001, ВХ-2025-042
 *
 * Для защиты от race condition при параллельных запросах используется
 * pg_advisory_xact_lock — транзакционный advisory lock по ключу проекта+направления+года.
 */
export async function getNextCorrespondenceNumber(
  projectId: string,
  direction: 'OUTGOING' | 'INCOMING'
): Promise<string> {
  const prefix = direction === 'OUTGOING' ? 'ИСХ' : 'ВХ';
  const year = new Date().getFullYear();
  const lockKey = `corr:${projectId}:${direction}:${year}`;
  const pattern = `${prefix}-${year}-%`;

  return db.$transaction(async (tx: PrismaTx) => {
    // Захватить транзакционный advisory lock — блокирует конкурентные запросы
    // до завершения транзакции, исключая дублирование номеров
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`;

    const results = await tx.$queryRaw<Array<{ max_num: string | null }>>`
      SELECT MAX(number) AS max_num
      FROM correspondences
      WHERE "projectId" = ${projectId}
        AND number LIKE ${pattern}
    `;

    const lastSeq = results[0]?.max_num
      ? parseInt(results[0].max_num.split('-').at(-1) ?? '0', 10)
      : 0;

    return `${prefix}-${year}-${String(lastSeq + 1).padStart(3, '0')}`;
  });
}

/**
 * Авто-нумерация RFI (Request for Information).
 * Формат: RFI-{год}-{порядковый номер}
 * Пример: RFI-2025-001
 */
export async function getNextRFINumber(projectId: string): Promise<string> {
  const year = new Date().getFullYear();
  const lockKey = `rfi:${projectId}:${year}`;
  const pattern = `RFI-${year}-%`;

  return db.$transaction(async (tx: PrismaTx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`;

    const results = await tx.$queryRaw<Array<{ max_num: string | null }>>`
      SELECT MAX(number) AS max_num
      FROM rfis
      WHERE "projectId" = ${projectId}
        AND number LIKE ${pattern}
    `;

    const lastSeq = results[0]?.max_num
      ? parseInt(results[0].max_num.split('-').at(-1) ?? '0', 10)
      : 0;

    return `RFI-${year}-${String(lastSeq + 1).padStart(3, '0')}`;
  });
}

/**
 * Авто-нумерация СЭД-документов.
 * Формат: СЭД-{год}-{порядковый номер}
 * Пример: СЭД-2025-001
 */
export async function getNextSEDNumber(projectId: string): Promise<string> {
  const year = new Date().getFullYear();
  const lockKey = `sed:${projectId}:${year}`;
  const pattern = `СЭД-${year}-%`;

  return db.$transaction(async (tx: PrismaTx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`;

    const results = await tx.$queryRaw<Array<{ max_num: string | null }>>`
      SELECT MAX(number) AS max_num
      FROM sed_documents
      WHERE "projectId" = ${projectId}
        AND number LIKE ${pattern}
    `;

    const lastSeq = results[0]?.max_num
      ? parseInt(results[0].max_num.split('-').at(-1) ?? '0', 10)
      : 0;

    return `СЭД-${year}-${String(lastSeq + 1).padStart(3, '0')}`;
  });
}

/**
 * Авто-нумерация задания на ПИР (ЗП — проектирование, ЗИ — изыскания).
 * Формат: ЗП-{год}-{NNN} / ЗИ-{год}-{NNN}
 */
export async function getNextDesignTaskNumber(
  projectId: string,
  taskType: 'DESIGN' | 'SURVEY'
): Promise<string> {
  const prefix = taskType === 'DESIGN' ? 'ЗП' : 'ЗИ';
  const year = new Date().getFullYear();
  const lockKey = `design-task:${projectId}:${taskType}:${year}`;
  const pattern = `${prefix}-${year}-%`;

  return db.$transaction(async (tx: PrismaTx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`;

    const results = await tx.$queryRaw<Array<{ max_num: string | null }>>`
      SELECT MAX(number) AS max_num
      FROM design_tasks
      WHERE "projectId" = ${projectId}
        AND number LIKE ${pattern}
    `;

    const lastSeq = results[0]?.max_num
      ? parseInt(results[0].max_num.split('-').at(-1) ?? '0', 10)
      : 0;

    return `${prefix}-${year}-${String(lastSeq + 1).padStart(3, '0')}`;
  });
}

/**
 * Авто-нумерация документов ПИР.
 * Формат: ПД-{год}-{NNN}
 */
export async function getNextDesignDocNumber(projectId: string): Promise<string> {
  const year = new Date().getFullYear();
  const lockKey = `design-doc:${projectId}:${year}`;
  const pattern = `ПД-${year}-%`;

  return db.$transaction(async (tx: PrismaTx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`;

    const results = await tx.$queryRaw<Array<{ max_num: string | null }>>`
      SELECT MAX(number) AS max_num
      FROM design_documents
      WHERE "projectId" = ${projectId}
        AND number LIKE ${pattern}
    `;

    const lastSeq = results[0]?.max_num
      ? parseInt(results[0].max_num.split('-').at(-1) ?? '0', 10)
      : 0;

    return `ПД-${year}-${String(lastSeq + 1).padStart(3, '0')}`;
  });
}

/**
 * Авто-нумерация реестров ПИР.
 * Формат: РЕЕ-{год}-{NNN}
 */
export async function getNextPIRRegistryNumber(projectId: string): Promise<string> {
  const year = new Date().getFullYear();
  const lockKey = `pir-registry:${projectId}:${year}`;
  const pattern = `РЕЕ-${year}-%`;

  return db.$transaction(async (tx: PrismaTx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`;

    const results = await tx.$queryRaw<Array<{ max_num: string | null }>>`
      SELECT MAX(number) AS max_num
      FROM pir_registries
      WHERE "projectId" = ${projectId}
        AND number LIKE ${pattern}
    `;

    const lastSeq = results[0]?.max_num
      ? parseInt(results[0].max_num.split('-').at(-1) ?? '0', 10)
      : 0;

    return `РЕЕ-${year}-${String(lastSeq + 1).padStart(3, '0')}`;
  });
}

/**
 * Авто-нумерация актов закрытия ПИР.
 * Формат: АКТ-{год}-{NNN}
 */
export async function getNextPIRClosureNumber(projectId: string): Promise<string> {
  const year = new Date().getFullYear();
  const lockKey = `pir-closure:${projectId}:${year}`;
  const pattern = `АКТ-${year}-%`;

  return db.$transaction(async (tx: PrismaTx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`;

    const results = await tx.$queryRaw<Array<{ max_num: string | null }>>`
      SELECT MAX(number) AS max_num
      FROM pir_closure_acts
      WHERE "projectId" = ${projectId}
        AND number LIKE ${pattern}
    `;

    const lastSeq = results[0]?.max_num
      ? parseInt(results[0].max_num.split('-').at(-1) ?? '0', 10)
      : 0;

    return `АКТ-${year}-${String(lastSeq + 1).padStart(3, '0')}`;
  });
}

/**
 * Порядковый номер замечания к заданию ПИР (в рамках задания).
 */
export async function getNextTaskCommentNumber(taskId: string): Promise<number> {
  const lockKey = `task-comment:${taskId}`;

  return db.$transaction(async (tx: PrismaTx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`;

    const results = await tx.$queryRaw<Array<{ cnt: bigint }>>`
      SELECT COUNT(*) AS cnt
      FROM design_task_comments
      WHERE "taskId" = ${taskId}
    `;

    return Number(results[0]?.cnt ?? 0) + 1;
  });
}

/**
 * Порядковый номер замечания к документу ПИР (в рамках документа).
 */
export async function getNextDocCommentNumber(docId: string): Promise<number> {
  const lockKey = `doc-comment:${docId}`;

  return db.$transaction(async (tx: PrismaTx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`;

    const results = await tx.$queryRaw<Array<{ cnt: bigint }>>`
      SELECT COUNT(*) AS cnt
      FROM design_doc_comments
      WHERE "docId" = ${docId}
    `;

    return Number(results[0]?.cnt ?? 0) + 1;
  });
}

/**
 * Авто-нумерация карточек документооборота СЭД.
 * Формат: ДО-{год}-{NNN}
 * Пример: ДО-2025-001
 *
 * Нумерация в рамках проекта через JOIN на sed_documents
 * (sed_workflows не хранит projectId напрямую).
 */
export async function getNextSEDWorkflowNumber(projectId: string): Promise<string> {
  const year = new Date().getFullYear();
  const lockKey = `sed-workflow:${projectId}:${year}`;
  const pattern = `ДО-${year}-%`;

  return db.$transaction(async (tx: PrismaTx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`;

    const results = await tx.$queryRaw<Array<{ max_num: string | null }>>`
      SELECT MAX(sw.number) AS max_num
      FROM sed_workflows sw
      JOIN sed_documents sd ON sw."documentId" = sd.id
      WHERE sd."projectId" = ${projectId}
        AND sw.number LIKE ${pattern}
    `;

    const lastSeq = results[0]?.max_num
      ? parseInt(results[0].max_num.split('-').at(-1) ?? '0', 10)
      : 0;

    return `ДО-${year}-${String(lastSeq + 1).padStart(3, '0')}`;
  });
}

/**
 * Префиксы авто-нумерации специальных журналов.
 */
const JOURNAL_PREFIXES: Record<string, string> = {
  CONCRETE_WORKS: 'ЖБР',
  WELDING_WORKS: 'ЖСР',
  AUTHOR_SUPERVISION: 'ЖАН',
  MOUNTING_WORKS: 'ЖМК',
  ANTICORROSION: 'ЖАК',
  GEODETIC: 'ЖГР',
  EARTHWORKS: 'ЖЗР',
  PILE_DRIVING: 'ЖПС',
  CABLE_LAYING: 'ЖПК',
  FIRE_SAFETY: 'ЖПБ',
  // Расширение ЦУС (2026-04-14)
  OZR_1026PR: 'ОЖР',
  OZR_RD_11_05: 'ОЖР',
  INPUT_CONTROL: 'ЖВК',
  CONSTRUCTION_CONTROL: 'ЖСК',
  CONSTRUCTION_CONTROL_V2: 'ЖСК',
  SK_CALL_REGISTER: 'ЖРВ',
  AUTHOR_SUPERVISION_2016: 'ЖАН',
  DRILLING_WORKS: 'ЖБуР',
  CONCRETE_CURING: 'ЖУБ',
  JOINT_GROUTING: 'ЖЗС',
  ANTICORROSION_WELD: 'ЖАЗ',
  BOLT_CONNECTIONS: 'ЖМБ',
  TORQUE_WRENCH_CALIBRATION: 'ЖТД',
  CABLE_TUBE: 'ЖКТ',
  CABLE_ROUTE: 'ЖКМ',
  PIPELINE_WELDING: 'ЖСТ',
  INSULATION_LAYING: 'ЖИУ',
  TECHNICAL_LEVELING: 'ЖТН',
  FIRE_SAFETY_INTRO: 'ЖВП',
  GENERAL_INTRO_BRIEFING: 'ЖВИ',
  CUSTOM: 'Ж',
};

/**
 * Авто-нумерация специальных журналов.
 * Формат: {PREFIX}-{NNN}
 * Пример: ЖБР-001, ЖСР-002
 */
export async function getNextJournalNumber(
  projectId: string,
  type: string
): Promise<string> {
  const prefix = JOURNAL_PREFIXES[type] || 'Ж';
  const lockKey = `journal:${projectId}:${type}`;
  const pattern = `${prefix}-%`;

  return db.$transaction(async (tx: PrismaTx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`;

    const results = await tx.$queryRaw<Array<{ max_num: string | null }>>`
      SELECT MAX(number) AS max_num
      FROM special_journals
      WHERE "projectId" = ${projectId}
        AND number LIKE ${pattern}
    `;

    const lastSeq = results[0]?.max_num
      ? parseInt(results[0].max_num.split('-').at(-1) ?? '0', 10)
      : 0;

    return `${prefix}-${String(lastSeq + 1).padStart(3, '0')}`;
  });
}
