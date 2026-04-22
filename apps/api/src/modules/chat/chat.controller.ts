import {
  Controller,
  Get,
  Post,
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
import { ThrottlerGuard } from '@nestjs/throttler';

@Controller('public/chat')
@UseGuards(ThrottlerGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

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

  @Sse('sessions/:id/stream')
  async sendMessageStream(
    @Param('id') sessionId: string,
    @Query('content') content: string,
  ): Promise<Observable<MessageEvent>> {
    if (!content) {
      throw new BadRequestException('内容不能为空');
    }

    // 1. 保存用户消息
    await this.chatService.sendMessage(sessionId, 'user', content);

    // 2. 调用 AI 响应（流式）
    const generator = this.chatService.callAIStream(sessionId, content);

    return from(generator).pipe(
      map((chunk) => ({
        data: { content: chunk },
      })),
    );
  }
}
