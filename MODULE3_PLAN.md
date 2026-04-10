# Модуль 3 — Информация и СЭД: подробный план реализации

> Аналог: ЦУС → Модуль «Информация» + Модуль «СЭД»  
> Текущее состояние: **ничего нет** — все 5 вкладок нужно создать с нуля.  
> Что переиспользуем: `ContractParticipant` ✅, `ApprovalRoute/ApprovalStep` ✅, `Organization` ✅  
> Ориентир: **2–3 недели**

---

## Что уже есть (переиспользуем без изменений)

```
ContractParticipant  → вкладка «Участники» (уже хранит орг. с ролями)
ApprovalRoute        → маршрут согласования для СЭД-документа
ApprovalStep         → шаги согласования
Organization         → карточка организации-участника
Notification         → (из Модуля 1) уведомления о новых письмах
```

---

## Архитектура модуля

Модуль 3 живёт по адресу `/objects/[objectId]/info/[tab]` и состоит из 5 вкладок:

```
/objects/[id]/info/participants    ← Участники
/objects/[id]/info/correspondence  ← Деловая переписка
/objects/[id]/info/rfi             ← Вопросы (RFI)
/objects/[id]/sed                  ← СЭД (отдельный модуль, как в ЦУС)
/objects/[id]/info/chat            ← Чат
```

> В ЦУС «Информация» и «СЭД» — два разных модуля в боковой панели.  
> Мы делаем так же: вкладки Участники/Переписка/Вопросы/Чат — в разделе «Информация»,  
> а СЭД — отдельный пункт sidebar'а.

---

## Шаг 1 — Prisma-схема (День 1–2)

### 1.1. Новые модели

```prisma
// prisma/schema.prisma

/// Официальное письмо (Деловая переписка)
model Correspondence {
  id          String               @id @default(uuid())
  number      String               // Авто-нумерация: ИСХ-2025-001 / ВХ-2025-001
  direction   CorrespondenceDir    // OUTGOING / INCOMING
  subject     String               // Тема письма
  body        String?              // Текст письма (plain text или HTML)
  status      CorrespondenceStatus @default(DRAFT)
  isRead      Boolean              @default(false)
  sentAt      DateTime?            // Дата отправки
  tags        String[]             // Теги для поиска (PostgreSQL array)

  projectId   String
  project     Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)

  // Отправитель / получатель — организации
  senderOrgId   String
  senderOrg     Organization @relation("CorrespondenceSender",   fields: [senderOrgId],   references: [id])
  receiverOrgId String
  receiverOrg   Organization @relation("CorrespondenceReceiver", fields: [receiverOrgId], references: [id])

  // Физ. лицо-отправитель внутри организации
  authorId    String
  author      User     @relation("CorrespondenceAuthor", fields: [authorId], references: [id])

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  attachments   CorrespondenceAttachment[]
  approvalRoute ApprovalRoute?             @relation("CorrespondenceApproval")

  // Полнотекстовый поиск
  searchVector Unsupported("tsvector")?

  @@index([projectId])
  @@index([direction])
  @@index([status])
  @@map("correspondences")
}

enum CorrespondenceDir {
  OUTGOING  // Исходящее
  INCOMING  // Входящее
}

enum CorrespondenceStatus {
  DRAFT        // Черновик
  SENT         // Отправлено
  READ         // Прочитано адресатом
  IN_APPROVAL  // На согласовании
  APPROVED     // Согласовано
  REJECTED     // Отклонено
  ARCHIVED     // В архиве
}

/// Вложение к письму
model CorrespondenceAttachment {
  id               String         @id @default(uuid())
  correspondenceId String
  correspondence   Correspondence @relation(fields: [correspondenceId], references: [id], onDelete: Cascade)
  fileName         String
  s3Key            String
  mimeType         String
  size             Int
  createdAt        DateTime       @default(now())

  @@index([correspondenceId])
  @@map("correspondence_attachments")
}

/// Запрос на разъяснение (RFI — Request for Information)
model RFI {
  id          String    @id @default(uuid())
  number      String    // RFI-2025-001
  title       String    // Краткое описание вопроса
  description String    // Полное описание
  status      RFIStatus @default(OPEN)
  priority    RFIPriority @default(MEDIUM)
  deadline    DateTime? // Срок ответа

  projectId   String
  project     Project @relation(fields: [projectId], references: [id], onDelete: Cascade)

  // Кто задал вопрос
  authorId    String
  author      User    @relation("RFIAuthor", fields: [authorId], references: [id])

  // Кто должен ответить
  assigneeId  String?
  assignee    User?   @relation("RFIAssignee", fields: [assigneeId], references: [id])

  // Привязка к документу (опционально)
  linkedDocId   String?
  linkedDocType String? // ExecutionDoc | ArchiveDocument | Contract

  response    String?   // Текст ответа
  answeredAt  DateTime? // Когда дан ответ
  answeredById String?
  answeredBy  User?     @relation("RFIAnswerer", fields: [answeredById], references: [id])

  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  attachments RFIAttachment[]

  @@index([projectId])
  @@index([assigneeId])
  @@index([status])
  @@map("rfis")
}

enum RFIStatus {
  OPEN        // Открыт
  IN_REVIEW   // На рассмотрении
  ANSWERED    // Ответ дан
  CLOSED      // Закрыт
  CANCELLED   // Отменён
}

enum RFIPriority {
  LOW
  MEDIUM
  HIGH
  URGENT
}

/// Вложение к RFI
model RFIAttachment {
  id        String   @id @default(uuid())
  rfiId     String
  rfi       RFI      @relation(fields: [rfiId], references: [id], onDelete: Cascade)
  fileName  String
  s3Key     String
  mimeType  String
  size      Int
  createdAt DateTime @default(now())

  @@index([rfiId])
  @@map("rfi_attachments")
}

/// Документ СЭД (официальный документооборот произвольного типа)
model SEDDocument {
  id          String          @id @default(uuid())
  number      String          // Авто-нумерация: СЭД-2025-001
  docType     SEDDocType      // Тип: письмо, приказ, протокол, акт, справка...
  title       String          // Заголовок
  body        String?         // Текст
  status      SEDStatus       @default(DRAFT)
  tags        String[]

  projectId   String
  project     Project @relation(fields: [projectId], references: [id], onDelete: Cascade)

  // Отправитель и получатели
  senderOrgId    String
  senderOrg      Organization  @relation("SEDSender",   fields: [senderOrgId],   references: [id])
  receiverOrgIds String[]      // Несколько получателей
  authorId       String
  author         User          @relation("SEDAuthor", fields: [authorId], references: [id])

  // Маршрут согласования (переиспользуем ApprovalRoute)
  approvalRouteId String?      @unique
  approvalRoute   ApprovalRoute? @relation("SEDApproval", fields: [approvalRouteId], references: [id])

  // Полнотекстовый поиск
  searchVector Unsupported("tsvector")?

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  attachments SEDAttachment[]

  @@index([projectId])
  @@index([status])
  @@index([docType])
  @@map("sed_documents")
}

enum SEDDocType {
  LETTER          // Письмо
  ORDER           // Приказ
  PROTOCOL        // Протокол
  ACT             // Акт
  MEMO            // Докладная записка
  NOTIFICATION    // Уведомление
  OTHER           // Иное
}

enum SEDStatus {
  DRAFT           // Черновик
  ACTIVE          // Активный
  IN_APPROVAL     // На согласовании
  REQUIRES_ACTION // Требует действия
  APPROVED        // Согласован / Подписан
  REJECTED        // Отклонён
  ARCHIVED        // Архив
}

/// Вложение к СЭД-документу
model SEDAttachment {
  id          String      @id @default(uuid())
  sedDocId    String
  sedDoc      SEDDocument @relation(fields: [sedDocId], references: [id], onDelete: Cascade)
  fileName    String
  s3Key       String
  mimeType    String
  size        Int
  createdAt   DateTime    @default(now())

  @@index([sedDocId])
  @@map("sed_attachments")
}

/// Сообщение чата по проекту / договору
model ChatMessage {
  id         String   @id @default(uuid())
  text       String

  projectId  String
  project    Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)

  contractId String?  // Опционально: привязка к договору
  contract   Contract? @relation(fields: [contractId], references: [id])

  authorId   String
  author     User     @relation("ChatAuthor", fields: [authorId], references: [id])

  // Прикреплённый объект системы (документ, дефект, материал…)
  attachmentType String? // ExecutionDoc | Defect | Material | Photo
  attachmentId   String?

  // Ответ на другое сообщение
  replyToId  String?
  replyTo    ChatMessage?  @relation("MessageReply", fields: [replyToId], references: [id])
  replies    ChatMessage[] @relation("MessageReply")

  isEdited   Boolean  @default(false)
  editedAt   DateTime?
  deletedAt  DateTime? // Soft delete

  createdAt  DateTime @default(now())

  @@index([projectId, createdAt])
  @@index([contractId, createdAt])
  @@map("chat_messages")
}
```

