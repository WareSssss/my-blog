# 从 0 到 1 的开发任务拆解（React + Nest + RAG）

## 0. 交付物定义

- Public Web：对外可访问的个人站（首页/博客/开发工具/AI聊天）
- Admin：用于内容、工具与站点信息配置（可先做简易管理页）
- API：NestJS 服务（含鉴权、内容、工具、AI/RAG）
- 知识库：从博客文章构建 RAG 检索索引

## 1. 需求与设计冻结

1. 输出页面清单与路由
   - `/` 首页
   - `/blog` 博客列表
   - `/blog/:slug` 博客详情
   - `/tools` 工具集合
   - `/ai` AI 聊天
2. 输出数据字段与接口契约
   - 站点 profile/tech-stack/contacts
   - posts/categories/tags/tools
   - chat sessions/messages/models
3. 冻结 MVP 范围
   - 不做用户注册评论
   - 点赞/浏览先做简单计数（可后续防刷增强）

验收：

- 原型与接口字段对齐，所有页面数据来源可说明。

## 2. 工程初始化（推荐 Monorepo）

1. 初始化仓库结构
   - `apps/web`：React（Vite）
   - `apps/api`：NestJS
   - `packages/shared`：共享类型（DTO/接口类型，可选）

### 2.1 推荐目录结构（可直接照抄）

```text
Blog/
  apps/
    web/
      public/
      src/
        assets/
        components/
        layouts/
        pages/
          Home/
          Blog/
          Tools/
          AI/
        routes/
        services/
          api/
        styles/
        utils/
        main.tsx
      index.html
      vite.config.ts
      package.json
      tsconfig.json
    api/
      src/
        app.module.ts
        main.ts
        common/
          filters/
          guards/
          interceptors/
          pipes/
        modules/
          auth/
          site/
          posts/
          categories/
          tags/
          tools/
          chat/
          kb/
          audit/
        prisma/
          schema.prisma
        config/
      test/
      package.json
      tsconfig.json
  packages/
    shared/
      src/
        dto/
        types/
        constants/
      package.json
      tsconfig.json
  docs/
  posts/
    2026-04-18-hello-world.md
  package.json
  pnpm-workspace.yaml
  tsconfig.base.json
  .editorconfig
  .gitignore
```

说明：

- `apps/web`：对外站点（首页/博客/工具/AI）
- `apps/api`：NestJS API（鉴权、内容索引、工具管理、AI/RAG 编排）
- `packages/shared`：放 DTO/类型，保证前后端字段一致（可选但强烈建议）
- `posts/`：Markdown 文章主数据源（MVP）

### 2.2 依赖清单（按模块拆分）

以下是“能跑起来 + 覆盖原型功能”的最小依赖集合，后续按需要再加。

#### 2.2.1 Root（Monorepo 管理）

包管理器（推荐其一）：

- `pnpm` + `pnpm-workspace.yaml`（推荐）

可选工具：

- `turbo`（任务编排：build/lint/test 并行执行）

建议 devDependencies：

- `typescript`
- `eslint`、`@eslint/js`、`typescript-eslint`
- `prettier`
- `lint-staged`、`husky`

#### 2.2.2 Web（React + Vite）

dependencies（必需）：

- `react`、`react-dom`
- `react-router-dom`
- `clsx`（可选：className 拼接，体验好）

UI/样式（推荐）：

- `tailwindcss`、`postcss`、`autoprefixer`
- 组件库二选一：`antd` 或 `@radix-ui/react-*`（若走 headless 组合）
- 图标（可选）：`lucide-react`

请求与状态（按复杂度选择）：

- 最小：直接用 `fetch`
- 常用：`axios`
- 可选：`@tanstack/react-query`（接口多时更省心）

Markdown 渲染（博客必需，二选一方案）

- 方案 A（推荐，生态强）：`gray-matter` + `remark`/`rehype` 体系
  - `gray-matter`
  - `remark-parse`、`remark-gfm`
  - `rehype-stringify`、`rehype-slug`
  - 高亮二选一：`shiki`（推荐）或 `rehype-highlight`
- 方案 B（更直观）：`markdown-it` + 插件（更少“编译链路”概念）

开发依赖：

- `vite`
- `@vitejs/plugin-react`
- `typescript`
- `eslint`（可与 root 共享配置）

预渲染（博客详情静态化）

