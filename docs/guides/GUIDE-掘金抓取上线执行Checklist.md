# 掘金抓取上线执行 Checklist

## 1. 目标

将“掘金文章抓取 -> 内容结构化 -> 图片上传 Cloudflare R2 -> 文章发布 -> 前台展示”整条链路在**线上环境**跑通，并确保博客页面能够看到文章封面图和正文内容。

---

## 2. 上线前置条件

在开始执行前，请确认以下前置条件全部满足：

- 已将最新代码部署到线上后端
- 后端线上地址可访问
- 前端线上地址可访问
- PostgreSQL 数据库可用
- Cloudflare R2 已完成 Bucket、Token、Public URL 配置
- 具备线上环境变量编辑权限

---

## 3. 后端环境变量 Checklist

在 Railway 后端服务中，确认以下变量已经配置：

```bash
DATABASE_URL=postgresql://...
PORT=4000
ADMIN_TOKEN=请设置为高强度随机字符串

R2_ACCESS_KEY_ID=你的R2AccessKey
R2_ACCESS_KEY_SECRET=你的R2Secret
R2_BUCKET_NAME=wares-blog
R2_ENDPOINT=https://4722b20b2c8c393aa03020db90ed120c.r2.cloudflarestorage.com
R2_PUBLIC_URL=https://pub-0cac9c694bb64a50a001893415460066.r2.dev
```

检查项：

- `ADMIN_TOKEN` 已配置
- `R2_*` 五项已配置完整
- `R2_ENDPOINT` 不包含 Bucket 路径后缀
- `R2_PUBLIC_URL` 可直接在浏览器访问

---

## 4. 前端环境变量 Checklist

在前端部署平台中，确认以下变量已经配置：

```bash
VITE_API_BASE_URL=https://wonderful-spontaneity-production-3251.up.railway.app
```

检查项：

- 已配置 `VITE_API_BASE_URL`
- 值为**后端根域名**，不需要额外拼 `/api`
- 前端重新部署过

---

## 5. 部署执行 Checklist

### 5.1 后端部署

- 拉取最新代码
- 安装依赖
- 执行数据库同步
- 启动或重新部署服务

建议命令：

```bash
cd /path/to/Blog
git pull origin main
pnpm install
cd apps/api
pnpm exec prisma db push
```

Railway 场景下，如果是自动构建部署，请确认最近一次部署成功。

### 5.2 前端部署

- 配置 `VITE_API_BASE_URL`
- 重新触发前端部署
- 部署成功后打开首页

---

## 6. 接口可用性验证 Checklist

### 6.1 验证后端基础接口

执行：

```bash
curl 'https://wonderful-spontaneity-production-3251.up.railway.app/api/public/categories'
```

期望结果：

- 返回 JSON
- 不是 HTML
- HTTP 状态码是 `200`

### 6.2 验证文章接口

执行：

```bash
curl 'https://wonderful-spontaneity-production-3251.up.railway.app/api/public/posts?page=1&pageSize=5'
```

期望结果：

- 返回 JSON
- 包含 `items` 和 `pageInfo`

如果返回 HTML，说明前端域名或代理配置仍有问题。

---

## 7. 手动触发抓取 Checklist

执行：

```bash
curl -X POST 'https://wonderful-spontaneity-production-3251.up.railway.app/api/admin/crawler/run' \
  -H 'x-admin-token: 你的ADMIN_TOKEN'
```

检查项：

- 接口返回 `200`
- 返回体中存在 `importedCount`
- `importedCount > 0` 或 `totalFetched > 0`

如果失败：

- `401`：检查 `ADMIN_TOKEN`
- `500`：检查后端日志、数据库字段、R2 配置

---

## 8. 数据验证 Checklist

抓取成功后，验证以下内容：

- 新文章已写入线上数据库
- 文章状态为 `published`
- `sourceType` 为 `crawler`
- `coverUrl` 已替换为 R2 地址
- `publishedAt` 有值

建议验证方式：

- 通过 Prisma Studio
- 通过数据库查询
- 通过公开接口 `public/posts`

---

## 9. 图片验证 Checklist

确认以下事项：

- 封面图 URL 以 `https://pub-...r2.dev/` 开头
- 浏览器直接访问图片链接可以正常打开
- 博客列表页图片能正常加载
- 详情页正文内图片能正常加载

如果图片无法显示，优先排查：

- `R2_PUBLIC_URL` 是否可访问
- Bucket 是否已开启公开访问
- 上传是否成功写入 R2

---

## 10. 页面验收 Checklist

打开前台站点后，逐项检查：

- 首页或博客列表页出现掘金抓取文章
- 列表卡片有封面图
- 标题、摘要、发布时间正常
- 进入详情页后正文可渲染
- 正文中的图片已替换为 R2 地址

---

## 11. 常见问题 Checklist

### 1. 前端页面看不到新文章

- 检查 `VITE_API_BASE_URL` 是否正确
- 检查前端是否重新部署
- 检查线上后端是否真的执行过抓取

### 2. 抓取成功但图片为空

- 检查 `R2_PUBLIC_URL`
- 检查图片源地址是否可下载
- 检查 R2 上传日志

### 3. 接口返回 401

- 检查请求头 `x-admin-token`
- 检查 Railway 中的 `ADMIN_TOKEN`

### 4. 接口返回 500

- 检查数据库结构是否同步
- 检查 Prisma schema 与数据库字段是否一致
- 检查 R2 凭证是否配置正确

---

## 12. 最终验收标准

只有同时满足以下条件，才算本次上线完成：

- 掘金文章已成功抓取
- 文章已写入线上数据库
- 状态为 `published`
- 封面图和正文图片已上传到 R2
- 前端请求到真实线上后端
- 博客页面可以正常展示文章和图片
