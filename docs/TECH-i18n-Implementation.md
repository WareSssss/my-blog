# TECH: Wares.ai Blog 国际化 (i18n) 实施方案

## 1. 业务目标
为 `Wares.ai Blog` 增加中英文切换功能，提升国际化用户体验。支持 UI 界面、菜单、以及博客内容的语言适配。

## 2. 技术选型
- **框架**: `react-i18next` + `i18next` (成熟、支持 Hooks、生态丰富)
- **检测**: `i18next-browser-languagedetector` (自动识别浏览器语言)
- **存储**: `localStorage` (持久化用户选择)

## 3. 实施步骤

### 3.1 基础设施搭建 (Frontend)
1. **安装依赖**:
   ```bash
   npm install i18next react-i18next i18next-browser-languagedetector
   ```
2. **配置文件**: 创建 `apps/web/src/i18n/index.ts`
   - 定义资源文件结构 (JSON)。
   - 配置默认语言为 `zh`。
3. **入口注入**: 在 `main.tsx` 中导入配置文件。

### 3.2 翻译资源管理
创建目录 `apps/web/src/i18n/locales/`:
- `zh/common.json`: 存放通用 UI 文字（如：首页、博客、开发工具）。
- `en/common.json`: 对应英文翻译。

### 3.3 UI 适配
- **导航栏**: 在 [AppLayout.tsx](file:///Users/wares/Desktop/Blog/apps/web/src/layouts/AppLayout.tsx) 的右侧图标组（与通知、主题切换、GitHub 图标并列）中增加语言切换按钮 (Language Switcher)。
- **交互**: 点击图标弹出下拉菜单或直接循环切换 `zh/en`。
  ```tsx
  const { t, i18n } = useTranslation();
  // 示例: {t('nav.home')}
  ```

### 3.4 数据库与后端适配 (Content i18n)
对于博客内容，建议采用以下方案之一：
- **方案 A (简单)**: 在 `Post` 表增加 `language` 字段 (zh/en)，前端根据当前语言过滤请求。
- **方案 B (标准)**: 增加 `PostTranslation` 关联表，支持同个 Slug 对应不同语言版本。

## 4. 任务清单 (Todo List)
- [ ] 初始化 i18n 基础配置
- [ ] 提取 [AppLayout.tsx](file:///Users/wares/Desktop/Blog/apps/web/src/layouts/AppLayout.tsx) 的导航菜单文字到 JSON
- [ ] 增加 Header 语言切换 UI (Icon: Languages)
- [ ] 适配 [BlogListPage.tsx](file:///Users/wares/Desktop/Blog/apps/web/src/pages/Blog/BlogListPage.tsx) 的分页与空状态文字
- [ ] (可选) 后端 API 增加 `lang` 参数支持

## 5. 预期效果
- 用户点击切换按钮，全站 UI 即时响应，无需刷新页面。
- 系统自动记住用户的语言偏好。
- 路由可考虑增加前缀（如 `/en/blog`），利于 SEO。
