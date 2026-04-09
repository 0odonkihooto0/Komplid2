# Модуль 5 — ПИР (Проектно-изыскательские работы): подробный план

> Аналог: ЦУС → Модуль «ПИР» (стр. 81–111 руководства)  
> Вкладки: **Задание на ПИР · Изыскания · Документация · Повторное применение · Реестры · Закрытие · Аналитика**  
> Текущее состояние: ❌ всё с нуля  
> Что переиспользуем: `ApprovalRoute` ✅ · `DocComment` ✅ · `Notification` ✅ · `ProjectDocument/QR` (из М4) ✅  
> Ориентир: **2 недели**

---

## Что уже есть (переиспользуем)

```
ApprovalRoute + ApprovalStep  → согласование заданий и документов ПИР  ✅
DocComment                    → замечания (уже есть для ИД — переиспользуем)  ✅
Notification                  → уведомление ответственному за замечание  ✅
ProjectDocument + qrToken     → QR-коды на чертежах (из Модуля 4)  ✅
ExecutionDoc                  → привязка ПД-документа к АОСР  ✅
```

---

## Полная структура вкладок (по ЦУС)

```
/objects/[id]/pir/
  layout.tsx                ← Tabs: 7 вкладок
  design-task/              ← Задание на проектирование
    page.tsx
    [id]/page.tsx
  survey-task/              ← Задание на инженерные изыскания
    page.tsx
    [id]/page.tsx
  documentation/            ← Документация ПИР (основная)
    page.tsx
    [id]/page.tsx
  reuse/                    ← Документация повторного применения
    page.tsx
  registries/               ← Реестры документации
    page.tsx
    [id]/page.tsx
  closure/                  ← Акт закрытия ПИР
    page.tsx
  analytics/                ← Аналитика
    page.tsx
```

---

## Шаг 1 — Prisma-схема (День 1–2)

### 1.1. Новые модели

