# Модуль 6 — Сметы: подробный план реализации

> Аналог: ЦУС → Модуль «Сметы» (стр. 112–137 руководства)  
> Вкладки: **Сметы · Смета контракта · Сравнение смет**  
> Ориентир: **3–4 недели**

---

## Что уже есть (переиспользуем полностью)

```
EstimateImport           → загрузка файла + статусы (UPLOADING/PARSING/PREVIEW/CONFIRMED) ✅
EstimateImportItem       → распознанные позиции с привязкой к КСИ                         ✅
EstimateFormat enum      → XML_GRAND_SMETA / XML_RIK / EXCEL / PDF                        ✅
EstimateImportStatus     → все статусы конвейера парсинга                                  ✅
WorkItem                 → позиции из подтверждённых смет                                  ✅
Ks2Act / Ks2Item         → КС-2 с автозаполнением из смет                                  ✅

API роуты (все работают):
POST /api/.../estimates/upload       → загрузка файла в S3
POST /api/.../estimates/[id]/start   → запуск парсинга
GET  /api/.../estimates/[id]         → статус + позиции
POST /api/.../estimates/[id]/confirm → подтверждение → запись в WorkItem

Парсеры (все работают):
xml-parser.ts     → XML Гранд-Сметы и РИК (без GPT)
excel-parser.ts   → Excel с прямым парсингом + YandexGPT fallback
yandex-gpt.ts     → GPT парсинг с чанкованием + Gemini fallback
```

---

## Что нужно создать (всё новое)

```
1. EstimateVersion  → версионирование смет (Базовая / Актуальная / Корректировочная)
2. EstimateChapter  → иерархия: Глава → Раздел → Позиция
3. EstimateContract → смета контракта (сводная из нескольких смет)

4. UI: иерархическая таблица смет (tree table)
5. UI: редактирование позиций inline
6. UI: версионирование с историей
7. UI: сравнение двух версий (diff с подсветкой)
8. UI: смета контракта (сводная таблица)
9. UI: экспорт в Excel/PDF
```

---

## Шаг 1 — Prisma-схема (День 1–2)

### 1.1. Новые модели

