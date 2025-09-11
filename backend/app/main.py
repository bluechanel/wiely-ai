from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from app.api import chat_router
from app.utils.logging import setup_logging

# 加载环境变量
load_dotenv(verbose=True)

# 设置日志
setup_logging()

# 创建FastAPI应用
app = FastAPI(
    title="Wiley AI Backend",
    description="Wiley AI聊天后端API",
    version="1.0.0"
)

# 添加CORS中间件
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 在生产环境中应该指定允许的源
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由
app.include_router(chat_router, prefix="/api")

# 健康检查端点
@app.get("/health")
async def health_check():
    """健康检查端点。"""
    return {"status": "ok"}