```prisma
// prisma/schema.prisma

// ─────────────────────────────────────────────
// ЗАДАНИЕ НА ПРОЕКТИРОВАНИЕ
// ─────────────────────────────────────────────

/// Задание на проектирование (ЗП)
model DesignTask {
  id          String          @id @default(uuid())
  number      String                               // Номер документа
  docDate     DateTime        @default(now())      // Дата документа
  taskType    DesignTaskType  @default(DESIGN)     // DESIGN / SURVEY
  status      DesignTaskStatus @default(DRAFT)

  // Утверждающее и согласующее лицо
  approvedById  String?
  approvedBy    User?   @relation("DesignTaskApprover", fields: [approvedById], references: [id])
  agreedById    String?
  agreedBy      User?   @relation("DesignTaskAgreer", fields: [agreedById], references: [id])

  // Заказчик (для задания на изыскания)
  customerOrgId    String?
  customerOrg      Organization? @relation("DesignTaskCustomer", fields: [customerOrgId], references: [id])
  customerPersonId String?
  customerPerson   User?         @relation("DesignTaskCustomerPerson", fields: [customerPersonId], references: [id])

  projectId   String
  project     Project @relation(fields: [projectId], references: [id], onDelete: Cascade)

  authorId    String
  author      User    @relation("DesignTaskAuthor", fields: [authorId], references: [id])

  // Файлы задания
  s3Keys      String[]    // Массив ключей файлов в S3

  // Маршрут согласования (переиспользуем ApprovalRoute)
  approvalRouteId String? @unique
  approvalRoute   ApprovalRoute? @relation("DesignTaskApproval", fields: [approvalRouteId], references: [id])

  notes       String?

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  parameters  DesignTaskParam[]
  comments    DesignTaskComment[]

  @@index([projectId])
  @@index([taskType])
  @@map("design_tasks")
}

enum DesignTaskType {
  DESIGN   // Задание на проектирование
  SURVEY   // Задание на инженерные изыскания
}

enum DesignTaskStatus {
  DRAFT              // Создан
  IN_PROGRESS        // В работе
  SENT_FOR_REVIEW    // Отправлен на проверку
  WITH_COMMENTS      // Работа с замечаниями
  REVIEW_PASSED      // Проверка пройдена
  IN_APPROVAL        // На согласовании
  APPROVED           // Согласовано в производство работ
  CANCELLED          // Аннулирован
}

/// Параметр задания на ПИР (из 95 предустановленных)
model DesignTaskParam {
  id        String      @id @default(uuid())
  paramKey  String      // Ключ параметра (из справочника)
  paramName String      // Название параметра
  value     String?     // Значение параметра
  order     Int         // Порядок в списке
  hasComment Boolean    @default(false)  // Есть замечание к этому параметру

  taskId    String
  task      DesignTask @relation(fields: [taskId], references: [id], onDelete: Cascade)

  @@index([taskId])
  @@map("design_task_params")
}

/// Замечание к заданию на ПИР
model DesignTaskComment {
  id          String              @id @default(uuid())
  number      Int                                    // Авто-инкремент в рамках задания
  description String                                 // Текст замечания
  deadline    DateTime?                              // Срок устранения
  status      DesignCommentStatus @default(ACTIVE)
  paramKey    String?                                // Если замечание к конкретному параметру

  taskId      String
  task        DesignTask @relation(fields: [taskId], references: [id], onDelete: Cascade)

  authorId    String
  author      User   @relation("DesignCommentAuthor", fields: [authorId], references: [id])

  assigneeId  String?
  assignee    User?  @relation("DesignCommentAssignee", fields: [assigneeId], references: [id])

  // Ответ на замечание
  response    String?
  respondedAt DateTime?
  respondedById String?
  respondedBy  User?  @relation("DesignCommentResponder", fields: [respondedById], references: [id])

  s3Keys      String[]   // Вложения к замечанию

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([taskId])
  @@map("design_task_comments")
}

enum DesignCommentStatus {
  ACTIVE    // Активно (незакрытое)
  ANSWERED  // Ответ дан (ожидает принятия)
  CLOSED    // Закрыто
}

// ─────────────────────────────────────────────
// ДОКУМЕНТАЦИЯ ПИР
// ─────────────────────────────────────────────

/// Документ ПИР (рабочий проект, изыскания, ПД)
model DesignDocument {
  id              String              @id @default(uuid())
  number          String                                    // Шифр/номер документа
  name            String                                    // Наименование
  docType         DesignDocType                             // Тип документации
  category        String?                                   // Категория (раздел ПД)
  version         Int                @default(1)
  status          DesignDocStatus    @default(CREATED)
  responsibleOrgId String?
  responsibleUserId String?
  notes           String?

  // Связь с исполнительной документацией (чертёж → АОСР)
  linkedExecDocIds String[]           // Массив ID ExecutionDoc

  // QR-код на чертеже (переиспользуем механику из Модуля 4)
  qrToken         String? @unique
  qrCodeS3Key     String?

  // Экспертиза
  expertiseStatus  ExpertiseStatus?
  expertiseDate    DateTime?
  expertiseComment String?

  // Файлы документа
  s3Keys          String[]            // Все прикреплённые файлы
  currentS3Key    String?             // Актуальный файл

  projectId       String
  project         Project @relation(fields: [projectId], references: [id], onDelete: Cascade)

  authorId        String
  author          User    @relation("DesignDocAuthor", fields: [authorId], references: [id])

  // Маршрут согласования
  approvalRouteId String? @unique
  approvalRoute   ApprovalRoute? @relation("DesignDocApproval", fields: [approvalRouteId], references: [id])

  // Версионирование: связь с предыдущей версией
  parentDocId     String?
  parentDoc       DesignDocument?   @relation("DesignDocVersion", fields: [parentDocId], references: [id])
  versions        DesignDocument[]  @relation("DesignDocVersion")

  isDeleted       Boolean  @default(false)    // Помечен на удаление (soft delete)

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  comments        DesignDocComment[]
  registryItems   PIRRegistryItem[]

  @@index([projectId])
  @@index([docType])
  @@index([status])
  @@index([qrToken])
  @@map("design_documents")
}

enum DesignDocType {
  DESIGN_PD        // Проектная документация (ПД)
  WORKING_RD       // Рабочая документация (РД)
  SURVEY           // Результаты изысканий
  REPEATED_USE     // Повторного применения
}

enum DesignDocStatus {
  CREATED            // Создан (серый)
  IN_PROGRESS        // В работе (синий)
  SENT_FOR_REVIEW    // Отправлен на проверку (синий)
  WITH_COMMENTS      // Работа с замечаниями
  REVIEW_PASSED      // Проверка пройдена (зелёный)
  IN_APPROVAL        // На согласовании (зелёный)
  APPROVED           // Согласовано в производство (зелёный)
  CANCELLED          // Аннулирован
}

enum ExpertiseStatus {
  NOT_SUBMITTED      // Не подано
  IN_PROCESS         // На экспертизе
  APPROVED_POSITIVE  // Положительное заключение
  APPROVED_NEGATIVE  // Отрицательное заключение
  REVISION_REQUIRED  // На доработку
}

/// Замечание к документу ПИР
model DesignDocComment {
  id            String              @id @default(uuid())
  number        Int
  text          String
  commentType   String?             // Тип замечания
  urgency       String?             // Срочность
  deadline      DateTime?
  status        DesignCommentStatus @default(ACTIVE)
  requiresAttention Boolean        @default(false)

  docId         String
  doc           DesignDocument @relation(fields: [docId], references: [id], onDelete: Cascade)

  authorId      String
  author        User   @relation("DesignDocCommentAuthor", fields: [authorId], references: [id])

  assigneeId    String?
  assignee      User?  @relation("DesignDocCommentAssignee", fields: [assigneeId], references: [id])

  response      String?
  respondedAt   DateTime?
  respondedById String?
  respondedBy   User?  @relation("DesignDocCommentResponder", fields: [respondedById], references: [id])

  s3Keys        String[]

  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@index([docId])
  @@map("design_doc_comments")
}

// ─────────────────────────────────────────────
// РЕЕСТРЫ ДОКУМЕНТАЦИИ ПИР
// ─────────────────────────────────────────────

/// Реестр документации ПИР
model PIRRegistry {
  id              String   @id @default(uuid())
  number          String                          // Номер реестра
  senderOrgId     String?                         // Кто сдал комплект
  receiverOrgId   String?                         // Кто принял комплект
  senderPersonId  String?
  receiverPersonId String?
  notes           String?

  projectId       String
  project         Project @relation(fields: [projectId], references: [id], onDelete: Cascade)

  authorId        String
  author          User    @relation("PIRRegistryAuthor", fields: [authorId], references: [id])

  // Экспертиза реестра
  expertiseStatus  ExpertiseStatus?
  expertiseDate    DateTime?
  expertiseS3Keys  String[]
  expertiseComment String?

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  items           PIRRegistryItem[]

  @@index([projectId])
  @@map("pir_registries")
}

/// Документ в реестре ПИР
model PIRRegistryItem {
  id          String      @id @default(uuid())
  registryId  String
  registry    PIRRegistry @relation(fields: [registryId], references: [id], onDelete: Cascade)
  docId       String
  doc         DesignDocument @relation(fields: [docId], references: [id])
  order       Int         @default(0)

  @@index([registryId])
  @@map("pir_registry_items")
}

// ─────────────────────────────────────────────
// АКТ ЗАКРЫТИЯ ПИР
// ─────────────────────────────────────────────

/// Акт закрытия ПИР (привязан к версии ГПР стадии ПИР)
model PIRClosureAct {
  id              String   @id @default(uuid())
  number          String
  status          PIRClosureStatus @default(DRAFT)
  periodStart     DateTime
  periodEnd       DateTime

  // Версия ГПР для закрытия (ссылка на будущую модель GanttVersion)
  ganttVersionId  String?

  // Автозаполняемые реквизиты из Модуля 3 (Участники)
  contractorOrgId String?
  customerOrgId   String?

  totalAmount     Float?

  projectId       String
  project         Project @relation(fields: [projectId], references: [id], onDelete: Cascade)

  authorId        String
  author          User    @relation("PIRActAuthor", fields: [authorId], references: [id])

  // Маршрут согласования
  approvalRouteId String? @unique
  approvalRoute   ApprovalRoute? @relation("PIRActApproval", fields: [approvalRouteId], references: [id])

  s3Key           String?   // PDF-печатная форма
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  items           PIRClosureItem[]

  @@index([projectId])
  @@map("pir_closure_acts")
}

enum PIRClosureStatus {
  DRAFT        // Черновик
  CONDUCTED    // Проведён
  IN_APPROVAL  // На согласовании
  SIGNED       // Подписан
}

/// Позиция акта закрытия ПИР (из ГПР)
model PIRClosureItem {
  id        String        @id @default(uuid())
  actId     String
  act       PIRClosureAct @relation(fields: [actId], references: [id], onDelete: Cascade)
  workName  String        // Наименование работы из ГПР
  unit      String?       // Единица измерения
  volume    Float?        // Объём
  amount    Float?        // Стоимость

  @@index([actId])
  @@map("pir_closure_items")
}
```

