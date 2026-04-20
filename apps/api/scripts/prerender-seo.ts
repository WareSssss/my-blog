import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { renderMarkdown } from '../src/common/markdown/markdown';

function createPrisma() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL is required');
  const pool = new Pool({ connectionString: databaseUrl });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function stripHtml(html: string) {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function toAbsoluteUrl(base: string, pathname: string) {
  return new URL(pathname, base.endsWith('/') ? base : `${base}/`).toString();
}

function buildPostHtml(params: {
  siteUrl: string;
  title: string;
  description: string;
  slug: string;
  contentHtml: string;
  toc: { id: string; text: string; level: number }[];
}) {
  const canonical = toAbsoluteUrl(params.siteUrl, `/blog/${params.slug}`);
  const tocHtml =
    params.toc.length === 0
      ? '<div class="toc-empty">暂无目录</div>'
      : params.toc
          .map((item) => {
            const padding = item.level === 3 ? '12px' : '0';
            return `<a class="toc-item" style="padding-left:${padding}" href="#${escapeHtml(
              item.id
            )}">${escapeHtml(item.text)}</a>`;
          })
          .join('');

  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(params.title)}</title>
    <meta name="description" content="${escapeHtml(params.description)}" />
    <link rel="canonical" href="${escapeHtml(canonical)}" />
    <link rel="icon" href="/favicon.svg" />
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.11.1/styles/github-dark.min.css" />
    <style>
      body{margin:0;font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial; background:#f8fafc;color:#0f172a}
      a{color:#2563eb;text-decoration:underline;text-underline-offset:2px}
      .container{max-width:1100px;margin:0 auto;padding:24px}
      .nav{display:flex;gap:16px;align-items:center;padding:12px 16px;border:1px solid #e2e8f0;border-radius:14px;background:#fff}
      .nav a{text-decoration:none;color:#334155;font-size:14px}
      .nav a:hover{color:#0f172a}
      .grid{display:grid;grid-template-columns:1fr 260px;gap:24px;margin-top:18px}
      .card{border:1px solid #e2e8f0;border-radius:16px;background:#fff;padding:20px}
      .title{font-size:28px;font-weight:700;letter-spacing:-.02em;margin:10px 0 0}
      .desc{margin:10px 0 0;color:#475569;font-size:14px;line-height:1.75}
      .toc-title{font-size:12px;font-weight:700;color:#0f172a;margin-bottom:10px}
      .toc-item{display:block;color:#475569;text-decoration:none;font-size:14px;line-height:1.9;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .toc-item:hover{color:#0f172a}
      .toc-empty{color:#94a3b8;font-size:14px}
      .content{line-height:1.75;font-size:15px}
      .content h2{font-size:20px;font-weight:700;margin:24px 0 10px}
      .content h3{font-size:16px;font-weight:700;margin:18px 0 8px}
      .content p{margin:10px 0;color:#334155}
      .content pre{margin:12px 0;border-radius:12px;padding:14px;overflow:auto;background:#0f172a}
      .content code:not(pre code){border-radius:6px;padding:2px 6px;background:#f1f5f9;color:#0f172a}
      @media (max-width: 960px){.grid{grid-template-columns:1fr}.toc{display:none}}
    </style>
  </head>
  <body>
    <div class="container">
      <div class="nav">
        <strong style="font-size:14px">扶桑</strong>
        <a href="/">首页</a>
        <a href="/blog">博客</a>
        <a href="/tools">开发工具</a>
        <a href="/ai">AI聊天</a>
      </div>
      <div class="grid">
        <main class="card">
          <h1 class="title">${escapeHtml(params.title)}</h1>
          <p class="desc">${escapeHtml(params.description)}</p>
          <div class="content">${params.contentHtml}</div>
        </main>
        <aside class="card toc">
          <div class="toc-title">目录</div>
          ${tocHtml}
        </aside>
      </div>
    </div>
  </body>
</html>`;
}

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

async function writeFile(filePath: string, content: string) {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, content, 'utf8');
}

async function main() {
  const prisma = createPrisma();
  const repoRoot = path.resolve(__dirname, '..', '..', '..');
  const webPublic = path.join(repoRoot, 'apps', 'web', 'public');

  const siteUrl = (process.env.SITE_URL ?? 'http://localhost:5173').trim();

  const posts = await prisma.post.findMany({
    where: { status: 'published' },
    orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
    select: {
      slug: true,
      title: true,
      excerpt: true,
      contentMarkdown: true,
      publishedAt: true,
    },
  });

  const urls: string[] = [];
  urls.push(toAbsoluteUrl(siteUrl, '/'));
  urls.push(toAbsoluteUrl(siteUrl, '/blog'));
  urls.push(toAbsoluteUrl(siteUrl, '/tools'));
  urls.push(toAbsoluteUrl(siteUrl, '/ai'));

  for (const p of posts) {
    const markdown = p.contentMarkdown ?? '';
    const rendered = markdown ? await renderMarkdown(markdown) : { html: '', toc: [] };
    const description = (p.excerpt ?? stripHtml(rendered.html)).slice(0, 160);
    const html = buildPostHtml({
      siteUrl,
      title: p.title,
      description,
      slug: p.slug,
      contentHtml: rendered.html,
      toc: rendered.toc,
    });

    const outPath = path.join(webPublic, 'blog', p.slug, 'index.html');
    await writeFile(outPath, html);
    urls.push(toAbsoluteUrl(siteUrl, `/blog/${p.slug}`));
  }

  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map((u) => `  <url><loc>${escapeHtml(u)}</loc></url>`)
  .join('\n')}
</urlset>
`;

  const robotsTxt = `User-agent: *
Allow: /

Sitemap: ${toAbsoluteUrl(siteUrl, '/sitemap.xml')}
`;

  await writeFile(path.join(webPublic, 'sitemap.xml'), sitemapXml);
  await writeFile(path.join(webPublic, 'robots.txt'), robotsTxt);

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

