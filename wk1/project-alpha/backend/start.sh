#!/bin/bash

echo "正在启动Ticket Management后端服务..."

# 检查虚拟环境是否存在
if [ ! -d "venv" ]; then
    echo "错误：虚拟环境不存在，请先创建虚拟环境。"
    exit 1
fi

# 激活虚拟环境
echo "激活虚拟环境..."
source venv/bin/activate

# 检查依赖是否已安装
if [ ! -f "venv/bin/uvicorn" ]; then
    echo "正在安装依赖..."
    pip install -r requirements.txt
fi

# 启动后端服务
echo "正在启动FastAPI服务器..."
echo "服务器将在 http://0.0.0.0:8000 上运行"
echo "API文档地址：http://0.0.0.0:8000/docs"
echo "按 Ctrl+C 停止服务器"

uvicorn main:app --reload --host 0.0.0.0 --port 8000