### 1.2. Предустановленные параметры (seed)

```typescript
// prisma/seeds/design-task-params.ts
// 95 параметров для задания на проектирование (из ЦУС)
// 15 параметров для задания на изыскания

export const DESIGN_PARAMS = [
  // Раздел 1: Общие данные
  { key: 'object_name',      name: 'Наименование объекта', order: 1 },
  { key: 'object_address',   name: 'Адрес объекта', order: 2 },
  { key: 'build_type',       name: 'Вид строительства', order: 3 },
  { key: 'purpose',          name: 'Назначение объекта', order: 4 },
  { key: 'capacity',         name: 'Мощность/вместимость', order: 5 },
  // Раздел 2: Требования к проектной документации
  { key: 'stages',           name: 'Стадийность проектирования', order: 6 },
  { key: 'sections',         name: 'Разделы проектной документации', order: 7 },
  { key: 'ntd_list',         name: 'Перечень НТД', order: 8 },
  // ... до 95 параметров
];

export const SURVEY_PARAMS = [
  { key: 'survey_type',      name: 'Вид изысканий', order: 1 },
  { key: 'survey_area',      name: 'Площадь исследования', order: 2 },
  // ... до 15 параметров
];
```

### 1.3. Команда для Claude Code

```
Прочитай CLAUDE.md. Добавь в prisma/schema.prisma модели:
DesignTask (с enum-ами DesignTaskType, DesignTaskStatus),
DesignTaskParam, DesignTaskComment (с DesignCommentStatus),
DesignDocument (с enum-ами DesignDocType, DesignDocStatus, ExpertiseStatus),
DesignDocComment,
PIRRegistry, PIRRegistryItem,
PIRClosureAct (с PIRClosureStatus), PIRClosureItem.

Добавь в User: все новые @relation из этих моделей.
Добавь в Project: designTasks DesignTask[], designDocs DesignDocument[],
                  pirRegistries PIRRegistry[], pirClosureActs PIRClosureAct[]

Затем:
npx prisma migrate dev --name add_module5_pir
npx prisma generate

Создай prisma/seeds/design-task-params.ts с 95 параметрами для ЗП
и 15 параметрами для ЗИ (придумай типовые параметры задания на ПИР).
```

---

## Шаг 2 — URL, layout и sidebar (День 3)

### 2.1. Layout с 7 вкладками

```tsx
// src/app/(dashboard)/objects/[objectId]/pir/layout.tsx
const PIR_TABS = [
  { label: 'Задание на ПИР',    href: 'design-task' },
  { label: 'Изыскания',         href: 'survey-task' },
  { label: 'Документация',      href: 'documentation' },
  { label: 'Повторное прим.',   href: 'reuse' },
  { label: 'Реестры',           href: 'registries' },
  { label: 'Закрытие',          href: 'closure' },
  { label: 'Аналитика',         href: 'analytics' },
];
```

### 2.2. Добавить «ПИР» в ObjectModuleSidebar

```tsx
{ label: 'ПИР', href: 'pir/design-task', icon: Layers },
```

### 2.3. Команда для Claude Code

```
Создай файловую структуру Модуля 5:
- src/app/(dashboard)/objects/[objectId]/pir/layout.tsx (7 Tabs)
- src/app/(dashboard)/objects/[objectId]/pir/design-task/page.tsx
- src/app/(dashboard)/objects/[objectId]/pir/design-task/[taskId]/page.tsx
- src/app/(dashboard)/objects/[objectId]/pir/survey-task/page.tsx
- src/app/(dashboard)/objects/[objectId]/pir/survey-task/[taskId]/page.tsx
- src/app/(dashboard)/objects/[objectId]/pir/documentation/page.tsx
- src/app/(dashboard)/objects/[objectId]/pir/documentation/[docId]/page.tsx
- src/app/(dashboard)/objects/[objectId]/pir/reuse/page.tsx
- src/app/(dashboard)/objects/[objectId]/pir/registries/page.tsx
- src/app/(dashboard)/objects/[objectId]/pir/registries/[regId]/page.tsx
- src/app/(dashboard)/objects/[objectId]/pir/closure/page.tsx
- src/app/(dashboard)/objects/[objectId]/pir/analytics/page.tsx

В ObjectModuleSidebar.tsx добавь пункт "ПИР"
(иконка Layers из lucide-react, href: pir/design-task).
```

---

## Шаг 3 — API роуты (День 4–5)

### 3.1. Задания (ЗП и ЗИ — одна структура, разный taskType)

