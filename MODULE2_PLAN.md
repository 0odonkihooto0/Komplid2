# Модуль 2 — Паспорт объекта: подробный план реализации

> Аналог: ЦУС → Паспорт объекта  
> Текущее состояние: `Project` модель есть, но минимальная. Нет вкладок, нет показателей, нет задач.  
> Ориентир: **2–3 недели**

---

## Что уже есть (переиспользуем)

```
model Project {
  id                String  — ✅
  name              String  — ✅
  address           String? — ✅
  generalContractor String? — ✅
  customer          String? — ✅
  status            ProjectStatus — ✅
  organizationId    String  — ✅
  contracts         Contract[] — ✅
}

Маршруты: /projects/[projectId] — ✅
Участники через ContractParticipant — ✅
Фото через Photo (полиморфная) — ✅
```

---

## Шаг 1 — Расширение Prisma-схемы (День 1)

### 1.1. Добавить поля в `Project`

```prisma
// prisma/schema.prisma — дополнить модель Project
model Project {
  // ... существующие поля ...

  // Новые поля паспорта (Модуль 2)
  cadastralNumber    String?   // Кадастровый номер
  area               Float?    // Площадь застройки (м²)
  floors             Int?      // Количество этажей
  responsibilityClass String?  // Класс ответственности (КС-1 / КС-2 / КС-3)
  permitNumber       String?   // Номер разрешения на строительство
  permitDate         DateTime? // Дата выдачи разрешения
  permitAuthority    String?   // Орган, выдавший разрешение
  designOrg          String?   // Проектная организация
  chiefEngineer      String?   // ГИП (главный инженер проекта)
  plannedStartDate   DateTime? // Плановая дата начала
  plannedEndDate     DateTime? // Плановая дата окончания

  // Связи новых моделей
  fundingSources     FundingSource[]
  tasks              Task[]
  objectPassportLogs ActivityLog[]  @relation("ProjectLogs")
}
```

### 1.2. Новые модели

```prisma
/// Источник финансирования объекта
model FundingSource {
  id        String   @id @default(uuid())
  type      FundingType
  name      String   // Название источника
  amount    Float    // Сумма (руб.)
  period    String?  // Период (например "2024 Q1")
  notes     String?

  projectId String
  project   Project @relation(fields: [projectId], references: [id], onDelete: Cascade)

  createdAt DateTime @default(now())

  @@index([projectId])
  @@map("funding_sources")
}

enum FundingType {
  BUDGET        // Бюджет
  EXTRA_BUDGET  // Внебюджет
  CREDIT        // Кредит
  OWN           // Собственные средства
}

/// Задача по объекту / договору
model Task {
  id          String     @id @default(uuid())
  title       String     // Название задачи
  description String?    // Описание
  status      TaskStatus @default(OPEN)
  priority    TaskPriority @default(MEDIUM)
  deadline    DateTime?  // Срок исполнения
  sourceType  TaskSource @default(MANUAL) // Откуда создана

  projectId  String
  project    Project @relation(fields: [projectId], references: [id], onDelete: Cascade)

  contractId String?  // Опционально — привязка к договору
  defectId   String?  // Если создана из дефекта

  assigneeId String?
  assignee   User?   @relation("TaskAssignee", fields: [assigneeId], references: [id])

  createdById String
  createdBy   User   @relation("TaskCreator", fields: [createdById], references: [id])

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([projectId])
  @@index([assigneeId])
  @@map("tasks")
}

enum TaskStatus {
  OPEN        // Открыта
  IN_PROGRESS // В работе
  DONE        // Выполнена
  CANCELLED   // Отменена
}

enum TaskPriority {
  LOW
  MEDIUM
  HIGH
  CRITICAL
}

enum TaskSource {
  MANUAL  // Создана вручную
  DEFECT  // Создана из дефекта
  COMMENT // Создана из замечания
}
```

### 1.3. Команда для Claude Code

```
Добавь в prisma/schema.prisma:
1. В модель Project — поля: cadastralNumber, area, floors, responsibilityClass,
   permitNumber, permitDate, permitAuthority, designOrg, chiefEngineer,
   plannedStartDate, plannedEndDate
2. Новые модели: FundingSource (с enum FundingType), Task (с enums TaskStatus,
   TaskPriority, TaskSource)
3. В модель User добавь relations: tasksAssigned Task[] @relation("TaskAssignee"),
   tasksCreated Task[] @relation("TaskCreator")
Затем выполни: npx prisma migrate dev --name add_module2_passport
```

