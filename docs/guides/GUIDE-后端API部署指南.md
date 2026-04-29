# 后端 API 部署指南 (Railway / Render 版)

本项目的后端采用 NestJS + Prisma (PostgreSQL)，适合部署在 Railway 或 Render 等支持容器化和数据库的 PaaS 平台。

---

## 1. 部署前的代码准备

### 1.1 检查 CORS 配置
确保 [main.ts](file:///Users/wares/Desktop/Blog/apps/api/src/main.ts) 允许了你的生产环境前端域名。

```typescript
// apps/api/src/main.ts
app.enableCors({
  origin: [
    /^http:\/\/localhost:5173$/,
    /^https:\/\/www\.你的域名\.com$/  // 替换为你的正式域名
  ],
});
```

### 1.2 确认启动脚本
在 [package.json](file:///Users/wares/Desktop/Blog/apps/api/package.json) 中，确保有 `start:prod` 脚本：
- `build`: `nest build`
- `start:prod`: `node dist/main`

---

## 2. 方案一：使用 Railway 部署 (深度推荐)

Railway 是目前最适合 NestJS + Prisma Monorepo 结构的 PaaS 平台。它支持直接在同一个 Project 中管理 API 服务和 PostgreSQL 数据库。

### 2.1 准备工作：Monorepo 识别
由于本项目是 Monorepo 结构（`apps/api`, `apps/web`），Railway 需要知道如何进入正确的子目录进行构建。

### 2.2 第一步：创建项目与数据库
1.  登录 [Railway.app](https://railway.app/)。
2.  点击 **"New Project"** -> **"Deploy from GitHub repo"** -> 选择你的仓库。
3.  **不要立即部署**，先点击 **"Add Service"** -> **"Database"** -> **"Add PostgreSQL"**。
4.  等待数据库创建完成后，点击进入数据库服务，选择 **Variables** 选项卡，确认存在 `DATABASE_URL`。

### 2.3 第二步：配置 API 服务
1.  点击你刚刚从 GitHub 导入的 API 服务。
2.  进入 **Settings** 选项卡：
    -   **Root Directory**: 设置为 `apps/api`。
    -   **Build Command**: 设置为 `npx prisma generate && npx prisma migrate deploy && npm run build`。
        -   *说明：使用 npm run build 具有更好的兼容性。该命令会依次执行：生成客户端 -> 同步数据库 -> 编译代码。*
    -   **Start Command**: 设置为 `pnpm start:prod`。
3.  进入 **Variables** 选项卡，点击 **"New Variable"**：
    -   `DATABASE_URL`: 输入 `${{Postgres.DATABASE_URL}}` (Railway 会自动注入数据库连接串)。
    -   `PORT`: `3000` (NestJS 默认端口)。
    -   `ADMIN_TOKEN`: 设置一个用于管理后台鉴权的强随机字符串。
    -   `NODE_ENV`: `production`
    -   **AI 相关 (如有需求)**: `OPENAI_API_KEY`, `OPENAI_BASE_URL`, `QDRANT_URL` 等。

### 2.4 第三步：初始化种子数据 (仅首次部署)
如果您的数据库是空的，需要初始化分类、标签等基础数据。
1.  在本地终端运行（推荐，需配置本地 `.env` 指向云端数据库）：
    ```bash
    pnpm -C apps/api db:seed
    ```
2.  或者在 **API 服务**（非数据库服务）的 **Variables** 中临时添加一个变量 `DATABASE_SEED=true`，并修改其 **Start Command** 为：
    ```bash
    npx prisma db seed && pnpm start:prod
    ```
    *注意：数据初始化成功后，请务必还原 API 服务的 Start Command 并删除该变量。*

### 2.5 第四步：域名与公开访问
1.  在 API 服务的 **Settings** 中找到 **Public Networking**。
2.  点击 **Generate Domain** 获取一个临时域名（如 `xxx.up.railway.app`）。
3.  **绑定正式域名**：点击 **Custom Domain**，输入 `api.yourdomain.com`，按照提示去阿里云配置 CNAME。

---

## 3. 方案二：使用 Render 部署

### 3.1 部署步骤
1. **新建服务**：登录 [Render](https://render.com/)，点击 "New" -> "Web Service"。
2. **配置项目**：
   - **Root Directory**: `apps/api` (或者保持为 `/` 并在构建命令中指定子目录)
   - **Build Command**: `cd ../.. && pnpm install && cd apps/api && npx prisma generate && pnpm build`
   - **Start Command**: `pnpm start:prod`
3. **数据库**：点击 "New" -> "PostgreSQL"，创建一个云端数据库。

### 3.2 配置环境变量
在 **Environment** 选项卡中添加：
- `DATABASE_URL`: 填写 Render 数据库提供的 "Internal Database URL"。
- `ADMIN_TOKEN`: 你的管理令牌。

---

## 4. 绑定自定义域名 (阿里云 DNS)

1. 在 Railway/Render 后台找到 **Custom Domains** 选项。
2. 输入 `api.你的域名.com`。
3. 平台会提供一个 CNAME 目标地址（如 `xxx.railway.app`）。
4. **去阿里云后台**：添加一条 `CNAME` 记录，主机记录为 `api`，记录值为该目标地址。

---

## 5. 常见问题排查

- **502 错误**：检查后端服务是否崩溃，查看平台 Logs。
- **数据库连接失败**：确保 `DATABASE_URL` 正确，且数据库服务已启动。
- **CORS 报错**：检查后端 `main.ts` 是否允许了前端的 HTTPS 域名。
