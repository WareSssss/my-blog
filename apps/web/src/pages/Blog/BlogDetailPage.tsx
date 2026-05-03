import { Eye, Heart, ArrowLeft, Share2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getPostDetail, likePost, type PublicPostDetailResponse } from "../../services/api/public";

export function BlogDetailPage() {
  const params = useParams();
  const slug = params.slug ?? "";

  const [post, setPost] = useState<PublicPostDetailResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLiking, setIsLiking] = useState(false);
  const [hasLiked, setHasLiked] = useState(false);

  useEffect(() => {
    let cancelled = false;
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

  const handleLike = async () => {
    if (!post || isLiking || hasLiked) return;
    setIsLiking(true);
    try {
      const res = await likePost(post.id);
      setPost({ ...post, likes: res.likes });
      setHasLiked(true);
    } catch (e) {
      console.error("点赞失败", e);
    } finally {
      setIsLiking(false);
    }
  };

  const metaText = useMemo(() => {
    if (!post) return "";
    const date = post.publishedAt ? String(post.publishedAt).slice(0, 10) : "-";
    const read = post.readTimeMinutes ? `${post.readTimeMinutes} 分钟` : "-";
    return `${date} · ${read}`;
  }, [post]);

  if (error) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12">
        <div className="rounded-2xl border border-red-100 bg-red-50/50 p-8 text-center">
          <div className="text-lg font-medium text-red-900">文章加载失败</div>
          <div className="mt-2 text-red-600">{error}</div>
          <Link
            className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-red-700 hover:text-red-800"
            to="/blog"
          >
            <ArrowLeft className="h-4 w-4" />
            返回博客列表
          </Link>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12">
        <div className="space-y-4">
          <div className="h-8 w-2/3 animate-pulse rounded-lg bg-slate-200" />
          <div className="h-4 w-1/4 animate-pulse rounded-lg bg-slate-200" />
          <div className="mt-8 aspect-[21/9] animate-pulse rounded-2xl bg-slate-100" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6">
        <Link
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900"
          to="/blog"
        >
          <ArrowLeft className="h-4 w-4" />
          返回列表
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_280px]">
        <article className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md">
          {post.coverUrl && (
            <div className="aspect-[21/9] w-full overflow-hidden border-b border-slate-100">
              <img src={post.coverUrl} alt={post.title} className="h-full w-full object-cover" />
            </div>
          )}

          <div className="p-8 md:p-12">
            <header className="mb-8">
              <div className="flex items-center gap-3 text-sm text-slate-500">
                <span className="font-medium text-blue-600">{post.category?.name}</span>
                <span>•</span>
                <span>{metaText}</span>
              </div>
              <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
                {post.title}
              </h1>

              <div className="mt-6 flex flex-wrap gap-2">
                {post.tags.map((t) => (
                  <span
                    key={t.slug}
                    className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600"
                  >
                    #{t.name}
                  </span>
                ))}
              </div>

              <div className="mt-8 flex items-center justify-between border-y border-slate-100 py-4">
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-1.5 text-slate-500">
                    <Eye className="h-4 w-4" />
                    <span className="text-sm font-medium">{post.views}</span>
                  </div>
                  <button
                    onClick={handleLike}
                    disabled={isLiking || hasLiked}
                    className={`group flex items-center gap-1.5 transition-colors ${
                      hasLiked ? "text-rose-500" : "text-slate-500 hover:text-rose-500"
                    }`}
                  >
                    <Heart
                      className={`h-4 w-4 transition-transform ${
                        hasLiked ? "fill-current scale-110" : "group-hover:scale-110"
                      }`}
                    />
                    <span className="text-sm font-medium">{post.likes}</span>
                  </button>
                </div>
                <button className="inline-flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-slate-600">
                  <Share2 className="h-4 w-4" />
                  分享
                </button>
              </div>
            </header>

            <div
              className="markdown prose prose-slate max-w-none dark:prose-invert"
              dangerouslySetInnerHTML={{ __html: post.contentHtml }}
            />

            <footer className="mt-12 border-t border-slate-100 pt-8">
              <div className="flex flex-col items-center justify-center rounded-2xl bg-slate-50 p-8 text-center">
                <p className="text-slate-600">觉得这篇文章有帮助吗？</p>
                <button
                  onClick={handleLike}
                  disabled={isLiking || hasLiked}
                  className={`mt-4 flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold transition-all ${
                    hasLiked
                      ? "bg-rose-50 text-rose-600"
                      : "bg-white text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <Heart className={`h-4 w-4 ${hasLiked ? "fill-current" : ""}`} />
                  {hasLiked ? "感谢支持！" : "点个赞吧"}
                </button>
              </div>
            </footer>
          </div>
        </article>

        <aside className="hidden lg:block">
          <div className="sticky top-24 space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900">目录</h3>
              <nav className="mt-4 max-h-[calc(100vh-300px)] overflow-y-auto pr-2 custom-scrollbar">
                {post.toc.length === 0 ? (
                  <p className="text-sm text-slate-400 italic">暂无目录</p>
                ) : (
                  <div className="space-y-2.5 border-l-2 border-slate-100">
                    {post.toc.map((item) => (
                      <a
                        key={item.id}
                        href={`#${item.id}`}
                        className="group relative -left-[2px] block border-l-2 border-transparent pl-4 text-sm text-slate-500 transition-all hover:border-blue-500 hover:text-blue-600"
                        style={{ paddingLeft: `${(item.level - 1) * 0.75 + 1}rem` }}
                      >
                        {item.text}
                      </a>
                    ))}
                  </div>
                )}
              </nav>
            </div>

            <div className="rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 p-6 text-white shadow-lg">
              <h3 className="font-bold">订阅更新</h3>
              <p className="mt-2 text-sm text-blue-100">获取最新的技术干货与项目进展。</p>
              <button className="mt-4 w-full rounded-xl bg-white/10 py-2 text-sm font-semibold text-white backdrop-blur-md transition-colors hover:bg-white/20">
                即将推出
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
