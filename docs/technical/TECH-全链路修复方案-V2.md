# 掘金文章抓取与线上展示全链路修复方案 (V2)

基于对您线上环境变量的核对及数据库写入失效的分析，以下是针对性修复步骤。

## 1. 核心问题定位
- **数据库连接波动**：当前 API 使用的是 Public URL，在 Railway 内部环境不稳定，导致程序返回“导入成功”但实际未写入生产库。
- **Schema 结构不匹配**：线上数据库可能缺少 `originalUrl` 等爬虫专用字段，导致 Prisma 写入静默失败。
- **展示过滤逻辑**：历史抓取数据缺失 `categoryId`（分类），被首页 API 自动过滤。

---

## 2. 解决方案：三步走修复策略

### 第一步：优化 Railway 环境变量 (稳定性修复)
请在 Railway 控制台将 **api** 服务的 `DATABASE_URL` 修改为 **Private URL**。
- **修改前**：`postgresql://postgres:...@shortline.proxy.rlwy.net:11211/railway` (Public)
- **修改后**：`postgresql://postgres:mRtyuZYSAdpqDyLcOFjMWgCLndqUUlpE@postgres.railway.internal:5432/railway` (Private)
- **目的**：利用 Railway 内部高速网络，消除公网代理导致的连接不稳定问题。

### 第二步：同步数据库结构 (结构修复)
确保生产数据库的表结构是最新的。请在您的本地终端执行：
1. **核对本地 .env**：确保 `DATABASE_URL` 为 Public 地址（即刚才 API 替换掉的那个）。
2. **运行同步命令**：
   ```bash
   cd apps/api
   npx prisma db push
   ```
- **目的**：在 Railway 数据库中创建 `originalUrl`, `platform`, `externalId` 等爬虫所需的字段。

### 第三步：触发自愈与抓取 (数据修复)
我已推送了包含“自愈逻辑”的代码，部署完成后：
1. **自动修复**：系统启动时会自动扫描数据库，将所有来源为 `crawler` 且缺失分类的文章补齐分类（技术文章）并设为已发布。
2. **手动重试抓取**：
   ```bash
   curl -X POST 'https://wonderful-spontaneity-production-3251.up.railway.app/api/admin/crawler/run' \
   -H 'x-admin-token: blog_admin_2026_x8Kf92PqLmN7rS4z'
   ```

---

## 3. 验收标准
- [ ] 访问 `https://www.waresblog.xyz/`，首页文章数应显著增加（>10篇）。
- [ ] 文章封面图应显示正常（图片地址以 `r2.dev` 开头）。
- [ ] 调用接口 `GET /api/public/posts`，确认 `items` 数组中包含 `sourceType: "crawler"` 的文章。

---

## 4. 后续保障
- **全自动分类**：新抓取的文章已默认关联“技术文章”分类。
- **图片持久化**：所有图片强制上传至 Cloudflare R2，不再依赖服务器本地磁盘。
