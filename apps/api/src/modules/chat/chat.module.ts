import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { KbModule } from '../kb/kb.module';
import { ToolsModule } from '../tools/tools.module';

@Module({
  imports: [KbModule, ToolsModule],
  controllers: [ChatController],
  providers: [ChatService],
  exports: [ChatService],
})
export class ChatModule {}
