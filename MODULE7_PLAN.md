# Модуль 7 — ГПР (График производства работ): подробный план

> Аналог: ЦУС → Модуль «ГПР» (стр. 139–204 руководства)  
> Вкладки: **Структура графиков · График (Ганта) · Аналитика · Версии · Стадии · Суточный · План освоения · Сравнение**  
> Ориентир: **3–4 недели**

---

## Что уже есть (переиспользуем полностью)

```
GanttVersion     → версии ГПР (isBaseline, isActive, contractId)            ✅
GanttTask        → задачи (planStart/End, factStart/End, progress, isCritical, parentId) ✅
GanttDependencyType → FS / SS / FF / SF                                      ✅
GanttTaskStatus  → NOT_STARTED / IN_PROGRESS / COMPLETED / DELAYED           ✅

GanttChart.tsx   → компонент с gantt-task-react, drag-and-drop, FS-каскад    ✅
GanttTaskPanel.tsx → боковая панель редактирования задачи                    ✅
converters.ts    → convertToGanttLibTasks(), calculatePlannedProgress()      ✅
useGantt.ts      → хуки загрузки и мутаций (разбит на 3 файла по аудиту)    ✅

API роуты (существующие):
GET/POST /api/projects/[id]/contracts/[cid]/gantt-versions
GET/PATCH/DELETE /api/.../gantt-versions/[vid]
GET/POST/PATCH/DELETE /api/.../gantt-versions/[vid]/tasks
POST /api/.../gantt-versions/[vid]/tasks/[tid]/dependencies
```

---

## Что нужно создать

```
1. GanttStage       → стадии реализации объекта (СМР, ПИР, Подготовка)
2. GanttDailyPlan   → суточный график (бригады, техника)
3. GanttMasterVersion → сборная версия из нескольких стадий

4. URL /objects/[id]/gpr/ + полный layout с 8 вкладками
5. Вкладка «Структура графиков» — сводная таблица стадий и версий
6. Вкладка «Аналитика» — S-кривые, план/факт, отклонения
7. Вкладка «Версии графика» — управление версиями
8. Вкладка «Стадии реализации» — CRUD стадий
9. Вкладка «Суточный график» — планирование по дням
10. Вкладка «План освоения» — помесячный план + экспорт Excel
11. Вкладка «Сравнение версий» — diff двух версий
12. Раздел «ИД и СК» — индикатор готовности ИД по позиции ГПР
13. Импорт из сметы (EstimateVersion → GanttTask)
14. Привязка к объекту (не договору) — миграция GanttVersion
```

---

## Шаг 1 — Доработка Prisma-схемы (День 1–2)

### 1.1. Новые модели

```prisma
// prisma/schema.prisma

/// Стадия реализации объекта (СМР, ПИР, Монтаж, Пуско-наладка)
model GanttStage {
  id          String   @id @default(uuid())
  name        String                          // Наименование стадии
  order       Int      @default(0)            // Порядок отображения
  isCurrent   Boolean  @default(false)        // Текущая активная стадия

  projectId   String
  project     BuildingObject @relation(fields: [projectId], references: [id], onDelete: Cascade)

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  versions    GanttVersion[]

  @@index([projectId])
  @@map("gantt_stages")
}

/// Запись суточного графика
model GanttDailyPlan {
  id          String   @id @default(uuid())
  planDate    DateTime                         // Дата
  taskId      String
  task        GanttTask @relation(fields: [taskId], references: [id], onDelete: Cascade)

  // Ресурсы на день
  workers     Int?                             // Количество рабочих
  machinery   String?                          // Техника (текстовое описание)
  volume      Float?                           // Объём работ на день
  unit        String?                          // Единица измерения
  notes       String?

  createdById String
  createdBy   User    @relation(fields: [createdById], references: [id])

  createdAt   DateTime @default(now())

  @@index([taskId])
  @@index([planDate])
  @@map("gantt_daily_plans")
}
```

