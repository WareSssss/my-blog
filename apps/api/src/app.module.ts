import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AdminModule } from './modules/admin/admin.module';
import { PublicModule } from './modules/public/public.module';
import { ToolsModule } from './modules/tools/tools.module';
import { ChatModule } from './modules/chat/chat.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    PublicModule,
    AdminModule,
    ToolsModule,
    ChatModule,
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100, // 调高限制，避免调试时频繁触发 429
      },
    ]),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
