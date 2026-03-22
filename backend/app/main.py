"""
FastAPI application entry point
"""
from pathlib import Path

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.config import get_settings
from app.api.v1.routers import analyze

settings = get_settings()

STATIC_DIR = Path(__file__).resolve().parent / "static"

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize resources on startup, cleanup on shutdown"""
    print(f"🚀 Starting {settings.APP_NAME} v{settings.APP_VERSION}")
    # TODO: Initialize database connection pool
    # TODO: Verify AI service connectivity
    yield
    print(f"👋 Shutting down {settings.APP_NAME}")
    # TODO: Close database connections
    # TODO: Cleanup temporary files

# Create FastAPI application
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Backend API for Food & Nutrition Analysis System",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# Add CORS middleware (API may be called from other dev origins)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Health check / web shell
@app.get("/", tags=["Health"])
async def root():
    """Serve web UI or JSON fallback if static files are missing"""
    index = STATIC_DIR / "index.html"
    if index.is_file():
        return FileResponse(index)
    return {
        "status": "healthy",
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION,
    }


@app.get("/health", tags=["Health"])
async def health_check():
    """Detailed health check endpoint"""
    return {
        "status": "healthy",
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "database": "not configured",  # TODO: Add DB health check
        "ai_service": "not configured"  # TODO: Add AI service health check
    }


# Include routers
app.include_router(
    analyze.router,
    prefix=settings.API_V1_PREFIX,
)

if STATIC_DIR.is_dir():
    app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG
    )
