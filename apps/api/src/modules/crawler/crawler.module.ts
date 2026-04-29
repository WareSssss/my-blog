import { Module } from '@nestjs/common';
import { CrawlerService } from './crawler.service.js';
import { JuejinStrategy } from './strategies/juejin.strategy.js';
import { PrismaModule } from '../../prisma/prisma.module.js';
import { ReadabilityHelper } from './transformers/readability.helper.js';
import { TurndownHelper } from './transformers/turndown.helper.js';
import { OssUploaderService } from './transformers/oss-uploader.service.js';
import { R2StorageService } from './transformers/r2-storage.service.js';

@Module({
  imports: [PrismaModule],
  providers: [
    CrawlerService,
    JuejinStrategy,
    ReadabilityHelper,
    TurndownHelper,
    OssUploaderService,
    R2StorageService,
  ],
  exports: [CrawlerService],
})
export class CrawlerModule {}
