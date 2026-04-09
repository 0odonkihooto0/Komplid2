# Модуль 4 — Управление проектом: подробный план реализации

> Аналог: ЦУС → Модуль «Управление проектом»  
> Вкладки: **Контракты · Документы · Мероприятия · Аналитика**  
> Текущее состояние: Контракты ✅ (есть), Документы 🔄 (есть ArchiveDocument на уровне договора, нужен на уровне проекта), Мероприятия ❌, Аналитика ❌  
> Что переиспользуем: `Contract` ✅, `ArchiveDocument` ✅ (перенести логику), `Ks2Act` ✅, `ApprovalRoute` ✅  
> Ориентир: **2 недели**

---

## Ключевое отличие от текущего состояния

В StroyDocs сейчас `ArchiveDocument` привязан к **договору** (`contractId`). В ЦУС файловое хранилище — на уровне **объекта/проекта**, с произвольной папочной структурой и версионированием. Это главное что нужно добавить.

Вкладка «Контракты» уже есть — её нужно **расширить** платёжной историей и категориями. Вкладки «Мероприятия» и «Аналитика» — создать с нуля.

---

## Что уже есть (переиспользуем)

```
Contract         → вкладка «Контракты» (список, создание, иерархия)  ✅
ContractParticipant → участники договора                               ✅
Ks2Act           → суммы КС-2 для аналитики                           ✅
ArchiveDocument  → файлы (но contractId → переедет в ProjectDocument)  ✅
ApprovalRoute    → маршрут согласования контракта                      ✅
```

---

## Шаг 1 — Prisma-схема (День 1–2)

### 1.1. Новые модели

```prisma
// prisma/schema.prisma

// ─────────────────────────────────────────────
// ФАЙЛОВОЕ ХРАНИЛИЩЕ ПРОЕКТА (папочная структура)
// ─────────────────────────────────────────────

/// Папка в файловом хранилище проекта
model ProjectFolder {
  id        String   @id @default(uuid())
  name      String                        // Название папки
  order     Int      @default(0)          // Порядок в списке
  pinTop    Boolean  @default(false)      // Закрепить вверху

  projectId String
  project   Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)

  parentId  String?                       // Для вложенных папок
  parent    ProjectFolder?  @relation("FolderTree", fields: [parentId], references: [id])
  children  ProjectFolder[] @relation("FolderTree")

  documents ProjectDocument[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([projectId])
  @@index([parentId])
  @@map("project_folders")
}

/// Документ в файловом хранилище проекта
model ProjectDocument {
  id          String              @id @default(uuid())
  name        String                          // Название документа
  description String?                         // Примечание
  version     Int                @default(1)  // Текущая версия
  isActual    Boolean            @default(true)

  // Файл
  s3Key       String                          // Ключ актуального файла в S3
  fileName    String                          // Оригинальное имя файла
  mimeType    String
  fileSize    Int

  // QR-код (встраивается в PDF для проверки версии на площадке)
  qrCodeS3Key String?                         // QR-код как PNG в S3
  qrToken     String?  @unique               // Уникальный токен для публичной ссылки

  // Привязка
  folderId    String
  folder      ProjectFolder @relation(fields: [folderId], references: [id])

  uploadedById String
  uploadedBy   User   @relation("ProjectDocUploader", fields: [uploadedById], references: [id])

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  versions    ProjectDocumentVersion[]

  @@index([folderId])
  @@index([qrToken])
  @@map("project_documents")
}

/// История версий документа
model ProjectDocumentVersion {
  id         String          @id @default(uuid())
  version    Int                                // Номер версии
  s3Key      String                             // Файл этой версии
  fileName   String
  fileSize   Int
  comment    String?                            // Комментарий к версии
  uploadedById String
  uploadedBy   User @relation("DocVersionUploader", fields: [uploadedById], references: [id])

  documentId String
  document   ProjectDocument @relation(fields: [documentId], references: [id], onDelete: Cascade)

  createdAt  DateTime @default(now())

  @@index([documentId])
  @@map("project_document_versions")
}

// ─────────────────────────────────────────────
// МЕРОПРИЯТИЯ
// ─────────────────────────────────────────────

/// Мероприятие / событие по проекту
model ProjectEvent {
  id           String          @id @default(uuid())
  title        String                              // Название мероприятия
  description  String?                             // Описание / повестка
  eventType    ProjectEventType                    // Тип мероприятия
  status       ProjectEventStatus @default(PLANNED)
  scheduledAt  DateTime                            // Дата и время проведения
  location     String?                             // Место проведения
  notifyDays   Int            @default(3)          // Уведомить за N дней

  projectId    String
  project      Project @relation(fields: [projectId], references: [id], onDelete: Cascade)

  contractId   String?                             // Привязка к договору (опционально)
  contract     Contract? @relation(fields: [contractId], references: [id])

  organizerId  String
  organizer    User    @relation("EventOrganizer", fields: [organizerId], references: [id])

  // Участники мероприятия (JSON — список userId)
  participantIds String[]

  // Протокол (если есть)
  protocolS3Key  String?
  protocolFileN  String?

  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@index([projectId])
  @@index([scheduledAt])
  @@map("project_events")
}

enum ProjectEventType {
  MEETING          // Совещание
  GSN_INSPECTION   // Проверка ГСН
  ACCEPTANCE       // Приёмка работ
  AUDIT            // Аудит
  COMMISSIONING    // Ввод в эксплуатацию
  OTHER            // Иное
}

enum ProjectEventStatus {
  PLANNED          // Запланировано
  IN_PROGRESS      // Проводится
  COMPLETED        // Состоялось
  CANCELLED        // Отменено
  POSTPONED        // Перенесено
}

// ─────────────────────────────────────────────
// ПЛАТЕЖИ ПО КОНТРАКТУ (для аналитики)
// ─────────────────────────────────────────────

/// Плановый или фактический платёж по контракту
model ContractPayment {
  id          String         @id @default(uuid())
  paymentType ContractPaymentType               // PLAN / FACT
  amount      Float                             // Сумма (руб.)
  paymentDate DateTime                          // Дата платежа / ожидаемая дата
  budgetType  String?                           // Вид бюджета (федеральный, региональный…)
  description String?                           // Примечание

  contractId  String
  contract    Contract @relation(fields: [contractId], references: [id], onDelete: Cascade)

  createdById String
  createdBy   User    @relation("PaymentCreator", fields: [createdById], references: [id])

  createdAt   DateTime @default(now())

  @@index([contractId])
  @@index([paymentDate])
  @@map("contract_payments")
}

enum ContractPaymentType {
  PLAN   // Плановый платёж
  FACT   // Фактический платёж
}

// ─────────────────────────────────────────────
// КАТЕГОРИИ КОНТРАКТОВ
// ─────────────────────────────────────────────

/// Категория / вид контракта (пользовательский справочник)
model ContractCategory {
  id            String   @id @default(uuid())
  name          String                        // Название категории
  trackPayments Boolean  @default(true)       // Учитывать в виджете "Оплачено"
  order         Int      @default(0)

  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id])

  contracts     Contract[]

  createdAt     DateTime @default(now())

  @@index([organizationId])
  @@map("contract_categories")
}
```

