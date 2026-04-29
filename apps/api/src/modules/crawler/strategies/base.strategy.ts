import { CrawledPostDto } from '../dto/crawled-post.dto.js';

export abstract class BaseStrategy {
  /**
   * 平台标识，如 'juejin', 'csdn'
   */
  abstract readonly platform: string;

  /**
   * 抓取热门文章列表
   */
  abstract fetchHotList(): Promise<CrawledPostDto[]>;

  /**
   * 抓取单篇文章详情
   * @param url 文章原文链接
   */
  abstract fetchDetail(url: string): Promise<Partial<CrawledPostDto>>;
}
