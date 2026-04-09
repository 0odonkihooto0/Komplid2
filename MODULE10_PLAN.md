# Модуль 10 — Исполнительная документация (ИД): подробный план доработки

> Аналог: ЦУС → Модуль «Исполнительная документация» (стр. 238–264 руководства)  
> Текущее состояние: АОСР/ОЖР/АВК/АТГ генерация ✅, КС-2/КС-3 ✅, реестр ИД + пакетный экспорт ✅, штамп «Копия верна» ✅. Страница `/objects/[objectId]/id/page.tsx` → `ObjectIdModule` с вкладками АОСР/ОЖР · КС-2/КС-3 · Дефекты СК.  
> В `ObjectModuleSidebar.tsx` пункт «ИД» помечен `soon: true`.  
> **Ориентир: 2 недели (доработка существующего)**

---

## Что уже есть (переиспользуем)

```
model ExecutionDoc {
  id, type (AOSR | OZR | TECHNICAL_READINESS_ACT), status, number, title
  s3Key, fileName, generatedAt
  contractId → Contract, workRecordId → WorkRecord?
  overrideFields, overrideHtml (TipTap), lastEditedAt, lastEditedById
  signatures → Signature[], comments → DocComment[]
  approvalRoute → ApprovalRoute?, ganttLinks → GanttTaskExecDoc[]
}

model Signature { id, signatureType, s3Key, signedAt, userId, executionDocId }

model DocComment {
  id, text, pageNumber, positionX, positionY, status (OPEN | RESOLVED)
  executionDocId, authorId, resolvedById
}

model ApprovalRoute { id, status, currentStepIdx, steps → ApprovalStep[] }

model IdRegistry { id, name, s3Key, fileName, sheetCount, generatedAt, contractId }

model ArchiveDocument {
  id, category, fileName, s3Key, sheetNumber, cipher, issueDate
  certifiedCopy, certifiedByName, certifiedByPos, certifiedS3Key
}

Существующие компоненты:
  src/components/modules/objects/ObjectIdModule.tsx    ← Tabs: АОСР/ОЖР | КС-2/КС-3 | Дефекты
  src/components/modules/execution-docs/ExecutionDocsTable.tsx
  src/components/modules/execution-docs/AosrRegistryTable.tsx
  src/components/modules/execution-docs/useAosrRegistry.ts
  src/components/modules/execution-docs/useExecutionDocDetail.ts
  src/components/modules/ks2/Ks2Table.tsx
  src/lib/pdf/id-registry-generator.ts                ← Handlebars + Puppeteer
  src/lib/pdf/ks2-pdf-generator.ts
  src/app/api/.../execution-docs/[docId]/generate-pdf/route.ts
  src/app/api/.../id-registry/[registryId]/generate/route.ts
  src/app/api/.../execution-docs/batch-create/route.ts

Существующие страницы:
  /objects/[objectId]/id/page.tsx                      ← ObjectIdModule
  /projects/[pid]/contracts/[cid]/ → вкладки ИД, КС-2, Реестр ИД, Реестр АОСР
```

---

## Задачи Модуля 10 (по ROADMAP)

```
⬜ Визуализация дерева согласования с таймстампами
⬜ Штамп производства работ на PDF (координаты X/Y, типы)
⬜ QR-код на документе (привязка ИД ↔ чертежу ПД)
⬜ Аналитика ИД: % готовности по разделам ГПР
⬜ XML-экспорт по схемам Минстроя — обязателен по ГОСТ Р 70108-2025
⬜ Закрывающая документация: финальный пакет ИД для сдачи объекта
⬜ Режим «хранения» ЭОЖР (запрет редактирования)
⬜ Классификация ИД на три группы по ГОСТ
```

---

## Шаг 1 — Расширение Prisma-схемы (День 1)

### 1.1. Дополнения в существующие модели