```
GET    /api/projects/[id]/design-tasks              — список (фильтр taskType=DESIGN/SURVEY)
POST   /api/projects/[id]/design-tasks              — создать
GET    /api/projects/[id]/design-tasks/[tid]        — карточка задания
PATCH  /api/projects/[id]/design-tasks/[tid]        — обновить (статус, поля)
DELETE /api/projects/[id]/design-tasks/[tid]        — удалить

GET    /api/projects/[id]/design-tasks/[tid]/params      — параметры
PATCH  /api/projects/[id]/design-tasks/[tid]/params/[pid] — обновить значение параметра

GET    /api/projects/[id]/design-tasks/[tid]/comments    — замечания
POST   /api/projects/[id]/design-tasks/[tid]/comments    — создать замечание
PATCH  /api/projects/[id]/design-tasks/[tid]/comments/[cid] — ответить / принять / закрыть

POST   /api/projects/[id]/design-tasks/[tid]/conduct     — провести (DRAFT → IN_PROGRESS)
POST   /api/projects/[id]/design-tasks/[tid]/review      — отправить на проверку
POST   /api/projects/[id]/design-tasks/[tid]/approve-review — принять проверку
POST   /api/projects/[id]/design-tasks/[tid]/return      — вернуть на доработку
POST   /api/projects/[id]/design-tasks/[tid]/cancel      — аннулировать
POST   /api/projects/[id]/design-tasks/[tid]/workflow    — запустить маршрут согласования
POST   /api/projects/[id]/design-tasks/[tid]/upload      — загрузить файл
POST   /api/projects/[id]/design-tasks/[tid]/print       — скачать печатную форму (.doc)
```

**Ключевая логика — инициализация параметров:**
```typescript
// При создании нового задания — автоматически создавать параметры из справочника
async function createDesignTask(projectId, taskType, ...) {
  const params = taskType === 'DESIGN' ? DESIGN_PARAMS : SURVEY_PARAMS;

  const task = await db.designTask.create({
    data: {
      ...taskData,
      parameters: {
        createMany: {
          data: params.map(p => ({
            paramKey: p.key,
            paramName: p.name,
            order: p.order,
            value: null,
          }))
        }
      }
    },
    include: { parameters: true }
  });
  return task;
}
```

**Логика статусной машины:**
```typescript
// lib/pir/task-state-machine.ts
const TASK_TRANSITIONS: Record<DesignTaskStatus, DesignTaskStatus[]> = {
  DRAFT:           ['IN_PROGRESS'],
  IN_PROGRESS:     ['SENT_FOR_REVIEW', 'CANCELLED'],
  SENT_FOR_REVIEW: ['WITH_COMMENTS', 'REVIEW_PASSED'],
  WITH_COMMENTS:   ['IN_PROGRESS'],         // вернуть на доработку
  REVIEW_PASSED:   ['IN_APPROVAL'],
  IN_APPROVAL:     ['APPROVED', 'CANCELLED'],
  APPROVED:        [],
  CANCELLED:       [],
};

// Правило: согласование возможно только если нет активных замечаний
async function canSendToApproval(taskId: string): Promise<boolean> {
  const activeComments = await db.designTaskComment.count({
    where: { taskId, status: { in: ['ACTIVE', 'ANSWERED'] } }
  });
  return activeComments === 0;
}
```

### 3.2. Документация ПИР

```
GET    /api/projects/[id]/design-docs               — список (фильтры: docType, status, category)
POST   /api/projects/[id]/design-docs               — создать
GET    /api/projects/[id]/design-docs/[did]         — карточка
PATCH  /api/projects/[id]/design-docs/[did]         — обновить

POST   /api/projects/[id]/design-docs/[did]/conduct       — провести
POST   /api/projects/[id]/design-docs/[did]/review        — отправить на проверку
POST   /api/projects/[id]/design-docs/[did]/approve-review — принять проверку
POST   /api/projects/[id]/design-docs/[did]/cancel        — аннулировать
POST   /api/projects/[id]/design-docs/[did]/workflow      — запустить согласование
POST   /api/projects/[id]/design-docs/[did]/version       — создать новую версию
POST   /api/projects/[id]/design-docs/[did]/copy          — создать копию
POST   /api/projects/[id]/design-docs/[did]/upload        — загрузить файл
POST   /api/projects/[id]/design-docs/[did]/qr            — сгенерировать QR-код
POST   /api/projects/[id]/design-docs/[did]/stamp         — добавить штамп
PATCH  /api/projects/[id]/design-docs/[did]/expertise     — внести данные экспертизы
POST   /api/projects/[id]/design-docs/[did]/link-exec-doc — привязать к АОСР

GET    /api/projects/[id]/design-docs/[did]/comments      — замечания к документу
POST   /api/projects/[id]/design-docs/[did]/comments      — создать замечание
PATCH  /api/projects/[id]/design-docs/[did]/comments/[cid] — ответить / принять / закрыть
```

**Версионирование документа:**
```typescript
// POST /api/projects/[id]/design-docs/[did]/version
// Создать новую версию (связанную с оригиналом)
const original = await db.designDocument.findUniqueOrThrow({ where: { id: did } });
const newVersion = await db.designDocument.create({
  data: {
    ...original,
    id: undefined,
    version: original.version + 1,
    status: 'IN_PROGRESS',
    parentDocId: original.id,
    approvalRouteId: null,    // новый маршрут согласования
    createdAt: undefined,
    updatedAt: undefined,
  }
});
// Замечания оригинала видны в версии (через parentDocId)
```

**Привязка чертежа к АОСР:**
```typescript
// POST /api/projects/[id]/design-docs/[did]/link-exec-doc
// { execDocId: string }
await db.designDocument.update({
  where: { id: did },
  data: {
    linkedExecDocIds: { push: body.execDocId }
  }
});
// Теперь в карточке АОСР можно показать "Чертёж: Раздел_АС_v3.pdf →"
```

### 3.3. Реестры и Закрытие

