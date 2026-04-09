# Модуль 9 — Журналы: подробный план реализации

> Аналог: ЦУС → Модуль «Журналы»  
> Текущее состояние: ОЖР (КС-6а) через `ExecutionDoc(type=OZR)`, ЖВК через `InputControlRecord`, маршрут согласования `ApprovalRoute`. Страница `/objects/[objectId]/journals/page.tsx` — заглушка. В `ObjectModuleSidebar.tsx` пункт «Журналы» помечен `soon: true`.  
> **Ориентир: 2 недели (10 рабочих дней)**

---

## Что уже есть (переиспользуем)

```
model ExecutionDoc {
  id, type (AOSR | OZR | TECHNICAL_READINESS_ACT), status, number, title
  contractId → Contract, workRecordId → WorkRecord?
  overrideFields, overrideHtml, lastEditedAt, lastEditedById
  signatures → Signature[], comments → DocComment[]
  approvalRoute → ApprovalRoute?
}

model WorkRecord {
  id, date, startDate, location, description, normative, status
  workItemId → WorkItem, contractId → Contract
  writeoffs → MaterialWriteoff[], executionDocs → ExecutionDoc[]
}

model InputControlRecord {  // ← ЖВК
  id, date, result (PASSED | FAILED | CONDITIONAL), notes
  batchId → MaterialBatch, inspectorId → User
  acts → InputControlAct[]
}

model ApprovalRoute {  // ← полиморфное согласование
  id, status, currentStepIdx, documentType
  executionDocId? → ExecutionDoc, correspondence?, sedDocument?
  steps → ApprovalStep[]
}

model Notification {
  id, type, title, body, readAt, entityType, entityId, entityName, userId
}

Существующие файлы:
  src/app/(dashboard)/objects/[objectId]/journals/page.tsx      ← заглушка
  src/components/objects/ObjectModuleSidebar.tsx                ← soon: true для Журналов
  src/components/shared/SidebarObjectModules.tsx               ← без soon (активен)
  src/app/(dashboard)/objects/[objectId]/resources/layout.tsx   ← паттерн Tabs
  src/lib/numbering.ts                                         ← авто-нумерация документов
  scripts/start.sh                                             ← список миграций --applied
```

---

## Шаг 1 — Расширение Prisma-схемы (День 1–2)

### 1.1. Новые enum-ы

```prisma
/// Тип специального журнала
enum SpecialJournalType {
  CONCRETE_WORKS      // Журнал бетонных работ (СП 70.13330.2012, Прил. Ф)
  WELDING_WORKS       // Журнал сварочных работ (СП 70.13330.2012, Прил. Б)
  AUTHOR_SUPERVISION  // Журнал авторского надзора (СП 246.1325800.2023, Прил. Б)
  MOUNTING_WORKS      // Журнал монтажа строительных конструкций (СП 70.13330.2012, Прил. А)
  ANTICORROSION       // Журнал антикоррозионных работ (СП 72.13330.2016, Прил. Г)
  GEODETIC            // Оперативный журнал геодезических работ (Форма Ф-5)
  EARTHWORKS          // Журнал производства земляных работ (СП 392.1325800.2018, Форма 5.1)
  PILE_DRIVING        // Журнал погружения свай (СП 392.1325800.2018, Форма 4.1)
  CABLE_LAYING        // Журнал прокладки кабелей (И 1.13-07, Форма 18)
  FIRE_SAFETY         // Журнал инструктажа по пожарной безопасности
  CUSTOM              // Произвольный
}

/// Статус журнала
enum JournalStatus {
  ACTIVE    // Записи разрешены
  STORAGE   // Режим хранения — редактирование запрещено (ГОСТ Р 70108-2025)
  CLOSED    // Закрыт
}

/// Статус записи
enum JournalEntryStatus {
  DRAFT       // Черновик
  SUBMITTED   // На проверке
  APPROVED    // Утверждена
  REJECTED    // Отклонена
}
```

