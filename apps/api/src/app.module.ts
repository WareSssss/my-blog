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
        name: 'short',
        ttl: 1000,
        limit: 3, // 每秒最多 3 次请求
      },
      {
        name: 'medium',
        ttl: 10000,
        limit: 20, // 10 秒内最多 20 次请求
      },
      {
        name: 'long',
        ttl: 60000,
        limit: 100, // 每分钟最多 100 次请求
      },
    ]),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