### 1.2. Дополнения в существующие модели

```prisma
// Добавить в model Contract:
categoryId      String?
category        ContractCategory? @relation(fields: [categoryId], references: [id])
payments        ContractPayment[]
events          ProjectEvent[]

// Добавить в model Project:
folders         ProjectFolder[]
documents       ProjectDocument[]  // (через folders, но для удобства)
events          ProjectEvent[]

// Добавить в model User:
projectDocsUploaded      ProjectDocument[]         @relation("ProjectDocUploader")
docVersionsUploaded      ProjectDocumentVersion[]  @relation("DocVersionUploader")
eventsOrganized          ProjectEvent[]            @relation("EventOrganizer")
paymentsCreated          ContractPayment[]          @relation("PaymentCreator")

// Добавить в model Organization:
contractCategories       ContractCategory[]
```

### 1.3. Команда для Claude Code

```
Прочитай CLAUDE.md. Добавь в prisma/schema.prisma новые модели:
ProjectFolder (дерево через parentId), ProjectDocument (с qrToken),
ProjectDocumentVersion, ProjectEvent (с enum-ами), ContractPayment,
ContractCategory.

Добавь связи в Contract (categoryId, payments, events),
Project (folders, events), User (4 новых relation).

Затем:
npx prisma migrate dev --name add_module4_project_management
npx prisma generate
```

---

## Шаг 2 — URL и layout модуля (День 3)

### 2.1. Файловая структура

```
src/app/(dashboard)/objects/[objectId]/
  management/
    layout.tsx          ← Tabs: Контракты / Документы / Мероприятия / Аналитика
    contracts/
      page.tsx          ← Список договоров + платежи (расширение существующего)
    documents/
      page.tsx          ← Файловое хранилище с папочной структурой
    events/
      page.tsx          ← Перечень мероприятий
    analytics/
      page.tsx          ← Аналитика по контрактам
```

### 2.2. `management/layout.tsx`

```tsx
// src/app/(dashboard)/objects/[objectId]/management/layout.tsx
'use client';

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePathname, useRouter } from 'next/navigation';

const MGMT_TABS = [
  { label: 'Контракты',    href: 'contracts' },
  { label: 'Документы',    href: 'documents' },
  { label: 'Мероприятия',  href: 'events' },
  { label: 'Аналитика',    href: 'analytics' },
];

export default function ManagementLayout({ children, params }) {
  const pathname = usePathname();
  const router = useRouter();
  const active = MGMT_TABS.find(t => pathname.includes(t.href))?.href ?? 'contracts';

  return (
    <div className="space-y-4">
      <Tabs value={active} onValueChange={(v) =>
        router.push(`/objects/${params.objectId}/management/${v}`)
      }>
        <TabsList>
          {MGMT_TABS.map(t => (
            <TabsTrigger key={t.href} value={t.href}>{t.label}</TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      {children}
    </div>
  );
}
```

