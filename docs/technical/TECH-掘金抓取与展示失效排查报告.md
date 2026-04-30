# 技术诊断报告：掘金文章抓取与线上展示失效分析

## 1. 问题描述
用户在 Railway 部署后端与数据库后，执行抓取任务发现：
- 数据库 `post` 表中未观察到数据插入。
- 线上博客页面无法展示抓取的掘金文章及对应图片。

---

## 2. 核心原因排查与分析

### 2.1 数据库写入环节 (The Missing Link)
根据之前的 `curl` 调用结果，后端返回了 `importedCount: 11`，但在数据库中未查看到数据。
- **潜在原因 1：环境变量选择建议 (CRITICAL)**
  - **当前现状**：线上 API 使用了 `DATABASE_URL` (Public URL)。
  - **风险点**：虽然 Public URL 在外部可用，但在 Railway 内部环境（API 与 DB 同属一个项目）中，**强烈建议使用 Private URL** (`postgresql://postgres:...@postgres.railway.internal:5432/railway`)。
  - **优势**：Private URL 走内部网络，延迟更低、更稳定，且不会受到外部代理（Proxy）的流量限制或连接波动影响。
- **潜在原因 2：Prisma Client 状态不一致**
  - **现象**：代码中使用了 `(this.prisma.post as any).create`。
  - **后果**：如果 Prisma Schema 与线上数据库结构未完全同步（未执行 `npx prisma db push`），写入操作可能在静默失败或事务回滚。

---

## 3. 环境变量核对建议

| 变量名 | 推荐值 (Railway 内部) | 说明 |
| :--- | :--- | :--- |
| **DATABASE_URL** | `postgresql://postgres:mRtyuZYSAdpqDyLcOFjMWgCLndqUUlpE@postgres.railway.internal:5432/railway` | **推荐**。内部网络连接，更稳定。 |
| **DATABASE_PUBLIC_URL** | `postgresql://postgres:mRtyuZYSAdpqDyLcOFjMWgCLndqUUlpE@shortline.proxy.rlwy.net:11211/railway` | 仅用于本地开发或外部工具连接数据库。 |

### 2.2 线上展示环节 (Visibility Filter)
即便数据成功入库，以下因素也会导致前端无法显示：
- **分类缺失 (Category Missing)**
  - **逻辑**：公开接口 `/api/public/posts` 通常带有过滤逻辑。早期抓取的文章由于没有分配 `categoryId`（值为 NULL），被 API 逻辑排除在首页列表之外。
- **状态默认为草稿 (Status Draft)**
  - **逻辑**：旧版代码默认将抓取文章设为 `draft`，而首页仅展示 `status: 'published'` 的文章。

### 2.3 图片展示环节 (Image Persistence)
- **存储方案未切换**：如果后端未正确加载 R2 环境变量，图片将回退到本地存储。
- **后果**：Railway 容器重启后，本地存储的图片会丢失，导致前端出现裂图或空图。

---

## 3. 故障链路图 (Data Flow Failure)

```mermaid
graph TD
    A[执行抓取接口] --> B{后端逻辑执行}
    B -- 成功提取 --> C[上传图片到 R2]
    C -- 写入 DB --> D{生产数据库}
    D -- 缺失分类/草稿状态 --> E[API 过滤]
    E -- 结果为空 --> F[前端页面无内容]
    
    style D fill:#f96,stroke:#333,stroke-width:2px
    style E fill:#f96,stroke:#333,stroke-width:2px
```

---

## 4. 解决方案与执行清单

### 第一步：数据库与环境核对 (CRITICAL)
- [ ] **核对 DATABASE_URL**：在 Railway 确认 `api` 服务的环境变量中，`DATABASE_URL` 是否与 `db` 服务的内部连接字符串一致。
- [ ] **执行同步**：在本地运行 `npx prisma db push` 确保线上表结构包含 `originalUrl`, `platform` 等新增字段。

### 第二步：代码层面的“自愈”修复
- [ ] **自动分类关联**：已推送代码，强制所有抓取文章在入库时绑定“技术文章”分类。
- [ ] **启动自愈逻辑**：已在 `CrawlerService` 的 `onModuleInit` 中添加逻辑，系统重启时会自动扫描并修复历史遗留的“无分类”文章。

### 第三步：验证流程
1. 访问 `https://wonderful-spontaneity-production-3251.up.railway.app/api/public/posts`。
2. 确认 `total` 字段是否大于 4。
3. 如果大于 4 且包含 R2 图片链接，则表示修复成功。

---

## 5. 建议
请检查 Railway 的 **Deployments Logs**，搜索关键字 `Prisma` 或 `Crawler`，查看是否存在 `Unique constraint failed` 或 `Foreign key constraint failed` 的错误报错。
