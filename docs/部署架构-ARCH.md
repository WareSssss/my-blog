# 部署架构（ARCH）：Vercel + Docker API（Render / Railway / 云主机）

本文面向“先把前后端部署起来”的目标，给出 3 套可选的后端部署方案（Render / Railway / 云主机），并统一前端使用 Vercel。

你可以把它理解为：**前端上 Vercel，后端用 Docker 跑在任意平台**，数据库使用托管 PostgreSQL（或自建）。

---

## 1. 项目背景与范围
### 1.1 本项目包含什么
- Web：`apps/web`（React + Vite）
- API：`apps/api`（NestJS + Prisma + PostgreSQL）
- 数据库：PostgreSQL（必须）

### 1.2 本文不包含什么
- 域名购买与证书细节（不同平台界面差异大）
- CI/CD 高阶流水线（先用平台默认的自动部署）
- 向量库（RAG 的 Qdrant/Chroma）上线方案（后续里程碑 6 再补）

---

## 2. 部署前提（必须满足）

### 2.1 账户与资源
- 一个 Git 仓库（GitHub/GitLab 任意）
- 一个 PostgreSQL 实例（推荐托管）
  - Render / Railway 自带 Postgres（按平台购买）
  - 云主机可自建 Postgres，但初期不推荐（运维成本高）
- 前端：Vercel 账号与项目
- 后端：Render 或 Railway 或 云主机（任选其一）

### 2.2 环境变量（必须）
后端（API）最低要求：
- `DATABASE_URL`：PostgreSQL 连接串
- `ADMIN_TOKEN`：你当前最小管理接口用
- `SITE_URL`：用于生成 sitemap 等（可选但推荐）

前端（Web）最低要求：
- `VITE_API_BASE_URL`（推荐加）：后端 API 基地址（例如 `https://api.xxx.com`）

说明：
- 本地开发用 Vite proxy（`/api -> localhost`），线上部署建议改成显式的 API BaseURL（避免跨域/代理差异）。

---

## 3. 统一逻辑部署架构（逻辑视图）

无论后端部署在 Render / Railway / 云主机，你的整体逻辑都是一样的：

```text
┌──────────────────────────┐
│         Browser           │
└─────────────┬────────────┘
              │ HTTPS
              ▼
┌──────────────────────────┐
│        Vercel (Web)       │
│  apps/web 静态资源与路由   │
└─────────────┬────────────┘
              │ HTTPS (API)
              ▼
┌──────────────────────────┐
│        Docker (API)       │
│  NestJS + Prisma Client   │
│  /api/* 对外提供接口       │
└─────────────┬────────────┘
              │ TCP
              ▼
┌──────────────────────────┐
│     PostgreSQL (DB)       │
│  posts/tools/site_settings │
└──────────────────────────┘
```

关键说明：
- Web 与 API 强烈建议使用两个域名：
  - Web：`https://www.xxx.com`（Vercel）
  - API：`https://api.xxx.com`（Render/Railway/云主机）
- API 必须启用 CORS（你本地已有 CORS，线上需把 origin 放行到 Vercel 域名）
- Prisma migrate/seed 要能在部署流程中执行（至少第一次要执行）

---

## 4. 方案 A：Render（推荐入门）

### 4.1 Render 的特点
- 上手快：UI 配置就能跑 Docker
- 自带 Postgres 选项
- 适合 MVP 与中小项目

### 4.2 部署架构（Render）
```text
Browser
  │
  ├──> Vercel (Web)
  │
  └──> Render Web Service (Docker API)
           │
           └──> Render Postgres（或外部托管 Postgres）
```

### 4.3 部署前提
- Render 账号
- 一个 Postgres（Render 提供或外部）
- API 项目具备 Dockerfile（建议）

### 4.4 推荐部署流程（概念步骤）
1) 在 Render 新建 Web Service（类型选择 Docker）
2) 绑定 Git 仓库与分支（main）
3) 配置环境变量：`DATABASE_URL`、`ADMIN_TOKEN`、`SITE_URL`
4) 启动命令/Entrypoint 内执行：
   - `prisma migrate deploy`
   - 启动 NestJS（`node dist/main`）
5) Vercel 侧把 `VITE_API_BASE_URL` 指向 Render 的 API 域名

