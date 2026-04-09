# Модуль 13 — ТИМ (Технологии информационного моделирования): подробный план реализации

> Аналог: ЦУС → Модуль «ТИМ» (стр. 297–307 руководства)
> Текущее состояние: В ROADMAP модуль помечен как `⬜`, в `ObjectModuleSidebar.tsx` — отсутствует (нет даже `soon: true`). Prisma-схема не содержит моделей BIM. Модуль является **самым технически сложным** из всех — требует 3D-рендеринг IFC в браузере.
> **Ориентир: 4–6 недель (20–30 рабочих дней)**

---

## Что уже есть (переиспользуем)

```
Существующие модели:
  GanttTask, GanttVersion      — для привязки элементов ТИМ к позициям ГПР
  ExecutionDoc                  — для привязки АОСР ↔ элемент модели
  Defect                        — для привязки замечаний СК ↔ элемент модели
  Photo                         — полиморфная связь для фото элементов
  ProjectFolder, ProjectDocument — файловое хранилище (S3)

Существующая инфраструктура:
  Timeweb S3 (aws-sdk v3)       — хранение IFC-файлов
  BullMQ + Redis                — фоновая обработка (парсинг IFC)
  Socket.io (порт 3001)         — real-time обновления при загрузке
  react-pdf                     — паттерн встроенного просмотрщика
  ObjectModuleSidebar.tsx        — боковая навигация модулей
```

---

## Технологический стек для 3D-вьюера

### Выбор библиотеки IFC-рендеринга

| Библиотека | Описание | Выбор |
|-----------|----------|-------|
| `@ifc-viewer/core` | Production-ready BIM viewer, Three.js, IFC2x3 + IFC4 | **✅ Основной** |
| `web-ifc-three` | Официальный IFCLoader для Three.js | Fallback |
| `web-ifc` | Низкоуровневый парсер IFC (C++ → WASM) | Для серверного парсинга |

**Почему `@ifc-viewer/core`:** полнофункциональный вьюер из коробки — измерения, сечения, слои, выбор элементов, панель свойств. Не нужно писать навигацию камеры, выделение элементов, систему сечений с нуля.

```bash
npm install @ifc-viewer/core web-ifc three
```

### Архитектура обработки IFC

```
Пользователь загружает .ifc файл (100–500 МБ)
  → presigned S3 URL (как в ProjectDocument)
  → BullMQ job: parse-ifc
    → web-ifc (WASM): извлечь метаданные, GUID, структуру
    → Сохранить BimElement[] в БД
    → Уведомление: «Модель загружена»
  → Клиент загружает .ifc из S3 → @ifc-viewer/core рендерит в <canvas>
```

---

## Вкладки ЦУС (по PDF стр. 297)

```
Модели | Замечания к ЦИМ | Настройки доступа к ЦИМ
```

Внутри вьюера (по PDF стр. 299):
```
Панель элементов (структура, файлы, связанные модели)
Панель редактора (навигация, измерения, сечения, коллизии)
Панель свойств (Информация, ГПР, Связи, Файлы)
```

---

## Шаг 1 — Prisma-схема (День 1–2)

### 1.1. Новые enum-ы

```prisma
enum BimModelStatus {
  PROCESSING  // Загрузка/обработка
  READY       // Готова к просмотру
  ERROR       // Ошибка обработки
}

enum BimModelStage {
  OTR           // Обоснование технических решений
  PROJECT       // Проектная документация (П)
  WORKING       // Рабочая документация (Р)
  CONSTRUCTION  // В производство работ
}

enum BimAccessLevel {
  VIEW    // Просмотр
  ADD     // Добавление
  EDIT    // Редактирование
  DELETE  // Удаление
}
```

### 1.2. Новые модели

