# Food AI Project Structure

This document outlines the directory structure of the Food AI project and the purpose of each main component.

## Root directory (`/Food-AI`)

* `README.md`: How to set up and run the application.
* `start.sh`: Starts the FastAPI backend (web UI is served on the same port).
* `stop.sh`: Stops uvicorn processes started for this app.
* `backend/`: Python API and bundled static web UI.

---

## Backend (`/backend`)

FastAPI application, food analysis logic, and the **browser UI** (static HTML/CSS/JS).

* **`app/`**: Application code.
  * `api/`: REST routes (e.g. image upload and analysis).
  * `core/`: Security and configuration.
  * `models/`: Database models.
  * `providers/`: External integrations (e.g. Gemini, local YOLO).
  * `static/`: Web frontend — `index.html`, `css/`, `js/` (served under `/` and `/static/...`).
  * `main.py`: FastAPI entry; mounts static files and serves the web app at `/`.
* **`alembic/`** & **`alembic.ini`**: Database migrations.
* **`requirements.txt`**: Python dependencies (`start.sh` uses this with `venv`).
* **`.env` / `.env.example`**: Environment variables (e.g. Gemini API key).

The previous separate Expo/React Native **mobile-app** tree was removed; the product focus is the web UI shipped with the backend.
