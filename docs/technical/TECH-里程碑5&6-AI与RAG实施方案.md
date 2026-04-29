# 里程碑 5 & 6：AI 聊天与 RAG 知识库实施方案

本方案详细描述了如何在本项目中落地 AI 智能对话（里程碑 5）以及基于博客内容的 RAG（检索增强生成，里程碑 6）。

---

## 1. 里程碑 5：AI 智能对话系统

目标：实现一个能够进行基础问答、支持多模型切换、并具备会话记忆的 AI 聊天模块。

### 1.1 后端实现 (NestJS)
- **模块设计**：创建 `ChatModule`。
- **服务对接**：
  - 使用 `openai` SDK 或 `axios` 对接主流大模型（如 DeepSeek、OpenAI、Claude）。
  - 实现非流式（JSON）与流式（SSE - Server-Sent Events）两种响应模式。
- **数据持久化**：
  - `chat_sessions`：存储会话元数据（标题、模型、所属用户/客户端 ID）。
  - `chat_messages`：存储历史对话内容（role: user/assistant, content, tokens）。
- **安全与限流**：
  - 使用 `@nestjs/throttler` 针对聊天接口进行 IP 级别的频率限制。
  - 敏感密钥（API Key）严禁进入前端，统一由后端环境变量管理。

### 1.2 前端实现 (React)
- **页面开发**：[AiPage.tsx](file:///Users/wares/Desktop/Blog/apps/web/src/pages/AI/AiPage.tsx)。
- **交互逻辑**：
  - 消息列表自动滚动到底部。
  - 支持 Markdown 渲染（复用博客详情页的渲染器）。
  - 支持代码高亮（复用 `rehype-highlight`）。
- **状态管理**：使用 `useState` 或 `useReducer` 管理当前会话的流式增量更新。

---

## 2. 里程碑 6：RAG 知识库系统

目标：让 AI “读过”你的所有博客，并能根据博客内容回答问题，同时给出引用来源。

### 2.1 知识库构建 (ETL 流程)
- **数据源**：扫描 `posts/` 目录下的所有 Markdown 文件。
- **切片 (Chunking)**：
  - 策略：按 Markdown 的二级标题（##）进行切片，或使用固定长度（如 500 字符）+ 重叠度（Overlap）。
- **向量化 (Embedding)**：
  - 调用云端模型（如 OpenAI `text-embedding-3-small`）将文本转化为向量。
- **入库 (Vector Store)**：
  - 选用 **Qdrant** (推荐) 或 Chroma。
  - 存储向量的同时，在元数据 (Metadata) 中记录文章的 `title`、`slug` 和 `snippet`。

### 2.2 检索与问答编排
- **语义检索**：用户提问 -> 转化为向量 -> 在 Qdrant 中检索最相似的 Top 3~5 个片段。
- **Prompt 增强**：
  - 将检索到的片段作为“上下文”拼接进 System Prompt。
  - 约束 AI 仅根据上下文回答，若无相关内容则诚实回答“知识库中未找到”。
- **引用展示**：
  - 后端返回回答内容的同时，返回所引用的文章标题和链接。
  - 前端渲染“引用来源”小卡片。

---

## 3. 技术路线建议 (MVP)

| 组件 | 推荐方案 | 理由 |
| :--- | :--- | :--- |
| **大模型** | DeepSeek-V3 / GPT-4o-mini | 性价比极高，逻辑能力强 |
| **向量库** | Qdrant (Docker 部署) | 性能稳定，支持内网部署，元数据查询方便 |
| **Embedding** | OpenAI text-embedding-3-small | 成本极低，维度可调 |
| **流式传输** | SSE (Server-Sent Events) | 实现简单，原生支持浏览器自动重连 |

---

## 4. 下一步开发计划 (Action Items)

1.  [ ] **API**: 集成 OpenAI SDK，跑通第一个 `/chat/completions` 接口。
2.  [ ] **Web**: 完成 AI 聊天页面的基础布局和对话气泡样式。
3.  [ ] **Infra**: 在本地或服务器通过 Docker 启动 Qdrant 实例。
4.  [ ] **Script**: 编写一个独立脚本，将现有的 `posts/*.md` 批量写入向量库。