```prisma
/// Раздел ТИМ-моделей (иерархическое дерево, ЦУС стр. 298)
model BimSection {
  id       String  @id @default(uuid())
  name     String
  order    Int     @default(0)

  parentId String?
  parent   BimSection?  @relation("BimSectionTree", fields: [parentId], references: [id])
  children BimSection[] @relation("BimSectionTree")

  projectId      String
  buildingObject BuildingObject @relation(fields: [projectId], references: [id], onDelete: Cascade)

  models BimModel[]

  createdAt DateTime @default(now())

  @@index([projectId])
  @@index([parentId])
  @@map("bim_sections")
}

/// ТИМ-модель (IFC-файл, ЦУС стр. 298-299)
model BimModel {
  id        String         @id @default(uuid())
  name      String
  comment   String?
  status    BimModelStatus @default(PROCESSING)
  stage     BimModelStage?
  isCurrent Boolean        @default(true) // Актуальная версия

  sectionId String
  section   BimSection @relation(fields: [sectionId], references: [id], onDelete: Cascade)

  projectId      String
  buildingObject BuildingObject @relation(fields: [projectId], references: [id], onDelete: Cascade)

  uploadedById String
  uploadedBy   User @relation("BimModelUploader", fields: [uploadedById], references: [id])

  // S3
  s3Key       String   // Ключ IFC-файла в Timeweb S3
  fileName    String   // Оригинальное имя файла
  fileSize    Int?     // Размер в байтах
  ifcVersion  String?  // "IFC2X3" | "IFC4"

  // Метаданные из парсинга
  elementCount Int?     // Количество элементов
  metadata     Json?    // Доп. данные из IFC (проект, автор, ПО)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  versions     BimModelVersion[]
  elements     BimElement[]
  elementLinks BimElementLink[]

  @@index([projectId])
  @@index([sectionId])
  @@index([projectId, isCurrent])
  @@map("bim_models")
}

/// Версия модели (ЦУС стр. 297 — «Версии модели»)
model BimModelVersion {
  id        String  @id @default(uuid())
  version   Int     // 1, 2, 3...
  name      String  // "Версия 1", "Версия 2"
  comment   String?
  isCurrent Boolean @default(false)

  modelId String
  model   BimModel @relation(fields: [modelId], references: [id], onDelete: Cascade)

  s3Key    String
  fileName String
  fileSize Int?

  uploadedById String
  uploadedBy   User @relation("BimVersionUploader", fields: [uploadedById], references: [id])

  createdAt DateTime @default(now())

  @@index([modelId])
  @@map("bim_model_versions")
}

/// Элемент ТИМ-модели (парсится из IFC, ЦУС стр. 304 — Информация/Параметры)
model BimElement {
  id          String  @id @default(uuid())
  ifcGuid     String  // IFC GlobalId (22 символа)
  ifcType     String  // IfcWall, IfcSlab, IfcColumn и т.д.
  name        String?
  description String?
  layer       String? // Слой IFC
  level       String? // Этаж / уровень
  properties  Json?   // IFC PropertySets (Pset_QuantityTakeOff и т.д.)

  modelId String
  model   BimModel @relation(fields: [modelId], references: [id], onDelete: Cascade)

  links BimElementLink[]

  @@unique([modelId, ifcGuid])
  @@index([modelId])
  @@index([ifcGuid])
  @@map("bim_elements")
}

/// Связь элемента модели с сущностями системы (ЦУС стр. 305-307)
model BimElementLink {
  id String @id @default(uuid())

  elementId String
  element   BimElement @relation(fields: [elementId], references: [id], onDelete: Cascade)

  modelId String
  model   BimModel @relation(fields: [modelId], references: [id], onDelete: Cascade)

  // Полиморфная связь (как Photo)
  entityType String  // "GanttTask" | "ExecutionDoc" | "Defect"
  entityId   String

  createdAt DateTime @default(now())

  @@unique([elementId, entityType, entityId])
  @@index([elementId])
  @@index([entityType, entityId])
  @@index([modelId])
  @@map("bim_element_links")
}

/// Настройки доступа к ЦИМ (ЦУС стр. 298)
model BimAccess {
  id    String         @id @default(uuid())
  level BimAccessLevel

  userId    String
  user      User @relation("BimAccessUser", fields: [userId], references: [id])

  projectId      String
  buildingObject BuildingObject @relation(fields: [projectId], references: [id], onDelete: Cascade)

  stage  BimModelStage?
  status String?        // Согласована | Утверждена | На согласовании | На проверке | На доработке

  createdAt DateTime @default(now())

  @@index([projectId])
  @@index([userId])
  @@map("bim_access")
}
```

