<!-- SEO: FreelanceOS — open-source self-hosted freelance business management software: CRM, Trello-style Kanban, projects, double-entry accounting, invoicing, time tracking. Built with Next.js, tRPC, Prisma, PostgreSQL, TypeScript. -->

<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:0079BF,50:00C2E0,100:51E898&height=200&section=header&text=FreelanceOS&fontSize=64&fontColor=ffffff&animation=fadeIn&fontAlignY=38&desc=The%20self-hosted%20operating%20system%20for%20freelancers&descAlignY=60&descSize=18" alt="FreelanceOS" width="100%" />

<p>
  <a href="https://solova.lavzen.com"><img src="https://img.shields.io/badge/Live_Demo-solova.lavzen.com-0079BF?style=for-the-badge&logo=vercel&logoColor=white" alt="Live demo" /></a>
</p>

<a href="https://github.com/morpheusadam/Solova/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-51E898?style=flat-square" alt="License" /></a>
<img src="https://img.shields.io/badge/tests-12%2F12_passing-61BD4F?style=flat-square&logo=vitest&logoColor=white" alt="Tests" />
<img src="https://img.shields.io/badge/type--safe-end--to--end-0079BF?style=flat-square&logo=typescript&logoColor=white" alt="Type safe" />
<img src="https://img.shields.io/github/last-commit/morpheusadam/Solova?style=flat-square&color=00C2E0" alt="Last commit" />
<img src="https://img.shields.io/github/repo-size/morpheusadam/Solova?style=flat-square&color=C377E0" alt="Repo size" />

<br/>

<h3>

