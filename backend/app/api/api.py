from fastapi import APIRouter

from app.api.endpoints import ads, tarot, users

api_router = APIRouter()
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(tarot.router, prefix="/tarot", tags=["tarot"])
api_router.include_router(ads.router, prefix="/ads", tags=["ads"])
