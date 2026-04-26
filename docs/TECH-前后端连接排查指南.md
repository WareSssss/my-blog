# 前后端连接排查指南

当后端（Railway）部署成功但前端（Vercel）无法获取数据时，请按以下步骤排查：

## 1. 环境变量配置
- **位置**：Vercel Project Settings -> Environment Variables
- **KEY**：`VITE_API_BASE_URL`
- **VALUE**：`https://wonderful-spontaneity-production-3251.up.railway.app`
- **检查**：确保没有多余的空格，必须以 `https://` 开头。
- **重要**：修改后必须重新 **Redeploy** 才能生效。

## 2. CORS 跨域配置
- **检查文件**：`apps/api/src/main.ts`
- **当前配置**：
  - 已支持正则：`/\.vercel\.app$/` (所有 Vercel 域名) 和 `/\.railway\.app$/` (所有 Railway 域名)。
  - 已显式允许常用方法：`GET, POST, PUT, DELETE, PATCH, OPTIONS`。
  - 已允许常用 Header：`Content-Type, Authorization, X-Requested-With`。
  - 启用了 `credentials: true` 以支持认证信息。
- **本地测试**：在本地尝试请求线上 API 地址，看是否能通。
- **重要**：如果使用了自定义域名（如 `www.abc.com`），必须手动在 `main.ts` 的 `origin` 数组中添加该字符串。

## 3. 常见报错及含义
- **Network Error / Access-Control-Allow-Origin**：CORS 配置问题。
- **Mixed Content**：HTTPS 页面请求了 HTTP 接口。
- **404 Not Found**：API 路由前缀不匹配（检查是否少了 `/api`）。
- **ECONNREFUSED**：后端服务未启动或端口映射错误。
