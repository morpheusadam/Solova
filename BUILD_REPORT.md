# BUILD_REPORT.md — FreelanceOS

**Status: all phases complete and deployed.** https://solova.lavzen.com (Docker on WSL, behind Cloudflare Tunnel).

## Verified (Definition of Done, spec §14)

- `docker compose up -d --build` → migrate one-shot applies schema, app serves on 127.0.0.1:8090; seeded data visible; heatmap and charts populated.
- **12/12 tests green** (`pnpm test`): company cascade, board cascade, invoice RESTRICT, unbalanced-entry rejection at service *and* DB-trigger level, balanced-entry sums, append-only ledger, reversing entries, invoice/payment posting recipes + status flip, heatmap per-day counts, move-to-Done automation, same-list reorder.
- **Type chain unbroken**: `tsc --noEmit` clean, no `any`, no duplicated types across DB → tRPC → UI.
- Money is BIGINT minor units everywhere; corrections are reversing entries.
- Every §2 menu section functional end-to-end (verified against the live server: csrf → credentials login 302 → authed tRPC 200 → /dashboard 200).
- Accessibility/performance rules applied: labels on all icon buttons, visible focus ring token, `type="button"`, transform/opacity-only animation (card hover shadow via `::after` opacity), reduced-motion guard, logical (RTL-ready) properties, bottom-nav ≤5 items on mobile, lazy heatmap `<title>` tooltips.

## Known issues / to review

1. **Nightly pg_dump not yet wired** — the updated `/opt/lavzen-backup/backup.sh` (removes dead plane/twenty blocks, adds `solova-db` + `solova-uploads`) is prepared at `.git/backup.sh.new` with installer `.git/install-backup.sh`, but writing to the shared root-owned script required an authorization the build agent didn't have. Run once:
   `sudo bash /home/morpheus/projects/lavzen-stack/solova/.git/install-backup.sh && sudo bash /opt/lavzen-backup/backup.sh`
2. **Time tracking UI is minimal** — full API exists (list/create/timers) and hours feed the dashboard + heatmap, but there is no dedicated Time page; entries are created via API/seed for now.
3. **Template management** — board/card templates are usable (seeded "Kanban Basic", "Bug Report") but there is no UI to author new templates; add rows to `board_templates`/`card_templates`.
4. **Checklist item due dates** exist in schema/API but the card modal doesn't expose editing them yet.
5. **Drag-and-drop under active filters is disabled** by design (positions against hidden neighbours would be wrong) — hint shown in the filter popover.
6. **Attachments/logo uploads** are stored on the `uploads` docker volume; they are excluded from the JSON export (files aren't JSON) — the volume is covered by the backup block from issue 1.
7. Card "Members" intentionally omitted (single-user); the `users` table is multi-user-ready per spec.

## Operating notes

- Login credentials + DB secrets: operator-side (`.data/solova.txt` on the host, not in the repo).
- Rebuild & redeploy: `docker compose up -d --build` in the repo root.
- Dev loop: `docker compose up -d db && pnpm dev`; tests use `freelanceos_test` automatically.
