"""Main entry point for the Face Recognition Identification System API."""

from contextlib import asynccontextmanager
import logging
import os
from fastapi import FastAPI, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

from backend.database import get_db, mongo_db
from backend.models.face import HealthResponse
from backend.routers.face_routes import router as face_router

logger = logging.getLogger("face_recognition.main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan context manager managing database connection lifecycle."""
    mode = os.getenv("DATABASE_MODE", "mongodb").strip().lower()
    logger.info("Starting Face Recognition API in mode: %s", mode)
    if mode == "mongodb":
        try:
            mongo_db.connect()
        except Exception as exc:
            logger.warning("MongoDB connection on startup failed: %s", type(exc).__name__)
    yield
    if mode == "mongodb":
        try:
            mongo_db.close()
        except Exception as exc:
            logger.warning("Error closing MongoDB connection: %s", type(exc).__name__)


app = FastAPI(
    title="Face Recognition Identification System API",
    description=(
        "Backend REST API for face enrollment, face identification, "
        "and person management using InsightFace and MongoDB Atlas."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# Configure CORS for React frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get(
    "/health",
    response_model=HealthResponse,
    status_code=status.HTTP_200_OK,
    tags=["System"],
    summary="Health check endpoint",
)
async def health_check(response: Response) -> HealthResponse:
    """Check API operational health and database connectivity."""
    mode = os.getenv("DATABASE_MODE", "mongodb").strip().lower()
    db = get_db()
    is_connected = db.check_connection()

    if not is_connected:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        return HealthResponse(
            status="degraded",
            database="disconnected",
            database_mode=mode,
        )

    return HealthResponse(
        status="healthy",
        database="connected",
        database_mode=mode,
    )


# Include feature routers
app.include_router(face_router)


# Standardized exception handlers
@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    """Ensure all HTTP exceptions return structured JSON."""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error": exc.detail if isinstance(exc.detail, str) else "HTTP Error",
            "detail": str(exc.detail),
        },
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handle FastAPI / Pydantic validation errors."""
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "success": False,
            "error": "Validation Error",
            "detail": exc.errors(),
        },
    )


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Catch-all unexpected internal server errors."""
    logger.error("Unhandled server exception: %s", str(exc), exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "success": False,
            "error": "Internal Server Error",
            "detail": "An unexpected error occurred while processing the request.",
        },
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
