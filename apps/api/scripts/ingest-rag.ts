import 'dotenv/config';
import { QdrantClient } from '@qdrant/js-client-rest';
import OpenAI from 'openai';
import crypto from 'node:crypto';

const COLLECTION_NAME = 'blog_knowledge_base';

async function main() {
  const apiKey = process.env.OPENAI_API_KEY;
  const qdrantUrl = process.env.QDRANT_URL;
  
  if (!apiKey || !qdrantUrl) {
    console.error('Missing OPENAI_API_KEY or QDRANT_URL');
    process.exit(1);
  }

  const openai = new OpenAI({
    apiKey,
    baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
  });

  const qdrant = new QdrantClient({
    url: qdrantUrl,
    apiKey: process.env.QDRANT_API_KEY,
  });

  try {
    // 1. 确保集合存在
    const collections = await qdrant.getCollections();
    const exists = collections.collections.some(c => c.name === COLLECTION_NAME);
    
    if (exists) {
      console.log(`Deleting existing collection ${COLLECTION_NAME} to update vector dimension...`);
      await qdrant.deleteCollection(COLLECTION_NAME);
    }

    console.log(`Creating collection ${COLLECTION_NAME}...`);
    await qdrant.createCollection(COLLECTION_NAME, {
      vectors: {
        size: 1024, // text-embedding-v3 维度
        distance: 'Cosine',
      },
    });

    // 2. 获取文章
    // 从数据库获取已发布的文章
    const { default: pkg } = await import('pg');
    const { Pool } = pkg;
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const { rows: posts } = await pool.query('SELECT id, title, slug, content_markdown FROM posts WHERE status = \'published\'');
    
    if (posts.length === 0) {
      console.warn('No published posts found in database. Please run import-posts first.');
      await pool.end();
      return;
    }

    for (const post of posts) {
      const { title, slug, content_markdown: content } = post;
      const url = `/blog/${slug}`;

      if (!content) continue;
      console.log(`Processing ${title}...`);

      // 优化切片逻辑：固定长度切片并引入重叠度 (Overlap)
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
        if (trimmedChunk.length > 50) {
          chunks.push(trimmedChunk);
        }
      }

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const embeddingResponse = await openai.embeddings.create({
          model: 'text-embedding-v3',
          input: chunk.replace(/\n/g, ' '),
        });
        const vector = embeddingResponse.data[0].embedding;

        await qdrant.upsert(COLLECTION_NAME, {
          points: [
            {
              id: crypto.randomUUID(),
              vector,
              payload: {
                content: chunk,
                title,
                url,
                slug,
                chunkIndex: i,
              },
            },
          ],
        });
      }
    }

    console.log('RAG Ingestion completed!');
    await pool.end();
  } catch (error) {
    console.error('Ingestion failed:', error);
  }
}

main().catch(console.error);
