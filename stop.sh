#!/bin/bash
# Stop uvicorn processes for this project

echo "Stopping Food AI backend (uvicorn)..."
pkill -f "uvicorn.*app.main:app" 2>/dev/null || pkill -f "uvicorn app.main" 2>/dev/null || true
echo "Done."
