from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes.admin import router as admin_router
from app.api.routes.auth import router as auth_router
from app.api.routes.entries import router as entries_router
from app.api.routes.vegetables import router as vegetables_router
from app.core.config import settings
from app.api.routes.chat import router as chat_router


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
)


# ==========================================
# CORS CONFIGURATION
# ==========================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==========================================
# ROOT
# ==========================================

@app.get("/")
def root():
    return {
        "message": "Veegronex FreshFlow API is running",
        "version": settings.APP_VERSION,
    }


# ==========================================
# HEALTH CHECK
# ==========================================

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
    }


# ==========================================
# API ROUTES
# ==========================================

app.include_router(
    auth_router,
    prefix="/api/v1",
)

app.include_router(
    admin_router,
    prefix="/api/v1",
)

app.include_router(
    entries_router,
    prefix="/api/v1",
)

app.include_router(vegetables_router, prefix="/api/v1")
app.include_router(chat_router, prefix="/api/v1")