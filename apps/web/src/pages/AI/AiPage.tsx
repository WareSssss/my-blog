import heroImg from "../../assets/hero.png";
import { Send } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { getAiConfig, type PublicAiConfig } from "../../services/api/public";

export function AiPage() {
  const [aiConfig, setAiConfig] = useState<PublicAiConfig | null>(null);
  const models = useMemo(
    () => (aiConfig?.models?.length ? aiConfig.models : [{ id: "glm-4-flash", label: "GLM-4-Flash" }]),
    [aiConfig]
  );
  const quickPrompts = useMemo(
    () =>
      aiConfig?.quickPrompts?.length
        ? aiConfig.quickPrompts
        : ["介绍一下你自己", "你有哪些技能栈", "推荐最火的博客"],
    [aiConfig]
  );

  const [model, setModel] = useState("glm-4-flash");
  const [text, setText] = useState("");

  useEffect(() => {
    let cancelled = false;
    getAiConfig()
      .then((cfg) => {
        if (cancelled) return;
        setAiConfig(cfg);
      })
      .catch(() => {
        if (cancelled) return;
        setAiConfig(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedModel = useMemo(() => {
    if (models.some((m) => m.id === model)) return model;
    return models[0]?.id ?? model;
  }, [model, models]);

  const modelLabel = useMemo(
    () => models.find((m) => m.id === selectedModel)?.label ?? selectedModel,
    [models, selectedModel]
  );

  return (
    <div>
      <div className="mb-6 text-center">
        <div className="bg-gradient-to-r from-fuchsia-600 to-blue-600 bg-clip-text text-3xl font-semibold tracking-tight text-transparent">
          {aiConfig?.title ?? "扶桑 AI"}
        </div>
        <div className="mt-1 text-sm text-slate-500">{aiConfig?.subtitle ?? "基于知识库和博客的智能问答"}</div>
        <div className="mt-2 flex items-center justify-center gap-2 text-xs text-slate-500">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          {aiConfig?.status ?? "在线"}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-soft">
        <div className="flex min-h-[520px] items-center justify-center px-6 py-10">
          <div className="text-center">
            <div className="flex justify-center">
              <img
                src={heroImg}
                alt="avatar"
                className="h-16 w-16 rounded-full object-cover"
              />
            </div>
            <div className="mt-4 text-base font-semibold text-slate-900">开始与 AI 对话</div>
            <div className="mt-1 text-sm text-slate-500">基于知识库的智能问答，随时为你解答</div>

            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {quickPrompts.map((p) => (
                <button
                  key={p}
                  type="button"
                  className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
                  onClick={() => setText(p)}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="border-t border-slate-200 px-4 py-3">
          <div className="flex items-center gap-2">
            <select
              className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700"
              value={selectedModel}
              onChange={(e) => setModel(e.target.value)}
              aria-label="选择模型"
            >
              {models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>

            <input
              className="h-10 flex-1 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-blue-500"
              placeholder="输入您的问题..."
              value={text}
              onChange={(e) => setText(e.target.value)}
            />

            <button
              type="button"
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700"
              aria-label={`发送（${modelLabel}）`}
              onClick={() => setText("")}
            >
              发送
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
