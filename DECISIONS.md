# DECISIONS.md — running log of judgement calls

## Phase 0 — Bootstrap
- **Manual scaffold instead of `create-t3-app`**: full control over every file, no interactive prompts, no opinionated extras — matches the "no extra files" rule. Same T3 composition (Next 15 App Router + tRPC v11 + Prisma + Tailwind + NextAuth v5).
- **Tailwind CSS v4** (CSS-first config): design tokens from `design-token.json` map 1:1 to CSS custom properties consumed via `@theme`, no `tailwind.config` needed.
- **pnpm** as specified; build scripts for prisma/argon2/esbuild/sharp allow-listed in `pnpm-workspace.yaml` (pnpm ≥10 blocks them by default).
- **prisma pinned to ^6.x** (7 is out but young); multi-file schema folder (`prisma/schema/*.prisma`) is GA in 6.7+ and gives the modular, one-file-per-module database layout the owner asked for.
- **recharts ^2.15** over v3: battle-tested line, fewer breaking changes.
- **Node 22 LTS** installed from official binaries (distro apt mirror broken).
- **Postgres exposed only on 127.0.0.1:5433** for dev tooling; in-network `db:5432` for the app container.

## Phase 1 — Schema & integrity
- **One `.prisma` file per module** (identity, crm, projects, kanban, time, accounting, automation, templates) — adding a future module = adding a file, no edits to existing ones.
- **UUID pks via `gen_random_uuid()`** (PG16 core), `snake_case` columns via `@map`, timestamptz everywhere.
- **Money = BIGINT minor units**; JS `number` at the transport layer (2^53 minor units is far beyond realistic totals); currencies without minor units (IRR, JPY…) use factor 1 (`src/lib/money.ts`).
- **Cascades in the database**: cards carry both `list_id` and denormalized `board_id`, each `ON DELETE CASCADE`, so "delete board ⇒ cards die" holds even mid-move. Invoices/payments use `RESTRICT` — deleting a company with financial docs fails loudly instead of destroying history.
- **Accounting integrity in SQL** (hand-written section appended to the init migration): CHECK non-negative + debit-XOR-credit, deferred constraint trigger enforcing per-entry balance at COMMIT, and append-only triggers (UPDATE/DELETE on journal rows raise; header updates allowed only for reversal linkage / posted flag; `company_id` change allowed because the FK is SET NULL on company delete).
- **Posting recipes**: invoice issued → DR 1200 AR / CR 4100 Service Revenue; payment received → DR 1110 Bank (or 1100 Cash) / CR 1200 AR; expense → DR category account / CR 1110 Bank. Corrections = mirror-image reversing entries linked via `reversed_by_entry_id`.
- **Card/list ordering**: numeric fractional positions (midpoint of neighbours, gap 65536) — one row updated per reorder; `rebalanceList` re-spaces when gaps collapse.
- **Automation engine is data-driven**: rule = trigger enum + JSON conditions + JSON action list; `DUE_DATE_PASSED` is evaluated lazily when a board is opened (no cron needed in a single-user tool).
- **Templates as JSONB payloads** (`card_templates`, `board_templates`): new template capabilities never require schema changes.
- **Heatmap "work" units**: card_activity rows + completed cards (already activity rows) + logged time at 1 unit per 30 min, bucketed by day in the `settings.timezone` (default Asia/Tehran — freelancer works there; UTC bucketing would split their evenings).
- **Seed credentials** come from `ADMIN_EMAIL`/`ADMIN_PASSWORD` env vars (never hardcoded) since the app is publicly reachable; password stored operator-side only.
- **Tests run on a dedicated `freelanceos_test` database** created by vitest global setup; cleanup uses `session_replication_role = replica` because the append-only triggers (correctly) refuse to delete ledger rows.
- **Card `cover` column added** (spec §5 requires card covers; §4 table list omitted it) and card members table skipped — single-user; `users` table already models the future multi-user shape.