---

## Шаг 2 — Новый URL и layout объекта (День 2)

### 2.1. Структура файлов

```
src/app/(dashboard)/
  objects/
    [objectId]/
      layout.tsx          ← Обёртка с sidebar модулей (как в ЦУС)
      page.tsx            ← Редирект на /passport
      passport/
        page.tsx          ← Вкладки Паспорта
      indicators/
        page.tsx          ← Показатели
      funding/
        page.tsx          ← Финансирование
      contracts/
        page.tsx          ← Контракты (переиспользуем)
      tasks/
        page.tsx          ← Задачи
      photos/
        page.tsx          ← Фотогалерея (переиспользуем)
```

### 2.2. `layout.tsx` — боковая навигация модулей

```tsx
// src/app/(dashboard)/objects/[objectId]/layout.tsx
import { ObjectModuleSidebar } from '@/components/objects/ObjectModuleSidebar';

export default async function ObjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { objectId: string };
}) {
  return (
    <div className="flex h-full">
      <ObjectModuleSidebar objectId={params.objectId} />
      <main className="flex-1 overflow-y-auto p-6">{children}</main>
    </div>
  );
}
```

### 2.3. `ObjectModuleSidebar` — навигация по модулям

```tsx
// src/components/objects/ObjectModuleSidebar.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  Building2,        // Паспорт
  BarChart3,        // Показатели
  Banknote,         // Финансирование
  FileText,         // Контракты
  CheckSquare,      // Задачи
  Camera,           // Фотогалерея
  ClipboardList,    // ГПР
  Package,          // Ресурсы
  BookOpen,         // Журналы
  Shield,           // Стройконтроль
  Scale,            // Сметы
  BarChart2,        // Отчёты
} from 'lucide-react';

const MODULES = [
  { label: 'Паспорт', href: 'passport', icon: Building2 },
  { label: 'Показатели', href: 'indicators', icon: BarChart3 },
  { label: 'Финансирование', href: 'funding', icon: Banknote },
  { label: 'Контракты', href: 'contracts', icon: FileText },
  { label: 'Задачи', href: 'tasks', icon: CheckSquare },
  { label: 'Фотогалерея', href: 'photos', icon: Camera },
  // Будущие модули (пока disabled)
  { label: 'ГПР', href: 'gpr', icon: ClipboardList, soon: true },
  { label: 'Ресурсы', href: 'resources', icon: Package, soon: true },
  { label: 'Журналы', href: 'journals', icon: BookOpen, soon: true },
  { label: 'ИД', href: 'id', icon: FileText, soon: true },
  { label: 'Стройконтроль', href: 'control', icon: Shield, soon: true },
  { label: 'Сметы', href: 'estimates', icon: Scale, soon: true },
  { label: 'Отчёты', href: 'reports', icon: BarChart2, soon: true },
];

export function ObjectModuleSidebar({ objectId }: { objectId: string }) {
  const pathname = usePathname();

  return (
    <aside className="w-52 shrink-0 border-r bg-muted/30 py-4">
      <nav className="space-y-1 px-2">
        {MODULES.map(({ label, href, icon: Icon, soon }) => {
          const fullHref = `/objects/${objectId}/${href}`;
          const isActive = pathname.startsWith(fullHref);

          return (
            <Link
              key={href}
              href={soon ? '#' : fullHref}
              className={cn(
                'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground font-medium'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                soon && 'opacity-40 pointer-events-none'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{label}</span>
              {soon && (
                <span className="ml-auto text-[10px] rounded px-1 bg-muted text-muted-foreground">
                  скоро
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
```

### 2.4. Команда для Claude Code

```
Создай файловую структуру:
src/app/(dashboard)/objects/[objectId]/layout.tsx
src/app/(dashboard)/objects/[objectId]/page.tsx (редирект на /passport)
src/app/(dashboard)/objects/[objectId]/passport/page.tsx
src/app/(dashboard)/objects/[objectId]/tasks/page.tsx
src/app/(dashboard)/objects/[objectId]/funding/page.tsx
src/app/(dashboard)/objects/[objectId]/indicators/page.tsx
src/components/objects/ObjectModuleSidebar.tsx

В layout.tsx сделай двухколоночный layout:
левая колонка 208px — ObjectModuleSidebar с навигацией по модулям
правая — {children}

В ObjectModuleSidebar перечисли модули: Паспорт, Показатели, Финансирование,
Контракты, Задачи, Фотогалерея (активные), остальные — с меткой "скоро" и disabled.
Используй иконки из lucide-react.
```

