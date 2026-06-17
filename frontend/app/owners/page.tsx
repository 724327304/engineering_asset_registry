"use client";

import { useEffect, useMemo, useState } from "react";
import { Blocks, Database, HardDrive, ListChecks, User } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDatasets, getTasks } from "@/lib/api";
import type { Dataset, Task } from "@/lib/types";

type OwnerSummary = {
  owner: string;
  datasetCount: number;
  activeDatasets: number;
  deletedDatasets: number;
  taskCount: number;
  totalStorageBytes: number;
  datasetTypes: string[];
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

export default function OwnersPage() {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getDatasets(), getTasks()]).then(([datasetResult, taskResult]) => {
      if (datasetResult.error) {
        setError(datasetResult.error);
        return;
      }
      if (taskResult.error) {
        setError(taskResult.error);
        return;
      }
      setDatasets(datasetResult.data ?? []);
      setTasks(taskResult.data ?? []);
    });
  }, []);

  const owners = useMemo(() => {
    const ownerMap = new Map<string, {
      datasetCount: number;
      activeDatasets: number;
      deletedDatasets: number;
      totalStorageBytes: number;
      datasetTypes: Set<string>;
    }>();

    datasets.forEach((d) => {
      const o = d.owner || "未知";
      const existing = ownerMap.get(o);
      if (existing) {
        existing.datasetCount += 1;
        if (d.status === "active") existing.activeDatasets += 1;
        else existing.deletedDatasets += 1;
        existing.totalStorageBytes += d.dataSize;
        existing.datasetTypes.add(d.datasetTypeLabel);
      } else {
        ownerMap.set(o, {
          datasetCount: 1,
          activeDatasets: d.status === "active" ? 1 : 0,
          deletedDatasets: d.status !== "active" ? 1 : 0,
          totalStorageBytes: d.dataSize,
          datasetTypes: new Set([d.datasetTypeLabel]),
        });
      }
    });

    const taskCountByOwner = new Map<string, number>();
    tasks.forEach((t) => {
      if (!t.executor) return;
      taskCountByOwner.set(t.executor, (taskCountByOwner.get(t.executor) ?? 0) + 1);
    });

    // Also count tasks for owners via dataset ownership
    datasets.forEach((d) => {
      // find tasks where this dataset is input or output
      const taskIds = new Set<number>();
      tasks.forEach((t) => {
        if (t.inputDatasetId === d.id || t.outputDatasetId === d.id) {
          taskIds.add(t.id);
        }
      });
      const o = d.owner;
      if (o) {
        taskCountByOwner.set(o, (taskCountByOwner.get(o) ?? 0) + taskIds.size);
      }
    });

    const result: OwnerSummary[] = [];
    ownerMap.forEach((value, key) => {
      result.push({
        owner: key,
        ...value,
        taskCount: taskCountByOwner.get(key) ?? 0,
        datasetTypes: Array.from(value.datasetTypes),
      });
    });
    result.sort((a, b) => b.datasetCount - a.datasetCount);
    return result;
  }, [datasets, tasks]);

  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-xl font-semibold tracking-normal text-zinc-950">负责人</h2>
        <p className="mt-1 text-sm text-zinc-500">
          按负责人聚合的数据资产视图，展示每位负责人名下的数据集和任务概况。
        </p>
      </section>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center text-sm text-red-600">
          后端服务暂不可用：{error}
        </div>
      )}

      {!error && (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {owners.length === 0 && (
            <div className="md:col-span-2 xl:col-span-3">
              <Card>
                <CardContent className="p-10 text-center text-sm text-zinc-500">
                  暂无负责人数据。
                </CardContent>
              </Card>
            </div>
          )}

          {owners.map((owner) => (
            <Card key={owner.owner} className="overflow-hidden">
              <CardHeader className="border-b border-zinc-200 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-100">
                    <User className="h-4 w-4 text-zinc-500" />
                  </div>
                  <div>
                    <CardTitle className="text-sm">{owner.owner}</CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3.5 pt-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2 rounded-md bg-zinc-50 px-3 py-2.5">
                    <Database className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs text-zinc-500">数据集</div>
                      <div className="text-sm font-semibold text-zinc-900">
                        {owner.datasetCount}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 rounded-md bg-emerald-50 px-3 py-2.5">
                    <Blocks className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs text-emerald-600">活跃</div>
                      <div className="text-sm font-semibold text-emerald-700">
                        {owner.activeDatasets}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2 rounded-md bg-zinc-50 px-3 py-2.5">
                    <ListChecks className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs text-zinc-500">关联任务</div>
                      <div className="text-sm font-semibold text-zinc-900">
                        {owner.taskCount}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 rounded-md bg-zinc-50 px-3 py-2.5">
                    <HardDrive className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs text-zinc-500">存储量</div>
                      <div className="text-sm font-semibold text-zinc-900">
                        {formatBytes(owner.totalStorageBytes)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Dataset types tags */}
                {owner.datasetTypes.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {owner.datasetTypes.map((t) => (
                      <span
                        key={t}
                        className="rounded-md border border-zinc-200 bg-white px-2 py-0.5 text-xs text-zinc-600"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                )}

                {owner.deletedDatasets > 0 && (
                  <div className="text-xs text-zinc-400">
                    其中 {owner.deletedDatasets} 个数据集已删除
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}