- 推荐方式：构建期脚本生成静态路由（基于文章 slug 输出 html），实现不强依赖特定库
- 如你希望“工具化更强”：可引入 `vike`（偏 SSR/SSG 能力，学习成本低于 Next，但仍需理解渲染模式）

#### 2.2.3 API（NestJS）

核心 dependencies：

- `@nestjs/common`、`@nestjs/core`、`@nestjs/platform-express`
- `@nestjs/config`

鉴权与安全：

- `@nestjs/jwt`
- `passport`、`passport-jwt`
- `bcryptjs`
- `@nestjs/throttler`（限流）

参数校验：

- `class-validator`、`class-transformer`

数据库（推荐 Prisma）

- `@prisma/client`
- `pg`

devDependencies（API 工程）：

- `@nestjs/cli`
- `prisma`
- `typescript`

可选（强烈建议用于调试/文档）：

- `@nestjs/swagger`、`swagger-ui-express`

#### 2.2.4 RAG（向量库 + 云模型）

向量库（选一个）

- Qdrant：`@qdrant/js-client-rest`
- Chroma：对应 Node 客户端（若选 Chroma 再定）

云模型（选一个或封装适配层）

- OpenAI：`openai`
- 其他云模型：使用其官方 SDK 或统一用 `axios` 调用 HTTP API

2. 工程化
   - TypeScript 统一配置
   - ESLint/Prettier
   - Git hooks（lint-staged/husky）
3. 环境变量规范
   - `apps/api/.env.example`（不放密钥）
   - 本地开发 `.env.development`、线上 `.env.production`

验收：

- Web/API 均可本地启动，lint 通过。

## 3. 数据库与基础设施

1. PostgreSQL 初始化与迁移工具接入
   - 建表：站点配置、文章、分类、标签、工具、管理员、聊天、知识库元数据
2. Seed 数据
   - 默认分类：技术文章/学习笔记/项目分享
   - 默认工具分类（可为空）
   - 默认 site_settings（profile/contacts/tech-stack）
3. 向量库准备（MVP）(暂时不做)
   - 选择 Chroma 或 Qdrant
   - 本地启动方式（Docker）与连接配置

验收：

- 迁移可重复执行；本地一键起库；API 能连库。

## 4. NestJS：鉴权与管理端骨架

1. Auth 模块
   - 登录：账号密码（bcrypt）
   - Token：JWT access + refresh（refresh 入库存 hash）
   - 退出：refresh revoke
2. 管理端安全
   - 登录限流（按 IP/用户名）
   - 基础审计日志（写 audit_logs）
3. Admin API 骨架
   - 站点配置 CRUD
   - 分类/标签 CRUD
   - 工具 CRUD
   - 文章索引 CRUD（元信息、状态、标签关联）

验收：

- 管理端接口可用且需要鉴权；刷新 token 可用；审计有记录。

## 5. 内容系统（Markdown 驱动 + 预渲染）

1. 文章文件规范
   - `posts/*.md`
   - frontmatter：`title/slug/date/category/tags/excerpt/cover`
2. API：文章读取与索引
   - 扫描 posts 目录 -> 解析 frontmatter -> upsert 到 `posts/tags/categories`
   - 文章内容：提供 `contentHtml` + `toc`（或前端自行渲染）
3. 预渲染策略（构建期生成静态详情页）
   - Web 构建时拉取文章列表 -> 为每个 slug 生成静态 HTML
   - 输出 sitemap/robots

验收：

- 新增一篇 Markdown 后可自动出现在列表与详情；详情页 HTML 可被搜索引擎抓取（视构建产物而定）。

## 6. React Web：页面开发（对照原型）

1. 全局布局
   - 顶部导航：首页/博客/开发工具/AI聊天
   - 右上角：主题切换、GitHub 外链、通知入口（可先占位）
2. 首页
   - profile、tech-stack、contacts 展示
   - “开始对话”跳转 `/ai`
3. 博客
   - 列表：分页/筛选/搜索（MVP 至少分页）
   - 卡片：日期、阅读时长、浏览量、点赞数、标签
   - 详情：目录 TOC、代码高亮、返回顶部
4. 开发工具
   - 工具卡片网格
   - coming_soon 状态置灰/提示
5. AI 聊天
   - 空状态 + 快捷提问 chips
   - 模型选择下拉
   - 发送消息 + 消息气泡展示
   - 引用来源区块展示（RAG 命中时）

验收：

- 4 个导航页均可访问；样式与原型一致度高；移动端不破版。

## 7. RAG：知识库构建与问答编排（云模型）

