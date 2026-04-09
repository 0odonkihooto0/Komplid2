# Модуль 11 — Строительный контроль (СК): подробный план реализации

> Аналог: ЦУС → Модуль «Строительный контроль» (стр. 266–289 руководства)
> Вкладки по ЦУС: **Проверки · Акты проверки · Предписания · Недостатки · Акты устранения недостатков · Аналитика**
> Текущее состояние: Defect + DefectAnnotation ✅, DefectsContent ✅, API дефектов ✅. В ObjectModuleSidebar пункт «Стройконтроль» помечен soon: true. Дефекты встроены в ObjectIdModule на вкладке «Дефекты СК».
> **Ориентир: 2–3 недели (12 рабочих дней)**

---

## Что уже есть (переиспользуем)

```
model Defect {
  id, title, description, status (OPEN | IN_PROGRESS | RESOLVED | CONFIRMED)
  severity (LOW | MEDIUM | HIGH | CRITICAL)
  normativeRef, location, latitude, longitude
  deadline, resolvedAt, resolution
  entityType, entityId  // полиморфная привязка
  projectId → BuildingObject, authorId → User, assigneeId → User
  photos → Photo[], annotations → DefectAnnotation[]
}

model DefectAnnotation { id, type, x, y, width, height, color, text, defectId }
model Photo { id, entityType, entityId, s3Key, latitude, longitude, category, authorId }
model ApprovalRoute { ... }
model Notification { ... }

Существующие файлы:
  src/app/(dashboard)/projects/[projectId]/defects/DefectsContent.tsx
  src/app/api/projects/[projectId]/defects/route.ts          ← GET, POST
  src/app/api/projects/[projectId]/defects/[defectId]/route.ts ← GET, PATCH, DELETE
  src/components/modules/objects/ObjectIdModule.tsx           ← вкладка «Дефекты СК»
  src/components/objects/ObjectModuleSidebar.tsx              ← soon: true для СК
```

---

## Шаг 1 — Расширение Prisma-схемы (День 1–2)

### 1.1. Новые enum-ы

```prisma
enum InspectionStatus { ACTIVE  COMPLETED }

enum PrescriptionType { DEFECT_ELIMINATION  WORK_SUSPENSION }

enum PrescriptionStatus { ACTIVE  CLOSED }

enum RemediationActStatus { DRAFT  PENDING_REVIEW  ACCEPTED  REJECTED }

enum DefectCategory {
  QUALITY_VIOLATION        // (ОТ) Нарушение правил охраны труда
  TECHNOLOGY_VIOLATION     // (Т) Нарушение технологии работ
  FIRE_SAFETY              // Пожарная безопасность
  ECOLOGY                  // Экология и природоохрана
  DOCUMENTATION            // Нарушения в документации
  OTHER
}

enum SafetyBriefingType {
  INTRODUCTORY  PRIMARY  TARGETED  REPEATED  UNSCHEDULED
}
```

### 1.2. Новые модели

