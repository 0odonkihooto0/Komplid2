# Модуль 8 — Ресурсы (Склад, Закупки, Логистика): подробный план

> Аналог: ЦУС → Модуль «Ресурсы» (стр. 205–226 руководства)  
> Вкладки: **Планирование · Заявки · Закупки и логистика · Склад**  
> Ориентир: **3–4 недели**

---

## Что уже есть (переиспользуем полностью)

```
Material              → реестр материалов с остатками                      ✅
MaterialDocument      → сертификаты и паспорта качества                    ✅
MaterialBatch         → партионный учёт (ЖВК + АВК)                        ✅
MaterialWriteoff      → списание материалов из WorkRecord                   ✅

API роуты (все работают):
GET/POST /api/projects/[id]/contracts/[cid]/materials
GET/PATCH/DELETE /api/contracts/[cid]/materials/[mid]
POST /api/contracts/[cid]/materials/[mid]/batches
GET/POST /api/contracts/[cid]/input-control/...

Компоненты (все работают):
MaterialsList.tsx, MaterialCard.tsx, MaterialForm.tsx ✅
```

---

## Что нужно создать

```
1. MaterialRequest     → заявка на материал (ЛРВ → Заявка → Заказ)
2. SupplierOffer       → предложения поставщиков (тендерный реестр)
3. SupplierOrder       → заказ поставщику
4. WarehouseMovement   → складские документы (Поступление/Отгрузка/Перемещение/Списание)
5. Warehouse           → склад объекта (место хранения)
6. MaterialNomenclature → справочник номенклатуры

7. URL /objects/[id]/resources/ + layout с 4 вкладками
8. Вкладка «Планирование» — ЛРВ + потребность из ГПР
9. Вкладка «Заявки» — реестр заявок + создание из ЛРВ
10. Вкладка «Закупки и логистика» — заказы поставщику
11. Вкладка «Склад» — складские документы + остатки
12. Автосвязь: поступление на склад → предзаполнение ЖВК
```

---

## Шаг 1 — Prisma-схема (День 1–2)

### 1.1. Новые модели

