# 前端 Web 部署指南 (Vercel 版)

本项目的页面端采用 React + Vite + TypeScript 开发，非常适合部署在 Vercel 平台上，享受全球 CDN 加速和自动 HTTPS。

---

## 1. 部署前的代码准备

### 1.1 SPA 路由支持 (vercel.json)
由于 React 是单页应用 (SPA)，为了防止刷新页面时出现 404，在 `apps/web` 目录下需要确保有 `vercel.json` 配置文件。

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

### 1.2 环境变量支持
确保你的代码中使用 `import.meta.env.VITE_API_BASE_URL` 来获取 API 地址。
- 在 [http.ts](file:///Users/wares/Desktop/Blog/apps/web/src/services/api/http.ts) 中，请求路径应拼接此变量。

---

## 2. Vercel 部署步骤

### 2.1 导入项目
1. 登录 [Vercel 官网](https://vercel.com/)。
2. 点击 **"Add New"** -> **"Project"**。
3. 导入你的 GitHub 仓库。

### 2.2 项目配置 (非常关键)
在配置页面，请务必进行以下设置：

- **Framework Preset**: 选择 `Vite`。
- **Root Directory**: 点击 Edit，选择 `apps/web`。
- **Build Command**: `pnpm build` (Vercel 会自动识别 pnpm)。
- **Output Directory**: `dist`。

### 2.3 设置环境变量 (Environment Variables)
在部署页面展开 "Environment Variables" 栏目，添加：

| 键 (Key) | 值 (Value) | 说明 |
| :--- | :--- | :--- |
| `VITE_API_BASE_URL` | `https://api.你的域名.com` | 指向你部署好的后端 API 地址 |

---

## 3. 绑定自定义域名 (阿里云 DNS)

1. 部署完成后，进入 Vercel 项目的 **Settings** -> **Domains**。
2. 输入你购买的域名，例如 `www.你的域名.com`。
3. Vercel 会显示解析要求（通常是 A 记录或 CNAME 记录）。
4. **去阿里云后台**：
   - 添加 `CNAME` 记录。
   - 主机记录：`www`。
   - 记录值：`cname.vercel-dns.com`。
5. 返回 Vercel 点击 **"Refresh"**，直到状态变为绿色的 **"Valid Configuration"**。

---

## 4. 常见问题排查

- **页面刷新 404**：检查 `apps/web` 下是否有 `vercel.json`。
- **接口请求失败**：
  - 检查 Vercel 上的 `VITE_API_BASE_URL` 是否填写正确（需包含 `https://`）。
  - 检查后端是否已正确配置 CORS 允许该域名的跨域请求。
- **样式丢失**：确保 `Build Command` 正确执行了构建流程。
