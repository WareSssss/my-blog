# 主题切换（深色模式）实施方案

本文档详细说明了博客系统深色模式的架构设计与实施路径，确保在不同页面与组件间提供一致的视觉体验。

---

## 1. 技术架构

### 1.1 基础配置 (Tailwind CSS)
系统采用 Tailwind CSS 的 `class` 策略，通过在 `<html>` 标签上切换 `.dark` 类来驱动样式变化。

- **配置文件**: [tailwind.config.ts](file:///Users/wares/Desktop/Blog/apps/web/tailwind.config.ts)
- **关键配置**:
  ```typescript
  export default {
    darkMode: "class", // 启用类触发模式
    // ...
  }
  ```

### 1.2 状态管理与持久化
使用 React `useState` 配合 `useEffect` 实现，逻辑封装在自定义 Hook `useIsDark` 中。

- **逻辑位置**: [AppLayout.tsx](file:///Users/wares/Desktop/Blog/apps/web/src/layouts/AppLayout.tsx)
- **核心逻辑**:
  1. **初始化**: 优先级为 `LocalStorage` > `系统偏好` > `默认(Light)`。
  2. **同步**: 监听 `isDark` 状态，实时更新 `document.documentElement` 的 class 列表。
  3. **持久化**: 变更时同步写入 `localStorage.setItem("theme", ...)`。

---

## 2. 交互组件实现

### 2.1 切换按钮 (Toggle Button)
在 Header 区域提供图标切换按钮，根据当前状态显示 `Sun` 或 `Moon` 图标。

```tsx
<button
  onClick={() => setIsDark(!isDark)}
  className="dark:bg-slate-800 dark:text-slate-200 ..."
>
  {isDark ? <Sun /> : <Moon />}
</button>
```

---

## 3. 样式适配规范

### 3.1 颜色变量对齐
所有组件必须遵循以下颜色适配原则：

| 元素类型 | 浅色模式 (Light) | 深色模式 (Dark) |
| :--- | :--- | :--- |
| 页面背景 | `bg-slate-50` | `dark:bg-slate-950` |
| 卡片/Header背景 | `bg-white` | `dark:bg-slate-900` |
| 主文字颜色 | `text-slate-900` | `dark:text-slate-100` |
| 次要文字颜色 | `text-slate-600` | `dark:text-slate-400` |
| 边框颜色 | `border-slate-200` | `dark:border-slate-800` |

### 3.2 示例：适配 AppLayout
需要对 [AppLayout.tsx](file:///Users/wares/Desktop/Blog/apps/web/src/layouts/AppLayout.tsx) 的根容器进行适配：

```tsx
// 修改前
<div className="min-h-full bg-slate-50 text-slate-900">

// 修改后
<div className="min-h-full bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 transition-colors duration-300">
```

---

## 4. 实施清单 (Checklist)

- [x] **配置层**: `tailwind.config.ts` 设置 `darkMode: 'class'`。
- [x] **逻辑层**: `AppLayout` 实现 `useIsDark` 逻辑。
- [ ] **全局适配**: 为 `AppLayout` 的 `div` 容器添加 `dark:` 背景色与文字色。
- [ ] **组件适配**:
    - [ ] 导航栏 (Header) 背景色与边框适配。
    - [ ] 博客列表卡片适配。
    - [ ] AI 对话气泡颜色适配。
- [ ] **代码块适配**: 确保 `highlight.js` 的主题在深色模式下清晰。

---

## 5. 进阶优化建议

1. **过渡动画**: 为全局背景添加 `transition-colors duration-300`，使切换过程更柔和。
2. **系统同步**: 监听系统主题变化事件 (`window.matchMedia`), 实现随系统自动切换。
3. **图像适配**: 对于过亮的图片，可以使用 `dark:opacity-80` 进行调优。