### 1.2. Изменения в существующих моделях

```prisma
// Добавить в GanttVersion:
stageId     String?
stage       GanttStage? @relation(fields: [stageId], references: [id])

// Директивная версия (для ЦУС: "Директивная")
isDirective Boolean @default(false)

// Версия привязана к объекту (не только к договору)
projectId   String?
project     BuildingObject? @relation(fields: [projectId], references: [id])

// Описание версии
description String?

// Добавить в GanttTask:
// Директивные даты (из базовой версии — неизменяемые)
directiveStart DateTime?
directiveEnd   DateTime?

// Объём работ
volume      Float?
volumeUnit  String?

// Сумма (из сметы)
amount      Float?

// Веха (задача с нулевой продолжительностью)
isMilestone Boolean @default(false)

// Календарь (рабочие дни)
calendarType String? // STANDARD / CUSTOM

// Привязка к ИД (количество актов)
linkedExecutionDocsCount Int @default(0)

// Привязка к позиции сметы
estimateItemId String?
estimateItem   EstimateItem? @relation(fields: [estimateItemId], references: [id])

dailyPlans GanttDailyPlan[]

// Добавить в BuildingObject (Project):
ganttStages  GanttStage[]
ganttVersions GanttVersion[]  // прямая связь с объектом
```

### 1.3. Команда для Claude Code

```
Прочитай CLAUDE.md. Добавь в prisma/schema.prisma:
- модель GanttStage (с привязкой к BuildingObject)
- модель GanttDailyPlan (с привязкой к GanttTask и User)

В GanttVersion добавь поля: stageId, isDirective, projectId, description
В GanttTask добавь поля: directiveStart, directiveEnd, volume, volumeUnit,
  amount, isMilestone, estimateItemId, linkedExecutionDocsCount

В BuildingObject добавь: ganttStages GanttStage[], ganttVersions GanttVersion[]

npx prisma migrate dev --name add_module7_gpr_stages_daily
npx prisma generate
```

---

## Шаг 2 — URL и layout (День 3)

### 2.1. Файловая структура

```
src/app/(dashboard)/objects/[objectId]/gpr/
  layout.tsx          ← Tabs: 8 вкладок
  page.tsx            ← redirect → /gpr/structure
  structure/
    page.tsx          ← Структура графиков (главная)
  schedule/
    page.tsx          ← График производства работ (Ганта)
  analytics/
    page.tsx          ← Аналитика
  versions/
    page.tsx          ← Версии графика
  stages/
    page.tsx          ← Стадии реализации
  daily/
    page.tsx          ← Суточный график
  mastering/
    page.tsx          ← План освоения
  compare/
    page.tsx          ← Сравнение версий
```

### 2.2. Layout с 8 вкладками

```tsx
// src/app/(dashboard)/objects/[objectId]/gpr/layout.tsx
const GPR_TABS = [
  { label: 'Структура',    href: 'structure' },
  { label: 'График',       href: 'schedule' },
  { label: 'Аналитика',   href: 'analytics' },
  { label: 'Версии',       href: 'versions' },
  { label: 'Стадии',       href: 'stages' },
  { label: 'Суточный',     href: 'daily' },
  { label: 'План освоения', href: 'mastering' },
  { label: 'Сравнение',   href: 'compare' },
];
```

### 2.3. Убрать TODO-заглушку

```tsx
// Заменить содержимое objects/[objectId]/gpr/page.tsx:
import { redirect } from 'next/navigation';
export default function GprPage({ params }) {
  redirect(`/objects/${params.objectId}/gpr/structure`);
}
```

### 2.4. Команда для Claude Code

