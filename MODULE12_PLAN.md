# Модуль 12 — Отчёты: подробный план реализации

> Аналог: ЦУС → Модуль «Отчёты» (стр. 290–296 руководства)
> Текущее состояние: В ROADMAP модуль помечен как `⬜`. В `ObjectModuleSidebar.tsx` пункт «Отчёты» помечен `soon: true`, href: `reports`, icon: `BarChart2`. Prisma-схема не содержит моделей Report. Существующие аналитические виджеты (дашборд, ГПР, ПИР, СК, контракты) уже агрегируют данные — модуль Отчёты собирает их в единый документ.
> **Ориентир: 2 недели (10 рабочих дней)**

---

## Что уже есть (переиспользуем)

```
Существующие источники данных для отчётов:
  ExecutionDoc          — АОСР, ОЖР, АВК, АТГ (статусы, количество, суммы)
  Ks2Act, Ks3Certificate — КС-2/КС-3 (суммы, периоды)
  Defect                — Недостатки СК (категории, статусы, сроки)
  Inspection            — Проверки СК
  GanttTask             — ГПР (план/факт, отклонения)
  WorkRecord            — Записи о работах (объёмы)
  Photo                 — Фото-отчёты
  DailyLog              — Дневник прораба
  FundingSource         — Финансирование

Существующая инфраструктура:
  Handlebars + Puppeteer → PDF    — генерация PDF (паттерн из АОСР/КС-2)
  exceljs                         — генерация Excel (паттерн из ГПР план освоения)
  BullMQ                          — фоновая генерация (для тяжёлых отчётов)
  Timeweb S3                      — хранение сгенерированных файлов
  YandexGPT                       — AI-сводки (уже интегрирован для парсинга смет)

Существующие аналитические API:
  /api/projects/[pid]/sk-analytics     — аналитика СК
  /api/projects/[pid]/id-analytics     — аналитика ИД
  /api/projects/[pid]/pir-analytics    — аналитика ПИР
  /api/projects/[pid]/gpr/analytics    — аналитика ГПР
```

---

## Два типа отчётов в ЦУС (по PDF)

### Тип 1: Информационные отчёты (конструктор, стр. 290–293)
Пользователь собирает отчёт из блоков (титульный лист, объёмы работ, КС-2, фото и т.д.), заполняет автоматически или вручную, экспортирует в PDF.

### Тип 2: Тематические отчёты (предустановленные формы, стр. 294–296)
Готовые отчётные формы с фильтрами: объект, автор, период. Нажал «Сформировать» → таблица → «Печать» → Excel/PDF.

---

## Шаг 1 — Prisma-схема (День 1)

### 1.1. Новые enum-ы

```prisma
enum ReportStatus {
  DRAFT       // Черновик
  GENERATED   // Сформирован
  SIGNED      // Подписан
}

enum ReportBlockType {
  TITLE_PAGE              // 0. Титульный лист
  WORK_VOLUMES            // 1. Объём работ подрядной организации
  KS2_ACTS                // 2. Акты приёмки выполненных работ (КС-2)
  ID_STATUS               // 3. Статус исполнительной документации
  DEFECTS_SUMMARY         // 4. Сводка по недостаткам СК
  GPR_PROGRESS            // 5. Ход выполнения ГПР
  PHOTO_REPORT            // 6. Фото-отчёт
  FUNDING_STATUS          // 7. Финансирование
  DAILY_LOG_SUMMARY       // 8. Сводка дневника прораба
  FREE_TEXT               // 9. Произвольный текст
  CUSTOM_TABLE            // 10. Произвольная таблица
}
```

### 1.2. Новые модели

