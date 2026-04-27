import { Eye, Heart } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getPostDetail, type PublicPostDetailResponse } from "../../services/api/public";

export function BlogDetailPage() {
  const params = useParams();
  const slug = params.slug ?? "";

  const [post, setPost] = useState<PublicPostDetailResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setPost(null);
      setError(null);
    });

    if (!slug) return;

    getPostDetail(slug)
      .then((data) => {
        if (cancelled) return;
        setPost(data);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "加载失败");
      });

    return () => {
      cancelled = true;
    };
  }, [slug]);

  const metaText = useMemo(() => {
    if (!post) return "";
    const date = post.publishedAt ? String(post.publishedAt).slice(0, 10) : "-";
    const read = post.readTimeMinutes ? `${post.readTimeMinutes} 分钟` : "-";
    return `${date} · ${read}`;
  }, [post]);

  if (error) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="text-sm text-slate-600">文章加载失败：{error}</div>
        <div className="mt-4">
          <Link className="text-sm text-blue-600 underline" to="/blog">
            返回博客列表
          </Link>
        </div>
      </div>
    );
  }

  if (!post) {
    return <div className="text-sm text-slate-500">加载中...</div>;
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_260px]">
      <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {post.coverUrl && (
          <div className="aspect-[21/9] w-full overflow-hidden">
            <img
              src={post.coverUrl}
              alt={post.title}
              className="h-full w-full object-cover"
            />
          </div>
        )}
        <div className="p-6">
          <div className="text-xs text-slate-500">{metaText}</div>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">{post.title}</h1>

          <div className="mt-3 flex flex-wrap gap-2">
            {post.tags.map((t) => (
              <span
                key={t.slug}
                className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-700"
              >
                {t.name}
              </span>
            ))}
          </div>

          <div className="mt-3 flex items-center gap-4 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1">
              <Eye className="h-3.5 w-3.5" />
              {post.views}
            </span>
            <span className="inline-flex items-center gap-1">
              <Heart className="h-3.5 w-3.5" />
              {post.likes}
            </span>
          </div>

          <div className="mt-6 markdown" dangerouslySetInnerHTML={{ __html: post.contentHtml }} />

          <div className="mt-8">
            <Link className="text-sm text-blue-600 underline" to="/blog">
              返回博客列表
            </Link>
          </div>
        </div>
      </article>

      <aside className="hidden lg:block">
        <div className="sticky top-20 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs font-semibold text-slate-900">目录</div>
          <div className="mt-3 space-y-2 text-sm">
            {post.toc.length === 0 ? (
              <div className="text-sm text-slate-500">暂无目录</div>
            ) : (
              post.toc.map((item) => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  className="block truncate text-slate-600 hover:text-slate-900"
                  style={{ paddingLeft: item.level === 3 ? 12 : 0 }}
                >
                  {item.text}
                </a>
              ))
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}