```
Создай файловую структуру Модуля 7:
- src/app/(dashboard)/objects/[objectId]/gpr/layout.tsx (8 Tabs)
- src/app/(dashboard)/objects/[objectId]/gpr/page.tsx (redirect → /structure)
- src/app/(dashboard)/objects/[objectId]/gpr/structure/page.tsx
- src/app/(dashboard)/objects/[objectId]/gpr/schedule/page.tsx
- src/app/(dashboard)/objects/[objectId]/gpr/analytics/page.tsx
- src/app/(dashboard)/objects/[objectId]/gpr/versions/page.tsx
- src/app/(dashboard)/objects/[objectId]/gpr/stages/page.tsx
- src/app/(dashboard)/objects/[objectId]/gpr/daily/page.tsx
- src/app/(dashboard)/objects/[objectId]/gpr/mastering/page.tsx
- src/app/(dashboard)/objects/[objectId]/gpr/compare/page.tsx

В ObjectModuleSidebar.tsx убери метку "скоро" у пункта "ГПР"
и обнови href на "gpr/structure".
```

---

## Шаг 3 — API роуты (День 4–5)

### 3.1. Стадии

```
GET    /api/projects/[id]/gantt-stages           — список стадий
POST   /api/projects/[id]/gantt-stages           — создать стадию
PATCH  /api/projects/[id]/gantt-stages/[sid]     — обновить (name, order, isCurrent)
DELETE /api/projects/[id]/gantt-stages/[sid]     — удалить
```

### 3.2. Версии (расширение существующих)

```
GET    /api/projects/[id]/gantt-versions         — список всех версий по объекту
POST   /api/projects/[id]/gantt-versions         — создать версию
PATCH  /api/projects/[id]/gantt-versions/[vid]   — обновить
POST   /api/projects/[id]/gantt-versions/[vid]/copy        — скопировать версию
POST   /api/projects/[id]/gantt-versions/[vid]/set-directive — сделать директивной
POST   /api/projects/[id]/gantt-versions/[vid]/fill-from/[sourceVid] — заполнить из другой
POST   /api/projects/[id]/gantt-versions/[vid]/import-from-estimate  — из сметы
```

### 3.3. Импорт из сметы

```typescript
// POST /api/projects/[id]/gantt-versions/[vid]/import-from-estimate
// Body: { estimateVersionId: string }

export async function importFromEstimate(versionId: string, estimateVersionId: string) {
  const estimateVersion = await db.estimateVersion.findUniqueOrThrow({
    where: { id: estimateVersionId },
    include: {
      chapters: {
        include: { items: { where: { isDeleted: false }, orderBy: { sortOrder: 'asc' } } },
        orderBy: { order: 'asc' }
      }
    }
  });

  const today = new Date();
  let sortOrder = 0;

  await db.$transaction(async (tx) => {
    for (const chapter of estimateVersion.chapters) {
      // Глава → родительская задача ГПР
      const parentTask = await tx.ganttTask.create({
        data: {
          name: chapter.name,
          versionId,
          sortOrder: sortOrder++,
          level: 0,
          planStart: today,
          planEnd: addDays(today, 30), // Заглушка — редактируется вручную
          amount: chapter.totalAmount,
          status: 'NOT_STARTED',
        }
      });

      // Позиции главы → дочерние задачи
      for (const item of chapter.items) {
        if (item.itemType !== 'WORK') continue; // Материалы пропускаем
        await tx.ganttTask.create({
          data: {
            name: item.name,
            versionId,
            parentId: parentTask.id,
            sortOrder: sortOrder++,
            level: 1,
            planStart: today,
            planEnd: addDays(today, 14),
            volume: item.volume,
            volumeUnit: item.unit,
            amount: item.totalPrice,
            estimateItemId: item.id,
            status: 'NOT_STARTED',
          }
        });
      }
    }
  });
}
```

### 3.4. Суточный график

```
GET    /api/projects/[id]/gantt-versions/[vid]/daily?date=2025-03-01  — план на дату
POST   /api/projects/[id]/gantt-versions/[vid]/daily                   — добавить запись
PATCH  /api/projects/[id]/gantt-versions/[vid]/daily/[did]             — обновить
DELETE /api/projects/[id]/gantt-versions/[vid]/daily/[did]             — удалить
```

