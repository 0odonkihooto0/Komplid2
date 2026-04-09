templates/
└── docx/
    ├── aosr.docx           (есть)
    ├── ozr.docx            (добавим позже)
    ├── ks2.docx            (добавим позже)
    ├── ks3.docx            (добавим позже)
    ├── avk.docx            (добавим позже)
    ├── zhvk.docx           (добавим позже)
    └── README.md

# Шаблоны документов — маппинг полей

Шаблоны используют библиотеку `docxtemplater` + `pizzip`.
Плейсхолдеры: одиночные поля `{field}`, массивы `{#items}...{/items}`, условия `{#flag}...{/flag}`.

---

## aosr.docx — АОСР (Акт освидетельствования скрытых работ)

Данные собираются в `src/app/api/templates/[id]/generate/route.ts` через Prisma,
маппируются в `AosrDocxData` из `src/types/templates.ts`.

| Описание | Плейсхолдер | Источник в Prisma | Тип | Примечание |
|---|---|---|---|---|
| Объект капитального строительства | `{object}` | `Contract → Project.name` + `", "` + `Project.address` | String | Объект строительства — 2 строки, если длинный |
| Застройщик / технический заказчик | `{zakazchikOrg}` | `Contract.participants[role=CUSTOMER].organizationName` | String | Полное наименование организации |
| Лицо, осуществляющее строительство | `{stroiteliOrg}` | `Contract.participants[role=CONTRACTOR].organizationName` | String | Полное наименование подрядчика |
| Номер акта | `{№}` | `ExecutionDoc.id` (последние 6 символов) или `WorkRecord.id` | String | Автогенерируемый при создании |
| День даты составления акта | `{D}` | `ExecutionDoc.generatedAt` → `getDate()` | String | Форматировать как "01", "15" |
| Месяц даты составления акта | `{M}` | `ExecutionDoc.generatedAt` → `getMonth()+1` | String | Форматировать как "01", "12" |
| Год даты составления акта | `{Y}` | `ExecutionDoc.generatedAt` → `getFullYear()` | String | Форматировать как "2025" |
| Представитель застройщика (стройконтроль) — полные реквизиты | `{zakazchik1}` | `Contract.participants[role=CUSTOMER]` → `position + " " + representativeName + ", приказ №" + appointmentOrder` | String | Должность + ФИО + приказ |
| Представитель подрядчика (стройконтроль) — полные реквизиты | `{stroiteli1}` | `Contract.participants[role=CONTRACTOR]` → `position + " " + representativeName + ", приказ №" + appointmentOrder` | String | |
| Представитель подрядчика по вопросам стройконтроля — полные реквизиты | `{stroiteli2}` | `Contract.participants[role=CONTROLLER]` → `position + " " + representativeName + ", приказ №" + appointmentOrder` | String | Если роль CONTROLLER отдельна от CONTRACTOR |
| Представитель проектировщика — полные реквизиты | `{projectirovshik1}` | `Contract.participants[role=DESIGNER]` → `position + " " + representativeName + ", приказ №" + appointmentOrder` | String | |
| Представитель субподрядчика / исполнителя — полные реквизиты | `{stroiteli3}` | `Contract.participants[role=SUBCONTRACTOR]` → `position + " " + representativeName + ", приказ №" + appointmentOrder` | String | Кто непосредственно выполнял работы |
| Название подрядной организации (краткое) | `{stroiteli}` | `Contract.participants[role=CONTRACTOR].organizationName` | String | Только название компании, без реквизитов |
| Наименование работ, предъявляемых к освидетельствованию | `{rabota}` | `WorkRecord.description` или `WorkItem.name` | String | Полное наименование работ |
| Ссылка на проектную документацию | `{project}` | `WorkItem.cipher` + `" рабочего проекта"` | String | Шифр и раздел проекта |
| Применяемые материалы | `{material}` | `WorkRecord.materialWriteoffs` → `Material.name + " " + Material.documentNumber` (перечисление через перенос строки) | String | Каждый материал с реквизитами сертификата |
| Исполнительная схема | `{shema}` | Список `ArchiveDocument` с категорией `EXECUTIVE_SCHEMA`, привязанных к `WorkRecord` | String | Номер схемы / чертежа |
| Испытания и протоколы | `{ispitaniya}` | `InputControlRecord.result` + `InputControlAct` из `MaterialBatch`, привязанных к материалам | String | Протоколы испытаний, акты входного контроля |
| День начала работ | `{D1}` | `WorkRecord.startDate` → `getDate()` | String | |
| Месяц начала работ | `{M1}` | `WorkRecord.startDate` → `getMonth()+1` | String | |
| Год начала работ | `{Y1}` | `WorkRecord.startDate` → `getFullYear()` | String | |
| День окончания работ | `{D2}` | `WorkRecord.date` → `getDate()` | String | Дата записи = дата окончания |
| Месяц окончания работ | `{M2}` | `WorkRecord.date` → `getMonth()+1` | String | |
| Год окончания работ | `{Y2}` | `WorkRecord.date` → `getFullYear()` | String | |
| Нормативные документы (СНиП, СП, ГОСТ) | `{SNIP}` | `WorkRecord.normative` (поле нормативной ссылки) | String | Перечисление применяемых норм |
| Разрешается производство последующих работ | `{Next}` | Ручной ввод или `overrideFields.Next` | String | Следующий вид работ по технологии |
| Количество экземпляров акта | `{N}` | По умолчанию `"3"` или `overrideFields.N` | String | |
| Приложения | `{DOP}` | Список схем + протоколов из `ArchiveDocument` | String | Перечень приложений к акту |
| ФИО представителя застройщика (подпись) | `{zakazchik2}` | `Contract.participants[role=CUSTOMER].representativeName` | String | Только ФИО (без должности) |
| ФИО представителя подрядчика (подпись) | `{stroiteli21}` | `Contract.participants[role=CONTRACTOR].representativeName` | String | Только ФИО |
| ФИО представителя по стройконтролю (подпись) | `{stroiteli22}` | `Contract.participants[role=CONTROLLER].representativeName` | String | Только ФИО |
| ФИО представителя проектировщика (подпись) | `{projectirovshik2}` | `Contract.participants[role=DESIGNER].representativeName` | String | Только ФИО |
| ФИО представителя исполнителя (подпись) | `{stroiteli32}` | `Contract.participants[role=SUBCONTRACTOR].representativeName` | String | Только ФИО |

---

## Типы данных

TypeScript-типы для `docxtemplater` → `AosrDocxData` в `src/types/templates.ts`.
Сервис генерации → `src/lib/templates/docxGenerator.ts`.
API-маршрут → `src/app/api/templates/[id]/generate/route.ts`.

---

## Остальные шаблоны (добавим после отработки aosr.docx)

- **ozr.docx** — Общий журнал работ. Плейсхолдеры: `{object}`, `{contractNumber}`, `{startDate}`, `{#section3Rows}...{/section3Rows}`, `{#section5Rows}...{/section5Rows}`
- **ks2.docx** — КС-2. Плейсхолдеры: `{contractNumber}`, `{period}`, `{#items}...{/items}`, `{totalAmount}`
- **ks3.docx** — КС-3. Плейсхолдеры: `{contractNumber}`, `{period}`, `{totalAmount}`, `{cumulativeAmount}`
- **avk.docx** — Акт входного контроля. Плейсхолдеры: `{materialName}`, `{batchNumber}`, `{inspectionDate}`, `{result}`
- **zhvk.docx** — Журнал входного контроля. Плейсхолдеры: `{#records}...{/records}`
