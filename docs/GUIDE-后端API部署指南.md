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

## 2. 方案一：使用 Railway 部署 (推荐)

Railway 对 Monorepo 和 Prisma 支持非常友好。

### 2.1 部署步骤
1. **关联 GitHub**：登录 [Railway](https://railway.app/)，点击 "New Project" -> "Deploy from GitHub repo"。
2. **选择项目根目录**：Railway 会自动识别 Monorepo。
3. **设置 Root Directory**：在服务设置中，将 Root Directory 设置为 `apps/api`。
4. **添加数据库**：点击 "New" -> "Database" -> "Add PostgreSQL"。

### 2.2 配置环境变量 (Variables)
在 Railway 的 API 服务面板中添加以下变量：
- `DATABASE_URL`: 引用 Railway 自动生成的变量 `${{Postgres.DATABASE_URL}}`。
- `ADMIN_TOKEN`: 自定义一个强密码字符串（用于管理接口鉴权）。
- `PORT`: `3000` (Railway 会自动分配端口，但 NestJS 默认是 3000)。
- `NODE_ENV`: `production`

### 2.3 数据库迁移自动化
在 Railway 的 **Settings -> Build & Deploy** 中，设置 **Post-Install Command**：
```bash
npx prisma migrate deploy && npx prisma db seed
```
*注：`db seed` 仅在首次部署需要初始化数据时执行，后续更新可移除。*

---

## 3. 方案二：使用 Render 部署

### 3.1 部署步骤
1. **新建服务**：登录 [Render](https://render.com/)，点击 "New" -> "Web Service"。
2. **配置项目**：
   - **Root Directory**: `apps/api`
   - **Build Command**: `pnpm install && pnpm build`
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
