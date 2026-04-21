# 数据库迁移方案（PostgreSQL + Prisma，适配 NestJS）

## 1. 目标
- 用可追踪、可回滚、可在多环境一致执行的方式管理数据库结构变更。
- 支持本地开发、测试、线上部署的统一迁移流程。
- 支持后续新增表/字段（博客、工具、聊天、知识库）时安全演进。

## 2. 迁移工具选择
### 2.1 推荐：Prisma Migrate
适用原因：
- 对 TypeScript/Nest 生态友好，学习成本低。
- 迁移文件（SQL）可版本化，便于 CI/CD 执行。
- 支持 `dev`（开发）与 `deploy`（生产）不同模式，减少误操作。

迁移策略：
- 开发环境：`prisma migrate dev`
- 生产环境：`prisma migrate deploy`

## 3. 前置条件（必须满足）
### 3.1 环境与依赖
- Node.js（建议 >= 18）
- pnpm（你已安装）
- PostgreSQL 可用（本地或云端）
- API 服务具备环境变量配置能力（Nest 已具备）

### 3.2 数据库权限
- 迁移执行账号必须具备：
  - 创建/修改表、索引、约束的权限
  - 创建扩展的权限（如使用 `pgcrypto` 生成 uuid）

建议：
- 本地开发可用超级用户或具备 DDL 权限的账号
- 生产环境使用受限账号，但仍需 DDL 权限（至少在迁移窗口期）

### 3.3 确认“单一事实来源”
- Prisma `schema.prisma` 作为“结构定义来源”，迁移 SQL 由 Prisma 生成并版本化。
- 不允许在生产库中手工改表结构而不通过迁移文件落库（避免漂移）。

## 3A. 本地 PostgreSQL vs 云端 PostgreSQL（区别与选择建议）
### 3A.1 主要区别
- 成本：
  - 本地：基本为 0（占用你的电脑资源）
  - 云端：按量计费或包年包月（存储/IO/备份通常单独计费）
- 延迟与网络稳定性：
  - 本地：延迟最低、最稳定
  - 云端：受网络影响，跨网段/跨地域会有更高延迟
- 运维与可靠性：
  - 本地：你自己负责升级、备份、故障恢复
  - 云端：通常提供自动备份、监控、故障切换（不同厂商能力不同）
- 安全与访问控制：
  - 本地：默认仅本机可访问（更安全但不便团队协作）
  - 云端：可配置白名单/VPC/SSL/只读账号等（需要正确配置）
- 协作与多端访问：
  - 本地：别人无法直接访问（除非你做端口暴露/内网穿透）
  - 云端：团队/多环境（dev/staging/prod）可统一接入
- 与生产一致性：
  - 本地：容易出现“本地 OK、线上不一致”的版本差异（通过 Docker 可缓解）
  - 云端：更接近真实线上环境（但依旧要控制版本/扩展）

### 3A.2 建议如何选
- 你当前阶段（MVP 单人开发）：
  - 日常开发：优先本地 PostgreSQL（最快、最稳）
  - 需要随时在多设备/同伴协作/部署预发：再上云端 PostgreSQL
- 上线（生产环境）：
  - 必须云端或云主机自建（保证可用性、备份与监控）

## 3B. 安装与初始化（macOS 推荐）
本节提供三种本地 PostgreSQL 安装方式，任选一种即可。你只需要保证能拿到一个可用的 `DATABASE_URL`。

### 3B.1 方式 A：Docker（推荐开发用，环境最干净）
前置：安装 Docker Desktop。

启动 PostgreSQL：
```bash
docker run --name blog-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_DB=blog \
  -p 5432:5432 \
  -v blog_pgdata:/var/lib/postgresql/data \
  -d postgres:16
```

验证连接（可选）：
```bash
docker exec -it blog-postgres psql -U postgres -d blog
```

对应 `DATABASE_URL`：
```text
postgresql://postgres:postgres@localhost:5432/blog?schema=public
```

### 3B.2 方式 B：Homebrew 安装（推荐本机常驻）
安装与启动：
```bash
brew install postgresql@16
brew services start postgresql@16
```

创建数据库（示例）：
```bash
createdb blog
```

对应 `DATABASE_URL`（本机默认无密码时）：
```text
postgresql://$(whoami)@localhost:5432/blog?schema=public
```

### 3B.3 方式 C：Postgres.app（最省心的图形化安装）
安装 Postgres.app，启动后默认会在本机起一个 PostgreSQL 服务。

对应 `DATABASE_URL`（通常类似）：
```text
postgresql://localhost:5432/blog?schema=public
```

## 3C. Prisma 安装与使用（在 apps/api）
### 3C.1 安装依赖
在 `apps/api` 安装 Prisma + Postgres 驱动：
```bash
pnpm -C apps/api add @prisma/client
pnpm -C apps/api add -D prisma
pnpm -C apps/api add pg
pnpm -C apps/api add -D dotenv
```

### 3C.2 初始化 Prisma
```bash
pnpm -C apps/api exec prisma init --datasource-provider postgresql
```

这会生成：
- `apps/api/prisma/schema.prisma`
- `apps/api/prisma.config.ts`（Prisma 配置，默认会读取 `DATABASE_URL`）
- `apps/api/.env`（本地用；生产环境建议由平台注入，不提交仓库）

把 `.env` 中的 `DATABASE_URL` 改成你实际的连接串（或在部署平台配置同名环境变量）。

