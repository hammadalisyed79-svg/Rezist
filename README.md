# Rezist — Multi-Branch Bakery ERP + Website

Company-owned bakery operations for Pakistan (Gourmet / Layers-style model with Greggs-like central production discipline).

## Stack

- Next.js 15 (App Router) — public website + ERP admin
- Prisma + SQLite (local). Swap `DATABASE_URL` to PostgreSQL for production.
- Cookie session auth with roles: `HQ_ADMIN`, `BRANCH_MANAGER`, `CASHIER`

## Ops model (locked)

- Hybrid production: central kitchen + branch finishing
- Pilot: 2 retail branches (Gulberg Lahore, F-7 Islamabad) + warehouse + central kitchen
- Designed for ~15–20 branches in year one
- Browser / tablet POS

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
| manager.gulberg@rezist.pk | Branch manager |
| cashier.gulberg@rezist.pk | Cashier |

## Modules

**ERP:** branches, products/recipes, inventory, transfers, POS, day close, production, wastage, online order queue, HQ reports

**Website:** brand home, menu, branch locator, branch-aware online ordering (same catalog/stock as ERP)

## PostgreSQL (production)

1. Set `DATABASE_URL` to your Postgres connection string
2. Change `provider` in `prisma/schema.prisma` to `postgresql`
3. Run `npx prisma migrate dev`

Or use `docker-compose.yml` for a local Postgres instance.
