import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';
import { existsSync } from 'fs';
import path from 'path';
import { ksiData, type KsiDataNode } from './ksi-data';
import { seedTemplates } from './seeds/templates';
import { createMissingDocxTemplates } from './seeds/create-docx-templates';
import { seedKsiFromXlsx } from './seeds/seed-ksi';
import { seedThematicReports } from './seeds/thematic-reports';
import { seedReportTemplates } from './seeds/report-templates';
import { seedDefectTemplates } from './seeds/defect-templates';
import { seedReferenceBooks } from './seeds/reference-books';
import { seedSubscriptionPlans } from './seeds/subscription-plans';
import { seedAosrTemplates } from './seeds/aosr-templates';

const prisma = new PrismaClient();

/** Рекурсивная загрузка дерева КСИ */
async function seedKsi(
  nodes: KsiDataNode[],
  parentId: string | null = null,
  level: number = 0
) {
  for (const node of nodes) {
    const created = await prisma.ksiNode.upsert({
      where: { code: node.code },
      update: { name: node.name, parentId, level },
      create: {
        code: node.code,
        name: node.name,
        parentId,
        level,
      },
    });

    if ('children' in node && node.children) {
      await seedKsi(node.children, created.id, level + 1);
    }
  }
}

async function main() {
  // === КСИ ===
  console.log('Загрузка справочника КСИ...');
  const xlsxPath = path.resolve(__dirname, 'seeds/ksi/КТКСИ24122025.xlsx');
  if (existsSync(xlsxPath)) {
    console.log('Найден XLSX-файл КСИ, импортируем официальный справочник...');
    await seedKsiFromXlsx(prisma);
  } else {
    console.log('XLSX-файл КСИ не найден, загружаем stub-данные (10 категорий)...');
    await seedKsi(ksiData);
  }
  console.log('КСИ загружен');

  // === Тестовая организация ===
  const org = await prisma.organization.upsert({
    where: { inn: '7707083893' },
    update: {},
    create: {
      name: 'ООО "СтройПроект"',
      inn: '7707083893',
      ogrn: '1027700132195',
      sroName: 'СРО "Строители Москвы"',
      sroNumber: 'СРО-С-123-45678',
      address: 'г. Москва, ул. Строителей, д. 10',
      phone: '+7 (495) 123-45-67',
      email: 'info@stroyproekt.ru',
    },
  });

  const passwordHash = await hash('password123', 12);

  // Администратор
  const admin = await prisma.user.upsert({
    where: { email: 'admin@stroydocs.ru' },
    update: {},
    create: {
      email: 'admin@stroydocs.ru',
      passwordHash,
      firstName: 'Иван',
      lastName: 'Петров',
      middleName: 'Сергеевич',
      phone: '+7 (916) 111-22-33',
      position: 'Генеральный директор',
      role: 'ADMIN',
      organizationId: org.id,
    },
  });

  // Менеджер
  await prisma.user.upsert({
    where: { email: 'manager@stroydocs.ru' },
    update: {},
    create: {
      email: 'manager@stroydocs.ru',
      passwordHash,
      firstName: 'Анна',
      lastName: 'Сидорова',
      middleName: 'Владимировна',
      phone: '+7 (916) 444-55-66',
      position: 'Начальник ПТО',
      role: 'MANAGER',
      organizationId: org.id,
    },
  });

  // Работник
  await prisma.user.upsert({
    where: { email: 'worker@stroydocs.ru' },
    update: {},
    create: {
      email: 'worker@stroydocs.ru',
      passwordHash,
      firstName: 'Алексей',
      lastName: 'Козлов',
      phone: '+7 (916) 777-88-99',
      position: 'Прораб',
      role: 'WORKER',
      organizationId: org.id,
    },
  });

  // Папки по умолчанию для каждого объекта строительства
  const DEFAULT_FOLDERS = [
    { name: 'Разрешительная документация', order: 0 },
    { name: 'Рабочий проект',              order: 1 },
    { name: 'Исполнительные схемы',        order: 2 },
    { name: 'Сертификаты качества',        order: 3 },
    { name: 'Нормативные документы',       order: 4 },
    { name: 'Протоколы совещаний',         order: 5 },
    { name: 'Прочее',                      order: 6 },
  ];

  // === Проекты ===
  const buildingObject1 = await prisma.buildingObject.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'ЖК "Солнечный"',
      address: 'г. Москва, ул. Ленина, д. 15',
      description: 'Строительство жилого комплекса на 120 квартир',
      generalContractor: 'ООО "СтройПроект"',
      customer: 'АО "Инвестстрой"',
      status: 'ACTIVE',
      organizationId: org.id,
    },
  });

  // Пересоздаём папки по умолчанию (idempotent)
  await prisma.projectFolder.deleteMany({ where: { projectId: buildingObject1.id } });
  await prisma.projectFolder.createMany({
    data: DEFAULT_FOLDERS.map((f) => ({ ...f, projectId: buildingObject1.id })),
  });

  const buildingObject2 = await prisma.buildingObject.upsert({
    where: { id: '00000000-0000-0000-0000-000000000002' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000002',
      name: 'БЦ "Меркурий"',
      address: 'г. Москва, Пресненская наб., д. 8',
      description: 'Реконструкция бизнес-центра',
      generalContractor: 'ООО "СтройПроект"',
      customer: 'ПАО "МеркурийГрупп"',
      status: 'ACTIVE',
      organizationId: org.id,
    },
  });

  await prisma.projectFolder.deleteMany({ where: { projectId: buildingObject2.id } });
  await prisma.projectFolder.createMany({
    data: DEFAULT_FOLDERS.map((f) => ({ ...f, projectId: buildingObject2.id })),
  });

  // === Договоры ===
  const contract1 = await prisma.contract.upsert({
    where: { id: '00000000-0000-0000-0000-000000000010' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000010',
      number: 'ДГП-2024-001',
      name: 'Договор генподряда на строительство ЖК "Солнечный"',
      type: 'MAIN',
      status: 'ACTIVE',
      startDate: new Date('2024-03-01'),
      endDate: new Date('2025-12-31'),
      projectId: buildingObject1.id,
    },
  });

  await prisma.contract.upsert({
    where: { id: '00000000-0000-0000-0000-000000000011' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000011',
      number: 'СД-2024-001-01',
      name: 'Субдоговор на монолитные работы',
      type: 'SUBCONTRACT',
      status: 'ACTIVE',
      startDate: new Date('2024-04-01'),
      endDate: new Date('2025-06-30'),
      projectId: buildingObject1.id,
      parentId: contract1.id,
    },
  });

  // Участник договора
  await prisma.contractParticipant.upsert({
    where: {
      contractId_organizationId_role: {
        contractId: contract1.id,
        organizationId: org.id,
        role: 'CONTRACTOR',
      },
    },
    update: {},
    create: {
      contractId: contract1.id,
      organizationId: org.id,
      role: 'CONTRACTOR',
      appointmentOrder: 'Приказ №15 от 01.03.2024',
      appointmentDate: new Date('2024-03-01'),
    },
  });

  // === Системные категории мероприятий (Модуль 4 — Перечень мероприятий) ===
  const SYSTEM_ACTIVITY_CATEGORIES = [
    { name: 'Заключение договоров',          order: 0 },
    { name: 'Формирование дорожной карты',   order: 1 },
    { name: 'Подготовка к строительству',    order: 2 },
    { name: 'Разрешительная документация',   order: 3 },
    { name: 'Приёмка объекта',              order: 4 },
  ];

  for (const project of [buildingObject1, buildingObject2]) {
    for (const cat of SYSTEM_ACTIVITY_CATEGORIES) {
      await prisma.activityCategory.upsert({
        where: {
          projectId_name: {
            projectId: project.id,
            name: cat.name,
          },
        },
        update: {},
        create: {
          ...cat,
          isSystem: true,
          projectId: project.id,
        },
      });
    }
  }
  console.log('✅ Системные категории мероприятий: созданы');

  // === Шаблоны документов (Фаза 3.6) ===
  console.log('Создание .docx шаблонов...');
  await createMissingDocxTemplates();
  await seedTemplates(prisma);

  // === Шаблоны АОСР (Фаза 6 ИД-Мастер) ===
  console.log('Загрузка шаблонов АОСР...');
  await seedAosrTemplates(prisma);

  // === Конфигурации тематических отчётов (Шаг 6) ===
  await seedThematicReports(prisma);
  console.log('✅ Тематические отчёты: конфиги созданы');

  // === Системные шаблоны отчётов (Шаг 9) ===
  await seedReportTemplates(prisma);
  console.log('✅ Системные шаблоны отчётов: созданы');

  // === Шаблоны дефектов (Модуль 11) ===
  await seedDefectTemplates(prisma);

  // === Базовые справочники (Модуль 19 — REF.3) ===
  await seedReferenceBooks(prisma);

  // === Системные типы задач (Модуль 18 — Планировщик задач) ===
  const SYSTEM_TASK_TYPES = [
    { key: 'task', name: 'Задача' },
    { key: 'meeting', name: 'Встреча' },
    { key: 'fix', name: 'Доработки' },
  ];
  for (const t of SYSTEM_TASK_TYPES) {
    await prisma.taskType.upsert({
      where: { key: t.key },
      update: { name: t.name, isSystem: true },
      create: { key: t.key, name: t.name, isSystem: true },
    });
  }
  console.log('✅ Системные типы задач: созданы');

  // === Тарифные планы (Модуль 15 Фаза 2) ===
  await seedSubscriptionPlans(prisma);

  console.log('Seed завершён:', { org: org.name, admin: admin.email });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