---

## Шаг 3 — API роуты (День 3)

### 3.1. Новые эндпоинты

```
GET  /api/projects/[projectId]                    — уже есть ✅, дополнить новыми полями
PATCH /api/projects/[projectId]                   — уже есть ✅, дополнить новыми полями

GET  /api/projects/[projectId]/funding            — список источников финансирования
POST /api/projects/[projectId]/funding            — создать источник
DELETE /api/projects/[projectId]/funding/[id]     — удалить

GET  /api/projects/[projectId]/tasks              — список задач объекта
POST /api/projects/[projectId]/tasks              — создать задачу
PATCH /api/projects/[projectId]/tasks/[id]        — обновить статус / исполнителя
DELETE /api/projects/[projectId]/tasks/[id]       — удалить

GET  /api/projects/[projectId]/indicators         — агрегированные показатели (вычисляются)
```

### 3.2. `/api/projects/[projectId]/funding/route.ts`

```typescript
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { z } from 'zod';

const fundingSchema = z.object({
  type: z.enum(['BUDGET', 'EXTRA_BUDGET', 'CREDIT', 'OWN']),
  name: z.string().min(1),
  amount: z.number().positive(),
  period: z.string().optional(),
  notes: z.string().optional(),
});

export async function GET(_req: Request, { params }: { params: { projectId: string } }) {
  const session = await getSessionOrThrow();
  const project = await db.project.findFirst({
    where: { id: params.projectId, organizationId: session.user.organizationId },
  });
  if (!project) return errorResponse('Проект не найден', 404);

  const sources = await db.fundingSource.findMany({
    where: { projectId: params.projectId },
    orderBy: { createdAt: 'asc' },
  });
  return successResponse(sources);
}

export async function POST(req: Request, { params }: { params: { projectId: string } }) {
  const session = await getSessionOrThrow();
  const project = await db.project.findFirst({
    where: { id: params.projectId, organizationId: session.user.organizationId },
  });
  if (!project) return errorResponse('Проект не найден', 404);

  const body = await req.json();
  const parsed = fundingSchema.safeParse(body);
  if (!parsed.success) return errorResponse('Ошибка валидации', 400, parsed.error.issues);

  const source = await db.fundingSource.create({
    data: { ...parsed.data, projectId: params.projectId },
  });
  return successResponse(source, 201);
}
```

### 3.3. `/api/projects/[projectId]/tasks/route.ts`

```typescript
const taskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('MEDIUM'),
  deadline: z.string().datetime().optional(),
  assigneeId: z.string().uuid().optional(),
  contractId: z.string().uuid().optional(),
});

// GET — список задач с фильтрацией
const tasks = await db.task.findMany({
  where: {
    projectId: params.projectId,
    // опционально: фильтр по статусу из query params
  },
  include: {
    assignee: { select: { id: true, firstName: true, lastName: true } },
    createdBy: { select: { id: true, firstName: true, lastName: true } },
  },
  orderBy: [{ status: 'asc' }, { deadline: 'asc' }],
});
```

### 3.4. `/api/projects/[projectId]/indicators/route.ts`

```typescript
// Агрегируем данные из существующих таблиц — без новых моделей
export async function GET(_req: Request, { params }: { params: { projectId: string } }) {
  const session = await getSessionOrThrow();

  // Контракты объекта
  const contracts = await db.contract.findMany({
    where: { projectId: params.projectId, project: { organizationId: session.user.organizationId } },
    include: {
      workRecords: { select: { id: true } },
      executionDocs: { select: { id: true, status: true, type: true } },
      ks2Acts: { select: { id: true, totalAmount: true } },
    },
  });

  // Считаем показатели
  const totalDocs = contracts.flatMap(c => c.executionDocs).length;
  const signedDocs = contracts.flatMap(c => c.executionDocs)
    .filter(d => d.status === 'SIGNED').length;
  const totalKs2Amount = contracts.flatMap(c => c.ks2Acts)
    .reduce((sum, a) => sum + (a.totalAmount || 0), 0);

  return successResponse({
    totalContracts: contracts.length,
    totalWorkRecords: contracts.flatMap(c => c.workRecords).length,
    totalDocs,
    signedDocs,
    idReadinessPercent: totalDocs > 0 ? Math.round((signedDocs / totalDocs) * 100) : 0,
    totalKs2Amount,
  });
}
```