### 1.2. Связи в существующих моделях

```prisma
// Добавить в model Organization:
correspondencesSent     Correspondence[] @relation("CorrespondenceSender")
correspondencesReceived Correspondence[] @relation("CorrespondenceReceiver")
sedDocumentsSent        SEDDocument[]    @relation("SEDSender")

// Добавить в model User:
correspondencesAuthored Correspondence[] @relation("CorrespondenceAuthor")
rfisAuthored            RFI[]            @relation("RFIAuthor")
rfisAssigned            RFI[]            @relation("RFIAssignee")
rfisAnswered            RFI[]            @relation("RFIAnswerer")
sedDocumentsAuthored    SEDDocument[]    @relation("SEDAuthor")
chatMessages            ChatMessage[]    @relation("ChatAuthor")

// Добавить в model Project:
correspondences  Correspondence[]
rfis             RFI[]
sedDocuments     SEDDocument[]
chatMessages     ChatMessage[]

// Добавить в model Contract:
chatMessages     ChatMessage[]

// Добавить в model ApprovalRoute:
// (связи уже полиморфные — добавить поле для различения типа)
documentType     String?  // ExecutionDoc | Correspondence | SEDDocument | Ks2Act
```

### 1.3. Полнотекстовый поиск (PostgreSQL tsvector)

```sql
-- Добавить в миграцию вручную после prisma migrate dev:

-- Индекс для Correspondence
ALTER TABLE correspondences
  ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    to_tsvector('russian', coalesce(subject, '') || ' ' || coalesce(body, '') || ' ' || number)
  ) STORED;
CREATE INDEX idx_correspondence_search ON correspondences USING GIN(search_vector);

-- Индекс для SEDDocument
ALTER TABLE sed_documents
  ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    to_tsvector('russian', coalesce(title, '') || ' ' || coalesce(body, '') || ' ' || number)
  ) STORED;
CREATE INDEX idx_sed_search ON sed_documents USING GIN(search_vector);
```

### 1.4. Команда для Claude Code

```
Прочитай CLAUDE.md. Добавь в prisma/schema.prisma новые модели:
Correspondence (с CorrespondenceAttachment и enum-ами),
RFI (с RFIAttachment и enum-ами),
SEDDocument (с SEDAttachment и enum-ами),
ChatMessage.

Добавь связи в существующие модели Organization, User, Project, Contract.

Затем:
1. npx prisma migrate dev --name add_module3_info_sed
2. Добавь вручную в созданную миграцию SQL для tsvector-индексов
   (на таблицах correspondences и sed_documents)
3. npx prisma generate
```

