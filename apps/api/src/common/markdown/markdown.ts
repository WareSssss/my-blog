import GithubSlugger from 'github-slugger';
import { toString } from 'mdast-util-to-string';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import rehypeHighlight from 'rehype-highlight';
import rehypeSlug from 'rehype-slug';
import rehypeStringify from 'rehype-stringify';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import { unified } from 'unified';
import { visit } from 'unist-util-visit';

export type TocItem = {
  id: string;
  text: string;
  level: number;
};

export async function renderMarkdown(
  markdown: string,
): Promise<{ html: string; toc: TocItem[] }> {
  const slugger = new GithubSlugger();
  const toc: TocItem[] = [];

  const tree = unified().use(remarkParse).use(remarkGfm).parse(markdown);
  visit(tree, 'heading', (node: unknown) => {
    if (!node || typeof node !== 'object') return;
    const depthValue = (node as { depth?: unknown }).depth;
    const depth =
      typeof depthValue === 'number' ? depthValue : Number(depthValue ?? 0);
    if (depth < 2 || depth > 3) return;
    const text = toString(node as Parameters<typeof toString>[0]).trim();
    if (!text) return;
    const id = slugger.slug(text);
    toc.push({ id, text, level: depth });
  });

  const file = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype)
    .use(rehypeSlug)
    .use(rehypeAutolinkHeadings, { behavior: 'wrap' })
    .use(rehypeHighlight)
    .use(rehypeStringify)
    .process(markdown);

  return { html: String(file), toc };
}
