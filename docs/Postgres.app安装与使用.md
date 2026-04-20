# Postgres.app 安装与使用（macOS）

## 1. 适用场景
- 你在 macOS 上做本地开发，需要一个“开箱即用”的 PostgreSQL。
- 不想用 Docker，也不想折腾 Homebrew 服务管理。
- 需要图形化管理入口（启动/停止、端口、版本切换）。

## 2. 安装前准备
- macOS 版本建议：>= 12
- 确保 5432 端口未被占用（若被占用，可在 Postgres.app 中修改端口）
- 你需要有安装应用的权限（拖入 Applications）

## 3. 安装步骤（图形化）
1) 下载
- 打开 Postgres.app 官网：https://postgresapp.com/
- 点击 Download 下载最新版 `.dmg`

2) 安装
- 打开下载的 `.dmg`
- 将 Postgres.app 拖到 `Applications`（应用程序）

3) 首次启动
- 从 Launchpad 或 Applications 启动 Postgres.app
- 首次启动可能提示权限或网络访问，按系统提示允许即可

4) 初始化数据库集群（Database Cluster）
- Postgres.app 启动后会显示一个控制面板
- 若是第一次使用，会自动创建一个本地数据库集群（默认即可）

5) 启动服务
- 确认状态为 Running（运行中）
- 默认监听：`localhost:5432`

## 4. 安装命令行工具（强烈推荐）
Postgres.app 自带 `psql` 等命令行工具，但需要把路径加入环境变量。

1) 打开 Postgres.app
2) 点击菜单栏图标 -> `Open psql` 或 `CLI Tools`
3) 选择：
- 方式 A：安装/启用 “Command Line Tools”
- 方式 B：手动加入 PATH（推荐使用 zsh）

手动 PATH（示例，按你机子实际路径为准）：
```bash
echo 'export PATH="/Applications/Postgres.app/Contents/Versions/latest/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

验证：
```bash
psql --version
```

## 5. 创建数据库与用户（本地开发推荐做法）
### 5.1 连接默认数据库
Postgres.app 默认会创建一个与你 macOS 用户名同名的数据库/用户（通常无需密码）。

进入 psql：
```bash
psql
```

退出：
```bash
\q
```

### 5.2 创建项目数据库（示例：blog）
```bash
createdb blog
```

检查是否创建成功：
```bash
psql -l
```

### 5.3 创建专用用户（可选，推荐更贴近生产）
进入 psql：
```bash
psql
```

创建用户与密码（示例）：
```sql
CREATE USER blog_user WITH PASSWORD 'blog_password';
```

授权数据库：
```sql
GRANT ALL PRIVILEGES ON DATABASE blog TO blog_user;
```

退出：
```sql
\q
```

## 6. 连接字符串（DATABASE_URL）怎么写
### 6.1 使用系统用户名（无密码，最省事）
```text
postgresql://localhost:5432/blog?schema=public
```

或明确用户名（你的 macOS 用户名）：
```text
postgresql://<mac_username>@localhost:5432/blog?schema=public
```

### 6.2 使用专用用户（有密码）
```text
postgresql://blog_user:blog_password@localhost:5432/blog?schema=public
```

建议：
- 本地 `.env.development` 使用本地连接串
- 生产 `DATABASE_URL` 通过部署平台注入

## 7. 常用操作（开发日常）
### 7.1 查看当前连接与数据库
```bash
psql -l
```

### 7.2 连接到某个数据库
```bash
psql -d blog
```

### 7.3 在 psql 里常用命令
- 查看所有表：`\dt`
- 查看当前数据库：`\conninfo`
- 切换数据库：`\c <db_name>`
- 查看用户：`\du`

### 7.4 备份与恢复（推荐养成习惯）
备份：
```bash
pg_dump -d blog -f blog_dump.sql
```

恢复：
```bash
psql -d blog -f blog_dump.sql
```

## 8. 与 Prisma 迁移联动（本项目）
1) 配置 `apps/api/.env.development`
```text
DATABASE_URL="postgresql://localhost:5432/blog?schema=public"
```

2) 执行 Prisma 迁移（开发用）
```bash
pnpm -C apps/api prisma migrate dev --name init
```

3) 打开 Prisma Studio 查看数据
```bash
pnpm -C apps/api prisma studio
```

## 9. 常见问题排查
### 9.1 端口被占用（5432）
现象：Postgres.app 启动失败或提示端口冲突。
处理：
- 找到占用 5432 的程序并停掉
- 或在 Postgres.app 中修改监听端口（然后同步修改 DATABASE_URL）

### 9.2 psql 找不到命令
现象：终端提示 `command not found: psql`
处理：
- 按第 4 节安装 CLI Tools 或添加 PATH

### 9.3 连接时报认证失败
现象：`password authentication failed`
处理：
- 检查 DATABASE_URL 是否带错用户名/密码
- 若使用无密码模式，确保连接串不要写入错误的 user
- 需要密码时，创建专用用户并设置密码（第 5.3 节）

## 10. 推荐使用方式（给你当前项目）
- 方案：Postgres.app + 本地数据库 `blog`
- DATABASE_URL：先用无密码连接（最快跑通）
- 等 API 与迁移稳定后，再切换为专用用户（更接近生产）