```prisma
// prisma/schema.prisma

// ─────────────────────────────────────────────
// СПРАВОЧНИК НОМЕНКЛАТУРЫ
// ─────────────────────────────────────────────

/// Справочник номенклатуры материалов (связующее звено между всеми документами)
model MaterialNomenclature {
  id             String   @id @default(uuid())
  name           String                          // Наименование
  unit           String?                         // Единица измерения
  category       String?                         // Категория (металл, бетон, кирпич...)
  vendorCode     String?                         // Артикул
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id])

  createdAt      DateTime @default(now())

  requestItems   MaterialRequestItem[]
  orderItems     SupplierOrderItem[]
  warehouseItems WarehouseItem[]

  @@index([organizationId])
  @@map("material_nomenclature")
}

// ─────────────────────────────────────────────
// ЛИМИТНО-РАЗДЕЛИТЕЛЬНАЯ ВЕДОМОСТЬ И ЗАЯВКИ
// ─────────────────────────────────────────────

/// Лимитно-разделительная ведомость (ЛРВ)
model MaterialRequest {
  id          String              @id @default(uuid())
  number      String                                   // Номер (авто или вручную)
  status      MaterialRequestStatus @default(DRAFT)
  deliveryDate DateTime?                              // Срок поставки
  notes       String?

  // Поставщик
  supplierOrgId String?
  supplierOrg   Organization? @relation("RequestSupplier", fields: [supplierOrgId], references: [id])

  // Менеджер МТС и ответственный на объекте
  managerId   String?
  manager     User?   @relation("RequestManager", fields: [managerId], references: [id])
  responsibleId String?
  responsible  User?  @relation("RequestResponsible", fields: [responsibleId], references: [id])

  // Руководитель (кто согласовал)
  approvedById String?
  approvedBy   User?  @relation("RequestApprover", fields: [approvedById], references: [id])

  projectId   String
  project     BuildingObject @relation(fields: [projectId], references: [id], onDelete: Cascade)

  createdById String
  createdBy   User   @relation("RequestCreator", fields: [createdById], references: [id])

  // Маршрут согласования
  approvalRouteId String? @unique
  approvalRoute   ApprovalRoute? @relation(fields: [approvalRouteId], references: [id])

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  items       MaterialRequestItem[]
  orders      SupplierOrder[]      // Заказы созданные из этой заявки

  @@index([projectId])
  @@map("material_requests")
}

enum MaterialRequestStatus {
  DRAFT        // Черновик (ЛРВ)
  SUBMITTED    // Подана
  APPROVED     // Согласована
  IN_PROGRESS  // В закупке
  DELIVERED    // Поставлена
  CANCELLED    // Отменена
}

/// Позиция заявки на материал
model MaterialRequestItem {
  id              String   @id @default(uuid())
  quantity        Float                           // Количество (заявленное)
  quantityOrdered Float    @default(0)            // Заказано
  unit            String?
  unitPrice       Float?                          // Закупочная цена
  notes           String?

  // Статус позиции
  status          String?                         // Не обработана / В работе / Поставлена

  nomenclatureId  String?
  nomenclature    MaterialNomenclature? @relation(fields: [nomenclatureId], references: [id])

  // Привязка к Material (существующий учёт)
  materialId      String?
  material        Material? @relation(fields: [materialId], references: [id])

  // Привязка к позиции ГПР
  ganttTaskId     String?
  ganttTask       GanttTask? @relation(fields: [ganttTaskId], references: [id])

  requestId       String
  request         MaterialRequest @relation(fields: [requestId], references: [id], onDelete: Cascade)

  @@index([requestId])
  @@index([nomenclatureId])
  @@map("material_request_items")
}

// ─────────────────────────────────────────────
// ЗАКАЗЫ ПОСТАВЩИКУ
// ─────────────────────────────────────────────

/// Заказ поставщику (создаётся из заявки)
model SupplierOrder {
  id            String            @id @default(uuid())
  number        String
  status        SupplierOrderStatus @default(DRAFT)
  orderDate     DateTime          @default(now())
  deliveryDate  DateTime?
  totalAmount   Float?
  notes         String?

  // Поставщик (Исполнитель)
  supplierOrgId String?
  supplierOrg   Organization? @relation("OrderSupplier", fields: [supplierOrgId], references: [id])

  // Заказчик
  customerOrgId String?
  customerOrg   Organization? @relation("OrderCustomer", fields: [customerOrgId], references: [id])

  // Склад получатель
  warehouseId   String?
  warehouse     Warehouse? @relation(fields: [warehouseId], references: [id])

  // Откуда создан
  requestId     String?
  request       MaterialRequest? @relation(fields: [requestId], references: [id])

  projectId     String
  project       BuildingObject @relation(fields: [projectId], references: [id], onDelete: Cascade)

  createdById   String
  createdBy     User   @relation("OrderCreator", fields: [createdById], references: [id])

  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  items         SupplierOrderItem[]
  movements     WarehouseMovement[]   // Поступления по этому заказу

  @@index([projectId])
  @@index([requestId])
  @@map("supplier_orders")
}

enum SupplierOrderStatus {
  DRAFT      // Черновик
  SENT       // Отправлен поставщику
  CONFIRMED  // Подтверждён поставщиком
  DELIVERED  // Поставлен (частично или полностью)
  COMPLETED  // Закрыт
  CANCELLED  // Отменён
}

/// Позиция заказа поставщику
model SupplierOrderItem {
  id             String   @id @default(uuid())
  quantity       Float
  unit           String?
  unitPrice      Float?
  totalPrice     Float?

  nomenclatureId String?
  nomenclature   MaterialNomenclature? @relation(fields: [nomenclatureId], references: [id])

  orderId        String
  order          SupplierOrder @relation(fields: [orderId], references: [id], onDelete: Cascade)

  @@index([orderId])
  @@map("supplier_order_items")
}

// ─────────────────────────────────────────────
// СКЛАД
// ─────────────────────────────────────────────

/// Склад объекта
model Warehouse {
  id          String   @id @default(uuid())
  name        String                        // Название склада
  location    String?                       // Местоположение
  isDefault   Boolean  @default(false)      // Основной склад объекта

  projectId   String
  project     BuildingObject @relation(fields: [projectId], references: [id], onDelete: Cascade)

  createdAt   DateTime @default(now())

  items       WarehouseItem[]
  movements   WarehouseMovement[]
  orders      SupplierOrder[]

  @@index([projectId])
  @@map("warehouses")
}

/// Остатки на складе (по номенклатуре)
model WarehouseItem {
  id             String   @id @default(uuid())
  quantity       Float    @default(0)        // Текущий остаток
  reservedQty    Float    @default(0)        // Зарезервировано
  unit           String?

  warehouseId    String
  warehouse      Warehouse @relation(fields: [warehouseId], references: [id], onDelete: Cascade)

  nomenclatureId String
  nomenclature   MaterialNomenclature @relation(fields: [nomenclatureId], references: [id])

  updatedAt      DateTime @updatedAt

  @@unique([warehouseId, nomenclatureId])
  @@index([warehouseId])
  @@map("warehouse_items")
}

/// Складское движение (Поступление / Отгрузка / Перемещение / Списание)
model WarehouseMovement {
  id             String              @id @default(uuid())
  number         String
  movementType   WarehouseMovementType
  status         WarehouseMovStatus  @default(DRAFT)
  movementDate   DateTime            @default(now())
  notes          String?

  // Склад-источник (для перемещения и отгрузки)
  fromWarehouseId String?
  fromWarehouse   Warehouse? @relation("MovementFrom", fields: [fromWarehouseId], references: [id])

  // Склад-назначение (для поступления и перемещения)
  toWarehouseId   String?
  toWarehouse     Warehouse? @relation("MovementTo", fields: [toWarehouseId], references: [id])

  // Заказ-основание
  orderId         String?
  order           SupplierOrder? @relation(fields: [orderId], references: [id])

  projectId       String
  project         BuildingObject @relation(fields: [projectId], references: [id], onDelete: Cascade)

  createdById     String
  createdBy       User   @relation("MovementCreator", fields: [createdById], references: [id])

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  lines           WarehouseMovementLine[]

  @@index([projectId])
  @@index([movementType])
  @@map("warehouse_movements")
}

enum WarehouseMovementType {
  RECEIPT       // Поступление (приход от поставщика)
  SHIPMENT      // Отгрузка
  TRANSFER      // Перемещение между складами
  WRITEOFF      // Списание в производство
  RETURN        // Возврат поставщику
}

enum WarehouseMovStatus {
  DRAFT         // Черновик
  CONDUCTED     // Проведён (влияет на остатки)
  CANCELLED     // Отменён
}

/// Строка складского движения
model WarehouseMovementLine {
  id             String            @id @default(uuid())
  quantity       Float
  unit           String?
  unitPrice      Float?
  totalPrice     Float?
  notes          String?

  movementId     String
  movement       WarehouseMovement @relation(fields: [movementId], references: [id], onDelete: Cascade)

  nomenclatureId String?
  nomenclature   MaterialNomenclature? @relation(fields: [nomenclatureId], references: [id])

  // Привязка к ЖВК (для автоматического заполнения)
  materialBatchId String?
  materialBatch   MaterialBatch? @relation(fields: [materialBatchId], references: [id])

  @@index([movementId])
  @@map("warehouse_movement_lines")
}
```

