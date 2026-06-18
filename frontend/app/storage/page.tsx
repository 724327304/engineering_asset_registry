"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Database,
  HardDrive,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDatasets } from "@/lib/api";
import type { Dataset } from "@/lib/types";

type StorageGroup = {
  label: string;
  key: string;
  bytes: number;
  datasetCount: number;
  activeCount: number;
  deletedCount: number;
};

type SortDirection = "asc" | "desc";

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

function formatBytes(bytes: number) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  const formatted = new Intl.NumberFormat("zh-CN", {
    maximumFractionDigits: 2,
  }).format(value);
  return `${formatted} ${units[unitIndex]}`;
}

function toBytes(value: number, unit: string): number {
  const multipliers: Record<string, number> = {
    B: 1,
    KB: 1024,
    MB: 1024 * 1024,
    GB: 1024 * 1024 * 1024,
    TB: 1024 * 1024 * 1024 * 1024,
  };
  return value * (multipliers[unit] ?? 1);
}

function inferStorageType(locationPath: string): { key: string; label: string } {
  const lower = locationPath.toLowerCase();
  if (lower.includes("oss") || lower.includes("aliyuncs")) return { key: "oss", label: "OSS" };
  if (lower.includes("nas") || lower.startsWith("/mnt/") || lower.startsWith("/data/"))
    return { key: "nas", label: "NAS" };
  if (lower.includes("hdfs") || lower.startsWith("hdfs://"))
    return { key: "hdfs", label: "HDFS" };
  if (lower.includes("s3") || lower.includes("amazonaws"))
    return { key: "s3", label: "S3" };
  return { key: "other", label: "其他" };
}

function getDumpBatch(dataset: Dataset) {
  const batch = dataset.name.match(/CC-MAIN-(20\d{2})-(\d{2})/);

  if (!batch) return null;
  return {
    year: Number(batch[1]),
    week: Number(batch[2]),
  };
}

function compareByDumpBatch(a: Dataset, b: Dataset) {
  const aBatch = getDumpBatch(a);
  const bBatch = getDumpBatch(b);

  if (aBatch && bBatch) {
    if (aBatch.year !== bBatch.year) return aBatch.year - bBatch.year;
    if (aBatch.week !== bBatch.week) return aBatch.week - bBatch.week;
  }

  if (aBatch && !bBatch) return -1;
  if (!aBatch && bBatch) return 1;

  return a.name.localeCompare(b.name, "zh-CN");
}

