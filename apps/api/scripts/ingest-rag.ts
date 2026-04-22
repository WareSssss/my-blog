import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';
import { QdrantClient } from '@qdrant/js-client-rest';
import OpenAI from 'openai';

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

  // 1. 确保集合存在
  const collections = await qdrant.getCollections();
  const exists = collections.collections.some(c => c.name === COLLECTION_NAME);
  
  if (!exists) {
    console.log(`Creating collection ${COLLECTION_NAME}...`);
    await qdrant.createCollection(COLLECTION_NAME, {
      vectors: {
        size: 1536, // text-embedding-3-small 维度
        distance: 'Cosine',
      },
    });
  }

  // 2. 扫描文章
  const repoRoot = path.resolve(__dirname, '..', '..', '..');
  const postsDir = path.join(repoRoot, 'posts');
  const files = await fs.readdir(postsDir);
  const mdFiles = files.filter(f => f.endsWith('.md'));

  for (const file of mdFiles) {
    const filePath = path.join(postsDir, file);
    const raw = await fs.readFile(filePath, 'utf8');
    const { data, content } = matter(raw);
    const title = data.title || file;
    const slug = data.slug || path.basename(file, '.md');
    const url = `/blog/${slug}`;

    console.log(`Processing ${title}...`);

    // 简单按段落切片
    const chunks = content
      .split('\n\n')
      .map(c => c.trim())
      .filter(c => c.length > 50);

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const embeddingResponse = await openai.embeddings.create({
        model: 'text-embedding-3-small',
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
}

main().catch(console.error);