### 1.2. Добавить в существующие модели

```prisma
// В model Material:
requestItems MaterialRequestItem[]

// В model MaterialBatch:
movementLines WarehouseMovementLine[]

// В model GanttTask:
requestItems MaterialRequestItem[]

// В model BuildingObject:
materialRequests MaterialRequest[]
supplierOrders   SupplierOrder[]
warehouses       Warehouse[]
warehouseMovements WarehouseMovement[]

// В model Organization:
supplierRequests  MaterialRequest[]  @relation("RequestSupplier")
supplierOrders    SupplierOrder[]    @relation("OrderSupplier")
customerOrders    SupplierOrder[]    @relation("OrderCustomer")
nomenclature      MaterialNomenclature[]

// В model User:
requestsManaged   MaterialRequest[] @relation("RequestManager")
requestsResponsible MaterialRequest[] @relation("RequestResponsible")
requestsApproved  MaterialRequest[] @relation("RequestApprover")
requestsCreated   MaterialRequest[] @relation("RequestCreator")
ordersCreated     SupplierOrder[]   @relation("OrderCreator")
movementsCreated  WarehouseMovement[] @relation("MovementCreator")
```

### 1.3. Команда для Claude Code

```
Прочитай CLAUDE.md. Добавь в prisma/schema.prisma:
MaterialNomenclature, MaterialRequest (с enum MaterialRequestStatus),
MaterialRequestItem, SupplierOrder (с SupplierOrderStatus),
SupplierOrderItem, Warehouse, WarehouseItem,
WarehouseMovement (с WarehouseMovementType, WarehouseMovStatus),
WarehouseMovementLine.

Добавь новые relations в: Material, MaterialBatch, GanttTask,
BuildingObject, Organization, User.

npx prisma migrate dev --name add_module8_resources
npx prisma generate
```

---

## Шаг 2 — URL и layout (День 3)

### 2.1. Файловая структура