### 2.3. Добавить «Упр. проектом» в ObjectModuleSidebar

```tsx
// Дополнить MODULES в ObjectModuleSidebar.tsx:
{ label: 'Упр. проектом', href: 'management/contracts', icon: Briefcase },
```

### 2.4. Команда для Claude Code

```
Создай файловую структуру Модуля 4:
- src/app/(dashboard)/objects/[objectId]/management/layout.tsx
  (горизонтальные Tabs: Контракты, Документы, Мероприятия, Аналитика)
- src/app/(dashboard)/objects/[objectId]/management/contracts/page.tsx
- src/app/(dashboard)/objects/[objectId]/management/documents/page.tsx
- src/app/(dashboard)/objects/[objectId]/management/events/page.tsx
- src/app/(dashboard)/objects/[objectId]/management/analytics/page.tsx

В ObjectModuleSidebar.tsx добавь пункт "Упр. проектом"
(иконка Briefcase из lucide-react, href: management/contracts)
перед пунктами с меткой "скоро".
```

---

## Шаг 3 — API роуты (День 4–5)

### 3.1. Документы (файловое хранилище)

```
GET    /api/projects/[id]/folders                     — дерево папок
POST   /api/projects/[id]/folders                     — создать папку
PATCH  /api/projects/[id]/folders/[fid]               — переименовать / переместить
DELETE /api/projects/[id]/folders/[fid]               — удалить (с вложенными)

GET    /api/projects/[id]/folders/[fid]/documents     — файлы папки
POST   /api/projects/[id]/folders/[fid]/documents     — загрузить файл
GET    /api/projects/[id]/documents/[did]             — карточка документа
DELETE /api/projects/[id]/documents/[did]             — удалить
POST   /api/projects/[id]/documents/[did]/version     — загрузить новую версию
GET    /api/projects/[id]/documents/[did]/versions    — история версий
POST   /api/projects/[id]/documents/[did]/qr          — сгенерировать QR-код
GET    /api/docs/verify/[qrToken]                     — публичная проверка версии (без auth)
GET    /api/projects/[id]/documents/archive           — скачать все файлы папки ZIP
```

**Ключевая логика — загрузка файла:**
```typescript
// POST /api/projects/[id]/folders/[fid]/documents
// 1. Принять multipart/form-data
// 2. Сгенерировать s3Key = projects/{projectId}/docs/{uuid}/{filename}
// 3. Загрузить в Timeweb S3
// 4. Создать ProjectDocument в БД (version=1, isActual=true)
// 5. Создать ProjectDocumentVersion (version=1, тот же s3Key)
// 6. Вернуть документ с presigned URL

export async function POST(req: NextRequest, { params }) {
  const formData = await req.formData();
  const file = formData.get('file') as File;
  const name = formData.get('name') as string || file.name;
  
  const buffer = Buffer.from(await file.arrayBuffer());
  const s3Key = `projects/${params.projectId}/docs/${randomUUID()}/${file.name}`;
  
  await s3.putObject({ Bucket, Key: s3Key, Body: buffer, ContentType: file.type });
  
  const doc = await db.projectDocument.create({
    data: {
      name, s3Key, fileName: file.name,
      mimeType: file.type, fileSize: file.size,
      folderId: params.fid,
      uploadedById: session.user.id,
      versions: {
        create: { version: 1, s3Key, fileName: file.name,
                  fileSize: file.size, uploadedById: session.user.id }
      }
    }
  });
  return successResponse(doc, 201);
}
```

**Загрузка новой версии:**
```typescript
// POST /api/projects/[id]/documents/[did]/version
// 1. Загрузить новый файл в S3 под новым ключом
// 2. Обновить ProjectDocument: s3Key = новый, version++
// 3. Создать ProjectDocumentVersion с новым номером
// Старый файл в S3 остаётся (для истории версий)

const current = await db.projectDocument.findUniqueOrThrow({ where: { id: did } });
const newVersion = current.version + 1;
const newS3Key = `projects/${projectId}/docs/${did}/v${newVersion}/${file.name}`;

await db.$transaction([
  s3Upload(newS3Key, buffer),
  db.projectDocument.update({
    where: { id: did },
    data: { s3Key: newS3Key, fileName: file.name, version: newVersion }
  }),
  db.projectDocumentVersion.create({
    data: { documentId: did, version: newVersion, s3Key: newS3Key,
            fileName: file.name, fileSize: file.size,
            comment, uploadedById: session.user.id }
  })
]);
```

