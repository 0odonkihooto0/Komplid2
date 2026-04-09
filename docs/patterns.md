# patterns.md — Правила написания компонентов и соглашения по коду

## Правила написания компонентов

### Размер и декомпозиция

* Максимум **~150 строк** на один компонент. Если файл превышает этот порог — **обязательно** разбить на подкомпоненты
* Дробить нужно по смыслу, а не механически: каждый компонент = одна ответственность
* Если сложно дать компоненту короткое название — это сигнал, что он делает слишком много

### Разделение UI и логики (обязательно)

Логика и UI всегда живут в разных файлах:

```
# Правильно:
components/modules/contracts/
  ├── ContractCard.tsx        # только JSX-разметка (~60-80 строк)
  └── useContractCard.ts      # стейт, запросы к API, вычисления

# Неправильно:
  └── ContractCard.tsx        # 300 строк с fetch, useState и JSX вперемешку
```

### Что куда класть

* **`*.tsx` компонент** — только JSX и пропсы. Никаких fetch, useEffect с логикой, сложных вычислений
* **`use*.ts` хук** — запросы (TanStack Query), стейт (useState/useReducer), бизнес-логика, форматирование данных
* **`utils/`** — чистые функции без React (форматирование дат, расчёты остатков материалов и т.д.)

### Примеры декомпозиции для StroyDocs

```
# Страница договора:
ContractPage.tsx              # layout + tabs (~80 строк)
  ├── ContractHeader.tsx       # шапка с реквизитами (~60 строк)
  ├── ContractParticipants.tsx # участники строительства (~70 строк)
  ├── ContractWorkItems.tsx    # таблица работ (~80 строк)
  └── useContract.ts           # вся логика загрузки и мутаций
```

---

## Соглашения по коду

### Именование

* Компоненты: `PascalCase` → `ContractCard.tsx`
* Хуки: `camelCase` с `use` → `useContracts.ts`
* API роуты: `kebab-case` → `/api/work-items`
* БД модели в Prisma: `PascalCase`
* Переменные/функции: `camelCase`
* Бренд в коде: `stroydocs` (не `builddocs`)

### Структура папок (Next.js App Router)

```
stroydocs/
├── src/
│   ├── app/
│   │   ├── (auth)/              # /login, /register, /invite
│   │   ├── (dashboard)/         # Основное приложение (за авторизацией)
│   │   │   ├── objects/             # Список объектов (ранее projects/)
│   │   │   │   └── [objectId]/      # Объект строительства
│   │   │   │       ├── passport/    # Паспорт объекта
│   │   │   │       ├── gpr/         # График производства работ
│   │   │   │       ├── estimates/   # Сметы
│   │   │   │       ├── resources/   # Ресурсы / Склад
│   │   │   │       ├── journals/    # Журналы (ОЖР, ЖВК и др.)
│   │   │   │       ├── id/          # Исполнительная документация
│   │   │   │       ├── sk/          # Строительный контроль
│   │   │   │       └── reports/     # Отчёты
│   │   │   ├── projects/            # Редирект → /objects (обратная совместимость)
│   │   │   ├── organizations/
│   │   │   ├── documents/
│   │   │   ├── analytics/
│   │   │   ├── subscriptions/      # Тарифы, управление подпиской
│   │   │   ├── referrals/          # Реферальная программа
│   │   │   ├── normative/          # Справочник СНиП, СП, ГОСТ
│   │   │   └── templates/          # Справочник шаблонов документов
│   │   └── api/                 # Next.js API Routes
│   ├── components/
│   │   ├── ui/                  # shadcn/ui (авто-генерация)
│   │   ├── shared/              # Переиспользуемые компоненты
│   │   └── modules/             # По модулям: objects/, contracts/, materials/, execution-docs/, defects/, gantt/, input-control/, approval/, ks2/, analytics/, subscriptions/, referrals/, normative/, templates/
│   ├── lib/
│   │   ├── db.ts                # Prisma client (singleton)
│   │   ├── auth.ts              # NextAuth конфиг
│   │   ├── s3.ts                # Timeweb S3 клиент
│   │   ├── queue.ts             # BullMQ + Redis
│   │   ├── ksi/                 # Классификатор строительной информации
│   │   ├── isup/                # Адаптер ИСУП Минстроя
│   │   ├── approval/            # Логика workflow согласования
│   │   ├── subscriptions/       # Логика подписок и лимитов
│   │   ├── payments/            # Интеграция с ЮKassa / Tilda webhook
│   │   └── referrals/           # Реферальная программа
│   ├── hooks/                   # Кастомные React-хуки
│   ├── types/                   # TypeScript типы и интерфейсы
│   └── utils/                   # Утилиты
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── templates/                   # HTML-шаблоны PDF (АОСР, ОЖР)
├── docker-compose.yml           # Локальная разработка
├── .env.example
└── CLAUDE.md
```