```
src/app/(dashboard)/objects/[objectId]/resources/
  layout.tsx          ← Tabs: 4 вкладки
  page.tsx            ← redirect → /resources/planning
  planning/
    page.tsx          ← Планирование (ЛРВ + материалы из ГПР)
  requests/
    page.tsx          ← Заявки
    [requestId]/
      page.tsx        ← Карточка заявки
  procurement/
    page.tsx          ← Закупки и логистика
    [orderId]/
      page.tsx        ← Карточка заказа
  warehouse/
    page.tsx          ← Склад
```

### 2.2. Layout с 4 вкладками

```tsx
// src/app/(dashboard)/objects/[objectId]/resources/layout.tsx
const TABS = [
  { label: 'Планирование',        href: 'planning' },
  { label: 'Заявки',              href: 'requests' },
  { label: 'Закупки и логистика', href: 'procurement' },
  { label: 'Склад',               href: 'warehouse' },
];
```

### 2.3. Убрать TODO-заглушку

```tsx
// Заменить содержимое resources/page.tsx:
import { redirect } from 'next/navigation';
export default function ResourcesPage({ params }) {
  redirect(`/objects/${params.objectId}/resources/planning`);
}
```

---

## Шаг 3 — API роуты (День 4–5)

### 3.1. Номенклатура

```
GET    /api/organizations/[orgId]/nomenclature        — список справочника
POST   /api/organizations/[orgId]/nomenclature        — добавить позицию
PATCH  /api/organizations/[orgId]/nomenclature/[nid]  — редактировать
DELETE /api/organizations/[orgId]/nomenclature/[nid]  — удалить
```

### 3.2. Заявки (ЛРВ)

```
GET    /api/projects/[id]/material-requests           — список
POST   /api/projects/[id]/material-requests           — создать
GET    /api/projects/[id]/material-requests/[rid]     — карточка с позициями
PATCH  /api/projects/[id]/material-requests/[rid]     — обновить
DELETE /api/projects/[id]/material-requests/[rid]     — удалить

POST   /api/projects/[id]/material-requests/[rid]/items         — добавить позицию
PATCH  /api/projects/[id]/material-requests/[rid]/items/[iid]   — обновить позицию
DELETE /api/projects/[id]/material-requests/[rid]/items/[iid]   — удалить позицию

POST   /api/projects/[id]/material-requests/[rid]/create-order  — создать заказ из заявки
POST   /api/projects/[id]/material-requests/from-gpr            — создать ЛРВ из ГПР
GET    /api/projects/[id]/gpr-materials                         — материалы из ГПР (для планирования)
```

**Создание ЛРВ из ГПР:**
```typescript
// POST /api/projects/[id]/material-requests/from-gpr
// Body: { ganttVersionId, ganttTaskIds[], stageId? }

// Получаем позиции ГПР у которых есть материалы
const ganttTasks = await db.ganttTask.findMany({
  where: { versionId, id: { in: ganttTaskIds } },
  include: { workItem: { include: { materials: true } } }
});

// Создаём ЛРВ с позициями из материалов позиций ГПР
const request = await db.materialRequest.create({
  data: {
    number: await generateRequestNumber(projectId),
    projectId,
    createdById,
    items: {
      createMany: {
        data: ganttTasks.flatMap(task =>
          task.workItem?.materials.map(m => ({
            materialId: m.id,
            quantity: m.quantityReceived - m.quantityUsed, // потребность
            unit: m.unit,
            ganttTaskId: task.id,
          })) ?? []
        )
      }
    }
  }
});
```

### 3.3. Заказы поставщику

```
GET    /api/projects/[id]/supplier-orders              — список
POST   /api/projects/[id]/supplier-orders              — создать
GET    /api/projects/[id]/supplier-orders/[oid]        — карточка
PATCH  /api/projects/[id]/supplier-orders/[oid]        — обновить
POST   /api/projects/[id]/supplier-orders/[oid]/conduct       — провести
POST   /api/projects/[id]/supplier-orders/[oid]/create-receipt — создать поступление на склад
```

### 3.4. Склад

```
GET    /api/projects/[id]/warehouses                   — список складов
POST   /api/projects/[id]/warehouses                   — создать склад
GET    /api/projects/[id]/warehouses/[wid]/items       — остатки
GET    /api/projects/[id]/warehouse-movements          — список движений (с фильтром по типу)
POST   /api/projects/[id]/warehouse-movements          — создать движение
GET    /api/projects/[id]/warehouse-movements/[mid]    — карточка
PATCH  /api/projects/[id]/warehouse-movements/[mid]    — обновить
POST   /api/projects/[id]/warehouse-movements/[mid]/conduct — провести (обновить остатки)
```