**QR-код для чертежа:**
```typescript
// POST /api/projects/[id]/documents/[did]/qr
// Генерирует PNG с QR-кодом, ведущим на /api/docs/verify/[qrToken]
// Сохраняет PNG в S3, токен в БД

import QRCode from 'qrcode';

const token = randomUUID();
const url = `${process.env.APP_URL}/api/docs/verify/${token}`;
const qrPng = await QRCode.toBuffer(url, { type: 'png', width: 200 });
const qrS3Key = `projects/${projectId}/qr/${did}.png`;

await s3.putObject({ Bucket, Key: qrS3Key, Body: qrPng, ContentType: 'image/png' });
await db.projectDocument.update({
  where: { id: did },
  data: { qrToken: token, qrCodeS3Key: qrS3Key }
});

// GET /api/docs/verify/[token] — публичная страница (без авторизации):
// Показывает: название документа, текущая версия, дата загрузки
// "Версия 3. Загружено 15.03.2025. Документ актуален ✓"
// НЕ даёт скачать файл — только подтверждает актуальность
```

**Скачивание ZIP:**
```typescript
// GET /api/projects/[id]/documents/archive?folderId=xxx
import archiver from 'archiver';

const docs = await db.projectDocument.findMany({ where: { folderId } });
const archive = archiver('zip');

for (const doc of docs) {
  const stream = await s3GetStream(doc.s3Key);
  archive.append(stream, { name: doc.fileName });
}

archive.finalize();
// Стримить Response напрямую клиенту
```

### 3.2. Мероприятия

```
GET    /api/projects/[id]/events          — список (фильтры: status, eventType, dateRange)
POST   /api/projects/[id]/events          — создать мероприятие
PATCH  /api/projects/[id]/events/[eid]    — обновить (статус, дата, протокол)
DELETE /api/projects/[id]/events/[eid]    — удалить
POST   /api/projects/[id]/events/[eid]/protocol — загрузить протокол
```

**Уведомления за N дней (BullMQ cron):**
```typescript
// workers/event-notifications.ts — запускать ежедневно в 09:00
import { Queue } from 'bullmq';

const queue = new Queue('notifications');

// Cron job: каждый день находить мероприятия через notifyDays дней
const upcoming = await db.projectEvent.findMany({
  where: {
    status: 'PLANNED',
    scheduledAt: {
      gte: addDays(now, 0),
      lte: addDays(now, 7) // смотрим на 7 дней вперёд
    },
  },
  include: { project: true }
});

for (const event of upcoming) {
  const daysUntil = differenceInDays(event.scheduledAt, now);
  if (daysUntil === event.notifyDays) {
    // Создать Notification для организаторов и участников
    await createNotification({
      userIds: [event.organizerId, ...event.participantIds],
      type: 'event_reminder',
      title: `Напоминание: ${event.title}`,
      body: `Мероприятие состоится ${format(event.scheduledAt, 'dd.MM.yyyy в HH:mm')}`,
      entityType: 'ProjectEvent',
      entityId: event.id,
    });
  }
}
```

### 3.3. Платежи и аналитика

```
GET    /api/projects/[id]/contracts/[cid]/payments   — платежи по договору
POST   /api/projects/[id]/contracts/[cid]/payments   — добавить платёж
DELETE /api/projects/[id]/contracts/[cid]/payments/[pid] — удалить

GET    /api/projects/[id]/analytics/contracts        — агрегация для дашборда аналитики
GET    /api/organizations/[orgId]/contract-categories — справочник категорий
POST   /api/organizations/[orgId]/contract-categories — создать категорию
```

**Аналитика контрактов:**
```typescript
// GET /api/projects/[id]/analytics/contracts
// Возвращает данные для 4 виджетов ЦУС

const contracts = await db.contract.findMany({
  where: { projectId, project: { organizationId } },
  include: {
    ks2Acts: { select: { totalAmount: true } },
    payments: true,
    category: true,
  }
});

// Виджет 1: Стоимость по контрактам (суммарно)
const totalContractAmount = contracts.reduce((s, c) => s + (c.totalAmount ?? 0), 0);

// Виджет 2: Плановые платежи (по месяцам)
const planPayments = contracts.flatMap(c =>
  c.payments.filter(p => p.paymentType === 'PLAN')
);

// Виджет 3: Фактические платежи (по месяцам)
const factPayments = contracts.flatMap(c =>
  c.payments.filter(p => p.paymentType === 'FACT')
);

// Виджет 4: Статусы контрактов
const statusGroups = groupBy(contracts, 'status');

// Виджет 5: Просроченные КС-2 (нет оплаты больше 30 дней после подписания)
const overdueKs2 = await db.ks2Act.findMany({
  where: {
    contract: { projectId },
    status: 'SIGNED',
    signedAt: { lt: subDays(new Date(), 30) }
  }
});

return successResponse({
  totalContractAmount,
  planByMonth: groupPaymentsByMonth(planPayments),
  factByMonth: groupPaymentsByMonth(factPayments),
  statusGroups,
  overdueKs2Count: overdueKs2.length,
  cashFlowForecast: calculateCashFlowForecast(planPayments, factPayments),
});
```

### 3.4. Команда для Claude Code