```prisma
/// Категория отчётов (иерархическое дерево, ЦУС стр. 290)
model ReportCategory {
  id       String  @id @default(uuid())
  name     String
  order    Int     @default(0)

  parentId String?
  parent   ReportCategory?  @relation("ReportCategoryTree", fields: [parentId], references: [id])
  children ReportCategory[] @relation("ReportCategoryTree")

  projectId      String
  buildingObject BuildingObject @relation(fields: [projectId], references: [id], onDelete: Cascade)

  reports Report[]

  createdAt DateTime @default(now())

  @@index([projectId])
  @@map("report_categories")
}

/// Отчёт (ЦУС стр. 291)
model Report {
  id     String       @id @default(uuid())
  number Int                                 // Номер отчёта
  name   String                              // Наименование
  status ReportStatus @default(DRAFT)

  // Отчётный период
  periodStart DateTime?
  periodEnd   DateTime?

  // Категория
  categoryId String?
  category   ReportCategory? @relation(fields: [categoryId], references: [id], onDelete: SetNull)

  // Из шаблона
  templateId String?
  template   ReportTemplate? @relation(fields: [templateId], references: [id], onDelete: SetNull)

  // Привязка к объекту
  projectId      String
  buildingObject BuildingObject @relation(fields: [projectId], references: [id], onDelete: Cascade)

  // Автор
  authorId String
  author   User @relation("ReportAuthor", fields: [authorId], references: [id])

  // Сгенерированные файлы
  pdfS3Key   String?
  xlsxS3Key  String?
  fileName   String?

  // Согласование
  approvalRouteId String? @unique
  approvalRoute   ApprovalRoute? @relation("ReportApproval", fields: [approvalRouteId], references: [id])

  // Прикреплённые файлы
  s3Keys String[] @default([])

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  blocks ReportBlock[]

  @@index([projectId])
  @@index([categoryId])
  @@index([authorId])
  @@map("reports")
}

/// Блок отчёта — элемент конструктора (ЦУС стр. 291–293)
model ReportBlock {
  id        String          @id @default(uuid())
  order     Int                                   // Номер блока (0 = титульный лист)
  type      ReportBlockType
  title     String                                // Наименование блока
  content   Json?                                 // Данные блока (авто или вручную)
  isAutoFilled Boolean @default(false)             // Заполнен автоматически

  // Прикреплённые файлы к блоку
  s3Keys String[] @default([])

  reportId String
  report   Report @relation(fields: [reportId], references: [id], onDelete: Cascade)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([reportId])
  @@map("report_blocks")
}

/// Шаблон отчёта (ЦУС стр. 293 — «Создать отчёт из шаблона»)
model ReportTemplate {
  id          String @id @default(uuid())
  name        String
  description String?

  // Предустановленная структура блоков
  blockDefinitions Json   // [{order, type, title}]

  // Системный (для всех) или пользовательский
  isSystem Boolean @default(false)

  organizationId String?
  organization   Organization? @relation(fields: [organizationId], references: [id], onDelete: SetNull)

  createdAt DateTime @default(now())

  reports Report[]

  @@index([organizationId])
  @@map("report_templates")
}

/// Тематический отчёт — предустановленная отчётная форма (ЦУС стр. 294–296)
model ThematicReportConfig {
  id       String @id @default(uuid())
  slug     String @unique   // "defects-report", "prescriptions-report", "engineers-report"
  name     String           // "Отчёт по недостаткам"
  category String           // "СК", "СМР", "УП", "Финансовые"

  // Настраиваемые колонки (чекбоксы из ЦУС стр. 295)
  availableColumns Json     // ["objectName", "defectNumber", "description", ...]
  defaultColumns   Json     // Колонки включённые по умолчанию

  // Источник данных
  dataSource String          // "defects", "prescriptions", "ks2acts", "ganttTasks"

  isActive Boolean @default(true)

  createdAt DateTime @default(now())

  @@map("thematic_report_configs")
}
```

### 1.3. Связи в существующих моделях

```prisma
// В model BuildingObject:
reports          Report[]
reportCategories ReportCategory[]

// В model User:
reportsAuthored  Report[] @relation("ReportAuthor")

// В model Organization:
reportTemplates  ReportTemplate[]

// В model ApprovalRoute:
report           Report? @relation("ReportApproval")
```

### 1.4. Команда для Claude Code

```
Прочитай CLAUDE.md и ROADMAP.md. Добавь в prisma/schema.prisma:

1. Enums: ReportStatus, ReportBlockType
2. Модели: ReportCategory, Report, ReportBlock, ReportTemplate, ThematicReportConfig
3. Связи в BuildingObject, User, Organization, ApprovalRoute

npx prisma migrate dev --name add_module12_reports
npx prisma generate
```

