# 数据库表结构草案（PostgreSQL，面向 React + Nest + RAG）

## 1. 设计原则
- 对外站点无普通用户体系，仅管理员登录用于内容与工具维护。
- 文章内容以 Markdown 文件为主数据源；数据库存索引、元信息、统计与管理状态。
- RAG 向量存储使用独立向量库（Chroma/Qdrant/Pinecone），PostgreSQL 保存文档与分片元数据及向量引用。

## 2. 约定
- 主键：`uuid`（默认 `gen_random_uuid()`）
- 时间：`timestamptz`
- 软删除：MVP 不强制；如需可统一加 `deleted_at`
- 通用字段：`created_at`、`updated_at`

## 3. 核心业务表

### 3.1 站点配置
用于首页个人资料、技术栈、联系方式等可配置内容。

#### `site_settings`
| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| id | uuid | PK |  |
| key | text | UNIQUE NOT NULL | 配置键（如 `profile`、`social_links`） |
| value | jsonb | NOT NULL | 配置值 |
| created_at | timestamptz | NOT NULL |  |
| updated_at | timestamptz | NOT NULL |  |

建议 `key` 示例：
- `profile`：name/title/subtitle/avatar/introduction
- `tech_stack`：[{name, url?}]
- `contacts`：[{type, label, value, url?}]（微信可存 qr_url）
- `navbar`：[{label, path, order}]

索引：
- `UNIQUE(key)`

### 3.2 博客分类与标签

#### `categories`
| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| id | uuid | PK |  |
| name | text | UNIQUE NOT NULL | 分类名（技术文章/学习笔记/项目分享） |
| slug | text | UNIQUE NOT NULL | URL 友好标识 |
| sort | int | NOT NULL DEFAULT 0 | 排序 |
| created_at | timestamptz | NOT NULL |  |
| updated_at | timestamptz | NOT NULL |  |

#### `tags`
| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| id | uuid | PK |  |
| name | text | UNIQUE NOT NULL | 标签名 |
| slug | text | UNIQUE NOT NULL | URL 友好标识 |
| created_at | timestamptz | NOT NULL |  |
| updated_at | timestamptz | NOT NULL |  |

### 3.3 文章（索引与管理）

#### `posts`
| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| id | uuid | PK |  |
| slug | text | UNIQUE NOT NULL | 文章 URL 标识 |
| title | text | NOT NULL | 标题 |
| excerpt | text |  | 摘要（列表展示） |
| cover_url | text |  | 封面图（可选） |
| category_id | uuid | FK(categories.id) | 分类 |
| status | text | NOT NULL | `draft` / `published` |
| source_type | text | NOT NULL | `markdown_file`（MVP）/`cms`（后续） |
| source_path | text |  | Markdown 文件路径（如 `posts/xxx.md`） |
| content_hash | text |  | 内容哈希，用于判断是否需要重建索引/预渲染 |
| published_at | timestamptz |  | 发布时间 |
| created_at | timestamptz | NOT NULL |  |
| updated_at | timestamptz | NOT NULL |  |

索引：
- `UNIQUE(slug)`
- `INDEX(category_id, published_at DESC)`
- `INDEX(status, published_at DESC)`

#### `post_tags`
| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| post_id | uuid | PK/FK(posts.id) |  |
| tag_id | uuid | PK/FK(tags.id) |  |
| created_at | timestamptz | NOT NULL |  |

索引：
- `PRIMARY KEY(post_id, tag_id)`
- `INDEX(tag_id)`

#### `post_stats`
| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| post_id | uuid | PK/FK(posts.id) |  |
| views | bigint | NOT NULL DEFAULT 0 | 浏览量 |
| likes | bigint | NOT NULL DEFAULT 0 | 点赞数（无登录时可做简单防刷） |
| updated_at | timestamptz | NOT NULL |  |

可选（防刷/分析）：
- `post_events`：记录 `view/like` 的 ip_hash、ua_hash、referrer、created_at（MVP 可不做）

### 3.4 开发工具集合

#### `tool_categories`
| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| id | uuid | PK |  |
| name | text | UNIQUE NOT NULL | 分类名（格式化/编码转换/…） |
| slug | text | UNIQUE NOT NULL |  |
| sort | int | NOT NULL DEFAULT 0 |  |
| created_at | timestamptz | NOT NULL |  |
| updated_at | timestamptz | NOT NULL |  |

#### `tools`
| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| id | uuid | PK |  |
| name | text | NOT NULL | 工具名称 |
| description | text |  | 简介 |
| icon | text |  | 图标（名称或 URL） |
| category_id | uuid | FK(tool_categories.id) | 分类 |
| status | text | NOT NULL | `online` / `coming_soon` |
| route_path | text |  | 站内路由（如 `/tools/json`） |
| external_url | text |  | 外链（如跳转第三方） |
| tags | jsonb | NOT NULL DEFAULT '[]' | 标签数组（简化） |
| sort | int | NOT NULL DEFAULT 0 | 排序 |
| created_at | timestamptz | NOT NULL |  |
| updated_at | timestamptz | NOT NULL |  |