```
Создай API роуты Модуля 4:

1. src/app/api/projects/[projectId]/folders/route.ts — GET дерева, POST
2. src/app/api/projects/[projectId]/folders/[folderId]/route.ts — PATCH, DELETE
3. src/app/api/projects/[projectId]/folders/[folderId]/documents/route.ts — GET, POST
4. src/app/api/projects/[projectId]/documents/[docId]/route.ts — GET, DELETE
5. src/app/api/projects/[projectId]/documents/[docId]/version/route.ts — POST
6. src/app/api/projects/[projectId]/documents/[docId]/versions/route.ts — GET
7. src/app/api/projects/[projectId]/documents/[docId]/qr/route.ts — POST
8. src/app/api/docs/verify/[token]/route.ts — GET публичная (без auth)
9. src/app/api/projects/[projectId]/events/route.ts — GET, POST
10. src/app/api/projects/[projectId]/events/[eventId]/route.ts — PATCH, DELETE
11. src/app/api/projects/[projectId]/contracts/[contractId]/payments/route.ts — GET, POST
12. src/app/api/projects/[projectId]/analytics/contracts/route.ts — GET агрегация

Зависимости: npm install qrcode archiver
              npm install -D @types/qrcode @types/archiver

В каждом роуте: getSessionOrThrow() + проверка organizationId.
```

---

## Шаг 4 — Вкладка «Контракты» (расширение) (День 6)

### 4.1. Что добавляем к существующему

Список договоров уже есть. Добавляем:
- Левая панель с категориями (как в ЦУС)
- Вкладку «Платежи» внутри карточки договора
- Поле суммы договора и колонку «Освоено»

```tsx
// Расширить существующую страницу /management/contracts/page.tsx:
// Двухколоночный layout:
// Левая (200px): список категорий + кнопка "+ Категория"
// Правая: таблица договоров выбранной категории

// Колонки таблицы:
// | Номер | Наименование | Категория | Сумма | Освоено (КС-2) | Статус | Действия |
// Освоено = Σ Ks2Act.totalAmount по договору

// Карточка договора — добавить вкладку «Платежи»:
// Таблица: | Тип (Plan/Fact) | Сумма | Дата | Вид бюджета | Удалить |
// Кнопка "+ Добавить платёж" → Dialog
```

### 4.2. Форма добавления платежа

```tsx
// AddPaymentDialog.tsx
// Поля:
// - Тип: Radio "Плановый / Фактический"
// - Сумма: Input type="number" (форматировать через Intl)
// - Дата: DatePicker
// - Вид бюджета: Input (федеральный / региональный / внебюджет / собственные)
// - Примечание: Input опционально
// POST /api/projects/.../contracts/[cid]/payments
```

### 4.3. Команда для Claude Code

```
Расширь вкладку Контракты:

1. Создай левую панель категорий в management/contracts/page.tsx.
   GET /api/organizations/${orgId}/contract-categories — список категорий.
   Клик по категории фильтрует таблицу договоров.
   Кнопка "+ Категория" → Dialog с полем name и чекбоксом trackPayments.

2. В таблицу договоров добавь колонки:
   - "Сумма договора" (из contract.totalAmount — добавь это поле в Contract)
   - "Освоено (КС-2)" — агрегация из Ks2Act.totalAmount

3. В карточке договора (ContractDetailContent.tsx) добавь вкладку "Платежи":
   - Таблица: тип (Badge: Plan=синий/Fact=зелёный), сумма, дата, вид бюджета
   - Итоговые строки: "Итого план: X руб." / "Итого факт: Y руб."
   - Кнопка "+ Добавить платёж" → Dialog AddPaymentDialog
   - DELETE для каждой записи
```

---

## Шаг 5 — Вкладка «Документы» (файловое хранилище) (День 7–9)

### 5.1. Layout двухколоночный (как в ЦУС)

```tsx
// src/components/objects/management/DocumentsView.tsx

// Двухколоночный layout:
// ┌──────────────────┬────────────────────────────────────────┐
// │ Все документы    │  Рабочий проект (14 файлов)            │
// │                  │                                        │
// │ ▾ Рабочий проект│  [Загрузить файл] [+ Папка] [⬇ ZIP]   │
// │   Архит. часть   │                                        │
// │   Конструктив    │  ┌──────────────────────────────────┐  │
// │ ▾ ПД             │  │ 📄 Раздел_АС_v3.pdf   2.4 МБ    │  │
// │   Изыскания      │  │    Загружен: Иванов И., 15.03    │  │
// │ ▾ Разрешительная │  │    Версия: 3  [QR]  [↓] [✏] [✕]│  │
// │ Исп. схемы       │  └──────────────────────────────────┘  │
// │ Сертификаты      │                                        │
// │ Нормативка       │                                        │
// │                  │                                        │
// │ [+ Добавить]     │                                        │
// └──────────────────┴────────────────────────────────────────┘
```

### 5.2. Компонент дерева папок

