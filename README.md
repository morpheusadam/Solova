<div align="center">

# FreelanceOS (Solova)

**A self-hosted business OS for a solo freelancer** — clients & contracts (CRM), Trello-grade Kanban boards, projects, time tracking, double-entry accounting, and a GitHub-style activity dashboard. One app, one database, end-to-end type safety.

[Live](https://solova.lavzen.com) · Next.js 15 · tRPC v11 · Prisma · PostgreSQL 16 · Tailwind CSS v4

</div>

---

## Features

- **Companies (CRM)** — client records with billing models (retainer / per-project / per-task / hourly), contracts with monthly amounts, per-company finance view (expected vs actual income, outstanding balance).
- **Boards (Trello parity)** — lists & cards with instant drag-and-drop (optimistic updates, fractional positions), labels, checklists (items convertible to cards), markdown descriptions, comments, attachments, covers, due dates, archive/restore, card & board templates, board backgrounds, filters, and four views: **Kanban, Calendar, Table, Stats**.
- **Projects** — start/due dates, status, notes, user-defined custom fields, linked boards.
- **Tasks** — one global, filterable table of every card across all boards.
- **Accounting (double-entry)** — chart of accounts, append-only journal with a DB-enforced balance invariant, invoices → `DR AR / CR Revenue`, payments → `DR Bank / CR AR`, expenses → `DR category / CR Bank`, reversing entries for corrections, P&L, balance sheet, income reports.
- **Dashboard** — 12-month contribution heatmap (custom SVG), open/closed donut, cards by list/label, due tiles, recent payments, income per month, per-company expected-vs-actual.
- **Automation** — data-driven rules (e.g. *card moved to "Done" → mark completed*), lazy overdue-label rules.
- **Settings** — currency/locale/timezone, invoice numbering, label palette, light/dark theme, full JSON export.

## Quick start

```bash
git clone https://github.com/morpheusadam/Solova.git
cd Solova
cp .env.example .env          # fill in secrets (openssl rand -base64 33 for AUTH_SECRET)
docker compose up -d db       # PostgreSQL 16 on 127.0.0.1:5433
pnpm install
pnpm db:migrate               # applies prisma/schema/migrations
ADMIN_EMAIL=you@example.com ADMIN_PASSWORD=change-me pnpm db:seed
pnpm dev                      # http://localhost:3000
```

### Production (Docker)

```bash
AUTH_SECRET=... docker compose up -d --build
# app on 127.0.0.1:8090 → put your reverse proxy / tunnel in front
```

The container entrypoint runs `prisma migrate deploy` before starting, so the schema is always reproducible from `prisma/schema/migrations/` on a clean database.

### Scripts

| Command | What it does |
|---|---|
| `pnpm dev` / `pnpm build` / `pnpm start` | Next.js dev / production build / serve |
| `pnpm db:migrate` / `pnpm db:seed` / `pnpm db:studio` | Prisma migrate dev / seed sample data / data browser |
| `pnpm test` | Vitest suite against a dedicated `freelanceos_test` DB (created automatically) |
| `pnpm typecheck` | Strict TypeScript over the whole codebase |

## Architecture

```
prisma/schema/            ← ONE FILE PER DOMAIN MODULE (the modular data model)
  identity.prisma  crm.prisma  projects.prisma  kanban.prisma
  time.prisma  accounting.prisma  automation.prisma  templates.prisma
  migrations/             ← versioned SQL, incl. hand-written accounting triggers
src/
  schemas/                ← Zod input schemas, shared by server & client forms
  server/
    auth.ts               ← NextAuth v5 credentials + argon2
    db.ts                 ← Prisma client
    api/trpc.ts           ← context, protectedProcedure
    api/routers/          ← one tRPC router per module (company, board, card, …)
    services/             ← business logic (accounting posting, automation,
                            heatmap, card movement) — routers stay thin
  trpc/                   ← typed client (react-query) + RSC caller
  components/
    ui/                   ← design-system primitives (token-driven, Radix-based)
    board/ company/ project/ accounting/ dashboard/ shared/ layout/
  app/
    (app)/                ← authenticated sections: dashboard companies projects
                            boards accounting tasks settings
    api/trpc  api/auth  api/uploads
  styles/globals.css      ← design tokens from design-token.json (Trello-Glass)
tests/                    ← cascade, accounting-balance, heatmap, move-card
```

**Type chain:** Prisma models → tRPC routers (Zod-validated) → React Query hooks. Changing a procedure or model is a client-side compile error; there are no hand-written duplicate types.

**Data integrity lives in the database:** cascade rules (`company → boards → lists → cards`, invoices RESTRICT), CHECK constraints on journal lines, a deferred trigger that rejects unbalanced journal entries at COMMIT, and append-only triggers on the ledger (corrections are reversing entries).

## Backups

- **In-app:** Settings → *Export all data (JSON)*.
- **Server:** dump the `db` service — `docker exec solova-db pg_dump -U freelanceos freelanceos | gzip > backup.sql.gz` (wire it into cron/systemd; on the reference deployment this runs nightly with 3-copy rotation + offsite restic).

## License

Personal project. © Morpheus Adam — part of the [Lavzen](https://lavzen.com) ecosystem.