### 3.5. Команда для Claude Code

```
Создай API роуты:
1. src/app/api/projects/[projectId]/funding/route.ts — GET и POST
2. src/app/api/projects/[projectId]/funding/[fundingId]/route.ts — DELETE
3. src/app/api/projects/[projectId]/tasks/route.ts — GET и POST
4. src/app/api/projects/[projectId]/tasks/[taskId]/route.ts — PATCH и DELETE
5. src/app/api/projects/[projectId]/indicators/route.ts — GET (агрегация)

В каждом роуте:
- Проверяй сессию через getSessionOrThrow()
- Проверяй принадлежность проекта к organizationId из сессии
- Используй successResponse / errorResponse из @/utils/api
- Добавляй TypeScript типы, не используй any
```

---

## Шаг 4 — Вкладка «Паспорт» (День 4–5)

### 4.1. Структура страницы

```tsx
// src/app/(dashboard)/objects/[objectId]/passport/page.tsx
import { PassportView } from '@/components/objects/passport/PassportView';

export default function PassportPage({ params }: { params: { objectId: string } }) {
  return <PassportView projectId={params.objectId} />;
}
```

### 4.2. `PassportView` — клиентский компонент

```tsx
// src/components/objects/passport/PassportView.tsx
'use client';

// Две колонки:
// Левая (2/3): Основные реквизиты объекта
// Правая (1/3): Разрешение на строительство + сроки

// Секции:
// 1. Заголовок: название + статус + кнопка "Редактировать"
// 2. Раздел "Основные сведения": адрес, кадастровый №, площадь, этажность, класс ответственности
// 3. Раздел "Проектная документация": проектная организация, ГИП
// 4. Раздел "Разрешение на строительство": №, дата, орган
// 5. Раздел "Сроки": плановое начало / окончание, фактическое начало
// 6. Раздел "Участники": карточки организаций с ролями (из ContractParticipant)
// 7. Раздел "Связанные объекты" (будущее)
```

### 4.3. Форма редактирования

```tsx
// src/components/objects/passport/PassportEditSheet.tsx
// Sheet (выезжающая панель справа) с полями:
// - Название, адрес, описание
// - Кадастровый номер, площадь (м²), этажей
// - Класс ответственности: Select ['КС-1', 'КС-2', 'КС-3']
// - Разрешение: номер, дата (DatePicker), орган выдачи
// - Проектная организация, ГИП
// - Плановые даты: начало, окончание (DatePicker)
// Кнопки: Сохранить / Отмена
// PATCH /api/projects/[projectId]
```

### 4.4. Команда для Claude Code

```
Создай страницу паспорта объекта:
src/components/objects/passport/PassportView.tsx

Используй shadcn/ui компоненты: Card, Badge, Separator, Sheet, Button, Input,
Select, DatePicker (из @/components/ui/).

Верстка: двухколоночный grid (2/3 + 1/3).
Слева — секции: Основные сведения, Разрешение на строительство, Участники проекта.
Справа — Сроки (плановые даты с прогресс-баром), Проектная документация.

Данные загружать через fetch('/api/projects/${projectId}').

Кнопка "Редактировать" открывает Sheet с формой.
В форме используй react-hook-form + zod для валидации.
PATCH /api/projects/${projectId} для сохранения.
После сохранения — router.refresh() для обновления данных.
```

---

## Шаг 5 — Вкладка «Показатели» (День 6)

### 5.1. Компоненты

```tsx
// src/components/objects/indicators/IndicatorsView.tsx

// Верхняя строка — 4 карточки KPI:
// ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
// │  Контрактов      │ │  Записей работ  │ │  Документов ИД  │ │ Освоено (КС-2)  │
// │      3           │ │      147        │ │   42 / 61       │ │  12 400 000 ₽   │
// │  ── ── ── ──     │ │  ── ── ── ──    │ │  Готовность: 69%│ │                 │
// └─────────────────┘ └─────────────────┘ └─────────────────┘ └─────────────────┘

// Блок "Дефицит ИД" — главная боль ("штурмовщина"):
// ┌──────────────────────────────────────────────────────────────────────┐
// │ Готовность исполнительной документации                                │
// │                                                                        │
// │ Всего документов: 61    Подписано: 42 (69%)    Не готово: 19          │
// │ ████████████████████████████████████░░░░░░░░░░░  69%                  │
// │                                                                        │
// │ [!] Обратите внимание: 19 документов ожидают подписания               │
// └──────────────────────────────────────────────────────────────────────┘
```

