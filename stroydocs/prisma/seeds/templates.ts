/**
 * Seed: регистрирует шаблоны документов в таблице DocumentTemplate.
 * Запускается из prisma/seed.ts.
 */

import type { PrismaClient } from '@prisma/client';

interface TemplateSeedEntry {
  name: string;
  category: 'AOSR' | 'OZR' | 'KS2' | 'KS3' | 'AVK' | 'ZHVK' | 'TECH_READINESS' | 'OTHER';
  localPath: string;
  description: string;
  version: string;
}

const TEMPLATE_ENTRIES: TemplateSeedEntry[] = [
  {
    name: 'АОСР — Акт освидетельствования скрытых работ',
    category: 'AOSR',
    localPath: 'templates/docx/aosr.docx',
    description: 'Унифицированная форма АОСР. Плейсхолдеры: {object}, {№}, {date}, {rabota}, {material}, {SNIP} и др.',
    version: '1.0',
  },
  {
    name: 'ОЖР — Общий журнал работ',
    category: 'OZR',
    localPath: 'templates/docx/ozr.docx',
    description: 'Шаблон общего журнала работ. Плейсхолдеры: {number}, {date}, {projectName}, {section3Text}, {section5Text}.',
    version: '1.0',
  },
  {
    name: 'КС-2 — Акт о приёмке выполненных работ',
    category: 'KS2',
    localPath: 'templates/docx/ks2.docx',
    description: 'Унифицированная форма КС-2. Плейсхолдеры: {object}, {contractNumber}, {periodFrom}, {periodTo}, {totalAmount}.',
    version: '1.0',
  },
  {
    name: 'КС-3 — Справка о стоимости выполненных работ',
    category: 'KS3',
    localPath: 'templates/docx/ks3.docx',
    description: 'Унифицированная форма КС-3. Плейсхолдеры: {object}, {contractNumber}, {periodFrom}, {periodTo}, {totalAmount}.',
    version: '1.0',
  },
  {
    name: 'АВК — Акт входного контроля',
    category: 'AVK',
    localPath: 'templates/docx/avk.docx',
    description: 'Акт входного контроля материалов. Плейсхолдеры: {object}, {date}, {material}, {batchNumber}, {result}, {remarks}.',
    version: '1.0',
  },
  {
    name: 'ЖВК — Журнал входного контроля',
    category: 'ZHVK',
    localPath: 'templates/docx/zhvk.docx',
    description: 'Журнал входного контроля партий материалов. Плейсхолдеры: {object}, {date}, {material}, {result}, {remarks}.',
    version: '1.0',
  },
];

export async function seedTemplates(prisma: PrismaClient): Promise<void> {
  console.log('Регистрация шаблонов документов...');

  for (const entry of TEMPLATE_ENTRIES) {
    // Проверить существование по localPath
    const existing = await prisma.documentTemplate.findFirst({
      where: { localPath: entry.localPath },
    });

    if (existing) {
      console.log(`  ⏭  Шаблон "${entry.name}" уже существует`);
      continue;
    }

    await prisma.documentTemplate.create({
      data: {
        name: entry.name,
        category: entry.category,
        localPath: entry.localPath,
        description: entry.description,
        version: entry.version,
        isActive: true,
        isPublic: false,
        format: 'docx',
      },
    });
    console.log(`  ✅ Шаблон "${entry.name}" добавлен`);
  }

  console.log('Шаблоны документов зарегистрированы');
}
