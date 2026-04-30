# Railway 数据库与 API 重置指引 (小白版)

当线上数据库结构出现冲突（如 `P3008`, `P3017` 错误）且无法通过简单命令修复时，请按照本指南进行“全量重置”。

---

## 第一阶段：彻底清空旧数据库

为了确保没有任何残留的错误记录干扰新部署，我们需要先删除旧的数据库实例。

1. **删除旧数据库**：
   - 登录 [Railway 控制台](https://railway.app/dashboard)。
   - 点击进入您的项目，找到 **PostgreSQL** 服务。
   - 点击进入该服务，选择 **Settings** 选项卡。
   - 滚动到最下方的 **Danger Zone**，点击 **Delete Service** 并输入服务名称确认删除。

2. **添加新数据库**：
   - 在项目主界面，点击右上角的 **+ New** 按钮。
   - 选择 **Database** -> **Add PostgreSQL**。
   - 等待几秒钟，一个新的全空数据库就创建好了。

---

## 第二阶段：重新配置 API 服务

新数据库创建后，我们需要确保 API 服务能够正确连接并初始化它。

1. **检查环境变量**：
   - 点击进入您的 **API (Backend)** 服务。
   - 切换到 **Variables** 选项卡。
   - **DATABASE_URL**：Railway 通常会自动将新数据库的连接地址填入。如果没自动填入，请从 Postgres 服务的 Variables 中复制 `DATABASE_URL` 过来。
   - **ADMIN_TOKEN**：确保配置了您预设的令牌（如 `blog_admin_2026_x8Kf92PqLmN7rS4z`）。

2. **修改启动命令 (关键)**：
   - 切换到 **Settings** 选项卡。
   - 找到 **Deploy** 栏目下的 **Start Command**。
   - 将其修改为：
     ```bash
     npx prisma migrate deploy && npm run start:prod
     ```
   - *注：`migrate deploy` 会在新数据库上执行最新的起始迁移文件。*
   - 点击 **Save**。

---

## 第三阶段：部署与验证

1. **触发重新部署**：
   - 在 API 服务界面，点击右上角的 **Redeploy** 按钮。
   - Railway 会拉取 GitHub 上最新的干净基准代码。
   - **预期现象**：在日志中看到 `1 migration deployed`，表示数据库初始化成功。

2. **验证 API 存活**：
   - 待部署显示为绿色的 **Active** 后，访问：
     `https://您的API域名/api/public/categories`
   - 如果看到 JSON 数据（如 `[]`），说明后端已正常运行。

---

## 第四阶段：后续操作

1. **通知助手**：在聊天窗口告知“API 已就绪”。
2. **手动抓取**：助手将协助触发掘金文章抓取任务。
3. **最终检查**：访问 [www.waresblog.xyz](https://www.waresblog.xyz/) 确认内容已更新。
