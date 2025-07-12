#!/bin/bash
echo "Stopping server..."
pkill -f "node.*server" 2>/dev/null
echo ""
echo "Starting server..."
npm run dev 