**Проводка складского движения (обновление остатков):**
```typescript
// POST /api/projects/[id]/warehouse-movements/[mid]/conduct
// При проведении — обновляем WarehouseItem

async function conductMovement(movementId: string) {
  const movement = await db.warehouseMovement.findUniqueOrThrow({
    where: { id: movementId },
    include: { lines: true }
  });

  await db.$transaction(async (tx) => {
    for (const line of movement.lines) {
      if (!line.nomenclatureId) continue;

      if (movement.movementType === 'RECEIPT') {
        // Поступление: увеличить остаток на складе-получателе
        await upsertWarehouseItem(tx, movement.toWarehouseId!, line.nomenclatureId, +line.quantity);
      } else if (movement.movementType === 'WRITEOFF') {
        // Списание: уменьшить остаток
        await upsertWarehouseItem(tx, movement.fromWarehouseId!, line.nomenclatureId, -line.quantity);
      } else if (movement.movementType === 'TRANSFER') {
        // Перемещение: -source, +destination
        await upsertWarehouseItem(tx, movement.fromWarehouseId!, line.nomenclatureId, -line.quantity);
        await upsertWarehouseItem(tx, movement.toWarehouseId!, line.nomenclatureId, +line.quantity);
      }
    }

    await tx.warehouseMovement.update({
      where: { id: movementId },
      data: { status: 'CONDUCTED' }
    });
  });
}

async function upsertWarehouseItem(tx, warehouseId, nomenclatureId, delta) {
  await tx.warehouseItem.upsert({
    where: { warehouseId_nomenclatureId: { warehouseId, nomenclatureId } },
    update: { quantity: { increment: delta } },
    create: { warehouseId, nomenclatureId, quantity: Math.max(0, delta) }
  });
}
```

### 3.5. Команда для Claude Code

```
Создай API роуты Модуля 8:

1. /api/organizations/[orgId]/nomenclature/route.ts — GET, POST
2. /api/organizations/[orgId]/nomenclature/[nid]/route.ts — PATCH, DELETE

3. /api/projects/[projectId]/material-requests/route.ts — GET, POST
4. /api/projects/[projectId]/material-requests/from-gpr/route.ts — POST
5. /api/projects/[projectId]/material-requests/[requestId]/route.ts — GET, PATCH, DELETE
6. /api/projects/[projectId]/material-requests/[requestId]/items/route.ts — POST
7. /api/projects/[projectId]/material-requests/[requestId]/items/[itemId]/route.ts — PATCH, DELETE
8. /api/projects/[projectId]/material-requests/[requestId]/create-order/route.ts — POST
9. /api/projects/[projectId]/gpr-materials/route.ts — GET (материалы из ГПР по объекту)

10. /api/projects/[projectId]/supplier-orders/route.ts — GET, POST
11. /api/projects/[projectId]/supplier-orders/[orderId]/route.ts — GET, PATCH
12. /api/projects/[projectId]/supplier-orders/[orderId]/conduct/route.ts — POST
13. /api/projects/[projectId]/supplier-orders/[orderId]/create-receipt/route.ts — POST

14. /api/projects/[projectId]/warehouses/route.ts — GET, POST
15. /api/projects/[projectId]/warehouses/[warehouseId]/items/route.ts — GET
16. /api/projects/[projectId]/warehouse-movements/route.ts — GET (?type=RECEIPT/WRITEOFF...), POST
17. /api/projects/[projectId]/warehouse-movements/[movementId]/route.ts — GET, PATCH
18. /api/projects/[projectId]/warehouse-movements/[movementId]/conduct/route.ts — POST

Создай lib/warehouse/conduct-movement.ts с логикой обновления WarehouseItem.
```

---

## Шаг 4 — Вкладка «Планирование» (День 6–7)

### 4.1. Двухколоночный layout

```tsx
// src/components/objects/resources/PlanningView.tsx

// Левая панель — разделы:
// [Лимитно-разделительные ведомости]  ← активный
// [Материалы]
// [Машины и механизмы]
// [Работы]

// Правая панель — содержимое выбранного раздела

// === Раздел «ЛРВ» ===
// Таблица: | Номер ЛРВ | Статус | Позиций | Создана | Действия |
// Кнопки: "+ Создать ЛРВ" / "+ Из ГПР"

// === Раздел «Материалы» ===
// Материалы подтягиваются из ГПР (GanttTask + workItem + materials)
// Фильтры: стадия ГПР, версия ГПР, период (с DateRangePicker)
// Таблица: | Наименование | Ед. | Кол-во по ГПР | На складе | Дефицит |
// Чекбоксы → выбрать позиции → "Выбрать для ЛРВ"
// После выбора: панель с выбранными позициями + кнопка "Создать новую ЛРВ"
```

