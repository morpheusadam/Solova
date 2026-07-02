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

## Phases 2–8 — API & UI
- **No middleware.ts**: argon2 is a native module and NextAuth edge-splitting adds complexity for zero gain in a single-user app — the `(app)` layout and every tRPC procedure check the session server-side instead.
- **Design tokens as CSS custom properties** switching on `.dark` (next-themes, class attribute), mapped into Tailwind v4 via `@theme inline`. Glass recipes (`.glass-card`, `.glass-column`, `.glass-sidebar`, `.glass-modal`, `.glass-chip`, `.raised-card`) come 1:1 from `semantic._glassRecipes` in design-token.json.
- **Card hover lift** animates `transform` only; the stronger hover shadow is a pre-rendered `::after` whose *opacity* animates — complies with the "never transition box-shadow" rule while keeping the Trello feel.
- **UI primitives hand-rolled on Radix** (Button, Dialog, Dropdown, Popover, Select, Tabs, Checkbox, Switch, Tooltip, Toast) instead of shadcn CLI output: fewer files, and every color/radius/shadow comes from the token sheet rather than shadcn's default theme.
- **Optimistic drag-and-drop**: on drop the board query cache is rewritten immediately (`utils.board.byId.setData`), the mutation sends `{cardId, toListId, position}`; on error the cache invalidates back to server truth. Positions are midpoints of the drop neighbours; `needsRebalance` triggers a one-shot list re-space.
- **Filters disable drag** (search/label/completed): dropping into a filtered list would compute positions against invisible neighbours; Trello-grade correctness beats parity here. A hint is shown in the filter popover.
- **Invoice lifecycle**: created as DRAFT (numbered from settings seq) → *Issue* posts the journal entry and marks SENT → payments flip status via `refreshInvoiceStatus` → *Void* posts a reversing entry (only when unpaid). Draft deletes are allowed; issued invoices are never deleted.
- **Money inputs** are entered in major units and converted with the currency's minor-unit factor at the form boundary; IRR/JPY-style zero-decimal currencies use factor 1.
- **Uploads** stored on disk under `UPLOADS_DIR` (docker volume), served through an auth-checked route handler with sanitized names; native `<input type="date">` instead of a datepicker dependency.
- **Heatmap** is a hand-rolled SVG (53 weeks × 7 days, Monday-start), 5 buckets scaled to the year's max, breakdown exposed via `<title>` for hover + screen readers.
- **Automation UI** lives in Settings as enable/disable toggles over the seeded rules; the engine itself is data-driven so new rules are inserts, not code.

## Follow-up pass
- **Time page is NOT in the primary sidebar**: spec §2 says the sidebar exposes *exactly* seven sections, so `/time` hangs off the topbar timer widget instead — full parity without breaking the contract.
- **Templates are authored by snapshotting real cards/boards** (Trello's own pattern) rather than a dedicated template editor; deletion lives in Settings.
- **Migrations in Docker** run in a one-shot `migrate` compose service built from the image's `build` stage — the standalone runtime stays free of the Prisma CLI (whose pnpm-symlinked deps can't be cherry-picked).

## Second follow-up (owner requests)
- **Dialog no longer closes on Select/Popover interaction**: Radix poppers portal outside the dialog, so their clicks read as "outside". `DialogContent` now `preventDefault()`s `onPointerDownOutside`/`onInteractOutside` when the target is inside `[data-radix-popper-content-wrapper]`; poppers also sit at z-750 (above the 700 dialog).
- **RHF `values` must be referentially stable**: the project form built its default object inline with `new Date()`, so every render produced a new `values` and reset the form (dialog felt like it "closed"). Wrapped in `useMemo`.
- **Wallpapers are generated SVGs, not photos**: 24 gradient/pattern SVGs (~1 KB each, 104 KB total) in `public/wallpapers/`, generated by `.git/gen-wallpapers.mjs`. Lightweight, theme-consistent, offline-safe in Docker. One `BackgroundPicker` + `backgroundCss()` serve board backgrounds, the app background, and the login page; the app background also accepts an uploaded image (`upload:<url>`).
- **Products** are a first-class module (`products.prisma`): a catalog with unit price, tax rate, type and optional revenue account. Invoice lines link back via `InvoiceLineSource=PRODUCT`+`source_id` (additive — no new FK on InvoiceLine). "Add from product" prefills a line.
- **Per-project pricing**: nullable `billingModel`/`rateMinor`/`currencyCode` on Project — null inherits the company defaults.
- **Contacts**: a company has many `Contact`s (cascade). Global `/contacts` page + a Contacts tab on the company; cards deep-link to mail/tel/WhatsApp/Telegram.
- **Notes replace the global Tasks table**: the owner found `/tasks` redundant with Boards. A `Note` model powers a sticky-note pinboard at `/notes` (tilt, pin, color); `/tasks` 301s to `/notes`. `taskRouter` stays for dashboard counts.
- **App logo & username login**: `Settings.appLogoUrl` (uploaded) shown in the sidebar; login accepts a plain username (not just email) matched against `users.email`.
- **Heatmap tooltip**: replaced the unstyled native `<title>` with a glass floating tooltip driven by hover state.
- **Docker cache gotcha**: `COPY . .` over the WSL 9p mount cached stale source (new routes 404'd). Builds after adding/removing routes use `docker compose build --no-cache app`.
