import { useMemo, useState } from "react";

type ParseOk = { ok: true; value: unknown };
type ParseFail = { ok: false; message: string };

function safeParseJson(input: string): ParseOk | ParseFail {
  try {
    return { ok: true, value: JSON.parse(input) };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "JSON 解析失败" };
  }
}

export function JsonFormatterPage() {
  const [input, setInput] = useState("");
  const [indent, setIndent] = useState(2);

  const parsed = useMemo(() => {
    const trimmed = input.trim();
    if (!trimmed) return null;
    return safeParseJson(trimmed);
  }, [input]);

  const formatted = useMemo(() => {
    if (!parsed || !parsed.ok) return "";
    return JSON.stringify(parsed.value, null, indent);
  }, [indent, parsed]);

  const minified = useMemo(() => {
    if (!parsed || !parsed.ok) return "";
    return JSON.stringify(parsed.value);
  }, [parsed]);

  return (
    <div>
      <div className="mb-6">
        <div className="text-3xl font-semibold tracking-tight">JSON 格式化</div>
        <div className="mt-1 text-sm text-slate-500">在线 JSON 格式化、压缩、校验工具</div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold text-slate-900">输入</div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
                onClick={() => setInput("")}
              >
                清空
              </button>
            </div>
          </div>

          <textarea
            className="mt-3 h-[520px] w-full resize-none rounded-lg border border-slate-200 bg-white p-3 font-mono text-xs leading-5 text-slate-800 outline-none focus:border-blue-500"
            placeholder='例如：{"name":"Fsanq","skills":["React","Nest"]}'
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />

          <div className="mt-3 text-xs">
            {parsed && parsed.ok === false ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-red-700">
                {parsed.message}
              </div>
            ) : parsed && parsed.ok ? (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-700">
                JSON 校验通过
              </div>
            ) : (
              <div className="text-slate-500">输入 JSON 后将自动校验</div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm font-semibold text-slate-900">输出</div>

            <div className="flex flex-wrap items-center gap-2">
              <label className="text-xs text-slate-600">
                缩进
                <select
                  className="ml-2 h-8 rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-700"
                  value={indent}
                  onChange={(e) => setIndent(Number(e.target.value))}
                >
                  <option value={2}>2</option>
                  <option value={4}>4</option>
                  <option value={8}>8</option>
                </select>
              </label>

              <button
                type="button"
                className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-60"
                disabled={!formatted}
                onClick={() => {
                  void navigator.clipboard.writeText(formatted);
                }}
              >
                复制格式化
              </button>

              <button
                type="button"
                className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                disabled={!minified}
                onClick={() => {
                  void navigator.clipboard.writeText(minified);
                }}
              >
                复制压缩
              </button>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-3">
            <div>
              <div className="text-xs font-semibold text-slate-700">格式化</div>
              <textarea
                readOnly
                className="mt-2 h-[240px] w-full resize-none rounded-lg border border-slate-200 bg-slate-50 p-3 font-mono text-xs leading-5 text-slate-800"
                value={formatted}
              />
            </div>

            <div>
              <div className="text-xs font-semibold text-slate-700">压缩</div>
              <textarea
                readOnly
                className="mt-2 h-[240px] w-full resize-none rounded-lg border border-slate-200 bg-slate-50 p-3 font-mono text-xs leading-5 text-slate-800"
                value={minified}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
