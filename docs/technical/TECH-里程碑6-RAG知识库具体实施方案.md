# 里程碑 6：RAG 知识库系统具体实施方案

本方案旨在为个人博客提供“基于私有知识库的 AI 问答”能力，使 AI 能够根据博客内容提供精准回答并标注来源。

---

## 1. 技术栈选型

| 组件 | 选型 | 理由 |
| :--- | :--- | :--- |
| **向量数据库** | **Qdrant** | 性能优异，支持向量与元数据过滤，提供轻量级 JS SDK。 |
| **Embedding 模型** | **text-embedding-3-small** | 成本极低，支持 1536 维度，语义捕捉准确。 |
| **大语言模型** | **DeepSeek-V3 / Qwen-Plus** | 逻辑能力强，支持长上下文，性价比高。 |
| **ETL 脚本** | **Node.js + TS** | 与主项目技术栈一致，方便复用业务逻辑。 |

---

## 2. 系统架构

### 2.1 离线数据流 (ETL)
1. **读取**：扫描 `posts/` 目录下的所有 Markdown 文件。
2. **解析**：使用 `gray-matter` 提取文章元数据（Title, Slug, Date）。
3. **切片 (Chunking)**：
   - 采用段落切片策略：按 `\n\n` 分割。
   - 过滤过短片段（少于 50 字符），确保上下文质量。
4. **向量化**：调用 OpenAI 接口将文本转化为 1536 维向量。
5. **入库**：将向量及其元数据（原文片段、标题、Slug、URL）存入 Qdrant。

### 2.2 在线检索流 (Retrieval)
1. **Query 转化**：将用户的提问转化为向量。
2. **语义搜索**：在 Qdrant 中执行余弦相似度搜索，取 Top 3 最相关片段。
3. **Prompt 组装**：
   - 将检索到的片段拼接为背景知识。
   - 注入 System Prompt，要求 AI 必须引用来源。
4. **流式生成**：AI 生成回答，前端实时展示。

---

## 3. 核心代码实现指南

### 3.1 基础设施层 (`KbService`)
在 `apps/api/src/modules/kb/kb.service.ts` 中实现：
- `getEmbedding(text)`：封装向量化接口。
- `search(query, limit)`：封装 Qdrant 搜索接口。

### 3.2 业务逻辑层 (`ChatService`)
在 `apps/api/src/modules/chat/chat.service.ts` 中集成：
- 在对话开始前触发 `kbService.search`。
- 动态调整 `systemPrompt`，注入检索到的上下文。
- 强制输出格式：要求 AI 使用 `[source: slug]` 进行引用。

### 3.3 数据同步脚本 (`ingest-rag.ts`)
位于 `apps/api/scripts/ingest-rag.ts`：
- 支持增量更新（通过 content_hash 识别）。
- 自动创建 Qdrant Collection。

---

## 4. 部署与运维

### 4.1 环境要求
- **Docker**: 运行 Qdrant 容器。
  ```bash
  docker run -p 6333:6333 qdrant/qdrant
  ```
- **环境变量**:
  - `QDRANT_URL`: 数据库地址。
  - `OPENAI_API_KEY`: 向量化与对话 Key。

### 4.2 数据同步指令
每次更新博客文章后，需手动或通过 CI/CD 运行：
```bash
pnpm -C apps/api run content:ingest
```

---

## 5. 架构评审与深度优化建议 (批判性分析)

作为生产级系统的演进参考，以下是针对本方案 MVP 版本的深度评审：

### 5.1 技术栈选型：基础设施过载风险
- **批判**：对于个人博客（数据量 < 10k chunks），引入 **Qdrant** 增加了独立的 Docker 容器开销和运维复杂度。
- **优化建议**：未来可迁移至 **PostgreSQL + pgvector**。将关系型数据与向量数据合一，简化备份逻辑并支持 SQL 联合查询。

### 5.2 系统架构：朴素切片策略的局限
- **批判**：按段落 `\n\n` 分割容易导致语义断裂，且无法控制 chunk 尺寸的稳定性。
- **优化建议**：升级为 **RecursiveCharacterTextSplitter**，并引入 **10%-15% 的重叠度 (Overlap)**，确保相邻片段间的上下文衔接。

### 5.3 检索质量：召回天花板
- **批判**：纯向量检索对专有名词（如特定库名）不敏感，且 Top-3 召回率在处理长文时不足。
- **优化建议**：实施 **混合检索 (Hybrid Search)**。结合向量相似度与全文搜索（BM25）。进阶方案可引入 **Rerank（重排序）** 机制。

### 5.4 ETL 流程：被动同步
- **批判**：手动运行脚本 `ingest-rag.ts` 容易导致知识库滞后。
- **优化建议**：将 Ingest 逻辑集成到 **Git Hook** 或后台发布流程中，实现“发布即同步”的自动化流水线。

---

## 6. 验收标准
- [ ] AI 能够回答博客中提到的具体技术细节。
- [ ] 回答末尾显示“参考来源”卡片并可点击跳转。
- [ ] 若问题不在知识库范围内，AI 会提示“未在博客中找到相关内容”。