```
GET    /api/projects/[id]/pir-registries            — список реестров
POST   /api/projects/[id]/pir-registries            — создать реестр
GET    /api/projects/[id]/pir-registries/[rid]      — карточка реестра
PATCH  /api/projects/[id]/pir-registries/[rid]      — обновить
POST   /api/projects/[id]/pir-registries/[rid]/add-doc  — добавить документ в реестр
DELETE /api/projects/[id]/pir-registries/[rid]/docs/[did] — убрать из реестра
PATCH  /api/projects/[id]/pir-registries/[rid]/expertise  — заполнить данные экспертизы

GET    /api/projects/[id]/pir-closure               — список актов закрытия
POST   /api/projects/[id]/pir-closure               — создать акт
GET    /api/projects/[id]/pir-closure/[aid]         — карточка акта
POST   /api/projects/[id]/pir-closure/[aid]/fill    — заполнить автоматически из ГПР
POST   /api/projects/[id]/pir-closure/[aid]/conduct — провести акт
POST   /api/projects/[id]/pir-closure/[aid]/workflow — запустить согласование
POST   /api/projects/[id]/pir-closure/[aid]/print   — скачать печатную форму
```

### 3.4. Аналитика

```
GET /api/projects/[id]/pir-analytics
// Возвращает 6 виджетов:
// 1. Документов по статусам
// 2. Документов по статусам согласования
// 3. Активные / закрытые замечания
// 4. Документов по типам
// 5. Замечания по авторам
// 6. Замечания по ответственным
```

### 3.5. Команда для Claude Code

```
Создай API роуты Модуля 5:

1. src/app/api/projects/[projectId]/design-tasks/route.ts — GET (с taskType фильтром), POST
   При POST создавать параметры из справочника (95 для DESIGN, 15 для SURVEY)

2. src/app/api/projects/[projectId]/design-tasks/[taskId]/route.ts — GET, PATCH, DELETE
3. src/app/api/projects/[projectId]/design-tasks/[taskId]/params/route.ts — GET
4. src/app/api/projects/[projectId]/design-tasks/[taskId]/params/[paramId]/route.ts — PATCH
5. src/app/api/projects/[projectId]/design-tasks/[taskId]/comments/route.ts — GET, POST
6. src/app/api/projects/[projectId]/design-tasks/[taskId]/comments/[commentId]/route.ts — PATCH
7. src/app/api/projects/[projectId]/design-tasks/[taskId]/conduct/route.ts — POST
8. src/app/api/projects/[projectId]/design-tasks/[taskId]/workflow/route.ts — POST

9. src/app/api/projects/[projectId]/design-docs/route.ts — GET, POST
10. src/app/api/projects/[projectId]/design-docs/[docId]/route.ts — GET, PATCH
11. src/app/api/projects/[projectId]/design-docs/[docId]/version/route.ts — POST
12. src/app/api/projects/[projectId]/design-docs/[docId]/copy/route.ts — POST
13. src/app/api/projects/[projectId]/design-docs/[docId]/qr/route.ts — POST
14. src/app/api/projects/[projectId]/design-docs/[docId]/expertise/route.ts — PATCH
15. src/app/api/projects/[projectId]/design-docs/[docId]/link-exec-doc/route.ts — POST
16. src/app/api/projects/[projectId]/design-docs/[docId]/comments/route.ts — GET, POST
17. src/app/api/projects/[projectId]/design-docs/[docId]/comments/[cid]/route.ts — PATCH

18. src/app/api/projects/[projectId]/pir-registries/route.ts — GET, POST
19. src/app/api/projects/[projectId]/pir-registries/[regId]/route.ts — GET, PATCH
20. src/app/api/projects/[projectId]/pir-registries/[regId]/expertise/route.ts — PATCH

21. src/app/api/projects/[projectId]/pir-closure/route.ts — GET, POST
22. src/app/api/projects/[projectId]/pir-closure/[actId]/route.ts — GET
23. src/app/api/projects/[projectId]/pir-closure/[actId]/fill/route.ts — POST
24. src/app/api/projects/[projectId]/pir-closure/[actId]/conduct/route.ts — POST

25. src/app/api/projects/[projectId]/pir-analytics/route.ts — GET (6 виджетов)

В каждом роуте: getSessionOrThrow() + проверка organizationId.
При создании/изменении замечания — создавать Notification для assignee.
```

---

## Шаг 4 — Вкладка «Задание на ПИР» (День 6–7)

### 4.1. Список заданий

```tsx
// src/components/objects/pir/DesignTaskList.tsx

// Таблица заданий с цветовой индикацией статусов (как в ЦУС):
// ● серый   = DRAFT (Создан)
// ● синий   = IN_PROGRESS / SENT_FOR_REVIEW (В работе / На проверке)
// ● красный = WITH_COMMENTS + есть незакрытые замечания
// ● оранжевый = WITH_COMMENTS + есть ответ на замечание
// ● зелёный = REVIEW_PASSED / APPROVED

// Колонки: Цвет-индикатор | Номер | Дата | Статус | Утверждающий | Замечания | Действия

// Кнопка "+ Добавить задание" → Dialog с полями:
// - Номер документа (Input)
// - Дата (DatePicker)
// - Утверждаю (Combobox из пользователей)
// - Согласовано (Combobox из пользователей)
// - Прикрепить файл (upload → S3)
```

### 4.2. Карточка задания — 5 вкладок

```tsx
// src/app/(dashboard)/objects/[objectId]/pir/design-task/[taskId]/page.tsx

// Вкладки карточки задания:
// [Параметры] [Замечания N] [Файлы] [Согласование] [Подписание]

// === Вкладка «Параметры» ===
// Таблица из 95 строк: | Параметр | Значение | Замечания |
// Клик на значение → inline редактирование (Input прямо в таблице)
// Иконка 💬 рядом с параметром если есть замечание к нему
// PATCH /design-tasks/[id]/params/[pid] { value: "..." }

// === Вкладка «Замечания» ===
// Список карточек замечаний:
// [№ замечания] [Описание] [Срок] [Ответственный] [Статус Badge]
// Кнопка "+ Добавить замечание"
// Клик на замечание → Sheet с деталями:
//   - Текст замечания
//   - Поле ответа (если assignee === me → показать форму ответа)
//   - После ответа: кнопки "Принять" / "Вернуть на доработку"

// === Вкладка «Согласование» ===
// Переиспользуем ApprovalTimeline ✅
// Кнопка "Отправить на согласование" → выбор шаблона или создание нового
// Шаблон = набор пользователей (как в ИД)

// === Кнопки действий (шапка карточки) ===
// [Провести] → только если status=DRAFT
// [Отправить на проверку] → если IN_PROGRESS
// [Принять проверку] → если SENT_FOR_REVIEW и я проверяющий
// [Вернуть на доработку] → если WITH_COMMENTS
// [Аннулировать] → всегда (кроме APPROVED)
// [Печать] → скачать .doc
```