索引：
- `INDEX(category_id, sort)`
- `INDEX(status)`

## 4. 管理端与安全

### 4.1 管理员与刷新令牌

#### `admins`
| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| id | uuid | PK |  |
| username | text | UNIQUE NOT NULL |  |
| password_hash | text | NOT NULL | bcrypt |
| role | text | NOT NULL DEFAULT 'admin' | 预留 |
| last_login_at | timestamptz |  |  |
| created_at | timestamptz | NOT NULL |  |
| updated_at | timestamptz | NOT NULL |  |

#### `admin_refresh_tokens`
| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| id | uuid | PK |  |
| admin_id | uuid | FK(admins.id) NOT NULL |  |
| token_hash | text | UNIQUE NOT NULL | refresh token 哈希 |
| expires_at | timestamptz | NOT NULL |  |
| revoked_at | timestamptz |  |  |
| created_at | timestamptz | NOT NULL |  |

索引：
- `INDEX(admin_id)`
- `UNIQUE(token_hash)`

### 4.2 审计日志（建议）

#### `audit_logs`
| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| id | uuid | PK |  |
| admin_id | uuid | FK(admins.id) |  |
| action | text | NOT NULL | 如 `post.create`、`tool.update` |
| target_type | text |  | 如 `post` |
| target_id | uuid |  |  |
| ip | text |  |  |
| user_agent | text |  |  |
| meta | jsonb | NOT NULL DEFAULT '{}' |  |
| created_at | timestamptz | NOT NULL |  |

索引：
- `INDEX(admin_id, created_at DESC)`
- `INDEX(action, created_at DESC)`

## 5. AI Chat 与 RAG

### 5.1 聊天会话与消息

#### `chat_sessions`
| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| id | uuid | PK |  |
| client_id | text |  | 匿名访客标识（localStorage 生成） |
| model | text | NOT NULL | 前端选择的模型（如 `glm-4-flash`） |
| title | text |  | 会话标题（可由首问生成） |
| created_at | timestamptz | NOT NULL |  |
| updated_at | timestamptz | NOT NULL |  |

索引：
- `INDEX(client_id, updated_at DESC)`

#### `chat_messages`
| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| id | uuid | PK |  |
| session_id | uuid | FK(chat_sessions.id) NOT NULL |  |
| role | text | NOT NULL | `user` / `assistant` / `system` |
| content | text | NOT NULL | 消息内容 |
| citations | jsonb | NOT NULL DEFAULT '[]' | 引用来源数组（标题/链接/片段） |
| token_usage | jsonb | NOT NULL DEFAULT '{}' | 可选：输入/输出 token |
| created_at | timestamptz | NOT NULL |  |

索引：
- `INDEX(session_id, created_at)`

### 5.2 知识库文档与分片

#### `kb_documents`
| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| id | uuid | PK |  |
| source_type | text | NOT NULL | `post` / `markdown` / `pdf` |
| source_id | uuid |  | 若来自文章则为 post_id |
| title | text | NOT NULL | 文档标题 |
| url | text |  | 来源链接（如博客文章链接） |
| status | text | NOT NULL | `active` / `disabled` |
| content_hash | text |  | 用于增量重建索引 |
| created_at | timestamptz | NOT NULL |  |
| updated_at | timestamptz | NOT NULL |  |

索引：
- `INDEX(source_type, source_id)`
- `INDEX(status)`

#### `kb_chunks`
| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| id | uuid | PK |  |
| document_id | uuid | FK(kb_documents.id) NOT NULL |  |
| chunk_index | int | NOT NULL | 分片序号 |
| content | text | NOT NULL | 分片文本 |
| token_count | int | NOT NULL DEFAULT 0 | 估算 token |
| vector_store | text | NOT NULL | `chroma`/`qdrant`/`pinecone` |
| vector_id | text | NOT NULL | 向量库中的主键 |
| meta | jsonb | NOT NULL DEFAULT '{}' | 章节、标题层级、定位信息等 |
| created_at | timestamptz | NOT NULL |  |

索引：
- `INDEX(document_id, chunk_index)`
- `INDEX(vector_store, vector_id)`

## 6. 建表顺序（建议）
1) `site_settings`  
2) `categories`、`tags`、`posts`、`post_tags`、`post_stats`  
3) `tool_categories`、`tools`  
4) `admins`、`admin_refresh_tokens`、`audit_logs`  
5) `chat_sessions`、`chat_messages`  
6) `kb_documents`、`kb_chunks`
