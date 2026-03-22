#!/bin/bash
# Script to start the Food AI backend (FastAPI) — web UI is served at the same port

echo "======================================="
echo "  Starting Food AI (Backend + Web UI)"
echo "  (Auto-setup enabled)"
echo "======================================="

# Get absolute path to the project root
PROJECT_ROOT="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# --- BACKEND SETUP ---
echo "1. Setting up Backend..."
cd "$PROJECT_ROOT/backend"

# Auto-create .env if missing
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        echo "   >> Creating .env file from .env.example..."
        cp .env.example .env
        echo "   >> ⚠️ Note: A default .env was created. You might need to add API keys later."
    fi
fi

# Auto-create virtual environment and install dependencies if missing
if [ ! -d "venv" ]; then
    echo "   >> Creating Python virtual environment (venv)..."
    if command -v python3 &>/dev/null; then
        python3 -m venv venv
    else
        python -m venv venv
    fi
    echo "   >> Installing backend dependencies..."
    if [ -f "venv/Scripts/activate" ]; then
        source venv/Scripts/activate
    else
        source venv/bin/activate
    fi
    pip install -r requirements.txt
else
    if [ -f "venv/Scripts/activate" ]; then
        source venv/Scripts/activate
    else
        source venv/bin/activate
    fi
fi

# Run database migrations automatically
if command -v alembic &> /dev/null && [ -f "alembic.ini" ]; then
    echo "   >> Running database migrations..."
    alembic upgrade head
fi

echo "   >> Starting Backend API + Web UI (FastAPI)..."
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!
echo "   >> Open http://localhost:8000 for the web app (API docs: http://localhost:8000/docs )"
echo "   >> PID: $BACKEND_PID"

echo "---------------------------------------"
echo "✅ Service started. Press Ctrl+C to stop."

trap "echo -e '\nStopping...'; kill $BACKEND_PID 2>/dev/null; exit" INT TERM

wait