### 5.2. Команда для Claude Code

```
Создай src/components/objects/indicators/IndicatorsView.tsx.

Компонент загружает данные из GET /api/projects/${projectId}/indicators.

Верстка:
1. Строка из 4 KPI-карточек (shadcn Card): контракты, записи работ,
   документы ИД (дробь подписано/всего), освоено по КС-2 (руб.)
2. Блок "Готовность ИД" с Progress-баром (shadcn Progress).
   Если idReadinessPercent < 70% — желтая окраска.
   Если < 30% — красная.
3. Placeholder для будущего графика "план/факт СМР" — серый блок
   с текстом "Доступно после подключения ГПР (Модуль 7)"

Показывай skeleton-лоадер пока данные грузятся.
```

---

## Шаг 6 — Вкладка «Финансирование» (День 7)

### 6.1. Структура

```tsx
// src/components/objects/funding/FundingView.tsx

// Верхняя строка — 3 итоговых карточки:
// Всего лимит: Σ всех источников
// Освоено: Σ KS2Acts по контрактам проекта
// Остаток: лимит - освоено

// Таблица источников финансирования:
// | Тип          | Название           | Период   | Сумма       | Действия |
// | Бюджет       | ФЦП "Жильё"        | 2024 Q1  | 5 000 000 ₽ | Удалить  |
// | Внебюджет    | Собственные средства| 2024 Q2  | 2 000 000 ₽ | Удалить  |

// Кнопка "Добавить источник" → Dialog с формой
```

### 6.2. Команда для Claude Code

```
Создай src/components/objects/funding/FundingView.tsx.

Используй DataTable (shadcn) для таблицы источников.
Колонки: тип (Badge с цветом по типу), название, период, сумма (форматировать
через Intl.NumberFormat 'ru-RU', 'RUB').

Кнопка "Добавить источник" → Dialog с формой:
- Select: Тип (Бюджет / Внебюджет / Кредит / Собственные средства)
- Input: Название источника
- Input type="number": Сумма
- Input: Период (например "2024 Q1") — необязательно
POST /api/projects/${projectId}/funding.

Итоговые карточки сверху: "Общий лимит", "Освоено (из КС-2)", "Остаток".
Освоено — брать из /api/projects/${projectId}/indicators (поле totalKs2Amount).
```

---

## Шаг 7 — Вкладка «Задачи» (День 8–9)

### 7.1. Структура

```tsx
// src/components/objects/tasks/TasksView.tsx

// Фильтры: кнопки-таблетки "Все / Открытые / В работе / Выполнены"
// Кнопка "Создать задачу" справа

// Список задач — карточки (не таблица):
// ┌────────────────────────────────────────────────────────────────┐
// │ 🔴 Подготовить пакет ИД для сдачи 3 секции           ✎ ✕   │
// │    Срок: 15 марта 2025  |  Исполнитель: Иванов И.И.           │
// │    Статус: [В работе ▾]                                        │
// └────────────────────────────────────────────────────────────────┘
```

### 7.2. Модальное окно создания задачи

```tsx
// Dialog с полями:
// - Input: Название задачи (обязательно)
// - Textarea: Описание (необязательно)
// - Select: Приоритет (Низкий / Средний / Высокий / Критический)
//   цветовые Badge: серый / синий / оранжевый / красный
// - DatePicker: Срок исполнения
// - Combobox: Исполнитель (список пользователей организации)
// - Select: Договор (список договоров проекта) — необязательно
// POST /api/projects/${projectId}/tasks
```

### 7.3. Инлайн-изменение статуса

```tsx
// В карточке задачи — Select для смены статуса прямо в списке:
// PATCH /api/projects/${projectId}/tasks/[taskId] { status: 'IN_PROGRESS' }
// После изменения — optimistic update в UI (не ждать сервер)
```

### 7.4. Команда для Claude Code

