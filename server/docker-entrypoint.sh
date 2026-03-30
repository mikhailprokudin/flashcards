#!/bin/sh
set -e
echo "Running database migrations..."
node dist/db/migrate.js
exec node dist/index.js
