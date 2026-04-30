# 线上数据库结构同步指引

为了确保线上博客能够正确存储并展示掘金抓取的文章及图片，请按照以下步骤完成最后的一步操作。

### 最后的关键操作（需要您执行）

请您在本地电脑执行以下操作，以打通最后一步：

#### 1. 确认公网连接
使用 **Navicat** 或 **DBeaver** 等数据库工具测试您的 **Public URL** 是否能连通。
- **连接字符串参考**：`postgresql://postgres:mRtyuZYSAdpqDyLcOFjMWgCLndqUUlpE@shortline.proxy.rlwy.net:11211/railway`
- **目的**：确保您的本地网络可以访问 Railway 托管的数据库。

#### 2. 手动同步结构
在您的本地开发环境下进入 `api` 目录，执行结构推送命令：

1. 打开终端，切换目录：
   ```bash
   cd /Users/wares/Desktop/Blog/apps/api
   ```

2. 执行 Prisma 结构推送：
   ```bash
   npx prisma db push
   ```

3. **结果确认**：
   如果执行成功，您会看到如下提示：
   `The database is now in sync with your Prisma schema`

---

### 完成后的下一步
一旦您在本地看到成功提示，请在聊天窗口告诉我。我将立即为您：
- 检查线上部署状态（确认自愈逻辑已上线）。
- 手动触发掘金抓取任务。
- 最终验证线上页面 [www.waresblog.xyz](https://www.waresblog.xyz/) 的显示效果。
