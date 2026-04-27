import { Injectable, OnModuleInit } from '@nestjs/common';
import OpenAI from 'openai';
import { PrismaService } from '../../prisma/prisma.service';
import { ChatRole } from '@prisma/client';
import { KbService } from '../kb/kb.service';
import { RtpService } from '../tools/rtp.service';

@Injectable()
export class ChatService implements OnModuleInit {
  private openai: OpenAI | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly kbService: KbService,
    private readonly rtpService: RtpService,
  ) {}

  onModuleInit() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey) {
      this.openai = new OpenAI({
        apiKey: apiKey,
        baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
      });
    }

    // 注册符合 RTP 协议的工具
    this.rtpService.registerTool(
      {
        name: 'search_knowledge_base',
        description: '在博客知识库中搜索相关内容，用于回答技术问题或查阅历史文章。',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: '搜索关键词' },
          },
          required: ['query'],
        },
      },
      async (args: { query: string }) => {
        const results = await this.kbService.search(args.query);
        return results.map((r) => ({
          title: r.title,
          content: r.content,
          url: r.url,
        }));
      },
    );

    this.rtpService.registerTool(
      {
        name: 'get_current_time',
        description: '获取当前实时时间',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      async () => {
        return { time: new Date().toLocaleString() };
      },
    );
  }

  async createSession(clientId: string | null, model: string, title?: string) {
    return this.prisma.chatSession.create({
      data: {
        clientId,
        model,
        title: title || '新会话',
      },
    });
  }

  async getSessions(clientId: string) {
    return this.prisma.chatSession.findMany({
      where: { clientId },
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: {
          select: { messages: true },
        },
      },
    });
  }

  async getMessages(sessionId: string) {
    return this.prisma.chatMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async sendMessage(sessionId: string, role: ChatRole, content: string) {
    const message = await this.prisma.chatMessage.create({
      data: {
        sessionId,
        role,
        content,
      },
    });

    // 更新会话最后活跃时间
    await this.prisma.chatSession.update({
      where: { id: sessionId },
      data: { updatedAt: new Date() },
    });

    return message;
  }

  async updateMessage(messageId: string, content: string, tokenUsage?: any) {
    return this.prisma.chatMessage.update({
      where: { id: messageId },
      data: {
        content,
        tokenUsage,
      },
    });
  }

  async deleteSession(sessionId: string) {
    return this.prisma.chatSession.delete({
      where: { id: sessionId },
    });
  }

  async callAI(sessionId: string, userMessage: string) {
    if (!this.openai) {
      throw new Error('AI 服务未配置');
    }

    const session = await this.prisma.chatSession.findUnique({
      where: { id: sessionId },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 6, // 仅获取最近 6 条上下文（3 轮对话）
        },
      },
    });

    if (!session) {
      throw new Error('会话不存在');
    }

    // 将 desc 排序转回 asc 保证对话顺序
    session.messages.reverse();

    // 1. 尝试 RAG 检索
    const ragResults = await this.kbService.search(userMessage);
    let systemPrompt = '你是一个专业的 AI 助手，负责回答用户的问题。';

    if (ragResults.length > 0) {
      const context = ragResults
        .map((r) => {
          const slug = r.url.split('/').pop() || '';
          return `[文章标题: ${r.title}, slug: ${slug}]: ${r.content}`;
        })
        .join('\n\n');
      systemPrompt += `\n\n请参考以下知识库内容回答用户问题：\n${context}\n\n回答要求：\n1. 如果知识库内容足以回答，请优先使用知识库信息。\n2. 在回答结尾或提及相关内容处，请务必使用 [source: slug] 格式引用来源（例如 [source: react-hooks]）。\n3. 如果知识库内容不足以回答，请如实告知。`;
    }

    // 2. 构造对话历史
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      ...session.messages.map((m) => ({
        role: m.role.toLowerCase() as any,
        content: m.content,
      })),
      { role: 'user', content: userMessage },
    ];

    const response = await this.openai.chat.completions.create({
      model: session.model,
      messages: messages,
    });

    const assistantContent = response.choices[0]?.message?.content || '';
    
    // 保存 AI 响应
    await this.sendMessage(sessionId, 'assistant', assistantContent);

    return {
      content: assistantContent,
      usage: response.usage,
    };
  }

  async *callAIStream(sessionId: string, userMessage: string) {
    if (!this.openai) {
      throw new Error('AI 服务未配置');
    }

    // 1. 保存用户消息
    await this.sendMessage(sessionId, 'user', userMessage);
    
    const session = await this.prisma.chatSession.findUnique({
      where: { id: sessionId },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!session) {
      console.error(`[ChatService] Session not found: ${sessionId}`);
      yield `[错误] 会话不存在`;
      return;
    }

    session.messages.reverse();

    const systemPrompt = '你是一个专业的 AI 助手。你可以使用工具来获取实时信息或查询知识库。';

    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      ...session.messages.map((m) => ({
        role: m.role.toLowerCase() as any,
        content: m.content,
      })),
      { role: 'user', content: userMessage },
    ];

    const availableTools = this.rtpService.getTools().map((t) => ({
      type: 'function' as const,
      function: {
        name: t.name,
        description: t.description,
        parameters: t.inputSchema,
      },
    }));

    // 先创建一个空的 AI 消息占位符，避免等待 OpenAI 响应时数据库操作阻塞
    const placeholder = await this.sendMessage(sessionId, 'assistant', '');
    let fullContent = '';
    let currentMessages = [...messages];

    console.log(`[ChatService] Starting stream for session ${sessionId}, model: ${session.model}`);

    try {
      while (true) {
        console.log(`[ChatService] Calling OpenAI with ${currentMessages.length} messages`);
        const stream = await this.openai.chat.completions.create({
          model: session.model,
          messages: currentMessages,
          tools: availableTools.length > 0 ? availableTools : undefined,
          stream: true,
        });

        let toolCalls: any[] = [];
        let hasContent = false;

        for await (const chunk of stream) {
          const delta = chunk.choices[0]?.delta;
          
          // 处理文本内容
          if (delta?.content) {
            hasContent = true;
            fullContent += delta.content;
            yield delta.content;
          }

          // 处理工具调用
          if (delta?.tool_calls) {
            for (const toolCallDelta of delta.tool_calls) {
              const index = toolCallDelta.index;
              if (!toolCalls[index]) {
                toolCalls[index] = {
                  id: toolCallDelta.id,
                  type: 'function',
                  function: { name: '', arguments: '' },
                };
              }
              if (toolCallDelta.function?.name) {
                toolCalls[index].function.name += toolCallDelta.function.name;
              }
              if (toolCallDelta.function?.arguments) {
                toolCalls[index].function.arguments += toolCallDelta.function.arguments;
              }
            }
          }
        }

        // 如果没有工具调用，结束循环
        if (toolCalls.length === 0) break;

        // 执行工具调用
        const assistantMessage: OpenAI.Chat.Completions.ChatCompletionAssistantMessageParam = {
          role: 'assistant',
          content: fullContent || null,
          tool_calls: toolCalls.map(tc => ({
            id: tc.id,
            type: 'function',
            function: {
              name: tc.function.name,
              arguments: tc.function.arguments,
            }
          })),
        };
        currentMessages.push(assistantMessage);

        for (const tc of toolCalls) {
          const args = JSON.parse(tc.function.arguments);
          
          // 发送 RTP 通知给前端 (以特殊前缀标识)
          yield `\n[RTP:NOTIFICATION] 正在执行工具: ${tc.function.name}...\n`;

          const rtpResponse = await this.rtpService.callTool({
            name: tc.function.name,
            arguments: args
          }, tc.id);

          const toolResult = rtpResponse.error 
            ? JSON.stringify(rtpResponse.error) 
            : JSON.stringify(rtpResponse.result);

          currentMessages.push({
            role: 'tool',
            tool_call_id: tc.id,
            content: toolResult,
          } as OpenAI.Chat.Completions.ChatCompletionToolMessageParam);
          
          yield `\n[RTP:RESULT] 工具 ${tc.function.name} 执行完成。\n`;
        }
        
        // 继续循环让 AI 处理工具结果
      }
    } catch (e) {
      console.error('Stream processing error:', e);
      yield `\n[错误] 对话执行失败: ${e.message}\n`;
      throw e;
    } finally {
      const finalContent = fullContent.trim() || 'AI 未能生成有效回复。';
      await this.updateMessage(placeholder.id, finalContent);
    }
  }
}
