# Vercel production deploy notes
#
# Required env vars (Project → Settings → Environment Variables):
#   DATABASE_URL   → Neon / Prisma Postgres / Supabase pooled URL (NOT SQLite)
#   AUTH_SECRET    → long random string
#
# After first successful deploy with Postgres URL set, seed once from your PC:
#   $env:USE_POSTGRES=1
#   $env:DATABASE_URL="postgresql://..."
#   npm run db:setup
#
# Local Windows continues to use SQLite (file:./dev.db) unless USE_POSTGRES=1.
