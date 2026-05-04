# Agent 架构：大脑、规划、记忆与工具

AI Agent（智能体）的核心在于其自主性。本篇将详细拆解 Agent 的四个核心组件及其在本项目中的具体映射。

---

## 1. 大脑 (The Brain - LLM)

### 1.1 核心能力
- **推理 (Reasoning)**: 理解人类语言的意图。
- **决策 (Decision Making)**: 决定下一步该做什么。

### 1.2 本项目应用
- 使用 **GPT-4o** 或 **通义千问** 作为决策大脑，通过 `chat.service.ts` 驱动对话逻辑。

---

## 2. 规划 (Planning)

### 2.1 任务分解 (Task Decomposition)
Agent 将复杂目标（如“帮我写一篇关于 NestJS 的技术文章”）拆解为子任务：
1. 搜索相关技术文档。
2. 提取核心知识点。
3. 撰写大纲。
4. 生成正文并配图。

### 2.2 思维链 (Chain of Thought, CoT)
引导模型在输出答案前，先输出思考过程。

---

## 3. 记忆 (Memory)

### 3.1 短期记忆 (Short-term Memory)
- **实现**: 利用 LLM 的上下文窗口（Context Window）。
- **局限**: 对话过长会遗忘早期内容，且 Token 成本增加。

### 3.2 长期记忆 (Long-term Memory)
- **实现**: 向量数据库（Vector DB）。
- **本项目映射**: **Qdrant**。将抓取的掘金文章向量化后存储，需要时通过 RAG 检索。

---

## 4. 工具 (Tools / Action)

### 4.1 核心概念：Function Calling
Agent 并不直接具备抓取网页或发邮件的能力。它通过调用外部函数（工具）来改变环境。

### 4.2 本项目工具清单
- **Crawler**: 外部数据获取工具。
- **Prisma**: 数据库读写工具。
- **R2 Storage**: 图片转储工具。

---

## 5. 架构闭环图示
> **用户输入** -> **大脑推理** -> **规划步骤** -> **调用工具** -> **观察结果** -> **存入记忆** -> **反馈回复**

---
**学习建议**:
阅读本项目中的 [TECH-Agent基本概念指南.md](file:///Users/wares/Desktop/Blog/docs/technical/TECH-Agent%E5%9F%BA%E6%9C%AC%E6%A6%82%E5%BF%B5%E6%8C%87%E5%BC%95.md)，重点理解 Agent 模式与传统 API 调用的本质区别。