```tsx
// src/components/objects/management/FolderTree.tsx
// Рекурсивное дерево с раскрытием/сворачиванием
// Иконки: 📁 папка закрыта / 📂 папка открыта
// Контекстное меню (ПКМ или ⋮):
//   + Добавить подчинённую папку
//   ✏ Переименовать
//   🗑 Удалить

// Начальные папки по умолчанию (seed при создании проекта):
const DEFAULT_FOLDERS = [
  'Разрешительная документация',
  'Рабочий проект',
  'Исполнительные схемы',
  'Сертификаты качества',
  'Нормативные документы',
  'Протоколы совещаний',
  'Прочее',
];
```

### 5.3. Список файлов в папке

```tsx
// src/components/objects/management/DocumentList.tsx

// Каждый файл — строка:
// [иконка типа] [название] [размер] [дата] [автор]   [QR] [↓] [Версии] [⋮]

// Иконки по mimeType:
// application/pdf → 📄 красный
// image/*         → 🖼 синий
// application/vnd.openxmlformats-officedocument → 📊 зелёный (xlsx) / 📝 синий (docx)
// application/zip → 📦

// Кнопка [QR]:
//   Если qrToken есть → показать PNG QR-кода
//   Если нет → "Сгенерировать QR-код" → POST /qr → обновить UI

// Кнопка [Версии]:
//   Открывает Sheet с историей версий
//   Каждая версия: номер, дата, автор, кнопка "Скачать эту версию"
//   Кнопка "Загрузить новую версию" вверху → input file → POST /version

// Кнопка [↓]:
//   Presigned URL для скачивания актуальной версии
```

### 5.4. Drag & Drop загрузка файлов

```tsx
// Зона загрузки: можно перетащить несколько файлов в папку
// Показывать прогресс загрузки каждого файла (%)
// После загрузки — обновить список без перезагрузки страницы

import { useDropzone } from 'react-dropzone';

const { getRootProps, getInputProps, isDragActive } = useDropzone({
  onDrop: async (acceptedFiles) => {
    for (const file of acceptedFiles) {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('name', file.name);
      
      await fetch(`/api/projects/${projectId}/folders/${folderId}/documents`, {
        method: 'POST',
        body: formData,
      });
    }
    refetch(); // обновить список
  }
});
```

### 5.5. Публичная страница верификации QR

```tsx
// src/app/docs/verify/[token]/page.tsx
// Публичная страница (без авторизации)
// Показывает:
// ┌──────────────────────────────────────────────────┐
// │  ✓  Документ верифицирован                       │
// │                                                  │
// │  Раздел_АС_Корпус_1.pdf                         │
// │  Версия: 3                                       │
// │  Загружено: 15 марта 2025, 10:32                 │
// │  Загрузил: Иванов Иван Иванович                  │
// │  Проект: ЖК "Солнечный"                          │
// └──────────────────────────────────────────────────┘
// НЕ даёт скачать файл — только подтверждает актуальность!

export default async function VerifyPage({ params }: { params: { token: string } }) {
  const doc = await db.projectDocument.findUnique({
    where: { qrToken: params.token },
    include: { uploadedBy: { select: { firstName: true, lastName: true } },
               folder: { include: { project: { select: { name: true } } } } }
  });
  // Рендерить карточку без layout (отдельная standalone страница)
}
```

### 5.6. Команда для Claude Code

```
Создай компоненты файлового хранилища:

1. src/components/objects/management/DocumentsView.tsx
   — Двухколоночный layout: дерево папок слева + список файлов справа

2. src/components/objects/management/FolderTree.tsx
   — Рекурсивный компонент дерева. Данные из GET /api/projects/${id}/folders
   — Контекстное меню (Popover): добавить подпапку, переименовать, удалить
   — Клик по папке → обновляет selectedFolderId → правая часть перезагружается

3. src/components/objects/management/DocumentList.tsx
   — Список файлов выбранной папки. GET /folders/${fid}/documents
   — Drag-and-drop зона (react-dropzone) для загрузки новых файлов
   — Иконки по типу файла. Кнопки: QR, Скачать, Версии, Удалить
   — Кнопка QR: POST /documents/${did}/qr → показать PNG
   — Sheet "Версии": GET /documents/${did}/versions → список + "Загрузить новую"

4. src/app/docs/verify/[token]/page.tsx
   — Публичная standalone страница (без DashboardLayout)
   — Показывает: название, версия, дата, автор, проект
   — НЕ даёт скачать файл

Зависимости: npm install react-dropzone qrcode
```

---

## Шаг 6 — Вкладка «Мероприятия» (День 10–11)

### 6.1. Два вида отображения

```tsx
// src/components/objects/management/EventsView.tsx

// Переключатель: [Список] [Календарь]

// === Список ===
// Фильтры: [Все] [Запланировано] [Проведено] [Отменено]  + фильтр по типу

// Карточки мероприятий:
// ┌──────────────────────────────────────────────────────────────────────┐
// │ 📋 Совещание по готовности 3-й секции         [ЗАПЛАНИРОВАНО]        │
// │    22 марта 2025, 10:00 · Прорабская на объекте                      │
// │    Организатор: Петров П.П.                                           │
// │    Участники: Иванов, Сидоров, Кузнецов (+2)                         │
// │    Уведомление за 3 дня  [📎 Загрузить протокол]  [✏] [✕]          │
// └──────────────────────────────────────────────────────────────────────┘

// === Календарь ===
// Использовать react-big-calendar или FullCalendar
// Мероприятия отображаются на соответствующих датах
// Клик по дате → создание нового мероприятия
// Клик по мероприятию → карточка (Sheet)
```

