import { Injectable, OnModuleInit } from '@nestjs/common';
import { QdrantClient } from '@qdrant/js-client-rest';
import OpenAI from 'openai';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class KbService implements OnModuleInit {
  private qdrant: QdrantClient | null = null;
  private openai: OpenAI | null = null;
  private readonly COLLECTION_NAME = 'blog_knowledge_base';

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit() {
    if (process.env.QDRANT_URL) {
      this.qdrant = new QdrantClient({
        url: process.env.QDRANT_URL,
        apiKey: process.env.QDRANT_API_KEY,
      });
    }

    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
        baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
      });
    }
  }

  async getEmbedding(text: string) {
    if (!this.openai) throw new Error('OpenAI API Key not configured');
    
    // 统一使用阿里云百炼推荐的向量模型
    const model = 'text-embedding-v3';

    try {
      const response = await this.openai.embeddings.create({
        model,
        input: text.replace(/\n/g, ' '),
      });
      return response.data[0].embedding;
    } catch (e) {
      console.error(`Embedding failed with model ${model}:`, e.message);
      return null;
    }
  }

  async search(query: string, limit = 5) {
    if (!this.qdrant || !this.openai) {
      return [];
    }

    const vector = await this.getEmbedding(query);
    if (!vector) return [];

    try {
      const results = await this.qdrant.search(this.COLLECTION_NAME, {
        vector,
        limit,
        with_payload: true,
      });

      return results.map((r) => ({
        content: r.payload?.content as string,
        title: r.payload?.title as string,
        url: r.payload?.url as string,
        score: r.score,
      }));
    } catch (e) {
      console.error('Qdrant search failed:', e.message);
      return [];
    }
  }

  // 更多 ETL 方法将在下一步脚本中实现
}