---

## Шаг 2 — Страницы и layout вкладок (День 3)

### 2.1. Файловая структура

```
src/app/(dashboard)/objects/[objectId]/
  info/
    layout.tsx          ← Вкладки: Участники / Переписка / Вопросы / Чат
    participants/
      page.tsx
    correspondence/
      page.tsx
      [id]/
        page.tsx        ← Карточка письма
    rfi/
      page.tsx
      [id]/
        page.tsx        ← Карточка RFI
    chat/
      page.tsx
  sed/
    layout.tsx          ← Отдельный модуль СЭД (как в ЦУС)
    page.tsx            ← Список документов СЭД
    [id]/
      page.tsx          ← Карточка СЭД-документа
```

### 2.2. `info/layout.tsx` — горизонтальные вкладки

```tsx
// src/app/(dashboard)/objects/[objectId]/info/layout.tsx
'use client';

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePathname, useRouter } from 'next/navigation';

const INFO_TABS = [
  { label: 'Участники',      href: 'participants' },
  { label: 'Переписка',      href: 'correspondence' },
  { label: 'Вопросы (RFI)',  href: 'rfi' },
  { label: 'Чат',            href: 'chat' },
];

export default function InfoLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { objectId: string };
}) {
  const pathname = usePathname();
  const router = useRouter();
  const activeTab = INFO_TABS.find(t => pathname.includes(t.href))?.href ?? 'participants';

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={(val) =>
        router.push(`/objects/${params.objectId}/info/${val}`)
      }>
        <TabsList>
          {INFO_TABS.map(t => (
            <TabsTrigger key={t.href} value={t.href}>{t.label}</TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      {children}
    </div>
  );
}
```

### 2.3. Добавить «Информация» и «СЭД» в ObjectModuleSidebar

```tsx
// Дополнить MODULES в ObjectModuleSidebar.tsx:
{ label: 'Информация', href: 'info/participants', icon: Info },
{ label: 'СЭД',        href: 'sed',               icon: Mail },
```

### 2.4. Команда для Claude Code

```
Создай файловую структуру для Модуля 3:
- src/app/(dashboard)/objects/[objectId]/info/layout.tsx (горизонтальные Tabs)
- src/app/(dashboard)/objects/[objectId]/info/participants/page.tsx
- src/app/(dashboard)/objects/[objectId]/info/correspondence/page.tsx
- src/app/(dashboard)/objects/[objectId]/info/correspondence/[id]/page.tsx
- src/app/(dashboard)/objects/[objectId]/info/rfi/page.tsx
- src/app/(dashboard)/objects/[objectId]/info/rfi/[id]/page.tsx
- src/app/(dashboard)/objects/[objectId]/info/chat/page.tsx
- src/app/(dashboard)/objects/[objectId]/sed/page.tsx
- src/app/(dashboard)/objects/[objectId]/sed/[id]/page.tsx

В ObjectModuleSidebar.tsx добавь пункты "Информация" (href: info/participants)
и "СЭД" (href: sed) перед пунктами с меткой "скоро".
```

---

## Шаг 3 — API роуты (День 4–5)

### 3.1. Correspondence API

```
GET    /api/projects/[id]/correspondence          — список (фильтры: direction, status, search)
POST   /api/projects/[id]/correspondence          — создать
GET    /api/projects/[id]/correspondence/[cid]    — карточка письма
PATCH  /api/projects/[id]/correspondence/[cid]    — обновить (статус, тело)
DELETE /api/projects/[id]/correspondence/[cid]    — удалить (только черновик)
POST   /api/projects/[id]/correspondence/[cid]/send       — отправить (DRAFT → SENT)
POST   /api/projects/[id]/correspondence/[cid]/archive    — в архив
POST   /api/projects/[id]/correspondence/[cid]/attachments — загрузить вложение
```

**Ключевая логика — авто-нумерация:**
```typescript
// lib/numbering.ts
export async function getNextCorrespondenceNumber(
  projectId: string,
  direction: 'OUTGOING' | 'INCOMING'
): Promise<string> {
  const prefix = direction === 'OUTGOING' ? 'ИСХ' : 'ВХ';
  const year = new Date().getFullYear();

  const count = await db.correspondence.count({
    where: { projectId, direction },
  });

  return `${prefix}-${year}-${String(count + 1).padStart(3, '0')}`;
  // Результат: ИСХ-2025-001
}
```

**Полнотекстовый поиск:**
```typescript
// В GET /api/projects/[id]/correspondence
const search = searchParams.get('search');
const where = {
  projectId,
  ...(search && {
    searchVector: {
      search: search.split(' ').join(' & '), // PostgreSQL tsquery
    },
  }),
};
// Через raw query если Prisma не поддерживает tsvector:
const results = await db.$queryRaw`
  SELECT * FROM correspondences
  WHERE project_id = ${projectId}
    AND search_vector @@ plainto_tsquery('russian', ${search})
  ORDER BY created_at DESC
  LIMIT 50
`;
```

### 3.2. RFI API

```
GET    /api/projects/[id]/rfi           — список (фильтры: status, assignee, priority)
POST   /api/projects/[id]/rfi           — создать
GET    /api/projects/[id]/rfi/[rfiId]   — карточка RFI
PATCH  /api/projects/[id]/rfi/[rfiId]   — обновить (статус, назначить)
POST   /api/projects/[id]/rfi/[rfiId]/answer   — дать ответ
POST   /api/projects/[id]/rfi/[rfiId]/close    — закрыть
POST   /api/projects/[id]/rfi/[rfiId]/attachments — загрузить вложение
```

