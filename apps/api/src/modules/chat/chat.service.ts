import { Injectable, OnModuleInit } from '@nestjs/common';
import OpenAI from 'openai';
import { PrismaService } from '../../prisma/prisma.service';
import { ChatRole } from '@prisma/client';
import { KbService } from '../kb/kb.service';

@Injectable()
export class ChatService implements OnModuleInit {
  private openai: OpenAI | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly kbService: KbService,
  ) {}

  onModuleInit() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey) {
      this.openai = new OpenAI({
        apiKey: apiKey,
        baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
      });
    }
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
          orderBy: { createdAt: 'asc' },
          take: 10, // 仅获取最近 10 条上下文
        },
      },
    });

    if (!session) {
      throw new Error('会话不存在');
    }

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

    const session = await this.prisma.chatSession.findUnique({
      where: { id: sessionId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 10,
        },
      },
    });

    if (!session) {
      throw new Error('会话不存在');
    }

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

    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      ...session.messages.map((m) => ({
        role: m.role.toLowerCase() as any,
        content: m.content,
      })),
      { role: 'user', content: userMessage },
    ];

    const stream = await this.openai.chat.completions.create({
      model: session.model,
      messages: messages,
      stream: true,
    });

    // 方案 A：即时占位
    // 先创建一个内容为“...”的消息记录，获取其 ID
    const placeholder = await this.sendMessage(sessionId, 'assistant', '...');

    let fullContent = '';
    try {
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        fullContent += content;
        yield content;
      }
    } catch (e) {
      console.error('Stream processing error:', e.message);
      throw e;
    } finally {
      console.log(`Stream for session ${sessionId} closed. Saving ${fullContent.length} chars.`);
      // 关键修复：无论流是否正常结束，都更新占位消息为实际生成的内容
      const finalContent = fullContent.trim() || 'AI 未能生成回复，请重试。';
      await this.updateMessage(placeholder.id, finalContent);
    }
  }
}