### 6.2. Форма создания мероприятия

```tsx
// CreateEventDialog.tsx
// Поля:
// - Название: Input
// - Тип: Select (Совещание, Проверка ГСН, Приёмка работ, Аудит, Ввод, Иное)
// - Дата и время: DateTimePicker (DatePicker + TimePicker)
// - Место проведения: Input
// - Описание / повестка: Textarea
// - Привязка к договору: Combobox (необязательно)
// - Участники: MultiCombobox из пользователей организации
// - Уведомить за: Input type="number" defaultValue=3 (дней)
// POST /api/projects/${projectId}/events
```

### 6.3. Загрузка протокола

```tsx
// После проведения мероприятия:
// Кнопка "Загрузить протокол" → input file → upload → PATCH /events/[id]
// { status: 'COMPLETED', protocolS3Key, protocolFileName }
// В карточке мероприятия появляется ссылка "Скачать протокол →"
```

### 6.4. Команда для Claude Code

```
Создай компоненты вкладки «Мероприятия»:

1. src/components/objects/management/EventsView.tsx
   — Переключатель Список/Календарь (Toggle)
   — В режиме Список: карточки с фильтрами по статусу и типу
   — В режиме Календарь: react-big-calendar (npm install react-big-calendar)

2. src/components/objects/management/CreateEventDialog.tsx
   — Форма с полями: название, тип, дата+время, место, описание,
     участники (MultiCombobox), уведомить за N дней
   — POST /api/projects/${projectId}/events

3. Кнопка "Загрузить протокол" в карточке события:
   — PATCH /events/${eventId} { status: 'COMPLETED', protocolS3Key }
   — После загрузки статус меняется на COMPLETED

Зависимости: npm install react-big-calendar date-fns
```

---

## Шаг 7 — Вкладка «Аналитика» (День 12–13)

### 7.1. Четыре виджета аналитики (как в ЦУС)

```tsx
// src/components/objects/management/ContractAnalyticsView.tsx

// Данные: GET /api/projects/${projectId}/analytics/contracts

// === Виджет 1: Стоимость по контрактам ===
// Круговая диаграмма: каждый вид контракта = сектор
// В центре: общая сумма всех контрактов
// Recharts: PieChart + Pie + Cell

// === Виджет 2: Плановые платежи ===
// Столбчатая диаграмма по месяцам (год текущий по умолчанию)
// Recharts: BarChart + Bar

// === Виджет 3: Фактические платежи ===
// Столбчатая диаграмма план vs факт по месяцам
// Recharts: BarChart с двумя Bar (синий=план, зелёный=факт)

// === Виджет 4: Статусы контрактов ===
// Таблица: вид контракта | количество | общая сумма
// Клик по строке → фильтрует список на вкладке Контракты

// === Дополнительно: Прогноз кассового разрыва ===
// Линейный график: план vs факт нарастающим итогом
// Если fact < plan → красная зона (отставание)
// Прогноз на 3 месяца вперёд
```

### 7.2. Компонент аналитики

```tsx
// ContractAnalyticsView.tsx
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
         CartesianGrid, Tooltip, Legend, LineChart, Line } from 'recharts';

// Форматирование рублей:
const formatRub = (v: number) =>
  new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB',
    maximumFractionDigits: 0 }).format(v);

// Фильтр периода (как в ЦУС): год или произвольный диапазон дат
// Select года: [2024] [2025] [Все время]  + DateRangePicker для произвольного

// Переключатель типа расчёта: [Отдельный] [Накопительный]
// Накопительный = каждое значение = сумма текущего + всех предыдущих
```

### 7.3. Команда для Claude Code

```
Создай src/components/objects/management/ContractAnalyticsView.tsx.

Данные: GET /api/projects/${projectId}/analytics/contracts.
Recharts уже доступен в проекте (есть в package.json).

Виджеты:
1. PieChart "Стоимость по видам контрактов" — секторы по category.name
2. BarChart "Плановые платежи" — по месяцам текущего года
3. BarChart "План vs Факт" — две Bar на одном BarChart, цвета: синий=план, зелёный=факт
4. Таблица "Статусы контрактов" — shadcn Table, строки: статус, количество, сумма

Сверху: Select года (текущий по умолчанию) + Switch "Накопительный итог".
При переключении — пересчитывать данные на клиенте (не новый запрос).

Каждый виджет — shadcn Card с заголовком.
Skeleton-лоадер пока данные грузятся.
```

---

## Шаг 8 — Seed-данные (предустановленные папки) (День 14)

### 8.1. При создании проекта — создавать папки по умолчанию

