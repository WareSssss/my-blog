import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import matter from 'gray-matter';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

type Frontmatter = {
  title?: string;
  slug?: string;
  date?: string;
  category?: string;
  tags?: string[] | string;
  excerpt?: string;
  cover?: string;
  readTimeMinutes?: number;
  status?: 'draft' | 'published';
};

function createPrisma() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL is required');
  const pool = new Pool({ connectionString: databaseUrl });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

function toSlug(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9\u4e00-\u9fa5-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function stripMarkdown(markdown: string) {
  return markdown
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`]*`/g, '')
    .replace(/!\[[^\]]*]\([^)]+\)/g, '')
    .replace(/\[[^\]]*]\([^)]+\)/g, '')
    .replace(/[#>*_\-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function estimateReadTimeMinutes(markdown: string) {
  const text = stripMarkdown(markdown);
  const length = text.length;
  const minutes = Math.max(1, Math.round(length / 500));
  return minutes;
}

async function listMarkdownFiles(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listMarkdownFiles(full)));
      continue;
    }
    if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) {
      files.push(full);
    }
  }
  return files;
}

async function main() {
  const prisma = createPrisma();
  const repoRoot = path.resolve(__dirname, '..', '..', '..');
  const postsDir = process.env.POSTS_DIR
    ? path.resolve(process.env.POSTS_DIR)
    : path.join(repoRoot, 'posts');

  const files = await listMarkdownFiles(postsDir).catch(() => []);
  if (files.length === 0) {
    await prisma.$disconnect();
    throw new Error(`No markdown files found in ${postsDir}`);
  }

  const knownCategorySlugs = new Set(['tech', 'notes', 'projects']);

  for (const filePath of files) {
    const raw = await fs.readFile(filePath, 'utf8');
    const parsed = matter(raw);
    const fm = (parsed.data ?? {}) as Frontmatter;
    const content = String(parsed.content ?? '').trim();

    const title = fm.title?.trim() || path.basename(filePath, '.md');
    const slug = toSlug(fm.slug?.trim() || path.basename(filePath, '.md'));
    if (!slug) continue;

    const categoryRaw = (fm.category ?? 'tech').trim();
    const categorySlug = knownCategorySlugs.has(categoryRaw) ? categoryRaw : toSlug(categoryRaw);
    const categoryName =
      categorySlug === 'tech'
        ? '技术文章'
        : categorySlug === 'notes'
          ? '学习笔记'
          : categorySlug === 'projects'
            ? '项目分享'
            : categoryRaw;

    const category = await prisma.category.upsert({
      where: { slug: categorySlug },
      create: { id: randomUUID(), slug: categorySlug, name: categoryName, sort: 0 },
      update: { name: categoryName },
    });

    const tags = Array.isArray(fm.tags)
      ? fm.tags
      : typeof fm.tags === 'string'
        ? fm.tags.split(',').map((t) => t.trim()).filter(Boolean)
        : [];

    const excerpt = fm.excerpt?.trim() || stripMarkdown(content).slice(0, 160);
    const publishedAt = fm.date ? new Date(fm.date) : new Date();
    const status = fm.status ?? 'published';
    const readTimeMinutes =
      typeof fm.readTimeMinutes === 'number' ? fm.readTimeMinutes : estimateReadTimeMinutes(content);

    const post = await prisma.post.upsert({
      where: { slug },
      create: {
        slug,
        title,
        excerpt,
        categoryId: category.id,
        status,
        publishedAt: status === 'published' ? publishedAt : null,
        readTimeMinutes,
        contentMarkdown: content,
        sourceType: 'markdown_file',
        sourcePath: path.relative(repoRoot, filePath),
      },
      update: {
        title,
        excerpt,
        categoryId: category.id,
        status,
        publishedAt: status === 'published' ? publishedAt : null,
        readTimeMinutes,
        contentMarkdown: content,
        sourceType: 'markdown_file',
        sourcePath: path.relative(repoRoot, filePath),
      },
    });

    await prisma.postTag.deleteMany({ where: { postId: post.id } });

    for (const tagName of tags) {
      const tagSlug = toSlug(tagName);
      if (!tagSlug) continue;
      const existingByName = await prisma.tag.findUnique({ where: { name: tagName } });
      const tag =
        existingByName ??
        (await prisma.tag.upsert({
          where: { slug: tagSlug },
          create: { id: randomUUID(), name: tagName, slug: tagSlug },
          update: { name: tagName },
        }));
      await prisma.postTag.create({
        data: { postId: post.id, tagId: tag.id },
      });
    }

    await prisma.postStats.upsert({
      where: { postId: post.id },
      create: { postId: post.id, views: BigInt(0), likes: BigInt(0) },
      update: {},
    });
  }

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
