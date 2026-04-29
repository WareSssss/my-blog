import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { BaseStrategy } from './base.strategy.js';
import { CrawledPostDto } from '../dto/crawled-post.dto.js';

@Injectable()
export class JuejinStrategy extends BaseStrategy {
  private readonly logger = new Logger(JuejinStrategy.name);
  readonly platform = 'juejin';

  async fetchHotList(): Promise<CrawledPostDto[]> {
    try {
      const response = await axios.post(
        'https://api.juejin.cn/recommend_api/v1/article/recommend_all_feed',
        {
          client_type: 2608,
          cursor: '0',
          id_type: 2,
          limit: 20,
          sort_type: 200, // 热门排序
        },
      );

      const items = response.data?.data || [];
      return items
        .filter((item: any) => item.item_type === 2) // 过滤出文章类型
        .map((item: any) => {
          const info = item.item_info;
          return {
            title: info.article_info.title,
            originalUrl: `https://juejin.cn/post/${info.article_id}`,
            excerpt: info.article_info.brief_content,
            coverUrl: info.article_info.cover_image,
            authorName: info.author_user_info.user_name,
            tags: info.tags?.map((t: any) => t.tag_name) || [],
            publishDate: new Date(parseInt(info.article_info.ctime) * 1000),
            platform: this.platform,
            externalId: info.article_id,
          };
        });
    } catch (error) {
      this.logger.error(`Failed to fetch Juejin hot list: ${error.message}`);
      return [];
    }
  }

  async fetchDetail(url: string): Promise<Partial<CrawledPostDto>> {
    try {
      // 掘金的文章页面是 SSR 的，可以直接通过 axios 获取 HTML
      const response = await axios.get(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      });
      return {
        content: response.data, // 返回原始 HTML，后续由 Readability 处理
      };
    } catch (error) {
      this.logger.error(`Failed to fetch Juejin detail from ${url}: ${error.message}`);
      return {};
    }
  }
}
