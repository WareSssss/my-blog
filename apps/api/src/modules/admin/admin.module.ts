import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { KbModule } from '../kb/kb.module';
import { CrawlerModule } from '../crawler/crawler.module.js';

@Module({
  imports: [KbModule, CrawlerModule],
  controllers: [AdminController],
})
export class AdminModule {}