### 4.3. Команда для Claude Code

```
Создай компоненты вкладки «Задание на ПИР»:

1. src/components/objects/pir/DesignTaskList.tsx
   — Таблица заданий с цветовым индикатором статуса (цветная точка)
   — Кнопка "+ Добавить задание" → CreateDesignTaskDialog
   — Клик по строке → переход на /pir/design-task/[id]

2. src/components/objects/pir/CreateDesignTaskDialog.tsx
   — Поля: номер, дата (DatePicker), утверждаю (Combobox), согласовано (Combobox)
   — Загрузка файла (input type=file → upload S3)
   — POST /api/projects/${projectId}/design-tasks (taskType=DESIGN)
   — При создании параметры появляются автоматически

3. src/app/(dashboard)/objects/[objectId]/pir/design-task/[taskId]/page.tsx
   — Шапка: номер, дата, статус Badge, кнопки действий
   — Внутренние Tabs: Параметры / Замечания / Файлы / Согласование
   — Вкладка «Параметры»: таблица параметров с inline-редактированием
     (клик → Input, blur → PATCH /params/[pid])
   — Вкладка «Замечания»: список + Sheet с деталями замечания + форма ответа
   — Вкладка «Согласование»: переиспользуй ApprovalTimeline
```

---

## Шаг 5 — Вкладка «Задание на изыскания» (День 7)

Аналогично вкладке «Задание на ПИР», но:
- `taskType = SURVEY`
- 15 параметров вместо 95
- Дополнительные поля: Заказчик (Organization), Представитель заказчика (User)

```
Создай страницы для /pir/survey-task/ по той же структуре что и design-task,
но с taskType=SURVEY, 15 параметрами, и дополнительными полями
Заказчик/Представитель заказчика в форме создания.
```

---

## Шаг 6 — Вкладка «Документация ПИР» (День 8–10)

### 6.1. Список документов (как реестр)

```tsx
// src/components/objects/pir/DesignDocList.tsx

// Двухколоночный layout:
// Левая (220px) — категории / разделы (ПД / РД / Изыскания / Тип объекта)
// Правая — таблица документов

// Таблица (TanStack Table) с колонками (как в ЦУС стр. 102):
// | Файл | Штампы/QR | ЭЦП | Экспертиза | Связь с ИД |
// | Объект | Раздел | Шифр | Версия | Тип |
// | Статус● | Ответственный | Дата | Замечания | Согласование |

// Цветной индикатор статуса (точка):
// ● серый    = CREATED
// ● синий    = IN_PROGRESS / SENT_FOR_REVIEW
// ● красный  = WITH_COMMENTS + незакрытые
// ● оранжевый = WITH_COMMENTS + ответ дан
// ● зелёный  = REVIEW_PASSED / APPROVED

// Кнопка "+ Создать документ" → CreateDesignDocDialog
```

### 6.2. Создание документа ПИР

```tsx
// CreateDesignDocDialog.tsx
// Поля:
// - Тип документации: Select (ПД / РД / Изыскания / Повторного применения)
// - Категория/раздел: Input (или Select из предустановленных разделов ПД)
// - Шифр документа: Input (например "АС-01")
// - Наименование: Input
// - Ответственная организация: Combobox из участников проекта
// - Ответственное лицо: Combobox
// - Примечание: Textarea
// - Загрузить файл: DropZone (PDF/DWG)
// POST /api/projects/${projectId}/design-docs
```

### 6.3. Карточка документа ПИР — 6 вкладок

```tsx
// /pir/documentation/[docId]/page.tsx

// Вкладки:
// [Документ] [Параметры] [Замечания N] [Файлы] [Согласование] [Подписание]

// === Вкладка «Документ» ===
// PDF-просмотрщик (react-pdf) ✅ — уже есть в проекте
// Кнопки над просмотрщиком:
//   [Штампы] → Sheet для добавления штампа (переиспользуем логику из ИД)
//   [QR-коды] → POST /design-docs/[id]/qr → показать PNG
//   [Связать с АОСР] → Combobox поиска ExecutionDoc + POST /link-exec-doc
//   [Провести] [Отправить на проверку] [Аннулировать]

// === Вкладка «Экспертиза» (вместо Параметры для документов) ===
// Форма: статус, дата, файл заключения
// PATCH /design-docs/[id]/expertise

// === Версии и Копии ===
// В Actions меню:
//   [Создать версию] → POST /version → открыть новую карточку
//   [Создать копию]  → POST /copy → открыть новую карточку (без связи с оригиналом)

// Индикаторы в шапке карточки:
// "Версия 3 из 3" — если у документа есть версии
// "Связан с АОСР: №47, №51" — клики ведут на соответствующие акты
```

### 6.4. Команда для Claude Code

```
Создай компоненты вкладки «Документация ПИР»:

1. src/components/objects/pir/DesignDocList.tsx
   — Двухколоночный layout: категории слева (дерево), таблица справа
   — TanStack Table с колонками из ЦУС (стр. 102)
   — Цветной индикатор статуса (точка перед строкой)
   — Клик по строке → /pir/documentation/[id]

2. src/components/objects/pir/CreateDesignDocDialog.tsx
   — Поля: тип, категория, шифр, наименование, организация, ответственный, файл
   — POST /api/projects/${projectId}/design-docs

3. src/app/(dashboard)/objects/[objectId]/pir/documentation/[docId]/page.tsx
   — Шапка: шифр, название, статус, версия, кнопки действий
   — Вкладки: Документ (PDF-viewer) / Замечания / Экспертиза / Согласование
   — Кнопки Штампы, QR-коды, Связать с АОСР
   — Actions меню: Создать версию, Создать копию, Аннулировать
   — Переиспользуй ApprovalTimeline для вкладки Согласование
```