```prisma
// Добавить в model ExecutionDoc:
qrToken       String?   @unique  // UUID для QR-кода (ссылка на публичную страницу)
qrCodeS3Key   String?            // Ключ PNG QR-кода в S3
storageMode   Boolean   @default(false) // Режим хранения (запрет редактирования)
storageModeAt DateTime?          // Дата перевода в хранение
idCategory    IdCategory? // Классификация по ГОСТ Р 70108-2025

// Штамп производства работ на PDF
stampType     String?   // Тип штампа: "work_permit" | "certified_copy" | "qr_stamp"
stampX        Float?    // X-координата штампа (в пунктах от левого края)
stampY        Float?    // Y-координата штампа
stampPage     Int?      // Номер страницы для штампа
stampS3Key    String?   // Ключ PDF с наложенным штампом

// XML-экспорт
xmlExportedAt DateTime? // Дата последнего XML-экспорта
xmlS3Key      String?   // Ключ XML-файла в S3
```

### 1.2. Новые enum-ы

```prisma
/// Классификация ИД по ГОСТ Р 70108-2025
enum IdCategory {
  ACCOUNTING_JOURNAL  // Журналы учёта (ЭОЖР, ЭСЖР)
  INSPECTION_ACT      // Акты освидетельствования (АОСР, АВК)
  OTHER_ID            // Иная исполнительная документация
}
```

### 1.3. Новая модель — Закрывающий пакет ИД

```prisma
/// Закрывающий пакет ИД для сдачи объекта
model IdClosurePackage {
  id          String   @id @default(uuid())
  number      String                         // Номер пакета
  name        String                         // Наименование
  status      String   @default("DRAFT")     // DRAFT | ASSEMBLED | EXPORTED | ACCEPTED
  notes       String?

  // Состав пакета (массив ID документов)
  executionDocIds String[]                   // Список ExecutionDoc.id
  registryIds     String[]                   // Список IdRegistry.id
  archiveDocIds   String[]                   // Список ArchiveDocument.id

  // Итоговый PDF-пакет
  s3Key       String?
  fileName    String?
  exportedAt  DateTime?

  projectId      String
  buildingObject BuildingObject @relation(fields: [projectId], references: [id], onDelete: Cascade)

  createdById String
  createdBy   User @relation("ClosurePackageCreator", fields: [createdById], references: [id])

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([projectId])
  @@map("id_closure_packages")
}
```

### 1.4. Связи в существующих моделях

```prisma
// Добавить в BuildingObject:
closurePackages IdClosurePackage[]

// Добавить в User:
closurePackagesCreated IdClosurePackage[] @relation("ClosurePackageCreator")
```

### 1.5. Команда для Claude Code

```
Прочитай CLAUDE.md и ROADMAP.md. В prisma/schema.prisma:

1. В ExecutionDoc добавь: qrToken (String? @unique), qrCodeS3Key,
   storageMode (Boolean @default(false)), storageModeAt, idCategory (IdCategory?),
   stampType, stampX, stampY, stampPage, stampS3Key, xmlExportedAt, xmlS3Key

2. Добавь enum IdCategory (ACCOUNTING_JOURNAL, INSPECTION_ACT, OTHER_ID)

3. Добавь модель IdClosurePackage с привязкой к BuildingObject и User

4. npx prisma migrate dev --name add_module10_id_enhancements
   npx prisma generate
```

---

## Шаг 2 — Рефакторинг layout и sidebar (День 2)

### 2.1. Расширение вкладок ObjectIdModule

Текущие вкладки: `АОСР / ОЖР` | `КС-2 / КС-3` | `Дефекты СК`

Добавить: `Аналитика` | `Реестры` | `Закрывающий пакет`

```tsx
// src/components/modules/objects/ObjectIdModule.tsx — расширить Tabs:
<TabsList>
  <TabsTrigger value="docs">АОСР / ОЖР</TabsTrigger>
  <TabsTrigger value="ks2">КС-2 / КС-3</TabsTrigger>
  <TabsTrigger value="defects">Дефекты СК</TabsTrigger>
  <TabsTrigger value="analytics">Аналитика</TabsTrigger>     {/* НОВОЕ */}
  <TabsTrigger value="registries">Реестры</TabsTrigger>       {/* НОВОЕ */}
  <TabsTrigger value="closure">Закрывающий пакет</TabsTrigger> {/* НОВОЕ */}
</TabsList>
```

