import {
  Braces,
  CalendarClock,
  FileSpreadsheet,
  MessageSquare,
  Regex,
  ShieldCheck
} from "lucide-react";
import clsx from "clsx";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { getTools, type PublicTool } from "../../services/api/public";
import { Link } from "react-router-dom";

type Tool = {
  id: string;
  title: string;
  description: string;
  status: "online" | "coming_soon";
  icon: ReactNode;
  routePath: string | null;
  externalUrl: string | null;
};

function getToolIcon(icon: string | null): ReactNode {
  if (icon === "message-square") return <MessageSquare className="h-5 w-5 text-slate-700" />;
  if (icon === "file-spreadsheet") return <FileSpreadsheet className="h-5 w-5 text-slate-700" />;
  if (icon === "braces") return <Braces className="h-5 w-5 text-slate-700" />;
  if (icon === "shield-check") return <ShieldCheck className="h-5 w-5 text-slate-700" />;
  if (icon === "regex") return <Regex className="h-5 w-5 text-slate-700" />;
  if (icon === "calendar-clock") return <CalendarClock className="h-5 w-5 text-slate-700" />;
  return <Braces className="h-5 w-5 text-slate-700" />;
}

export function ToolsPage() {
  const [apiTools, setApiTools] = useState<PublicTool[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    getTools()
      .then((items) => {
        if (cancelled) return;
        setApiTools(items);
      })
      .catch(() => {
        if (cancelled) return;
        setApiTools([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const tools: Tool[] = useMemo(() => {
    if (!apiTools) return [];
    return apiTools
      .slice()
      .sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0))
      .map((t) => ({
        id: t.id,
        title: t.name,
        description: t.description ?? "",
        status: t.status,
        icon: getToolIcon(t.icon),
        routePath: t.routePath,
        externalUrl: t.externalUrl
      }));
  }, [apiTools]);

  return (
    <div>
      <div className="mb-6">
        <div className="text-3xl font-semibold tracking-tight">开发工具</div>
        <div className="mt-1 text-sm text-slate-500">常用在线开发工具集合，提升开发效率</div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tools.map((t) => (
          <div key={t.id}>
            {t.status === "coming_soon" ? (
              <div
                className={clsx(
                  "relative rounded-xl border border-slate-200 bg-white p-5 shadow-sm opacity-80"
                )}
              >
                <span className="absolute right-4 top-4 rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-500">
                即将上线
                </span>
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-lg bg-slate-50">
                    {t.icon}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-900">{t.title}</div>
                    <div className="mt-1 text-sm leading-6 text-slate-600">{t.description}</div>
                  </div>
                </div>
              </div>
            ) : null}

            {t.status === "online" && t.routePath ? (
              <Link
                to={t.routePath}
                className="block rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:bg-slate-50"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-lg bg-slate-50">
                    {t.icon}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-900">{t.title}</div>
                    <div className="mt-1 text-sm leading-6 text-slate-600">{t.description}</div>
                  </div>
                </div>
              </Link>
            ) : t.status === "online" && t.externalUrl ? (
              <a
                href={t.externalUrl}
                target="_blank"
                rel="noreferrer"
                className="block rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:bg-slate-50"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-lg bg-slate-50">
                    {t.icon}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-900">{t.title}</div>
                    <div className="mt-1 text-sm leading-6 text-slate-600">{t.description}</div>
                  </div>
                </div>
              </a>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
