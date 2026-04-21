# 前端 Web 部署指南 (Cloudflare Pages 版)

Cloudflare Pages 是 Vercel 的强力替代方案，具有不限流量、全球加速和极其简便的部署流程。对于无法登录 Vercel 的用户，这是首选方案。

---

## 1. 部署前的代码准备

### 1.1 SPA 路由支持 (_redirects)
Cloudflare Pages 处理单页应用 (SPA) 路由的方式非常简单。你需要在 `apps/web/public` 目录下创建一个名为 `_redirects` 的文件（注意没有扩展名），内容如下：

```text
/*    /index.html   200
```
这会告诉 Cloudflare 将所有路由请求都重定向到 `index.html`，由 React Router 接管。

---

## 2. Cloudflare Pages 部署步骤

### 2.1 关联 GitHub
1. 登录 [Cloudflare 控制台](https://dash.cloudflare.com/)。
2. 在左侧菜单栏选择 **"Workers & Pages"** -> **"Pages"**。
3. 点击 **"Connect to Git"**。
4. 选择你的 GitHub 账号并授权导入你的博客仓库。

### 2.2 项目配置 (针对 Monorepo)
在 "Set up builds and deployments" 页面进行如下配置：

- **Project name**: 你的项目名（例如 `my-blog-web`）。
- **Production branch**: `main`。
- **Framework preset**: 选择 `Vite`。
- **Build command**: `pnpm build`。
- **Build output directory**: `apps/web/dist`。
- **Root directory (advanced)**: `/` (保持根目录，但在 Build settings 中指定子目录路径)。

### 2.3 设置环境变量 (Environment Variables)
在页面下方的 "Environment variables" 栏目添加：

| 变量名 (Variable name) | 值 (Value) | 说明 |
| :--- | :--- | :--- |
| `VITE_API_BASE_URL` | `https://api.你的域名.com` | 指向你部署好的后端 API 地址 |

---

## 3. 绑定自定义域名 (阿里云 DNS)

1. 部署成功后，在 Pages 项目详情页点击 **"Custom domains"** 选项卡。
2. 点击 **"Set up a custom domain"**，输入 `www.你的域名.com`。
3. Cloudflare 会提供解析指引：
   - **方式 A (推荐)**：如果你把域名服务器 (NS) 迁到了 Cloudflare，点击确定即可一键完成。
   - **方式 B (继续使用阿里云)**：
     - 去阿里云 DNS 后台添加 `CNAME` 记录。
     - 主机记录：`www`。
     - 记录值：`你的项目名.pages.dev`。
4. 等待 Cloudflare 验证通过，HTTPS 证书会自动发放。

---

## 4. 常见问题排查

- **构建失败**：检查 `pnpm-lock.yaml` 是否在根目录。如果 Cloudflare 无法识别 pnpm，可以在环境变量中添加 `NPM_FLAGS` 为 `--version` 强制检查，或者确保构建命令包含 `pnpm install && pnpm build`。
- **接口 404/502**：确保后端 CORS 允许了 Cloudflare 生成的 `*.pages.dev` 域名或你的自定义域名。
- **刷新页面 404**：检查 `apps/web/public/_redirects` 文件是否正确上传。