---

## Шаг 2 — URL, layout и sidebar (День 2)

### 2.1. Файловая структура

```
src/app/(dashboard)/objects/[objectId]/
  reports/
    layout.tsx                ← Tabs: 3 вкладки
    page.tsx                  ← redirect → /reports/list
    list/
      page.tsx                ← Информационные отчёты (конструктор)
    thematic/
      page.tsx                ← Тематические отчёты
      [slug]/
        page.tsx              ← Конкретный тематический отчёт с фильтрами
    templates/
      page.tsx                ← Управление шаблонами
```

### 2.2. Layout

```tsx
const REPORTS_TABS = [
  { label: 'Отчёты',            href: 'list' },
  { label: 'Тематические',      href: 'thematic' },
  { label: 'Шаблоны',           href: 'templates' },
];
```

### 2.3. Убрать `soon: true`

```tsx
// ObjectModuleSidebar.tsx:
// Было: { label: 'Отчёты', href: 'reports', icon: BarChart2, soon: true },
// Стало: { label: 'Отчёты', href: 'reports', icon: BarChart2 },
```

### 2.4. Команда для Claude Code

```
Прочитай CLAUDE.md.

1. Создай reports/layout.tsx (3 вкладки, паттерн из resources/layout.tsx)
2. Создай reports/page.tsx → redirect /reports/list
3. Создай все page.tsx + thematic/[slug]/page.tsx
4. В ObjectModuleSidebar.tsx убери soon: true у «Отчёты»
5. Добавь loading.tsx в каждую директорию
```

---

## Шаг 3 — API-роуты (День 3–4)

### 3.1. Структура API

```
# Категории (иерархическое дерево)
GET    /api/projects/[pid]/reports/categories              — дерево
POST   /api/projects/[pid]/reports/categories              — создать
PATCH  /api/projects/[pid]/reports/categories/[cid]        — переименовать
DELETE /api/projects/[pid]/reports/categories/[cid]        — удалить

# Отчёты (конструктор)
GET    /api/projects/[pid]/reports                         — список (?categoryId=)
POST   /api/projects/[pid]/reports                         — создать отчёт
GET    /api/projects/[pid]/reports/[rid]                   — карточка
PATCH  /api/projects/[pid]/reports/[rid]                   — обновить
DELETE /api/projects/[pid]/reports/[rid]                   — удалить
POST   /api/projects/[pid]/reports/from-template           — создать из шаблона

# Блоки отчёта
GET    /api/projects/[pid]/reports/[rid]/blocks            — список блоков
POST   /api/projects/[pid]/reports/[rid]/blocks            — добавить блок
PATCH  /api/projects/[pid]/reports/[rid]/blocks/[bid]      — обновить блок
DELETE /api/projects/[pid]/reports/[rid]/blocks/[bid]      — удалить блок
POST   /api/projects/[pid]/reports/[rid]/blocks/[bid]/fill — автозаполнение блока

# Генерация
POST   /api/projects/[pid]/reports/[rid]/generate-pdf      — PDF (BullMQ)
POST   /api/projects/[pid]/reports/[rid]/generate-xlsx     — Excel

# Шаблоны
GET    /api/organizations/[oid]/report-templates           — список шаблонов
POST   /api/organizations/[oid]/report-templates           — создать шаблон
DELETE /api/organizations/[oid]/report-templates/[tid]     — удалить

# Тематические отчёты
GET    /api/reports/thematic                               — список доступных форм
GET    /api/reports/thematic/[slug]                        — конфигурация формы
POST   /api/reports/thematic/[slug]/generate               — сформировать
```

### 3.2. Автозаполнение блоков (ЦУС стр. 292)