---

## 5. 方案 B：Railway（推荐开发者体验）

### 5.1 Railway 的特点
- Developer UX 好，部署与环境变量体验很顺手
- 多服务编排方便（后续可加向量库、Redis）
- 自带 Postgres

### 5.2 部署架构（Railway）
```text
Browser
  │
  ├──> Vercel (Web)
  │
  └──> Railway Service (Docker API)
           │
           └──> Railway Postgres
```

### 5.3 部署前提
- Railway 账号
- Railway Postgres（或外部托管 Postgres）

### 5.4 推荐部署流程（概念步骤）
1) Railway 新建 Project -> New Service（Dockerfile）
2) 新建 Postgres 插件并获取连接串
3) 配置环境变量：`DATABASE_URL`、`ADMIN_TOKEN`、`SITE_URL`
4) 部署时执行迁移：`prisma migrate deploy`
5) Vercel 配置 `VITE_API_BASE_URL`

---

## 6. 方案 C：云主机（可控性最高）

### 6.1 云主机的特点
- 可控性最高：网络、安全、性能、成本都可自己调
- 运维成本最高：日志、监控、备份、证书、更新都要自己处理

适合：
- 你已经熟悉 Docker/服务器运维
- 需要更强的自定义能力（例如多服务、私有网络、内网数据库）

### 6.2 部署架构（云主机）
```text
Browser
  │
  ├──> Vercel (Web)
  │
  └──> Cloud VM (Nginx) 反向代理
           │
           └──> Docker Container (Nest API)
                 │
                 └──> PostgreSQL (托管 或 VM 自建)
```

### 6.3 部署前提
- 一台云主机（Ubuntu/CentOS 等）
- Docker + Docker Compose
- 一个域名与 DNS（api 子域指向云主机）
- HTTPS（建议用 Nginx + Let's Encrypt）

### 6.4 推荐部署流程（概念步骤）
1) 云主机安装 Docker / docker compose
2) 配置 Nginx 反代到容器端口（例如 3000）
3) API 容器启动前执行 `prisma migrate deploy`
4) 配置环境变量
5) Vercel 配置 `VITE_API_BASE_URL`

---

## 7. 关键工程点（不分平台都必须注意）

### 7.1 数据库迁移（Prisma migrate）
部署时必须确保数据库表结构存在：
- 第一次部署：必须执行 `prisma migrate deploy`
- 后续发布：同样执行 `migrate deploy`（会自动跳过已执行迁移）

### 7.2 Seed（可选）
Seed 通常用于：
- 初始分类、站点配置、工具列表

建议做法：
- 仅首次环境初始化时手动执行一次 seed
- 或做一个受保护的“初始化脚本”而不是每次部署都跑

### 7.3 CORS（Web 调 API）
线上必须放行 Vercel 域名，例如：
- `https://xxx.vercel.app`
- `https://www.xxx.com`

### 7.4 文件上传（Excel Diff）
你已经有 Excel 上传接口，线上要注意：
- 平台对请求体大小限制（例如 10MB）
- 反向代理（Nginx）也可能需要调 `client_max_body_size`

### 7.5 端口与健康检查
- API 服务需要对外监听 `0.0.0.0:${PORT}`
- 平台通常会注入 `PORT` 环境变量（不能写死 3000）

---

## 8. 最小可上线清单（Checklist）
- Web（Vercel）
  - `VITE_API_BASE_URL` 指向线上 API 域名
  - Web 能访问首页/博客/工具/AI
- API（Docker）
  - `DATABASE_URL` 正确
  - `prisma migrate deploy` 已执行成功
  - 健康检查返回 200（例如 `/api/public/site/profile`）
- DB
  - 表已创建（Prisma migrations）
  - 必要 seed 已写入（分类/站点配置/工具）

---

## 9. 你下一步可以怎么做（建议顺序）
1) 先把 API 用 Dockerfile 跑起来（本地验证）
2) 选一个平台（Render 或 Railway）部署 API
3) Vercel 部署 Web，并配置 `VITE_API_BASE_URL`
4) 线上跑一次 `migrate deploy` +（可选）seed
5) 验证：博客列表/详情、工具（JSON/Excel Diff）、天气接口