### 1.2. Новые модели

```prisma
/// Специальный журнал работ
model SpecialJournal {
  id           String             @id @default(uuid())
  type         SpecialJournalType
  number       String             // Авто: "ЖБР-001", "ЖСР-001"
  title        String
  status       JournalStatus      @default(ACTIVE)
  normativeRef String?            // Ссылка на ГОСТ/СП
  openedAt     DateTime           @default(now())
  closedAt     DateTime?

  projectId      String
  buildingObject BuildingObject @relation(fields: [projectId], references: [id], onDelete: Cascade)

  contractId String?
  contract   Contract? @relation(fields: [contractId], references: [id], onDelete: SetNull)

  responsibleId String
  responsible   User @relation("JournalResponsible", fields: [responsibleId], references: [id])

  createdById String
  createdBy   User @relation("JournalCreator", fields: [createdById], references: [id])

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  entries       SpecialJournalEntry[]
  approvalRoute ApprovalRoute?       @relation("JournalApproval")

  @@index([projectId])
  @@index([projectId, type])
  @@index([contractId])
  @@index([status])
  @@map("special_journals")
}

/// Запись в специальном журнале
model SpecialJournalEntry {
  id          String             @id @default(uuid())
  entryNumber Int                // Порядковый номер
  date        DateTime
  status      JournalEntryStatus @default(DRAFT)

  description    String          // Описание работ
  location       String?         // Ось, этаж, секция
  normativeRef   String?         // Проектная документация
  weather        String?         // Погода
  temperature    Int?            // Температура °C

  // Специфичные поля по типу журнала (JSON)
  data           Json?

  // Дата освидетельствования (для уведомлений за ≥3 рабочих дня)
  inspectionDate DateTime?
  inspectionNotificationSent Boolean @default(false)

  // Привязка к ИД
  executionDocId String?
  executionDoc   ExecutionDoc? @relation("JournalEntryDoc", fields: [executionDocId], references: [id], onDelete: SetNull)

  journalId String
  journal   SpecialJournal @relation(fields: [journalId], references: [id], onDelete: Cascade)

  authorId String
  author   User @relation("JournalEntryAuthor", fields: [authorId], references: [id])

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  remarks  JournalEntryRemark[]

  @@unique([journalId, entryNumber])
  @@index([journalId, date])
  @@index([journalId, status])
  @@index([inspectionDate])
  @@map("special_journal_entries")
}

/// Замечание к записи журнала
model JournalEntryRemark {
  id          String    @id @default(uuid())
  text        String
  status      String    @default("OPEN") // OPEN | IN_PROGRESS | RESOLVED
  deadline    DateTime?
  resolvedAt  DateTime?
  resolution  String?

  entryId String
  entry   SpecialJournalEntry @relation(fields: [entryId], references: [id], onDelete: Cascade)

  authorId String
  author   User @relation("RemarkAuthor", fields: [authorId], references: [id])

  resolvedById String?
  resolvedBy   User? @relation("RemarkResolver", fields: [resolvedById], references: [id])

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([entryId])
  @@index([status])
  @@map("journal_entry_remarks")
}
```

### 1.3. Дополнения в существующие модели

```prisma
// Добавить в model BuildingObject:
specialJournals  SpecialJournal[]

// Добавить в model Contract:
specialJournals  SpecialJournal[]

// Добавить в model User:
journalsResponsible     SpecialJournal[]      @relation("JournalResponsible")
journalsCreated         SpecialJournal[]      @relation("JournalCreator")
journalEntries          SpecialJournalEntry[] @relation("JournalEntryAuthor")
journalRemarksAuthored  JournalEntryRemark[]  @relation("RemarkAuthor")
journalRemarksResolved  JournalEntryRemark[]  @relation("RemarkResolver")

// Добавить в model ExecutionDoc:
journalEntries  SpecialJournalEntry[] @relation("JournalEntryDoc")

// Добавить в model ApprovalRoute:
specialJournalId String?       @unique
specialJournal   SpecialJournal? @relation("JournalApproval", fields: [specialJournalId], references: [id], onDelete: Cascade)
```