**Схема валидации:**
```typescript
// lib/validations/rfi.ts
export const createRFISchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().min(10),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
  deadline: z.string().datetime().optional(),
  assigneeId: z.string().uuid().optional(),
  linkedDocId: z.string().uuid().optional(),
  linkedDocType: z.enum(['ExecutionDoc', 'ArchiveDocument', 'Contract']).optional(),
});

export const answerRFISchema = z.object({
  response: z.string().min(5),
});
```

### 3.3. СЭД API

```
GET    /api/projects/[id]/sed           — список (фильтры: status, docType, view)
POST   /api/projects/[id]/sed           — создать документ
GET    /api/projects/[id]/sed/[docId]   — карточка
PATCH  /api/projects/[id]/sed/[docId]   — обновить
POST   /api/projects/[id]/sed/[docId]/workflow  — создать документооборот (тип)
POST   /api/projects/[id]/sed/[docId]/attachments
```

**Фильтры вида (как в ЦУС):**
```typescript
// Представления списка СЭД:
// all       — все доступные пользователю
// active    — не отклонённые
// requires  — требуют действия от текущего пользователя
// my        — где я участник
// sent      — отправлены мной
type SEDView = 'all' | 'active' | 'requires' | 'my' | 'sent';

async function getSEDDocuments(projectId: string, userId: string, view: SEDView) {
  const baseWhere = { projectId };

  switch (view) {
    case 'requires':
      return db.sEDDocument.findMany({
        where: {
          ...baseWhere,
          status: 'REQUIRES_ACTION',
          approvalRoute: {
            steps: {
              some: { userId, status: 'PENDING' }
            }
          }
        }
      });
    case 'my':
      return db.sEDDocument.findMany({
        where: { ...baseWhere, authorId: userId }
      });
    // ... остальные варианты
  }
}
```

### 3.4. Чат API (REST для истории + Socket.io для real-time)

```
GET  /api/projects/[id]/chat           — история (последние 50, пагинация cursor-based)
POST /api/projects/[id]/chat           — fallback если сокет недоступен
DELETE /api/projects/[id]/chat/[msgId] — удалить своё сообщение (soft delete)
```

### 3.5. Команда для Claude Code

```
Создай API роуты для Модуля 3:

1. src/app/api/projects/[projectId]/correspondence/route.ts
   — GET (фильтры direction, status, search) и POST (с авто-нумерацией)
   — Авто-нумерация: ИСХ-{год}-{порядковый} / ВХ-{год}-{порядковый}

2. src/app/api/projects/[projectId]/correspondence/[corrId]/route.ts
   — GET, PATCH, DELETE

3. src/app/api/projects/[projectId]/correspondence/[corrId]/send/route.ts
   — POST: статус DRAFT → SENT, уведомление получателю

4. src/app/api/projects/[projectId]/rfi/route.ts — GET, POST
5. src/app/api/projects/[projectId]/rfi/[rfiId]/route.ts — GET, PATCH
6. src/app/api/projects/[projectId]/rfi/[rfiId]/answer/route.ts — POST

7. src/app/api/projects/[projectId]/sed/route.ts — GET (с view-фильтром), POST
8. src/app/api/projects/[projectId]/sed/[docId]/route.ts — GET, PATCH
9. src/app/api/projects/[projectId]/sed/[docId]/workflow/route.ts — POST

10. src/app/api/projects/[projectId]/chat/route.ts — GET (пагинация), POST

В каждом роуте:
- getSessionOrThrow() + проверка organizationId
- successResponse / errorResponse из @/utils/api
- Zod-валидация входящих данных
- При POST correspondence/send — создавать Notification для получателя
```

---

## Шаг 4 — Вкладка «Участники» (День 6)

### 4.1. Что делает эта вкладка

Показывает все организации-участники через все договоры проекта. Сейчас `ContractParticipant` привязан к договору, а нам нужен сводный вид по объекту.

```typescript
// Агрегация участников по проекту:
const participants = await db.contractParticipant.findMany({
  where: {
    contract: { projectId },
  },
  include: {
    organization: true,
    contract: { select: { id: true, number: true, name: true } },
  },
  distinct: ['organizationId'], // Уникальные организации
});
```

### 4.2. Компонент

```tsx
// src/components/objects/info/ParticipantsView.tsx

// Верстка: карточки организаций в сетке (3 колонки)
// Каждая карточка:
// ┌─────────────────────────────────────────┐
// │ [иконка] ООО "СтройПроект"              │
// │ ИНН: 7712345678                         │
// │ Роль: Генеральный подрядчик             │
// │ СРО: СРО-С-111-12345678 ✓              │
// │ Договоры: ДГП-2024-001, СД-2024-001-01 │
// │                          [Подробнее →]  │
// └─────────────────────────────────────────┘

// Роли отображать как Badge разного цвета:
// DEVELOPER    → синий   "Застройщик"
// CONTRACTOR   → зелёный "Подрядчик"
// SUPERVISION  → жёлтый  "Стройконтроль"
// SUBCONTRACTOR → серый  "Субподрядчик"
```

### 4.3. Команда для Claude Code

```
Создай src/components/objects/info/ParticipantsView.tsx.

Данные: GET /api/projects/${projectId}/participants (создай этот роут —
агрегация ContractParticipant по всем договорам проекта, distinct по organizationId).

Верстка: CSS grid 3 колонки. Каждый участник — Card с:
- Название организации (жирным)
- ИНН
- Badge роли (цвет по роли: DEVELOPER=blue, CONTRACTOR=green, SUPERVISION=yellow, SUBCONTRACTOR=gray)
- Список договоров (маленькими Badge)
- Если есть sroNumber — показать "СРО ✓"

Кнопка "+ Добавить участника" → открывает Dialog с поиском организации по ИНН
(переиспользуй существующий компонент добавления участника договора).
```

