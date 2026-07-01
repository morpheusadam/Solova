# BUILD_STATE.md

| Phase | Status | Verified |
|-------|--------|----------|
| 0 — Bootstrap (scaffold, docker db, deps) | ✅ done | pnpm install ok, postgres up |
| 1 — Schema, migrations, seed, integrity tests | ✅ done | 12/12 vitest green (cascade ×3, accounting ×6, heatmap ×1, move-card ×2) |
| 2 — Companies + Contracts (CRM) | ⏳ next | |
| 3 — Kanban (Trello parity) | pending | |
| 4 — Projects | pending | |
| 5 — Views (calendar / table / board dashboard / tasks) | pending | |
| 6 — Accounting UI + reports | pending | |
| 7 — App dashboard (heatmap + charts + income) | pending | |
| 8 — Settings | pending | |
| 9 — Automation + polish | pending | |
| Deploy — docker image on :8090 behind solova.lavzen.com | pending | |
