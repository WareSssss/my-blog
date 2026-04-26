# Railway 部署全流程指南 (API + PostgreSQL)

针对本项目（NestJS + Prisma 7 + Monorepo）在 Railway 上的部署，请严格按照以下步骤操作，以解决常见的环境变量读取和构建失败问题。

---

## 1. 基础设施准备 (Database)

1. 登录 [Railway.app](https://railway.app/)。
2. 点击 **"New Project"** -> **"Database"** -> **"Add PostgreSQL"**。
3. 等待数据库创建成功。
4. **记录关键变量**：
   - 点击进入 PostgreSQL 服务。
   - 在 **Variables** 选项卡中，你会看到 `DATABASE_URL`：postgresql://postgres:mRtyuZYSAdpqDyLcOFjMWgCLndqUUlpE@postgres.railway.internal:5432/railway。这是 API 连接数据库的唯一凭证。

---

## 2. API 服务配置 (NestJS)

### 2.1 创建服务

1. 在同一个 Project 中，点击 **"New"** -> **"GitHub Repo"** -> 选择你的仓库。
2. 导入后，先不要急着构建，点击进入该 API 服务。

### 2.2 核心设置 (Settings)

在 **Settings** 选项卡中进行以下配置：

- **Root Directory**: 必须设置为 `apps/api`。
- **Build Command**: 设置为：
  ```bash
  npx prisma generate && npm run build
  ```
- **Start Command**: 设置为：
  ```bash
  npx prisma migrate deploy && node dist/src/main
  ```
  *注意：NestJS 在 Monorepo 下构建出的路径通常包含 src 目录。*

### 2.3 环境变量设置 (Variables)

这是解决 `datasource.url property is required` 报错的关键。在 API 服务的 **Variables** 中添加：

| 变量名 (Key)       | 值 (Value)                     | 说明                                |
| :----------------- | :----------------------------- | :---------------------------------- |
| `DATABASE_URL`   | `postgresql://...proxy.rlwy.net...` | **推荐** 使用带 proxy 的公网连接串以保证稳定性 |
| `PORT`           | `3000`                       | NestJS 默认端口                     |
| `ADMIN_TOKEN`    | `你的强密码字符串`           | 管理端鉴权使用                      |
| `NODE_ENV`       | `production`                 | 生产环境标识                        |
| `OPENAI_API_KEY` | `你的 Key`                   | AI 对话需要                         |
| `QDRANT_URL`     | `你的 Qdrant 地址`           | 知识库检索需要                      |

---

## 3. Prisma 7 特殊注意事项

由于项目使用了 **Prisma 7**，配置文件分布如下：

1. **[schema.prisma](file:///Users/wares/Desktop/Blog/apps/api/prisma/schema.prisma)**:
   - 仅定义 `provider = "postgresql"`。
   - **严禁** 出现 `url = env(...)`，否则会报 `P1012` 错误。
2. **[prisma.config.ts](file:///Users/wares/Desktop/Blog/apps/api/prisma.config.ts)**:
   - 统一管理数据库连接。
   - 确保 `datasource.url` 能够正确读取 `process.env.DATABASE_URL`。

---

## 4. 自动化与数据初始化 (Seeding)

如果你是首次部署，需要初始化分类和站点配置：

1. 在 API 服务的 **Variables** 中临时添加 `DATABASE_SEED=true`。
2. 修改 **Start Command** 为：
   ```bash
   npx prisma db seed && npm run start:prod
   ```
3. 部署成功并确认数据初始化后，**请务必还原** Start Command 并删除该变量，防止重复写入。

---

## 5. 故障排查 (Troubleshooting)

- **Error: P1001 (Can't reach database)**:
  - **方案 A (推荐)**：检查 `DATABASE_URL` 引用。确保 `${{Postgres.DATABASE_URL}}` 中的 `Postgres` 与左侧数据库服务名完全一致。
  - **方案 B (稳定)**：改用公网连接。进入数据库服务的 Variables，复制带 `proxy.rlwy.net` 的 `DATABASE_URL`，手动粘贴到 API 服务的变量中。
  - **方案 C**：在 URL 末尾添加参数 `?connect_timeout=30` 延长等待时间。
- **sh: 1: pnpm: not found**:
  - 请使用 `npm run build` 代替 `pnpm build`。Railway 默认环境对 `npm` 支持更稳定。
- **CORS 报错**:
  - 检查 `apps/api/src/main.ts` 中的 `origin` 是否包含了 Railway 提供的公网域名。

---

## 6. 公网访问 (Public Access)

1. 在 API 服务的 **Settings** -> **Public Networking** 中。
2. 点击 **Generate Domain**。
3. 复制生成的域名（例如 `xxx.up.railway.app`），将其填入前端 Vercel 的 `VITE_API_BASE_URL` 环境变量中。