### Типизация

* Строгий TypeScript (`strict: true` в tsconfig)
* Zod — валидация всех входящих данных (API + формы)
* Все API-ответы типизировать через `ApiResponse<T>`

### Известные ловушки TypeScript / React (не повторять)

* **Generic + spread теряет тип**: `<T extends Record<string, unknown>>(base: T): T` при `{ ...base, ...overrides }` TypeScript расширяет результат до `Record<string, unknown>`, теряя `T`. Правильно: `<T>(base: T): T` с `{ ...(base as object), ...(overrides as object) } as T`
* **lucide-react не принимает `title`**: иконки Lucide (`AlertCircle`, `Info` и др.) не имеют prop `title` — это вызовет TS-ошибку. Для tooltip-текста использовать `aria-label` или обернуть в `<span title="...">`.
* **ExcelJS `row.values` — union type без `.map()`**: тип `Row.values` в ExcelJS — это `CellValue[] | { [key: string]: CellValue }`, не просто массив. Даже после `?? []` TypeScript видит объектную часть union и отказывает в вызове `.map()`. **Никогда не использовать `row.values.map()`** — вместо этого использовать `row.eachCell({ includeEmpty: true }, (cell) => ...)` для итерации по всем ячейкам строки, или `row.getCell(n).value` для доступа по индексу (1-based в ExcelJS).
* **`[...new Set(...)]` — ошибка при target < ES2015**: spread оператор на `Set` (`[...new Set(arr)]`) вызывает TS-ошибку `Type 'Set<T>' can only be iterated through when using '--downlevelIteration'` при сборке Next.js. **Всегда использовать `Array.from(new Set(arr))`** вместо спреда Set.
* **React Hooks после условного `return` — `react-hooks/rules-of-hooks`**: любой хук (`useMemo`, `useCallback`, `useEffect` и др.) объявленный ПОСЛЕ раннего `if (...) return ...` вызовет ошибку сборки `React Hook is called conditionally`. **Всегда объявлять все хуки ДО любых ранних return**, даже если результат хука используется только после условия. Пример правильного порядка: хуки → useMemo/useCallback → ранние return → JSX.
* **React Hook Form + zodResolver — explicit generic избыточен**: при `useForm({ resolver: zodResolver(mySchema) })` явный тип-generic `useForm<MySchemaType>` не нужен — RHF автоматически выводит тип из резолвера. Удалять отдельный `type MyInput = z.infer<typeof mySchema>` если он нужен **только** для generic `useForm`. Если тип используется в других местах (например, пропсы функции `onSubmit`) — оставить.
* **Bcrypt Long Password DoS — всегда добавлять `.max(72)` к паролю в Zod**: bcrypt внутри ограничивает обработку 72 байтами, но строка всё равно аллоцируется и копируется в памяти. Злоумышленник может отправить 1МБ-пароль и нагрузить CPU/память. **Всегда добавлять** `.max(72, 'Пароль не может быть длиннее 72 символов')` к любой Zod-схеме, где поле `password` передаётся в `bcrypt.hash()` или `bcrypt.compare()`. Реализовано в `src/lib/validations/auth.ts` через общий `passwordSchema`.
* **Handlebars шаблоны — кэшировать через Promise, не перечитывать файл**: вызов `fs.readFileSync` + `Handlebars.compile()` внутри функции PDF-генерации = блокирует event loop и перекомпилирует при каждом вызове. **Паттерн**: хранить `let templatePromise: Promise<HandlebarsTemplateDelegate> | null = null` на уровне модуля, инициализировать один раз через `fs.promises.readFile().then(Handlebars.compile)`. Promise-кэш (не результат!) гарантирует однократное чтение даже при параллельных конкурентных вызовах. Реализовано в `id-registry-generator.ts` и `ks2-pdf-generator.ts`.
* **XML-парсер смет — error paths покрыты только частично тестами**: `src/lib/estimates/parsers/xml-parser.ts` имеет try-catch блоки в `parseGrandSmetaXml` и `parseRikXml`, но юнит-тестов на error path нет. При написании тестов мокировать внутренние структуры xml2js (например, передать объект без ожидаемых полей), проверять что `logger.error` вызван и результат содержит предупреждения, а не краш. Тестировать: happy path Grand-Smeta, happy path RIK, error path Grand-Smeta, error path RIK, невалидный XML.