---

## Шаг 5 — Вкладка «Деловая переписка» (День 7–9)

### 5.1. Список писем

```tsx
// src/components/objects/info/CorrespondenceView.tsx

// Верхняя панель:
// [Все ▾] [Исходящие] [Входящие] [На согласовании]   [Поиск...]  [+ Создать письмо]

// Таблица (TanStack Table):
// | № письма        | Направление  | Кому / От кого       | Тема              | Дата       | Статус     |
// | ИСХ-2025-001    | → Исходящее  | ООО "Заказчик"       | О переносе сроков | 15.03.2025 | [Отправлено] |
// | ВХ-2025-003     | ← Входящее   | ООО "Технадзор"      | Предписание №5    | 14.03.2025 | [Прочитано]  |

// Статусы Badge:
// DRAFT        → серый   "Черновик"
// SENT         → синий   "Отправлено"
// READ         → зелёный "Прочитано"
// IN_APPROVAL  → жёлтый  "На согласовании"
// APPROVED     → зелёный "Согласовано"
// REJECTED     → красный "Отклонено"
```

### 5.2. Форма создания письма

```tsx
// CreateCorrespondenceDialog.tsx — Dialog с двумя шагами
// Шаг 1 — Реквизиты:
// - Направление: Radio "Исходящее / Входящее"
// - Организация-получатель (или отправитель для входящих): Combobox из участников проекта
// - Тема: Input
// - Дата: DatePicker (для входящих — дата получения)
// - Теги: Input с добавлением тегов

// Шаг 2 — Содержание:
// - Текст письма: Textarea (или минимальный TipTap редактор)
// - Вложения: DropZone для файлов (загрузка в S3)
// Кнопки: "Сохранить как черновик" / "Отправить"
```

### 5.3. Карточка письма

```tsx
// src/app/(dashboard)/objects/[objectId]/info/correspondence/[id]/page.tsx

// Двухколоночный layout:
// Левая колонка (2/3):
//   - Шапка: номер, тема, дата
//   - Метаданные: от кого, кому, теги
//   - Текст письма
//   - Вложения (список с иконками и кнопкой скачать)
//   - Кнопки: [Отправить] [В архив] [Удалить]

// Правая колонка (1/3):
//   - Статус и история изменений
//   - Маршрут согласования (если есть)
//   - Кнопка "Создать документооборот" (запускает ApprovalRoute)
```

### 5.4. Команда для Claude Code

```
Создай компоненты для «Деловой переписки»:

1. src/components/objects/info/CorrespondenceView.tsx
   — TanStack Table с колонками: номер, направление (иконка ←/→), получатель/отправитель,
     тема, дата, статус (Badge).
   — Фильтры сверху: All / Исходящие / Входящие / На согласовании
   — Поиск (debounce 300ms → query param search → API с tsvector)
   — Клик по строке → переход на /info/correspondence/[id]

2. src/components/objects/info/CreateCorrespondenceDialog.tsx
   — Двухшаговый Dialog (shadcn):
     Шаг 1: направление, получатель/отправитель (из участников проекта), тема, дата
     Шаг 2: текст (Textarea), вложения (input type=file → upload → S3)
   — Кнопки "Черновик" (POST со status=DRAFT) и "Отправить" (POST + send)

3. src/app/(dashboard)/objects/[objectId]/info/correspondence/[id]/page.tsx
   — Карточка письма: реквизиты слева, статус+согласование справа
   — Кнопка "Отправить" → POST /correspondence/[id]/send
   — Список вложений с pre-signed URL для скачивания
```

---

## Шаг 6 — Вкладка «Вопросы» (RFI) (День 10–11)

### 6.1. Список RFI

```tsx
// src/components/objects/info/RFIView.tsx

// Верхняя строка: фильтры-таблетки + кнопка "+ Создать запрос"
// [Все] [Открытые] [На рассмотрении] [Отвечено] [Просроченные]

// Карточки (не таблица):
// ┌─────────────────────────────────────────────────────────────────┐
// │ RFI-2025-001                                    🔴 СРОЧНО       │
// │ Уточнение армирования стены оси 5-6             Срок: 18.03.2025│
// │ Автор: Иванов И.И. → Исполнитель: Петров П.П.                  │
// │ Статус: [На рассмотрении]    Привязан к: АОСР-47               │
// └─────────────────────────────────────────────────────────────────┘
```

### 6.2. Карточка RFI (детальный вид)

```tsx
// Полная карточка RFI (отдельная страница или Sheet):
// - Номер, заголовок, приоритет
// - Описание (полный текст)
// - Автор, исполнитель, срок
// - Привязанный документ (ссылка)
// - Вложения
// - Блок "Ответ" (если ANSWERED — показать ответ; если OPEN — форма для ввода ответа)
// - История изменений статусов (Timeline)
```

### 6.3. Команда для Claude Code

```
Создай компоненты для «Вопросов» (RFI):

1. src/components/objects/info/RFIView.tsx
   — Карточки RFI (не таблица) с фильтрами по статусу
   — Приоритет: цветная точка (красная=URGENT, оранжевая=HIGH, синяя=MEDIUM, серая=LOW)
   — Срок: DateBadge (красный если просрочен, т.е. deadline < now() && status !== CLOSED)
   — Кнопка "+ Создать запрос"

2. src/components/objects/info/CreateRFIDialog.tsx
   — Поля: заголовок, описание (Textarea), приоритет (Select), срок (DatePicker),
     исполнитель (Combobox пользователей организации),
     привязанный документ (необязательно — Select тип + поиск)
   — POST /api/projects/${projectId}/rfi

3. src/app/(dashboard)/objects/[objectId]/info/rfi/[id]/page.tsx
   — Детальная карточка: вся информация + блок ответа
   — Если текущий пользователь — assignee и статус OPEN:
     показать форму "Дать ответ" (Textarea + кнопка "Ответить")
     POST /api/projects/${projectId}/rfi/${id}/answer
   — Timeline статусов внизу
```