### 1.3. Связи в существующих моделях

```prisma
// В model BuildingObject:
bimSections  BimSection[]
bimModels    BimModel[]
bimAccess    BimAccess[]

// В model User:
bimModelsUploaded     BimModel[]        @relation("BimModelUploader")
bimVersionsUploaded   BimModelVersion[] @relation("BimVersionUploader")
bimAccess             BimAccess[]       @relation("BimAccessUser")
```

### 1.4. Команда для Claude Code

```
Прочитай CLAUDE.md и ROADMAP.md. Добавь в prisma/schema.prisma:

1. Enums: BimModelStatus, BimModelStage, BimAccessLevel
2. Модели: BimSection, BimModel, BimModelVersion, BimElement, BimElementLink, BimAccess
3. Связи в BuildingObject (3) и User (3)

npx prisma migrate dev --name add_module13_tim
npx prisma generate
```

---

## Шаг 2 — URL, layout и sidebar (День 3)

### 2.1. Файловая структура

```
src/app/(dashboard)/objects/[objectId]/
  tim/
    layout.tsx                ← Tabs: 3 вкладки по ЦУС
    page.tsx                  ← redirect → /tim/models
    models/
      page.tsx                ← Вкладка «Модели»
      [modelId]/
        page.tsx              ← 3D-вьюер модели (полноэкранный)
    issues/
      page.tsx                ← Вкладка «Замечания к ЦИМ»
    access/
      page.tsx                ← Вкладка «Настройки доступа к ЦИМ»
```

### 2.2. Layout с 3 вкладками

```tsx
const TIM_TABS = [
  { label: 'Модели',              href: 'models' },
  { label: 'Замечания к ЦИМ',     href: 'issues' },
  { label: 'Настройки доступа',   href: 'access' },
];
```

### 2.3. Добавить в ObjectModuleSidebar

```tsx
// Добавить в MODULES:
{ label: 'ТИМ', href: 'tim', icon: Box }, // Box из lucide-react (или Boxes)
```

### 2.4. Команда для Claude Code

```
Прочитай CLAUDE.md.

1. Создай tim/layout.tsx (3 вкладки, паттерн из resources/layout.tsx)
2. Создай tim/page.tsx → redirect /tim/models
3. Создай все 3 page.tsx + models/[modelId]/page.tsx
4. В ObjectModuleSidebar.tsx добавь пункт «ТИМ» с icon: Box
5. Добавь loading.tsx в каждую директорию
```

---

## Шаг 3 — API-роуты (День 4–5)

### 3.1. Структура API

