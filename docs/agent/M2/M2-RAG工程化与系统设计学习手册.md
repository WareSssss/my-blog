# Milestone 2: RAG 工程化与系统设计 (学习手册)

本手册针对 **Milestone 2** 的进阶目标，深入探讨 RAG 全链路工程化及向量数据库在本项目中的实战应用。

---

## 1. RAG 全链路工程化 (M2.1)

### 1.1 数据分块策略 (Chunking)
- **为什么需要分块**: LLM 的上下文窗口有限，且长文本检索精度会下降。
- **策略**: 
  - **固定长度分块**: 简单但容易切断语义。
  - **语义分块**: 基于段落、标题或 AI 识别的语义边界进行切割（推荐）。
  - **重叠分块 (Overlap)**: 在块与块之间保留一部分重复内容，防止上下文信息在切分点丢失。

### 1.2 向量化 (Embedding)
- **原理**: 将文本转化为高维空间的数学向量。语义相近的文本，其向量距离（如余弦相似度）更近。
- **本项目应用**: 使用 OpenAI 的 `text-embedding-3-small` 或阿里云的相应模型。

### 1.3 检索与重排 (Retrieval & Re-ranking)
- **初筛**: 从向量数据库中检索出 Top-K 个最相关的块。
- **重排**: 由于向量搜索可能存在“语义漂移”，使用精排模型（Reranker）对 Top-K 结果进行二次打分，确保最精准的内容排在最前面。

---

## 2. 深入 NestJS 架构与 AI 集成 (M2.2)

### 2.1 高级模式
- **动态模块 (Dynamic Modules)**: 根据配置动态加载 AI 提供商（OpenAI/Dashscope）。
- **拦截器 (Interceptors)**: 用于统一处理 AI 接口的响应格式，或记录 Token 消耗日志。

### 2.2 流式响应 (Streaming)
- **Server-Sent Events (SSE)**: 实现 AI 对话时“一个字一个字蹦”的效果，提升用户体验。
- **本项目参考**: 观察 `chat.controller.ts` 中处理流式输出的逻辑。

---

## 3. 向量数据库实战：Qdrant (M2.3)

### 3.1 核心概念
- **Collection**: 类似关系型数据库的表。
- **Point**: 存储向量和 Payload（原始文本、元数据）的最小单元。
- **Filter**: 结合元数据进行硬过滤（如：只在“技术文章”分类下检索）。

### 3.2 索引优化
- **HNSW 算法**: 了解 Qdrant 如何通过“小世界导航图”实现百万级数据的毫秒级检索。

---

## 4. 本项目实战导读

请重点走走读以下核心代码块：
1. **[kb.service.ts](file:///Users/wares/Desktop/Blog/apps/api/src/modules/kb/kb.service.ts)**: 学习知识库如何进行分词、向量化并存入 Qdrant。
2. **[chat.service.ts](file:///Users/wares/Desktop/Blog/apps/api/src/modules/chat/chat.service.ts)**: 观察 RAG 流程：接收问题 -> 检索上下文 -> 构造 Prompt -> 获取 AI 回复。

---
**本阶段学习建议**: 
- 动手修改一次 `chunkSize` 参数，观察在同样的查询下，AI 回复的质量变化。
- 尝试在 Qdrant 控制台直接执行向量查询，理解“语义距离”的直观感受。
