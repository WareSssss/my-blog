---
title: "大模型记忆"
slug: "llm-memory"
date: "2026-04-09"
category: "tech"
tags:
  - RAG
  - LLM
excerpt: "如何让 AI 在多轮对话中“记住”你的偏好？常见方案：全量上下文、摘要记忆、RAG 记忆。"
readTimeMinutes: 10
status: "published"
---

## 什么是“大模型记忆”

如果你希望 AI 在多轮对话中“记住”你的偏好与背景，就需要设计记忆方案。

## 常见方案

### 1. 全量上下文

把历史信息直接塞进上下文（受限于上下文窗口）。

### 2. 摘要记忆

把对话压缩成摘要，持续更新。

### 3. RAG 记忆

把关键信息写入知识库，按需召回。

## 一个简单的检索伪代码

```ts
async function answer(question: string) {
  const contexts = await vectorSearch(question);
  return llmGenerate({ question, contexts });
}
```
