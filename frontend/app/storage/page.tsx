"use client";

import { useEffect, useMemo, useState } from "react";
import { Database, HardDrive } from "lucide-react";

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

function formatBytes(bytes: number) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value >= 10 ? value.toFixed(0) : value.toFixed(1)} ${units[unitIndex]}`;
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

export default function StoragePage() {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [error, setError] = useState<string | null>(null);

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
      const existing = groups.get(key);
      if (existing) {
        existing.bytes += d.dataSize;
        existing.datasetCount += 1;
        if (d.status === "active") existing.activeCount += 1;
        else existing.deletedCount += 1;
      } else {
        groups.set(key, {
          label,
          key,
          bytes: d.dataSize,
          datasetCount: 1,
          activeCount: d.status === "active" ? 1 : 0,
          deletedCount: d.status !== "active" ? 1 : 0,
        });
      }

      totalBytes += d.dataSize;
      if (d.status === "active") activeBytes += d.dataSize;
      else deletedBytes += d.dataSize;
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
                <CardTitle className="text-sm">
                  全部数据集 ({datasets.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="divide-y divide-zinc-100 p-0">
                {datasets.map((d) => (
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
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}