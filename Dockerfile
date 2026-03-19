# 使用官方 Node.js 镜像
FROM harbor.saas.ch999.cn:1088/common/node:20-alpine

# 安装 sqlite3 编译所需的依赖
RUN apk add --no-cache python3 py3-setuptools make g++ sqlite-dev

WORKDIR /app

# 复制依赖文件并安装
COPY package*.json tsconfig.json ./

# 设置 sqlite3 二进制下载镜像，避免在旧内核环境（3.10）下由于 node-gyp 编译权限问题（printf: Operation not permitted）导致失败
RUN npm config set sqlite3_binary_host_mirror https://npmmirror.com/mirrors/sqlite3/
RUN npm ci --legacy-peer-deps || npm install --legacy-peer-deps

# 复制源码并编译
COPY . .
RUN npm run build

# 暴露 SSE 默认端口
EXPOSE 3001

# 环境变量设置
ENV PORT=3001

# 默认启动命令为 SSE 模式
ENTRYPOINT ["npm", "run", "start:sse"]
