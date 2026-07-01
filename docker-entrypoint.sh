#!/bin/sh
set -e

echo "Applying database migrations..."
./node_modules/.bin/prisma migrate deploy --schema prisma/schema

echo "Starting FreelanceOS..."
exec node server.js