```prisma
// prisma/schema.prisma

// ─────────────────────────────────────────────
// ВЕРСИОНИРОВАНИЕ СМЕТ
// ─────────────────────────────────────────────

/// Версия сметы (Базовая / Актуальная / Корректировочная)
model EstimateVersion {
  id          String              @id @default(uuid())
  name        String                               // Название версии
  versionType EstimateVersionType @default(ACTUAL)
  isBaseline  Boolean             @default(false)  // Базовая версия (неизменяемая)
  isActual    Boolean             @default(true)   // Актуальная (для расчётов ГПР/КС-2)
  period      String?                              // Период (например "2024 Q1")
  notes       String?

  // Исходный импорт из которого создана версия
  sourceImportId String?
  sourceImport   EstimateImport? @relation(fields: [sourceImportId], references: [id])

  // Родительская версия (для корректировочных)
  parentVersionId String?
  parentVersion   EstimateVersion?  @relation("VersionTree", fields: [parentVersionId], references: [id])
  childVersions   EstimateVersion[] @relation("VersionTree")

  contractId  String
  contract    Contract @relation(fields: [contractId], references: [id], onDelete: Cascade)

  createdById String
  createdBy   User    @relation("EstimateVersionCreator", fields: [createdById], references: [id])

  totalAmount Float?                               // Итоговая сумма (кэш)
  totalLabor  Float?                               // Итого ФОТ
  totalMat    Float?                               // Итого материалы

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  chapters    EstimateChapter[]

  @@index([contractId])
  @@index([parentVersionId])
  @@map("estimate_versions")
}

enum EstimateVersionType {
  BASELINE       // Базовая (исходная, не редактируется)
  ACTUAL         // Актуальная (рабочая)
  CORRECTIVE     // Корректировочная (изменения к базовой)
}

/// Глава / Раздел сметы (иерархия)
model EstimateChapter {
  id          String   @id @default(uuid())
  code        String?                         // Код главы (например "1", "1.1")
  name        String                          // Наименование
  order       Int      @default(0)            // Порядок отображения
  level       Int      @default(0)            // Уровень вложенности (0=глава, 1=раздел)

  versionId   String
  version     EstimateVersion @relation(fields: [versionId], references: [id], onDelete: Cascade)

  // Самоссылка для подразделов
  parentId    String?
  parent      EstimateChapter?  @relation("ChapterTree", fields: [parentId], references: [id])
  children    EstimateChapter[] @relation("ChapterTree")

  // Итоги по главе (кэш)
  totalAmount Float?
  totalLabor  Float?
  totalMat    Float?

  items       EstimateItem[]

  @@index([versionId])
  @@index([parentId])
  @@map("estimate_chapters")
}

/// Позиция сметы (строка в главе)
model EstimateItem {
  id          String           @id @default(uuid())
  sortOrder   Int                                   // Порядок в главе
  itemType    EstimateItemType @default(WORK)       // WORK / MATERIAL
  code        String?                               // Код позиции (из ГЭСН / нормы)
  name        String                                // Наименование
  unit        String?                               // Единица измерения
  volume      Float?                                // Объём / количество
  unitPrice   Float?                                // Цена за единицу
  totalPrice  Float?                                // Итого (volume × unitPrice)
  laborCost   Float?                                // Стоимость труда (ФОТ)
  materialCost Float?                               // Стоимость материалов
  machineryCost Float?                              // Стоимость машин/механизмов

  // Коэффициенты
  priceIndex  Float?  @default(1.0)                 // Индекс пересчёта цен
  overhead    Float?                                // Накладные расходы
  profit      Float?                                // Сметная прибыль

  // Привязка к справочникам
  ksiNodeId   String?
  ksiNode     KsiNode? @relation(fields: [ksiNodeId], references: [id])

  // Привязка к WorkItem (для автозаполнения КС-2)
  workItemId  String?
  workItem    WorkItem? @relation("EstimateItemWork", fields: [workItemId], references: [id])

  // Привязка к оригинальной строке импорта
  importItemId String?
  importItem   EstimateImportItem? @relation(fields: [importItemId], references: [id])

  chapterId   String
  chapter     EstimateChapter @relation(fields: [chapterId], references: [id], onDelete: Cascade)

  isEdited    Boolean  @default(false)              // Ручная правка (отличается от оригинала)
  isDeleted   Boolean  @default(false)              // Soft delete

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([chapterId])
  @@index([ksiNodeId])
  @@index([workItemId])
  @@map("estimate_items")
}

// ─────────────────────────────────────────────
// СМЕТА КОНТРАКТА
// ─────────────────────────────────────────────

/// Смета контракта (сводная из нескольких версий смет)
model EstimateContract {
  id          String   @id @default(uuid())
  name        String                           // Название (например "Смета контракта ДГП-001")
  totalAmount Float?                           // Итоговая сумма

  contractId  String
  contract    Contract @relation(fields: [contractId], references: [id], onDelete: Cascade)

  createdById String
  createdBy   User    @relation("EstimateContractCreator", fields: [createdById], references: [id])

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  versions    EstimateContractVersion[]  // Включённые версии смет

  @@index([contractId])
  @@map("estimate_contracts")
}

/// Связь сметы контракта с версией сметы
model EstimateContractVersion {
  id                 String           @id @default(uuid())
  estimateContractId String
  estimateContract   EstimateContract @relation(fields: [estimateContractId], references: [id], onDelete: Cascade)
  estimateVersionId  String
  estimateVersion    EstimateVersion  @relation(fields: [estimateVersionId], references: [id])
  order              Int              @default(0)

  @@index([estimateContractId])
  @@map("estimate_contract_versions")
}
```

### 1.2. Добавить в существующие модели

```prisma
// В model EstimateImport — добавить:
versions EstimateVersion[]

// В model EstimateImportItem — добавить:
estimateItem EstimateItem?

// В model WorkItem — добавить:
estimateItems EstimateItem[] @relation("EstimateItemWork")

// В model KsiNode — добавить:
estimateItems EstimateItem[]

// В model Contract — добавить:
estimateVersions  EstimateVersion[]
estimateContracts EstimateContract[]

// В model User — добавить:
estimateVersionsCreated  EstimateVersion[]  @relation("EstimateVersionCreator")
estimateContractsCreated EstimateContract[] @relation("EstimateContractCreator")
```

### 1.3. Команда для Claude Code

```
Прочитай CLAUDE.md. Добавь в prisma/schema.prisma модели:
EstimateVersion (с EstimateVersionType enum),
EstimateChapter (с самоссылкой ChapterTree),
EstimateItem (с полями volume, unitPrice, totalPrice, laborCost и др.),
EstimateContract, EstimateContractVersion.

Добавь связи в EstimateImport (versions), WorkItem (estimateItems),
KsiNode (estimateItems), Contract (estimateVersions, estimateContracts),
User (две новые relation).

Затем:
npx prisma migrate dev --name add_module6_estimates
npx prisma generate
```