---

## Шаг 7 — Вкладка «Повторное применение» (День 10)

Аналогична «Документации ПИР», но `docType = REPEATED_USE`. Добавляется кнопка «Создать копию» (для использования документа как шаблона в новом проекте).

```
Создай src/app/(dashboard)/objects/[objectId]/pir/reuse/page.tsx
— Фильтрует DesignDocument с docType=REPEATED_USE
— Переиспользуй DesignDocList с этим фильтром
— Добавь кнопку "Создать копию" на каждой строке (POST /copy)
```

---

## Шаг 8 — Вкладка «Реестры» (День 11)

### 8.1. Список реестров

```tsx
// Таблица: | Номер реестра | Дата | Кто сдал | Кто принял | Экспертиза | Документов |
// Кнопка "+ Добавить реестр" → Dialog:
//   - Номер реестра (Input)
//   - Кто сдал (Combobox организации + Combobox физлица)
//   - Кто принял (аналогично)
//   - POST /api/projects/${projectId}/pir-registries
```

### 8.2. Карточка реестра

```tsx
// /pir/registries/[regId]/page.tsx
// Вкладки: [Документы] [Экспертиза]

// === Вкладка «Документы» ===
// Список прикреплённых DesignDocument (из PIRRegistryItem)
// Кнопка "Добавить документы" → MultiSelect из всех DesignDoc проекта
// POST /pir-registries/[id]/add-doc для каждого выбранного

// === Вкладка «Экспертиза» ===
// Форма: статус (Select ExpertiseStatus), дата, комментарий, файлы
// PATCH /pir-registries/[id]/expertise
// После заполнения — данные автоматически попадают в вкладку «Показатели» объекта
```

### 8.3. Команда для Claude Code

```
Создай компоненты вкладки «Реестры»:

1. src/components/objects/pir/PIRRegistryList.tsx
   — Таблица реестров с кнопкой создания
   — GET /api/projects/${projectId}/pir-registries

2. src/app/(dashboard)/objects/[objectId]/pir/registries/[regId]/page.tsx
   — Вкладки: Документы / Экспертиза
   — Вкладка Документы: список + кнопка "Добавить" (MultiSelect DesignDoc)
   — Вкладка Экспертиза: форма + загрузка файлов заключения
```

---

## Шаг 9 — Вкладка «Закрытие» (Акт закрытия ПИР) (День 12)

### 9.1. Логика акта закрытия

```tsx
// Акт закрытия ПИР формируется на основе ГПР стадии ПИР
// (На данном этапе ГПР ещё нет — Модуль 7)
// Поэтому делаем упрощённую версию: ручной ввод позиций

// Форма создания акта:
// - Номер (Input)
// - Период: Start/End DatePicker
// - Версия ГПР: Select (пустой если ГПР нет → placeholder "Модуль 7 ГПР")
// - Подрядчик: автозаполнение из участников проекта
// - Заказчик: автозаполнение из участников проекта

// Кнопка "Заполнить автоматически" → только если есть GanttVersion (позже)
// Кнопка "Выбрать позиции" → ручной ввод через таблицу

// Таблица позиций:
// | Наименование работы | Ед. изм. | Объём | Стоимость |
// Кнопка "+ Добавить позицию"

// Кнопки: [Сохранить] [Провести] [Согласовать] [Печать]
```

### 9.2. Команда для Claude Code

```
Создай src/app/(dashboard)/objects/[objectId]/pir/closure/page.tsx

Список актов закрытия (таблица) + кнопка "+ Создать акт".

Создай Sheet CreatePIRClosureSheet:
- Поля: номер, период (start/end DatePicker),
  подрядчик и заказчик (автозаполнение из ContractParticipant проекта)
- Таблица позиций: наименование, единица, объём, стоимость
- POST /api/projects/${projectId}/pir-closure

В карточке акта:
- Кнопка "Провести" (POST /conduct)
- Кнопка "Согласовать" → ApprovalRoute
- Кнопка "Печать" → скачать как Handlebars PDF (аналогично КС-2)

Примечание: связь с ГПР добавить позже в Модуле 7.
```

---

## Шаг 10 — Вкладка «Аналитика» (День 13)

```tsx
// src/app/(dashboard)/objects/[objectId]/pir/analytics/page.tsx

// GET /api/projects/${projectId}/pir-analytics
// 6 виджетов (Recharts):

// 1. PieChart "Документы по статусам"
//    CREATED/IN_PROGRESS/APPROVED/CANCELLED

// 2. PieChart "Документы по статусам согласования"
//    PENDING / IN_APPROVAL / APPROVED / REJECTED

// 3. BarChart "Замечания активные / закрытые" (по месяцам)

// 4. PieChart "Документы по типам"
//    ПД / РД / Изыскания / Повторного применения

// 5. BarChart "Замечания по авторам"
//    Топ-10 авторов замечаний

// 6. BarChart "Замечания по ответственным"
//    Топ-10 ответственных за устранение
```

```
Создай src/app/(dashboard)/objects/[objectId]/pir/analytics/page.tsx

Данные: GET /api/projects/${projectId}/pir-analytics
Recharts уже в проекте.

6 виджетов в сетке 3×2:
1. PieChart — статусы документов
2. PieChart — статусы согласования
3. BarChart — замечания по месяцам (active/closed)
4. PieChart — типы документов (ПД/РД/Изыскания)
5. BarChart — замечания по авторам (горизонтальный)
6. BarChart — замечания по ответственным (горизонтальный)

Каждый виджет — shadcn Card. Skeleton пока грузятся данные.
```

---

## Шаг 11 — Привязка ПИР-документа к АОСР (День 14)

### 11.1. Двусторонняя связь

