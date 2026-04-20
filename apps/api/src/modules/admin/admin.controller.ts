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
import { PrismaService } from '../../prisma/prisma.service';
import { AdminTokenGuard } from '../../common/guards/admin-token.guard';
import { ToolStatus } from '@prisma/client';

@UseGuards(AdminTokenGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly prisma: PrismaService) {}

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
}
