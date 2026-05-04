# 代码审查与质量控制指引 (Code Review Guide)

作为资深架构师，为本项目制定的代码审查手册。本指南旨在确保代码的可维护性、安全性和业务一致性。

---

## 1. 核心审查原则 (Review Principles)

在进行代码审查时，应优先关注以下维度：
1. **安全性**: 敏感 Token 是否泄露？鉴权逻辑是否被绕过？
2. **健壮性**: 异常情况（网络超时、DB 报错、AI 接口挂掉）是否有 Catch 机制？
3. **一致性**: 编码风格是否符合项目既有模式（如 NestJS 的模块化、前端的 Service 层封装）？
4. **性能**: 是否存在循环内查询 DB？大图是否经过转储处理？

---

## 2. 后端审查清单 (NestJS + Prisma)

### 2.1 模块与控制器 (Modules & Controllers)
- [ ] **依赖注入**: 是否正确在 `Module` 中声明 `providers`？避免循环依赖。
- [ ] **装饰器使用**: 管理接口必须带 `@UseGuards(AdminTokenGuard)`。
- [ ] **路径规范**: 遵循 RESTful 命名，公共接口在 `/api/public`, 管理接口在 `/api/admin`。

### 2.2 业务逻辑 (Services)
- [ ] **Prisma 调用**: 优先使用 `upsert` 或 `transaction` 处理复合操作，确保原子性。
- [ ] **异步处理**: 统计类操作（如阅读量自增）是否使用了 `void` 配合 `catch` 进行异步处理，避免阻塞主流程？
- [ ] **类型安全**: 严格使用生成的 Prisma 类型，减少 `any` 的使用。

### 2.3 数据库迁移 (Prisma Migrations)
- [ ] **迁移安全**: 修改 `schema.prisma` 后是否生成了 migration 文件？避免直接在生产环境 `db push`。
- [ ] **字段约束**: 核心业务字段（如 `slug`, `originalUrl`）是否设置了 `unique` 约束？

---

## 3. 前端审查清单 (React + Tailwind)

### 3.1 状态管理与渲染
- [ ] **渲染性能**: `useEffect` 的依赖数组是否正确？是否存在不必要的重渲染？
- [ ] **内容安全**: 使用 `dangerouslySetInnerHTML` 时，数据源是否经过后端转义或 Markdown 渲染处理？

### 3.2 样式与 UI
- [ ] **Tailwind 规范**: 是否使用了项目定义的颜色体系（如 `slate-900`, `blue-600`）？
- [ ] **响应式适配**: 在详情页等核心页面是否考虑了移动端（`grid-cols-1` vs `lg:grid-cols-[...]`）？

### 3.3 接口调用
- [ ] **网络层封装**: 所有 API 调用必须经过 `src/services/api` 层的封装，禁止在组件内直接写 `fetch`。
- [ ] **Loading/Error 状态**: 页面加载数据时是否有 Skeleton（骨架屏）或错误反馈 UI？

---

## 4. 业务专项审查 (Crawler & AI)

### 4.1 爬虫模块
- [ ] **隔离性**: 具体的爬取策略（如 `JuejinStrategy`）是否与核心 `CrawlerService` 解耦？
- [ ] **资源处理**: 爬取的图片是否正确调用了 `OssUploader` 转储到 R2，而非引用原始链接？

### 4.2 AI 模块
- [ ] **提示词安全**: 系统提示词 (System Prompt) 是否包含敏感信息？
- [ ] **RAG 质量**: 检索回来的 context 是否经过了截断处理以防 Token 超出上限？

---

## 5. 代码审查逐步操作流程

### 第一步：准备阶段
1. 检出分支并运行 `pnpm install`。
2. 运行 `npx prisma generate` 确保类型定义最新。

### 第二步：静态检查
1. 在 IDE 中观察是否有 Linter 报错（红波浪线）。
2. 执行构建测试：在 `apps/api` 运行 `npm run build`，确保没有 TS 编译错误。

### 第三步：逻辑走读
1. **从入口点开始**: 先看 Controller 的路径定义，再深入 Service 的业务实现。
2. **数据流分析**: 跟踪数据从 API 接收 -> Service 处理 -> Prisma 写入的完整链路。
3. **异常链路**: 模拟网络断开或数据库超时，检查代码是否有兜底逻辑（如 `catch` 块或默认值）。

### 第四步：运行验证
1. 实际调用接口（使用 Postman 或页面交互）。
2. **数据库核对**: 检查数据库中的数据格式是否符合预期。

---

**审查结论**: 只有通过上述 Checklist 的代码方可合并至 `main` 分支并触发生产部署。