---

## Шаг 7 — Модуль «СЭД» (День 12–14)

### 7.1. Список документов СЭД (главная страница модуля)

```tsx
// src/components/objects/sed/SEDView.tsx

// Двухколоночный layout (как в ЦУС):
// Левая панель (240px) — папки / разделы:
//   Все документы
//   Входящие
//   Исходящие
//   Требуют действия   [3]  ← счётчик
//   Я участник
//   Архив

// Правая часть — таблица документов
// Вверху: [Активные ▾] [Все] [Требует действия] [Отправлены мной]  [+ Создать документ]

// Таблица:
// | Номер        | Тип        | Заголовок                  | Дата       | Статус         |
// | СЭД-2025-001 | Письмо     | О переносе сроков          | 15.03.2025 | [Согласовано]  |
// | СЭД-2025-002 | Протокол   | Совещание о качестве работ | 14.03.2025 | [Требует дейст.]|
```

### 7.2. Создание СЭД-документа

```tsx
// CreateSEDDialog.tsx — три шага:
// Шаг 1 "Реквизиты":
//   - Тип документа: Select (Письмо, Приказ, Протокол, Акт, Докладная, Уведомление)
//   - Заголовок: Input
//   - Организация-получатель: MultiSelect (несколько получателей)
//   - Теги: TagInput
// Шаг 2 "Содержание":
//   - Текст: TipTap (WYSIWYG, уже есть в проекте ✅)
//   - Вложения: DropZone
// Шаг 3 "Документооборот" (необязательно на старте):
//   - Тип ДО: Select (Согласование, Подписание, Ознакомление, Делегирование)
//   - Участники: MultiSelect пользователей
```

### 7.3. Карточка СЭД-документа

```tsx
// src/app/(dashboard)/objects/[objectId]/sed/[docId]/page.tsx

// Верхний блок: номер, тип, заголовок, статус, дата
// Средний блок (2 колонки):
//   Левая: текст документа + вложения
//   Правая: маршрут документооборота (дерево ApprovalRoute)

// Маршрут документооборота — переиспользовать ApprovalTimeline ✅:
// [Иванов И.И. — Автор]
//    ↓
// [Петров П.П. — Согласующий]  ← ожидание
//    ↓
// [Сидоров А.А. — Подписант]   ← заблокирован

// Кнопки действий в зависимости от роли пользователя в текущем шаге:
// Если мой шаг — [✓ Согласовать] [✗ Отклонить]
// Если не мой  — статус только читается
```

### 7.4. Команда для Claude Code

```
Создай компоненты для модуля СЭД:

1. src/components/objects/sed/SEDView.tsx
   — Двухколоночный layout: левая панель с «папками», правая — таблица
   — Левая панель: список разделов (Все, Требуют действия со счётчиком, и др.)
   — Правая: TanStack Table с фильтром вида (active/requires/my/sent)
   — GET /api/projects/${projectId}/sed?view=requires

2. src/components/objects/sed/CreateSEDDialog.tsx
   — Трёхшаговый Dialog:
     Шаг 1: тип (Select с SEDDocType), заголовок, получатели (MultiCombobox)
     Шаг 2: текст (TipTap editor — уже есть в проекте)
     Шаг 3 (опционально): тип документооборота + участники
   — POST /api/projects/${projectId}/sed

3. src/app/(dashboard)/objects/[objectId]/sed/[docId]/page.tsx
   — Полная карточка: метаданные + текст + вложения
   — Переиспользуй ApprovalTimeline из существующих компонентов ИД
   — Если текущий пользователь — активный шаг согласования:
     показать кнопки [Согласовать] и [Отклонить с комментарием]
     PATCH /api/projects/${projectId}/sed/${docId} через ApprovalRoute
```

---

## Шаг 8 — Вкладка «Чат» (День 15–17)

### 8.1. Архитектура чата

Чат состоит из двух частей:
- **REST API** — история сообщений (при загрузке страницы)
- **Socket.io сервер** — real-time (новые сообщения без перезагрузки)

```
src/
  server/
    socket.ts           ← Socket.io сервер (отдельный процесс, порт 3001)
  lib/
    socket-client.ts    ← Клиентский хук useSocket()
  components/objects/info/
    ChatView.tsx        ← UI чата
    ChatMessage.tsx     ← Одно сообщение
    ChatInput.tsx       ← Поле ввода
```

### 8.2. Socket.io сервер

```typescript
// src/server/socket.ts
import { createServer } from 'http';
import { Server } from 'socket.io';
import { db } from '@/lib/db';
import { getToken } from 'next-auth/jwt';

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: { origin: process.env.APP_URL, credentials: true },
});

// Аутентификация через JWT
io.use(async (socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error('Unauthorized'));
  // Верифицировать JWT через next-auth
  next();
});

io.on('connection', (socket) => {
  // Присоединиться к комнате проекта
  socket.on('join:project', (projectId: string) => {
    socket.join(`project:${projectId}`);
  });

  // Новое сообщение
  socket.on('message:send', async (data) => {
    const { projectId, contractId, text, replyToId, attachmentType, attachmentId } = data;

    // Сохранить в БД
    const message = await db.chatMessage.create({
      data: {
        text,
        projectId,
        contractId,
        authorId: socket.data.userId,
        replyToId,
        attachmentType,
        attachmentId,
      },
      include: {
        author: { select: { id: true, firstName: true, lastName: true } },
        replyTo: { select: { id: true, text: true, author: { select: { firstName: true } } } },
      },
    });

    // Разослать всем в комнате
    io.to(`project:${projectId}`).emit('message:new', message);
  });

  // Печатает...
  socket.on('typing:start', ({ projectId }) => {
    socket.to(`project:${projectId}`).emit('typing:user', socket.data.userId);
  });

  socket.on('disconnect', () => {
    console.log('disconnect', socket.id);
  });
});

httpServer.listen(3001, () => console.log('Socket.io running on port 3001'));
```

