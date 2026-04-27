import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  Sse,
  MessageEvent,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { ChatService } from './chat.service';
import { Observable, from, map } from 'rxjs';
import { ThrottlerGuard, Throttle } from '@nestjs/throttler';

@Controller('public/chat')
@UseGuards(ThrottlerGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Throttle({ short: { limit: 1, ttl: 1000 }, long: { limit: 20, ttl: 60000 } })
  @Post('sessions')
  async createSession(
    @Body() body: { clientId?: string; model: string; title?: string },
  ) {
    if (!body.model) {
      throw new BadRequestException('请提供模型名称');
    }
    return this.chatService.createSession(
      body.clientId || null,
      body.model,
      body.title,
    );
  }

  @Get('sessions')
  async getSessions(@Query('clientId') clientId: string) {
    if (!clientId) {
      throw new BadRequestException('请提供客户端 ID');
    }
    return this.chatService.getSessions(clientId);
  }

  @Get('sessions/:id/messages')
  async getMessages(@Param('id') sessionId: string) {
    return this.chatService.getMessages(sessionId);
  }

  @Delete('sessions/:id')
  async deleteSession(@Param('id') sessionId: string) {
    return this.chatService.deleteSession(sessionId);
  }

  @Post('sessions/:id/send')
  async sendMessage(
    @Param('id') sessionId: string,
    @Body() body: { content: string },
  ) {
    if (!body.content) {
      throw new BadRequestException('内容不能为空');
    }

    // 1. 保存用户消息
    await this.chatService.sendMessage(sessionId, 'user', body.content);

    // 2. 调用 AI 响应（非流式）
    return this.chatService.callAI(sessionId, body.content);
  }

  @Throttle({ short: { limit: 1, ttl: 5000 }, long: { limit: 30, ttl: 3600000 } })
  @Sse('sessions/:id/stream')
  sendMessageStream(
    @Param('id') sessionId: string,
    @Query('content') content: string,
  ): Observable<MessageEvent> {
    if (!content) {
      throw new BadRequestException('内容不能为空');
    }

    // 将异步逻辑移入 Observable 内部，确保 SSE 连接能尽快建立
    return from(this.chatService.callAIStream(sessionId, content)).pipe(
      map((chunk) => ({
        data: { content: chunk },
      })),
    );
  }
}
