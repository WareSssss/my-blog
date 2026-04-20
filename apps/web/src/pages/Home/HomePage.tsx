import { Mail, MessageCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { getContacts, getProfile, getTechStack } from "../../services/api/public";

export function HomePage() {
  const [profile, setProfile] = useState<{
    name?: string;
    alias?: string;
    title?: string;
    intro?: string;
  } | null>(null);
  const [contacts, setContacts] = useState<{
    email?: string;
    wechat?: string;
    github?: string;
  } | null>(null);
  const [techStack, setTechStack] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;

    Promise.all([getProfile(), getContacts(), getTechStack()])
      .then(([p, c, t]) => {
        if (cancelled) return;
        setProfile(p);
        setContacts(c);
        setTechStack(Array.isArray(t) ? t : []);
      })
      .catch(() => {
        if (cancelled) return;
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const displayName = useMemo(() => {
    const name = profile?.name ?? "扶桑";
    const alias = profile?.alias ? ` (${profile.alias})` : " (Fsanq)";
    return `${name}${alias}`;
  }, [profile?.alias, profile?.name]);

  const title = profile?.title ?? "全栈工程师 / AI 探索者";
  const intro =
    profile?.intro ??
    "你好！我是扶桑，一名 AI 应用工程师，专注于 Web 与 AI 应用落地实践（RAG / Agent / LLM）。";

  const emailHref = contacts?.email ? `mailto:${contacts.email}` : "mailto:hello@example.com";

  return (
    <div className="flex justify-center">
      <div className="w-full max-w-3xl rounded-2xl border border-slate-200 bg-white px-6 py-10 shadow-soft">
        <div className="flex flex-col items-center text-center">
          <img
            src="/avatar.jpg"
            alt="avatar"
            className="h-16 w-16 rounded-full bg-slate-100 object-contain"
          />
          <h1 className="mt-4 text-2xl font-semibold tracking-tight">{displayName}</h1>
          <div className="mt-1 text-sm text-slate-500">{title}</div>

          <div className="mt-6 w-full rounded-xl bg-slate-50 px-4 py-4">
            <div className="text-sm text-slate-600">
              有问题想问我？试试和我的 AI 分身对话吧！
            </div>
            <div className="mt-3">
              <Link
                to="/ai"
                className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                开始对话
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-6 space-y-4 text-sm leading-7 text-slate-700">
          <p>{intro}</p>
        </div>

        <div className="mt-8">
          <div className="text-sm font-semibold text-slate-900">技术栈</div>
          <div className="mt-3 flex flex-wrap gap-2">
            {techStack.map((t) => (
              <span
                key={t}
                className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-700"
              >
                {t}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-8">
          <div className="text-sm font-semibold text-slate-900">联系我</div>
          <div className="mt-3 flex items-center gap-3 text-sm text-slate-700">
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 hover:bg-slate-50"
            >
              <MessageCircle className="h-4 w-4" />
              微信
            </button>
            <a
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 hover:bg-slate-50"
              href={emailHref}
            >
              <Mail className="h-4 w-4" />
              {contacts?.email ?? "Email"}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
