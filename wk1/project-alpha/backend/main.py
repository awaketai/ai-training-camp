from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.router import api_router
from app.db.session import engine, Base

# 创建所有数据库表
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Ticket Management API",
    description="API for managing tickets and tags",
    version="1.0.0"
)

# 配置CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 在生产环境中应限制为特定域名
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册API路由
app.include_router(api_router)

@app.get("/")
def root():
    return {"message": "Welcome to Ticket Management API"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}