```
# Разделы (иерархическое дерево)
GET    /api/projects/[pid]/bim/sections                          — дерево разделов
POST   /api/projects/[pid]/bim/sections                          — создать раздел
PATCH  /api/projects/[pid]/bim/sections/[sid]                    — переименовать
DELETE /api/projects/[pid]/bim/sections/[sid]                    — удалить

# Модели
GET    /api/projects/[pid]/bim/models                            — список моделей
POST   /api/projects/[pid]/bim/models                            — загрузить модель
GET    /api/projects/[pid]/bim/models/[mid]                      — данные модели
DELETE /api/projects/[pid]/bim/models/[mid]                      — удалить
POST   /api/projects/[pid]/bim/models/[mid]/upload-version       — новая версия

# Элементы (после парсинга)
GET    /api/projects/[pid]/bim/models/[mid]/elements             — список элементов (?search=)
GET    /api/projects/[pid]/bim/models/[mid]/elements/[eid]       — свойства элемента

# Связи элемент ↔ сущность
POST   /api/projects/[pid]/bim/links                             — создать связь
DELETE /api/projects/[pid]/bim/links/[lid]                       — удалить связь
GET    /api/projects/[pid]/bim/links?entityType=GanttTask        — связи по типу
GET    /api/projects/[pid]/bim/links?elementId=xxx               — связи элемента

# Замечания к ЦИМ
GET    /api/projects/[pid]/bim/issues                            — реестр (из Defect с bimElementId)

# Настройки доступа
GET    /api/projects/[pid]/bim/access                            — список прав
POST   /api/projects/[pid]/bim/access                            — добавить права
DELETE /api/projects/[pid]/bim/access/[aid]                      — удалить

# Presigned URL для загрузки IFC
POST   /api/projects/[pid]/bim/models/presigned-url              — получить presigned URL для S3
```

### 3.2. Загрузка модели (ключевая логика)

```typescript
// POST /api/projects/[pid]/bim/models
// 1. Валидация: файл .ifc, размер < 500MB
// 2. Presigned URL → клиент загружает в S3 напрямую
// 3. Создать BimModel (status: PROCESSING)
// 4. BullMQ job: parse-ifc { modelId, s3Key }
//    → web-ifc (WASM) на сервере:
//      a. Скачать IFC из S3
//      b. Извлечь все IfcElement → BimElement[] (batch insert)
//      c. Извлечь метаданные (ifcVersion, elementCount, проект)
//      d. Обновить BimModel status: READY
//    → Notification автору
// 5. Ответ клиенту: { modelId, status: 'PROCESSING' }
```

### 3.3. Команда для Claude Code

```
Прочитай CLAUDE.md. Создай все API роуты модуля ТИМ:

1. bim/sections: CRUD для дерева разделов (parentId для иерархии)
2. bim/models: GET, POST, DELETE, upload-version, presigned-url
3. bim/models/[mid]/elements: GET (?search=, ?ifcType=)
4. bim/links: POST, DELETE, GET (?entityType=, ?elementId=)
5. bim/issues: GET (join Defect + BimElementLink)
6. bim/access: CRUD

Загрузка: presigned S3 URL → клиент → BullMQ parse-ifc.
Проверка organizationId во всех роутах. findMany с take/skip.
```

---

## Шаг 4 — BullMQ Worker для парсинга IFC (День 6–7)

### 4.1. Worker

```typescript
// src/workers/parse-ifc.worker.ts
// Зависимости: web-ifc (WASM парсер)
//
// 1. Скачать IFC из S3 во временный файл
// 2. Открыть через web-ifc IfcAPI
// 3. Получить все элементы:
//    const lines = ifcApi.GetAllLines(modelID);
//    for (const lineID of lines) {
//      const type = ifcApi.GetLine(modelID, lineID).type;
//      const guid = ifcApi.GetLine(modelID, lineID).GlobalId?.value;
//      // Сохранить в BimElement
//    }
// 4. Batch insert через Prisma createMany
// 5. Обновить BimModel: status=READY, elementCount, ifcVersion
// 6. Удалить временный файл
// 7. Создать Notification
```

### 4.2. Установка зависимостей

```bash
npm install web-ifc
# web-ifc содержит WASM, работает и в Node.js и в браузере
```

### 4.3. Команда для Claude Code

```
Прочитай CLAUDE.md. Создай BullMQ worker для парсинга IFC:

1. src/workers/parse-ifc.worker.ts
   — Скачать IFC из S3 (aws-sdk v3)
   — Парсить через web-ifc IfcAPI (WASM)
   — Извлечь элементы: ifcGuid, ifcType, name, layer, level, properties
   — Batch insert BimElement через Prisma createMany
   — Обновить BimModel status=READY

2. src/lib/queues/parse-ifc.queue.ts (паттерн из notification.worker.ts)

3. Регистрация в src/workers/index.ts
```

