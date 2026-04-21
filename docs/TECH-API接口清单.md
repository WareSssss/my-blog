# API 接口清单（React Web + NestJS）

## 1. 约定

- Base URL：`/api`
- 鉴权：
  - Public 接口：无需鉴权
  - Admin 接口：`Authorization: Bearer <access_token>`
- 分页：`page`（从 1 开始）、`pageSize`
- 返回结构（建议统一）：
  - `{"success": true, "data": ..., "error": null}`
  - `{"success": false, "data": null, "error": {"code": "...", "message": "..."}}`

## 2. Public（对外站点）

### 2.1 站点信息

#### GET `/api/public/site/profile`

说明：首页个人资料（头像/标题/简介等）

#### GET `/api/public/site/tech-stack`

说明：技术栈标签

#### GET `/api/public/site/contacts`

说明：联系方式（微信/邮箱/GitHub 等）

#### GET `/api/public/site/navbar`

说明：导航配置（如需可配）

### 2.2 博客

#### GET `/api/public/posts`

说明：文章列表（支持分类/标签/搜索）

Query：

- `category`：分类 slug（可选）
- `tag`：标签 slug（可选）
- `q`：关键词（可选，匹配 title/excerpt）
- `page`、`pageSize`

返回（示例字段）：

- items：`[{id, slug, title, excerpt, coverUrl, category:{name,slug}, tags:[{name,slug}], publishedAt, readTime, views, likes}]`
- pageInfo：`{page, pageSize, total}`

#### GET `/api/public/posts/:slug`

说明：文章详情

返回：

- `{id, slug, title, contentHtml, toc, category, tags, publishedAt, views, likes}`

#### POST `/api/public/posts/:slug/view`

说明：记录浏览（MVP 可简单 +1；后续可加防刷）

返回：

- `{views}`

#### POST `/api/public/posts/:slug/like`

说明：点赞（MVP 可简单 +1；后续可加防刷/频控）

返回：

- `{likes}`

#### GET `/api/public/categories`

说明：分类列表

#### GET `/api/public/tags`

说明：标签列表

### 2.3 开发工具

#### GET `/api/public/tools`

说明：工具列表（含状态）

Query：

- `category`：工具分类 slug（可选）
- `status`：`online`/`coming_soon`（可选）

返回：

- `[{id, name, description, icon, status, routePath, externalUrl, category:{name,slug}, tags, sort}]`

#### GET `/api/public/tool-categories`

说明：工具分类列表

### 2.4 AI 聊天（RAG）

#### POST `/api/public/chat/sessions`

说明：创建会话（匿名访客）

Body：

- `clientId`：前端生成的匿名 ID（localStorage）
- `model`：模型标识（如 `glm-4-flash`）

返回：

- `{sessionId}`

#### GET `/api/public/chat/sessions/:sessionId/messages`

说明：拉取会话消息（用于刷新恢复）

#### POST `/api/public/chat/sessions/:sessionId/messages`

说明：发送消息并获得回答（非流式）

Body：

- `content`：用户问题

返回：

- `{messageId, answer, citations:[{title,url,snippet,score}], tokenUsage?}`

#### POST `/api/public/chat/sessions/:sessionId/messages/stream`

说明：发送消息并以流式返回（SSE 或 chunked）

Body：

- `content`

响应（建议 SSE 事件）：

- `event: delta`：增量文本
- `event: citations`：引用来源
- `event: done`：结束
- `event: error`：错误

#### GET `/api/public/chat/models`

说明：前端模型下拉选项

返回：

- `[{id, label, provider}]`

## 3. Admin（管理端）

### 3.1 鉴权

#### POST `/api/admin/auth/login`

Body：`{username, password}`

返回：

- `{accessToken, refreshToken, expiresIn}`

#### POST `/api/admin/auth/refresh`

Body：`{refreshToken}`

返回：

- `{accessToken, refreshToken, expiresIn}`

#### POST `/api/admin/auth/logout`

Body：`{refreshToken}`

返回：

- `{ok:true}`

### 3.2 站点配置

#### GET `/api/admin/site-settings`

说明：拉取全部配置（或分页）

#### PUT `/api/admin/site-settings/:key`

说明：更新某项配置（如 profile/contacts/tech_stack）

Body：`{value: <json>}`

### 3.3 文章管理

#### GET `/api/admin/posts`

Query：`status/category/q/page/pageSize`

#### POST `/api/admin/posts`

说明：创建文章索引记录（MVP 可写入 slug/title/excerpt/source_path 等）

#### PUT `/api/admin/posts/:id`

说明：更新文章元信息/状态/分类标签

#### POST `/api/admin/posts/:id/publish`

说明：发布（设置 status=published、publishedAt）

#### POST `/api/admin/posts/:id/unpublish`

说明：取消发布

#### DELETE `/api/admin/posts/:id`

说明：删除（MVP 可物理删除；建议改软删）

#### POST `/api/admin/posts/:id/reindex`

说明：触发该文章的 RAG 分片重建（可选）

#### POST `/api/admin/posts/:id/prerender`

说明：触发该文章的预渲染构建（可选；也可由 CI 构建时自动完成）

### 3.4 分类与标签管理

#### GET `/api/admin/categories`

#### POST `/api/admin/categories`

#### PUT `/api/admin/categories/:id`

#### DELETE `/api/admin/categories/:id`

#### GET `/api/admin/tags`

#### POST `/api/admin/tags`

#### PUT `/api/admin/tags/:id`

#### DELETE `/api/admin/tags/:id`

### 3.5 工具管理

#### GET `/api/admin/tools`

Query：`category/status/q/page/pageSize`

#### POST `/api/admin/tools`

#### PUT `/api/admin/tools/:id`

#### DELETE `/api/admin/tools/:id`

#### GET `/api/admin/tool-categories`

#### POST `/api/admin/tool-categories`

#### PUT `/api/admin/tool-categories/:id`

#### DELETE `/api/admin/tool-categories/:id`

### 3.6 知识库与 RAG 运维

#### POST `/api/admin/kb/documents/import`

说明：导入文档（MVP 推荐导入博客文章；文件上传可后置）

Body（示例）：

- `{sourceType: "post", sourceId: "<postId>"}`

#### POST `/api/admin/kb/rebuild`

说明：全量重建索引（谨慎使用）

#### GET `/api/admin/kb/status`

说明：查看知识库规模与最近构建时间

### 3.7 审计日志（可选）

#### GET `/api/admin/audit-logs`

Query：`action/adminId/page/pageSize`

## 4. 非功能与错误码（建议）

- `AUTH_INVALID_CREDENTIALS`：用户名或密码错误
- `AUTH_TOKEN_EXPIRED`：token 过期
- `RATE_LIMITED`：触发限流
- `NOT_FOUND`：资源不存在
- `VALIDATION_ERROR`：参数校验失败
- `AI_UPSTREAM_ERROR`：云模型调用失败
- `RAG_NO_HITS`：知识库无命中（可作为正常返回，而非错误）