### 3.5. План освоения

```
GET  /api/projects/[id]/gantt-versions/[vid]/mastering
     ?year=2025&groupBy=month  — помесячный план освоения

// Возвращает:
{
  months: [
    {
      month: "2025-01",
      planAmount: 1200000,   // Плановая сумма по задачам этого месяца
      factAmount: 980000,    // Фактически освоено (из КС-2)
      tasks: GanttTask[]     // Задачи активные в этом месяце
    }
  ],
  totalPlan: 12000000,
  totalFact: 8500000,
}
```

### 3.6. Сравнение версий

```
GET  /api/projects/[id]/gantt-versions/compare?v1=uuid1&v2=uuid2

// Алгоритм:
// Сопоставить задачи по name (нечёткое совпадение)
// Вернуть: added[], removed[], changed[], unchanged[]
// changed = задачи где изменились planStart, planEnd или amount
```

### 3.7. Аналитика

```
GET  /api/projects/[id]/gantt-versions/[vid]/analytics
     ?startDate=2025-01-01&endDate=2025-12-31

// Возвращает данные для 4 виджетов:
// 1. S-кривая: { date, plannedProgress, actualProgress }[]
// 2. Отклонение по срокам: { task, plannedDays, actualDays, delta }[]
// 3. Критический путь: { tasks: GanttTask[] }
// 4. Готовность ИД по позиции: { task, linkedDocsCount, signedDocsCount }[]
```

### 3.8. Команда для Claude Code

```
Создай API роуты Модуля 7:

1. /api/projects/[id]/gantt-stages/route.ts — GET, POST
2. /api/projects/[id]/gantt-stages/[stageId]/route.ts — PATCH, DELETE

3. /api/projects/[id]/gantt-versions/route.ts — GET (по проекту), POST
4. /api/projects/[id]/gantt-versions/[vid]/copy/route.ts — POST
5. /api/projects/[id]/gantt-versions/[vid]/set-directive/route.ts — POST
6. /api/projects/[id]/gantt-versions/[vid]/fill-from/[sourceVid]/route.ts — POST
7. /api/projects/[id]/gantt-versions/[vid]/import-from-estimate/route.ts — POST

8. /api/projects/[id]/gantt-versions/[vid]/daily/route.ts — GET, POST
9. /api/projects/[id]/gantt-versions/[vid]/daily/[dailyId]/route.ts — PATCH, DELETE

10. /api/projects/[id]/gantt-versions/[vid]/mastering/route.ts — GET
11. /api/projects/[id]/gantt-versions/compare/route.ts — GET (?v1=&v2=)
12. /api/projects/[id]/gantt-versions/[vid]/analytics/route.ts — GET

Создай lib/gantt/import-from-estimate.ts с функцией importFromEstimate().
Создай lib/gantt/compare-versions.ts с алгоритмом диффа.
Создай lib/gantt/critical-path.ts с расчётом критического пути.
```

---

## Шаг 4 — Вкладка «Структура графиков» (День 6)

### 4.1. Главная страница модуля ГПР

```tsx
// src/components/objects/gpr/GanttStructureView.tsx

// Сводная таблица всех стадий и версий объекта
// Аналог: страница "Структура графиков" в ЦУС

// Верхний блок — стадии (кнопки-переключатели):
// [СМР] [ПИР] [Монтаж] [Пуско-наладка]  [+ Добавить стадию]

// Таблица версий выбранной стадии:
// | Название версии | Тип | Актуальная | Plan начало | Plan конец | Сумма | Выпол. % | Действия |
// | Директивный ГПР | 📌  | —          | 01.01.2025  | 31.12.2025 | 40М   | 65%      | ⋮ |
// | Актуальная v2   | ✓   | Да         | 15.01.2025  | 15.01.2026 | 42М   | 62%      | ⋮ |

// Actions меню:
// Открыть, Сделать директивной, Заполнить из..., Копировать, Удалить

// Кнопки создания:
// "+ Создать пустой ГПР"
// "+ Заполнить из сметы" → выбор EstimateVersion → importFromEstimate
```