---

## Шаг 2 — Конвертация EstimateImport → EstimateVersion (День 3)

### 2.1. Ключевая бизнес-логика

При подтверждении импорта (`POST /confirm`) сейчас создаются `WorkItem`. Нужно **также** создавать `EstimateVersion` с `EstimateChapter` и `EstimateItem` — это даст полноценную иерархическую структуру сметы.

```typescript
// lib/estimates/convert-import-to-version.ts

export async function convertImportToVersion(
  importId: string,
  contractId: string,
  userId: string,
  versionName?: string
): Promise<EstimateVersion> {

  const importData = await db.estimateImport.findUniqueOrThrow({
    where: { id: importId },
    include: { items: { orderBy: { sortOrder: 'asc' } } }
  });

  // Группируем позиции по иерархии (parentIndex)
  // parentIndex === undefined || parentIndex === null → это глава
  // parentIndex = N → это позиция под главой N

  const chapters = new Map<number, EstimateImportItem[]>();
  const chapterItems: EstimateImportItem[] = [];

  for (const item of importData.items) {
    if (item.parentIndex === null || item.parentIndex === undefined) {
      chapterItems.push(item);
    } else {
      if (!chapters.has(item.parentIndex)) {
        chapters.set(item.parentIndex, []);
      }
      chapters.get(item.parentIndex)!.push(item);
    }
  }

  // Вычисляем итоги
  const totalAmount = importData.items.reduce((s, i) => s + (i.total ?? 0), 0);

  return await db.$transaction(async (tx) => {
    // Создаём версию
    const version = await tx.estimateVersion.create({
      data: {
        name: versionName ?? `Версия от ${new Date().toLocaleDateString('ru-RU')}`,
        versionType: 'ACTUAL',
        isBaseline: false,
        isActual: true,
        contractId,
        sourceImportId: importId,
        createdById: userId,
        totalAmount,
      }
    });

    // Создаём главы и позиции
    for (const [idx, chapterItem] of chapterItems.entries()) {
      const chapter = await tx.estimateChapter.create({
        data: {
          name: chapterItem.rawName,
          code: String(idx + 1),
          order: idx,
          level: 0,
          versionId: version.id,
        }
      });

      const items = chapters.get(chapterItem.sortOrder) ?? [];
      await tx.estimateItem.createMany({
        data: items.map((item, itemIdx) => ({
          sortOrder: itemIdx,
          itemType: item.itemType,
          name: item.rawName,
          unit: item.rawUnit,
          volume: item.volume,
          unitPrice: item.price,
          totalPrice: item.total,
          ksiNodeId: item.suggestedKsiNodeId,
          importItemId: item.id,
          chapterId: chapter.id,
        }))
      });
    }

    return version;
  });
}
```

### 2.2. Команда для Claude Code

```
Создай lib/estimates/convert-import-to-version.ts.

Функция convertImportToVersion(importId, contractId, userId, versionName?):
1. Загружает EstimateImport с позициями
2. Группирует позиции по parentIndex (null = глава, число = позиция под главой)
3. В транзакции создаёт EstimateVersion → EstimateChapter[] → EstimateItem[]
4. Возвращает созданную EstimateVersion с включёнными chapters

Затем добавь вызов этой функции в существующий роут
POST /api/projects/[projectId]/contracts/[contractId]/estimates/[importId]/confirm
ПОСЛЕ создания WorkItem (не вместо — WorkItem остаётся для ИД и КС-2).
```

---

## Шаг 3 — API роуты (День 4–5)

### 3.1. Версии смет

```
GET    /api/projects/[id]/contracts/[cid]/estimate-versions          — список версий
POST   /api/projects/[id]/contracts/[cid]/estimate-versions          — создать пустую версию
GET    /api/projects/[id]/contracts/[cid]/estimate-versions/[vid]    — версия с главами и позициями
PATCH  /api/projects/[id]/contracts/[cid]/estimate-versions/[vid]    — обновить (name, isActual)
DELETE /api/projects/[id]/contracts/[cid]/estimate-versions/[vid]    — удалить (если не Baseline)
POST   /api/projects/[id]/contracts/[cid]/estimate-versions/[vid]/set-baseline  — сделать базовой
POST   /api/projects/[id]/contracts/[cid]/estimate-versions/[vid]/copy          — скопировать версию
POST   /api/projects/[id]/contracts/[cid]/estimate-versions/[vid]/recalculate   — пересчитать итоги
GET    /api/projects/[id]/contracts/[cid]/estimate-versions/compare             — сравнение двух версий
```