### 4.2. Создание ЛРВ из ГПР — пошаговый UI

```tsx
// Шаг 1: Фильтрация материалов из ГПР
//   Select: Стадия ГПР + Select: Версия ГПР + DateRangePicker
//   → GET /gpr-materials?stageId=&versionId=&from=&to=

// Шаг 2: Выбор позиций (чекбоксы)
//   Таблица с чекбоксами + кнопка "Выбрать для ЛРВ"

// Шаг 3: Предпросмотр выбранных позиций
//   Мини-таблица выбранных: наименование, ед., кол-во, номенклатура (Combobox)
//   Кнопки: "Добавить в ЛРВ" (Select существующей) / "Создать новую ЛРВ"

// Шаг 4: Ввод номера ЛРВ и создание
//   POST /material-requests/from-gpr
```

### 4.3. Команда для Claude Code

```
Создай src/components/objects/resources/PlanningView.tsx.

Двухколоночный layout: левая панель (разделы), правая — контент.

Раздел "ЛРВ":
- TanStack Table: номер, статус (Badge), позиций, дата, действия
- GET /api/projects/${id}/material-requests
- Кнопка "+ Создать ЛРВ" → Dialog с полем номера
- Кнопка "+ Из ГПР" → многошаговый процесс (Wizard):
  Шаг 1: Select стадии + Select версии ГПР + DateRangePicker
  Шаг 2: Таблица материалов с чекбоксами
  Шаг 3: Предпросмотр выбранных + Combobox номенклатуры
  Шаг 4: Номер ЛРВ → POST /from-gpr

Раздел "Материалы":
- GET /gpr-materials с фильтрами
- Таблица с колонками: наименование, ед., кол-во ГПР, остаток склада, дефицит
- Дефицит = кол-во_ГПР - остаток_склада (красный если > 0)
```

---

## Шаг 5 — Карточка ЛРВ (День 8)

```tsx
// /resources/requests/[requestId]/page.tsx

// Шапка: Номер ЛРВ, статус, кнопки действий
// Вкладки: [Информация] [Позиции]

// === Вкладка «Информация» ===
// Форма: поставщик, срок поставки, менеджер МТС, ответственный на объекте
// Статус с историей (статусная машина как в ПИР)

// === Вкладка «Позиции» ===
// Таблица позиций (редактируемая):
// | Наименование | Номенклатура | Ед. | Кол-во | Цена | Итого | Статус |
// Inline редактирование через клик по ячейке
// Кнопка "+ Добавить позицию"
// Чекбоксы → "Выбрать для заявки" → создать MaterialRequest как заявку

// Кнопки в шапке:
// [Подать заявку] → статус DRAFT → SUBMITTED
// [Создать заказ поставщику] → POST /create-order → перейти в Закупки
```

---

## Шаг 6 — Вкладка «Заявки» (День 9)

```tsx
// src/components/objects/resources/RequestsView.tsx

// Реестр всех заявок объекта:
// | Номер | Статус | Поставщик | Срок поставки | Позиций | Сумма | Создана |
// Статус Badge: DRAFT=серый / SUBMITTED=синий / APPROVED=зелёный /
//               IN_PROGRESS=оранжевый / DELIVERED=зелёный тёмный

// Клик по строке → /resources/requests/[id]

// Фильтры: статус (Select) + период (DateRangePicker)
```

---

## Шаг 7 — Вкладка «Закупки и логистика» (День 10–11)

### 7.1. Три раздела в левой панели

```tsx
// src/components/objects/resources/ProcurementView.tsx

// Левая панель:
// [Заказ поставщику]  ← активный по умолчанию
// [Заявка на склад]   (упрощённый вариант заказа)
// [Запрос поставщику] (запрос предложения цен)

// Таблица заказов:
// | Номер | Поставщик | Склад | Сумма | Статус | Создана | Действия |

// Кнопки:
// "+ Добавить заказ" → Dialog
// "Из заявки" → выбор существующей ЛРВ → POST /create-order

// Статус заказа: DRAFT → SENT → CONFIRMED → DELIVERED → COMPLETED

// Кнопка "Создать на основании":
// При статусе CONFIRMED → "Создать поступление" → redirect к Складу
```

