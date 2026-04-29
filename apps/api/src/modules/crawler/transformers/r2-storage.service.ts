import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class R2StorageService {
  private client: S3Client;
  private readonly logger = new Logger(R2StorageService.name);

  constructor() {
    // 只有在配置了环境变量时才初始化
    if (process.env.R2_ACCESS_KEY_ID && process.env.R2_ENDPOINT) {
      this.client = new S3Client({
        region: "auto",
        credentials: {
          accessKeyId: process.env.R2_ACCESS_KEY_ID,
          secretAccessKey: process.env.R2_ACCESS_KEY_SECRET || '',
        },
        endpoint: process.env.R2_ENDPOINT,
      });
      this.logger.log('Cloudflare R2 Storage initialized.');
    } else {
      this.logger.warn('Cloudflare R2 credentials missing. Falling back to local storage.');
    }
  }

  /**
   * 上传文件到 Cloudflare R2
   */
  async upload(buffer: Buffer, fileName: string, contentType: string): Promise<string> {
    if (!this.client) {
      throw new Error('R2 Client not initialized');
    }

    const key = `crawler/${fileName}`;
    try {
      await this.client.send(new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      }));
      
      // 返回公开访问地址
      const publicUrl = process.env.R2_PUBLIC_URL?.replace(/\/$/, '');
      return `${publicUrl}/${key}`;
    } catch (error) {
      this.logger.error(`R2 Upload Failed for ${fileName}: ${error.message}`);
      throw error;
    }
  }

  /**
   * 检查 R2 是否可用
   */
  isAvailable(): boolean {
    return !!this.client && !!process.env.R2_BUCKET_NAME && !!process.env.R2_PUBLIC_URL;
  }
}