```typescript
// POST /api/projects/[pid]/reports/[rid]/blocks/[bid]/fill
// Логика зависит от block.type:

switch (block.type) {
  case 'TITLE_PAGE':
    // Заполнить из BuildingObject: название, адрес, участники, период
    break;
  case 'WORK_VOLUMES':
    // Агрегация WorkRecord за период: наименование, ед.изм., всего, за период
    break;
  case 'KS2_ACTS':
    // Список Ks2Act за период: №документа, дата, сумма, смета
    break;
  case 'ID_STATUS':
    // Агрегация ExecutionDoc: по статусам, % готовности
    break;
  case 'DEFECTS_SUMMARY':
    // Агрегация Defect: по категориям, статусам, просроченные
    break;
  case 'GPR_PROGRESS':
    // GanttTask: план/факт отклонения, % выполнения
    break;
  case 'PHOTO_REPORT':
    // Photo за период: s3Key, дата, автор, категория
    break;
  case 'FUNDING_STATUS':
    // FundingSource + ContractPayment: план/факт по периодам
    break;
  case 'DAILY_LOG_SUMMARY':
    // DailyLog за период: погода, рабочие, заметки
    break;
}
```

### 3.3. Команда для Claude Code

```
Прочитай CLAUDE.md. Создай все API роуты модуля Отчёты:

1. reports/categories: CRUD для дерева (parentId)
2. reports: GET, POST, GET/[id], PATCH, DELETE, from-template
3. reports/[rid]/blocks: CRUD + POST /fill (автозаполнение по типу блока)
4. reports/[rid]/generate-pdf и generate-xlsx
5. organizations/[oid]/report-templates: CRUD
6. reports/thematic: GET список, GET/[slug] конфиг, POST/[slug]/generate

Автозаполнение: switch по block.type → агрегация из соответствующих моделей.
Проверка organizationId. findMany с take/skip.
```

---

## Шаг 4 — Вкладка «Информационные отчёты» (День 4–5)

### 4.1. Компоненты (ЦУС стр. 290–293)

```
src/components/objects/reports/
  ReportsView.tsx               ← Двухпанельный layout (категории + список отчётов)
  ReportCategoryTree.tsx        ← Дерево категорий (левая панель)
  ReportsTable.tsx              ← TanStack Table отчётов (правая панель)
  CreateReportDialog.tsx        ← Создание отчёта (категория, номер, наименование)
  CreateFromTemplateDialog.tsx  ← Создание из шаблона (Select шаблон → заполнить поля)
```

### 4.2. Layout (по ЦУС стр. 290)

```
┌──────────────────────────────────────────────────────────────┐
│  Отчёты    Тематические    Шаблоны                           │
├────────────────┬─────────────────────────────────────────────│
│ Категории   [+]│  Информационные отчёты  4  [+ Из шаблона] [+ Создать] │
│  📁 Все        │  №  Наименование     Категория  Начало  Конец  Автор   │
│  📁 О ходе     │  1  Работы 3-й кв.   О ходе     12.12   12.12  Петров  │
│    📁 Исполне  │  2  4-й квартал 2024  Исполнение 12.12   12.12  Петров  │
│    📁 2024     │  3  Оперативный       2024       17.12   17.12  Петров  │
│    📁 2023     │  4  Отчёт исполнит.   Исполнение 17.12   17.12  Петров  │
└────────────────┴─────────────────────────────────────────────┘
```

### 4.3. Команда для Claude Code

```
Прочитай CLAUDE.md и DESIGN.md. Создай вкладку «Информационные отчёты»:

1. ReportsView.tsx — двухпанельный layout
   Левая панель (240px): ReportCategoryTree
   Правая панель: ReportsTable
   Кнопки: «Создать отчёт» и «Создать отчёт из шаблона»

2. ReportCategoryTree.tsx — рекурсивное дерево
   [+] создать, ⋮ → Подчинённый / Переименовать / Удалить
   Клик → фильтр таблицы

3. ReportsTable.tsx — TanStack Table
   Колонки: №, Наименование, Категория, Начало периода, Конец периода,
   Автор, Время создания, Статус согласования

4. CreateReportDialog.tsx — Dialog:
   Select категория, Input номер, Input наименование, DateRange период

5. CreateFromTemplateDialog.tsx — Dialog:
   Select шаблон → автозаполнение блоков → те же поля

6. Подключи в reports/list/page.tsx
```

---

## Шаг 5 — Карточка отчёта + конструктор блоков (День 5–7)

### 5.1. Компоненты (ЦУС стр. 291–293)