### 7.2. Карточка заказа поставщику

```tsx
// /resources/procurement/[orderId]/page.tsx

// Вкладки: [Документ] [Товары]

// === Вкладка «Документ» ===
// Форма: поставщик, заказчик, склад, дата, примечание

// === Вкладка «Товары» ===
// Таблица позиций: номенклатура, кол-во, ед., цена, итого
// Inline добавление строк
// Итоговая сумма автоматически

// Кнопки:
// [Сохранить] [Провести] — меняет статус на CONFIRMED
// [Создать поступление] — появляется после Провести
//   → POST /create-receipt → создаёт WarehouseMovement(RECEIPT) → redirect к Складу
```

### 7.3. Команда для Claude Code

```
Создай компоненты вкладки «Закупки и логистика»:

1. src/components/objects/resources/ProcurementView.tsx
   — Двухколоночный layout: разделы слева, таблица справа
   — TanStack Table заказов
   — Dialog создания заказа: поставщик, заказчик, склад, дата
   — POST /api/projects/${id}/supplier-orders

2. src/app/(dashboard)/objects/[objectId]/resources/procurement/[orderId]/page.tsx
   — Вкладки: Документ / Товары
   — Вкладка Товары: inline редактируемая таблица (клик → Input)
   — Кнопка "Провести" → POST /conduct
   — Кнопка "Создать поступление" → POST /create-receipt → redirect /warehouse
```

---

## Шаг 8 — Вкладка «Склад» (День 12–14)

### 8.1. Шесть разделов в левой панели

```tsx
// src/components/objects/resources/WarehouseView.tsx

// Левая панель:
// [Поступление]    ← активный
// [Отгрузка]
// [Перемещение]
// [Приходный ордер]
// [Расходный ордер]
// [Списание]

// Таблица движений выбранного типа:
// | Номер | Дата | Склад | Сумма | Статус | Действия |

// Статус: DRAFT=серый / CONDUCTED=зелёный / CANCELLED=красный
```

### 8.2. Таблица остатков

```tsx
// Отдельная кнопка/вкладка "Остатки":
// Таблица по складам:
// | Номенклатура | Склад | Кол-во | Зарезервировано | Доступно | Ед. |
// Фильтр по складу (Select)
// Экспорт в Excel
```

### 8.3. Карточка складского движения

```tsx
// Вкладки: [Документ] [Товары]

// Вкладка «Документ»:
// - Тип движения (readonly)
// - Склад-источник / Склад-назначение
// - Поставщик (для RECEIPT) / Заказчик (для SHIPMENT)
// - Дата, примечание, файлы

// Вкладка «Товары»:
// - Таблица позиций: номенклатура, кол-во, цена
// - При RECEIPT: привязка к партии материала (MaterialBatch)
//   → автоматически создаётся MaterialBatch в ЖВК

// Кнопка «Провести»:
// POST /conduct → обновляет WarehouseItem (остатки)
// При RECEIPT: создаёт MaterialBatch для ЖВК

// Кнопка «Создать на основании»:
// → DropdownMenu: Акт списания / Возврат поставщику / Расходный ордер
```

### 8.4. Автосвязь: поступление → ЖВК

```typescript
// При проведении RECEIPT — автоматически создавать MaterialBatch:

if (movement.movementType === 'RECEIPT') {
  for (const line of movement.lines) {
    if (!line.nomenclatureId) continue;

    // Найти материал по номенклатуре в договоре
    const material = await tx.material.findFirst({
      where: {
        name: { contains: line.nomenclature.name, mode: 'insensitive' },
        contract: { projectId: movement.projectId }
      }
    });

    if (material) {
      // Создать партию в ЖВК
      await tx.materialBatch.create({
        data: {
          materialId: material.id,
          batchNumber: `ПСТ-${movement.number}`,
          quantity: line.quantity,
          arrivalDate: movement.movementDate,
          movementLineId: line.id,
        }
      });
    }
  }
}
```

### 8.5. Команда для Claude Code