### 4.2. Команда для Claude Code

```
Создай src/components/objects/gpr/GanttStructureView.tsx.

Данные: GET /api/projects/${id}/gantt-stages (стадии)
        GET /api/projects/${id}/gantt-versions (версии по объекту, фильтр по stageId)

Верхний ряд: кнопки-табы стадий. Клик → фильтр версий.
Кнопка "+ Добавить стадию" → Dialog с полем name.

Таблица версий: название, тип (Badge: DIRECTIVE=жёлтый/ACTIVE=зелёный),
isCurrent (чекбокс readonly), planStart/End, totalAmount, progress (%).

Actions меню: Открыть (→ /gpr/schedule?versionId=),
Сделать директивной (POST /set-directive),
Заполнить из сметы (Dialog: SELECT EstimateVersion → POST /import-from-estimate),
Копировать (POST /copy), Удалить.

Кнопка "+ Создать ГПР" → POST /gantt-versions.
```

---

## Шаг 5 — Вкладка «График» (Ганта) (День 7–9)

### 5.1. GanttChart уже работает — нужно интегрировать

Компонент `GanttChart.tsx` уже существует. Нужно:
- Подключить к новому URL `/gpr/schedule`
- Добавить выбор версии и стадии
- Добавить раздел «ИД и СК»
- Добавить кнопку «Автозаполнение из видов работ»

```tsx
// src/app/(dashboard)/objects/[objectId]/gpr/schedule/page.tsx

// Верхняя панель:
// [Выбор стадии ▾] [Выбор версии ▾]  [День/Неделя/Месяц/Год]
// [+ Добавить задачу] [Из видов работ] [Из сметы]
// [Разделы: Координация | Диаграмма Ганта | План-факт | Закрытие | ИД и СК]

// Основной контент: GanttChart (уже есть ✅)

// Правая боковая панель: GanttTaskPanel (уже есть ✅)
```

### 5.2. Раздел «ИД и СК» в таблице задач

```tsx
// В каждой строке задачи показывать колонку "Документы":
// 📄 3 / 🔴 1  ← 3 ИД привязано, 1 не подписан

// Клик → Sheet со списком ИД:
// | АОСР-47 | Монтаж арматуры оси 5 | ✅ Подписан |
// | АОСР-48 | Монтаж арматуры оси 6 | ⏳ На согласовании |

// Кнопка "+ Привязать ИД" → Combobox поиска ExecutionDoc
// POST /gantt-versions/[vid]/tasks/[tid]/link-exec-doc { execDocId }
```

### 5.3. Директивный план на Ганте

```tsx
// Если версия заполнена из директивной → показывать жёлтую полоску
// под основной полоской задачи (как в ЦУС)

// В настройках Ганта Toggle:
// [x] Показывать директивный план (жёлтый)
// [x] Показывать критический путь (красный)
// [x] Показывать зависимости

// Технически: вторая Task с type='milestone' под каждой задачей
// с directiveStart/End датами
```

### 5.4. Команда для Claude Code

```
Доработай вкладку "График":

1. src/app/(dashboard)/objects/[objectId]/gpr/schedule/page.tsx
   — Верхняя панель: Select стадии + Select версии
   — Переключатели видов (Координация/Диаграмма Ганта/ИД и СК)
   — Передавай versionId в GanttChart

2. Добавь в GanttChart.tsx колонку "ИД и СК":
   — В таблице задач (слева от диаграммы) показывай иконки документов
   — Клик → Sheet с привязанными ИД и кнопкой "+ Привязать"

3. Добавь API роут:
   POST /api/projects/[id]/gantt-versions/[vid]/tasks/[tid]/link-exec-doc
   GET  /api/projects/[id]/gantt-versions/[vid]/tasks/[tid]/exec-docs

4. Добавь кнопку "Из видов работ" → POST /auto-fill-from-work-items:
   Создаёт задачи ГПР из WorkItem договора (name, КСИ-код → name ГПР)
```