### 3.2. Главы и позиции

```
POST   /api/.../estimate-versions/[vid]/chapters                     — добавить главу
PATCH  /api/.../estimate-versions/[vid]/chapters/[cid]               — переименовать
DELETE /api/.../estimate-versions/[vid]/chapters/[cid]               — удалить

POST   /api/.../estimate-versions/[vid]/chapters/[cid]/items         — добавить позицию
PATCH  /api/.../estimate-versions/[vid]/items/[iid]                  — редактировать позицию
DELETE /api/.../estimate-versions/[vid]/items/[iid]                  — удалить позицию
```

### 3.3. Сравнение версий

```typescript
// GET /api/.../estimate-versions/compare?v1=uuid1&v2=uuid2

// Возвращает структуру для отображения диффа:
interface VersionCompareResult {
  version1: { id: string; name: string; totalAmount: number };
  version2: { id: string; name: string; totalAmount: number };
  diff: {
    added: EstimateItem[];     // Есть в v2, нет в v1
    removed: EstimateItem[];   // Есть в v1, нет в v2
    changed: {                 // Есть в обоих, но изменились
      item1: EstimateItem;
      item2: EstimateItem;
      changedFields: string[]; // ['volume', 'unitPrice', 'totalPrice']
    }[];
    unchanged: EstimateItem[]; // Идентичны в обоих версиях
  };
  summary: {
    totalDiff: number;         // v2.totalAmount - v1.totalAmount
    laborDiff: number;
    materialDiff: number;
  };
}

// Сопоставление позиций по importItemId (если из одного импорта)
// или по name + unit (нечёткое совпадение)
```

### 3.4. Смета контракта

```
GET    /api/projects/[id]/contracts/[cid]/estimate-contract          — текущая смета контракта
POST   /api/projects/[id]/contracts/[cid]/estimate-contract          — создать / обновить
GET    /api/projects/[id]/contracts/[cid]/estimate-contract/export   — экспорт xlsx
```

### 3.5. Пересчёт итогов

```typescript
// lib/estimates/recalculate.ts
// Пересчитывает totalPrice для всех позиций и агрегирует по главам и версии

export async function recalculateVersion(versionId: string) {
  const items = await db.estimateItem.findMany({
    where: { chapter: { versionId }, isDeleted: false },
    include: { chapter: true }
  });

  // Обновить totalPrice = volume * unitPrice для каждой позиции
  await db.$transaction(
    items.map(item =>
      db.estimateItem.update({
        where: { id: item.id },
        data: { totalPrice: (item.volume ?? 0) * (item.unitPrice ?? 0) }
      })
    )
  );

  // Агрегировать по главам
  const chapters = await db.estimateChapter.findMany({ where: { versionId } });
  for (const chapter of chapters) {
    const chapterItems = items.filter(i => i.chapterId === chapter.id);
    const total = chapterItems.reduce((s, i) => s + (i.totalPrice ?? 0), 0);
    await db.estimateChapter.update({
      where: { id: chapter.id },
      data: { totalAmount: total }
    });
  }

  // Агрегировать по версии
  const total = items.reduce((s, i) => s + (i.totalPrice ?? 0), 0);
  await db.estimateVersion.update({
    where: { id: versionId },
    data: { totalAmount: total }
  });
}
```

### 3.6. Команда для Claude Code

```
Создай API роуты Модуля 6:

1. src/app/api/projects/[projectId]/contracts/[contractId]/estimate-versions/route.ts
   — GET (список версий с totalAmount), POST (создать пустую или из importId)

2. src/app/api/.../estimate-versions/[versionId]/route.ts
   — GET (версия с главами и позициями, пагинация глав), PATCH, DELETE

3. src/app/api/.../estimate-versions/[versionId]/copy/route.ts — POST (глубокая копия)
4. src/app/api/.../estimate-versions/[versionId]/set-baseline/route.ts — POST
5. src/app/api/.../estimate-versions/[versionId]/recalculate/route.ts — POST
6. src/app/api/.../estimate-versions/compare/route.ts — GET (?v1=&v2=)

7. src/app/api/.../estimate-versions/[versionId]/chapters/route.ts — POST
8. src/app/api/.../estimate-versions/[versionId]/chapters/[chapterId]/route.ts — PATCH, DELETE
9. src/app/api/.../estimate-versions/[versionId]/chapters/[chapterId]/items/route.ts — POST
10. src/app/api/.../estimate-versions/[versionId]/items/[itemId]/route.ts — PATCH, DELETE

11. src/app/api/.../estimate-contract/route.ts — GET, POST
12. src/app/api/.../estimate-contract/export/route.ts — GET (xlsx через exceljs)

Также создай:
- lib/estimates/convert-import-to-version.ts (конвертация импорта в версию)
- lib/estimates/recalculate.ts (пересчёт итогов)
- lib/estimates/compare-versions.ts (алгоритм диффа двух версий)
```