### 1.4. Zod-схемы для JSON `data` по типу журнала

```typescript
// src/lib/validations/journal-schemas.ts
import { z } from 'zod';

// Журнал бетонных работ (СП 70.13330.2012, Приложение Ф)
export const concreteWorksDataSchema = z.object({
  structureName: z.string(),
  concreteClass: z.string(),
  concreteMark: z.string().optional(),
  volume: z.number(),
  placementMethod: z.string(),
  mixTemperature: z.number().optional(),
  curingMethod: z.string().optional(),
  testProtocolNumber: z.string().optional(),
  supplierMixPlant: z.string().optional(),
});

// Журнал сварочных работ (СП 70.13330.2012, Приложение Б)
export const weldingWorksDataSchema = z.object({
  jointType: z.enum(['BUTT', 'CORNER', 'T_JOINT', 'LAP']),
  baseMetal: z.string(),
  thickness: z.number(),
  electrodeMark: z.string(),
  weldingMethod: z.string(),
  welderStampNumber: z.string(),
  welderFullName: z.string(),
  controlType: z.string().optional(),
  controlResult: z.string().optional(),
  controlProtocolNumber: z.string().optional(),
});

// Журнал авторского надзора (СП 246.1325800.2023, Приложение Б)
export const authorSupervisionDataSchema = z.object({
  designOrgRepresentative: z.string(),
  deviationsFound: z.string().optional(),
  instructions: z.string().optional(),
  instructionDeadline: z.string().optional(),
  implementationNote: z.string().optional(),
  relatedDrawings: z.array(z.string()).optional(),
});

export const createJournalSchema = z.object({
  type: z.string(),
  title: z.string().optional(),
  contractId: z.string().optional(),
  responsibleId: z.string(),
  normativeRef: z.string().optional(),
});

export const createJournalEntrySchema = z.object({
  date: z.string(),
  description: z.string().min(1),
  location: z.string().optional(),
  normativeRef: z.string().optional(),
  weather: z.string().optional(),
  temperature: z.number().optional(),
  data: z.record(z.unknown()).optional(),
  inspectionDate: z.string().optional(),
  executionDocId: z.string().optional(),
});
```

### 1.5. Команда для Claude Code

```
Прочитай CLAUDE.md и ROADMAP.md. Добавь в prisma/schema.prisma:

1. Три enum-а: SpecialJournalType (11 значений), JournalStatus, JournalEntryStatus
2. Три модели: SpecialJournal, SpecialJournalEntry, JournalEntryRemark
3. Связи в: BuildingObject, Contract, User (5 relations), ExecutionDoc, ApprovalRoute

Затем:
npx prisma migrate dev --name add_module9_journals
npx prisma generate

Также создай src/lib/validations/journal-schemas.ts с zod-схемами.
```

---

## Шаг 2 — URL, layout и sidebar (День 3)

### 2.1. Файловая структура

```
src/app/(dashboard)/objects/[objectId]/
  journals/
    layout.tsx              ← Tabs: Реестр / ОЖР / ЖВК
    page.tsx                ← redirect → /journals/registry
    registry/
      page.tsx              ← Сводный реестр
    [journalId]/
      page.tsx              ← Карточка журнала
      [entryId]/
        page.tsx            ← Карточка записи
```

### 2.2. Layout с вкладками (паттерн из `resources/layout.tsx`)