### 8.3. Клиентский хук

```typescript
// src/lib/socket-client.ts
import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useSession } from 'next-auth/react';

let socket: Socket | null = null;

export function useSocket(projectId: string) {
  const { data: session } = useSession();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!session?.user) return;

    // Создаём соединение один раз
    if (!socket) {
      socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001', {
        auth: { token: session.accessToken },
        transports: ['websocket'],
      });
    }

    socketRef.current = socket;
    socket.emit('join:project', projectId);

    return () => {
      socket?.emit('leave:project', projectId);
    };
  }, [projectId, session]);

  return socketRef.current;
}
```

### 8.4. UI чата

```tsx
// src/components/objects/info/ChatView.tsx
'use client';

// Верстка (как Telegram/Slack):
// ┌────────────────────────────────────────────────────────────┐
// │ Чат проекта ЖК "Солнечный"                                 │
// │                                                            │
// │  [Иванов И.И., 10:32]                                     │
// │  Загрузил АОСР по 3 этажу ↗ АОСР-47.pdf                 │
// │                                                            │
// │                        [Петров П.П., 10:45]               │
// │                    Принял, жду подписи Сидорова →         │
// │                                                            │
// │  [Иванов И.И., 11:02]                                     │
// │  Коллеги, завтра освидетельствование в 10:00              │
// │  Петров П.П. печатает...                                   │
// ├────────────────────────────────────────────────────────────┤
// │ [📎 Прикрепить]  Написать сообщение...            [Отправить]│
// └────────────────────────────────────────────────────────────┘

// Особенности:
// - Свои сообщения справа (синие), чужие слева (серые)
// - Автопрокрутка вниз при новых сообщениях
// - Показывать дату-разделитель при смене дня
// - При недоступности Socket.io — показать "Обновить" кнопку (не ошибку)
// - Прикрепление документа из системы: кнопка → поиск по типу → ссылка в сообщении
```

### 8.5. Команда для Claude Code

```
Реализуй чат по проекту.

Шаг 1 — Socket.io сервер:
Создай src/server/socket.ts — отдельный Node.js процесс на порту 3001.
Аутентификация через JWT из handshake.auth.token (верифицировать через jsonwebtoken).
События: join:project, message:send (сохранить в БД + broadcast), typing:start.
Добавь запуск в package.json: "socket": "ts-node src/server/socket.ts"

Шаг 2 — Клиентский хук:
Создай src/lib/socket-client.ts с хуком useSocket(projectId).
Синглтон-соединение (не пересоздавать при ремаунте).
При ошибке соединения — устанавливать isOffline=true (не бросать в UI).

Шаг 3 — UI:
Создай src/components/objects/info/ChatView.tsx.
Загрузка истории: GET /api/projects/${projectId}/chat?limit=50
Real-time: подписка на message:new через useSocket.
Верстка: мессенджер-стиль. Свои сообщения справа (primary), чужие слева (muted).
Аватар (инициалы) + имя + время (format: 'HH:mm').
Поле ввода с кнопкой отправки (Enter или кнопка).
Кнопка 📎 → открывает Popover с поиском документов проекта для прикрепления.
При isOffline=true — показать Alert "Соединение недоступно. Нажмите 'Обновить'."
```

---

## Шаг 9 — Полнотекстовый поиск по всему модулю (День 18)

### 9.1. Глобальный поиск по СЭД и переписке

```tsx
// Поле поиска (вверху таблицы) → debounce 300ms → query param → API
// API использует PostgreSQL tsvector для поиска по subject, body, title, number

// Поисковый роут (дополнительно):
// GET /api/projects/[id]/search?q=предписание&types=correspondence,sed
// Возвращает смешанные результаты с пометкой типа
```

### 9.2. Команда для Claude Code

```
Создай src/app/api/projects/[projectId]/search/route.ts.

GET с параметром q (строка поиска) и types (correspondence,sed,rfi).
Использует PostgreSQL raw query с plainto_tsquery('russian', ${q}).
Ищет в таблицах correspondences, sed_documents, rfis.
Возвращает массив: { type, id, title/subject, excerpt, createdAt }.
Excerpt — первые 150 символов body с подсветкой найденного слова.

Добавь поле глобального поиска в CorrespondenceView и SEDView,
которое отправляет запрос на этот эндпоинт и показывает результаты в Dropdown.
```

---

## Шаг 10 — Полировка и TypeScript-проверка (День 19–21)

### 10.0. Выполнено (2026-04-10)

```
✅ loading.tsx и error.tsx — добавлены для /sed и /sed/[docId]
✅ Видимость GET-запросов — project-level filtering (organizationId) корректен для корпоративного СЭД
✅ Уведомления при создании ДО — notifyApprovalEvent реализован в workflows/route.ts (строки 161–173)
✅ WorkflowRegulationsView + CreateRegulationDialog — UI регламентов в /organizations → «Регламенты ДО»
✅ approval-sheet.hbs расширен: 8 колонок (ФИО, Должность, Организация, Действие, Дата, Результат, Комментарий) + блок подписи автора
✅ Print API route обновлён: передаёт position/organization/action для каждого шага
```