---

## Шаг 6 — Вкладка «Аналитика» (День 10–11)

```tsx
// src/components/objects/gpr/GanttAnalyticsView.tsx

// 4 виджета (как в ЦУС):

// === Виджет 1: S-кривая план/факт ===
// LineChart (Recharts):
// Ось X — даты (помесячно)
// Линия синяя — плановый прогресс %
// Линия зелёная — фактический прогресс %
// При отставании — красная зона между линиями
// Переключатель: Отдельный / Накопительный

// === Виджет 2: Текущая аналитика СМР ===
// Индикатор выполнения (Progress bar):
// "Выполнено: 65% от плана"
// Если факт < план на сегодня → красный
// Если факт = план → зелёный
// Если факт > план → жёлтый (перевыполнение)

// === Виджет 3: Отклонение от плана ===
// BarChart (горизонтальный):
// Топ-10 задач с наибольшим отставанием (в днях)
// Красный = просрочено, зелёный = в срок

// === Виджет 4: Готовность ИД по позициям ГПР ===
// Таблица: | Работа | % ИД готово | Привязано АОСР | Подписано АОСР |
// Цветовая индикация: < 30% = красный, < 70% = жёлтый, ≥ 70% = зелёный
// Это главный виджет — решает боль "штурмовщины ИД"
```

### Команда для Claude Code

```
Создай src/components/objects/gpr/GanttAnalyticsView.tsx.

Данные: GET /api/projects/${id}/gantt-versions/${vid}/analytics.

4 виджета в сетке 2×2:
1. LineChart "S-кривая план/факт" — Recharts (уже в проекте)
2. Progress-индикатор "Текущее выполнение" с цветом по отклонению
3. BarChart "Топ отставаний" — горизонтальные бары
4. Таблица "Готовность ИД" — shadcn Table с цветовой индикацией

Фильтр периода: Select год + DateRangePicker.
Switch "Накопительный итог" для S-кривой.
```

---

## Шаг 7 — Вкладка «Версии графика» (День 12)

```tsx
// src/components/objects/gpr/GanttVersionsView.tsx

// Список всех версий ГПР объекта:
// | Стадия | Название | Тип | Создана | Актуальная | Действия |

// Фильтр по стадии (Select)

// Детали версии при клике (Sheet):
// - Название, описание
// - Плановые даты начала/конца
// - Сумма, % выполнения
// - Делегировано от / Делегировано в (организации)
// - Кнопки: Перейти на Ганту, Сделать директивной, Заполнить из..., Копировать

// Сборная версия (мастер-график):
// Чекбоксы: Включить версии → объединить несколько стадий в один ГПР
```

---

## Шаг 8 — Вкладка «Стадии реализации» (День 12)

```tsx
// src/components/objects/gpr/GanttStagesView.tsx

// Таблица стадий объекта:
// | Стадия | Текущая | Версий | Действия |
// | СМР    |  ✓ Да   |   3    | Редактировать / Удалить |
// | ПИР    |  Нет    |   1    | Редактировать / Установить текущей |

// Кнопка "+ Добавить стадию" → Dialog: название, порядок
// Toggle "Текущая" → PATCH /gantt-stages/[sid] { isCurrent: true }
// Drag-and-drop для изменения порядка стадий (react-dnd или @dnd-kit)
```

---

## Шаг 9 — Вкладка «Суточный график» (День 13)

