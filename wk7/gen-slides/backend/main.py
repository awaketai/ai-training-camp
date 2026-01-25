from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from .routes import slides_router, images_router, style_router


# Create FastAPI app
app = FastAPI(
    title="GenSlides API",
    description="Backend API for GenSlides presentation generator",
    version="0.1.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
# Note: Order matters! More specific routes (with literal paths like "style")
# must come before generic routes (with path parameters like {slide_index})
app.include_router(slides_router)
app.include_router(style_router)  # Must be before images_router
app.include_router(images_router)


# Exception handlers
@app.exception_handler(404)
async def not_found_handler(request: Request, exc):
    return JSONResponse(
        status_code=404,
        content={"detail": "Resource not found"}
    )


@app.exception_handler(400)
async def bad_request_handler(request: Request, exc):
    return JSONResponse(
        status_code=400,
        content={"detail": "Bad request"}
    )


@app.exception_handler(409)
async def conflict_handler(request: Request, exc):
    return JSONResponse(
        status_code=409,
        content={"detail": "Conflict - resource already exists or operation in progress"}
    )


@app.exception_handler(500)
async def internal_error_handler(request: Request, exc):
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"}
    )


@app.get("/")
async def root():
    return {"message": "GenSlides API", "version": "0.1.0"}


@app.get("/health")
async def health():
    return {"status": "healthy"}
