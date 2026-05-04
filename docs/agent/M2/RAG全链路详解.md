# RAG 深度实战：从分块到检索重排

RAG (Retrieval-Augmented Generation) 是让 AI 具备行业知识或实时知识的核心技术。本篇详细讲解 RAG 链路的每一个关键环节。

---

## 1. 数据分块 (Chunking)

### 1.1 为什么分块？
- LLM 无法一次性阅读一整本书。
- 检索越精准，AI 回复的幻觉越少。

### 1.2 策略对比
| 策略 | 优点 | 缺点 |
| :--- | :--- | :--- |
| 固定长度 | 实现简单，性能高 | 可能在句子中间断开，破坏语义 |
| 语义分块 | 语义完整，检索质量高 | 实现复杂，需 NLP 处理 |
| **重叠分块 (Overlap)** | 保留上下文关联 | 数据冗余 |

---

## 2. 向量化 (Embedding)

### 2.1 语义空间
向量化将“苹果”和“水果”在数学空间上拉近距离，即使文字不重合，AI 也能通过语义找到它们。

---

## 3. 向量数据库 (Qdrant)

### 3.1 核心术语
- **Collection**: 类似于 MySQL 的 Table。
- **Point**: 存储向量（Vector）和载荷（Payload）。
- **HNSW 索引**: 一种高维空间快速搜索算法。

---

## 4. 检索与重排 (Retrieval & Re-ranking)

### 4.1 二阶段检索
1. **初筛 (Retrieve)**: 从数百万数据中通过余弦相似度快速找出最接近的 100 条。
2. **精排 (Re-rank)**: 使用一个更重但更聪明的模型，对这 100 条进行深度语义匹配打分，选出前 3 条。

---

## 5. 本项目代码实战
查看 [kb.service.ts](file:///Users/wares/Desktop/Blog/apps/api/src/modules/kb/kb.service.ts) 中的 `processArticle` 函数：
1. 提取文章内容。
2. 调用 `getEmbeddings`。
3. 写入 `qdrant.upsert`。
