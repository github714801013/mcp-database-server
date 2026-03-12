# 使用官方 Node.js 镜像（可根据需要替换为私有镜像）
FROM node:20-alpine

# 安装编译依赖（sqlite3 需要）
RUN apk add --no-cache python3 make g++

# Add metadata
LABEL maintainer="ExecuteAutomation <info@executeautomation.com>"
LABEL description="ExecuteAutomation Database Server - A Model Context Protocol server for SQLite"
LABEL version="1.1.0"

WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies (使用 --ignore-scripts 避免 native 模块编译问题)
RUN npm ci --ignore-scripts

# Rebuild native modules
RUN npm rebuild sqlite3

# Copy source code (including tsconfig.json)
COPY . .

# Build the TypeScript code
RUN npm run build

# Install mcp-proxy globally (可选)
RUN npm install -g mcp-proxy || true

# Set the entrypoint (正确的路径)
ENTRYPOINT ["node", "dist/src/index.js"]

# Default command (to be overridden by the user)
CMD [""]