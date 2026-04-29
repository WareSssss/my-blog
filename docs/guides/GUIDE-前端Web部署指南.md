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

## 3. 绑定自定义域名 (阿里云 DNS) 详细流程

绑定域名分为 **Vercel 端发起** 和 **阿里云端解析** 两个阶段：

### 3.1 第一阶段：在 Vercel 中添加域名
1.  登录 Vercel，进入你的项目，点击顶部导航栏的 **Settings**。
2.  在左侧菜单点击 **Domains**。
3.  在输入框中输入你购买的域名（建议同时添加两个版本）：
    -   版本 A：`www.yourdomain.com` (带 www 的二级域名)
    -   版本 B：`yourdomain.com` (不带 www 的根域名)
4.  点击 **Add**。此时 Vercel 会提示 `Invalid Configuration`（红色），并给出对应的解析参数。**请不要关闭此窗口，后面需要复制这里的记录值。**

### 3.2 第二阶段：在阿里云配置 DNS 解析
1.  登录 [阿里云控制台](https://dc.console.aliyun.com/)，搜索并进入 **"域名控制台"**。
2.  在域名列表中，找到你要绑定的域名，点击右侧的 **"解析"**。
3.  点击 **"添加记录"**，根据 Vercel 提示的要求分别添加以下两条记录（通常建议）：

#### 情况 A：配置 www 二级域名 (推荐)
-   **记录类型**：`CNAME`
-   **主机记录**：`www`
-   **解析线路**：`默认`
-   **记录值**：`cname.vercel-dns.com` (从 Vercel 复制)
-   **TTL**：`10分钟` (或默认)

#### 情况 B：配置根域名 (可选)
-   **记录类型**：`A`
-   **主机记录**：`@`
-   **解析线路**：`默认`
-   **记录值**：`76.76.21.21` (这是 Vercel 的官方 Anycast IP，请以 Vercel 界面显示的为准)

### 3.3 第三阶段：等待生效
1.  回到 Vercel 的 Domains 页面。
2.  点击 **Refresh** 按钮。
3.  **生效时间**：DNS 解析全球同步通常需要几分钟到几小时不等。当看到状态变为绿色的 **"Valid Configuration"** 且带有 **"Active"** 标签时，表示绑定成功。
4.  **SSL 证书**：Vercel 会自动为你申请并安装免费的 Let's Encrypt 证书，通常在域名验证通过后 5 分钟内自动完成。

---

---

## 4. 常见问题排查

- **页面刷新 404**：检查 `apps/web` 下是否有 `vercel.json`。
- **接口请求失败**：
  - 检查 Vercel 上的 `VITE_API_BASE_URL` 是否填写正确（需包含 `https://`）。
  - 检查后端是否已正确配置 CORS 允许该域名的跨域请求。
- **样式丢失**：确保 `Build Command` 正确执行了构建流程。