### 2.2. Убрать `soon: true` в ObjectModuleSidebar

```tsx
// src/components/objects/ObjectModuleSidebar.tsx
// Было:
{ label: 'ИД', href: 'id', icon: FileText, soon: true },
// Стало:
{ label: 'ИД', href: 'id', icon: FileText },
```

### 2.3. Команда для Claude Code

```
Прочитай CLAUDE.md.

1. В ObjectIdModule.tsx добавь 3 новых вкладки: Аналитика, Реестры, Закрывающий пакет
2. В ObjectModuleSidebar.tsx убери soon: true у пункта «ИД»
3. Подготовь заглушки-компоненты:
   IdAnalyticsView.tsx, IdRegistriesView.tsx, IdClosureView.tsx
```

---

## Шаг 3 — Визуализация дерева согласования (День 2–3)

### 3.1. Компонент ApprovalTree

```tsx
// src/components/modules/execution-docs/ApprovalTree.tsx
// Вертикальная timeline дерево:
// ┌─ Шаг 1: Представитель СК — Иванов И.И. ✅ 12.03.2025 14:30
// │  Комментарий: "Замечаний нет"
// ├─ Шаг 2: Представитель ТехНадзора — Петров П.П. ✅ 13.03.2025 09:15
// │  Комментарий: "Утверждено"
// ├─ Шаг 3: ГИП — Сидоров С.С. ⏳ Ожидает
// └─ Шаг 4: Заказчик — ... ⬜ Не начат

// Данные: ApprovalRoute + steps с decidedAt таймстампами
// Используем shadcn Card + lucide-react иконки (Check, Clock, Circle)
```

### 3.2. Интеграция

Показывать ApprovalTree в карточке ExecutionDoc (на вкладке «Согласование» или как раскрывающаяся панель).

### 3.3. Команда для Claude Code

```
Создай src/components/modules/execution-docs/ApprovalTree.tsx:
— Вертикальная timeline (как в GitHub PR reviews)
— Для каждого ApprovalStep: роль, ФИО, статус (✅/⏳/❌/⬜), дата/время, комментарий
— Используй shadcn Card + цветовые индикаторы (зелёный/жёлтый/красный/серый)

Подключи ApprovalTree в useExecutionDocDetail — добавь загрузку approvalRoute.steps
Покажи ApprovalTree в карточке документа ИД (рядом с секцией подписей)
```

---

## Шаг 4 — QR-код на документе ИД (День 3–4)

### 4.1. Логика

QR-код кодирует URL публичной страницы верификации: `https://stroydocs.ru/docs/verify/{qrToken}`. При сканировании — показывает: номер документа, статус, дату подписания, подписанты.

### 4.2. API

```
POST /api/projects/[pid]/contracts/[cid]/execution-docs/[docId]/qr
  — генерирует UUID qrToken
  — создаёт PNG QR-кода через библиотеку qrcode
  — сохраняет в S3, записывает qrToken + qrCodeS3Key
  — возвращает { qrToken, qrImageUrl }

GET /api/docs/verify/[qrToken]  (без auth — публичный!)
  — находит ExecutionDoc по qrToken
  — возвращает: номер, тип, статус, дата, подписанты (без конфиденциальных данных)
```

### 4.3. Публичная страница верификации

```
src/app/(public)/docs/verify/[token]/page.tsx
— Server Component (без auth)
— Показывает: логотип StroyDocs, номер документа, статус, дату подписания
— Если подписан — зелёный бейдж "Документ подтверждён"
— Если нет — жёлтый "Документ на согласовании"
— Если не найден — "Документ не найден"
```

### 4.4. Наложение QR на PDF (штамп)

