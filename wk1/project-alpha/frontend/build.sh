#!/bin/bash

echo "正在构建Ticket Management前端项目..."

# 检查npm是否已安装
if ! command -v npm &> /dev/null; then
    echo "错误：npm未安装，请先安装Node.js和npm。"
    exit 1
fi

# 安装依赖
echo "正在安装依赖..."
npm install

# 检查依赖安装是否成功
if [ $? -ne 0 ]; then
    echo "错误：依赖安装失败。"
    exit 1
fi

# 运行构建命令
echo "正在构建项目..."
npm run build

# 检查构建是否成功
if [ $? -eq 0 ]; then
    echo "构建成功！"
    echo "构建产物位于 dist/ 目录"
    exit 0
else
    echo "错误：构建失败。"
    exit 1
fi