```
Создай src/components/objects/tasks/TasksView.tsx.

Задачи отображать карточками (не таблицей). Каждая карточка:
- Иконка приоритета (цветная точка: серый/синий/оранжевый/красный)
- Название задачи жирным
- Строка под названием: срок (DateBadge с красным цветом если просрочен),
  исполнитель (аватар + ФИО)
- Select для статуса прямо в карточке (PATCH при изменении)
- Кнопки редактировать и удалить (иконки)

Фильтрация по статусу — клиентская (не новый запрос к серверу).

Dialog создания задачи:
- Поля: название (Input), описание (Textarea), приоритет (Select),
  срок (DatePicker), исполнитель (Combobox из /api/organizations/members)
Оптимистичный UI при смене статуса (обновить локально, потом синхронизировать).
```

---

## Шаг 8 — Вкладка «Контракты» и «Фотогалерея» (День 10)

### 8.1. Переиспользование существующих компонентов

```tsx
// src/app/(dashboard)/objects/[objectId]/contracts/page.tsx
// Просто рендерить существующий компонент списка контрактов
// с projectId из params.objectId

import { ContractsList } from '@/components/contracts/ContractsList';

export default function ObjectContractsPage({ params }: { params: { objectId: string } }) {
  return <ContractsList projectId={params.objectId} />;
}
```

```tsx
// src/app/(dashboard)/objects/[objectId]/photos/page.tsx
// Переиспользовать PhotoGallery с entityType='project' entityId=objectId

import { PhotoGallery } from '@/components/photos/PhotoGallery';

export default function ObjectPhotosPage({ params }: { params: { objectId: string } }) {
  return (
    <PhotoGallery
      entityType="project"
      entityId={params.objectId}
      showUpload
    />
  );
}
```

### 8.2. Команда для Claude Code

```
Создай две страницы:
1. src/app/(dashboard)/objects/[objectId]/contracts/page.tsx
   — импортирует и рендерит существующий компонент списка договоров,
     передаёт projectId={params.objectId}

2. src/app/(dashboard)/objects/[objectId]/photos/page.tsx
   — импортирует и рендерит существующий PhotoGallery,
     передаёт entityType="project" и entityId={params.objectId}

Проверь что существующие компоненты принимают эти пропсы,
при необходимости добавь их.
```

---

## Шаг 9 — Заголовок объекта (ObjectHeader) (День 11)

### 9.1. Компонент шапки — общий для всех вкладок

```tsx
// src/components/objects/ObjectHeader.tsx
// Отображается в layout.tsx вверху, над sidebar

// ┌──────────────────────────────────────────────────────────────┐
// │ ← Все объекты                                                │
// │                                                              │
// │ ЖК "Солнечный"                    [АКТИВНЫЙ]                │
// │ г. Москва, ул. Ленина, д. 15                                 │
// │ Генподрядчик: ООО "СтройПроект"                             │
// └──────────────────────────────────────────────────────────────┘
```

### 9.2. Команда для Claude Code

```
Создай src/components/objects/ObjectHeader.tsx.

Компонент принимает projectId, загружает данные через
GET /api/projects/${projectId}.

Верстка:
- Breadcrumb: "← Все объекты" (ссылка на /projects)
- Название проекта (h1, крупный шрифт)
- Badge статуса справа (ACTIVE → "Активный" зелёный, COMPLETED → "Завершён")
- Адрес (text-muted-foreground)
- Генподрядчик и заказчик через "·" разделитель

Добавь ObjectHeader в layout.tsx над основным контентом.
Загрузка — skeleton высотой 80px.
```

---

## Шаг 10 — Редирект со старых URL (День 12)

### 10.1. Обратная совместимость

```typescript
// src/app/(dashboard)/projects/[projectId]/page.tsx
// Добавить redirect на новый URL

import { redirect } from 'next/navigation';

export default function ProjectPageRedirect({
  params,
}: {
  params: { projectId: string };
}) {
  redirect(`/objects/${params.projectId}/passport`);
}
```

### 10.2. Команда для Claude Code

```
В файле src/app/(dashboard)/projects/[projectId]/page.tsx
замени содержимое на redirect(`/objects/${params.projectId}/passport`).

Это обеспечит обратную совместимость — старые ссылки будут работать.
Убедись что импорт { redirect } from 'next/navigation' добавлен.
```

---

## Шаг 11 — Тесты и полировка (День 13–14)

### 11.1. Проверочный чеклист