---

## Шаг 5 — Вкладка «Модели» (День 8–9)

### 5.1. Компоненты (ЦУС стр. 297-298)

```
src/components/objects/tim/
  ModelsView.tsx                ← Панель с деревом разделов (лево) + реестр версий (право)
  SectionTree.tsx               ← Дерево разделов с CRUD (+ / ⋮ / Добавить подчинённый)
  ModelVersionsTable.tsx        ← TanStack Table версий модели (по ЦУС)
  UploadModelDialog.tsx         ← Загрузка IFC (раздел, наименование, комментарий, dropzone)
  ModelStatusBadge.tsx          ← PROCESSING (spinner) / READY (зелёный) / ERROR (красный)
```

### 5.2. Layout двухпанельный (по ЦУС стр. 297)

```
┌──────────────────────────────────────────────────┐
│  Модели    Замечания к ЦИМ    Настройки доступа  │
├───────────────┬──────────────────────────────────│
│ Разделы    [+]│  Версии модели  3   [+ Загрузить]│
│  ├ АР и КЖ   │  Версия 1  Нет  02.04.2025       │
│  └ 2025     ⋮ │  Версия 2  Нет  16.04.2025       │
│ ИОС         ⋮ │  Версия 3  Да   16.04.2025       │
│ Проверка    ⋮ │                                  │
└───────────────┴──────────────────────────────────┘
```

### 5.3. Команда для Claude Code

```
Прочитай CLAUDE.md. Создай вкладку «Модели»:

1. ModelsView.tsx — двухпанельный layout
   Левая панель (240px): SectionTree (дерево разделов)
   Правая панель: ModelVersionsTable (версии выбранного раздела)
   Кнопка «Загрузить версию модели» → UploadModelDialog

2. SectionTree.tsx — рекурсивное дерево
   [+] создать раздел, ⋮ → Добавить подчинённый / Переименовать / Удалить
   Клик на раздел → фильтр правой панели

3. UploadModelDialog.tsx — Dialog:
   Раздел (авто), Наименование, Комментарий, Dropzone для .ifc
   POST /presigned-url → прямая загрузка в S3 → POST /models

4. ModelStatusBadge.tsx — статус обработки
   PROCESSING → Spinner + "Обработка..."
   READY → зелёный Badge
   ERROR → красный Badge

5. Подключи в tim/models/page.tsx
```

---

## Шаг 6 — 3D-вьюер IFC (День 10–14) ⭐ Ключевой шаг

### 6.1. Компонент вьюера

```
src/components/objects/tim/
  IfcViewer.tsx                 ← Основной 3D-вьюер (обёртка @ifc-viewer/core)
  ViewerToolbar.tsx             ← Панель инструментов (навигация, измерения, сечения)
  ElementPropertiesPanel.tsx    ← Правая панель свойств элемента
  GprLinkPanel.tsx              ← Вкладка «ГПР» в панели свойств
  DocumentLinkPanel.tsx         ← Вкладка «Связи» → Все документы / Замечания СК
  TimelineSlider.tsx            ← Временная шкала ГПР внизу экрана
```

### 6.2. IfcViewer — интеграция @ifc-viewer/core

