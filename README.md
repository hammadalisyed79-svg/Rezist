# Rezist — Multi-Branch Bakery ERP + Website

Company-owned bakery operations for Pakistan (Gourmet / Layers-style model with Greggs-like central production discipline). **No franchise structure** — all branches are company-owned.

## Stack

- Next.js 15 (App Router) — public website + ERP admin
- Prisma + SQLite (local). Swap `DATABASE_URL` to PostgreSQL for production.
- Cookie session auth with roles: `HQ_ADMIN`, `BRANCH_MANAGER`, `CASHIER`

## Ops model (locked)

- Hybrid production: central kitchen + branch finishing
- Pilot: retail branches + warehouse + central kitchen (Gujrat hub)
- Designed for ~15–20 company-owned branches in year one
- Browser / tablet POS

## ERP phases (industrial roadmap)

| Phase | Scope | Status |
|-------|--------|--------|
| 1 | Roles/audit, purchases/GRN, transfer receive, kitchen board | Done |
| 2 | Production planning, costing, lots/FEFO, reorder, multi-till POS | Done |
| 3 | HQ command, promos, CRM loyalty, staff, accounting export | Done |
| 4 | Delivery/riders, barcode/offline POS, mobile API | Done |
| 5 (franchise) | Franchise portals / fees | **Skipped** — company-owned only |
| 5 (company) | Analytics/BI, demand forecast, food safety, loyalty deep, payroll stubs | Done |
| 6 | Branch scoreboard, shift handover, supplier scorecards, ops alerts, HQ export packs, wastage cost | Done |

## Quick start

```bash
npm install
npm run db:setup
npm run dev
```

- Website: http://localhost:3000
- ERP: http://localhost:3000/erp/login

### Demo logins (password `rezist123`)

| Email | Role |
|-------|------|
| admin@rezist.pk | HQ Admin |
| manager.gujrat@rezist.pk | Branch manager |
| cashier.gujrat@rezist.pk | Cashier |

Manager void / PIN: `4321`

## Modules

**ERP:** branches, products/recipes, inventory, transfers, POS, day close, production, wastage, online order queue, HQ reports, analytics, forecast, food safety, payroll stubs, scoreboard, handover, supplier scorecards, alerts, export packs

**Website:** brand home, menu, branch locator, branch-aware online ordering (same catalog/stock as ERP)

## PostgreSQL (production)

1. Set `DATABASE_URL` to your Postgres connection string
2. Change `provider` in `prisma/schema.prisma` to `postgresql`
3. Run `npx prisma migrate dev`

Or use `docker-compose.yml` for a local Postgres instance.