```
Создай компоненты вкладки «Склад»:

1. src/components/objects/resources/WarehouseView.tsx
   — Двухколоночный layout: разделы слева, таблица движений справа
   — Фильтрация по типу движения (movementType в URL query)
   — Переключатель "Остатки" → таблица WarehouseItem по складу
   — Кнопка "+ Добавить поступление/списание/..."

2. src/app/.../resources/warehouse/page.tsx
   — Передаёт тип движения в WarehouseView

3. Карточка движения — Sheet или отдельная страница:
   — Вкладки: Документ / Товары
   — Товары: inline таблица с Combobox номенклатуры
   — Кнопка "Провести" → POST /conduct
   — При RECEIPT: автоматически создаётся MaterialBatch

4. lib/warehouse/conduct-movement.ts:
   — upsertWarehouseItem(tx, warehouseId, nomenclatureId, delta)
   — createBatchFromReceipt(tx, movement)
```

---

## Шаг 9 — TypeScript и полировка (День 15)

```bash
npx tsc --noEmit
npx eslint . --quiet
```

### Финальный чеклист

```
□ /resources/planning — список ЛРВ + материалы из ГПР с фильтрами
□ /resources/planning — создание ЛРВ из ГПР (Wizard работает)
□ /resources/requests — реестр заявок со статусами
□ /resources/requests/[id] — карточка с позициями, inline редактирование
□ /resources/requests/[id] — создание заказа из заявки
□ /resources/procurement — реестр заказов поставщику
□ /resources/procurement/[id] — карточка заказа, провести, создать поступление
□ /resources/warehouse — 6 разделов, таблица движений
□ /resources/warehouse — таблица остатков по складу
□ Проведение RECEIPT → обновляет WarehouseItem + создаёт MaterialBatch
□ Проведение WRITEOFF → уменьшает WarehouseItem
□ TypeScript — нет ошибок
□ Все API проверяют organizationId
□ findMany с take/skip везде
```

---

## Итоговая структура файлов

```
src/
├── app/(dashboard)/objects/[objectId]/resources/
│   ├── layout.tsx (4 Tabs)
│   ├── page.tsx (redirect)
│   ├── planning/page.tsx
│   ├── requests/page.tsx + [requestId]/page.tsx
│   ├── procurement/page.tsx + [orderId]/page.tsx
│   └── warehouse/page.tsx
│
├── app/api/projects/[projectId]/
│   ├── gpr-materials/route.ts
│   ├── material-requests/route.ts + from-gpr/route.ts
│   │   └── [requestId]/route.ts + items/ + create-order/
│   ├── supplier-orders/route.ts
│   │   └── [orderId]/route.ts + conduct/ + create-receipt/
│   ├── warehouses/route.ts
│   │   └── [warehouseId]/items/route.ts
│   └── warehouse-movements/route.ts
│       └── [movementId]/route.ts + conduct/
│
├── components/objects/resources/
│   ├── PlanningView.tsx
│   ├── GprMaterialsPanel.tsx     ← материалы из ГПР
│   ├── LrvWizard.tsx             ← многошаговое создание ЛРВ
│   ├── RequestsView.tsx
│   ├── RequestCard.tsx
│   ├── ProcurementView.tsx
│   ├── SupplierOrderCard.tsx
│   ├── WarehouseView.tsx
│   ├── WarehouseBalanceTable.tsx ← остатки
│   └── MovementCard.tsx
│
└── lib/warehouse/
    ├── conduct-movement.ts       ← обновление остатков
    └── auto-batch.ts             ← создание MaterialBatch из RECEIPT
```

---

## Порядок задач в Claude Code (15 дней)

```
День 1–2:  Prisma: MaterialNomenclature, MaterialRequest, SupplierOrder,
           Warehouse, WarehouseMovement и все relations. Миграция.

День 3:    Layout, redirect, убрать TODO-заглушку.

День 4–5:  Все API роуты + lib/warehouse/*.ts.

День 6–7:  Вкладка "Планирование" (ЛРВ + Материалы из ГПР + LrvWizard).

День 8:    Карточка ЛРВ (позиции, создание заказа из позиций).

День 9:    Вкладка "Заявки" (реестр + фильтры).

День 10–11: Вкладка "Закупки и логистика" (заказы + карточка + провести).

День 12–14: Вкладка "Склад" (6 разделов + остатки + проведение + автобатч).

День 15:   npx tsc + eslint, loading/error.tsx, полировка.
```

> **Параллельные потоки:**  
> Поток A: Дни 6–8 (Планирование + ЛРВ + Заявки)  
> Поток B: Дни 9–11 (Закупки и логистика)  
> Поток C: Дни 12–14 (Склад + проведение)  
> 15 дней → ~10 дней при параллельной работе

> Каждую задачу начинай с: `Прочитай CLAUDE.md и ROADMAP.md`
