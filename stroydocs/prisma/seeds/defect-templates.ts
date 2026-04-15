import { PrismaClient } from '@prisma/client';

const SYSTEM_TEMPLATES = [
  {
    title: 'Нарушение требований безопасности труда на рабочем месте',
    description: 'Выявлено нарушение требований охраны труда и безопасного ведения работ',
    category: 'FIRE_SAFETY' as const,
    normativeRef: 'Трудовой кодекс РФ ст. 212',
    requirements: 'Немедленно приостановить работы, устранить нарушение, провести инструктаж',
  },
  {
    title: 'Отсутствие технологической карты на вид работ',
    description: 'Работы выполняются без утверждённой технологической карты',
    category: 'TECHNOLOGY_VIOLATION' as const,
    normativeRef: 'СП 48.13330.2019 п. 7.1.1',
    requirements: 'Разработать и утвердить технологическую карту до возобновления работ',
  },
  {
    title: 'Применение материалов без подтверждения качества',
    description: 'Материалы применяются при отсутствии сертификатов качества или паспортов',
    category: 'QUALITY_VIOLATION' as const,
    normativeRef: 'ГОСТ Р 70108-2025 п. 5.3',
    requirements: 'Предоставить сертификаты соответствия и паспорта качества на все применяемые материалы',
  },
  {
    title: 'Нарушение геометрических параметров конструкций',
    description: 'Отклонения от проектных размеров превышают допустимые значения по нормативу',
    category: 'QUALITY_VIOLATION' as const,
    normativeRef: 'СП 70.13330.2022 п. 10.3',
    requirements: 'Выполнить геодезический контроль, составить акт, предоставить план устранения',
  },
  {
    title: 'Несоблюдение требований экологической безопасности при производстве работ',
    description: 'Нарушение правил обращения с отходами, загрязнение прилегающей территории',
    category: 'ECOLOGY' as const,
    normativeRef: 'ФЗ-7 «Об охране окружающей среды» ст. 34',
    requirements: 'Организовать раздельный сбор отходов, очистить территорию, оформить договор на вывоз отходов',
  },
  {
    title: 'Отсутствие обязательной исполнительной документации',
    description: 'На выполненные скрытые работы не составлена и не подписана исполнительная документация',
    category: 'DOCUMENTATION' as const,
    normativeRef: 'ГОСТ Р 70108-2025 п. 8.2',
    requirements: 'Оформить АОСР и ОЖР на скрытые работы до продолжения строительства',
  },
  {
    title: 'Нарушение правил пожарной безопасности на строительной площадке',
    description: 'Выявлены нарушения противопожарного режима: захламление путей эвакуации, отсутствие огнетушителей',
    category: 'FIRE_SAFETY' as const,
    normativeRef: 'ФЗ-123 Технический регламент о требованиях пожарной безопасности ст. 80',
    requirements: 'Устранить нарушения противопожарного режима в течение 24 часов, проверить наличие первичных средств пожаротушения',
  },
] as const;

export async function seedDefectTemplates(prisma: PrismaClient) {
  console.log('Загрузка системных шаблонов дефектов...');
  for (const template of SYSTEM_TEMPLATES) {
    await prisma.defectTemplate.upsert({
      where: {
        // Уникальность по title среди системных шаблонов
        // (используем синтетический id-подход через title + isSystem)
        id: `system-${template.title.slice(0, 40).replace(/\s+/g, '-').toLowerCase()}`,
      },
      update: {
        description: template.description,
        category: template.category,
        normativeRef: template.normativeRef,
        requirements: template.requirements,
      },
      create: {
        id: `system-${template.title.slice(0, 40).replace(/\s+/g, '-').toLowerCase()}`,
        title: template.title,
        description: template.description,
        category: template.category,
        normativeRef: template.normativeRef,
        requirements: template.requirements,
        isSystem: true,
        organizationId: null,
      },
    });
  }
  console.log(`Загружено ${SYSTEM_TEMPLATES.length} системных шаблонов дефектов`);
}