```prisma
model Inspection {
  id          String           @id @default(uuid())
  number      String
  status      InspectionStatus @default(ACTIVE)
  startedAt   DateTime         @default(now())
  completedAt DateTime?
  comment     String?

  inspectorId       String
  inspector         User @relation("InspectionInspector", fields: [inspectorId], references: [id])
  inspectorOrgId    String?
  responsibleId     String?
  responsible       User? @relation("InspectionResponsible", fields: [responsibleId], references: [id])
  responsibleOrgId  String?
  contractorPresent Boolean?
  attentionUserId   String?
  ganttTaskIds      String[]

  projectId      String
  buildingObject BuildingObject @relation(fields: [projectId], references: [id], onDelete: Cascade)
  createdById String
  createdBy   User @relation("InspectionCreator", fields: [createdById], references: [id])

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  defects          Defect[]
  inspectionActs   InspectionAct[]
  prescriptions    Prescription[]
  remediationActs  DefectRemediationAct[]

  @@index([projectId])
  @@index([status])
  @@map("inspections")
}

model InspectionAct {
  id         String   @id @default(uuid())
  number     String
  issuedAt   DateTime @default(now())
  s3Key      String?
  fileName   String?
  inspectionId String
  inspection   Inspection @relation(fields: [inspectionId], references: [id], onDelete: Cascade)
  issuedById String
  issuedBy   User @relation("InspectionActIssuer", fields: [issuedById], references: [id])
  approvalRouteId String? @unique
  approvalRoute   ApprovalRoute? @relation("InspectionActApproval", fields: [approvalRouteId], references: [id])
  createdAt DateTime @default(now())
  @@index([inspectionId])
  @@map("inspection_acts")
}

model Prescription {
  id          String             @id @default(uuid())
  number      String
  type        PrescriptionType
  status      PrescriptionStatus @default(ACTIVE)
  issuedAt    DateTime           @default(now())
  deadline    DateTime?
  closedAt    DateTime?
  s3Key       String?
  fileName    String?
  inspectionId String
  inspection   Inspection @relation(fields: [inspectionId], references: [id], onDelete: Cascade)
  issuedById String
  issuedBy   User @relation("PrescriptionIssuer", fields: [issuedById], references: [id])
  responsibleId String?
  responsible   User? @relation("PrescriptionResponsible", fields: [responsibleId], references: [id])
  approvalRouteId String? @unique
  approvalRoute   ApprovalRoute? @relation("PrescriptionApproval", fields: [approvalRouteId], references: [id])
  defects          Defect[]
  remediationActs  DefectRemediationAct[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  @@index([inspectionId])
  @@index([status])
  @@map("prescriptions")
}

model DefectRemediationAct {
  id          String                @id @default(uuid())
  number      String
  status      RemediationActStatus  @default(DRAFT)
  issuedAt    DateTime              @default(now())
  s3Key       String?
  fileName    String?
  inspectionId   String
  inspection     Inspection @relation(fields: [inspectionId], references: [id], onDelete: Cascade)
  prescriptionId String
  prescription   Prescription @relation(fields: [prescriptionId], references: [id], onDelete: Cascade)
  defectIds      String[]
  remediationDetails Json?
  issuedById String
  issuedBy   User @relation("RemediationActIssuer", fields: [issuedById], references: [id])
  approvalRouteId String? @unique
  approvalRoute   ApprovalRoute? @relation("RemediationActApproval", fields: [approvalRouteId], references: [id])
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  @@index([inspectionId])
  @@index([prescriptionId])
  @@map("defect_remediation_acts")
}

model SafetyBriefing {
  id          String             @id @default(uuid())
  type        SafetyBriefingType
  date        DateTime
  topic       String
  notes       String?
  conductedById String
  conductedBy   User @relation("BriefingConductor", fields: [conductedById], references: [id])
  projectId      String
  buildingObject BuildingObject @relation(fields: [projectId], references: [id], onDelete: Cascade)
  participants Json?
  createdAt DateTime @default(now())
  @@index([projectId])
  @@map("safety_briefings")
}
```

### 1.3. Дополнения в существующие модели

```prisma
// В Defect добавить:
category            DefectCategory?
requiresSuspension  Boolean @default(false)
inspectionId        String?
inspection          Inspection? @relation(...)
prescriptionId      String?
prescription        Prescription? @relation(...)
deputyInspectorId   String?

// В BuildingObject:
inspections      Inspection[]
safetyBriefings  SafetyBriefing[]

// В ApprovalRoute:
inspectionActId, prescriptionId, remediationActId (все @unique)

// В User: 10+ новых relation-полей
```

### 1.4. Команда для Claude Code

```
Прочитай CLAUDE.md и ROADMAP.md. Добавь в prisma/schema.prisma:

1. 6 enum-ов: InspectionStatus, PrescriptionType, PrescriptionStatus,
   RemediationActStatus, DefectCategory, SafetyBriefingType
2. 5 моделей: Inspection, InspectionAct, Prescription,
   DefectRemediationAct, SafetyBriefing
3. В Defect: category, requiresSuspension, inspectionId, prescriptionId, deputyInspectorId
4. Связи в BuildingObject, ApprovalRoute, User

npx prisma migrate dev --name add_module11_construction_control
npx prisma generate
```

---

## Шаг 2 — URL, layout и sidebar (День 3)

### 2.1. Файловая структура (6 вкладок ЦУС)

