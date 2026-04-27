import { Eye, Heart, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { getCategories, getPosts, type PublicCategory, type PublicPostListItem } from "../../services/api/public";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

export function BlogListPage() {
  const { t } = useTranslation();
  const [categories, setCategories] = useState<PublicCategory[]>([]);
  const [posts, setPosts] = useState<PublicPostListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 5;

  useEffect(() => {
    getCategories().then(setCategories).catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getPosts({ page: currentPage, pageSize })
      .then((postRes) => {
        if (cancelled) return;
        setPosts(postRes.items);
        setTotalPages(Math.ceil(postRes.pageInfo.total / pageSize));
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setPosts([]);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [currentPage]);

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="pb-12">
      <div className="mb-8">
        <div className="text-3xl font-semibold tracking-tight text-slate-900">{t("nav.blog")}</div>
        <div className="mt-2 text-sm text-slate-500">
          {categories.length > 0
            ? categories.map((c) => c.name).join("、")
            : t("blog.latest")}
        </div>
      </div>

      <div className="flex flex-col gap-10">
        {loading ? (
          <div className="flex h-64 items-center justify-center text-slate-400">
            {t("common.loading")}
          </div>
        ) : posts.length > 0 ? (
          <>
            {/* 首篇文章：大卡片横向布局 */}
            {currentPage === 1 && posts.length > 0 && (
              <Link
                to={`/blog/${posts[0].slug}`}
                className="group relative overflow-hidden rounded-[32px] border border-slate-100 bg-white shadow-sm transition-all hover:shadow-xl md:flex"
              >
                <div className="relative aspect-[16/9] w-full overflow-hidden md:aspect-auto md:w-[55%]">
                  {posts[0].coverUrl ? (
                    <img
                      src={posts[0].coverUrl}
                      alt={posts[0].title}
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-slate-50 text-slate-400">
                      {t("blog.noPosts")}
                    </div>
                  )}
                </div>
                <div className="flex flex-1 flex-col p-8 md:p-10">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-400">
                      {posts[0].publishedAt ? String(posts[0].publishedAt).slice(0, 10) : "-"}
                    </span>
                    <div className="flex gap-2">
                      {posts[0].tags.slice(0, 2).map((t) => (
                        <span key={t.slug} className="rounded-lg bg-orange-50 px-2.5 py-1 text-xs font-medium text-orange-600">
                          {t.name}
                        </span>
                      ))}
                    </div>
                  </div>
                  <h2 className="mt-6 text-2xl font-bold leading-tight text-slate-900 md:text-3xl group-hover:text-blue-600 transition-colors">
                    {posts[0].title}
                  </h2>
                  <p className="mt-4 line-clamp-3 text-base leading-relaxed text-slate-500">
                    {posts[0].excerpt}
                  </p>
                  <div className="mt-auto pt-6 flex items-center gap-4 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <Eye className="h-4 w-4" /> {posts[0].views}
                    </span>
                    <span className="flex items-center gap-1">
                      <Heart className="h-4 w-4" /> {posts[0].likes}
                    </span>
                    <span>{t("common.readTime", { minutes: posts[0].readTimeMinutes })}</span>
                  </div>
                </div>
              </Link>
            )}

            {/* 后续文章：两列网格布局 */}
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
              {(currentPage === 1 ? posts.slice(1) : posts).map((p) => (
                <Link
                  key={p.id}
                  to={`/blog/${p.slug}`}
                  className="group flex flex-col overflow-hidden rounded-[32px] border border-slate-100 bg-white shadow-sm transition-all hover:shadow-xl"
                >
                  <div className="relative aspect-[16/10] w-full overflow-hidden">
                    {p.coverUrl ? (
                      <img
                        src={p.coverUrl}
                        alt={p.title}
                        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-slate-50 text-slate-400">
                        {t("blog.noPosts")}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col p-8">
                    <h2 className="line-clamp-2 text-xl font-bold leading-snug text-slate-900 group-hover:text-blue-600 transition-colors">
                      {p.title}
                    </h2>
                    <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-slate-500">
                      {p.excerpt}
                    </p>
                    <div className="mt-auto pt-6 flex items-center justify-between">
                      <span className="text-xs text-slate-400">
                        {p.publishedAt ? String(p.publishedAt).slice(0, 10) : "-"}
                      </span>
                      <div className="flex gap-2">
                        {p.tags.slice(0, 2).map((t) => (
                          <span key={t.slug} className="rounded-lg bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                            {t.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {/* 分页组件 */}
            {totalPages > 1 && (
              <div className="mt-8 flex items-center justify-center gap-2">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-white"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }).map((_, i) => {
                    const page = i + 1;
                    // 只显示当前页附近的页码
                    if (
                      page === 1 ||
                      page === totalPages ||
                      (page >= currentPage - 1 && page <= currentPage + 1)
                    ) {
                      return (
                        <button
                          key={page}
                          onClick={() => handlePageChange(page)}
                          className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-medium transition-colors ${
                            currentPage === page
                              ? "bg-blue-600 text-white shadow-sm shadow-blue-200"
                              : "text-slate-600 hover:bg-slate-100"
                          }`}
                        >
                          {page}
                        </button>
                      );
                    }
                    if (
                      (page === currentPage - 2 && page > 1) ||
                      (page === currentPage + 2 && page < totalPages)
                    ) {
                      return <span key={page} className="px-1 text-slate-300">...</span>;
                    }
                    return null;
                  })}
                </div>

                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-white"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="flex h-64 items-center justify-center text-slate-400">
            {t("blog.noPosts")}
          </div>
        )}
      </div>
    </div>
  );
}