```
src/components/objects/reports/
  ReportCard.tsx              ← Карточка отчёта (4 вкладки)
  ReportBlocksList.tsx        ← Вкладка «Содержание отчёта» — список блоков
  AddBlockDialog.tsx          ← Добавить блок (номер, тип, наименование)
  ReportBlockItem.tsx         ← Один блок (Редактировать, Заполнить, + Запись, Очистить, 🗑)
  BlockAutoFill.tsx           ← Компонент автозаполнения (кнопка «Заполнить»)
  BlockContentRenderer.tsx    ← Рендер содержимого блока по типу (таблица/текст/фото)
```

### 5.2. Вкладки карточки отчёта

```
Информация | Файлы | Подписание | Содержание отчёта
```

### 5.3. Логика конструктора (ЦУС стр. 291–292)

```
Пользователь:
1. Открывает карточку отчёта → вкладка «Содержание отчёта»
2. Нажимает «+ Добавить блок» → выбирает тип (Титульный лист, Объёмы работ, КС-2...)
3. Блок появляется в списке
4. Нажимает «Заполнить» → API автоматически подтягивает данные за период
5. При необходимости редактирует вручную или добавляет записи
6. Нажимает ⋮ → Печать → Отчёт → PDF скачивается
```

### 5.4. Команда для Claude Code

```
Прочитай CLAUDE.md и DESIGN.md. Создай конструктор отчёта:

1. ReportCard.tsx — карточка с 4 вкладками:
   Информация (поля отчёта), Файлы (S3), Подписание (ApprovalRoute),
   Содержание отчёта (ReportBlocksList)
   Кнопка ⋮ → Печать → Отчёт (POST /generate-pdf)

2. ReportBlocksList.tsx — список блоков с drag-and-drop (order)
   Кнопки: «Редактировать» и «+ Добавить блок»

3. ReportBlockItem.tsx — один блок:
   Заголовок (тип + название) + кнопки: Редактировать | Заполнить | + Добавить запись | Очистить | 🗑
   Под заголовком: BlockContentRenderer (таблица или текст)

4. AddBlockDialog.tsx — Dialog:
   Input номер, Select тип (ReportBlockType enum), Input наименование (авто из типа)

5. BlockAutoFill.tsx — кнопка «Заполнить»:
   POST /api/.../blocks/[bid]/fill → обновить content → перерендер

6. BlockContentRenderer.tsx — switch по type:
   TITLE_PAGE → титульная информация (объект, период, участники)
   WORK_VOLUMES → таблица (№, наименование, ед.изм., всего, за период)
   KS2_ACTS → таблица (№ документа, дата, сумма, смета)
   ID_STATUS → прогресс-бары по статусам
   DEFECTS_SUMMARY → таблица недостатков
   GPR_PROGRESS → таблица план/факт
   PHOTO_REPORT → галерея фото за период
   FREE_TEXT → TipTap WYSIWYG
```

---

## Шаг 6 — Тематические отчёты (День 7–8)

### 6.1. Компоненты (ЦУС стр. 294–296)

```
src/components/objects/reports/
  ThematicReportsMenu.tsx      ← Меню тематических отчётов (категории → подменю)
  ThematicReportView.tsx       ← Страница формирования отчёта
  ThematicFilters.tsx          ← Фильтры: объект, автор, период
  ThematicSettings.tsx         ← Настройки: чекбоксы колонок
  ThematicResultsTable.tsx     ← Таблица результатов
```

### 6.2. Предустановленные формы (ЦУС стр. 294)

```typescript
// Seed: thematic_report_configs
const THEMATIC_REPORTS = [
  // СК
  { slug: 'defects-report', name: 'Отчёт по недостаткам', category: 'СК', dataSource: 'defects' },
  { slug: 'prescriptions-report', name: 'Оперативный отчёт по предписаниям', category: 'СК', dataSource: 'prescriptions' },
  { slug: 'defects-by-object', name: 'Пообъектный отчёт по недостаткам', category: 'СК', dataSource: 'defects' },
  { slug: 'sk-engineers-report', name: 'Отчёт о работе инженеров СК', category: 'СК', dataSource: 'inspections' },
  { slug: 'sk-signatures-report', name: 'Отчёт по подписаниям документов СК', category: 'СК', dataSource: 'inspectionActs' },

  // СМР
  { slug: 'work-volumes', name: 'Объёмы выполненных работ', category: 'СМР', dataSource: 'workRecords' },
  { slug: 'ks2-summary', name: 'Сводка КС-2 за период', category: 'СМР', dataSource: 'ks2acts' },

  // ГПР
  { slug: 'gpr-deviation', name: 'Отклонения от ГПР', category: 'ГПР', dataSource: 'ganttTasks' },

  // Финансовые
  { slug: 'payments-report', name: 'Отчёт по оплатам', category: 'Финансовые', dataSource: 'contractPayments' },
  { slug: 'funding-report', name: 'Исполнение финансирования', category: 'Финансовые', dataSource: 'fundingSources' },
];
```

