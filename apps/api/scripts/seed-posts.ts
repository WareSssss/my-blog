import { PrismaClient, PostStatus } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

// 加载 .env 文件
dotenv.config({ path: path.join(__dirname, '../.env') });

function createPrisma() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL is required');
  const pool = new Pool({ connectionString: databaseUrl });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

const prisma = createPrisma();

async function main() {
  console.log('开始生成 Mock 数据...');

  // 1. 确保有一个分类
  const category = await prisma.category.upsert({
    where: { slug: 'tech' },
    update: {},
    create: {
      name: '技术分享',
      slug: 'tech',
      sort: 1,
    },
  });

  // 2. 确保有一些标签
  const tags = await Promise.all([
    prisma.tag.upsert({ where: { slug: 'ai' }, update: {}, create: { name: 'AI', slug: 'ai' } }),
    prisma.tag.upsert({ where: { slug: 'react' }, update: {}, create: { name: 'React', slug: 'react' } }),
    prisma.tag.upsert({ where: { slug: 'node' }, update: {}, create: { name: 'Node.js', slug: 'node' } }),
  ]);

  // 3. 批量创建 20 篇文章
  const mockPosts = Array.from({ length: 20 }).map((_, i) => {
    const id = i + 1;
    return {
      title: `Mock 文章标题 ${id}: 探索 AI 驱动的未来开发`,
      slug: `mock-post-${id}`,
      excerpt: `这是第 ${id} 篇 Mock 文章的摘要。我们将深入探讨如何利用人工智能工具提升开发效率，从代码生成到架构设计，AI 正在重塑我们的工作流。`,
      contentMarkdown: `## 这是第 ${id} 篇文章的正文内容\n\nAI 正在改变世界...`,
      status: PostStatus.published,
      categoryId: category.id,
      publishedAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000), // 每篇间隔一天
      coverUrl: `https://picsum.photos/seed/${id + 100}/800/450`, // 使用 picsum 生成随机图片
      readTimeMinutes: Math.floor(Math.random() * 10) + 5,
    };
  });

  for (const postData of mockPosts) {
    const post = await prisma.post.upsert({
      where: { slug: postData.slug },
      update: postData,
      create: postData,
    });

    // 关联标签
    for (const tag of tags) {
      await prisma.postTag.upsert({
        where: { postId_tagId: { postId: post.id, tagId: tag.id } },
        update: {},
        create: { postId: post.id, tagId: tag.id },
      });
    }

    // 初始化统计数据
    await prisma.postStats.upsert({
      where: { postId: post.id },
      update: {},
      create: {
        postId: post.id,
        views: BigInt(Math.floor(Math.random() * 1000)),
        likes: BigInt(Math.floor(Math.random() * 100)),
      },
    });
  }

  console.log('Mock 数据生成完毕！');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