```tsx
// src/app/(dashboard)/objects/[objectId]/journals/layout.tsx
'use client';

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePathname, useRouter } from 'next/navigation';
import type { ReactNode } from 'react';

const JOURNAL_TABS = [
  { label: 'Реестр журналов', href: 'registry' },
  { label: 'ОЖР',            href: 'ozr' },
  { label: 'ЖВК',            href: 'jvk' },
];

export default function JournalsLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: { objectId: string };
}) {
  const pathname = usePathname();
  const router = useRouter();
  const active =
    JOURNAL_TABS.find((t) => pathname.includes(`/journals/${t.href}`))?.href ??
    'registry';

  return (
    <div className="space-y-4">
      <Tabs
        value={active}
        onValueChange={(val) =>
          router.push(`/objects/${params.objectId}/journals/${val}`)
        }
      >
        <TabsList>
          {JOURNAL_TABS.map((t) => (
            <TabsTrigger key={t.href} value={t.href}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      {children}
    </div>
  );
}
```

### 2.3. Redirect вместо заглушки

```tsx
// src/app/(dashboard)/objects/[objectId]/journals/page.tsx
import { redirect } from 'next/navigation';
export default function JournalsPage({ params }: { params: { objectId: string } }) {
  redirect(`/objects/${params.objectId}/journals/registry`);
}
```

### 2.4. Убрать `soon: true` в ObjectModuleSidebar

```tsx
// src/components/objects/ObjectModuleSidebar.tsx
// Было:
{ label: 'Журналы', href: 'journals', icon: BookOpen, soon: true },
// Стало:
{ label: 'Журналы', href: 'journals', icon: BookOpen },
```

### 2.5. Команда для Claude Code

```
Прочитай CLAUDE.md.

1. Замени заглушку journals/page.tsx на redirect → /journals/registry
2. Создай journals/layout.tsx (паттерн из resources/layout.tsx)
3. Создай journals/registry/page.tsx (пока пустой компонент)
4. Создай journals/[journalId]/page.tsx
5. Создай journals/[journalId]/[entryId]/page.tsx
6. В ObjectModuleSidebar.tsx убери soon: true у «Журналы»
7. Добавь loading.tsx в каждую директорию
```

---

## Шаг 3 — API-роуты (День 4–5)

### 3.1. Структура API

```
GET    /api/projects/[projectId]/journals                              — список (?type=&status=&contractId=)
POST   /api/projects/[projectId]/journals                              — создать

GET    /api/projects/[projectId]/journals/[journalId]                  — журнал + записи
PATCH  /api/projects/[projectId]/journals/[journalId]                  — обновить
DELETE /api/projects/[projectId]/journals/[journalId]                  — удалить (ACTIVE, без записей)

GET    /api/projects/[projectId]/journals/[journalId]/entries          — записи (?status=&from=&to=)
POST   /api/projects/[projectId]/journals/[journalId]/entries          — новая запись

GET    .../entries/[entryId]                                           — запись
PATCH  .../entries/[entryId]                                           — обновить
DELETE .../entries/[entryId]                                           — удалить (DRAFT)

GET    .../entries/[entryId]/remarks                                   — замечания
POST   .../entries/[entryId]/remarks                                   — добавить
PATCH  .../entries/[entryId]/remarks/[rid]                             — обновить статус
DELETE .../entries/[entryId]/remarks/[rid]                             — удалить

POST   /api/projects/[projectId]/journals/[journalId]/storage          — режим хранения
POST   /api/projects/[projectId]/journals/[journalId]/generate-pdf     — PDF
```

### 3.2. Авто-нумерация (паттерн из `execution-docs/route.ts`)

```typescript
const JOURNAL_PREFIXES: Record<string, string> = {
  CONCRETE_WORKS: 'ЖБР', WELDING_WORKS: 'ЖСР',
  AUTHOR_SUPERVISION: 'ЖАН', MOUNTING_WORKS: 'ЖМК',
  ANTICORROSION: 'ЖАК', GEODETIC: 'ЖГР',
  EARTHWORKS: 'ЖЗР', PILE_DRIVING: 'ЖПС',
  CABLE_LAYING: 'ЖПК', FIRE_SAFETY: 'ЖПБ', CUSTOM: 'Ж',
};

// В $transaction (предотвращает дубликаты):
const journal = await db.$transaction(async (tx) => {
  const count = await tx.specialJournal.count({
    where: { projectId, type },
  });
  const prefix = JOURNAL_PREFIXES[type] || 'Ж';
  const number = `${prefix}-${String(count + 1).padStart(3, '0')}`;
  return tx.specialJournal.create({ data: { type, number, ... } });
});
```