### 3C.3 首次迁移（创建表结构）
1) 按 `docs/数据库表结构草案.md` 写好 `schema.prisma`
2) 生成初始迁移并创建表：
```bash
pnpm -C apps/api exec prisma migrate dev --name init
```

### 3C.4 生产环境迁移（上线）
生产环境不要用 `migrate dev`，使用：
```bash
pnpm -C apps/api exec prisma migrate deploy
```

### 3C.5 常用命令速查
- 查看迁移状态：`pnpm -C apps/api exec prisma migrate status`
- 打开数据浏览器：`pnpm -C apps/api exec prisma studio`
- 生成客户端：`pnpm -C apps/api exec prisma generate`

## 4. 本项目推荐的迁移落地方式（可执行）

### 4.1 API 工程内新增 Prisma（目录约定）
建议放在 `apps/api/prisma/`：
- `apps/api/prisma/schema.prisma`
- `apps/api/prisma/migrations/*`

并在 `apps/api/src/` 中增加 PrismaService（后续接入模块时使用）。

### 4.2 连接字符串与环境变量
在 `apps/api/.env.example` 里定义（示例）：
- `DATABASE_URL="postgresql://user:password@localhost:5432/blog?schema=public"`

本地：
- `apps/api/.env.development` 存本地库连接

生产：
- `DATABASE_URL` 由部署平台注入，不写入仓库

### 4.3 UUID 与扩展
如果表主键使用 `uuid`，推荐启用扩展（其一即可）：
- `pgcrypto`：使用 `gen_random_uuid()`
- `uuid-ossp`：使用 `uuid_generate_v4()`

推荐 `pgcrypto`。

注意：
- 扩展创建属于迁移的一部分，首次迁移应包含 `CREATE EXTENSION IF NOT EXISTS "pgcrypto";`

## 5. 迁移流程（开发/测试/生产）

### 5.1 开发环境流程（本地迭代）
1) 启动 PostgreSQL（本地或 Docker）
2) 配好 `DATABASE_URL`
3) 初始化 Prisma：
   - 定义 `schema.prisma`（按 `docs/数据库表结构草案.md`）
4) 生成首个迁移：
   - `pnpm -C apps/api prisma migrate dev --name init`
5) 每次变更表结构：
   - 修改 `schema.prisma`
   - `prisma migrate dev --name <change_name>`
6) 本地重置（仅开发用）：
   - `prisma migrate reset`

验收：
- `migrations/` 目录持续增长，能完整复现当前结构
- 新人拉代码后执行一次迁移即可启动 API

### 5.2 测试/预发环境流程（CI 友好）
目标：让测试环境模拟生产迁移方式，不允许隐式改结构。
1) CI 创建/准备空数据库
2) 执行：
   - `prisma migrate deploy`
3) 再跑 e2e/集成测试

### 5.3 生产环境流程（上线可控）
1) 变更评审
   - 查看本次迁移 SQL（尤其是 `DROP`、大表 `ALTER`、索引创建）
   - 确认是否需要停机窗口或分批迁移
2) 备份
   - 生产库在迁移前做一次快照/备份
3) 执行迁移
   - `prisma migrate deploy`
4) 启动应用
5) 观察指标
   - API 健康检查、错误率、慢查询、连接数

## 6. Seed（初始化数据）方案
### 6.1 推荐做法
分成两类：
- 结构迁移：只能做表结构/扩展/索引
- 初始数据：用 Seed 脚本写入（可重复执行/幂等）

### 6.2 Seed 内容（MVP）
- 默认分类：技术文章/学习笔记/项目分享
- site_settings：profile/tech-stack/contacts/navbar 的默认值
- 管理员账号：仅本地/自用（生产建议通过一次性脚本或后台创建）

执行方式（示例）：
- 配置 `apps/api/prisma.config.ts` 的 `migrations.seed`（示例：`node prisma/seed.cjs`）
- 执行：`pnpm -C apps/api exec prisma db seed`

建议约束：
- Seed 脚本必须幂等（重复执行不会插入重复数据）

## 7. 迁移命名与规范
- 迁移名用动词+对象：
  - `init`
  - `add_posts`
  - `add_tools`
  - `add_chat_sessions`
  - `add_kb_chunks`
- 不允许手写修改 `migrations/*/migration.sql` 后不验证
- 大表变更遵循：
  - 先加列（nullable）-> 回填 -> 加约束 -> 删除旧列（可跨版本）

## 8. 常见风险与应对
- 漂移（drift）：生产库结构与迁移记录不一致
  - 应对：禁止手工改表；定期 `prisma migrate status` 检查
- 锁表/长事务：`ALTER TABLE` 或创建索引导致阻塞
  - 应对：大表操作用分步骤迁移；必要时用并发索引（Postgres `CONCURRENTLY`，需手写 SQL）
- 回滚困难：迁移本质是“向前演进”
  - 应对：发布前备份；变更设计遵循可逆策略（新增列优先，延后删除）

## 9. 推荐你现在立刻补齐的“最小前置”清单
- 在 `apps/api` 中正式接入 Prisma（`schema.prisma` + migrations）
- 选定并运行一个 PostgreSQL（本地可用 Docker）
- 增加 `apps/api/.env.example`（包含 DATABASE_URL 模板）
- 增加 seed 脚本（默认分类 + site_settings）

如果你希望我直接把 Prisma 接入（生成 `schema.prisma`、首个迁移、seed 脚本、以及 Nest 的 PrismaService），我可以在当前工程里一次性补齐并跑通本地迁移。