```typescript
// Когда инженер привязывает чертёж к АОСР:
// DesignDocument.linkedExecDocIds → [..., execDocId]

// В карточке АОСР показать связанные чертежи:
// GET /api/projects/[id]/execution-docs/[eid]
// → include: linkedDesignDocs (через linkedExecDocIds)

// Реализация через raw query (Prisma не поддерживает поиск по JSON-массиву напрямую):
const linkedDocs = await db.$queryRaw`
  SELECT * FROM design_documents
  WHERE ${execDocId} = ANY(linked_exec_doc_ids)
  AND project_id = ${projectId}
`;
```

### 11.2. Доработка карточки АОСР

```
Прочитай CLAUDE.md. В карточке АОСР (ExecutionDocDetailContent.tsx)
добавь блок "Связанные чертежи ПД":
- GET /api/projects/${projectId}/design-docs?linkedTo=${docId}
  (роут фильтрует DesignDocument по linkedExecDocIds)
- Показывать список: шифр, наименование, версия, QR-кнопка
- Кнопка "+ Привязать чертёж" → Combobox поиска DesignDocument
  POST /api/projects/${projectId}/design-docs/${did}/link-exec-doc
  { execDocId: currentDocId }
```

---

## Шаг 12 — TypeScript и полировка (День 14–15)

```bash
npx tsc --noEmit
```

### Финальный чеклист

```
□ /pir/design-task — список заданий с цветовыми индикаторами
□ /pir/design-task/[id] — карточка с 95 параметрами (inline редактирование)
□ /pir/design-task/[id] — замечания: создание, ответ, принятие
□ /pir/design-task/[id] — статусная машина: провести → на проверку → согласовать
□ /pir/survey-task — аналогично с 15 параметрами
□ /pir/documentation — таблица с цветными индикаторами, двухколоночный layout
□ /pir/documentation/[id] — PDF-viewer, версии, копии, штамп, QR-код
□ /pir/documentation/[id] — привязка к АОСР работает в обе стороны
□ /pir/reuse — фильтрованный список + кнопка «Создать копию»
□ /pir/registries — список + карточка с документами и экспертизой
□ /pir/closure — создание акта, таблица позиций, провести/согласовать
□ /pir/analytics — 6 виджетов отображаются с реальными данными
□ Уведомления при назначении замечания (Notification создаётся)
□ QR-коды на чертежах → публичная страница /docs/verify/[token] (из М4)
□ ApprovalTimeline переиспользуется во всех карточках
□ TypeScript — нет ошибок
□ Все API проверяют organizationId
□ loading.tsx и error.tsx для каждой страницы
```

---

## Итоговая структура файлов

```
src/
├── app/(dashboard)/objects/[objectId]/pir/
│   ├── layout.tsx
│   ├── design-task/page.tsx + [taskId]/page.tsx
│   ├── survey-task/page.tsx + [taskId]/page.tsx
│   ├── documentation/page.tsx + [docId]/page.tsx
│   ├── reuse/page.tsx
│   ├── registries/page.tsx + [regId]/page.tsx
│   ├── closure/page.tsx
│   └── analytics/page.tsx
│
├── app/api/projects/[projectId]/
│   ├── design-tasks/route.ts + [taskId]/(conduct|workflow|review|comments)/
│   ├── design-docs/route.ts + [docId]/(version|copy|qr|expertise|link-exec-doc|comments)/
│   ├── pir-registries/route.ts + [regId]/(expertise|add-doc)/
│   ├── pir-closure/route.ts + [actId]/(conduct|fill|workflow)/
│   └── pir-analytics/route.ts
│
├── components/objects/pir/
│   ├── DesignTaskList.tsx
│   ├── CreateDesignTaskDialog.tsx
│   ├── DesignTaskParams.tsx         ← таблица 95 параметров
│   ├── DesignTaskComments.tsx       ← список + Sheet
│   ├── DesignDocList.tsx
│   ├── CreateDesignDocDialog.tsx
│   ├── DesignDocActions.tsx         ← кнопки статусной машины
│   ├── DesignDocComments.tsx
│   ├── PIRRegistryList.tsx
│   ├── PIRRegistryCard.tsx
│   ├── PIRClosureForm.tsx
│   └── PIRAnalytics.tsx
│
└── lib/pir/
    ├── task-state-machine.ts        ← логика переходов статусов
    ├── design-task-params.ts        ← 95 предустановленных параметров
    └── validations.ts
```

---

## Порядок задач в Claude Code (15 дней)

```
День 1–2:  "Добавь модели в schema.prisma (DesignTask, DesignDocument,
            PIRRegistry, PIRClosureAct). Выполни миграцию.
            Создай seed с 95+15 параметрами."

День 3:    "Создай файловую структуру /pir/ с layout (7 Tabs),
            добавь ПИР в ObjectModuleSidebar."

День 4–5:  "Создай все API роуты модуля (задания, документы, реестры,
            закрытие, аналитика). Статусная машина в task-state-machine.ts."

День 6–7:  "Создай вкладку Задание на ПИР: список + карточка с 95 параметрами."

День 7:    "Создай вкладку Изыскания (15 параметров, аналогично ЗП)."

День 8–10: "Создай вкладку Документация ПИР: таблица + карточка
            с PDF-viewer, версиями, QR, привязкой к АОСР."

День 10:   "Создай вкладку Повторное применение (переиспользование)."

День 11:   "Создай вкладку Реестры."

День 12:   "Создай вкладку Закрытие (Акт закрытия ПИР)."

День 13:   "Создай вкладку Аналитика (6 виджетов Recharts)."

День 14:   "Добавь двустороннюю привязку ПД-документа к АОСР.
            Доработай карточку АОСР."

День 15:   "npx tsc --noEmit, loading/error.tsx, полировка."
```

> **Параллельные задачи:** Дни 6–13 можно разбить на 2 потока:  
> Поток A: Задания на ПИР + Изыскания (Дни 6–7) → Реестры (День 11) → Закрытие (День 12)  
> Поток B: Документация ПИР (Дни 8–10) → Повторное применение (День 10) → Аналитика (День 13)  
> Так 15 дней сжимаются до ~10.

> **Совет:** каждую задачу начинай с `Прочитай CLAUDE.md и ROADMAP.md`