```tsx
// src/components/objects/tim/IfcViewer.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';

// @ifc-viewer/core загружается только на клиенте (Three.js + WASM)
// Используем dynamic import с ssr: false

interface Props {
  modelId: string;
  s3Url: string; // presigned URL для скачивания IFC
  projectId: string;
}

export function IfcViewer({ modelId, s3Url, projectId }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedElement, setSelectedElement] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Динамический import (Three.js не работает в SSR)
    import('@ifc-viewer/core').then(({ createIFCViewer }) => {
      const viewer = createIFCViewer({
        container: containerRef.current!,
        onElementSelected: (element) => {
          setSelectedElement(element.ifcGuid);
        },
      });

      // Загрузить модель из S3
      fetch(s3Url)
        .then(res => res.arrayBuffer())
        .then(buffer => viewer.loadModel(buffer));
    });
  }, [s3Url]);

  return (
    <div className="flex h-[calc(100vh-120px)]">
      {/* 3D Canvas */}
      <div ref={containerRef} className="flex-1" />

      {/* Правая панель свойств */}
      {selectedElement && (
        <ElementPropertiesPanel
          modelId={modelId}
          ifcGuid={selectedElement}
          projectId={projectId}
        />
      )}
    </div>
  );
}
```

### 6.3. Цветовая индикация по статусу ИД (из ROADMAP)

```
Серый   — элемент без привязки к ИД (нет связи BimElementLink)
Зелёный — работы выполнены, АОСР подписан (ExecutionDoc.status = SIGNED)
Жёлтый  — АОСР на согласовании (ExecutionDoc.status = REVIEW)
Красный — работы не завершены по ГПР (GanttTask.actualEnd = null)
```

### 6.4. Панель свойств элемента (ЦУС стр. 304-307)

Вкладки внутри правой панели:
```
Информация — IFC PropertySets (Pset_QuantityTakeOff, Pset_RampCommon и т.д.)
ГПР        — версии ГПР → позиции → кнопка «Привязать» / «Отвязать»
Связи      — Все документы / Замечания СК / Замечания к элементу
Файлы      — прикреплённые файлы
```

### 6.5. Временная шкала ГПР (ЦУС стр. 305)

```tsx
// TimelineSlider.tsx
// Горизонтальный slider с датами Plan/Fact
// При перемещении бегунка: элементы с незавершёнными работами → красные
// Элементы с завершёнными работами → серые (перестают подсвечиваться)
```

### 6.6. Команда для Claude Code

```
Прочитай CLAUDE.md. Создай 3D-вьюер IFC:

1. npm install @ifc-viewer/core web-ifc three @types/three

2. IfcViewer.tsx — обёртка @ifc-viewer/core:
   — dynamic import (ssr: false)
   — Загрузка IFC из presigned S3 URL
   — Обработка onElementSelected → ifcGuid
   — Цветовая индикация: серый/зелёный/жёлтый/красный по статусу ИД

3. ElementPropertiesPanel.tsx — правая панель 320px:
   4 вкладки: Информация | ГПР | Связи | Файлы
   GET /api/.../bim/models/[mid]/elements/[eid]

4. GprLinkPanel.tsx — вкладка «ГПР»:
   Select версия ГПР → список позиций → кнопка «Привязать»
   POST /api/.../bim/links { elementId, entityType: 'GanttTask', entityId }

5. DocumentLinkPanel.tsx — вкладка «Связи»:
   Accordion: Все документы | Замечания СК | Замечания к элементу
   Кнопка [+] → Select из ExecutionDoc / Defect → POST /bim/links

6. TimelineSlider.tsx — input range + даты ГПР
   При перемещении → цветовая индикация элементов

7. Подключи в tim/models/[modelId]/page.tsx (полноэкранный вьюер)
```

---

## Шаг 7 — Замечания к ЦИМ + Настройки доступа (День 15–16)

### 7.1. Замечания к ЦИМ (ЦУС стр. 307)

```
src/components/objects/tim/
  BimIssuesRegistry.tsx         ← Реестр замечаний (TanStack Table)
```

Это Defect-ы, привязанные к BimElement через BimElementLink. Колонки: №, Порядковый №, Модель, Дата, Кем выдано, Ответственный, Тип, Срок устранения, Дата выдачи, Статус.

### 7.2. Настройки доступа (ЦУС стр. 298)

```
src/components/objects/tim/
  BimAccessSettings.tsx         ← Реестр прав доступа
  AddBimAccessDialog.tsx        ← Добавить права (пользователь, стадия, статус, тип доступа)
```

