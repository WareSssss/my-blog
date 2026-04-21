# 项目使用说明（新手友好版）

## 1. 这是什么项目？
这是一个“个人博客产品”的全栈项目，目标是做一个对外展示的网站，包含：
- 首页：个人介绍、技术栈、联系方式（并提供“开始对话”的入口）
- 博客：文章列表与阅读（技术文章 / 学习笔记 / 项目分享）
- 开发工具：常用在线工具入口集合（含“即将上线”状态）
- AI 聊天：基于知识库/博客内容的智能问答（后续会做 RAG）

你可以把它理解为：**一个对外展示的个人网站 + 内容站 + 工具箱 + AI 助手**。

## 2. 为什么要做它？
很多人需要一个统一的线上名片和内容阵地：
- 让招聘方/合作方快速了解你（能力展示）
- 让读者长期阅读你的技术沉淀（博客）
- 让访问者愿意收藏并反复访问（工具箱）
- 让 AI 能基于你的内容做智能问答（AI 聊天 + RAG）

## 3. 项目目标（MVP）
MVP 是“第一版能上线”的最小可用版本，目标是：
- 站点四个入口可用：首页 / 博客 / 工具 / AI 聊天
- 站点配置与工具列表从数据库读取（不再写死在前端代码里）
- 有基础数据库迁移与种子数据（新环境一键初始化）

## 4. 技术栈（你需要知道的）
项目采用 Monorepo（一个仓库多应用）的组织方式：
- 前端：React + Vite + TypeScript
- 后端：NestJS + TypeScript
- 数据库：PostgreSQL
- ORM：Prisma（负责建表、迁移、生成数据库客户端）

目录结构：
```text
Blog/
  apps/
    web/      # 前端站点
    api/      # 后端服务
  docs/       # 文档（PRD、API、迁移方案等）
```

## 5. 你需要准备什么（前置条件）
### 5.1 必需软件
- Node.js（建议 >= 18）
- pnpm
- PostgreSQL（推荐 macOS 用 Postgres.app）

### 5.2 数据库准备
你需要有一个本地数据库 `blog`，并在 `apps/api/.env` 配置连接串：
- 参考：[Postgres.app安装与使用.md](file:///Users/wares/Desktop/Blog/docs/Postgres.app安装与使用.md)

## 6. 一键启动（最常用）
在项目根目录执行：
```bash
pnpm install
```

启动后端（API）：
```bash
pnpm dev:api
```

启动前端（Web）：
```bash
pnpm dev:web
```

访问：
- 前端站点：http://localhost:5173
- 后端接口前缀：http://localhost:3000/api

## 7. 数据库迁移与种子数据（新手照做即可）
这一步是“让数据库自动建表 + 自动写入默认数据”。

### 7.1 配置环境变量
文件：`apps/api/.env`
- `DATABASE_URL=...`
- `ADMIN_TOKEN=...`（用于调用最小管理接口）

本项目提供示例文件：
- [apps/api/.env.example](file:///Users/wares/Desktop/Blog/apps/api/.env.example)

### 7.2 应用迁移（建表）
```bash
pnpm -C apps/api exec prisma migrate deploy
```

### 7.3 写入种子数据（默认分类、站点配置、工具列表）
```bash
pnpm -C apps/api exec prisma db seed
```

验证（可选）：
```bash
psql -d blog -c "select count(*) from categories;"
psql -d blog -c "select key from site_settings order by key;"
```

### 7.4 打开 Prisma Studio（可视化看表/数据）
```bash
pnpm -C apps/api exec prisma studio --port 5555 --browser none
```
浏览器打开：
- http://localhost:5555

如果提示端口占用（EADDRINUSE），说明 5555 已经有一个 Studio 在跑：
- 直接打开 http://localhost:5555
- 或换端口，例如 5556

## 8. 目前“已经实现了什么？”
### 8.1 前端页面（对照原型图）
原型图在：
- [docs/原型图](file:///Users/wares/Desktop/Blog/docs/原型图)

已实现页面：
- 首页：`/`
- 博客：`/blog`
- 工具：`/tools`
- AI 聊天：`/ai`

### 8.2 数据来源（重点）
现在部分数据已从数据库读取（不再写死）：
- 首页的 profile/contacts/tech-stack 来自 `site_settings`
- 博客页会读取分类列表 `categories`
- 工具页从 `tools` 表读取工具列表
- AI 页的标题/快捷提问/模型列表来自 `site_settings` 的 `ai` 配置

对应的 Public API（节选）：
- `GET /api/public/site/profile`
- `GET /api/public/site/contacts`
- `GET /api/public/site/tech-stack`
- `GET /api/public/site/ai`
- `GET /api/public/categories`
- `GET /api/public/tools`

## 9. 最小管理接口（Admin 配置接口）
说明：
- 这是为了让你不用做完整登录系统，也能先把“站点配置”跑通。
- 通过请求头 `x-admin-token` 做最小鉴权（值来自 `apps/api/.env` 的 `ADMIN_TOKEN`）。

### 9.1 读取全部站点配置
```bash
curl -sS \
  -H "x-admin-token: dev-admin-token" \
  http://localhost:3000/api/admin/site-settings
```

### 9.2 更新站点配置（示例：更新 profile）
```bash
curl -sS \
  -X PUT \
  -H "Content-Type: application/json" \
  -H "x-admin-token: dev-admin-token" \
  -d '{"value":{"name":"扶桑","alias":"Fsanq","title":"全栈工程师 / AI 探索者","intro":"这里是新的介绍"}}' \
  http://localhost:3000/api/admin/site-settings/profile
```

更新后刷新前端首页即可看到变化。

## 10. 常见问题（新手最容易卡住）
### 10.1 打开 Prisma Studio 报端口占用
换一个端口：
```bash
pnpm -C apps/api exec prisma studio --port 5556 --browser none
```

### 10.2 后端启动报 DATABASE_URL is required
说明 `.env` 没加载或没配置：
- 确认 `apps/api/.env` 存在且有 `DATABASE_URL`
- 确认 Postgres.app 是 Running

### 10.3 Postgres.app 看不到表
Postgres.app 本身不是“表管理器”。看表请用：
- Prisma Studio（推荐）
- 或 `psql \dt`

## 11. 下一步怎么推进（给你一个清晰路径）
- 继续里程碑 2：把剩余的写死数据全部迁到数据库（例如更多 site_settings、工具分类等）
- 里程碑 3：接入 Markdown 文章扫描 -> 写入 posts 表 -> 前端博客列表/详情从 API 渲染
- 里程碑 5：AI 聊天接入云模型
- 里程碑 6：接入 RAG（向量库 + 引用来源）
