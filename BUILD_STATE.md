# BUILD_STATE.md

| Phase | Status | Verified |
|-------|--------|----------|
| 0 — Bootstrap (scaffold, docker db, deps) | ✅ done | pnpm install ok, postgres up |
| 1 — Schema, migrations, seed, integrity tests | ✅ done | 12/12 vitest green (cascade ×3, accounting ×6, heatmap ×1, move-card ×2) |
| 2 — Companies + Contracts (CRM) | ✅ done | typecheck green; list/detail/tabs/forms/cascade-preview delete |
| 3 — Kanban (Trello parity) | ✅ done | DnD optimistic moves, card modal (labels, checklists→cards, comments, attachments, covers, archive), templates, quick-add |
| 4 — Projects | ✅ done | notes + custom fields + linked boards |
| 5 — Views | ✅ done | Calendar / Table / Stats per board + global Tasks table with filters & pagination |
| 6 — Accounting UI + reports | ✅ done | invoices (draft→issue→void), payments, expenses, manual journal + reverse, CoA, P&L + balance sheet |
| 7 — App dashboard | ✅ done | custom SVG heatmap, donut/bars, income list + expected-vs-actual |
| 8 — Settings | ✅ done | profile/locale/currency/timezone, label palette, theme, automation toggles, JSON export |
| 9 — Automation + polish | ✅ done | move-to-Done rule (tested), CARD_CREATED_IN_LIST + DUE_DATE_PASSED engine; a11y/perf rules applied throughout |
| Build & smoke | ✅ done | `next build` green (17 routes); prod server: login 302 → authed tRPC 200 with seeded data |
| Deploy on :8090 behind solova.lavzen.com | ✅ done | migrate one-shot + standalone app containers; public login + /dashboard verified 200 |

Final: 12/12 tests, typecheck clean. Known issues / to review — see BUILD_REPORT.md.
