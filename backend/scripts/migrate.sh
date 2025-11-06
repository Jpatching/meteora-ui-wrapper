#!/bin/bash

# Run database migrations
# This script is called by Railway after deployment

echo "🔄 Running database migrations..."

# Check if database URL is set
if [ -z "$DATABASE_URL" ]; then
  echo "❌ DATABASE_URL not set"
  exit 1
fi

# Run migrations
psql $DATABASE_URL -f migrations/001_create_pools_table.sql

if [ $? -eq 0 ]; then
  echo "✅ Migrations completed successfully"
else
  echo "❌ Migration failed"
  exit 1
fi