### 7.3. Команда для Claude Code

```
Прочитай CLAUDE.md.

1. BimIssuesRegistry.tsx — TanStack Table
   JOIN Defect + BimElementLink WHERE entityType='Defect'
   Колонки по ЦУС стр. 307

2. BimAccessSettings.tsx — TanStack Table прав доступа
   Кнопка «Добавить права» → AddBimAccessDialog

3. AddBimAccessDialog.tsx — Dialog:
   Select пользователь, Select стадия (ОТР/П/Р/В производство),
   Select статус модели, чекбоксы: Просмотр/Добавление/Редактирование/Удаление

4. Подключи в tim/issues/page.tsx и tim/access/page.tsx
```

---

## Шаг 8 — Коллизии и сравнение версий (День 17–18)

### 8.1. Обнаружение коллизий (ЦУС стр. 303)

```
src/components/objects/tim/
  CollisionDetector.tsx          ← Настройка проверок (пересечение/дублирование)
  CollisionResultsList.tsx       ← Список найденных коллизий с деталями
```

Коллизии вычисляются на клиенте через Three.js raycasting / bounding box intersection. Два типа: пересечение геометрии и дублирование элементов.

### 8.2. Сравнение версий (ЦУС стр. 303-304)

```
src/components/objects/tim/
  VersionCompare.tsx             ← Выбор двух версий для сравнения
  VersionDiffViewer.tsx          ← Визуализация: добавленные/удалённые/изменённые элементы
```

Сравнение по ifcGuid между двумя версиями:
- Зелёный — добавленные элементы
- Красный — удалённые
- Оранжевый — изменённые атрибуты
- Жёлтый — изменённая геометрия

### 8.3. Команда для Claude Code

```
Прочитай CLAUDE.md.

1. CollisionDetector.tsx:
   — Выбор типа проверки (пересечение / дублирование)
   — Параметры допусков
   — Three.js Box3 intersection для обнаружения
   — Список результатов с Информацией (GUID, слой, координаты)

2. VersionCompare.tsx:
   — Select двух версий
   — GET /api/.../bim/models/[mid]/elements для каждой версии
   — Diff по ifcGuid: added / removed / modified
   — Цветовая индикация на модели

3. Экспорт отчёта сравнения в xlsx (exceljs)
```

---

## Шаг 9 — Интеграция с nanoCAD BIM, Renga, Pilot-BIM (День 19–20)

### 9.1. Поддержка форматов

StroyDocs работает с IFC — это открытый формат, который поддерживают все российские BIM-системы:

| Система | Экспорт в IFC | Примечание |
|---------|:---:|---|
| nanoCAD BIM | ✅ | Экспорт IFC2x3 / IFC4 |
| Renga | ✅ | Экспорт IFC4 |
| Pilot-BIM | ✅ | Загружает IFC для просмотра |
| Revit | ✅ | Основной мировой стандарт |
| ArchiCAD | ✅ | IFC2x3 / IFC4 |

Нам не нужны отдельные парсеры — все системы экспортируют IFC. Достаточно:
- Документировать workflow: «Откройте nanoCAD BIM → Файл → Экспорт → IFC → Загрузите в StroyDocs»
- В UploadModelDialog добавить подсказку с поддерживаемыми системами

### 9.2. Команда для Claude Code

```
Прочитай CLAUDE.md.

1. В UploadModelDialog.tsx добавь:
   — Accept: .ifc, .ifcXML, .ifcZIP
   — Текст: «Поддерживаются модели из nanoCAD BIM, Renga, Pilot-BIM, Revit, ArchiCAD»
   — Select «Источник модели» (опционально): nanoCAD / Renga / Revit / Другое

2. Добавь в ROADMAP.md отметки ✅ для реализованных пунктов Модуля 13
```

---

## Шаг 10 — Финализация (День 20+)

### 10.1. Checklist