```
□ /objects/[id]/passport — загружается, форма редактирования сохраняет
□ /objects/[id]/indicators — показатели считаются корректно
□ /objects/[id]/funding — создание/удаление источников работает
□ /objects/[id]/contracts — список договоров отображается
□ /objects/[id]/tasks — создание, смена статуса, удаление работают
□ /objects/[id]/photos — галерея загружается
□ /projects/[id] → redirect на /objects/[id]/passport работает
□ ObjectModuleSidebar — активная вкладка подсвечивается
□ ObjectHeader — данные загружаются, skeleton показывается
□ Все запросы проверяют organizationId (нет утечки данных)
□ npx prisma migrate dev прошёл без ошибок
□ TypeScript — нет ошибок (npx tsc --noEmit)
```

### 11.2. Финальная команда для Claude Code

```
Проверь весь Модуль 2:
1. Запусти npx tsc --noEmit — исправь все ошибки TypeScript
2. Проверь что все API роуты проверяют organizationId из сессии
   (нет утечки данных между организациями)
3. Добавь loading.tsx в каждую вкладку (показывает skeleton)
4. Добавь error.tsx в каждую вкладку (показывает "Что-то пошло не так")
5. Проверь мобильную вёрстку ObjectModuleSidebar —
   на маленьком экране должна сворачиваться в горизонтальное меню
```

---

## Итоговая структура файлов

```
src/
├── app/(dashboard)/
│   ├── objects/
│   │   └── [objectId]/
│   │       ├── layout.tsx           ← ObjectHeader + ObjectModuleSidebar
│   │       ├── page.tsx             ← redirect → /passport
│   │       ├── loading.tsx          ← skeleton
│   │       ├── passport/
│   │       │   ├── page.tsx
│   │       │   └── loading.tsx
│   │       ├── indicators/
│   │       │   └── page.tsx
│   │       ├── funding/
│   │       │   └── page.tsx
│   │       ├── contracts/
│   │       │   └── page.tsx
│   │       ├── tasks/
│   │       │   └── page.tsx
│   │       └── photos/
│   │           └── page.tsx
│   └── projects/
│       └── [projectId]/
│           └── page.tsx             ← redirect (обратная совместимость)
│
├── app/api/
│   └── projects/[projectId]/
│       ├── funding/
│       │   ├── route.ts             ← GET, POST
│       │   └── [fundingId]/route.ts ← DELETE
│       ├── tasks/
│       │   ├── route.ts             ← GET, POST
│       │   └── [taskId]/route.ts    ← PATCH, DELETE
│       └── indicators/
│           └── route.ts             ← GET (агрегация)
│
└── components/objects/
    ├── ObjectHeader.tsx
    ├── ObjectModuleSidebar.tsx
    ├── passport/
    │   ├── PassportView.tsx
    │   └── PassportEditSheet.tsx
    ├── indicators/
    │   └── IndicatorsView.tsx
    ├── funding/
    │   ├── FundingView.tsx
    │   └── AddFundingDialog.tsx
    └── tasks/
        ├── TasksView.tsx
        ├── TaskCard.tsx
        └── CreateTaskDialog.tsx
```

---

## Порядок запуска в Claude Code (claude.ai/code)

```
Задача 1 (День 1):
"Прочитай CLAUDE.md и ROADMAP.md. Добавь в prisma/schema.prisma новые поля
в модель Project и новые модели FundingSource и Task согласно плану
MODULE2_PLAN.md (Шаг 1). Выполни миграцию."

Задача 2 (День 2):
"Создай структуру файлов для /objects/[objectId]/ с layout.tsx и
ObjectModuleSidebar согласно плану (Шаг 2). Не трогай существующие /projects/."

Задача 3 (День 3):
"Создай API роуты для funding и tasks согласно плану (Шаг 3)."

Задача 4 (День 4–5):
"Создай PassportView и PassportEditSheet согласно плану (Шаг 4)."

Задача 5 (День 6–9):
"Создай IndicatorsView, FundingView, TasksView согласно плану (Шаги 5–7)."

Задача 6 (День 10–12):
"Создай страницы Контракты и Фотогалерея, ObjectHeader, добавь redirect
со старых URL (Шаги 8–10)."

Задача 7 (День 13–14):
"Запусти npx tsc --noEmit, исправь ошибки, добавь loading.tsx и error.tsx
для всех вкладок, проверь mobile layout (Шаг 11)."
```
