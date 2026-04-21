# 数据库表说明（本项目实际存储的数据）

本项目使用 PostgreSQL，表结构由 Prisma 管理（以 `apps/api/prisma/schema.prisma` 为准）。

这份文档用“新手能看懂”的方式说明：
- 每张表的用途
- 存储哪些数据（举例）
- 表之间的关系（大概怎么关联）

---

## 1. 站点配置（site_settings）
### `site_settings`
用途：存站点可配置内容，让前端不写死数据（首页/AI页等）。

存储内容（value 是 JSON）：
- `profile`：个人信息（name/alias/title/intro）
- `contacts`：联系方式（email/wechat/github）
- `tech-stack`：技术栈数组
- `ai`：AI 页配置（title/subtitle/status/quickPrompts/models）

关系：无（独立配置表）。

典型场景：
- 你通过 Admin 接口更新 `site_settings.profile` 后，刷新首页立刻生效。

---

## 2. 博客分类与标签

### `categories`
用途：博客分类（技术文章/学习笔记/项目分享）。

存储内容：
- `name`：显示名称（例：技术文章）
- `slug`：URL/筛选用的标识（例：tech）
- `sort`：排序

关系：
- 一对多：`categories -> posts`

### `tags`
用途：文章标签（GitHub / RAG / LLM / pm2 等）。

存储内容：
- `name`：显示名称
- `slug`：URL/筛选用标识

关系：
- 多对多：`posts <-> tags`（通过 `post_tags` 关联）

---

## 3. 博客文章与统计

### `posts`
用途：文章列表与管理信息（列表页展示的数据基本来自这里）。

存储内容（常用）：
- `slug`：文章链接标识（例：llm-memory）
- `title`：标题
- `excerpt`：摘要（列表页展示）
- `cover_url`：封面图（可选）
- `category_id`：所属分类
- `status`：草稿/已发布（draft/published）
- `published_at`：发布时间
- `read_time_minutes`：阅读时长（分钟）
- `source_type/source_path`：文章来源（MVP 是 markdown_file + 文件路径）

关系：
- 多对一：`posts -> categories`
- 多对多：`posts <-> tags`（`post_tags`）
- 一对一：`posts -> post_stats`

### `post_tags`
用途：文章与标签的关联表（解决多对多）。

存储内容：
- `post_id` + `tag_id`（复合主键）

关系：
- `post_tags -> posts`
- `post_tags -> tags`

### `post_stats`
用途：文章的统计信息（浏览量/点赞数）。

存储内容：
- `views`：浏览量
- `likes`：点赞数

关系：
- 一对一：`post_stats.post_id` 对应 `posts.id`

典型场景：
- 博客列表页显示 👁️ views、❤️ likes。

---

## 4. 开发工具集合

### `tool_categories`
用途：工具分类（可选，本期允许为空）。

存储内容：
- `name`：分类名（例：格式化）
- `slug`：标识（例：format）
- `sort`：排序

关系：
- 一对多：`tool_categories -> tools`

### `tools`
用途：工具卡片列表（对应前端 /tools 页面）。

存储内容：
- `name`：工具名称（例：JSON 格式化）
- `description`：说明
- `icon`：图标标识（前端做映射）
- `status`：online / coming_soon
- `route_path`：站内路由（可选）
- `external_url`：外链（可选）
- `tags`：工具标签（数组）
- `sort`：排序
- `category_id`：所属分类（可为空）

关系：
- 多对一：`tools -> tool_categories`

---

## 5. 管理员与审计（当前为最小实现）

### `admins`
用途：后台管理员账号（后续完善登录鉴权时使用）。

存储内容：
- `username`
- `password_hash`
- `role`
- `last_login_at`

关系：
- 一对多：`admins -> admin_refresh_tokens`
- 一对多：`admins -> audit_logs`

### `admin_refresh_tokens`
用途：刷新令牌存储（后续 JWT 登录体系用）。

存储内容：
- `token_hash`
- `expires_at`
- `revoked_at`

关系：
- 多对一：`admin_refresh_tokens -> admins`

### `audit_logs`
用途：审计日志（记录管理端操作）。

存储内容：
- `action`：如 post.create/tool.update
- `target_type/target_id`：操作对象
- `ip/user_agent`
- `meta`：附加信息（JSON）

关系：
- 多对一：`audit_logs -> admins`（可为空）

说明：
- 当前项目管理端采用 `x-admin-token` 的最小鉴权方式，正式登录体系可后续替换。

---

## 6. AI 聊天与知识库（RAG 相关）

### `chat_sessions`
用途：一段对话会话（用户进入 AI 页开始聊天会创建）。

存储内容：
- `client_id`：匿名访客标识（前端 localStorage）
- `model`：模型名称（GLM-4-Flash 等）
- `title`：会话标题（可选）

关系：
- 一对多：`chat_sessions -> chat_messages`

### `chat_messages`
用途：会话中的消息记录（用户问/AI答）。

存储内容：
- `role`：user/assistant/system
- `content`：消息内容
- `citations`：引用来源（JSON，可选）
- `token_usage`：token 消耗（JSON，可选）

关系：
- 多对一：`chat_messages -> chat_sessions`

### `kb_documents`
用途：知识库“文档”元信息（通常来自博客文章/Markdown/PDF）。

存储内容：
- `source_type`：post/markdown/pdf
- `source_id`：来源 id（如果来自 post，可存 post_id）
- `title`：文档标题
- `url`：来源链接（例如博客文章链接）
- `status`：active/disabled
- `content_hash`：内容 hash（用于增量更新）

关系：
- 一对多：`kb_documents -> kb_chunks`

### `kb_chunks`
用途：知识库分片（RAG 检索的最小单元）。

存储内容：
- `chunk_index`：分片序号
- `content`：分片文本
- `token_count`：token 数（估算）
- `vector_store/vector_id`：向量库位置（如 qdrant/chroma 的 id）
- `meta`：定位信息（JSON）

关系：
- 多对一：`kb_chunks -> kb_documents`

---

## 7. 你从哪里看“真实表结构”？
两种方式：
- Prisma schema（最准确）：[schema.prisma](file:///Users/wares/Desktop/Blog/apps/api/prisma/schema.prisma)
- Prisma Studio（可视化）：`pnpm -C apps/api exec prisma studio --port 5555 --browser none`

---

## 8. 当前项目的数据是怎么来的？
- 结构：Prisma migrations 自动建表
- 初始数据：`apps/api/prisma/seed.cjs` 写入
- 读取方式：Public API（如 `/api/public/site/profile`、`/api/public/posts`、`/api/public/tools`）