---

## Шаг 4 — URL и layout (День 6)

```
/objects/[objectId]/estimates/
  layout.tsx           ← Tabs: Сметы / Смета контракта / Сравнение
  page.tsx             ← redirect → /estimates/list
  list/
    page.tsx           ← Список версий (реестр смет)
  [versionId]/
    page.tsx           ← Иерархическая таблица сметы
  contract/
    page.tsx           ← Смета контракта
  compare/
    page.tsx           ← Сравнение двух версий
```

Добавить «Сметы» в `ObjectModuleSidebar`:
```tsx
{ label: 'Сметы', href: 'estimates/list', icon: Calculator },
```

---

## Шаг 5 — Вкладка «Сметы» (список версий) (День 7)

### 5.1. Реестр смет (как в ЦУС)

```tsx
// src/components/objects/estimates/EstimateListView.tsx

// Двухколоночный layout:
// Левая (200px) — категории / папки (аналог ЦУС)
//   Все разделы
//   + Создать категорию
//
// Правая — таблица версий смет:
// | Название версии | Тип | Итоговая сумма | Период | Актуальная | Создана | Действия |
// | Базовая 2024    | 📌  | 12 400 000 ₽   | 2024   | ✓ Да       | 15.03   | ⋮ |
// | Корректировка 1 | ✏️  |  1 200 000 ₽   | 2024   | Нет        | 01.04   | ⋮ |

// Значки типа:
// 📌 BASELINE  → синий
// ✓  ACTUAL    → зелёный  
// ✏️ CORRECTIVE → оранжевый

// Действия (⋮ меню):
// Открыть, Сделать актуальной, Сделать базовой, Создать копию, Пересчитать, Удалить
```

### 5.2. Кнопки создания

```tsx
// Кнопка "+ Импортировать смету" — существующий флоу загрузки файла ✅
//   После подтверждения → автоматически создаётся EstimateVersion

// Кнопка "+ Создать вручную" → Dialog:
//   - Название версии (Input)
//   - Тип: Radio (Актуальная / Корректировочная)
//   - Период (Input)
//   POST /api/.../estimate-versions (без importId → пустая версия)
```

### 5.3. Команда для Claude Code

```
Создай src/components/objects/estimates/EstimateListView.tsx.

Двухколоночный layout: левая панель (заглушка категорий), правая — TanStack Table.

Таблица версий смет. Данные: GET /api/projects/${id}/contracts/${cid}/estimate-versions.
Колонки: название, тип (Badge: BASELINE=синий/ACTUAL=зелёный/CORRECTIVE=оранжевый),
totalAmount (Intl.NumberFormat RUB), period, isActual (чекбокс readonly), createdAt.

Actions меню (DropdownMenu): Открыть, Сделать актуальной (PATCH isActual=true),
Создать копию (POST /copy), Пересчитать (POST /recalculate), Удалить.

Кнопки вверху: "+ Импортировать смету" (существующий флоу EstimateImport),
"+ Создать вручную" (Dialog с полями name, versionType, period).
```

---

## Шаг 6 — Иерархическая таблица сметы (День 8–11)

### 6.1. Главный компонент — tree table

```tsx
// src/components/objects/estimates/EstimateTreeView.tsx

// Это самый сложный компонент модуля.
// Таблица должна показывать иерархию: Глава → Раздел → Позиция

// Визуально (как в Гранд-Смете):
// ┌─────────────────────────────────────────────────────────────────────────┐
// │ ▾ Глава 1. Земляные работы                         12 400 000 ₽        │
// │   ▾ Раздел 1.1. Разработка котлована                8 200 000 ₽        │
// │       001 Разработка грунта экскаватором  м³  1500  3200  4 800 000 ₽  │
// │       002 Вывоз грунта                    м³  1500  2266  3 400 000 ₽  │
// │   ▾ Раздел 1.2. Обратная засыпка                    4 200 000 ₽        │
// │       003 Засыпка котлована               м³   600  7000  4 200 000 ₽  │
// │ ▾ Глава 2. Фундаменты                              28 600 000 ₽        │
// │ ─────────────────────────────────────────────────────────────────────   │
// │ ИТОГО:                                             41 000 000 ₽        │
// └─────────────────────────────────────────────────────────────────────────┘

// Технология: TanStack Table v8 с группировкой (уже в проекте ✅)
// Раскрытие/сворачивание глав через expandedState в хуке

// Колонки:
// | # | Наименование | Ед. | Объём | Цена | Итого | ФОТ | Мат |
```