### 6.3. UI (ЦУС стр. 295–296)

```
┌──────────────────────────────────────────────────────┐
│  Отчёт по недостаткам                                │
│  ┌───────────┐  ┌────────────┐                       │
│  │ 🔽 Фильтры │  │ ⚙ Настройки│   [Печать] [Сформировать] │
│  └───────────┘  └────────────┘                       │
│                                                      │
│  Фильтры:                         Настройки:         │
│  Объект: [... ⋯]  ×              ☑ Наименование объекта │
│  Автор: [... ⋯]  ×               ☐ Номер недостатка  │
│  Период: ○ Весь ○ За год          ☑ Описание          │
│          ○ За месяц ○ За неделю   ☑ Нарушен стандарт  │
│          ○ Другое                 ☑ Срок устранения   │
│  Начало: [__.__.____]             ☑ Исполнитель       │
│  Конец:  [__.__.____]             ☑ Автор             │
│                                                      │
│  Результаты отчёта  4                                │
│  ┌─────────────────────────────────────────────────┐ │
│  │ Объект     │ №     │ Описание │ Стандарт │ Срок │ │
│  │ ЖК Сирень │ 24-2  │ Отсутств │ СП 49... │ 24.09│ │
│  │ ЖК Сирень │ 24-2  │ На участ │ СП 48... │ 01.10│ │
│  └─────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────┘
```

### 6.4. Команда для Claude Code

```
Прочитай CLAUDE.md и DESIGN.md. Создай тематические отчёты:

1. ThematicReportsMenu.tsx — карточки/список предустановленных форм
   Группировка по категориям (СК, СМР, ГПР, Финансовые)
   Клик → /reports/thematic/[slug]

2. ThematicReportView.tsx — страница отчёта:
   Заголовок, кнопки Фильтры/Настройки/Печать/Сформировать
   ThematicFilters (развернуть/свернуть)
   ThematicSettings (развернуть/свернуть)
   ThematicResultsTable (результат)

3. ThematicFilters.tsx:
   Select объект, Select автор, RadioGroup период (Весь/Год/Месяц/Неделя/Другое),
   DatePicker начало/конец

4. ThematicSettings.tsx:
   Чекбоксы колонок из config.availableColumns
   Кнопки «Выбрать все» / «Снять выделение»

5. ThematicResultsTable.tsx:
   Динамические колонки из выбранных чекбоксов
   POST /api/reports/thematic/[slug]/generate → данные → таблица

6. Кнопка «Печать» → экспорт в xlsx (exceljs)

7. Создай seed prisma/seeds/thematic-reports.ts с 10 предустановленными формами

8. Подключи в reports/thematic/page.tsx и reports/thematic/[slug]/page.tsx
```

---

## Шаг 7 — PDF/Excel генерация (День 8–9)

### 7.1. PDF для информационных отчётов

```
templates/reports/
  report.hbs                    ← Основной шаблон отчёта
  blocks/
    title-page.hbs              ← Титульный лист
    work-volumes.hbs            ← Объёмы работ (таблица)
    ks2-acts.hbs                ← Акты КС-2 (таблица)
    id-status.hbs               ← Статус ИД (прогресс-бары)
    defects-summary.hbs         ← Сводка недостатков
    gpr-progress.hbs            ← Ход ГПР (таблица план/факт)
    photo-report.hbs            ← Фото-отчёт (сетка изображений)
    free-text.hbs               ← Произвольный текст (HTML)
```

### 7.2. Excel для тематических отчётов