```typescript
// src/lib/pdf/qr-stamp.ts
// Используем pdf-lib для наложения QR-кода на существующий PDF:
// 1. Загружаем PDF из S3 (s3Key документа)
// 2. Загружаем PNG QR-кода из S3
// 3. Встраиваем изображение на указанную страницу (stampPage) в координаты (stampX, stampY)
// 4. Сохраняем новый PDF → S3 (stampS3Key)
```

### 4.5. Команда для Claude Code

```
Прочитай CLAUDE.md. Создай QR-коды для документов ИД:

1. npm install qrcode pdf-lib (если не установлены)

2. POST /api/.../execution-docs/[docId]/qr/route.ts
   — генерация QR (qrcode.toBuffer), сохранение в S3
   — запись qrToken, qrCodeS3Key в ExecutionDoc

3. GET /api/docs/verify/[token]/route.ts (без auth)
   — поиск ExecutionDoc по qrToken
   — возврат публичных данных

4. src/app/(public)/docs/verify/[token]/page.tsx
   — Server Component, публичная верификация

5. src/lib/pdf/qr-stamp.ts — наложение QR на PDF через pdf-lib
   — embedPng на указанной странице в координатах (x, y)
   — сохранение результата в stampS3Key

6. Кнопку «QR-код» добавь в карточку ExecutionDoc
   (рядом с кнопками «Скачать PDF» и «Подписать»)
```

---

## Шаг 5 — Штамп производства работ на PDF (День 4–5)

### 5.1. Типы штампов

```typescript
// Три типа штампов:
// 1. "work_permit" — Штамп «Разрешение на производство работ» (координаты X/Y на чертеже)
// 2. "certified_copy" — Штамп «Копия верна» (уже реализован в ArchiveDocument)
// 3. "qr_stamp" — QR-код (из Шага 4)
```

### 5.2. UI для позиционирования штампа

```tsx
// src/components/modules/execution-docs/StampPositioner.tsx
// PDF-превьюер (react-pdf) + drag-and-drop позиционирование штампа:
// 1. Пользователь видит PDF
// 2. Выбирает тип штампа (Select)
// 3. Кликает по месту на PDF → устанавливает координаты (stampX, stampY)
// 4. Выбирает страницу (stampPage)
// 5. Нажимает «Наложить» → POST /stamp
// 6. Получает PDF с наложенным штампом
```

### 5.3. Команда для Claude Code

```
Прочитай CLAUDE.md. Создай функциональность штампов на PDF:

1. src/lib/pdf/stamp-overlay.ts
   — функция overlayStamp(pdfBuffer, stampType, x, y, page, stampData)
   — используй pdf-lib для наложения текста/изображения на PDF
   — stampType 'work_permit': текстовый блок с датой, номером, ФИО
   — stampType 'certified_copy': текст "КОПИЯ ВЕРНА" + ФИО + дата

2. POST /api/.../execution-docs/[docId]/stamp/route.ts
   — принимает { stampType, x, y, page }
   — загружает PDF из S3, накладывает штамп, сохраняет stampS3Key

3. src/components/modules/execution-docs/StampPositioner.tsx
   — react-pdf просмотрщик + клик для установки координат
   — Select типа штампа
   — Кнопка «Наложить» → POST /stamp
```

---

## Шаг 6 — Аналитика ИД: % готовности по разделам ГПР (День 5–6)

### 6.1. Виджеты аналитики (по ЦУС стр. 263)

```tsx
// src/components/modules/execution-docs/IdAnalyticsView.tsx

// Виджет 1: Готовность ИД по разделам ГПР (Recharts BarChart)
// — ось X: разделы/стадии ГПР (GanttStage.name)
// — ось Y: % готовности = подписанные АОСР / всего задач ГПР
// — цвет: зелёный (>80%), жёлтый (50-80%), красный (<50%)

// Виджет 2: Статусы актов (Recharts PieChart)
// — DRAFT / IN_REVIEW / SIGNED / REJECTED — по количеству

// Виджет 3: ИД по авторам (горизонтальный BarChart)
// — ось Y: ФИО автора
// — ось X: количество актов (stacked: подписан / на согласовании / черновик)

// Виджет 4: Замечания (Recharts)
// — Активные vs Закрытые (DocComment.status)
// — По авторам замечаний

// API:
// GET /api/projects/[pid]/id-analytics
//   — агрегация по ExecutionDoc + GanttTask + DocComment
```