```
src/app/(dashboard)/objects/[objectId]/sk/
  layout.tsx               ← Tabs: 6 вкладок с бейджами-счётчиками
  page.tsx                 ← redirect → /sk/inspections
  inspections/page.tsx + [inspectionId]/page.tsx
  inspection-acts/page.tsx
  prescriptions/page.tsx
  defects/page.tsx + [defectId]/page.tsx
  remediation-acts/page.tsx
  analytics/page.tsx
```

### 2.2. Layout

```tsx
const SK_TABS = [
  { label: 'Проверки',                   href: 'inspections' },
  { label: 'Акты проверки',              href: 'inspection-acts' },
  { label: 'Предписания',                href: 'prescriptions' },
  { label: 'Недостатки',                 href: 'defects' },
  { label: 'Акты устранения недостатков', href: 'remediation-acts' },
  { label: 'Аналитика',                  href: 'analytics' },
];
```

### 2.3. Sidebar + убрать дефекты из ObjectIdModule

```
В ObjectModuleSidebar.tsx: убрать soon: true у «Стройконтроль»
В ObjectIdModule.tsx: убрать вкладку «Дефекты СК» (теперь в /sk/defects)
```

---

## Шаг 3 — API-роуты (День 4–5)

### 3.1. Структура API

```
POST   /inspections                       — начать проверку
GET    /inspections                       — реестр (?status=)
GET    /inspections/[id]                  — карточка + defects + acts
PATCH  /inspections/[id]                  — обновить
POST   /inspections/[id]/complete         — завершить (авто-создание актов + предписаний)
POST   /inspections/[id]/add-defect       — добавить недостаток
POST   /inspections/[id]/add-remediation  — добавить акт устранения

GET    /inspection-acts                   — реестр
GET    /inspection-acts/[id]              — карточка
POST   /inspection-acts/[id]/print        — печать PDF

GET    /prescriptions                     — реестр (?status=&type=)
GET    /prescriptions/[id]               — карточка
POST   /prescriptions/[id]/print         — печать PDF

GET    /remediation-acts                  — реестр
POST   /remediation-acts                  — создать
PATCH  /remediation-acts/[id]             — актуализировать
POST   /remediation-acts/[id]/approve     — согласовать
POST   /remediation-acts/[id]/print       — печать

POST   /defects/[id]/accept              — принять устранение
POST   /defects/[id]/reject              — вернуть на доработку
POST   /defects/[id]/extend-deadline     — продлить срок

GET    /sk-analytics                     — аналитика (4 агрегации)
```

### 3.2. Ключевая логика — завершение проверки (ЦУС стр. 274–275)

```typescript
// POST /inspections/[id]/complete:
// 1. Проверить responsibleId и contractorPresent заполнены
// 2. status → COMPLETED, completedAt = now()
// 3. Если есть defects:
//    a) Создать InspectionAct
//    b) Группировать defects по requiresSuspension:
//       false → Prescription(DEFECT_ELIMINATION)
//       true  → Prescription(WORK_SUSPENSION)
//    c) Привязать defects к prescriptions
// 4. Notification для responsibleId
```

---

## Шаг 4 — Вкладка «Проверки» (День 5–6)

```
Компоненты:
  InspectionsView.tsx        ← TanStack Table (№, Проверяющий, Ответственный, Даты, Статус, Недостатки)
  StartInspectionDialog.tsx  ← Автозаполнение объекта/даты/проверяющего
  InspectionCard.tsx         ← 6 вкладок: Информация | Файлы | Недостатки | Предписания | Акт проверки | Акты устранения
  AddDefectDialog.tsx        ← Типовой (из справочника) / Вручную
  GprPositionsSelector.tsx   ← Выбор позиций ГПР с объёмами
```

---

## Шаг 5 — «Акты проверки» и «Предписания» (День 7–8)

```
Компоненты:
  InspectionActsView.tsx     ← Реестр + печать + скачать архивом
  PrescriptionsView.tsx      ← Реестр, два типа: --УН / --ПР
  PrescriptionCard.tsx       ← Просмотр + подписание через ApprovalRoute
```

---

## Шаг 6 — Вкладка «Недостатки» расширенная (День 8–9)

Переиспользовать DefectsContent + добавить:
- Колонка «Категория» (DefectCategory Badge)
- Колонка «Срок устранения» с красной подсветкой просрочки
- Карточка недостатка: 8 вкладок по ЦУС
- Кнопки: Принять / Вернуть на доработку / Продлить срок

