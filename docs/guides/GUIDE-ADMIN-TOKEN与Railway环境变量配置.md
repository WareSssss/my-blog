# ADMIN_TOKEN 与 Railway 环境变量配置指南

## 1. 这份文档解决什么问题

这份指南用于解决以下两个线上部署中的关键问题：

- 如何为后台管理接口配置 `ADMIN_TOKEN`
- 如何为前端正确配置 `VITE_API_BASE_URL`，确保博客页面请求到真实后端 API

如果这两项没有正确配置，会出现以下典型现象：

- 调用 `POST /api/admin/crawler/run` 返回 `401 Unauthorized`
- `https://www.waresblog.xyz/api/public/posts` 返回的不是 JSON，而是前端站点的 `index.html`
- 线上已经有后端服务，但前台仍然看不到掘金抓取的文章和图片

---

## 2. ADMIN_TOKEN 是什么

`ADMIN_TOKEN` 是后台管理接口的访问令牌，用来保护 `/api/admin/*` 路由。

当前项目中，`ADMIN_TOKEN` 的校验逻辑位于 [admin-token.guard.ts](file:///Users/wares/Desktop/Blog/apps/api/src/common/guards/admin-token.guard.ts)。

校验规则如下：

- 服务端从环境变量读取 `ADMIN_TOKEN`
- 请求头必须携带 `x-admin-token`
- 请求头的值必须与环境变量完全一致

示例：

```bash
curl -X POST 'https://your-api-domain/api/admin/crawler/run' \
  -H 'x-admin-token: your-admin-token'
```

如果未配置或配置错误，会出现：

- `ADMIN_TOKEN is not configured`
- `Invalid admin token`

---

## 3. VITE_API_BASE_URL 是什么

`VITE_API_BASE_URL` 是前端的 API 根地址。

当前项目中，前端请求逻辑位于 [http.ts](file:///Users/wares/Desktop/Blog/apps/web/src/services/api/http.ts)，其行为是：

```ts
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
```

这意味着：

- 如果配置了 `VITE_API_BASE_URL`，前端会请求这个后端域名
- 如果没有配置，前端就会默认请求当前站点自身的 `/api/*`

例如：

- 正确：`https://wonderful-spontaneity-production-3251.up.railway.app/api/public/posts`
- 错误：`https://www.waresblog.xyz/api/public/posts` 被静态站点接管，返回 HTML

---

## 4. Railway 完整配置清单

后端 Railway 服务至少应配置以下环境变量：

```bash
DATABASE_URL=postgresql://...
PORT=4000
ADMIN_TOKEN=请替换为高强度随机字符串

R2_ACCESS_KEY_ID=你的CloudflareR2AccessKey
R2_ACCESS_KEY_SECRET=你的CloudflareR2Secret
R2_BUCKET_NAME=wares-blog
R2_ENDPOINT=https://4722b20b2c8c393aa03020db90ed120c.r2.cloudflarestorage.com
R2_PUBLIC_URL=https://pub-0cac9c694bb64a50a001893415460066.r2.dev
```

前端部署平台应配置以下环境变量：

```bash
VITE_API_BASE_URL=https://wonderful-spontaneity-production-3251.up.railway.app
```

---

## 5. ADMIN_TOKEN 推荐值

不要在线上继续使用开发环境中的：

```bash
ADMIN_TOKEN=dev-admin-token
```

建议使用长度不少于 24 位的随机字符串，例如：

```bash
ADMIN_TOKEN=blog_admin_2026_x8Kf92PqLmN7rS4z
```

生成方式示例：

```bash
openssl rand -hex 24
```

---

## 6. Railway 后端配置步骤

### 第一步：进入 Railway 项目

1. 打开 Railway 控制台
2. 进入后端服务项目
3. 点击对应的 Service
4. 打开 `Variables` 页面

### 第二步：添加 ADMIN_TOKEN

新增一项：

```bash
ADMIN_TOKEN=你的随机令牌
```

### 第三步：添加 Cloudflare R2 变量

依次添加：

```bash
R2_ACCESS_KEY_ID=...
R2_ACCESS_KEY_SECRET=...
R2_BUCKET_NAME=wares-blog
R2_ENDPOINT=https://4722b20b2c8c393aa03020db90ed120c.r2.cloudflarestorage.com
R2_PUBLIC_URL=https://pub-0cac9c694bb64a50a001893415460066.r2.dev
```

### 第四步：重新部署后端

变量保存后，Railway 一般会自动触发重新部署；如果没有，请手动点击 Redeploy。

---

## 7. 前端平台配置步骤

无论您使用的是 Vercel、Cloudflare Pages 还是其他静态部署平台，前端至少要配置这一项：

```bash
VITE_API_BASE_URL=https://wonderful-spontaneity-production-3251.up.railway.app
```

配置后重新部署前端。

---

## 8. 线上执行抓取命令

当后端部署完成且 `ADMIN_TOKEN` 已配置后，可通过以下命令手动触发掘金抓取：

```bash
curl -X POST 'https://wonderful-spontaneity-production-3251.up.railway.app/api/admin/crawler/run' \
  -H 'x-admin-token: 你的ADMIN_TOKEN'
```

如果成功，返回体中通常会包含：

- `importedCount`
- `totalFetched`
- `data`

---

## 9. 验证命令清单

### 验证后端公开接口

```bash
curl 'https://wonderful-spontaneity-production-3251.up.railway.app/api/public/posts?page=1&pageSize=5'
```

应返回 JSON，而不是 HTML。

### 验证管理接口

```bash
curl -X POST 'https://wonderful-spontaneity-production-3251.up.railway.app/api/admin/crawler/run' \
  -H 'x-admin-token: 你的ADMIN_TOKEN'
```

### 验证前端是否已接对后端

打开浏览器开发者工具，检查博客页请求：

- 应请求 `https://wonderful-spontaneity-production-3251.up.railway.app/api/public/posts`
- 不应请求 `https://www.waresblog.xyz/api/public/posts`

---

## 10. 常见问题

### 1. 返回 401 Unauthorized

原因：

- `ADMIN_TOKEN` 未配置
- 请求头没有带 `x-admin-token`
- 请求头值与 Railway 中配置的不一致

### 2. 返回 HTML 而不是 JSON

原因：

- 前端没有配置 `VITE_API_BASE_URL`
- 当前域名的 `/api/*` 被静态站点接管

### 3. 抓取成功了但前端还是没有新文章

原因：

- 前端还没重新部署
- 前端仍然请求错误的 API 地址
- 线上触发抓取的是另一套环境或另一套数据库

---

## 11. 最终推荐配置

建议您采用以下组合：

- 后端 Railway：
  - `ADMIN_TOKEN`
  - `R2_ACCESS_KEY_ID`
  - `R2_ACCESS_KEY_SECRET`
  - `R2_BUCKET_NAME`
  - `R2_ENDPOINT`
  - `R2_PUBLIC_URL`
- 前端部署平台：
  - `VITE_API_BASE_URL=https://wonderful-spontaneity-production-3251.up.railway.app`

这样配置后，整条链路才会打通：

1. 前端请求到真实后端
2. 后端能够执行掘金抓取
3. 图片上传到 Cloudflare R2
4. 新文章以 `published` 状态出现在博客页面