### 6.2. Команда для Claude Code

```
Прочитай CLAUDE.md. Создай аналитику ИД:

1. GET /api/projects/[projectId]/id-analytics/route.ts
   — Агрегация: количество ИД по статусам, по авторам, по стадиям ГПР
   — Расчёт % готовности: SIGNED АОСР / total GanttTasks по стадии
   — Агрегация замечаний: активные vs закрытые, по авторам

2. src/components/modules/execution-docs/IdAnalyticsView.tsx
   — 4 виджета на Recharts (паттерн из GprAnalytics)
   — Готовность по ГПР, Статусы актов, ИД по авторам, Замечания

3. Подключи IdAnalyticsView в ObjectIdModule (вкладка «Аналитика»)
```

---

## Шаг 7 — Классификация ИД по ГОСТ Р 70108-2025 (День 6–7)

### 7.1. Три группы

ГОСТ Р 70108-2025 классифицирует ИД на три группы:
1. **Журналы учёта** (ЭОЖР, ЭСЖР) — `ACCOUNTING_JOURNAL`
2. **Акты освидетельствования** (АОСР, АВК, АТГ) — `INSPECTION_ACT`
3. **Иная ИД** (КС-2, КС-3, исполнительные схемы, протоколы) — `OTHER_ID`

### 7.2. Автоклассификация

```typescript
// src/lib/id-classification.ts
export function classifyExecutionDoc(type: ExecutionDocType): IdCategory {
  switch (type) {
    case 'OZR': return 'ACCOUNTING_JOURNAL';
    case 'AOSR': case 'TECHNICAL_READINESS_ACT': return 'INSPECTION_ACT';
    default: return 'OTHER_ID';
  }
}
// Вызывать при создании ExecutionDoc (в POST route)
```

### 7.3. Фильтрация в UI

Добавить Select «Группа ИД» в ExecutionDocsTable и ObjectIdModule для фильтрации по `idCategory`.

### 7.4. Команда для Claude Code

```
Прочитай CLAUDE.md.

1. Создай src/lib/id-classification.ts с функцией classifyExecutionDoc
2. В POST execution-docs/route.ts — вызывай classifyExecutionDoc при создании
3. В ExecutionDocsTable.tsx — добавь Select фильтр по idCategory
4. В ObjectIdModule.tsx — добавь бейджи категории рядом с типом документа
```

---

## Шаг 8 — XML-экспорт по схемам Минстроя (День 7–8)

### 8.1. Формат

Минстрой опубликовал XML-схемы для АОСР, ОЖР, ЖВК и других форм. Это машиночитаемый формат, обязательный для передачи данных в ИСУП и ГСН.

### 8.2. Генератор XML

```typescript
// src/lib/xml/aosr-xml-generator.ts
import { create } from 'xmlbuilder2';

export function generateAosrXml(doc: ExecutionDocWithRelations): string {
  const root = create({ version: '1.0', encoding: 'UTF-8' })
    .ele('AOSR', { xmlns: 'urn:minstroyrf:aosr:1.0' })
      .ele('Номер').txt(doc.number).up()
      .ele('Дата').txt(formatDate(doc.createdAt)).up()
      .ele('Работы')
        .ele('Наименование').txt(doc.workRecord?.workItem?.name || '').up()
        .ele('Место').txt(doc.workRecord?.location || '').up()
        .ele('ДатаНачала').txt(formatDate(doc.workRecord?.startDate)).up()
        .ele('ДатаОкончания').txt(formatDate(doc.workRecord?.date)).up()
      .up()
      // ... участники, материалы, подписи
    .up();
  return root.end({ prettyPrint: true });
}
```

### 8.3. API