### 3.3. Проверка режима хранения

```typescript
// В начале POST/PATCH entries:
const journal = await db.specialJournal.findFirst({
  where: { id: params.journalId, projectId: params.projectId },
});
if (!journal) return errorResponse('Журнал не найден', 404);
if (journal.status !== 'ACTIVE') {
  return errorResponse('Журнал в режиме хранения — редактирование запрещено', 403);
}
```

### 3.4. Команда для Claude Code

```
Прочитай CLAUDE.md. Создай все API роуты модуля Журналы:

1. /api/projects/[projectId]/journals/route.ts — GET, POST
2. .../journals/[journalId]/route.ts — GET, PATCH, DELETE
3. .../journals/[journalId]/entries/route.ts — GET, POST
4. .../journals/[journalId]/entries/[entryId]/route.ts — GET, PATCH, DELETE
5. .../entries/[entryId]/remarks/route.ts — GET, POST
6. .../entries/[entryId]/remarks/[remarkId]/route.ts — PATCH, DELETE
7. .../journals/[journalId]/storage/route.ts — POST
8. .../journals/[journalId]/generate-pdf/route.ts — POST

Требования:
- project.organizationId === session.user.organizationId
- POST/PATCH записей → проверка journal.status !== 'STORAGE' → 403
- Авто-нумерация в $transaction
- findMany с take/skip
```

---

## Шаг 4 — Сводный реестр журналов (День 5–6)

### 4.1. Компоненты

```
src/components/objects/journals/
  JournalRegistry.tsx          ← TanStack Table
  CreateJournalDialog.tsx      ← shadcn Dialog
  JournalStatusBadge.tsx       ← ACTIVE=зелёный, STORAGE=серый+замок, CLOSED=красный
  JournalTypeBadge.tsx         ← Цветной бейдж по типу
  StorageModeBanner.tsx        ← Баннер «Режим хранения»
```

### 4.2. Команда для Claude Code

```
Прочитай CLAUDE.md. Создай компоненты реестра журналов:

1. src/components/objects/journals/JournalRegistry.tsx
   — TanStack Table: №, Тип (Badge), Название, Статус, Записей, Ответственный, Договор
   — Фильтры: Select тип, Select статус, Select договор
   — Клик → router.push(`/objects/${objectId}/journals/${row.id}`)
   — Паттерн из RequestsView.tsx (Модуль 8)

2. src/components/objects/journals/CreateJournalDialog.tsx
   — Select типа, Input название, Select договор, Select ответственный
   — POST /api/projects/${projectId}/journals

3. JournalStatusBadge.tsx, JournalTypeBadge.tsx, StorageModeBanner.tsx

4. Подключи JournalRegistry в journals/registry/page.tsx
```

---

## Шаг 5 — Карточка журнала и записи (День 6–7)

### 5.1. Компоненты

```
src/components/objects/journals/
  JournalCard.tsx              ← Шапка + JournalEntryList
  JournalEntryList.tsx         ← TanStack Table записей
  CreateEntryDialog.tsx        ← Адаптивная форма по типу
  fields/
    ConcreteWorksFields.tsx
    WeldingWorksFields.tsx
    SupervisionFields.tsx
```

### 5.2. Команда для Claude Code

