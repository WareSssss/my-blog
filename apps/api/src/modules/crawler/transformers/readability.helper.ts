import { Injectable, Logger } from '@nestjs/common';
import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';

@Injectable()
export class ReadabilityHelper {
  private readonly logger = new Logger(ReadabilityHelper.name);

  /**
   * 从 HTML 中提取正文内容
   * @param html 原始 HTML 字符串
   * @param url 文章来源 URL（用于处理相对路径图片等）
   */
  extract(html: string, url: string) {
    try {
      const dom = new JSDOM(html, { url });
      const reader = new Readability(dom.window.document);
      const article = reader.parse();

      if (!article) {
        throw new Error('Readability failed to parse article');
      }

      return {
        title: article.title,
        content: article.content, // HTML 格式的正文
        textContent: article.textContent,
        excerpt: article.excerpt,
        byline: article.byline,
        siteName: article.siteName,
      };
    } catch (error) {
      this.logger.error(`Failed to extract content with Readability: ${error.message}`);
      return null;
    }
  }
}