```tsx
// src/components/objects/gpr/GanttDailyView.tsx

// DatePicker для выбора даты
// Таблица задач активных на выбранную дату:
// | Наименование работы | Рабочие | Техника | Объём | Ед. | Примечание |
// Каждая строка редактируемая inline

// Кнопка "+ Добавить запись" для задачи на этот день

// Суммарная строка: итого рабочих на день

// Экспорт: "Распечатать наряд-задание" → PDF через Puppeteer
```

---

## Шаг 10 — Вкладка «План освоения» (День 14–15)

```tsx
// src/components/objects/gpr/GanttMasteringView.tsx

// Как в ЦУС: помесячная таблица план/факт по суммам

// Верхняя таблица (помесячно):
// | Месяц    | План (руб.) | Факт КС-2 (руб.) | Отклонение | % выполнения |
// | Янв 2025 | 2 400 000   | 1 980 000        | -420 000   | 82%          |
// | Фев 2025 | 3 100 000   | 3 200 000        | +100 000   | 103%         |

// Цветовая индикация:
// Факт < 90% плана → красный
// Факт 90-110% → зелёный
// Факт > 110% → жёлтый (перевыполнение)

// Нижняя таблица: детализация по задачам в выбранном месяце

// Кнопки:
// "Экспорт в Excel" → GET /mastering?format=xlsx
// "Печатная форма" → PDF через Handlebars

// Логика расчёта:
// Plan = задачи ГПР у которых период перекрывается с месяцем
// Fact = сумма КС-2 актов за этот месяц (Ks2Act.totalAmount)
```

### Экспорт Excel плана освоения

```typescript
// lib/gantt/export-mastering.ts
// Две вкладки как в ЦУС:
// Лист 1: данные в разрезе сумм (план/факт по месяцам)
// Лист 2: данные в разрезе объёмов (объём работ по месяцам)
```

---

## Шаг 11 — Вкладка «Сравнение версий» (День 15)

```tsx
// src/components/objects/gpr/GanttCompareView.tsx

// Два Select для выбора версий
// Кнопка "Сравнить" → GET /compare?v1=&v2=

// Результат — таблица задач с diff:
// | Задача                | V1 план начало | V2 план начало | Δ дней | V1 сумма | V2 сумма | Δ сумма |
// | [+] Новая задача      |  —             |  01.03.2025    |  —     | —        | 500 000  | +500K   |
// | [-] Удалённая задача  |  01.02.2025    |  —             |  —     | 300 000  | —        | -300K   |
// | [~] Изменённая задача |  01.03.2025    |  15.03.2025    | +14    | 400 000  | 420 000  | +20K    |

// Итоговая строка:
// V1: 40 000 000 ₽ | V2: 41 500 000 ₽ | Δ: +1 500 000 ₽ | V2 длиннее на 14 дней
```

---

## Шаг 12 — TypeScript и полировка (День 16)

```bash
npx tsc --noEmit
npx eslint . --quiet
```

### Финальный чеклист

```
□ /gpr/structure — стадии и версии отображаются, создание работает
□ /gpr/structure — "Из сметы" создаёт задачи ГПР из EstimateVersion
□ /gpr/schedule — GanttChart загружается с версией из URL param
□ /gpr/schedule — drag-and-drop дат работает, каскад FS работает
□ /gpr/schedule — раздел "ИД и СК" показывает привязанные АОСР
□ /gpr/analytics — 4 виджета с реальными данными
□ /gpr/analytics — виджет "Готовность ИД" работает (% АОСР по задаче)
□ /gpr/versions — список версий, копирование, директивная
□ /gpr/stages — CRUD стадий, Toggle "текущая"
□ /gpr/daily — суточный график, добавление записей
□ /gpr/mastering — помесячный план/факт, экспорт Excel
□ /gpr/compare — diff двух версий с цветовой индикацией
□ Импорт из сметы → задачи создаются с правильными суммами
□ TypeScript — нет ошибок
□ Все API проверяют organizationId
```

---

## Итоговая структура файлов

