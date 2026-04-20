require("dotenv/config");

const { randomUUID } = require("crypto");
const { Pool } = require("pg");
const { PrismaPg } = require("@prisma/adapter-pg");
const { PrismaClient } = require("@prisma/client");

function createPrisma() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

async function main() {
  const prisma = createPrisma();

  const categories = [
    { name: "技术文章", slug: "tech", sort: 1 },
    { name: "学习笔记", slug: "notes", sort: 2 },
    { name: "项目分享", slug: "projects", sort: 3 }
  ];

  for (const c of categories) {
    await prisma.category.upsert({
      where: { slug: c.slug },
      create: { id: randomUUID(), ...c },
      update: { name: c.name, sort: c.sort }
    });
  }

  const siteSettings = [
    {
      key: "profile",
      value: {
        name: "扶桑",
        alias: "Fsanq",
        title: "全栈工程师 / AI 探索者",
        intro:
          "你好！我是扶桑，一名 AI 应用工程师，专注于 Web 与 AI 应用落地实践（RAG / Agent / LLM）。"
      }
    },
    {
      key: "contacts",
      value: {
        email: "hello@example.com",
        wechat: "",
        github: "https://github.com/"
      }
    },
    {
      key: "tech-stack",
      value: ["TypeScript", "React", "Vue", "Node.js", "PostgreSQL", "AI/LLM", "RAG", "LangChain"]
    },
    {
      key: "ai",
      value: {
        title: "扶桑 AI",
        subtitle: "基于知识库和博客的智能问答",
        status: "在线",
        quickPrompts: ["介绍一下你自己", "你有哪些技能栈", "推荐最火的博客"],
        models: [
          { id: "glm-4-flash", label: "GLM-4-Flash" },
          { id: "gpt-4o-mini", label: "GPT-4o mini" }
        ]
      }
    }
  ];

  for (const s of siteSettings) {
    await prisma.siteSetting.upsert({
      where: { key: s.key },
      create: { id: randomUUID(), key: s.key, value: s.value },
      update: { value: s.value }
    });
  }

  const tools = [
    {
      name: "AI 聊天",
      description: "基于 RAG 的智能对话系统，可以回答知识库中的问题",
      status: "online",
      icon: "message-square",
      routePath: "/ai",
      sort: 1
    },
    {
      name: "Excel 差异对比",
      description: "上传两个 Excel 文件，快速找出数据差异并高亮显示，支持 xls/xlsx",
      status: "online",
      icon: "file-spreadsheet",
      routePath: "/tools/excel-diff",
      sort: 2
    },
    {
      name: "JSON 格式化",
      description: "在线 JSON 格式化、压缩、校验工具",
      status: "online",
      icon: "braces",
      routePath: "/tools/json",
      sort: 3
    },
    {
      name: "Base64 编解码",
      description: "文本和图片的 Base64 编解码工具",
      status: "coming_soon",
      icon: "shield-check",
      sort: 4
    },
    {
      name: "正则测试",
      description: "实时正则表达式测试和匹配工具",
      status: "coming_soon",
      icon: "regex",
      sort: 5
    },
    {
      name: "时间戳转换",
      description: "时间戳与日期格式互相转换",
      status: "coming_soon",
      icon: "calendar-clock",
      sort: 6
    }
  ];

  for (const t of tools) {
    const existing = await prisma.tool.findFirst({ where: { name: t.name } });
    if (existing) {
      await prisma.tool.update({
        where: { id: existing.id },
        data: {
          description: t.description,
          status: t.status,
          icon: t.icon,
          routePath: t.routePath,
          sort: t.sort
        }
      });
      continue;
    }
    await prisma.tool.create({
      data: {
        name: t.name,
        description: t.description,
        status: t.status,
        icon: t.icon,
        routePath: t.routePath,
        sort: t.sort,
        tags: []
      }
    });
  }

  const tagDefs = [
    { name: "GitHub", slug: "github" },
    { name: "开源项目", slug: "open-source" },
    { name: "设计系统", slug: "design-system" },
    { name: "AI编程", slug: "ai-coding" },
    { name: "前端开发", slug: "frontend" },
    { name: "效率工具", slug: "productivity" },
    { name: "RAG", slug: "rag" },
    { name: "LLM", slug: "llm" },
    { name: "sass", slug: "sass" },
    { name: "pm2", slug: "pm2" }
  ];

  for (const t of tagDefs) {
    await prisma.tag.upsert({
      where: { slug: t.slug },
      create: { id: randomUUID(), name: t.name, slug: t.slug },
      update: { name: t.name }
    });
  }

  const categoryTech = await prisma.category.findUnique({ where: { slug: "tech" } });
  const categoryNotes = await prisma.category.findUnique({ where: { slug: "notes" } });

  const posts = [
    {
      slug: "ai-ui-design-system",
      title: "这个 5 万 Star 的项目，让 AI 写出来的 UI 终于不丑了",
      excerpt:
        "66 个知名品牌设计系统的 Markdown 版本，复制到项目里 AI 直接生成对应风格的 UI。5 万 Star，MIT 协议，AI 时代的前端效果神器…",
      contentMarkdown: `## 背景\n\n很多时候 AI 能写出可用的组件，但“好看”不容易。\n\n## 解决方案\n\n这里推荐一种实践：把成熟设计系统的规范喂给 AI，让生成的 UI 更贴近品牌。\n\n### 你可以怎么做\n\n1. 选一个设计系统\n2. 拿到对应的规范文档\n3. 让 AI 按规范生成组件\n\n## 示例代码\n\n\`\`\`ts\ntype ButtonProps = {\n  variant?: 'primary' | 'secondary';\n  disabled?: boolean;\n};\n\nexport function Button(props: ButtonProps) {\n  return <button disabled={props.disabled}>Button</button>;\n}\n\`\`\`\n`,
      categoryId: categoryTech?.id ?? null,
      publishedAt: new Date("2026-04-17T00:00:00.000Z"),
      readTimeMinutes: 7,
      tags: ["github", "open-source", "design-system", "ai-coding", "frontend", "productivity"]
    },
    {
      slug: "llm-memory",
      title: "大模型记忆",
      excerpt:
        "现在主流方案：1. 全量上下文（Full Context Stuffing）把所有历史信息直接塞进 context window。代表项目：Claude Projects… 优点：实现简单…",
      contentMarkdown: `## 什么是“大模型记忆”\n\n如果你希望 AI 在多轮对话中“记住”你的偏好与背景，就需要设计记忆方案。\n\n## 常见方案\n\n### 1. 全量上下文\n\n把历史信息直接塞进上下文（受限于上下文窗口）。\n\n### 2. 摘要记忆\n\n把对话压缩成摘要，持续更新。\n\n### 3. RAG 记忆\n\n把关键信息写入知识库，按需召回。\n\n## 一个简单的检索伪代码\n\n\`\`\`ts\nasync function answer(question: string) {\n  const contexts = await vectorSearch(question);\n  return llmGenerate({ question, contexts });\n}\n\`\`\`\n`,
      categoryId: categoryTech?.id ?? null,
      publishedAt: new Date("2026-04-09T00:00:00.000Z"),
      readTimeMinutes: 10,
      tags: ["rag", "llm"]
    },
    {
      slug: "sass-notes",
      title: "sass",
      excerpt:
        "sass 学习笔记：变量、嵌套、Mixin、继承等常用语法与工程化实践。",
      contentMarkdown: `## 变量与嵌套\n\nSass 支持变量与嵌套，可以显著提升样式的可维护性。\n\n### 变量\n\n\`\`\`scss\n$primary: #2563eb;\n\n.button {\n  background: $primary;\n}\n\`\`\`\n\n### 嵌套\n\n\`\`\`scss\n.card {\n  .title {\n    font-weight: 600;\n  }\n}\n\`\`\`\n`,
      categoryId: categoryNotes?.id ?? null,
      publishedAt: new Date("2026-03-18T00:00:00.000Z"),
      readTimeMinutes: 18,
      tags: ["sass"]
    },
    {
      slug: "pm2-notes",
      title: "pm2学习文档",
      excerpt:
        "pm2 常用命令、进程管理流程、配置参数与部署注意事项整理。",
      contentMarkdown: `## 安装\n\n\`\`\`bash\nnpm i -g pm2\n\`\`\`\n\n## 常用命令\n\n\`\`\`bash\npm2 start app.js --name my-app\npm2 ls\npm2 logs my-app\npm2 restart my-app\n\`\`\`\n\n## 部署建议\n\n- 配置开机自启\n- 记录日志与监控\n`,
      categoryId: categoryNotes?.id ?? null,
      publishedAt: new Date("2026-03-18T00:00:00.000Z"),
      readTimeMinutes: 5,
      tags: ["pm2"]
    }
  ];

  const tagBySlug = new Map(
    (await prisma.tag.findMany({ where: { slug: { in: tagDefs.map((t) => t.slug) } } })).map((t) => [
      t.slug,
      t
    ])
  );

  for (const p of posts) {
    const existing = await prisma.post.findUnique({ where: { slug: p.slug } });
    const post =
      existing
        ? await prisma.post.update({
            where: { slug: p.slug },
            data: {
              title: p.title,
              excerpt: p.excerpt,
              contentMarkdown: p.contentMarkdown,
              categoryId: p.categoryId,
              status: "published",
              publishedAt: p.publishedAt,
              readTimeMinutes: p.readTimeMinutes
            }
          })
        : await prisma.post.create({
            data: {
              slug: p.slug,
              title: p.title,
              excerpt: p.excerpt,
              contentMarkdown: p.contentMarkdown,
              categoryId: p.categoryId,
              status: "published",
              publishedAt: p.publishedAt,
              readTimeMinutes: p.readTimeMinutes
            }
          });

    await prisma.postTag.deleteMany({ where: { postId: post.id } });

    for (const tagSlug of p.tags) {
      const tag = tagBySlug.get(tagSlug);
      if (!tag) continue;
      await prisma.postTag.create({
        data: { postId: post.id, tagId: tag.id }
      });
    }

    await prisma.postStats.upsert({
      where: { postId: post.id },
      create: { postId: post.id, views: BigInt(0), likes: BigInt(0) },
      update: {}
    });
  }

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  process.exitCode = 1;
});
