# 部署补充说明：域名与证书 / CI-CD / 向量库上线（Qdrant/Chroma）

本文是 [部署架构-ARCH.md](file:///Users/wares/Desktop/Blog/docs/部署架构-ARCH.md) 的补充说明，专门讲当时未展开的三块内容：

- 域名购买与证书（HTTPS）
- CI/CD 高阶流水线（平台自动部署之外怎么做）
- 向量库（RAG 的 Qdrant/Chroma）上线方案

目标：让你作为小白也能理解“为什么要这么做”和“落地时要注意什么”。

---

## 1) 域名购买与证书细节（HTTPS）

### 1.1 为什么要域名和 HTTPS？

- 访问更专业：`https://www.xxx.com` 比 `xxx.vercel.app` 更像正式站点
- SEO 与分享：搜索引擎与分享卡片（OG）对稳定域名更友好
- 安全：浏览器对非 HTTPS 的定位、Cookie、登录等能力限制越来越多

### 1.2 推荐的域名结构（最佳实践）

建议拆成两个子域：

- Web（前端）：`https://www.xxx.com`（Vercel）
- API（后端）：`https://api.xxx.com`（Render/Railway/云主机）

好处：

- 前后端边界清晰
- CORS 配置简单
- 日后拆服务也更方便（例如：`kb.xxx.com`、`admin.xxx.com`）

### 1.3 域名在哪里买？（原则）

你可以在任意域名注册商购买：

- 国内：阿里云、腾讯云等
- 国外：Cloudflare、Namecheap、Google Domains（地区差异）

选注册商的原则：

- 能方便管理 DNS 解析（A/CNAME/TXT）
- 能支持 DNS 记录修改（你后面接 Vercel 与后端都会用到）

### 1.4 DNS 需要理解的 3 个记录类型

- A：把域名指向一个 IP（通常用于云主机）
- CNAME：把域名指向另一个域名（常用于 Vercel、Render、Railway）
- TXT：验证域名所有权（接入 Vercel/SSL、某些平台验证会用）

常见配置举例（逻辑示意，不是固定值）：

- `www.xxx.com` -> CNAME 到 Vercel 提供的域名
- `api.xxx.com` -> CNAME 到 Render/Railway 的服务域名（或 A 记录到云主机 IP）

### 1.5 HTTPS 证书怎么处理？

分两种情况：

**情况 A：托管平台（Vercel / Render / Railway）**

- 大多数平台会自动发放并续期证书（你只要把域名绑上去）
- 你需要做的通常是：添加域名 + 按提示配置 DNS（CNAME/TXT）

**情况 B：云主机自建（Nginx）**

- 常用方案：Let's Encrypt 免费证书（Certbot 自动申请与续期）
- 你要做的事情：确保 80/443 端口可访问 + DNS 已指向你的主机

### 1.6 证书与跨域（CORS）有什么关系？

HTTPS 与 CORS 是两件事，但经常一起出现：

- HTTPS：保证连接安全
- CORS：浏览器限制“不同域名调用接口”

当 Web 在 `www.xxx.com`，API 在 `api.xxx.com` 时：

- API 必须允许来自 `https://www.xxx.com` 的请求（CORS）

---

## 2) CI/CD 高阶流水线（平台默认自动部署之外）

### 2.1 什么是 CI/CD？

- CI（持续集成）：每次提交代码自动跑检查（lint/typecheck/test/build）
- CD（持续部署）：检查通过后自动部署到线上

### 2.2 为什么一开始可以不用自己搭？

因为：

- Vercel / Render / Railway 都有“绑定仓库后自动部署”
- 对 MVP 来说，平台默认自动部署足够快

### 2.3 什么时候需要“高阶流水线”？

出现这些需求时就需要：

- 多环境：dev / staging / prod
- 严格门禁：必须 typecheck + lint + test 全通过才能部署
- 需要生成产物并推送到镜像仓库（Docker Hub/GHCR）
- 需要数据库迁移自动化（部署前后钩子）

### 2.4 推荐的最小 CI 规则（适合本项目）

每次 PR/合并 main：

- `pnpm install`
- `pnpm lint`
- `pnpm typecheck`
- （可选）`pnpm test`
- （可选）构建 `pnpm build`

你现在项目已经有：

- `pnpm lint`
- `pnpm typecheck`

### 2.5 Docker 镜像发布的常见流程（概念）

以 GitHub Actions 为例（只讲思路）：

1) 代码 push 到 main
2) CI 跑通过
3) 构建 Docker 镜像（API）
4) 推送到镜像仓库（GHCR/Docker Hub）
5) 部署平台拉取最新镜像并重启服务
6) 启动前执行 `prisma migrate deploy`

