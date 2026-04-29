export class CrawledPostDto {
  title: string;
  originalUrl: string;
  excerpt?: string;
  content?: string; // HTML 或 Markdown 内容
  coverUrl?: string;
  authorName?: string;
  tags?: string[];
  publishDate?: Date;
  platform: string;
  externalId: string; // 平台内部的唯一 ID，用于去重
  canonicalUrl?: string;
}
