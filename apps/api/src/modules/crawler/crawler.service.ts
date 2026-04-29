import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service.js';
import { JuejinStrategy } from './strategies/juejin.strategy.js';
import { BaseStrategy } from './strategies/base.strategy.js';
import { CrawledPostDto } from './dto/crawled-post.dto.js';
import GithubSlugger from 'github-slugger';
import { ReadabilityHelper } from './transformers/readability.helper.js';
import { TurndownHelper } from './transformers/turndown.helper.js';
import { OssUploaderService } from './transformers/oss-uploader.service.js';

@Injectable()
export class CrawlerService {
  private readonly logger = new Logger(CrawlerService.name);
  private readonly slugger = new GithubSlugger();
  private readonly strategies: BaseStrategy[];

  constructor(
    private readonly prisma: PrismaService,
    private readonly juejinStrategy: JuejinStrategy,
    private readonly readabilityHelper: ReadabilityHelper,
    private readonly turndownHelper: TurndownHelper,
    private readonly ossUploader: OssUploaderService,
  ) {
    this.strategies = [this.juejinStrategy];
  }

  /**
   * 执行每日爬取任务 (每日凌晨 2:00)
   */
  @Cron('0 2 * * *')
  async runDailyCrawl() {
    this.logger.log('Starting daily crawl task...');

    let totalImported = 0;
    let totalFetched = 0;
    const allResults: CrawledPostDto[] = [];

    for (const strategy of this.strategies) {
      this.logger.log(`Fetching hot list from ${strategy.platform}...`);
      const posts = await strategy.fetchHotList();
      totalFetched += posts.length;
      this.logger.log(`Fetched ${posts.length} potential posts from ${strategy.platform}.`);

      for (const post of posts) {
        // 1. 去重校验：基于 originalUrl
        const existing = await (this.prisma.post as any).findUnique({
          where: { originalUrl: post.originalUrl },
        });

        if (existing) {
          this.logger.debug(`Post already exists, skipping: ${post.title}`);
          continue;
        }

        // 2. 抓取详情并解析正文 (M2 核心)
        const detail = await strategy.fetchDetail(post.originalUrl);
        if (detail.content) {
          const extracted = this.readabilityHelper.extract(
            detail.content,
            post.originalUrl,
          );
          if (extracted && extracted.content) {
            // 将 HTML 转为 Markdown
            const markdown = this.turndownHelper.toMarkdown(extracted.content);

            // 处理图片转储 (M2 核心)
            post.content = await this.ossUploader.processMarkdownImages(markdown);

            // 如果封面图为空，尝试从内容中提取第一张图作为封面
            if (!post.coverUrl) {
              const firstImg = this.ossUploader.extractFirstImage(post.content);
              if (firstImg) {
                post.coverUrl = firstImg;
              }
            }

            // 补充 canonicalUrl
            post.canonicalUrl = post.originalUrl;
          }
        }

        // 处理封面图转储
        if (post.coverUrl) {
          post.coverUrl = await this.ossUploader.uploadImage(post.coverUrl);
        }

        const success = await this.importPost(post);
        if (success) {
          totalImported++;
          allResults.push(post);
        }
      }
    }

    this.logger.log(
      `Daily crawl task finished. Imported ${totalImported} new posts in total.`,
    );
    return {
      importedCount: totalImported,
      totalFetched: totalFetched,
      data: allResults,
    };
  }

  /**
   * 导入单篇文章并进行去重校验
   */
  private async importPost(dto: CrawledPostDto): Promise<boolean> {
    try {
      // 生成唯一的 slug
      let slug = this.slugger.slug(dto.title);
      // 检查 slug 冲突
      const slugExists = await this.prisma.post.findUnique({ where: { slug } });
      if (slugExists) {
        slug = `${slug}-${dto.externalId}`;
      }

      // 3. 写入数据库 (默认为 draft 状态)
      await (this.prisma.post as any).create({
        data: {
          title: dto.title,
          slug: slug,
          contentMarkdown: dto.content || '',
          excerpt: dto.excerpt,
          coverUrl: dto.coverUrl,
          originalUrl: dto.originalUrl,
          externalId: dto.externalId,
          platform: dto.platform,
          canonicalUrl: dto.canonicalUrl,
          sourceType: 'crawler',
          status: 'draft',
          // 标签处理：M2 阶段暂不处理复杂的 PostTag 关联，仅作为后续扩展
        },
      });

      return true;
    } catch (error) {
      this.logger.error(`Failed to import post ${dto.title}: ${error.message}`);
      return false;
    }
  }
}
