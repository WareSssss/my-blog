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

## 6. 如何确保生成的代码逻辑正确 (Validation Methodology)

在 AI 辅助开发的时代，确保生成的代码逻辑正确需要一套“多层过滤”的校验机制。

### 6.1 第一层：静态验证 (Compile-time Check)
- **类型检查**: 生成代码后，第一时间观察 IDE 是否有红线。对于 NestJS，运行 `pnpm build` 是最强力的类型校验。
- **Prisma 对齐**: 如果涉及数据库变动，必须运行 `npx prisma generate`。如果代码报错说某个属性不存在，说明 AI 幻觉了不存在的字段。

### 6.2 第二层：端到端验证 (API/UI Testing)
- **接口测试 (Swagger/Postman)**: 
  - 对于新生成的 API，不要先接前端。先用 `Swagger` 或 `curl` 调通，观察返回结构是否符合预期。
  - **边界测试**: 故意传入非法 ID、空字符串或超长文本，看代码是否会崩溃（检查 `try-catch` 是否生效）。
- **数据库核实**: 接口调用成功后，**必须**进入数据库（Navicat/DBeaver）查看表中的真实数据。
  - *案例*: AI 有可能返回了“成功”，但因为逻辑错误并没有真正写入数据库，或者写入的字段是错位的。

### 6.3 第三层：日志与监控走读 (Observability)
- **终端日志**: 观察 NestJS 启动终端。
  - 注意看是否有 `Warn` 信息（如 Prisma 警告、依赖缺失）。
  - 在执行生成逻辑时，看是否有预料之外的 SQL 查询输出。
- **副作用检查**: 
  - 如果生成了爬虫代码，检查 R2 桶里是否真的多了图片。
  - 检查磁盘是否有临时文件残留。

### 6.4 第四层：自动化测试 (Test Suites)
- **单元测试**: 对于复杂的算法（如 Markdown 转换、RTP 协议解析），应要求 AI 生成对应的 `*.spec.ts` 文件。
- **执行测试**: 运行 `pnpm test`。如果测试通过，逻辑正确性概率提升 80% 以上。

---

## 7. 识别 AI 代码的常见坑点 (Common Pitfalls)

1. **幻觉依赖**: 引用了项目中根本没有安装的 npm 包（如之前的 `turndown-plugin-gfm`）。
2. **路径错误**: 特别是 `dist` 目录结构或 `import` 路径（如 `dist/main` vs `dist/src/main`）。
3. **环境硬编码**: 将 API Key 或数据库地址直接写死在代码里，而非使用 `ConfigService` 或 `process.env`。
4. **过时语法**: 使用了旧版 Prisma 或 NestJS 的 API，导致运行时报错。

---

**校验口诀**: “先看红线，再跑构建；接口调通，数据库见；逻辑兜底，日志防线。”