```
Прочитай CLAUDE.md. Создай карточку журнала и записей:

1. JournalCard.tsx — шапка, StorageModeBanner, кнопки, JournalEntryList
2. JournalEntryList.tsx — TanStack Table (№, Дата, Описание, Место, Статус, Автор)
3. CreateEntryDialog.tsx — общие поля + динамические по journal.type:
   CONCRETE_WORKS → ConcreteWorksFields
   WELDING_WORKS → WeldingWorksFields
   AUTHOR_SUPERVISION → SupervisionFields

4. fields/ConcreteWorksFields.tsx — structureName, concreteClass, volume, placementMethod
5. fields/WeldingWorksFields.tsx — jointType, baseMetal, electrodeMark, welderStampNumber
6. fields/SupervisionFields.tsx — designOrgRepresentative, deviationsFound, instructions

7. Подключи JournalCard в journals/[journalId]/page.tsx
```

---

## Шаг 6 — Детальная карточка записи и замечания (День 7–8)

### 6.1. Компоненты

```
src/components/objects/journals/
  EntryDetailCard.tsx          ← Полная карточка
  EntryRemarksSection.tsx      ← Секция замечаний
  CreateRemarkDialog.tsx       ← Диалог добавления замечания
```

### 6.2. Команда для Claude Code

```
Прочитай CLAUDE.md. Создай детальную карточку записи:

1. EntryDetailCard.tsx — рендер JSON data по типу, кнопки статусов, привязка к ИД
2. EntryRemarksSection.tsx — список замечаний (OPEN=красный, RESOLVED=зелёный)
3. CreateRemarkDialog.tsx — текст + срок → POST /api/.../remarks

4. Подключи в journals/[journalId]/[entryId]/page.tsx
```

---

## Шаг 7 — Автотриггер «ОЖР → черновик АОСР» (День 8)

```typescript
// src/lib/journal-triggers.ts
// Паттерн из execution-docs/route.ts:
// 1. Проверить нет ли АОСР для workRecordId
// 2. Создать ExecutionDoc(type=AOSR, status=DRAFT)
// 3. Создать Notification(type=aosr_draft_created)
```

### Команда для Claude Code

```
Прочитай CLAUDE.md. Создай автотриггер ОЖР → черновик АОСР:

1. src/lib/journal-triggers.ts — triggerAosrDraftFromOzr
2. Подключи в POST work-records/route.ts (fire-and-forget)
```

---

## Шаг 8 — Уведомления об освидетельствовании (День 9)

```
src/app/api/cron/inspection-reminder/route.ts
— GET с проверкой CRON_SECRET
— Cron 0 8 * * 1-5 (пн-пт 08:00)
— inspectionDate ≤ 3 рабочих дня → Notification
— inspectionNotificationSent = true
```

### Команда для Claude Code

```
Прочитай CLAUDE.md. Создай cron/inspection-reminder/route.ts
с проверкой Authorization: Bearer ${CRON_SECRET}.
Использовать date-fns addBusinessDays.
```

---

## Шаг 9 — Генерация PDF (День 9)

```
src/lib/journal-pdf-generator.ts
— Кэш Handlebars-шаблона через Promise (паттерн из id-registry-generator.ts)
— Puppeteer → PDF → S3

templates/journals/
  journal-concrete.hbs, journal-welding.hbs, journal-supervision.hbs, journal-generic.hbs
```

### Команда для Claude Code

```
Прочитай CLAUDE.md. Создай PDF-генерацию:

1. templates/journals/journal-concrete.hbs — формат СП 70.13330.2012
2. templates/journals/journal-generic.hbs — универсальный
3. src/lib/journal-pdf-generator.ts — паттерн из id-registry-generator.ts
4. Подключи в POST .../generate-pdf/route.ts
```

---

## Шаг 10 — TypeScript и полировка (День 10)

```
1. npx tsc --noEmit — исправить все ошибки
2. Проверить organizationId в каждом API роуте
3. Проверить journal.status !== 'STORAGE' во всех POST/PATCH записей
4. Добавить loading.tsx и error.tsx
5. findMany с take/skip
6. Мобильная вёрстка (375px)
7. Добавить миграцию в scripts/start.sh
```

---

## Итоговая структура файлов