[🚀 Live Demo](https://solova.lavzen.com) &nbsp;•&nbsp; [✨ Features](#-features) &nbsp;•&nbsp; [🖼️ Screenshots](#️-screenshots) &nbsp;•&nbsp; [⚡ Quick Start](#-quick-start) &nbsp;•&nbsp; [🏗️ Architecture](#️-architecture)

</h3>

<img src="https://readme-typing-svg.demolab.com?font=Segoe+UI&weight=600&size=22&pause=1000&color=0079BF&center=true&vCenter=true&width=820&lines=Clients%2C+contracts+%26+contacts+%E2%80%94+your+whole+CRM;Trello-grade+Kanban+with+instant+drag-and-drop;Double-entry+accounting+that+always+balances;Invoices%2C+payments%2C+products+%26+expenses;A+GitHub-style+activity+dashboard" alt="Typing SVG" />

</div>

---

## 🧭 What is FreelanceOS?

**FreelanceOS** (a.k.a. **Solova**) is a **free, open-source, self-hosted business management app for solo freelancers and small studios**. It unifies the tools a freelancer normally juggles across five different SaaS products — **client CRM, Trello-style project boards, projects & contracts, time tracking, and real double-entry accounting** — into a single, private, type-safe web app you host yourself.

> One app. One database. One login. Your data stays yours.

<div align="center">
<img src="docs/screenshots/01-dashboard.jpg" alt="FreelanceOS dashboard — activity heatmap, task charts and income overview" width="90%" />
</div>

---

## ✨ Features

| Module | What you get |
|---|---|
| 🏢 **CRM** | Companies with billing models, contracts, and a per-company finance view (expected vs actual income, outstanding balance) |
| 👤 **Contacts** | Many contacts per company with email/phone/WhatsApp/Telegram quick-links |
| 🗂️ **Kanban boards** | Trello-grade drag-and-drop, labels, checklists (item → card), comments, attachments, photo covers, due dates, templates, archive — plus **Calendar / Table / Stats** views |
| 📁 **Projects** | Notes, typed custom fields, website favicon, per-project pricing, linked boards |
| 🧮 **Accounting** | Append-only double-entry ledger, invoices (draft → issue → void), payments, **product catalog**, expenses, P&L & balance sheet |
| 📊 **Dashboard** | GitHub-style contribution heatmap, open/closed & label charts, income per month, expected-vs-actual per client |
| 🗒️ **Sticky notes** | A fun, colorful pinboard for quick thoughts |
| ⏱️ **Time tracking** | One-click start/stop timer + manual entries feeding billing and the heatmap |
| 🎨 **Design** | Glassmorphism UI, 24 built-in wallpapers + 19 photo backgrounds, custom uploads, per-board & app-wide backgrounds, light/dark themes |

<div align="center">
<table>
<tr>
<td width="50%"><img src="docs/screenshots/03-board-kanban.jpg" alt="Trello-style Kanban board" /></td>
<td width="50%"><img src="docs/screenshots/04-card-modal.jpg" alt="Card detail modal with checklists, labels and comments" /></td>
</tr>
<tr>
<td width="50%"><img src="docs/screenshots/05-accounting.jpg" alt="Double-entry accounting: P&L and balance sheet" /></td>
<td width="50%"><img src="docs/screenshots/06-notes.jpg" alt="Sticky notes pinboard" /></td>
</tr>
</table>
</div>

---

## 🧰 Tech Stack

<p align="center">
<img src="https://img.shields.io/badge/Next.js_15-000000?style=for-the-badge&logo=nextdotjs&logoColor=white" />
<img src="https://img.shields.io/badge/React_19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" />
<img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" />
<img src="https://img.shields.io/badge/tRPC-2596BE?style=for-the-badge&logo=trpc&logoColor=white" />
<img src="https://img.shields.io/badge/Prisma-2D3748?style=for-the-badge&logo=prisma&logoColor=white" />
<img src="https://img.shields.io/badge/PostgreSQL_16-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" />
<img src="https://img.shields.io/badge/Tailwind_v4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" />
<img src="https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white" />
</p>

The **T3 stack** end-to-end: types are defined once in Prisma, flow through tRPC procedures, and land in React Query hooks — change a model or a procedure and the client fails to compile. No hand-written API schema, no drift, no `any`.

---

## ⚡ Quick Start

```bash
git clone https://github.com/morpheusadam/Solova.git
cd Solova
cp .env.example .env                 # set AUTH_SECRET (openssl rand -base64 33)
docker compose up -d db              # PostgreSQL 16
pnpm install
pnpm db:migrate                      # apply prisma/schema/migrations
ADMIN_EMAIL=you ADMIN_PASSWORD=secret pnpm db:seed
pnpm dev                             # → http://localhost:3000
```

### 🐳 One-command production (Docker)

```bash
AUTH_SECRET=$(openssl rand -base64 33) docker compose up -d --build
# app on 127.0.0.1:8090 — put your reverse proxy / Cloudflare Tunnel in front
```

A one-shot `migrate` service applies the schema before the app boots, so a clean database is always reproducible from `prisma/schema/migrations/`.

---

## 🏗️ Architecture

```
prisma/schema/          ← ONE FILE PER DOMAIN MODULE (modular, extensible data model)
  identity · crm · projects · kanban · time · accounting · products · contacts · notes · automation · templates
src/
  schemas/              ← Zod schemas shared by server & client forms
  server/api/routers/   ← one thin tRPC router per module
  server/services/      ← business logic (double-entry posting, automation, heatmap)
  components/           ← token-driven UI (Radix) + feature components
  app/(app)/            ← dashboard · companies · contacts · projects · boards · accounting · notes · settings
tests/                  ← cascade, ledger-balance, heatmap, move-card (Vitest)
```

**Every feature is a module.** Adding a capability means adding a `*.prisma` file, a router and a schema — not editing a monolith. Data integrity lives in the database: FK cascades, `CHECK` constraints on journal lines, a deferred trigger that rejects unbalanced entries at commit, and append-only triggers on the ledger.

---

## 🔐 Highlights engineers care about

- **End-to-end type safety** — DB → tRPC → UI, enforced by the compiler.
- **Money is never a float** — integer minor units in `BIGINT`, everywhere.
- **Immutable ledger** — corrections are reversing entries, not edits (bank-grade).
- **Optimistic Kanban** — fractional-index ordering; a reorder writes one row.
- **Accessible & fast** — visible focus, keyboard DnD, `transform/opacity`-only motion, `prefers-reduced-motion`, RTL-ready.

---

## 📈 Roadmap

- [x] CRM, Kanban, Projects, Accounting, Dashboard, Notes, Contacts, Time
- [x] Product catalog, per-project pricing, wallpapers & photo covers
- [ ] Recurring invoices & payment reminders
- [ ] Multi-user / team seats (the schema is already multi-user-ready)
- [ ] Mobile app

---

<div align="center">

Built with ❤️ by **[Morpheus Adam](https://github.com/morpheusadam)** · part of the [Lavzen](https://lavzen.com) ecosystem

<sub>Keywords: freelance CRM · self-hosted project management · Trello alternative · open-source invoicing · double-entry accounting app · Next.js SaaS starter · tRPC Prisma PostgreSQL</sub>

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:51E898,50:00C2E0,100:0079BF&height=100&section=footer" width="100%" />

</div>