```
src/
├── app/(dashboard)/objects/[objectId]/gpr/
│   ├── layout.tsx
│   ├── page.tsx (redirect)
│   ├── structure/page.tsx
│   ├── schedule/page.tsx
│   ├── analytics/page.tsx
│   ├── versions/page.tsx
│   ├── stages/page.tsx
│   ├── daily/page.tsx
│   ├── mastering/page.tsx
│   └── compare/page.tsx
│
├── app/api/projects/[projectId]/
│   ├── gantt-stages/route.ts + [stageId]/route.ts
│   └── gantt-versions/
│       ├── route.ts
│       ├── compare/route.ts
│       └── [versionId]/
│           ├── route.ts
│           ├── copy/route.ts
│           ├── set-directive/route.ts
│           ├── fill-from/[sourceVersionId]/route.ts
│           ├── import-from-estimate/route.ts
│           ├── analytics/route.ts
│           ├── mastering/route.ts
│           ├── daily/route.ts + [dailyId]/route.ts
│           └── tasks/[taskId]/
│               ├── link-exec-doc/route.ts
│               └── exec-docs/route.ts
│
├── components/objects/gpr/
│   ├── GanttStructureView.tsx      ← НОВОЕ
│   ├── GanttAnalyticsView.tsx      ← НОВОЕ
│   ├── GanttVersionsView.tsx       ← НОВОЕ
│   ├── GanttStagesView.tsx         ← НОВОЕ
│   ├── GanttDailyView.tsx          ← НОВОЕ
│   ├── GanttMasteringView.tsx      ← НОВОЕ
│   ├── GanttCompareView.tsx        ← НОВОЕ
│   ├── GanttChart.tsx              ← уже есть ✅
│   ├── GanttTaskPanel.tsx          ← уже есть ✅
│   ├── GanttTaskListHeader.tsx     ← уже есть ✅
│   ├── useGanttTasks.ts            ← уже есть ✅
│   ├── useGanttDependencies.ts     ← уже есть ✅
│   └── useGanttFilters.ts          ← уже есть ✅
│
└── lib/gantt/
    ├── converters.ts               ← уже есть ✅
    ├── import-from-estimate.ts     ← НОВОЕ
    ├── compare-versions.ts         ← НОВОЕ
    ├── critical-path.ts            ← НОВОЕ
    └── export-mastering.ts         ← НОВОЕ
```

---

## Порядок задач в Claude Code (16 дней)

```
День 1–2:   Prisma: GanttStage, GanttDailyPlan, доп. поля GanttTask/Version. Миграция.

День 3:     Layout (8 Tabs), redirect, убрать TODO-заглушку, sidebar.

День 4–5:   Все API роуты + lib/gantt/*.ts (import, compare, critical-path).

День 6:     Вкладка "Структура графиков" (стадии + таблица версий + "из сметы").

День 7–9:   Вкладка "График" — интеграция GanttChart с новым URL,
            выбор стадии/версии, раздел "ИД и СК", директивный план.

День 10–11: Вкладка "Аналитика" (4 виджета + S-кривая).

День 12:    Вкладки "Версии" и "Стадии".

День 13:    Вкладка "Суточный график".

День 14–15: Вкладка "План освоения" + экспорт Excel.

День 15:    Вкладка "Сравнение версий".

День 16:    npx tsc + eslint, loading/error.tsx, полировка.
```

> **Параллельные потоки:**  
> Поток A: Дни 7–9 (GanttChart доработка) → Дни 10–11 (Аналитика)  
> Поток B: Дни 12–13 (Версии + Стадии + Суточный)  
> Поток C: Дни 14–15 (План освоения + Сравнение)  
> 16 дней → ~11 дней при параллельной работе

> **Совет:** начинай каждую задачу с `Прочитай CLAUDE.md и ROADMAP.md`.  
> GanttChart.tsx уже работает — не переписывай, только расширяй.
