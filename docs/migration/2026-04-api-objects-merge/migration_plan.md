# Migration Plan: `/api/objects/` → `/api/projects/`

## Inventory (generated 2026-04-19)

- **`api/objects/`**: 238 route.ts files (237 under `[objectId]/` + 1 root).
- **`api/projects/`**: 382 route.ts files.
- **Overlap (same relative path in both dirs)**: 171 files.
- **UNIQUE to `api/objects/`** (no twin — must be moved): 67 files.
- **Frontend callers**: 244 lines across `src/**/*.{ts,tsx}`.

## Classification of overlap (171 pairs)

Auto-classifier compares `sed s/objectId/projectId/g <objects-file>` byte-for-byte with `<projects-file>`.

- **PURE_DUPLICATE** (only `objectId` → `projectId` differs): **119 files** → delete from `api/objects/` in Phase 2.
- **NEEDS_REVIEW** (real differences): **52 files** → manual diff in Phase 2. Most commonly the `projects/` version is the newer canonical one and we just delete `objects/`; a few pairs (e.g. `[objectId]/route.ts`) have fixes in `objects/` that must be ported first.

Full lists:
- `objects_routes.txt` — all 238 paths.
- `objects_callers.txt` — all 244 frontend references.
- `/tmp/pure_duplicates.txt` — 119 pure duplicates (regenerate via `classify_dupes.sh`).
- `/tmp/diff_summary.txt` — per-pair +/- line counts for the 52 NEEDS_REVIEW pairs.

## Phase classes

| Class | Count | Action |
|---|---|---|
| REEXPORT (root `objects/route.ts`) | 1 | Phase 1 — delete, update 3 bare callers |
| PURE_DUPLICATE | 119 | Phase 2 — bulk delete |
| NEEDS_REVIEW | 52 | Phase 2 — per-pair diff; port fixes if any, then delete |
| UNIQUE (no twin in `projects/`) | 67 | Phase 3 — move to `projects/`, rewrite params |

## Known merges to perform (non-trivial deltas)

Based on `/tmp/diff_summary.txt`, pairs where the `objects/` version has content that must be ported into the `projects/` version (i.e. where `objects/` is ahead in some way):

- `[objectId]/route.ts` — `actualStartDate` + `actualEndDate` handling in PUT missing from `projects/[projectId]/route.ts`.
- `gantt-versions/[versionId]/changelog/route.ts` — `objects/` version 53 lines longer; investigate before deletion.
- `design-tasks/[taskId]/workflow/route.ts` — `objects/` version 35 lines longer.
- `pir-closure/[actId]/workflow/route.ts` — `objects/` version 35 lines longer.
- `execution-docs/[docId]/route.ts` — `objects/` version 27 lines longer.
- `correspondence/[corrId]/route.ts` — `objects/` version 21 lines longer.
- `execution-docs/[docId]/comments/*/route.ts` — 2 pairs with `objects/` 20+ lines longer.
- `gantt-versions/[versionId]/copy/route.ts` — both sides have distinct content (+50/-72); full manual merge.

Pairs where the `projects/` version is clearly the newer canonical one (safe to delete `objects/` directly):

- `contracts/[contractId]/route.ts` (+57/-7), `gantt-versions/[versionId]/route.ts` (+109/-22),
  `gantt-versions/route.ts` (+108/-26), `participants/route.ts` (+111/-49),
  `sed/[docId]/route.ts` (+59/-20), `sed/[docId]/attachments/route.ts` (+40/-1), etc.

## Invariants

- `projectId` stays as-is in Prisma schema and in `[projectId]` params.
- No DB migration in this PR.
- Frontend UI URLs `/objects/[objectId]/*` stay as-is.
- Multi-tenancy: every surviving handler must filter by `organizationId`.