```
POST /api/.../execution-docs/[docId]/export-xml
  — генерирует XML по схеме Минстроя
  — сохраняет в S3 (xmlS3Key)
  — записывает xmlExportedAt
  — возвращает { xmlS3Key, downloadUrl }

POST /api/projects/[pid]/id-export-batch
  — пакетный XML-экспорт всех подписанных ИД объекта
  — создаёт ZIP-архив с XML-файлами
```

### 8.4. Команда для Claude Code

```
Прочитай CLAUDE.md. Создай XML-экспорт ИД по схемам Минстроя:

1. npm install xmlbuilder2

2. src/lib/xml/aosr-xml-generator.ts
   — функция generateAosrXml(doc) → XML-строка
   — формат: элементы Номер, Дата, Работы, Участники, Материалы, Подписи

3. src/lib/xml/ozr-xml-generator.ts
   — функция generateOzrXml(doc) → XML-строка

4. POST /api/.../execution-docs/[docId]/export-xml/route.ts
   — генерация XML, сохранение в S3

5. POST /api/projects/[pid]/id-export-batch/route.ts
   — ZIP-архив XML всех SIGNED документов

6. Кнопку «Экспорт XML» добавь в карточку документа и в ObjectIdModule
```

---

## Шаг 9 — Закрывающий пакет ИД (День 9)

### 9.1. Логика

Закрывающий пакет — финальная сборка всех ИД для сдачи объекта. Включает: реестр ИД, все подписанные акты (АОСР, ОЖР, КС), исполнительные схемы, сертификаты.

### 9.2. Компоненты

```tsx
// src/components/modules/execution-docs/IdClosureView.tsx

// Шаг 1: Выбор документов для пакета
//   — Чекбоксы: все SIGNED ExecutionDoc, IdRegistry, ArchiveDocument
//   — Фильтры: по типу, по договору, по стадии ГПР
//   — Автовыбор: кнопка «Выбрать все подписанные»

// Шаг 2: Предпросмотр состава пакета
//   — Таблица: № | Тип | Номер | Название | Статус
//   — Индикатор полноты: «Выбрано 47 из 52 документов (90%)»

// Шаг 3: Генерация
//   — Кнопка «Сформировать пакет» → POST /closure-packages
//   — Прогресс-бар (генерация может занять время)
//   — Результат: ZIP-архив с PDF + XML + реестр

// Статусы пакета: DRAFT → ASSEMBLED → EXPORTED → ACCEPTED
```

### 9.3. Команда для Claude Code

```
Прочитай CLAUDE.md. Создай закрывающий пакет ИД:

1. GET /api/projects/[pid]/closure-packages/route.ts — список
   POST — создать пакет (с массивами executionDocIds, registryIds, archiveDocIds)

2. POST /api/projects/[pid]/closure-packages/[id]/generate/route.ts
   — Собирает все PDF из S3, XML-экспорт подписанных
   — Генерирует реестр (id-registry-generator)
   — Создаёт ZIP-архив → S3

3. src/components/modules/execution-docs/IdClosureView.tsx
   — Wizard: выбор документов → предпросмотр → генерация
   — Паттерн из LrvWizard (Модуль 8)

4. Подключи IdClosureView в ObjectIdModule (вкладка «Закрывающий пакет»)
```

---

## Шаг 10 — Режим хранения ЭОЖР + полировка (День 10)

### 10.1. Режим хранения

```typescript
// В POST/PATCH execution-docs:
if (doc.storageMode) {
  return errorResponse('Документ в режиме хранения — редактирование запрещено', 403);
}

// POST /api/.../execution-docs/[docId]/storage/route.ts
// Переводит документ в режим хранения (необратимо без ADMIN)
// Только для OZR (ЭОЖР)
```

### 10.2. Финальная команда

```
Проверь весь Модуль 10:
1. npx tsc --noEmit — исправь все TypeScript-ошибки
2. Проверь organizationId в каждом API роуте
3. Проверь storageMode в POST/PATCH execution-docs
4. Добавь loading.tsx и error.tsx
5. Публичная страница /docs/verify/[token] НЕ требует auth
6. findMany с take/skip
7. Добавь миграцию в scripts/start.sh
```

