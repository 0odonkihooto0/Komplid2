# Inventory — `(dashboard)/projects/` → `(dashboard)/objects/` consolidation

Файлы в `src/app/(dashboard)/projects/` (21).

## REDIRECT (4)

| Файл | Куда редиректит | Что делать |
|---|---|---|
| `projects/page.tsx` | `/objects` | заменить на `next.config` редирект (Phase 7), файл удаляется с папкой (Phase 6) |
| `projects/[projectId]/page.tsx` | `/objects/[id]/passport` | заменить на `next.config` редирект (Phase 7), файл удаляется с папкой (Phase 6) |
| `projects/[projectId]/contracts/page.tsx` | `/projects/${id}` — **битый, внутренний** | delete Phase 2 |
| `projects/[projectId]/contracts/[contractId]/docs/page.tsx` | `/projects/...` — **битый** | delete Phase 2 |

## REAL-PAGE (6) — перенести под `objects/`

| Откуда | Куда |
|---|---|
| `projects/[projectId]/defects/page.tsx` | `objects/[objectId]/defects/page.tsx` (новое место) |
| `projects/[projectId]/contracts/[contractId]/page.tsx` | `objects/[objectId]/contracts/[contractId]/page.tsx` (заменить wrapper) |
| `projects/[projectId]/contracts/[contractId]/gantt/page.tsx` | `objects/[objectId]/contracts/[contractId]/gantt/page.tsx` (новое место) |
| `projects/[projectId]/contracts/[contractId]/docs/[docId]/page.tsx` | `objects/[objectId]/contracts/[contractId]/docs/[docId]/page.tsx` (заменить wrapper) |
| `projects/[projectId]/contracts/[contractId]/estimates/[importId]/page.tsx` | `objects/[objectId]/contracts/[contractId]/estimates/[importId]/page.tsx` (заменить битый redirect) |
| `projects/[projectId]/contracts/[contractId]/ks2/[ks2Id]/page.tsx` | `objects/[objectId]/contracts/[contractId]/ks2/[ks2Id]/page.tsx` (заменить wrapper) |

## COMPONENT (11)

### Переносим в `components/modules/`

| Откуда | Куда |
|---|---|
| `projects/ProjectsContent.tsx` | `components/modules/projects/ProjectsContent.tsx` |
| `projects/[projectId]/defects/DefectsContent.tsx` | `components/modules/defects/DefectsContent.tsx` |
| `projects/[projectId]/contracts/[contractId]/ContractDetailContent.tsx` | `components/modules/contracts/ContractDetailContent.tsx` |
| `projects/[projectId]/contracts/[contractId]/ContractTabsList.tsx` | `components/modules/contracts/ContractTabsList.tsx` |
| `projects/[projectId]/contracts/[contractId]/ContractTabsContent.tsx` | `components/modules/contracts/ContractTabsContent.tsx` |
| `projects/[projectId]/contracts/[contractId]/useContractDialogs.ts` | `components/modules/contracts/useContractDialogs.ts` |
| `projects/[projectId]/contracts/[contractId]/gantt/GanttContent.tsx` | `components/modules/gantt/GanttContent.tsx` |
| `projects/[projectId]/contracts/[contractId]/docs/[docId]/ExecutionDocDetailContent.tsx` | `components/modules/execution-docs/ExecutionDocDetailContent.tsx` |
| `projects/[projectId]/contracts/[contractId]/ks2/[ks2Id]/Ks2DetailContent.tsx` | `components/modules/ks2/Ks2DetailContent.tsx` |

### Удаляем (мёртвый код)

| Файл | Причина |
|---|---|
| `projects/[projectId]/ProjectDetailContent.tsx` | импортируется только из `projects/[projectId]/page.tsx`, а эта страница — redirect на `/objects/[id]/passport`. Ни `objects/[objectId]/passport/page.tsx`, ни любое другое место в репозитории не импортирует `ProjectDetailContent`. |
| `projects/[projectId]/ProjectContractsTab.tsx` | импортируется только из `ProjectDetailContent` (выше). |

## Внешние потребители, которым нужно переписать импорты (Phase 3)

- `src/app/(dashboard)/objects/page.tsx` → импорт `ProjectsContent`
- `src/app/(dashboard)/objects/[objectId]/contracts/[contractId]/page.tsx` → импорт `ContractDetailContent` (полностью заменяется в Phase 4)
- `src/app/(dashboard)/objects/[objectId]/contracts/[contractId]/docs/[docId]/page.tsx` → импорт `ExecutionDocDetailContent` (полностью заменяется в Phase 4)
- `src/app/(dashboard)/objects/[objectId]/contracts/[contractId]/ks2/[ks2Id]/page.tsx` → импорт `Ks2DetailContent` (полностью заменяется в Phase 4)

## URL-ссылки `/projects/` во фронте (Phase 5)

| Файл | Строки |
|---|---|
| `src/middleware.ts` | 14 — matcher `/projects/:path*` (удалить) |
| `src/components/modules/estimates/ImportEstimateDialog.tsx` | 84, 98, 102 — `router.push` |
| `src/components/modules/estimates/EstimateImportHistory.tsx` | 60 — `router.push` |
| `src/app/(dashboard)/projects/[projectId]/contracts/[contractId]/estimates/[importId]/page.tsx` | 57 — `router.push` (исправляется во время переноса в Phase 4) |

## `next.config.mjs`

`redirects()` отсутствует — будет добавлен в Phase 7 с тремя правилами:
- `/projects` → `/objects`
- `/projects/:projectId` → `/objects/:projectId/passport`
- `/projects/:projectId/:path*` → `/objects/:projectId/:path*`

## Baseline

Окружение без `node_modules` — `npx tsc --noEmit` и `npm run lint` не запускаются локально (известное ограничение, задокументированное в `docs/lessons.md`). Верификация — через аккуратный grep после каждой фазы и финальный `npm run build` в окружении с установленными зависимостями.
