import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AdminTokenGuard } from '../../common/guards/admin-token.guard.js';
import { ToolStatus } from '@prisma/client';
import { KbService } from '../kb/kb.service.js';
import { CrawlerService } from '../crawler/crawler.service.js';

@UseGuards(AdminTokenGuard)
@Controller('admin')
export class AdminController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly kbService: KbService,
    private readonly crawlerService: CrawlerService,
  ) {}

  @Post('crawler/run')
  async runCrawler() {
    return this.crawlerService.runDailyCrawl();
  }

  @Get('site-settings')
  async listSiteSettings() {
    return this.prisma.siteSetting.findMany({
      orderBy: [{ key: 'asc' }],
      select: {
        id: true,
        key: true,
        value: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  @Put('site-settings/:key')
  async upsertSiteSetting(
    @Param('key') key: string,
    @Body() body: { value?: unknown },
  ) {
    if (!key) {
      throw new BadRequestException('key is required');
    }
    if (!('value' in (body ?? {}))) {
      throw new BadRequestException('value is required');
    }

    const existing = await this.prisma.siteSetting.findUnique({
      where: { key },
    });
    if (existing) {
      return this.prisma.siteSetting.update({
        where: { key },
        data: { value: body.value as never },
        select: {
          id: true,
          key: true,
          value: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    }
    return this.prisma.siteSetting.create({
      data: { key, value: body.value as never },
      select: {
        id: true,
        key: true,
        value: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  @Get('tools')
  async listTools() {
    return this.prisma.tool.findMany({
      orderBy: [{ sort: 'asc' }, { createdAt: 'desc' }],
    });
  }

  @Post('tools')
  async createTool(
    @Body()
    body: {
      name?: string;
      description?: string;
      icon?: string;
      status?: ToolStatus;
      categoryId?: string | null;
      routePath?: string | null;
      externalUrl?: string | null;
      tags?: string[];
      sort?: number;
    },
  ) {
    if (!body?.name) {
      throw new BadRequestException('name is required');
    }
    return this.prisma.tool.create({
      data: {
        name: body.name,
        description: body.description,
        icon: body.icon,
        status: body.status ?? ToolStatus.coming_soon,
        categoryId: body.categoryId ?? null,
        routePath: body.routePath ?? null,
        externalUrl: body.externalUrl ?? null,
        tags: Array.isArray(body.tags) ? body.tags : [],
        sort: typeof body.sort === 'number' ? body.sort : 0,
      },
    });
  }

  @Put('tools/:id')
  async updateTool(
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      description?: string | null;
      icon?: string | null;
      status?: ToolStatus;
      categoryId?: string | null;
      routePath?: string | null;
      externalUrl?: string | null;
      tags?: string[];
      sort?: number;
    },
  ) {
    return this.prisma.tool.update({
      where: { id },
      data: {
        name: body.name,
        description: body.description ?? undefined,
        icon: body.icon ?? undefined,
        status: body.status,
        categoryId: body.categoryId ?? undefined,
        routePath: body.routePath ?? undefined,
        externalUrl: body.externalUrl ?? undefined,
        tags: Array.isArray(body.tags) ? body.tags : undefined,
        sort: typeof body.sort === 'number' ? body.sort : undefined,
      },
    });
  }

  @Delete('tools/:id')
  async deleteTool(@Param('id') id: string) {
    return this.prisma.tool.delete({ where: { id } });
  }

  @Get('tool-categories')
  async listToolCategories() {
    return this.prisma.toolCategory.findMany({
      orderBy: [{ sort: 'asc' }, { name: 'asc' }],
    });
  }

  @Post('tool-categories')
  async createToolCategory(
    @Body() body: { name?: string; slug?: string; sort?: number },
  ) {
    if (!body?.name || !body?.slug) {
      throw new BadRequestException('name and slug are required');
    }
    return this.prisma.toolCategory.create({
      data: {
        name: body.name,
        slug: body.slug,
        sort: typeof body.sort === 'number' ? body.sort : 0,
      },
    });
  }

  @Put('tool-categories/:id')
  async updateToolCategory(
    @Param('id') id: string,
    @Body() body: { name?: string; slug?: string; sort?: number },
  ) {
    return this.prisma.toolCategory.update({
      where: { id },
      data: {
        name: body.name,
        slug: body.slug,
        sort: typeof body.sort === 'number' ? body.sort : undefined,
      },
    });
  }

  @Delete('tool-categories/:id')
  async deleteToolCategory(@Param('id') id: string) {
    return this.prisma.toolCategory.delete({ where: { id } });
  }

  @Post('kb/rebuild')
  async rebuildKb() {
    try {
      // 获取所有已发布的文章
      const posts = await this.prisma.post.findMany({
        where: { status: 'published' },
      });

      if (posts.length === 0) {
        return { message: 'No published posts to index' };
      }

      // 注意：这里为了简化，我们直接在 Controller 中调用逻辑
      // 生产环境下建议通过异步队列处理
      let totalChunks = 0;
      for (const post of posts) {
        // 切片并向量化
        const content = post.contentMarkdown;
        if (!content) continue;

        const CHUNK_SIZE = 800;
        const CHUNK_OVERLAP = 150;
        const chunks: string[] = [];
        let start = 0;
        while (start < content.length) {
          const end = start + CHUNK_SIZE;
          let chunk = content.substring(start, end);
          if (end < content.length) {
            const lastNewline = chunk.lastIndexOf('\n');
            const lastPeriod = chunk.lastIndexOf('。');
            const breakPoint = lastNewline > CHUNK_SIZE * 0.8 ? lastNewline : (lastPeriod > CHUNK_SIZE * 0.8 ? lastPeriod : chunk.length);
            chunk = content.substring(start, start + breakPoint);
            start += breakPoint - CHUNK_OVERLAP;
          } else {
            start = end;
          }
          const trimmedChunk = chunk.trim();
          if (trimmedChunk.length > 50) chunks.push(trimmedChunk);
        }

        // 写入向量库
        for (let i = 0; i < chunks.length; i++) {
          const vector = await this.kbService.getEmbedding(chunks[i]);
          if (vector) {
            // 这里我们复用 KbService 的内部逻辑或直接调用 Qdrant
            // 为了保持解耦，建议在 KbService 中暴露一个 upsert 方法
            // 这里暂定调用我们将要添加的 kbService.upsertChunk
            await (this.kbService as any).upsertChunk({
              id: `${post.id}-${i}`,
              vector,
              payload: {
                content: chunks[i],
                title: post.title,
                url: `/blog/${post.slug}`,
                slug: post.slug,
                chunkIndex: i,
              },
            });
            totalChunks++;
          }
        }
      }

      return { message: 'KB Rebuild successful', totalPosts: posts.length, totalChunks };
    } catch (error) {
      console.error('KB Rebuild failed:', error);
      throw new BadRequestException('KB Rebuild failed: ' + error.message);
    }
  }
}