### 10.1. Чеклист перед завершением

```bash
# Вставь в Claude Code:
npx tsc --noEmit
```

```
Проверь:
□ /objects/[id]/info/participants — карточки организаций загружаются
□ /objects/[id]/info/correspondence — список писем, создание, карточка письма
□ /objects/[id]/info/correspondence/[id] — отправка, вложения
□ /objects/[id]/info/rfi — список, создание, ответ
□ /objects/[id]/sed — список с фильтрами вида, создание
□ /objects/[id]/sed/[id] — карточка с маршрутом согласования
□ /objects/[id]/info/chat — история грузится, новые сообщения в реальном времени
□ Socket.io сервер запускается на порту 3001 (npm run socket)
□ Авто-нумерация писем: ИСХ-2025-001 / ВХ-2025-001 / СЭД-2025-001
□ Полнотекстовый поиск работает (tsvector индекс создан)
□ Все API роуты проверяют organizationId (нет утечки данных)
□ Уведомление при отправке письма (Notification создаётся)
□ TypeScript: нет ошибок (npx tsc --noEmit)
```

### 10.2. Финальная команда для Claude Code

```
Прочитай CLAUDE.md. Проверь весь Модуль 3:
1. npx tsc --noEmit — исправь все TypeScript-ошибки
2. Для каждого API роута убедись что есть проверка:
   project.organizationId === session.user.organizationId
3. Добавь loading.tsx в каждую страницу (skeleton)
4. Добавь error.tsx в каждую страницу (fallback)
5. Проверь что авто-нумерация не создаёт дубликаты
   (использовать транзакцию или sequence в PostgreSQL)
6. В ChatView — убедись что при ошибке Socket.io
   не бросается в консоль, а показывается graceful fallback
```

---

## Итоговая структура файлов

```
src/
├── app/(dashboard)/objects/[objectId]/
│   ├── info/
│   │   ├── layout.tsx                    ← Tabs: Участники/Переписка/Вопросы/Чат
│   │   ├── participants/page.tsx
│   │   ├── correspondence/
│   │   │   ├── page.tsx
│   │   │   └── [id]/page.tsx
│   │   ├── rfi/
│   │   │   ├── page.tsx
│   │   │   └── [id]/page.tsx
│   │   └── chat/page.tsx
│   └── sed/
│       ├── page.tsx
│       └── [id]/page.tsx
│
├── app/api/projects/[projectId]/
│   ├── participants/route.ts             ← агрегация по проекту
│   ├── correspondence/
│   │   ├── route.ts                      ← GET, POST
│   │   └── [corrId]/
│   │       ├── route.ts                  ← GET, PATCH, DELETE
│   │       ├── send/route.ts
│   │       └── attachments/route.ts
│   ├── rfi/
│   │   ├── route.ts
│   │   └── [rfiId]/
│   │       ├── route.ts
│   │       ├── answer/route.ts
│   │       └── attachments/route.ts
│   ├── sed/
│   │   ├── route.ts
│   │   └── [docId]/
│   │       ├── route.ts
│   │       └── workflow/route.ts
│   ├── chat/route.ts
│   └── search/route.ts                   ← полнотекстовый поиск
│
├── components/objects/info/
│   ├── ParticipantsView.tsx
│   ├── CorrespondenceView.tsx
│   ├── CreateCorrespondenceDialog.tsx
│   ├── CorrespondenceCard.tsx
│   ├── RFIView.tsx
│   ├── CreateRFIDialog.tsx
│   ├── RFICard.tsx
│   ├── ChatView.tsx
│   ├── ChatMessage.tsx
│   └── ChatInput.tsx
│
├── components/objects/sed/
│   ├── SEDView.tsx                       ✅ реализован
│   ├── SEDSidebar.tsx                    ✅ реализован (папки / разделы)
│   ├── CreateSEDDialog.tsx               ✅ реализован
│   ├── SEDDocumentCard.tsx               ✅ реализован
│   ├── WorkflowRegulationsView.tsx       ✅ реализован (таблица регламентов, /organizations → «Регламенты ДО»)
│   └── CreateRegulationDialog.tsx        ✅ реализован (DnD-конструктор шагов @dnd-kit)
│
├── server/
│   └── socket.ts                         ← Socket.io сервер (порт 3001)
│
└── lib/
    ├── socket-client.ts                  ← useSocket() хук
    ├── numbering.ts                      ← авто-нумерация документов
    └── validations/
        ├── correspondence.ts
        ├── rfi.ts
        └── sed.ts
```

---

## Порядок задач в Claude Code (21 день)

```
День 1–2:  "Добавь модели в schema.prisma и выполни миграцию (Шаг 1)"
День 3:    "Создай файловую структуру и layout модуля (Шаг 2)"
День 4–5:  "Создай все API роуты модуля (Шаг 3)"
День 6:    "Создай вкладку Участники (Шаг 4)"
День 7–9:  "Создай Деловую переписку — список, форму, карточку (Шаг 5)"
День 10–11:"Создай вкладку Вопросы (RFI) (Шаг 6)"
День 12–14:"Создай модуль СЭД — список, форму, карточку (Шаг 7)"
День 15–17:"Создай чат с Socket.io (Шаг 8)"
День 18:   "Добавь полнотекстовый поиск (Шаг 9)"
День 19–21:"TypeScript-проверка, loading/error, полировка (Шаг 10)"
```

> **Совет:** каждую задачу начинай с `Прочитай CLAUDE.md и ROADMAP.md` — это даёт Claude Code полный контекст стека, правил безопасности и архитектурных решений проекта.
