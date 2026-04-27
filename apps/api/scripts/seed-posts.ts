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

const realCategories = [
  { name: '技术架构', slug: 'architecture' },
  { name: '前端开发', slug: 'frontend' },
  { name: '人工智能', slug: 'ai-ml' },
  { name: '产品随笔', slug: 'product' },
];

const realTags = [
  { name: 'React', slug: 'react' },
  { name: 'TypeScript', slug: 'typescript' },
  { name: 'Next.js', slug: 'nextjs' },
  { name: 'LLM', slug: 'llm' },
  { name: '微服务', slug: 'microservices' },
  { name: '性能优化', slug: 'performance' },
];

const realPostTemplates = [
  {
    title: '深入浅出微服务架构：从单体到分布式的演进之路',
    excerpt: '探讨企业级应用如何通过微服务架构实现高可用与横向扩展，解析核心组件如服务发现、配置中心与 API 网关。',
    content: '## 什么是微服务？\n\n微服务是一种架构风格，它将单一应用程序开发为一组小型服务...\n\n### 核心优势\n1. 独立部署\n2. 技术栈灵活\n3. 故障隔离\n\n### 面临的挑战\n- 分布式事务\n- 服务治理复杂度',
  },
  {
    title: '2024 年前端技术趋势：Serverless 与边缘计算的崛起',
    excerpt: '分析 Next.js 14 与 React Server Components 如何重塑网页性能瓶颈，以及边缘函数带来的极致响应速度。',
    content: '## 前端的下半场\n\n随着 Vercel 等平台的兴起，Serverless 已经成为现代前端开发的标配...\n\n### React Server Components (RSC)\nRSC 允许我们在服务器上预渲染组件，减少客户端 JavaScript 体积...',
  },
  {
    title: '大语言模型 (LLM) 应用开发指南：从 Prompt Engineering 到 RAG',
    excerpt: '如何利用 LangChain 和向量数据库构建属于自己的 AI 知识库，解决大模型幻觉问题并提升回答准确性。',
    content: '## RAG 架构解析\n\n检索增强生成（Retrieval-Augmented Generation）是目前解决私有数据问答的最佳方案...\n\n### 向量存储\n我们通常使用 Pinecone 或 Milvus 来存储文本嵌入向量...',
  },
  {
    title: 'TypeScript 高级技巧：利用类型体操提升代码健壮性',
    excerpt: '掌握 Mapped Types、Conditional Types 以及模板字符串类型，让你的 API 定义实现真正的类型安全。',
    content: '## 泛型约束\n\nTypeScript 的强大之处在于其类型系统的图灵完备性...\n\n```typescript\ntype DeepPartial<T> = T extends object ? { [P in keyof T]?: DeepPartial<T[P]> } : T;\n```',
  },
  {
    title: '如何构建高性能的 Node.js 应用：内存管理与异步 I/O 优化',
    excerpt: '深入 Node.js 事件循环机制，解析内存泄漏排查技巧以及在高并发场景下的流处理方案。',
    content: '## 事件循环机制\n\nNode.js 的单线程模型依赖于事件循环来处理异步 I/O...\n\n### 垃圾回收 (GC)\nV8 引擎的垃圾回收机制决定了内存分配的效率...',
  }
];

async function main() {
  console.log('正在清理旧的 Mock 数据...');
  // 清理逻辑：删除所有 slug 以 mock-post- 开头的文章
  const deletedPosts = await prisma.post.deleteMany({
    where: {
      slug: { startsWith: 'mock-post-' }
    }
  });
  console.log(`已清理 ${deletedPosts.count} 篇旧 Mock 文章`);

  console.log('开始生成真实感的博客数据...');

  // 1. 创建分类
  const categories = await Promise.all(
    realCategories.map(cat => 
      prisma.category.upsert({
        where: { slug: cat.slug },
        update: {},
        create: { name: cat.name, slug: cat.slug, sort: 1 }
      })
    )
  );

  // 2. 创建标签
  const tags = await Promise.all(
    realTags.map(tag =>
      prisma.tag.upsert({
        where: { slug: tag.slug },
        update: {},
        create: { name: tag.name, slug: tag.slug }
      })
    )
  );

  // 3. 生成 20 篇文章
  for (let i = 0; i < 20; i++) {
    const template = realPostTemplates[i % realPostTemplates.length];
    const category = categories[i % categories.length];
    const slug = `${template.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${i}`;
    
    const post = await prisma.post.create({
      data: {
        title: `${template.title} (Vol. ${i + 1})`,
        slug: slug,
        excerpt: template.excerpt,
        contentMarkdown: template.content,
        status: PostStatus.published,
        categoryId: category.id,
        publishedAt: new Date(Date.now() - i * 12 * 60 * 60 * 1000), // 每 12 小时一篇
        coverUrl: `https://picsum.photos/seed/post-${i}/1200/600`, // 高质量大图
        readTimeMinutes: Math.floor(Math.random() * 15) + 5,
      }
    });

    // 随机关联 2-3 个标签
    const shuffledTags = [...tags].sort(() => 0.5 - Math.random());
    const selectedTags = shuffledTags.slice(0, Math.floor(Math.random() * 2) + 2);

    for (const tag of selectedTags) {
      await prisma.postTag.create({
        data: {
          postId: post.id,
          tagId: tag.id
        }
      });
    }

    // 初始化统计数据
    await prisma.postStats.create({
      data: {
        postId: post.id,
        views: BigInt(Math.floor(Math.random() * 5000) + 100),
        likes: BigInt(Math.floor(Math.random() * 500) + 10),
      }
    });
  }

  console.log('数据注入完毕！20 篇具有真实感的文章已存入数据库。');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