---

## Итоговая структура файлов

```
src/
├── app/(dashboard)/objects/[objectId]/id/
│   └── page.tsx                          ← ObjectIdModule (расширенный)
│
├── app/(public)/docs/verify/
│   └── [token]/page.tsx                  ← Публичная верификация QR
│
├── app/api/projects/[projectId]/
│   ├── id-analytics/route.ts             ← GET
│   ├── id-export-batch/route.ts          ← POST (пакетный XML)
│   └── closure-packages/
│       ├── route.ts                      ← GET, POST
│       └── [id]/
│           ├── route.ts                  ← GET, PATCH, DELETE
│           └── generate/route.ts         ← POST
│
├── app/api/.../execution-docs/[docId]/
│   ├── qr/route.ts                       ← POST (генерация QR)
│   ├── stamp/route.ts                    ← POST (наложение штампа)
│   ├── export-xml/route.ts               ← POST (XML-экспорт)
│   └── storage/route.ts                  ← POST (режим хранения)
│
├── app/api/docs/verify/[token]/route.ts  ← GET (публичный, без auth)
│
├── components/modules/execution-docs/
│   ├── ApprovalTree.tsx                  ← Дерево согласования
│   ├── StampPositioner.tsx               ← Позиционирование штампа
│   ├── IdAnalyticsView.tsx               ← 4 виджета Recharts
│   ├── IdClosureView.tsx                 ← Wizard закрывающего пакета
│   └── IdCategoryBadge.tsx               ← Бейдж классификации ГОСТ
│
├── lib/
│   ├── id-classification.ts              ← Автоклассификация по ГОСТ
│   ├── pdf/
│   │   ├── qr-stamp.ts                   ← Наложение QR на PDF
│   │   └── stamp-overlay.ts              ← Штамп производства работ
│   └── xml/
│       ├── aosr-xml-generator.ts         ← XML АОСР
│       └── ozr-xml-generator.ts          ← XML ОЖР
```

---

## Порядок задач в Claude Code (10 дней)

```
День 1:    "Прочитай CLAUDE.md и ROADMAP.md. Добавь в prisma/schema.prisma
            поля в ExecutionDoc (qrToken, storageMode, idCategory, stamp*, xml*),
            enum IdCategory, модель IdClosurePackage. Выполни миграцию."

День 2:    "Расширь ObjectIdModule — добавь 3 вкладки (Аналитика, Реестры,
            Закрывающий пакет). Убери soon: true у ИД в ObjectModuleSidebar."

День 2–3:  "Создай ApprovalTree.tsx — визуализация дерева согласования
            с таймстампами. Подключи в карточку ExecutionDoc."

День 3–4:  "Создай QR-коды: API qr/route.ts, публичная страница
            /docs/verify/[token], lib/pdf/qr-stamp.ts (pdf-lib)."

День 4–5:  "Создай штамп на PDF: lib/pdf/stamp-overlay.ts,
            API stamp/route.ts, StampPositioner.tsx (react-pdf + клик)."

День 5–6:  "Создай аналитику ИД: API id-analytics, IdAnalyticsView
            с 4 виджетами Recharts."

День 6–7:  "Создай классификацию по ГОСТ: id-classification.ts,
            фильтр в ExecutionDocsTable, бейджи IdCategoryBadge."

День 7–8:  "Создай XML-экспорт: xmlbuilder2, aosr-xml-generator,
            ozr-xml-generator, API export-xml + id-export-batch."

День 9:    "Создай закрывающий пакет: API closure-packages,
            IdClosureView (Wizard), генерация ZIP."

День 10:   "Режим хранения ЭОЖР (API storage/route.ts).
            npx tsc --noEmit, loading/error, миграция в start.sh."
```

> **Совет:** каждую задачу начинай с `Прочитай CLAUDE.md и ROADMAP.md` —  
> это даёт Claude Code полный контекст стека и архитектурных решений.
