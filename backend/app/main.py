import os
import time
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.staticfiles import StaticFiles

from app.routers import (
    auth,
    catalog,
    cart,
    address,
    order,
    admin_auth,
    admin_dashboard,
    admin_categories,
    admin_products,
    admin_customers,
    admin_orders,
    admin_delivery,
    admin_reports,
    admin_settings,
    admin_uploads,
    delivery,
)
from app.config import settings

app = FastAPI(
    title="GraminFresh API",
    description="GraminFresh Farm-to-Door Enterprise API & Admin Platform",
    version="2.0.0",
)

# Enable GZip compression for responses >= 500 bytes (speeds up catalog/order payloads by 60-80%)
app.add_middleware(GZipMiddleware, minimum_size=500)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",  
        "http://localhost:3000",  
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],  
    allow_headers=["*"],  
)

# Static files mount for uploads
STATIC_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "static")
os.makedirs(os.path.join(STATIC_DIR, "uploads"), exist_ok=True)
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

# Performance & Process Timing Middleware
@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time = time.perf_counter()
    response = await call_next(request)
    process_time = (time.perf_counter() - start_time) * 1000.0
    response.headers["X-Process-Time"] = f"{process_time:.2f}ms"
    response.headers["Server-Timing"] = f"total;dur={process_time:.2f}"
    return response

# Customer Routers (Preserved 100%)
app.include_router(auth.router)
app.include_router(catalog.router)
app.include_router(cart.router)
app.include_router(address.router)
app.include_router(order.router)

# Extended Admin Routers
app.include_router(admin_auth.router)
app.include_router(admin_dashboard.router)
app.include_router(admin_categories.router)
app.include_router(admin_products.router)
app.include_router(admin_customers.router)
app.include_router(admin_orders.router)
app.include_router(admin_delivery.router)
app.include_router(delivery.router)
app.include_router(admin_reports.router)
app.include_router(admin_settings.router)
app.include_router(admin_uploads.router)


@app.get("/")
def root():
    return {"message": "GraminFresh API is running", "status": "active"}


@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "GraminFresh Platform"}