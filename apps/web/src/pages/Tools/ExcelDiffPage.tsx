import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

type Preview = {
  keyHeader: string;
  sheetName: string;
  totalA: number;
  totalB: number;
  added: number;
  removed: number;
  modified: number;
  samples: Array<{
    key: string;
    changes: Array<{ column: string; before: unknown; after: unknown }>;
  }>;
};

async function postPreview(form: FormData): Promise<Preview> {
  const res = await fetch("/api/public/tools/excel-diff/preview", { method: "POST", body: form });
  if (!res.ok) throw new Error(`预览失败：${res.status}`);
  return (await res.json()) as Preview;
}

async function postDownload(form: FormData): Promise<Blob> {
  const res = await fetch("/api/public/tools/excel-diff/download", { method: "POST", body: form });
  if (!res.ok) throw new Error(`下载失败：${res.status}`);
  return await res.blob();
}

export function ExcelDiffPage() {
  const [fileA, setFileA] = useState<File | null>(null);
  const [fileB, setFileB] = useState<File | null>(null);
  const [keyColumn, setKeyColumn] = useState("");
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canRun = useMemo(() => Boolean(fileA && fileB), [fileA, fileB]);

  const formData = useMemo(() => {
    if (!fileA || !fileB) return null;
    const form = new FormData();
    form.append("fileA", fileA);
    form.append("fileB", fileB);
    if (keyColumn.trim()) form.append("keyColumn", keyColumn.trim());
    return form;
  }, [fileA, fileB, keyColumn]);

  return (
    <div>
      <div className="mb-6">
        <div className="text-3xl font-semibold tracking-tight">Excel 差异对比</div>
        <div className="mt-1 text-sm text-slate-500">上传两个 Excel 文件，生成差异报告并下载</div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-sm font-semibold text-slate-900">上传文件</div>
          <div className="mt-3 space-y-3 text-sm">
            <div>
              <div className="text-xs font-semibold text-slate-700">文件 A（基准）</div>
              <input
                className="mt-2 block w-full text-sm"
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => setFileA(e.target.files?.[0] ?? null)}
              />
              <div className="mt-1 text-xs text-slate-500">{fileA ? fileA.name : "未选择"}</div>
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-700">文件 B（对比）</div>
              <input
                className="mt-2 block w-full text-sm"
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => setFileB(e.target.files?.[0] ?? null)}
              />
              <div className="mt-1 text-xs text-slate-500">{fileB ? fileB.name : "未选择"}</div>
            </div>

            <div>
              <div className="text-xs font-semibold text-slate-700">主键列（可选）</div>
              <input
                className="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-blue-500"
                placeholder="例如：id / 编号 / 手机号（默认取第一列）"
                value={keyColumn}
                onChange={(e) => setKeyColumn(e.target.value)}
              />
            </div>

            {error ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {error}
              </div>
            ) : null}

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={!canRun || loading || !formData}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
                onClick={async () => {
                  if (!formData) return;
                  setLoading(true);
                  setError(null);
                  try {
                    const data = await postPreview(formData);
                    setPreview(data);
                  } catch (e) {
                    setPreview(null);
                    setError(e instanceof Error ? e.message : "预览失败");
                  } finally {
                    setLoading(false);
                  }
                }}
              >
                {loading ? "对比中..." : "生成预览"}
              </button>

              <button
                type="button"
                disabled={!preview || loading || !formData}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                onClick={async () => {
                  if (!formData) return;
                  setLoading(true);
                  setError(null);
                  try {
                    const blob = await postDownload(formData);
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `excel-diff-${Date.now()}.xlsx`;
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                    URL.revokeObjectURL(url);
                  } catch (e) {
                    setError(e instanceof Error ? e.message : "下载失败");
                  } finally {
                    setLoading(false);
                  }
                }}
              >
                下载差异结果
              </button>

              <Link className="text-sm text-blue-600 underline" to="/tools">
                返回开发工具
              </Link>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-sm font-semibold text-slate-900">对比预览</div>
          {preview ? (
            <div className="mt-3 space-y-3 text-sm">
              <div className="text-xs text-slate-500">
                Sheet：{preview.sheetName}，主键列：{preview.keyHeader}
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                  A 行数：{preview.totalA}
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                  B 行数：{preview.totalB}
                </div>
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-700">
                  新增：{preview.added}
                </div>
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-red-700">
                  删除：{preview.removed}
                </div>
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-700">
                  修改：{preview.modified}
                </div>
              </div>

              <div>
                <div className="text-xs font-semibold text-slate-700">变更样例</div>
                <div className="mt-2 max-h-[360px] overflow-auto rounded-lg border border-slate-200">
                  {preview.samples.length === 0 ? (
                    <div className="p-3 text-sm text-slate-500">暂无变更样例</div>
                  ) : (
                    <div className="divide-y divide-slate-200">
                      {preview.samples.map((s) => (
                        <div key={s.key} className="p-3">
                          <div className="text-xs font-semibold text-slate-900">Key：{s.key}</div>
                          <div className="mt-2 space-y-1 text-xs text-slate-600">
                            {s.changes.map((c) => (
                              <div key={c.column} className="flex flex-wrap gap-x-2">
                                <span className="font-semibold text-slate-700">{c.column}：</span>
                                <span className="text-red-600">{String(c.before ?? "")}</span>
                                <span className="text-slate-400">→</span>
                                <span className="text-emerald-700">{String(c.after ?? "")}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-3 text-sm text-slate-500">
              先上传两个文件并点击“生成预览”，然后可下载差异结果（xlsx）。
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