```typescript
// Добавить в POST /api/projects (существующий роут):

const DEFAULT_FOLDERS = [
  { name: 'Разрешительная документация', order: 0 },
  { name: 'Рабочий проект',               order: 1 },
  { name: 'Исполнительные схемы',          order: 2 },
  { name: 'Сертификаты качества',          order: 3 },
  { name: 'Нормативные документы',         order: 4 },
  { name: 'Протоколы совещаний',           order: 5 },
  { name: 'Прочее',                        order: 6 },
];

// После создания проекта:
await db.projectFolder.createMany({
  data: DEFAULT_FOLDERS.map(f => ({
    ...f, projectId: project.id
  }))
});
```

### 8.2. Команда для Claude Code

```
В существующем роуте POST /api/projects добавь после создания проекта
автоматическое создание 7 папок по умолчанию (createMany).

Папки: Разрешительная документация, Рабочий проект, Исполнительные схемы,
Сертификаты качества, Нормативные документы, Протоколы совещаний, Прочее.

В prisma/seed.ts для тестового проекта тоже добавь эти папки.
```

---

## Шаг 9 — TypeScript и полировка (День 14–15)

```bash
# Вставь в Claude Code:
npx tsc --noEmit
```

### Чеклист

```
□ /management/contracts — список с категориями в левой панели
□ /management/contracts — вкладка "Платежи" в карточке договора
□ /management/documents — дерево папок загружается
□ /management/documents — загрузка файла через drag-and-drop
□ /management/documents — история версий открывается в Sheet
□ /management/documents — генерация QR-кода работает
□ /docs/verify/[token] — публичная страница открывается БЕЗ авторизации
□ /management/events — список мероприятий с фильтрами
□ /management/events — календарный вид
□ /management/events — создание + загрузка протокола
□ /management/analytics — все 4 виджета отображаются с данными
□ При создании нового проекта — 7 папок создаются автоматически
□ Уведомления за N дней до мероприятия (проверить BullMQ job)
□ TypeScript: нет ошибок
□ Все API проверяют organizationId
```

---

## Итоговая структура файлов

```
src/
├── app/
│   ├── (dashboard)/objects/[objectId]/management/
│   │   ├── layout.tsx
│   │   ├── contracts/page.tsx
│   │   ├── documents/page.tsx
│   │   ├── events/page.tsx
│   │   └── analytics/page.tsx
│   ├── docs/verify/[token]/page.tsx       ← публичная, без DashboardLayout
│   └── api/projects/[projectId]/
│       ├── folders/
│       │   ├── route.ts
│       │   ├── [folderId]/route.ts
│       │   └── [folderId]/documents/route.ts
│       ├── documents/
│       │   └── [docId]/
│       │       ├── route.ts
│       │       ├── version/route.ts
│       │       ├── versions/route.ts
│       │       └── qr/route.ts
│       ├── events/
│       │   ├── route.ts
│       │   └── [eventId]/route.ts
│       ├── contracts/[contractId]/payments/route.ts
│       └── analytics/contracts/route.ts
│
├── components/objects/management/
│   ├── DocumentsView.tsx
│   ├── FolderTree.tsx
│   ├── DocumentList.tsx
│   ├── UploadDropzone.tsx
│   ├── DocumentVersionSheet.tsx
│   ├── EventsView.tsx
│   ├── EventCard.tsx
│   ├── CreateEventDialog.tsx
│   ├── ContractAnalyticsView.tsx
│   └── AddPaymentDialog.tsx
│
└── lib/
    └── validations/
        ├── project-document.ts
        ├── project-event.ts
        └── contract-payment.ts
```

---

## Порядок задач в Claude Code (15 дней)

```
День 1–2:  "Добавь модели в schema.prisma: ProjectFolder, ProjectDocument,
            ProjectDocumentVersion, ProjectEvent, ContractPayment, ContractCategory.
            Выполни миграцию."

День 3:    "Создай файловую структуру /management/ с layout (Tabs),
            добавь пункт в ObjectModuleSidebar."

День 4–5:  "Создай все API роуты модуля (файлы, события, платежи, аналитика)."

День 6:    "Расширь вкладку Контракты: левая панель категорий,
            вкладка Платежи в карточке договора."

День 7–9:  "Создай файловое хранилище: FolderTree, DocumentList,
            drag-and-drop загрузка, история версий, QR-коды,
            публичная страница /docs/verify/[token]."

День 10–11:"Создай вкладку Мероприятия: список, календарь,
            форма создания, загрузка протокола."

День 12–13:"Создай вкладку Аналитика: 4 виджета на Recharts."

День 14:   "Добавь seed папок при создании проекта, BullMQ job
            для уведомлений о мероприятиях."

День 15:   "npx tsc --noEmit, loading.tsx, error.tsx, полировка."
```

> **Совет:** каждую задачу начинай с `Прочитай CLAUDE.md и ROADMAP.md` —  
> это даёт Claude Code полный контекст стека и архитектурных решений.