1. 知识库构建（从博客文章）
   - 选择切片策略（按段落/标题层级/固定长度）
   - embedding：调用云 embedding 或开源 embedding 服务
   - 向量入库：写入向量库并记录 `kb_documents/kb_chunks`
2. 检索与生成
   - TopK 召回 + 去重 + 拼接上下文
   - 提示词模板（回答风格：简洁、引用来源、无命中兜底）
3. 稳定性
   - 超时、重试、降级文案
   - 基础限流（按 clientId/IP）
4. 输出格式
   - answer + citations（title/url/snippet/score）

验收：

- 能回答“介绍你自己/技能栈/推荐博客”等原型快捷问题；命中时可展示引用。

## 8. 观测与质量

1. 日志与追踪
   - 关键链路：login、posts 查询、chat 请求耗时、模型错误
2. 基础测试
   - API：鉴权/文章列表/聊天接口的最小单测或 e2e（按你选的测试栈）
3. 安全基线
   - 不在前端暴露模型密钥
   - CORS 配置
   - 输入校验（DTO validation）

验收：

- 关键错误可定位；接口参数校验生效；敏感信息不泄露。

## 9. 部署上线

1. 前端
   - 静态托管（Vercel/Netlify）
   - 构建时预渲染 + sitemap 生成
2. 后端
   - Docker 部署（Railway/Render/云主机）
   - 配置环境变量（数据库、JWT、模型密钥、向量库连接）
3. 发布流程
   - 合并主分支触发构建与部署
   - 健康检查与回滚策略（至少保留上一版本）

验收：

- 公网可访问；博客可被抓取；AI 可用且延迟可接受；后台可登录管理。

## 10. MVP 里程碑（建议顺序）

### 10.1 里程碑 1：工程初始化 + 数据库迁移 + Admin 鉴权

#### 任务

- Monorepo 工程可跑通
  - Web（React + Vite）可启动、可构建
  - API（NestJS）可启动、可构建
  - 根目录脚本：`dev:web`、`dev:api`、`lint`、`typecheck`、`build`
- 数据库与迁移
  - 确定 ORM（推荐 Prisma）与 PostgreSQL 连接
  - 初始化迁移与建表（对齐 `docs/数据库表结构草案.md`）
  - 初始化种子数据（分类、基础站点配置）
- Admin 鉴权
  - 管理员表与默认管理员创建（仅本地/自用）
  - 登录：账号密码（bcrypt）
  - Token：JWT access + refresh（refresh 存 hash）
  - 退出与 refresh 撤销
  - 登录限流（按 IP/用户名）
  - 审计日志写入（至少记录登录与关键写操作）

#### 功能点（对外可见）

- 暂无（此阶段主要打底）

#### 验收

- `pnpm install && pnpm lint && pnpm typecheck && pnpm build` 全绿
- Admin 登录/刷新/退出接口可用且需要鉴权
- 数据库迁移可重复执行，表结构完整

### 10.2 里程碑 2：站点配置 + 首页/导航

#### 任务

- API：站点配置模块
  - Public：读取 profile/tech-stack/contacts/navbar
  - Admin：编辑上述配置（JSON 存 `site_settings`）
- Web：全局布局与导航（对齐原型）
  - 顶部导航：首页/博客/开发工具/AI聊天，高亮当前页
  - 右上角：通知角标（可假数据）、主题切换、GitHub 外链
- Web：首页 1:1 还原（对齐 `docs/原型图/image1.png`）
  - 头像/昵称/身份
  - CTA：开始对话（跳转 AI 页）
  - 介绍文案
  - 技术栈标签展示
  - 联系方式（微信/邮箱）

#### 功能点（对外可见）

- 首页可访问且内容完整
- 导航可切换到四个页面（即使内容未完成也不报错）

#### 验收

- 首页视觉结构与原型基本一致（布局、按钮、标签、卡片）
- 站点配置可从 API 拉取并渲染（不再仅依赖前端假数据）

### 10.3 里程碑 3：Markdown 内容链路（扫描->索引->列表/详情）+ 预渲染

#### 任务

- Markdown 规范与样例文章
  - `posts/*.md` + frontmatter（title/slug/date/category/tags/excerpt/cover）
  - 至少 3 篇示例文章（覆盖三大分类）
- API：内容索引
  - 扫描 `posts/` -> 解析 frontmatter -> upsert posts/tags/categories
  - Public：文章列表（分页/分类/标签/搜索）
  - Public：文章详情（正文、TOC、元信息）
  - Public：views/likes 计数接口（MVP 简单计数）
