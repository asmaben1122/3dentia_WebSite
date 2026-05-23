from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.utils.logger import logger
from app.routes import auth, patients, reconstructions

# Define FastAPI Application with detailed medical SaaS metadata
app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="3DentAI - AI-Powered Medical SaaS Platform backend for 3D Dental Voxel & STL reconstruction from 2D Panoramics.",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json"
)

# Configure CORS Middleware for standard React/Vite dashboard integrations
if settings.BACKEND_CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.BACKEND_CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    logger.info(f"CORS middleware active. Configured origins: {settings.BACKEND_CORS_ORIGINS}")

# Mount modular api routing under versioned prefixes
app.include_router(auth.router, prefix=settings.API_STR)
app.include_router(patients.router, prefix=settings.API_STR)
app.include_router(reconstructions.router, prefix=settings.API_STR)

# Global Custom Exception Handling for clean, unified medical dashboard responses
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Intercepts unhandled server exceptions, logs trace logs, and yields unified JSON detail response."""
    logger.error(f"🚨 Unhandled application exception on {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "detail": "An internal medical platform processing error occurred. Please contact system support.",
            "error_class": exc.__class__.__name__
        }
    )

@app.get("/", tags=["General"])
async def root():
    """Simple status check welcome endpoint verifying system operations."""
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "docs": "/docs",
        "developer_message": "FastAPI production-ready backend is operational. Supabase sync initialized."
    }

# Lifespan / Startup hooks
@app.on_event("startup")
async def startup_event():
    logger.info("==============================================================")
    logger.info(f"🚀 Starting {settings.PROJECT_NAME} (v{settings.VERSION})")
    logger.info(f"Environment Mode: {settings.ENVIRONMENT}")
    logger.info(f"Local Interactive Docs: http://127.0.0.1:8000/docs")
    logger.info("==============================================================")

@app.on_event("shutdown")
async def shutdown_event():
    logger.info("Stopping 3DentAI FastAPI Application Server. Closing handles...")