---

## Шаг 7 — «Акты устранения недостатков» (День 9–10)

```
CreateRemediationDialog — Wizard:
  Шаг 1: Select предписание
  Шаг 2: Чекбоксы недостатков из предписания
  Шаг 3: Для каждого — мероприятия + примечание + файлы
  → POST → статус недостатков = PENDING_REVIEW
```

---

## Шаг 8 — Аналитика (День 10)

4 виджета Recharts (ЦУС стр. 288–289):
1. Категории недостатков
2. Статусы нарушений
3. Авторы СК (по inspectorId)
4. Ответственные за устранение (по assigneeId)

Каждый виджет: тумблер line/bar/pie + фильтры по периоду

---

## Шаг 9 — Уведомления и PDF (День 11)

```
cron/prescription-deadline/route.ts — уведомление о просрочке (≤3 дня до deadline)
templates/sk/ — 4 Handlebars-шаблона (акт, предписание-УН, предписание-ПР, акт устранения)
lib/pdf/sk-pdf-generator.ts — паттерн из id-registry-generator.ts
```

---

## Шаг 10 — ОТиТБ и полировка (День 12)

```
SafetyBriefingsView.tsx — простой CRUD инструктажей
npx tsc --noEmit, loading/error, миграция в start.sh
```

---

## Итоговая структура файлов

```
src/
├── app/(dashboard)/objects/[objectId]/sk/
│   ├── layout.tsx + page.tsx
│   ├── inspections/page.tsx + [id]/page.tsx
│   ├── inspection-acts/page.tsx
│   ├── prescriptions/page.tsx
│   ├── defects/page.tsx + [defectId]/page.tsx
│   ├── remediation-acts/page.tsx
│   └── analytics/page.tsx
│
├── app/api/projects/[projectId]/
│   ├── inspections/ (route + [id]/ + complete/ + add-defect/ + add-remediation/)
│   ├── inspection-acts/ (route + [id]/ + [id]/print/)
│   ├── prescriptions/ (route + [id]/ + [id]/print/)
│   ├── remediation-acts/ (route + [id]/ + [id]/approve/ + [id]/print/)
│   ├── defects/[id]/ (accept/ + reject/ + extend-deadline/)
│   ├── sk-analytics/route.ts
│   └── safety-briefings/route.ts
│
├── app/api/cron/prescription-deadline/route.ts
│
├── components/objects/sk/
│   ├── InspectionsView.tsx, StartInspectionDialog.tsx
│   ├── InspectionCard.tsx, AddDefectDialog.tsx, GprPositionsSelector.tsx
│   ├── InspectionActsView.tsx, InspectionActCard.tsx
│   ├── PrescriptionsView.tsx, PrescriptionCard.tsx
│   ├── RemediationActsView.tsx, CreateRemediationDialog.tsx, RemediationActCard.tsx
│   ├── SkAnalyticsView.tsx
│   └── SafetyBriefingsView.tsx
│
├── lib/pdf/sk-pdf-generator.ts
└── templates/sk/ (4 шаблона .hbs)
```

---

## Порядок задач в Claude Code (12 дней)

```
День 1–2:  Prisma: 6 enum-ов, 5 моделей, расширение Defect. Миграция.
День 3:    Layout 6 вкладок, файловая структура, sidebar.
День 4–5:  Все API роуты. POST /complete с авто-созданием актов/предписаний.
День 5–6:  InspectionsView, StartInspectionDialog, InspectionCard, AddDefectDialog.
День 7–8:  InspectionActsView, PrescriptionsView, карточки.
День 8–9:  Расширение DefectsContent, карточка недостатка 8 вкладок, accept/reject/extend.
День 9–10: RemediationActsView, CreateRemediationDialog (Wizard), RemediationActCard.
День 10:   SkAnalyticsView (4 виджета Recharts с тумблером).
День 11:   Cron prescription-deadline, 4 шаблона HBS, sk-pdf-generator.ts.
День 12:   SafetyBriefingsView, tsc --noEmit, loading/error, start.sh.
```

> **Совет:** каждую задачу начинай с `Прочитай CLAUDE.md и ROADMAP.md`.
