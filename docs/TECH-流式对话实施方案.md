# AI 流式对话 (Streaming) 技术实施方案

在 AI 对话场景中，流式响应（像打字机一样逐字显示）能显著提升用户体验，减少用户等待首字出现的焦虑感。本项目目前后端已具备流式基础，前端尚需对接。

---

## 1. 技术选型：SSE (Server-Sent Events)

对于 AI 对话这种**单向（服务端到客户端）**、**持续输出**的场景，**SSE** 是比 WebSocket 更轻量、更优雅的选择。

- **优势**：
  - 基于 HTTP 协议，无需处理握手升级。
  - 原生支持断线重连。
  - 实现简单，浏览器兼容性好。
- **对比**：
  - **Fetch + ReadableStream**：灵活性更高，支持 POST 请求。
  - **SSE (EventSource)**：仅支持 GET 请求，但协议标准，后端实现简单。

**本项目推荐方案：后端使用 NestJS `@Sse`，前端使用 `fetch` 配合 `ReadableStream`（以支持 POST 请求发送长文本）。**

---

## 2. 后端实现 (NestJS)

### 2.1 核心服务层 (ChatService)
使用生成器（Generator）逐个吐出 Token。

```typescript
// apps/api/src/modules/chat/chat.service.ts

async *callAIStream(sessionId: string, userMessage: string) {
  const stream = await this.openai.chat.completions.create({
    model: 'qwen-plus',
    messages: [{ role: 'user', content: userMessage }],
    stream: true, // 开启流式
  });

  let fullContent = '';
  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content || '';
    fullContent += content;
    yield content; // 逐个推送给 Controller
  }

  // 结束后统一保存到数据库
  await this.saveMessage(sessionId, 'assistant', fullContent);
}
```

### 2.2 控制器层 (ChatController)
使用 `@Sse` 装饰器返回 `Observable`。

```typescript
// apps/api/src/modules/chat/chat.controller.ts

@Sse('sessions/:id/stream')
async stream(
  @Param('id') id: string,
  @Query('content') content: string
): Promise<Observable<MessageEvent>> {
  const generator = this.chatService.callAIStream(id, content);
  return from(generator).pipe(
    map(chunk => ({ data: { content: chunk } } as MessageEvent))
  );
}
```

---

## 3. 前端实现 (React)

前端需要处理流式数据的累加。

### 3.1 请求封装
由于 SSE 默认只支持 GET，若要支持 POST 或更复杂的 Header，建议使用 `fetch`。

```typescript
// apps/web/src/services/api/chat.ts

export async function* sendChatMessageStream(sessionId: string, content: string) {
  const response = await fetch(`/api/public/chat/sessions/${sessionId}/stream?content=${encodeURIComponent(content)}`);
  const reader = response.body?.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader!.read();
    if (done) break;
    const chunk = decoder.decode(value);
    // 处理 SSE 协议格式 (data: {"content": "xxx"})
    yield parseSSEChunk(chunk); 
  }
}
```

### 3.2 UI 状态更新 (AiPage.tsx)
```typescript
const handleSend = async () => {
  // ... 乐观更新用户消息
  
  // 创建一个空的 AI 消息占位
  setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

  const stream = sendChatMessageStream(sessionId, text);
  for await (const chunk of stream) {
    setMessages(prev => {
      const last = prev[prev.length - 1];
      return [
        ...prev.slice(0, -1),
        { ...last, content: last.content + chunk } // 累加内容
      ];
    });
  }
};
```

---

## 4. 关键挑战与注意事项

1. **持久化时机**：
   流式输出时，数据库不应在每个 Token 产生时都写入。应在流结束后，由后端统一将 `fullContent` 存入 `chat_messages` 表。
2. **反向代理配置 (Nginx/Vite)**：
   Nginx 必须关闭缓冲（`proxy_buffering off;`），否则数据会被缓存，直到流结束才一次性吐给前端，失去“流式”意义。
3. **超时管理**：
   流式连接可能持续很久，需调整后端和网关的超时时间（如 `60s`）。
4. **错误处理**：
   如果流中途断开（如模型报错），前端需要能捕获异常并给用户友好提示，而不是一直显示加载中。

---

## 5. 结论
流式对话是 AI 产品的“灵魂”。通过 **NestJS Sse + 前端 ReadableStream**，我们可以在保持现有 Monorepo 架构不变的情况下，以极小的改动成本实现流畅的打字机交互效果。
