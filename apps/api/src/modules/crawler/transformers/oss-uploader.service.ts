import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { R2StorageService } from './r2-storage.service.js';

@Injectable()
export class OssUploaderService {
  private readonly logger = new Logger(OssUploaderService.name);
  private readonly uploadDir = path.join(process.cwd(), 'public', 'uploads', 'crawler');

  constructor(private readonly r2Storage: R2StorageService) {
    // 确保上传目录存在
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  /**
   * 下载并上传图片
   * @param imageUrl 原始图片 URL
   * @returns 转储后的图片 URL
   */
  async uploadImage(imageUrl: string): Promise<string> {
    if (!imageUrl || imageUrl.startsWith('http://localhost') || imageUrl.startsWith('/') || imageUrl.includes('cloudflarestorage.com')) {
      return imageUrl;
    }

    try {
      const response = await axios.get(imageUrl, {
        responseType: 'arraybuffer',
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': new URL(imageUrl).origin,
        },
      });

      const contentType = response.headers['content-type'] as string;
      const extension = this.getExtension(contentType) || '.jpg';
      const fileName = `${uuidv4()}${extension}`;

      // 优先使用 R2 存储
      if (this.r2Storage.isAvailable()) {
        return await this.r2Storage.upload(response.data, fileName, contentType);
      }

      // 备选方案：保存到本地 public 目录
      const filePath = path.join(this.uploadDir, fileName);
      fs.writeFileSync(filePath, response.data);

      const siteUrl = process.env.SITE_URL;
      if (siteUrl) {
        const formattedUrl = siteUrl.startsWith('http') ? siteUrl : `https://${siteUrl}`;
        return `${formattedUrl.replace(/\/$/, '')}/public/uploads/crawler/${fileName}`;
      }
      
      return `/public/uploads/crawler/${fileName}`;
    } catch (error) {
      this.logger.error(`Failed to download/upload image ${imageUrl}: ${error.message}`);
      return imageUrl;
    }
  }

  /**
   * 批量处理 Markdown 中的图片
   */
  async processMarkdownImages(markdown: string): Promise<string> {
    if (!markdown) return '';

    const imgRegex = /!\[.*?\]\((.*?)\)/g;
    let match;
    let processedMarkdown = markdown;
    const matches: string[] = [];

    while ((match = imgRegex.exec(markdown)) !== null) {
      matches.push(match[1]);
    }

    // 建议并行处理以提高效率
    for (const originalUrl of matches) {
      const newUrl = await this.uploadImage(originalUrl);
      if (newUrl !== originalUrl) {
        processedMarkdown = processedMarkdown.replace(originalUrl, newUrl);
      }
    }

    return processedMarkdown;
  }

  /**
   * 从 Markdown 中提取第一张图片的 URL
   */
  extractFirstImage(markdown: string): string | null {
    if (!markdown) return null;
    const imgRegex = /!\[.*?\]\((.*?)\)/;
    const match = markdown.match(imgRegex);
    return match ? match[1] : null;
  }

  private getExtension(contentType: string): string {
    const map: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/gif': '.gif',
      'image/webp': '.webp',
      'image/svg+xml': '.svg',
    };
    return map[contentType] || '';
  }
}