```typescript
// src/lib/reports/generate-thematic-xlsx.ts
// Использует exceljs (уже в проекте для ГПР план освоения)
// Динамические колонки из config + данные из generate
```

### 7.3. Команда для Claude Code

```
Прочитай CLAUDE.md. Создай генерацию PDF и Excel:

1. templates/reports/report.hbs — основной шаблон
   Итерация по блокам: {{#each blocks}} → partial по типу

2. templates/reports/blocks/*.hbs — 8 partials по типам блоков

3. POST /generate-pdf — Handlebars + Puppeteer → S3 → presigned URL
   Паттерн из существующей генерации АОСР

4. src/lib/reports/generate-thematic-xlsx.ts — exceljs:
   Заголовок (название отчёта, период), динамические колонки, данные, автоширина

5. POST /generate-xlsx — exceljs → Buffer → S3 → presigned URL
```

---

## Шаг 8 — AI-сводка + глобальный мониторинг (День 9–10)

### 8.1. AI-еженедельная сводка (из ROADMAP)

```typescript
// src/lib/reports/ai-weekly-summary.ts
// YandexGPT читает:
//   - DailyLog за неделю (погода, рабочие, заметки)
//   - Defect: новые/закрытые за неделю
//   - GanttTask: отклонения
//   - ExecutionDoc: новые АОСР
// → Промпт: "Составь краткую сводку хода строительства за неделю..."
// → Результат: текст 200-300 слов для блока FREE_TEXT или email заказчику
```

### 8.2. Глобальный мониторинг (тепловая карта)

```
src/components/objects/reports/
  GlobalMonitoringView.tsx      ← Тепловая карта всех объектов организации
```

Виджет на главном дашборде или отдельная страница `/reports/monitoring`:
- Все объекты организации в одной таблице
- Цветовая индикация: 🟢 в графике / 🟡 отклонение <30 дней / 🔴 отклонение >30 дней
- Колонки: Объект, % ГПР, % ИД, Открытых дефектов, Просроченных, КС-2 за период

### 8.3. Команда для Claude Code

```
Прочитай CLAUDE.md.

1. src/lib/reports/ai-weekly-summary.ts:
   — Собрать данные за 7 дней (DailyLog, Defect, GanttTask, ExecutionDoc)
   — Промпт для YandexGPT (паттерн из парсинга смет)
   — Вернуть текстовую сводку

2. POST /api/projects/[pid]/reports/ai-summary — генерация AI-сводки
   Можно вставить как блок FREE_TEXT в отчёт

3. GlobalMonitoringView.tsx — таблица объектов с цветовой индикацией
   GET /api/organizations/[oid]/monitoring → агрегация по всем объектам

4. Добавить в src/app/(dashboard)/monitoring/page.tsx (новая глобальная страница)
```

---

## Шаг 9 — Шаблоны + финализация (День 10)

### 9.1. Управление шаблонами

```
src/components/objects/reports/
  TemplatesView.tsx             ← Реестр шаблонов (системные + пользовательские)
  CreateTemplateDialog.tsx      ← Создать шаблон (название + набор блоков)
  SaveAsTemplateDialog.tsx      ← Сохранить текущий отчёт как шаблон
```

### 9.2. Финальный checklist

```
1. npx tsc --noEmit
2. loading.tsx + error.tsx
3. Проверка organizationId
4. findMany с take/skip
5. Миграция в scripts/start.sh (если через db push)
6. seed тематических отчётов
7. Мобильная вёрстка (таблицы → горизонтальный скролл)
```

---

## Итоговая структура файлов

