"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, FileSearch, FolderSearch, Loader2, Download, Database } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getDatasets, listOssFiles, sampleOssFiles } from "@/lib/api";
import type { Dataset, OssListFilesResult, OssSampleResult } from "@/lib/types";

const SAMPLE_SIZE_OPTIONS = [100, 1000, 10000];
const DATASET_PAGE_SIZE = 20;

export default function ToolsPage() {
  // ── 文件统计 ──
  const [listOssPath, setListOssPath] = useState("");
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [listResult, setListResult] = useState<OssListFilesResult | null>(
    null,
  );

  // ── 数据集列表 ──
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const activeDatasets = useMemo(
    () => datasets.filter((d) => d.status === "active"),
    [datasets],
  );

  // ── 随机抽样 ──
  const [sampleOssPath, setSampleOssPath] = useState("");
  const [sampleSize, setSampleSize] = useState(100);
  const [sampleLoading, setSampleLoading] = useState(false);
  const [sampleError, setSampleError] = useState<string | null>(null);
  const [sampleResult, setSampleResult] = useState<OssSampleResult | null>(
    null,
  );

  // ── 数据集下拉 ──
  const [datasetDropdownOpen, setDatasetDropdownOpen] = useState(false);
  const [datasetFilterPage, setDatasetFilterPage] = useState(1);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const matchedDatasets = useMemo(() => {
    const q = sampleOssPath.toLowerCase().trim();
    if (!q) return activeDatasets;
    return activeDatasets.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        d.locationPath.toLowerCase().includes(q),
    );
  }, [activeDatasets, sampleOssPath]);

  const totalPages = Math.max(1, Math.ceil(matchedDatasets.length / DATASET_PAGE_SIZE));
  const currentPage = Math.min(datasetFilterPage, totalPages);
  const pagedDatasets = useMemo(
    () => matchedDatasets.slice((currentPage - 1) * DATASET_PAGE_SIZE, currentPage * DATASET_PAGE_SIZE),
    [matchedDatasets, currentPage],
  );

  // 点击外部关闭下拉
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDatasetDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    getDatasets().then((result) => {
      if (result.data) setDatasets(result.data);
    });
  }, []);

  function selectDataset(ds: Dataset) {
    setSampleOssPath(ds.locationPath);
    setDatasetDropdownOpen(false);
    setDatasetFilterPage(1);
  }

  async function handleListFiles() {
    setListLoading(true);
    setListError(null);
    setListResult(null);
    const result = await listOssFiles(listOssPath);
    if (result.error) {
      setListError(result.error);
    } else {
      setListResult(result.data);
    }
    setListLoading(false);
  }

  function handleExport() {
    if (!sampleResult || sampleResult.sampleLines.length === 0) return;
    const jsonl = sampleResult.sampleLines.join("\n") + "\n";
    const blob = new Blob([jsonl], { type: "application/x-ndjson" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `oss-sample-${sampleResult.sampleLines.length}.jsonl`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async function handleSampleFiles() {
    setSampleLoading(true);
    setSampleError(null);
    setSampleResult(null);
    const result = await sampleOssFiles(sampleOssPath, sampleSize);
    if (result.error) {
      setSampleError(result.error);
    } else {
      setSampleResult(result.data);
    }
    setSampleLoading(false);
  }

  return (
    <div className="space-y-7">
      <section>
        <h2 className="text-xl font-semibold tracking-normal text-zinc-950">
          工具箱
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          OSS 文件目录统计与随机抽样工具。
        </p>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        {/* 文件列表统计卡片 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FolderSearch className="h-5 w-5 text-zinc-500" />
              文件列表统计
            </CardTitle>
            <CardDescription>
              统计 OSS 目录下的文件数量，并展示前 10 条文件名。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Input
                placeholder="oss://bucket-name/prefix/"
                value={listOssPath}
                onChange={(e) => setListOssPath(e.target.value)}
                className="flex-1"
              />
              <button
                type="button"
                onClick={handleListFiles}
                disabled={listLoading || !listOssPath.trim()}
                className="inline-flex h-9 items-center gap-1.5 rounded-md bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
              >
                {listLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "统计"
                )}
              </button>
            </div>

            {listError && (
              <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                {listError}
              </div>
            )}

            {listResult && (
              <div className="space-y-3 rounded-md border border-zinc-200 bg-zinc-50 p-4">
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-zinc-500">
                    文件总数：
                    <span className="font-semibold text-zinc-900 tabular-nums">
                      {listResult.totalFiles.toLocaleString("zh-CN")}
                    </span>
                  </span>
                  <span className="text-xs text-zinc-400">
                    Bucket: {listResult.bucket}
                  </span>
                </div>
                {listResult.topFiles.length > 0 && (
                  <div>
                    <div className="text-xs font-medium text-zinc-500 mb-2">
                      前 {listResult.topFiles.length} 条文件：
                    </div>
                    <ul className="space-y-0.5 max-h-48 overflow-y-auto rounded border border-zinc-200 bg-white p-2">
                      {listResult.topFiles.map((file, idx) => (
                        <li
                          key={idx}
                          className="text-xs text-zinc-700 font-mono truncate hover:text-zinc-900"
                          title={file}
                        >
                          <span className="text-zinc-400 mr-2 tabular-nums">
                            {idx + 1}.
                          </span>
                          {file}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 随机抽样卡片 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileSearch className="h-5 w-5 text-zinc-500" />
              随机抽样统计
            </CardTitle>
            <CardDescription>
              从 OSS 目录第一层的 .jsonl.gz / .zst / .zstd 文件中随机抽样内容行。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* OSS 目录输入 + 数据集搜索下拉 */}
            <div ref={dropdownRef} className="relative">
              <div className="relative">
                <Database className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                <Input
                  placeholder="搜索或输入 oss://bucket-name/prefix/"
                  value={sampleOssPath}
                  onFocus={() => setDatasetDropdownOpen(true)}
                  onChange={(e) => {
                    setSampleOssPath(e.target.value);
                    setDatasetDropdownOpen(true);
                    setDatasetFilterPage(1);
                  }}
                  className="flex-1 pl-9"
                />
              </div>

              {/* 数据集下拉面板 */}
              {datasetDropdownOpen && activeDatasets.length > 0 && (
                <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-80 overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-lg">
                  {matchedDatasets.length === 0 ? (
                    <div className="px-3 py-6 text-center text-xs text-zinc-400">
                      无匹配的数据集
                    </div>
                  ) : (
                    <div className="divide-y divide-zinc-100 max-h-64 overflow-y-auto">
                      {pagedDatasets.map((ds) => (
                        <button
                          key={ds.id}
                          type="button"
                          onClick={() => selectDataset(ds)}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-zinc-50 transition-colors"
                        >
                          <div className="truncate font-medium text-zinc-800">{ds.name}</div>
                          <div className="mt-0.5 truncate text-xs text-zinc-400 font-mono">
                            {ds.locationPath}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  {/* 分页 */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between border-t border-zinc-100 px-3 py-2 text-xs text-zinc-500">
                      <span>
                        {matchedDatasets.length} 个数据集 · 第 {currentPage}/{totalPages} 页
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setDatasetFilterPage((p) => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                          className="inline-flex h-6 w-6 items-center justify-center rounded hover:bg-zinc-100 disabled:opacity-30"
                        >
                          <ChevronLeft className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDatasetFilterPage((p) => Math.min(totalPages, p + 1))}
                          disabled={currentPage === totalPages}
                          className="inline-flex h-6 w-6 items-center justify-center rounded hover:bg-zinc-100 disabled:opacity-30"
                        >
                          <ChevronRight className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <label className="text-sm text-zinc-500 shrink-0">
                抽样数量：
              </label>
              <div className="flex gap-1">
                {SAMPLE_SIZE_OPTIONS.map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setSampleSize(size)}
                    className={`inline-flex h-8 items-center justify-center rounded-md px-3 text-sm font-medium transition-colors ${
                      sampleSize === size
                        ? "bg-zinc-900 text-white"
                        : "border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
                    }`}
                  >
                    {size.toLocaleString("zh-CN")}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={handleSampleFiles}
                disabled={sampleLoading || !sampleOssPath.trim()}
                className="inline-flex h-9 items-center gap-1.5 rounded-md bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0 ml-auto"
              >
                {sampleLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "执行抽样"
                )}
              </button>
            </div>

            {sampleError && (
              <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                {sampleError}
              </div>
            )}

            {sampleResult && (
              <div className="space-y-3 rounded-md border border-zinc-200 bg-zinc-50 p-4">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                  <span className="text-zinc-500">
                    抽样行数：
                    <span className="font-semibold text-zinc-900 tabular-nums">
                      {sampleResult.sampleLines.length.toLocaleString("zh-CN")}
                    </span>
                  </span>
                  <span className="text-xs text-zinc-400">
                    文件总数: {sampleResult.totalFiles.toLocaleString("zh-CN")}
                  </span>
                  <span className="text-xs text-zinc-400">
                    Bucket: {sampleResult.bucket}
                  </span>
                </div>

                {sampleResult.sampleLines.length > 0 && (
                  <>
                    <div>
                      <div className="text-xs font-medium text-zinc-500 mb-2">
                        抽样内容（前 20 行，每行最多 200 字符）：
                      </div>
                      <ul className="space-y-0.5 max-h-64 overflow-y-auto rounded border border-zinc-200 bg-white p-2">
                        {sampleResult.sampleLines.slice(0, 20).map(
                          (line, idx) => (
                            <li
                              key={idx}
                              className="text-xs text-zinc-700 font-mono truncate hover:text-zinc-900 leading-relaxed"
                              title={line}
                            >
                              <span className="text-zinc-400 mr-2 tabular-nums align-top">
                                {idx + 1}.
                              </span>
                              {line.length > 200 ? line.slice(0, 200) + "…" : line}
                            </li>
                          ),
                        )}
                      </ul>
                    </div>
                    <button
                      type="button"
                      onClick={handleExport}
                      className="inline-flex h-8 items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-3 text-xs font-medium text-zinc-700 hover:bg-zinc-50 hover:border-zinc-300 transition-colors"
                    >
                      <Download className="h-3.5 w-3.5" />
                      导出 JSONL（{sampleResult.sampleLines.length.toLocaleString("zh-CN")} 行）
                    </button>
                  </>
                )}

                {sampleResult.errors.length > 0 && (
                  <div className="rounded border border-amber-200 bg-amber-50 p-2 text-xs text-amber-700 max-h-24 overflow-y-auto">
                    <div className="font-medium mb-1">
                      错误 ({sampleResult.errors.length})：
                    </div>
                    {sampleResult.errors.map((err, idx) => (
                      <div key={idx}>{err}</div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}