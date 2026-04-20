import { Eye, Heart } from "lucide-react";
import { useEffect, useState } from "react";
import { getCategories, getPosts, type PublicCategory, type PublicPostListItem } from "../../services/api/public";
import { Link } from "react-router-dom";

export function BlogListPage() {
  const [categories, setCategories] = useState<PublicCategory[]>([]);
  const [posts, setPosts] = useState<PublicPostListItem[]>([]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getCategories(), getPosts({ page: 1, pageSize: 10 })])
      .then(([cat, postRes]) => {
        if (cancelled) return;
        setCategories(cat);
        setPosts(postRes.items);
      })
      .catch(() => {
        if (cancelled) return;
        setCategories([]);
        setPosts([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div>
      <div className="mb-6">
        <div className="text-3xl font-semibold tracking-tight">博客</div>
        <div className="mt-1 text-sm text-slate-500">
          {categories.length > 0
            ? categories.map((c) => c.name).join("、")
            : "技术文章、学习笔记和项目分享"}
        </div>
      </div>

      <div className="space-y-4">
        {posts.map((p) => (
          <article
            key={p.id}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span>{p.publishedAt ? String(p.publishedAt).slice(0, 10) : "-"}</span>
              <span>·</span>
              <span>{p.readTimeMinutes ? `${p.readTimeMinutes} 分钟` : "-"}</span>
              <span>·</span>
              <span className="inline-flex items-center gap-1">
                <Eye className="h-3.5 w-3.5" />
                {p.views}
              </span>
              <span className="inline-flex items-center gap-1">
                <Heart className="h-3.5 w-3.5" />
                {p.likes}
              </span>
            </div>

            <h2 className="mt-3 text-lg font-semibold text-slate-900">
              <Link className="hover:underline" to={`/blog/${p.slug}`}>
                {p.title}
              </Link>
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{p.excerpt ?? ""}</p>

            <div className="mt-3 flex flex-wrap gap-2">
              {p.tags.map((t) => (
                <span
                  key={t.slug}
                  className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-700"
                >
                  {t.name}
                </span>
              ))}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