export default function StoragePage() {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [nameSortDirection, setNameSortDirection] = useState<SortDirection>("desc");

  useEffect(() => {
    getDatasets().then((result) => {
      if (result.error) {
        setError(result.error);
        return;
      }
      setDatasets(result.data ?? []);
    });
  }, []);

  const storageData = useMemo(() => {
    const groups = new Map<string, StorageGroup>();
    let totalBytes = 0;
    let activeBytes = 0;
    let deletedBytes = 0;

    datasets.forEach((d) => {
      const { key, label } = inferStorageType(d.locationPath);
      const bytes = toBytes(d.dataSize, d.sizeUnit);
      const existing = groups.get(key);
      if (existing) {
        existing.bytes += bytes;
        existing.datasetCount += 1;
        if (d.status === "active") existing.activeCount += 1;
        else existing.deletedCount += 1;
      } else {
        groups.set(key, {
          label,
          key,
          bytes,
          datasetCount: 1,
          activeCount: d.status === "active" ? 1 : 0,
          deletedCount: d.status !== "active" ? 1 : 0,
        });
      }

      totalBytes += bytes;
      if (d.status === "active") activeBytes += bytes;
      else deletedBytes += bytes;
    });

    const sortedGroups = Array.from(groups.values()).sort((a, b) => b.bytes - a.bytes);

    return {
      groups: sortedGroups,
      totalBytes,
      totalLabel: formatBytes(totalBytes),
      activeBytes,
      activeLabel: formatBytes(activeBytes),
      deletedBytes,
      deletedLabel: formatBytes(deletedBytes),
    };
  }, [datasets]);

  const sortedDatasets = useMemo(() => {
    return [...datasets].sort((a, b) => {
      const result = compareByDumpBatch(a, b);
      return nameSortDirection === "asc" ? result : -result;
    });
  }, [datasets, nameSortDirection]);

  const totalPages = Math.max(1, Math.ceil(sortedDatasets.length / pageSize));
  const currentPage = Math.min(page, totalPages);

  const pagedDatasets = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedDatasets.slice(start, start + pageSize);
  }, [sortedDatasets, currentPage, pageSize]);

  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-xl font-semibold tracking-normal text-zinc-950">存储概览</h2>
        <p className="mt-1 text-sm text-zinc-500">
          按存储系统聚合的数据资产容量视图，所有单位基于数据集登记的 data_size 汇总。
        </p>
      </section>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center text-sm text-red-600">
          后端服务暂不可用：{error}
        </div>
      )}

      {!error && (
        <div className="space-y-6">
          {/* Summary cards */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-zinc-500">总存储量</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <HardDrive className="h-4 w-4 text-zinc-400" />
                  <span className="text-2xl font-semibold text-zinc-900">
                    {storageData.totalLabel}
                  </span>
                </div>
                <div className="mt-1.5 text-xs text-zinc-500">
                  {datasets.length} 个数据集
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-zinc-500">活跃存储</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <HardDrive className="h-4 w-4 text-emerald-500" />
                  <span className="text-2xl font-semibold text-emerald-700">
                    {storageData.activeLabel}
                  </span>
                </div>
                <div className="mt-1.5 text-xs text-zinc-500">
                  {storageData.totalBytes > 0
                    ? `${((storageData.activeBytes / storageData.totalBytes) * 100).toFixed(0)}% 已用`
                    : "0% 已用"}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-zinc-500">已删除</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <HardDrive className="h-4 w-4 text-red-400" />
                  <span className="text-2xl font-semibold text-red-600">
                    {storageData.deletedLabel}
                  </span>
                </div>
                <div className="mt-1.5 text-xs text-zinc-500">
                  {storageData.totalBytes > 0
                    ? `${((storageData.deletedBytes / storageData.totalBytes) * 100).toFixed(0)}% 已标记删除`
                    : "0% 已标记删除"}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Per-storage-type breakdown */}
          <Card>
            <CardHeader className="border-b border-zinc-200 pb-4">
              <CardTitle className="text-sm">按存储系统分布</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {storageData.groups.length === 0 && (
                <div className="p-10 text-center text-sm text-zinc-500">
                  暂无数据。
                </div>
              )}
              {storageData.groups.map((group) => (
                <div
                  key={group.key}
                  className="flex items-center gap-4 border-b border-zinc-100 px-5 py-4 last:border-b-0"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50">
                    <Database className="h-5 w-5 text-zinc-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-zinc-900">
                        {group.label}
                      </span>
                      <Badge variant="secondary" className="text-xs">
                        {group.datasetCount} 个数据集
                      </Badge>
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-xs text-zinc-500">
                      <span>容量: {formatBytes(group.bytes)}</span>
                      <span className="text-emerald-600">
                        活跃 {group.activeCount}
                      </span>
                      {group.deletedCount > 0 && (
                        <span className="text-red-500">
                          删除 {group.deletedCount}
                        </span>
                      )}
                    </div>
                    {/* Simple bar */}
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-zinc-100">
                      <div
                        className="h-full rounded-full bg-zinc-400 transition-all"
                        style={{
                          width: storageData.totalBytes > 0
                            ? `${((group.bytes / storageData.totalBytes) * 100).toFixed(0)}%`
                            : "0%",
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Dataset list */}
          {datasets.length > 0 && (
            <Card>
              <CardHeader className="border-b border-zinc-200 pb-4">
                <div className="flex items-center justify-between gap-4">
                  <CardTitle className="text-sm">
                    全部数据集 ({datasets.length})
                  </CardTitle>
                  <button
                    type="button"
                    onClick={() => {
                      setNameSortDirection((current) =>
                        current === "desc" ? "asc" : "desc",
                      );
                      setPage(1);
                    }}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 transition-colors hover:text-zinc-950"
                  >
                    名称
                    {nameSortDirection === "desc" ? (
                      <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
                    ) : (
                      <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
                    )}
                  </button>
                </div>
              </CardHeader>
              <CardContent className="divide-y divide-zinc-100 p-0">
                {pagedDatasets.map((d) => (
                  <div
                    key={d.id}
                    className="flex items-center gap-4 px-5 py-3.5"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-zinc-900">
                        {d.name}
                      </div>
                      <div className="mt-0.5 text-xs text-zinc-500">
                        {d.sizeLabel} · {inferStorageType(d.locationPath).label} · {d.owner}
                      </div>
                    </div>
                    <Badge variant={d.status === "active" ? "success" : "destructive"}>
                      {d.statusLabel}
                    </Badge>
                  </div>
                ))}
                <div className="flex items-center justify-between gap-4 px-5 py-4 text-sm">
                  <div className="flex items-center gap-2 text-zinc-500">
                    <span>每页</span>
                    <select
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(Number(e.target.value));
                        setPage(1);
                      }}
                      className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
                    >
                      {PAGE_SIZE_OPTIONS.map((size) => (
                        <option key={size} value={size}>
                          {size}
                        </option>
                      ))}
                    </select>
                    <span>
                      条，共 {sortedDatasets.length} 条
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setPage(1)}
                      disabled={currentPage === 1}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      aria-label="第一页"
                    >
                      <ChevronsLeft className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      aria-label="上一页"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <span className="px-3 text-zinc-600">
                      第 {currentPage} / {totalPages} 页
                    </span>
                    <button
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      aria-label="下一页"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setPage(totalPages)}
                      disabled={currentPage === totalPages}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      aria-label="最后一页"
                    >
                      <ChevronsRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