### 6.2. Inline редактирование позиций

```tsx
// При клике на ячейку → превращается в Input
// Поля для редактирования: volume, unitPrice (totalPrice пересчитывается автоматически)
// Blur → PATCH /items/[id] → recalculate → обновить родительские итоги

// Визуально:
// Отредактированные позиции помечаются синей точкой ● (isEdited=true)
// Кнопка "Пересчитать" в шапке пересчитывает все totalPrice

// Добавление новой позиции:
// Кнопка "+ Позиция" в строке главы → inline form под главой:
// | [наименование...] | [ед.] | [объём] | [цена] | = итого |
// Enter → POST /chapters/[cid]/items → добавить в таблицу

// Добавление новой главы:
// Кнопка "+ Глава" в шапке таблицы → POST /chapters
```

### 6.3. Поиск по смете

```tsx
// Input поиска над таблицей (debounce 300ms)
// Ищет по name позиций → раскрывает только главы с совпадениями
// Подсвечивает найденный текст в ячейке наименования
```

### 6.4. Команда для Claude Code

```
Создай компоненты иерархической таблицы сметы:

1. src/components/objects/estimates/EstimateTreeView.tsx
   — TanStack Table с раскрываемыми строками (expandedState)
   — Три уровня: Глава (level=0, жирный) / Раздел (level=1) / Позиция (level=2)
   — Итоговые строки по каждой главе (суммирование)
   — Колонки: №, Наименование, Ед., Объём, Цена, Итого, ФОТ, Материалы
   — Строки чётных/нечётных уровней — разные цвета фона

2. src/components/objects/estimates/EstimateItemCell.tsx
   — Ячейка с inline редактированием (click → Input, blur → save)
   — Только колонки volume и unitPrice редактируемы
   — totalPrice пересчитывается на клиенте сразу (optimistic)
   — После blur → PATCH /items/[id] → recalculate (POST /recalculate)

3. src/components/objects/estimates/EstimateChapterRow.tsx
   — Строка главы: кнопка раскрытия, название, итоговая сумма
   — Кнопка "+ Позиция" при ховере
   — Кнопка "+ Подраздел"
   — Меню: переименовать, удалить

4. src/hooks/useEstimateTree.ts
   — Загрузка данных: GET /estimate-versions/[vid]
   — Управление expandedState (все главы раскрыты по умолчанию)
   — Мутации: updateItem, addItem, addChapter, deleteItem, deleteChapter
   — Optimistic updates для редактирования
```

---

## Шаг 7 — Вкладка «Смета контракта» (День 12–13)

### 7.1. Сводная смета

```tsx
// src/components/objects/estimates/EstimateContractView.tsx

// Смета контракта = объединение нескольких версий смет
// Как в ЦУС: "Смета контракта" формируется из подписанных смет по договору

// Верхний блок — итоговые карточки:
// | Всего по смете | ФОТ | Материалы | Накладные |
// | 41 000 000 ₽  | 12М | 24М       | 5М        |

// Список включённых версий смет:
// | Версия сметы       | Сумма       | Добавить/Убрать |
// | ☑ Базовая 2024    | 40 000 000 ₽ |    ✓           |
// | ☑ Корректировка 1 |  1 000 000 ₽ |    ✓           |
// | ☐ Черновик        |  5 000 000 ₽ |                |

// Сводная таблица позиций (объединение выбранных версий)

// Кнопки:
// "Экспорт в Excel" → GET /estimate-contract/export
// "Привязать к КС-2" → открыть форму КС-2 с предзаполненными позициями
```

### 7.2. Экспорт в Excel

