import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Query,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { renderMarkdown } from '../../common/markdown/markdown';

function weatherTextFromCode(code: number) {
  if (code === 0) return '晴';
  if (code === 1 || code === 2 || code === 3) return '多云';
  if (code === 45 || code === 48) return '雾';
  if (code === 51 || code === 53 || code === 55) return '毛毛雨';
  if (code === 56 || code === 57) return '冻雨';
  if (code === 61 || code === 63 || code === 65) return '雨';
  if (code === 66 || code === 67) return '冻雨';
  if (code === 71 || code === 73 || code === 75) return '雪';
  if (code === 77) return '雪粒';
  if (code === 80 || code === 81 || code === 82) return '阵雨';
  if (code === 85 || code === 86) return '阵雪';
  if (code === 95) return '雷暴';
  if (code === 96 || code === 99) return '雷暴冰雹';
  return '未知';
}

async function fetchJson<T>(url: string, headers?: Record<string, string>) {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(10_000),
    headers,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Upstream ${res.status}: ${text || res.statusText}`);
  }
  return (await res.json()) as T;
}

@Controller('public')
export class PublicController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('site/profile')
  async getProfile() {
    const setting = await this.prisma.siteSetting.findUnique({
      where: { key: 'profile' },
    });
    return setting?.value ?? null;
  }

  @Get('site/tech-stack')
  async getTechStack() {
    const setting = await this.prisma.siteSetting.findUnique({
      where: { key: 'tech-stack' },
    });
    return setting?.value ?? [];
  }

  @Get('site/contacts')
  async getContacts() {
    const setting = await this.prisma.siteSetting.findUnique({
      where: { key: 'contacts' },
    });
    return setting?.value ?? null;
  }

  @Get('site/ai')
  async getAiConfig() {
    const setting = await this.prisma.siteSetting.findUnique({
      where: { key: 'ai' },
    });
    return setting?.value ?? null;
  }

  @Get('categories')
  async getCategories() {
    const categories = await this.prisma.category.findMany({
      orderBy: [{ sort: 'asc' }, { name: 'asc' }],
      select: { id: true, name: true, slug: true, sort: true },
    });
    return categories;
  }

  @Get('tool-categories')
  async getToolCategories() {
    return this.prisma.toolCategory.findMany({
      orderBy: [{ sort: 'asc' }, { name: 'asc' }],
      select: { id: true, name: true, slug: true, sort: true },
    });
  }

  @Get('tools')
  async getTools() {
    return this.prisma.tool.findMany({
      orderBy: [{ sort: 'asc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        name: true,
        description: true,
        icon: true,
        status: true,
        routePath: true,
        externalUrl: true,
        tags: true,
        sort: true,
        categoryId: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  @Get('posts')
  async getPosts(
    @Query('category') categorySlug?: string,
    @Query('tag') tagSlug?: string,
    @Query('q') q?: string,
    @Query('page') pageRaw?: string,
    @Query('pageSize') pageSizeRaw?: string,
  ) {
    const page = Math.max(1, Number(pageRaw ?? 1) || 1);
    const pageSize = Math.min(50, Math.max(1, Number(pageSizeRaw ?? 10) || 10));
    const skip = (page - 1) * pageSize;
    const query = (q ?? '').trim();

    const where = {
      status: 'published' as const,
      ...(categorySlug ? { category: { slug: categorySlug } } : {}),
      ...(tagSlug ? { tags: { some: { tag: { slug: tagSlug } } } } : {}),
      ...(query
        ? {
            OR: [
              { title: { contains: query, mode: 'insensitive' as const } },
              { excerpt: { contains: query, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [total, items] = await this.prisma.$transaction([
      this.prisma.post.count({ where }),
      this.prisma.post.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
        include: {
          category: { select: { name: true, slug: true } },
          stats: { select: { views: true, likes: true } },
          tags: { include: { tag: { select: { name: true, slug: true } } } },
        },
      }),
    ]);

    return {
      items: items.map((p) => ({
        id: p.id,
        slug: p.slug,
        title: p.title,
        excerpt: p.excerpt,
        category: p.category,
        tags: p.tags.map((t) => t.tag),
        publishedAt: p.publishedAt,
        readTimeMinutes: p.readTimeMinutes,
        views: p.stats ? Number(p.stats.views) : 0,
        likes: p.stats ? Number(p.stats.likes) : 0,
      })),
      pageInfo: { page, pageSize, total },
    };
  }

  @Get('posts/:slug')
  async getPostDetail(@Param('slug') slug: string) {
    const post = await this.prisma.post.findUnique({
      where: { slug },
      include: {
        category: { select: { name: true, slug: true } },
        stats: { select: { views: true, likes: true } },
        tags: { include: { tag: { select: { name: true, slug: true } } } },
      },
    });

    if (!post || post.status !== 'published') {
      throw new NotFoundException('post not found');
    }

    const markdown = post.contentMarkdown ?? '';
    const rendered = markdown
      ? await renderMarkdown(markdown)
      : { html: '', toc: [] };

    return {
      id: post.id,
      slug: post.slug,
      title: post.title,
      excerpt: post.excerpt,
      category: post.category,
      tags: post.tags.map((t) => t.tag),
      publishedAt: post.publishedAt,
      readTimeMinutes: post.readTimeMinutes,
      views: post.stats ? Number(post.stats.views) : 0,
      likes: post.stats ? Number(post.stats.likes) : 0,
      contentMarkdown: markdown,
      contentHtml: rendered.html,
      toc: rendered.toc,
    };
  }

  @Get('weather')
  async getWeather(
    @Query('lat') latRaw?: string,
    @Query('lon') lonRaw?: string,
  ) {
    const lat = Number(latRaw);
    const lon = Number(lonRaw);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return { error: 'lat/lon is required' };
    }

    const geo = await fetchJson<{
      city?: string;
      locality?: string;
      principalSubdivision?: string;
      countryName?: string;
    }>(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${encodeURIComponent(
        String(lat),
      )}&longitude=${encodeURIComponent(String(lon))}&localityLanguage=zh`,
    ).catch(() => ({
      city: undefined,
      locality: undefined,
      principalSubdivision: undefined,
      countryName: undefined,
    }));

    const city =
      geo.city ??
      geo.locality ??
      geo.principalSubdivision ??
      geo.countryName ??
      '当前位置';

    const forecast = await fetchJson<{
      current_weather?: {
        temperature: number;
        weathercode: number;
        windspeed: number;
        time: string;
      };
      daily?: {
        time: string[];
        temperature_2m_max: number[];
        temperature_2m_min: number[];
        weathercode: number[];
      };
    }>(
      `https://api.open-meteo.com/v1/forecast?latitude=${encodeURIComponent(
        String(lat),
      )}&longitude=${encodeURIComponent(
        String(lon),
      )}&current_weather=true&daily=temperature_2m_max,temperature_2m_min,weathercode&timezone=auto`,
    );

    const current = forecast.current_weather;
    const daily = forecast.daily;

    return {
      city,
      current: current
        ? {
            temperatureC: current.temperature,
            windSpeedKmh: current.windspeed,
            weatherCode: current.weathercode,
            text: weatherTextFromCode(current.weathercode),
            time: current.time,
          }
        : null,
      daily: daily
        ? daily.time.slice(0, 5).map((date, idx) => ({
            date,
            maxC: daily.temperature_2m_max[idx],
            minC: daily.temperature_2m_min[idx],
            weatherCode: daily.weathercode[idx],
            text: weatherTextFromCode(daily.weathercode[idx]),
          }))
        : [],
    };
  }
}
