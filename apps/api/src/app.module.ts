import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AdminModule } from './modules/admin/admin.module';
import { PublicModule } from './modules/public/public.module';
import { ToolsModule } from './modules/tools/tools.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [PrismaModule, PublicModule, AdminModule, ToolsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