```typescript
// lib/estimates/export-excel.ts
import ExcelJS from 'exceljs';

export async function exportEstimateToExcel(versionId: string): Promise<Buffer> {
  const version = await db.estimateVersion.findUniqueOrThrow({
    where: { id: versionId },
    include: {
      chapters: {
        include: { items: { where: { isDeleted: false }, orderBy: { sortOrder: 'asc' } } },
        orderBy: { order: 'asc' }
      }
    }
  });

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Смета');

  // Заголовки
  sheet.columns = [
    { header: '№', key: 'num', width: 6 },
    { header: 'Наименование', key: 'name', width: 50 },
    { header: 'Ед.', key: 'unit', width: 8 },
    { header: 'Объём', key: 'volume', width: 10 },
    { header: 'Цена', key: 'price', width: 15 },
    { header: 'Итого', key: 'total', width: 15 },
    { header: 'ФОТ', key: 'labor', width: 15 },
    { header: 'Материалы', key: 'mat', width: 15 },
  ];

  // Заполнение данными по главам и позициям
  for (const chapter of version.chapters) {
    // Строка главы (жирная)
    const chapterRow = sheet.addRow({
      num: chapter.code,
      name: chapter.name,
      total: chapter.totalAmount,
    });
    chapterRow.font = { bold: true };
    chapterRow.fill = { type: 'pattern', pattern: 'solid',
                        fgColor: { argb: 'FFE8F4FD' } };

    // Строки позиций
    for (const [idx, item] of chapter.items.entries()) {
      sheet.addRow({
        num: `${chapter.code}.${idx + 1}`,
        name: item.name,
        unit: item.unit,
        volume: item.volume,
        price: item.unitPrice,
        total: item.totalPrice,
        labor: item.laborCost,
        mat: item.materialCost,
      });
    }
  }

  // Итоговая строка
  const totalRow = sheet.addRow({ name: 'ИТОГО:', total: version.totalAmount });
  totalRow.font = { bold: true, size: 12 };

  // Форматирование числовых ячеек
  sheet.getColumn('total').numFmt = '#,##0.00 ₽';
  sheet.getColumn('price').numFmt = '#,##0.00';
  sheet.getColumn('labor').numFmt = '#,##0.00 ₽';
  sheet.getColumn('mat').numFmt = '#,##0.00 ₽';

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
```

### 7.3. Команда для Claude Code

```
Создай компоненты вкладки «Смета контракта»:

1. src/components/objects/estimates/EstimateContractView.tsx
   — 4 KPI карточки вверху (итого, ФОТ, материалы, накладные)
   — Список версий смет с чекбоксами (включить/исключить из сметы контракта)
   — POST /estimate-contract { versionIds: [...] } для сохранения состава
   — Кнопка "Экспорт в Excel" → GET /estimate-contract/export → download

2. lib/estimates/export-excel.ts
   — Функция exportEstimateToExcel(versionId): Promise<Buffer>
   — ExcelJS (уже в проекте): главы — жирные строки, позиции — обычные
   — Итоговая строка, числовое форматирование в рублях

3. src/app/api/.../estimate-contract/export/route.ts
   — GET → вызывает exportEstimateToExcel → Response с Content-Disposition: attachment
```

---

## Шаг 8 — Вкладка «Сравнение смет» (День 14–15)

### 8.1. UI сравнения

```tsx
// src/components/objects/estimates/EstimateCompareView.tsx

// Два Select для выбора версий для сравнения
// Кнопка "Сравнить"

// Результат — таблица с diff:
// | Позиция        | V1 объём | V2 объём | Δ объём | V1 цена | V2 цена | Δ итого |
// | Разработка гр. |   1500   |   1800   |  +300 ▲ |  3200   |  3200   | +960 000 |
// | [+ Вывоз грунта]   —         1200       новая    —         2266    +2 719 200  |
// | [- Водопонижение]  500        —         удалена   4500      —       -2 250 000  |

// Цветовая индикация строк:
// Зелёный фон   = добавлено в V2
// Красный фон   = удалено из V2
// Жёлтый фон    = изменено (объём или цена)
// Без фона      = без изменений

// Итоговая строка:
// | ИТОГО V1: 40 000 000 ₽ | ИТОГО V2: 41 500 000 ₽ | Δ: +1 500 000 ₽ (+ 3.75%) |
```

### 8.2. Команда для Claude Code

```
Создай src/components/objects/estimates/EstimateCompareView.tsx.

Два Select для выбора версий (GET /estimate-versions → список).
Кнопка "Сравнить" → GET /estimate-versions/compare?v1=${v1}&v2=${v2}.

Таблица результатов:
- Строки ADDED: зелёный фон, значки "+" в колонке V1
- Строки REMOVED: красный фон, значки "-" в колонке V2
- Строки CHANGED: жёлтый фон, изменённые ячейки подсвечены
- Строки UNCHANGED: обычный фон

Под таблицей итоги:
- V1 итого, V2 итого, разница в рублях и процентах
- Badge: ▲ рост / ▼ снижение / = без изменений
```

