# 业务流程图 (Business Flow)

本文档描述了 AI 聊天系统及 RTP (Real-time Tool Protocol) 协议的核心业务流程。

## 1. 端到端聊天与工具调用流程

该流程展示了用户从发送消息到接收 AI 响应（包括中间可能发生的工具调用）的全过程。

```mermaid
sequenceDiagram
    participant User as 用户 (Frontend)
    participant API as Chat Controller (API)
    participant Service as Chat Service
    participant OpenAI as OpenAI API
    participant RTP as RTP Service (Tools)

    User->>API: 发起流式请求 (GET /stream?content=...)
    API->>Service: 调用 callAIStream()
    Service->>Service: 保存用户消息到数据库
    Service->>Service: 创建 AI 消息占位符

    loop AI 响应循环
        Service->>OpenAI: 发送对话历史 + 可用工具定义
        OpenAI-->>Service: 返回流式数据块 (Chunk)
        
        alt 文本内容
            Service-->>User: SSE: data: {"content": "..."}
        else 工具调用请求 (Tool Call)
            Service->>Service: 解析工具名与参数
            Service-->>User: SSE: data: {"content": "[RTP:NOTIFICATION] 正在执行..."}
            
            Service->>RTP: callTool(name, args)
            RTP-->>Service: 返回工具执行结果 (Result/Error)
            
            Service-->>User: SSE: data: {"content": "[RTP:RESULT] 执行完成..."}
            Service->>Service: 将结果加入上下文
        end
    end

    Service->>Service: 更新数据库中 AI 消息的完整内容
    Service-->>User: SSE: [DONE]
```

## 2. RTP 工具注册与发现流程

RTP 协议允许动态扩展 AI 的能力。

```mermaid
graph TD
    A[系统启动/模块初始化] --> B[ToolsModule 加载]
    B --> C[RtpService 初始化]
    C --> D[注册内置工具: get_weather, search_db...]
    D --> E[生成工具元数据 Schema]
    
    F[ChatService 调用] --> G[获取当前已注册工具]
    G --> H[转换为 OpenAI Tool Definition]
    H --> I[注入 OpenAI 请求参数]
```

## 3. 异常处理与状态流转

```mermaid
stateDiagram-v2
    [*] --> Idle: 等待输入
    Idle --> Sending: 用户发送消息
    Sending --> Saving: 保存到数据库
    Saving --> Connecting: 建立 SSE 连接
    Connecting --> Streaming: 接收 AI 流
    Streaming --> ToolCalling: 识别到工具调用
    ToolCalling --> Streaming: 工具执行完成并反馈
    Streaming --> Completed: 结束
    Streaming --> Error: 发生异常
    Error --> Idle: 显示错误信息并重置
    Completed --> Idle
```
