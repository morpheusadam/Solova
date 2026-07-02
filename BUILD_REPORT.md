# BUILD_REPORT.md — Solova

**Status: all phases complete and deployed.** https://solova.lavzen.com (Docker on WSL, behind Cloudflare Tunnel).

## Verified (Definition of Done, spec §14)

- `docker compose up -d --build` → migrate one-shot applies schema, app serves on 127.0.0.1:8090; seeded data visible; heatmap and charts populated.
- **12/12 tests green** (`pnpm test`): company cascade, board cascade, invoice RESTRICT, unbalanced-entry rejection at service *and* DB-trigger level, balanced-entry sums, append-only ledger, reversing entries, invoice/payment posting recipes + status flip, heatmap per-day counts, move-to-Done automation, same-list reorder.
- **Type chain unbroken**: `tsc --noEmit` clean, no `any`, no duplicated types across DB → tRPC → UI.
- Money is BIGINT minor units everywhere; corrections are reversing entries.
- Every §2 menu section functional end-to-end (verified against the live server: csrf → credentials login 302 → authed tRPC 200 → /dashboard 200).
- Accessibility/performance rules applied: labels on all icon buttons, visible focus ring token, `type="button"`, transform/opacity-only animation (card hover shadow via `::after` opacity), reduced-motion guard, logical (RTL-ready) properties, bottom-nav ≤5 items on mobile, lazy heatmap `<title>` tooltips.

## Resolved in the follow-up pass (2026-07-02)

1. ✅ **Nightly backup wired** — `/opt/lavzen-backup/backup.sh` updated (dead plane/twenty blocks removed, `solova-db` pg_dump + `solova-uploads` archive added, secrets in backup.env); verified run: overall=ok, both artifacts created. Old script kept as `backup.sh.bak-<date>`.
2. ✅ **Time tracking UI** — topbar start/stop timer widget (live elapsed, one running entry) + `/time` page (entries table, billable value, manual "Log time" dialog, delete). Kept out of the primary sidebar to preserve the spec's exact 7 sections; reachable from the timer widget.
3. ✅ **Template authoring** — "Save as template" on the card modal and in the board menu (snapshots labels/checklists/lists/background); "Add from template" menu on every list's quick-add; manage/delete templates in Settings.
4. ✅ **Checklist item due dates** — inline date input per item in the card modal (overdue highlighted).
5. ✅ **Hub launcher** — Solova tile added to hub.lavzen.com.

## Known limitations (by design / accepted)

- **Drag-and-drop under active filters is disabled** (positions against hidden neighbours would be wrong) — hint shown in the filter popover.
- **Attachments/logo uploads** live on the `uploads` docker volume, excluded from the JSON export (binary); covered by the nightly backup instead.
- Card "Members" intentionally omitted (single-user); the `users` table is multi-user-ready per spec.

## Operating notes

- Login credentials + DB secrets: operator-side (`.data/solova.txt` on the host, not in the repo).
- Rebuild & redeploy: `docker compose up -d --build` in the repo root.
- Dev loop: `docker compose up -d db && pnpm dev`; tests use `freelanceos_test` automatically.
