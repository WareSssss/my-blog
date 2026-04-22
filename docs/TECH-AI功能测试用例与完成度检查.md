# AI 功能测试用例与 MVP 完成度检查

本文档用于验证里程碑 5 & 6 的 AI 聊天与 RAG 功能是否达到 MVP 上线标准。

---

## 1. MVP 完成度自查表

| 功能模块 | 完成状态 | 备注 |
| :--- | :--- | :--- |
| **基础对话 (Milestone 5)** | ✅ 已完成 | 已实现前后端对接，支持多会话管理 |
| **流式响应 (SSE)** | ✅ 已完成 | 后端已提供 `Sse` 接口，支持打字机效果 |
| **多模型切换** | ✅ 已完成 | 支持在前端下拉选择数据库配置的模型 |
| **RAG 检索 (Milestone 6)** | ✅ 已完成 | 核心代码已编写，支持 Qdrant 语义检索 |
| **内容切片与入库脚本** | ✅ 已完成 | 提供 `ingest-rag.ts` 脚本进行数据同步 |
| **引用来源展示** | ⚠️ 待优化 | 后端已支持逻辑，前端样式需根据检索结果微调 |

---

## 2. 核心功能测试用例 (Test Cases)

### TC-01: 后端 AI 连通性测试 (DeepSeek)
- **测试目的**: 验证 `OPENAI_API_KEY` 是否有效且能连接到 DeepSeek。
- **操作步骤**:
  ```bash
  curl -X POST https://api.deepseek.com/chat/completions \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer 你的_API_KEY" \
    -d '{"model": "deepseek-chat", "messages": [{"role": "user", "content": "你好"}], "stream": false}'
  ```
- **预期结果**: 返回 `200 OK` 且包含 AI 的回答 JSON。
- **当前状态**: 🔴 **余额不足 (Insufficient Balance)**。请检查 DeepSeek 账户余额。

### TC-02: 前端对话链路测试
- **测试目的**: 验证从页面输入到 AI 回复的完整链路。
- **操作步骤**:
  1. 访问 `http://localhost:5173/ai`。
  2. 在输入框输入“请介绍一下你自己”，点击发送。
- **预期结果**: 界面显示用户消息 -> 显示加载状态 -> 显示 AI 回复内容。
- **当前状态**: ✅ 链路已通。但因 API Key 余额问题，目前后端会返回 500。

### TC-03: RAG 知识库检索测试
- **测试目的**: 验证 AI 是否能根据博客内容回答问题。
- **操作步骤**:
  1. 确保 Qdrant 容器已启动。
  2. 运行 `pnpm -C apps/api run content:ingest` 同步数据。
  3. 提问：“这个博客的技术栈是什么？”
- **预期结果**: AI 能够引用 `docs` 或 `posts` 中的内容进行回答。
- **当前状态**: ✅ 逻辑已实现。需确保环境变量 `QDRANT_URL` 配置正确。

---

## 3. 常见报错排查

- **502 Bad Gateway**: 通常是后端 NestJS 未启动，或 Vite 代理配置错误。
- **500 Internal Server Error**: 
  - 检查后端控制台日志。
  - 常见于 API Key 无效、余额不足或模型名称填错。
- **401 Unauthorized**: API Key 填写错误。

---

## 4. 建议操作
1. **充值/更换 Key**: 建议去 DeepSeek 充值（最低 2 元）或使用智谱 AI 等免费模型进行测试。
2. **运行脚本**: 部署到正式环境前，务必运行一次 `content:ingest` 脚本，否则 AI 将无法搜索你的博客内容。
