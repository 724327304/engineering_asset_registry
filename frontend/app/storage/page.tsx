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
  RefreshCw,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDatasets, getOssStorage, type OssBucketUsage, type OssStorage } from "@/lib/api";
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
const OSS_BUCKET_COLORS = ["#2563eb", "#059669", "#d97706", "#7c3aed", "#dc2626"];

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
  const [ossStorage, setOssStorage] = useState<OssStorage | null>(null);
  const [ossError, setOssError] = useState<string | null>(null);
  const [refreshingOss, setRefreshingOss] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [nameSortDirection, setNameSortDirection] = useState<SortDirection>("desc");

  async function refreshOssStorage() {
    setRefreshingOss(true);
    setOssError(null);
    const result = await getOssStorage();
    if (result.error) {
      setOssError(result.error);
    } else {
      setOssStorage(result.data ?? null);
    }
    setRefreshingOss(false);
  }

  useEffect(() => {
    getDatasets().then((result) => {
      if (result.error) {
        setError(result.error);
        return;
      }
      setDatasets(result.data ?? []);
    });
    refreshOssStorage();
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

          {/* OSS live usage */}
          <Card>
            <CardHeader className="border-b border-zinc-200 pb-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-sm">OSS 实际存储现状</CardTitle>
                  <div className="mt-1 text-xs text-zinc-500">
                    {ossStorage
                      ? `最近同步：${ossStorage.generatedAtLabel}`
                      : "尚未同步 OSS 存储信息"}
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={refreshOssStorage}
                  disabled={refreshingOss}
                >
                  <RefreshCw
                    className={refreshingOss ? "h-4 w-4 animate-spin" : "h-4 w-4"}
                    aria-hidden="true"
                  />
                  {refreshingOss ? "同步中" : "刷新"}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {ossError && (
                <div className="border-b border-rose-100 bg-rose-50 px-5 py-3 text-sm text-rose-700">
                  OSS 存储读取失败：{ossError}
                </div>
              )}
              {!ossStorage && !ossError && (
                <div className="p-10 text-center text-sm text-zinc-500">
                  {refreshingOss ? "正在同步 OSS 存储信息..." : "暂无 OSS 存储信息。"}
                </div>
              )}
              {ossStorage && (
                <>
                  <div className="grid gap-4 border-b border-zinc-100 p-5 md:grid-cols-3">
                    <StorageMetric label="OSS 总上限" value={ossStorage.totalLimitLabel} />
                    <StorageMetric label="OSS 已用" value={ossStorage.totalUsedLabel} tone="strong" />
                    <StorageMetric label="OSS 剩余" value={ossStorage.totalRemainingLabel} />
                  </div>
                  <OssBucketPieCharts buckets={ossStorage.buckets} />
                  <div className="divide-y divide-zinc-100">
                    {ossStorage.buckets.map((bucket) => (
                      <div key={bucket.name} className="px-5 py-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-zinc-900">{bucket.name}</span>
                              {bucket.error ? (
                                <Badge variant="destructive">获取失败</Badge>
                              ) : (
                                <Badge variant="secondary">{bucket.usagePercent.toFixed(2)}%</Badge>
                              )}
                            </div>
                            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500">
                              <span>已用 {bucket.usedLabel}</span>
                              <span>上限 {bucket.limitLabel}</span>
                              <span>剩余 {bucket.remainingLabel}</span>
                              <span>对象 {bucket.objectCountLabel}</span>
                              <span>分片上传 {bucket.multipartUploadsLabel}</span>
                            </div>
                            {bucket.error && (
                              <div className="mt-2 text-xs text-rose-600">{bucket.error}</div>
                            )}
                          </div>
                        </div>
                        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-zinc-100">
                          <div
                            className={bucket.usagePercent >= 90 ? "h-full rounded-full bg-rose-500" : "h-full rounded-full bg-zinc-500"}
                            style={{
                              width: `${Math.min(100, Math.max(0, bucket.usagePercent)).toFixed(0)}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

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

function OssBucketPieCharts({ buckets }: { buckets: OssBucketUsage[] }) {
  return (
    <div className="grid gap-4 border-b border-zinc-100 p-5 md:grid-cols-3">
      {buckets.map((bucket, index) => (
        <OssBucketPieCard
          key={bucket.name}
          bucket={bucket}
          color={OSS_BUCKET_COLORS[index % OSS_BUCKET_COLORS.length]}
        />
      ))}
    </div>
  );
}

function OssBucketPieCard({ bucket, color }: { bucket: OssBucketUsage; color: string }) {
  const rawPercent = bucket.limitBytes > 0 ? bucket.usedBytes / bucket.limitBytes : 0;
  const usedPercent = Math.min(1, Math.max(0, rawPercent));
  const usageLabel = bucket.error ? "--" : `${bucket.usagePercent.toFixed(2)}%`;

  return (
    <div className="rounded-md border border-zinc-200 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-medium text-zinc-900">{bucket.name}</div>
          <div className="mt-1 text-xs text-zinc-500">已用 / 上限</div>
        </div>
        {bucket.error ? (
          <Badge variant="destructive">获取失败</Badge>
        ) : (
          <Badge variant="secondary">{usageLabel}</Badge>
        )}
      </div>
      <div className="mt-4 flex items-center justify-center">
        <svg
          viewBox="0 0 120 120"
          role="img"
          aria-label={`${bucket.name} 存储占用情况`}
          className="h-36 w-36"
        >
          <circle cx="60" cy="60" r="48" fill="#f4f4f5" />
          {!bucket.error && usedPercent >= 0.9999 && (
            <circle cx="60" cy="60" r="48" fill={color} />
          )}
          {!bucket.error && usedPercent > 0 && usedPercent < 0.9999 && (
            <path d={createPieSlicePath(60, 60, 48, 0, usedPercent)} fill={color} />
          )}
          <circle cx="60" cy="60" r="25" fill="white" />
          <text
            x="60"
            y="57"
            textAnchor="middle"
            className="fill-zinc-500 text-[9px] font-medium"
          >
            占用率
          </text>
          <text
            x="60"
            y="72"
            textAnchor="middle"
            className="fill-zinc-950 text-[12px] font-semibold"
          >
            {usageLabel}
          </text>
        </svg>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
        <div>
          <div className="text-zinc-500">已用</div>
          <div className="mt-0.5 font-medium text-zinc-900">{bucket.usedLabel}</div>
        </div>
        <div>
          <div className="text-zinc-500">剩余</div>
          <div className="mt-0.5 font-medium text-zinc-900">{bucket.remainingLabel}</div>
        </div>
        <div>
          <div className="text-zinc-500">上限</div>
          <div className="mt-0.5 font-medium text-zinc-900">{bucket.limitLabel}</div>
        </div>
        <div>
          <div className="text-zinc-500">对象</div>
          <div className="mt-0.5 font-medium text-zinc-900">{bucket.objectCountLabel}</div>
        </div>
      </div>
      {bucket.error && (
        <div className="mt-3 text-xs text-rose-600">{bucket.error}</div>
      )}
    </div>
  );
}

function createPieSlicePath(
  centerX: number,
  centerY: number,
  radius: number,
  startPercent: number,
  endPercent: number,
) {
  const start = polarToCartesian(centerX, centerY, radius, startPercent * 360);
  const end = polarToCartesian(centerX, centerY, radius, endPercent * 360);
  const largeArcFlag = endPercent - startPercent > 0.5 ? 1 : 0;

  return [
    `M ${centerX} ${centerY}`,
    `L ${start.x} ${start.y}`,
    `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`,
    "Z",
  ].join(" ");
}

function polarToCartesian(centerX: number, centerY: number, radius: number, angleDegrees: number) {
  const angleRadians = (angleDegrees - 90) * (Math.PI / 180);
  return {
    x: centerX + radius * Math.cos(angleRadians),
    y: centerY + radius * Math.sin(angleRadians),
  };
}

function StorageMetric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "strong";
}) {
  return (
    <div>
      <div className="text-xs font-medium text-zinc-500">{label}</div>
      <div className={tone === "strong" ? "mt-1 text-lg font-semibold text-zinc-950" : "mt-1 text-lg font-semibold text-zinc-800"}>
        {value}
      </div>
    </div>
  );
}