```
src/
├── app/(dashboard)/objects/[objectId]/reports/
│   ├── layout.tsx                        ← 3 вкладки
│   ├── page.tsx                          ← redirect
│   ├── list/page.tsx                     ← Информационные отчёты
│   ├── thematic/page.tsx + [slug]/page.tsx ← Тематические
│   └── templates/page.tsx                ← Шаблоны
│
├── app/(dashboard)/monitoring/
│   └── page.tsx                          ← Глобальный мониторинг
│
├── app/api/projects/[projectId]/reports/
│   ├── route.ts                          ← GET, POST
│   ├── from-template/route.ts            ← POST
│   ├── categories/route.ts + [cid]/route.ts
│   ├── [reportId]/
│   │   ├── route.ts                      ← GET, PATCH, DELETE
│   │   ├── blocks/route.ts + [blockId]/route.ts + [blockId]/fill/route.ts
│   │   ├── generate-pdf/route.ts
│   │   └── generate-xlsx/route.ts
│   └── ai-summary/route.ts
│
├── app/api/reports/thematic/
│   ├── route.ts                          ← GET список форм
│   └── [slug]/
│       ├── route.ts                      ← GET конфиг
│       └── generate/route.ts             ← POST сформировать
│
├── app/api/organizations/[orgId]/
│   ├── report-templates/route.ts + [tid]/route.ts
│   └── monitoring/route.ts               ← Глобальный мониторинг
│
├── components/objects/reports/
│   ├── ReportsView.tsx                   ← Двухпанельный layout
│   ├── ReportCategoryTree.tsx
│   ├── ReportsTable.tsx
│   ├── CreateReportDialog.tsx
│   ├── CreateFromTemplateDialog.tsx
│   ├── ReportCard.tsx                    ← Карточка (4 вкладки)
│   ├── ReportBlocksList.tsx
│   ├── AddBlockDialog.tsx
│   ├── ReportBlockItem.tsx
│   ├── BlockAutoFill.tsx
│   ├── BlockContentRenderer.tsx
│   ├── ThematicReportsMenu.tsx
│   ├── ThematicReportView.tsx
│   ├── ThematicFilters.tsx
│   ├── ThematicSettings.tsx
│   ├── ThematicResultsTable.tsx
│   ├── GlobalMonitoringView.tsx
│   ├── TemplatesView.tsx
│   ├── CreateTemplateDialog.tsx
│   └── SaveAsTemplateDialog.tsx
│
├── lib/reports/
│   ├── generate-thematic-xlsx.ts
│   └── ai-weekly-summary.ts
│
├── templates/reports/
│   ├── report.hbs
│   └── blocks/
│       ├── title-page.hbs
│       ├── work-volumes.hbs
│       ├── ks2-acts.hbs
│       ├── id-status.hbs
│       ├── defects-summary.hbs
│       ├── gpr-progress.hbs
│       ├── photo-report.hbs
│       └── free-text.hbs
│
└── prisma/seeds/
    └── thematic-reports.ts               ← Seed предустановленных форм
```

---

## Порядок задач в Claude Code (10 дней)

```
День 1:    "Прочитай CLAUDE.md и ROADMAP.md. Добавь в prisma/schema.prisma
            модели ReportCategory, Report, ReportBlock, ReportTemplate,
            ThematicReportConfig с enum-ами. Связи в BuildingObject, User,
            Organization, ApprovalRoute. Миграция."

День 2:    "Создай reports/layout.tsx (3 вкладки), все page.tsx.
            Убери soon: true у Отчёты в sidebar."

День 3–4:  "Создай все API роуты. Ключевое: POST /blocks/[bid]/fill
            с автозаполнением по типу блока. POST /thematic/[slug]/generate."

День 4–5:  "Создай ReportsView (двухпанельный), ReportCategoryTree,
            ReportsTable, CreateReportDialog, CreateFromTemplateDialog."

День 5–7:  "Создай ReportCard с 4 вкладками. ReportBlocksList с
            drag-and-drop. AddBlockDialog, ReportBlockItem с кнопками
            Заполнить/Редактировать/Очистить. BlockContentRenderer."

День 7–8:  "Создай тематические отчёты: ThematicReportsMenu,
            ThematicReportView с Фильтрами и Настройками (чекбоксы колонок).
            Seed 10 предустановленных форм."

День 8–9:  "Создай Handlebars-шаблоны для PDF (report.hbs + 8 partials).
            Создай generate-thematic-xlsx.ts (exceljs)."

День 9–10: "Создай ai-weekly-summary.ts (YandexGPT).
            Создай GlobalMonitoringView (тепловая карта).
            npx tsc --noEmit, loading/error, seed, start.sh."
```

> **Совет:** каждую задачу начинай с `Прочитай CLAUDE.md и ROADMAP.md` —
> это даёт Claude Code полный контекст стека и архитектурных решений.