### 2.6 数据库迁移放在哪里执行？

建议：

- 由后端容器在启动时（或部署钩子）执行 `prisma migrate deploy`
- seed 不建议每次都跑，容易覆盖线上数据

---

## 3) 向量库上线方案（Qdrant / Chroma）

### 3.1 向量库是什么？为什么需要？

当你做里程碑 6（RAG）时：

- 你要把文章切片 -> embedding -> 存到向量库
- 查询时按相似度检索 TopK，再把命中片段给模型回答

向量库的作用：

- 专门做相似度检索（比普通 SQL LIKE 强太多）
- 支持向量维度索引、过滤、TopK

### 3.2 Qdrant vs Chroma（怎么选？）

简单对比（偏工程角度）：

- Qdrant：更像生产级向量数据库，Docker 部署成熟，生态成熟
- Chroma：上手简单，适合快速验证与本地开发

推荐选择：

- 你要尽快线上可用：优先 Qdrant
- 你只想快速本地试验：Chroma 也可以

### 3.3 部署模式 1：同一平台多服务（推荐）

以 Railway/Render 为例（逻辑）：

```text
Vercel(Web) -> API(Docker) -> Postgres
                    |
                    └-> Vector DB (Qdrant/Chroma)
```

好处：

- 内网通信更快、更安全
- 配置统一（一个平台管理）

注意：

- 平台是否支持多服务与持久化磁盘（向量库需要持久化存储）

### 3.4 部署模式 2：云主机自建向量库（可控性高）

在云主机上用 Docker Compose 启动 Qdrant/Chroma：

```text
Nginx -> API container
       -> Qdrant container
       -> Postgres (托管或自建)
```

注意点：

- 向量库必须挂载数据卷（否则重启丢数据）
- 安全：不要直接把向量库端口暴露到公网，尽量走内网

### 3.5 连接配置与密钥

向量库一般不需要像云模型那样的“密钥”，但需要：

- URL（例如 `QDRANT_URL=http://qdrant:6333`）
- 可选的 API Key（如果你配置了）

同样遵循原则：

- 所有敏感配置只放后端环境变量，不进前端

### 3.6 与本项目数据库表的关系

向量库保存的是“向量索引”，而 PostgreSQL 保存“元数据”：

- `kb_documents`：文档信息（来自哪篇 post、标题、url、hash）
- `kb_chunks`：切片信息（content、vector_store、vector_id、meta）

这样做的好处：

- 即使向量库重建，你仍然保留了知识库的结构信息
- 可以做管理端运维：reindex 单篇/全量 rebuild

---

## 4) 最小可落地建议（你可以照做）

### 4.1 先把域名与 HTTPS 做到“能用”

- Web 用 Vercel 绑定 `www.xxx.com`
- API 用 Render/Railway/云主机绑定 `api.xxx.com`
- API CORS 放行 `https://www.xxx.com`

### 4.2 CI/CD 先用平台默认

- Vercel：自动构建并发布
- Render/Railway：自动拉代码/构建镜像/发布

等你稳定后再补：

- GitHub Actions 门禁（lint/typecheck/test）
- Docker 镜像仓库发布

### 4.3 向量库等到里程碑 6 再上

先把 Chat（里程碑 5）跑通，再上 RAG：

- 里程碑 5：对话链路、会话/消息存储、错误与限流
- 里程碑 6：切片/embedding/向量库、citations 展示