- Web：博客列表页 1:1 还原（对齐 `docs/原型图/image2.png`）
  - 卡片元信息：日期、阅读时长、浏览、点赞
  - 标题、摘要、标签 chips
- Web：博客详情页
  - Markdown 渲染、代码高亮
  - TOC、返回顶部
- 预渲染（构建期静态化）
  - 构建时拉取文章 slug 列表，生成静态详情页产物
  - 生成 `sitemap.xml`、`robots.txt`

#### 功能点（对外可见）

- 博客列表可浏览、可分页、可按分类/标签/关键词筛选
- 博客详情可阅读（含代码块样式）
- 详情页具备 SEO 基础（title/description/og + sitemap）

#### 验收

- 新增一篇 Markdown 后：能出现在列表、可打开详情
- 构建产物包含静态详情页与 sitemap

### 10.4 里程碑 4：工具页（在线/即将上线）

#### 任务

- API：工具模块
  - Public：工具列表与分类
  - Admin：工具 CRUD（名称、描述、图标、状态、排序、跳转路由/外链）
- Web：工具页 1:1 还原（对齐 `docs/原型图/image3.png`）
  - 工具卡片网格布局
  - 即将上线角标与置灰效果
  - 在线工具可点击跳转（可先跳转到占位页）

#### 功能点（对外可见）

- 工具集合页可浏览，卡片信息完整
- “即将上线”状态清晰可辨

#### 验收

- 工具数据从 API 拉取并渲染
- Admin 可新增/编辑工具并实时影响前台展示

### 10.5 里程碑 5：AI 聊天（非流式）-> 流式（可选）

#### 任务

- API：聊天会话与消息
  - Public：创建会话（clientId + model）
  - Public：发送消息（先非流式）
  - Public：获取历史消息（刷新恢复）
  - Public：模型列表（给前端下拉）
  - 限流：按 clientId/IP 限制频率
- Web：AI 聊天页 1:1 还原（对齐 `docs/原型图/image4.png`）
  - 空态（头像、引导文案）
  - 快捷提问 chips
  - 模型选择下拉
  - 输入框 + 发送按钮
  - 消息列表展示（至少 user/assistant）
- 可选：流式输出（SSE）
  - `/messages/stream` 增量返回内容

#### 功能点（对外可见）

- 用户可选择模型并进行基础问答
- 支持快捷提问一键填充

#### 验收

- 非流式对话链路全通（前端->API->云模型->前端展示）
- 失败/超时有可读提示

### 10.6 里程碑 6：RAG 索引构建与引用来源展示

#### 任务

- 知识库构建（从博客文章）
  - 切片策略确定（按标题层级/段落/长度）
  - Embedding 调用（云 embedding 或开源 embedding 服务）
  - 向量入库（Chroma/Qdrant），记录 `kb_documents/kb_chunks`
- 检索与生成
  - TopK 召回、拼接上下文、提示词模板
  - 无命中兜底：明确提示知识库不足
- 引用来源
  - API 返回 citations（title/url/snippet/score）
  - Web 在 AI 回复下方展示引用来源
- Admin 运维
  - 单篇文章 reindex
  - 全量 rebuild（谨慎）
  - 状态查看（规模/最近构建时间）

#### 功能点（对外可见）

- AI 的回答可引用博客文章来源
- 推荐博客/技能栈等问题能命中你自己的内容

#### 验收

- 命中场景：至少返回 1 条引用来源且链接可打开
- 未命中场景：不胡编，返回明确兜底文案

### 10.7 里程碑 7：部署上线与稳定性补齐

#### 任务

- 部署
  - Web：静态托管（Vercel/Netlify），构建时预渲染与 sitemap 生成
  - API：Docker 部署（Render/Railway/云主机）
  - 环境变量：DB/JWT/模型密钥/向量库连接
- 稳定性与观测
  - 关键接口超时、重试、降级
  - 日志：chat 请求耗时、云模型错误、向量检索耗时
  - CORS 与安全头（最小基线）
- 回归检查
  - 首页/博客/工具/AI 四个入口完整可用

#### 功能点（对外可见）

- 公网可访问，博客可被抓取收录
- AI 可用且体验稳定

#### 验收

- 线上环境 `lint/typecheck/build` 通过
- 关键页面首屏正常加载，无控制台报错
- AI 调用失败时不暴露敏感信息（密钥、内部地址）
