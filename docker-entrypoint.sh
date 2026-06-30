#!/bin/bash
set -e

# ---- Print masked DATABASE_URL ----
if [ -n "$DATABASE_URL" ]; then
  MASKED="${DATABASE_URL:0:20}..."
  echo "=> DATABASE_URL: $MASKED"
else
  echo "=> WARNING: DATABASE_URL is not set!"
  exit 1
fi

# ---- Generate Prisma Client ----
echo "=> Generating Prisma client..."
bunx prisma generate --schema ./prisma/schema.prisma

# ---- Push schema to DB (idempotent) ----
echo "=> Syncing Prisma schema to database..."
bunx prisma db push --schema ./prisma/schema.prisma --skip-generate --accept-data-loss 2>/dev/null || \
bunx prisma db push --schema ./prisma/schema.prisma --skip-generate

# ---- Seed database (only if SEED_DB=true) ----
if [ "$SEED_DB" = "true" ]; then
  echo "=> SEED_DB=true — running seed script..."
  bun run ./prisma/seed.ts
  echo "=> Seed complete. Unsetting SEED_DB..."
  unset SEED_DB
fi

# ---- Start Next.js ----
echo "=> Starting iSecurify GRC Platform on port ${PORT:-3000}..."
exec bun server.js