```
src/
├── app/(dashboard)/objects/[objectId]/journals/
│   ├── layout.tsx                    ← Tabs
│   ├── page.tsx                      ← redirect
│   ├── loading.tsx
│   ├── registry/page.tsx + loading.tsx
│   ├── [journalId]/page.tsx + loading.tsx
│   └── [journalId]/[entryId]/page.tsx + loading.tsx
│
├── app/api/projects/[projectId]/journals/
│   ├── route.ts
│   └── [journalId]/
│       ├── route.ts
│       ├── entries/route.ts
│       ├── entries/[entryId]/route.ts
│       ├── entries/[entryId]/remarks/route.ts
│       ├── entries/[entryId]/remarks/[remarkId]/route.ts
│       ├── storage/route.ts
│       └── generate-pdf/route.ts
│
├── app/api/cron/inspection-reminder/route.ts
│
├── components/objects/journals/
│   ├── JournalRegistry.tsx
│   ├── CreateJournalDialog.tsx
│   ├── JournalCard.tsx
│   ├── JournalEntryList.tsx
│   ├── CreateEntryDialog.tsx
│   ├── EntryDetailCard.tsx
│   ├── EntryRemarksSection.tsx
│   ├── CreateRemarkDialog.tsx
│   ├── JournalStatusBadge.tsx
│   ├── JournalTypeBadge.tsx
│   ├── StorageModeBanner.tsx
│   └── fields/
│       ├── ConcreteWorksFields.tsx
│       ├── WeldingWorksFields.tsx
│       └── SupervisionFields.tsx
│
├── lib/
│   ├── journal-triggers.ts
│   ├── journal-pdf-generator.ts
│   └── validations/journal-schemas.ts
│
└── templates/journals/
    ├── journal-concrete.hbs
    ├── journal-welding.hbs
    ├── journal-supervision.hbs
    └── journal-generic.hbs
```

---

## Порядок задач в Claude Code (10 дней)

```
День 1–2:  "Прочитай CLAUDE.md и ROADMAP.md. Добавь в prisma/schema.prisma
            модели SpecialJournal, SpecialJournalEntry, JournalEntryRemark
            с enum-ами. Добавь связи в BuildingObject, Contract, User,
            ExecutionDoc, ApprovalRoute. Выполни миграцию.
            Создай src/lib/validations/journal-schemas.ts."

День 3:    "Замени заглушку journals/page.tsx на redirect.
            Создай layout.tsx с Tabs, файловую структуру.
            В ObjectModuleSidebar.tsx убери soon: true у Журналов.
            Добавь loading.tsx."

День 4–5:  "Создай все API роуты (журналы, записи, замечания,
            storage, generate-pdf). Проверка organizationId и storageMode."

День 5–6:  "Создай JournalRegistry, CreateJournalDialog,
            JournalStatusBadge, JournalTypeBadge, StorageModeBanner.
            Подключи в registry/page.tsx."

День 6–7:  "Создай JournalCard, JournalEntryList, CreateEntryDialog
            с ConcreteWorksFields, WeldingWorksFields, SupervisionFields.
            Подключи в [journalId]/page.tsx."

День 7–8:  "Создай EntryDetailCard, EntryRemarksSection, CreateRemarkDialog.
            Подключи в [entryId]/page.tsx."

День 8:    "Создай src/lib/journal-triggers.ts (автотриггер ОЖР → АОСР).
            Подключи в work-records POST route."

День 9:    "Создай cron/inspection-reminder/route.ts.
            Создай Handlebars-шаблоны и journal-pdf-generator.ts."

День 10:   "npx tsc --noEmit, loading.tsx, error.tsx.
            Добавь миграцию в scripts/start.sh.
            Проверь storageMode, мобильную вёрстку, take/skip."
```

> **Совет:** каждую задачу начинай с `Прочитай CLAUDE.md и ROADMAP.md` —  
> это даёт Claude Code полный контекст стека и архитектурных решений.