```
1. npx tsc --noEmit — проверка типов
2. loading.tsx + error.tsx для всех страниц
3. Проверка organizationId во всех API
4. findMany с take/skip
5. Добавить миграцию в scripts/start.sh (если применялась через db push)
6. Мобильная вёрстка (вьюер — только десктоп, остальные вкладки — адаптивные)
7. next.config.js — transpilePackages: ['web-ifc', '@ifc-viewer/core', 'three']
8. WASM файлы: web-ifc.wasm → скопировать в public/
```

---

## Итоговая структура файлов

```
src/
├── app/(dashboard)/objects/[objectId]/tim/
│   ├── layout.tsx                        ← 3 вкладки
│   ├── page.tsx                          ← redirect
│   ├── models/page.tsx + [modelId]/page.tsx
│   ├── issues/page.tsx
│   └── access/page.tsx
│
├── app/api/projects/[projectId]/bim/
│   ├── sections/route.ts + [sectionId]/route.ts
│   ├── models/
│   │   ├── route.ts
│   │   ├── presigned-url/route.ts
│   │   └── [modelId]/
│   │       ├── route.ts
│   │       ├── upload-version/route.ts
│   │       └── elements/route.ts + [elementId]/route.ts
│   ├── links/route.ts + [linkId]/route.ts
│   ├── issues/route.ts
│   └── access/route.ts + [accessId]/route.ts
│
├── components/objects/tim/
│   ├── ModelsView.tsx
│   ├── SectionTree.tsx
│   ├── ModelVersionsTable.tsx
│   ├── UploadModelDialog.tsx
│   ├── ModelStatusBadge.tsx
│   ├── IfcViewer.tsx                     ← 3D-вьюер (ssr:false)
│   ├── ViewerToolbar.tsx
│   ├── ElementPropertiesPanel.tsx
│   ├── GprLinkPanel.tsx
│   ├── DocumentLinkPanel.tsx
│   ├── TimelineSlider.tsx
│   ├── CollisionDetector.tsx
│   ├── CollisionResultsList.tsx
│   ├── VersionCompare.tsx
│   ├── VersionDiffViewer.tsx
│   ├── BimIssuesRegistry.tsx
│   ├── BimAccessSettings.tsx
│   └── AddBimAccessDialog.tsx
│
└── workers/
    └── parse-ifc.worker.ts               ← BullMQ парсинг IFC
```

---

## Порядок задач в Claude Code (4–6 недель)

```
Неделя 1:
  День 1–2:  Prisma-схема (6 моделей, 3 enum-а, связи)
  День 3:    URL/layout/sidebar (3 вкладки)
  День 4–5:  API-роуты (sections, models, elements, links, access)

Неделя 2:
  День 6–7:  BullMQ worker parse-ifc (web-ifc WASM)
  День 8–9:  Вкладка «Модели» (дерево + таблица + загрузка)

Неделя 3–4:
  День 10–14: 3D-вьюер IFC ⭐ (самый сложный шаг)
              — @ifc-viewer/core интеграция
              — Панель свойств с 4 вкладками
              — Цветовая индикация по статусу ИД
              — Привязка к ГПР с таймлайном

Неделя 5:
  День 15–16: Замечания к ЦИМ + Настройки доступа
  День 17–18: Коллизии + Сравнение версий

Неделя 6:
  День 19–20: Интеграция nanoCAD/Renga, финализация, TypeScript, тесты
```

> **Важно:** Шаг 6 (3D-вьюер) — самый рискованный. `@ifc-viewer/core` может
> иметь проблемы с Next.js SSR и WASM. Рекомендуется начать с минимального
> прототипа: загрузка IFC → рендер в canvas → выбор элемента → показ GUID.
> Только после работающего прототипа добавлять привязки к ГПР/ИД/СК.

> **Совет:** каждую задачу начинай с `Прочитай CLAUDE.md и ROADMAP.md` —
> это даёт Claude Code полный контекст стека и архитектурных решений.
