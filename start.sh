#!/bin/sh
set -e

echo "Starting WhatsApp QR Bridge in background..."
cd /app/whatsapp-bridge && node server.js &

sleep 2

echo "Starting Rust Backend..."
cd /app
exec /app/whatsapp-backend