---

## Шаг 9 — TypeScript и полировка (День 16)

```bash
npx tsc --noEmit
npx eslint . --quiet
```

### Финальный чеклист

```
□ После подтверждения импорта сметы → EstimateVersion создаётся автоматически
□ Список версий смет с типами и суммами
□ Иерархическая таблица: глава → раздел → позиция раскрывается корректно
□ Inline редактирование volume/unitPrice → totalPrice пересчитывается
□ Кнопка "Пересчитать" обновляет все итоги (главы + версия)
□ Копирование версии создаёт полную копию с главами и позициями
□ "Сделать базовой" — только одна версия может быть Baseline
□ Сравнение двух версий — зелёный/красный/жёлтый diff работает
□ Экспорт в Excel — файл скачивается с правильным форматированием
□ Смета контракта — выбор версий, итоговые суммы
□ TypeScript — нет ошибок (npx tsc --noEmit)
□ Все API проверяют organizationId
□ findMany с take/skip на EstimateItem (пагинация для больших смет)
```

---

## Итоговая структура файлов

```
src/
├── app/(dashboard)/objects/[objectId]/estimates/
│   ├── layout.tsx              ← Tabs: Сметы / Смета контракта / Сравнение
│   ├── list/page.tsx
│   ├── [versionId]/page.tsx
│   ├── contract/page.tsx
│   └── compare/page.tsx
│
├── app/api/projects/[projectId]/contracts/[contractId]/
│   ├── estimate-versions/
│   │   ├── route.ts
│   │   ├── compare/route.ts
│   │   └── [versionId]/
│   │       ├── route.ts
│   │       ├── copy/route.ts
│   │       ├── set-baseline/route.ts
│   │       ├── recalculate/route.ts
│   │       ├── chapters/
│   │       │   ├── route.ts
│   │       │   └── [chapterId]/
│   │       │       ├── route.ts
│   │       │       └── items/route.ts
│   │       └── items/[itemId]/route.ts
│   └── estimate-contract/
│       ├── route.ts
│       └── export/route.ts
│
├── components/objects/estimates/
│   ├── EstimateListView.tsx
│   ├── EstimateTreeView.tsx
│   ├── EstimateChapterRow.tsx
│   ├── EstimateItemCell.tsx
│   ├── EstimateContractView.tsx
│   └── EstimateCompareView.tsx
│
├── hooks/
│   └── useEstimateTree.ts
│
└── lib/estimates/
    ├── convert-import-to-version.ts   ← НОВОЕ
    ├── recalculate.ts                 ← НОВОЕ
    ├── compare-versions.ts            ← НОВОЕ
    ├── export-excel.ts                ← НОВОЕ
    ├── excel-parser.ts                ← уже есть ✅
    ├── xml-parser.ts                  ← уже есть ✅
    └── yandex-gpt.ts                  ← уже есть ✅
```

---

## Порядок задач в Claude Code (16 дней)

```
День 1–2:  Prisma-схема: EstimateVersion, EstimateChapter,
           EstimateItem, EstimateContract. Миграция.

День 3:    lib/estimates/convert-import-to-version.ts.
           Интеграция в /confirm роут.

День 4–5:  Все API роуты (версии, главы, позиции, контракт, экспорт, сравнение).
           lib/estimates/recalculate.ts и compare-versions.ts.

День 6:    URL /estimates/ layout + sidebar + redirect.

День 7:    EstimateListView (реестр версий, кнопки создания).

День 8–11: EstimateTreeView (иерархическая таблица с inline редактированием).
           Самый сложный шаг — выдели больше времени.

День 12–13: EstimateContractView + export-excel.ts.

День 14–15: EstimateCompareView (diff двух версий).

День 16:   npx tsc + eslint, loading/error.tsx, полировка.
```

> **Параллельные потоки (если нужно ускорить):**  
> Поток A: Дни 8–11 (EstimateTreeView — сложный UI)  
> Поток B: Дни 12–13 (EstimateContract + Export) + Дни 14–15 (Compare)  
> Так 16 дней → ~11 дней.

> Каждую задачу начинай с: `Прочитай CLAUDE.md и ROADMAP.md`
