"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowDown, Database, Play, RefreshCw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDatasets, getTasks } from "@/lib/api";
import type { Dataset, Task } from "@/lib/types";

type LineageDatasetNode = {
  datasetId: number;
  datasetName: string;
  datasetType: string;
  datasetStatus: string;
};

type LineageTaskEdge = {
  taskId: number;
  taskName: string;
  taskType: string;
  taskStatus: string;
  durationSeconds: number;
  durationLabel: string;
  sizeBefore: number;
  sizeAfter: number;
  sizeUnit: string;
  sizeAfterUnit: string;
  recordBefore: number;
  recordAfter: number;
};

function toBytes(value: number, unit: string): number {
  const mult: Record<string, number> = {
    B: 1, KB: 1024, MB: 1024 ** 2, GB: 1024 ** 3, TB: 1024 ** 4,
  };
  return value * (mult[unit] ?? 1);
}

function formatSize(sumBytes: number) {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let val = sumBytes;
  let idx = 0;
  while (val >= 1024 && idx < units.length - 1) { val /= 1024; idx++; }
  return `${val >= 10 ? val.toFixed(0) : val.toFixed(1)} ${units[idx]}`;
}

function formatRate(before: number, after: number) {
  if (!before) return "—";
  return `${((after / before) * 100).toFixed(1)}%`;
}

type LineageChain = {
  id: string;
  title: string;
  datasets: LineageDatasetNode[];
  tasks: LineageTaskEdge[];
  totalDurationSeconds: number;
  totalDurationLabel: string;
  initialSizeBytes: number;
  finalSizeBytes: number;
  initialRecords: number;
  finalRecords: number;
};

type ResolvedTask = Task & {
  inputDataset: Dataset;
  outputDataset: Dataset;
};

function statusVariant(status: string) {
  if (status === "success" || status === "active") return "success";
  if (status === "running") return "warning";
  if (status === "failed" || status === "deleted") return "destructive";
  return "secondary";
}

function taskStatusLabel(status: string) {
  if (status === "success") return "成功";
  if (status === "running") return "运行中";
  if (status === "failed") return "失败";
  return status;
}

function datasetStatusLabel(status: string) {
  if (status === "active") return "活跃";
  if (status === "deleted") return "已删除";
  return status;
}

function formatDuration(seconds: number) {
  if (!seconds) return "0 秒";

  const secondsPerMinute = 60;
  const secondsPerHour = 3600;
  const secondsPerDay = 86400;

  if (seconds < secondsPerMinute) return `${Math.round(seconds)} 秒`;
  if (seconds < secondsPerHour) {
    const minutes = Math.floor(seconds / secondsPerMinute);
    const secs = Math.round(seconds % secondsPerMinute);
    return secs > 0 ? `${minutes} 分 ${secs} 秒` : `${minutes} 分`;
  }
  if (seconds < secondsPerDay) {
    const hours = Math.floor(seconds / secondsPerHour);
    const mins = Math.round((seconds % secondsPerHour) / secondsPerMinute);
    return mins > 0 ? `${hours} 小时 ${mins} 分` : `${hours} 小时`;
  }

  const days = Math.floor(seconds / secondsPerDay);
  const hours = Math.round((seconds % secondsPerDay) / secondsPerHour);
  return hours > 0 ? `${days} 天 ${hours} 小时` : `${days} 天`;
}

function taskTimeValue(task: Task) {
  const value = task.startTime ?? task.endTime ?? task.createdAt;
  const time = value ? Date.parse(value) : Number.NaN;
  return Number.isNaN(time) ? 0 : time;
}

function compareTasks(a: ResolvedTask, b: ResolvedTask) {
  const timeDiff = taskTimeValue(a) - taskTimeValue(b);
  if (timeDiff !== 0) return timeDiff;
  return a.id - b.id;
}

function toDatasetNode(dataset: Dataset): LineageDatasetNode {
  return {
    datasetId: dataset.id,
    datasetName: dataset.name,
    datasetType: dataset.datasetTypeLabel,
    datasetStatus: dataset.status,
  };
}

function toTaskEdge(task: Task): LineageTaskEdge {
  return {
    taskId: task.id,
    taskName: task.name,
    taskType: task.type,
    taskStatus: task.status,
    durationSeconds: task.durationSeconds,
    durationLabel: task.durationLabel,
    sizeBefore: task.sizeBefore,
    sizeAfter: task.sizeAfter,
    sizeUnit: task.sizeUnit,
    sizeAfterUnit: task.sizeAfterUnit,
    recordBefore: task.recordBefore,
    recordAfter: task.recordAfter,
  };
}

function inferDumpTitle(datasets: LineageDatasetNode[], tasks: LineageTaskEdge[]) {
  const names = [
    ...datasets.map((dataset) => dataset.datasetName),
    ...tasks.map((task) => task.taskName),
  ];

  for (const name of names) {
    const ccMatch = name.match(/CC-MAIN-(20\d{2}-\d{2})/);
    if (ccMatch) return `CC-MAIN-${ccMatch[1]}`;

    const taskMatch = name.match(/^(20\d{2}-\d{2})-/);
    if (taskMatch) return `CC-MAIN-${taskMatch[1]}`;
  }

  return datasets[0]?.datasetName ?? "血缘链路";
}

function compareChains(a: LineageChain, b: LineageChain) {
  const aMatch = a.title.match(/CC-MAIN-(20\d{2})-(\d{2})/);
  const bMatch = b.title.match(/CC-MAIN-(20\d{2})-(\d{2})/);

  if (aMatch && bMatch) {
    const yearDiff = Number(bMatch[1]) - Number(aMatch[1]);
    if (yearDiff !== 0) return yearDiff;
    return Number(bMatch[2]) - Number(aMatch[2]);
  }

  if (aMatch && !bMatch) return -1;
  if (!aMatch && bMatch) return 1;
  return a.title.localeCompare(b.title, "zh-CN");
}

export default function LineagePage() {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadLineageData = useCallback(async () => {
    setIsRefreshing(true);
    const [datasetResult, taskResult] = await Promise.all([getDatasets(), getTasks()]);

    if (datasetResult.error) {
      setError(datasetResult.error);
      setIsRefreshing(false);
      return;
    }
    if (taskResult.error) {
      setError(taskResult.error);
      setIsRefreshing(false);
      return;
    }

    setError(null);
    setDatasets(datasetResult.data ?? []);
    setTasks(taskResult.data ?? []);
    setIsRefreshing(false);
  }, []);

  useEffect(() => {
    loadLineageData();
  }, [loadLineageData]);

  const lineageChains = useMemo(() => {
    const chains: LineageChain[] = [];
    const datasetMap = new Map(datasets.map((dataset) => [dataset.id, dataset]));
    const resolvedTasks = tasks
      .map((task) => {
        const inputDataset = datasetMap.get(task.inputDatasetId);
        const outputDataset = datasetMap.get(task.outputDatasetId);
        if (!inputDataset || !outputDataset) return null;
        return { ...task, inputDataset, outputDataset };
      })
      .filter((task): task is ResolvedTask => task !== null)
      .sort(compareTasks);

    const outgoingTasks = new Map<number, ResolvedTask[]>();
    const outputDatasetIds = new Set<number>();

    resolvedTasks.forEach((task) => {
      outputDatasetIds.add(task.outputDatasetId);
      const existing = outgoingTasks.get(task.inputDatasetId) ?? [];
      existing.push(task);
      outgoingTasks.set(task.inputDatasetId, existing);
    });

    outgoingTasks.forEach((taskList) => taskList.sort(compareTasks));

    const visitedTaskIds = new Set<number>();
    const startTasks = resolvedTasks.filter((task) => !outputDatasetIds.has(task.inputDatasetId));
    const orderedStarts = [...startTasks, ...resolvedTasks].sort(compareTasks);

    function buildChain(startTask: ResolvedTask) {
      const chainDatasets: LineageDatasetNode[] = [toDatasetNode(startTask.inputDataset)];
      const chainTasks: LineageTaskEdge[] = [];
      const seenDatasetIds = new Set<number>([startTask.inputDatasetId]);
      let currentTask: ResolvedTask | undefined = startTask;

      while (currentTask && !visitedTaskIds.has(currentTask.id)) {
        visitedTaskIds.add(currentTask.id);
        chainTasks.push(toTaskEdge(currentTask));
        chainDatasets.push(toDatasetNode(currentTask.outputDataset));

        if (seenDatasetIds.has(currentTask.outputDatasetId)) break;
        seenDatasetIds.add(currentTask.outputDatasetId);

        const nextTasks: ResolvedTask[] = (outgoingTasks.get(currentTask.outputDatasetId) ?? []).filter(
          (task) => !visitedTaskIds.has(task.id),
        );
        currentTask = nextTasks.length === 1 ? nextTasks[0] : undefined;
      }

      const title = inferDumpTitle(chainDatasets, chainTasks);
      const totalDurationSeconds = chainTasks.reduce(
        (total, task) => total + task.durationSeconds,
        0,
      );

      // 计算初始输入和最终输出
      let initialSizeBytes = 0;
      let finalSizeBytes = 0;
      let initialRecords = 0;
      let finalRecords = 0;

      if (chainTasks.length > 0) {
        const firstTask = chainTasks[0];
        const lastTask = chainTasks[chainTasks.length - 1];
        initialSizeBytes = toBytes(firstTask.sizeBefore, firstTask.sizeUnit);
        finalSizeBytes = toBytes(lastTask.sizeAfter, lastTask.sizeAfterUnit);
        initialRecords = firstTask.recordBefore;
        finalRecords = lastTask.recordAfter;
      }

      chains.push({
        id: chainTasks.map((task) => task.taskId).join("-"),
        title,
        datasets: chainDatasets,
        tasks: chainTasks,
        totalDurationSeconds,
        totalDurationLabel: formatDuration(totalDurationSeconds),
        initialSizeBytes,
        finalSizeBytes,
        initialRecords,
        finalRecords,
      });
    }

    orderedStarts.forEach((task) => {
      if (!visitedTaskIds.has(task.id)) buildChain(task);
    });

    const datasetIdsInTasks = new Set<number>();
    resolvedTasks.forEach((task) => {
      datasetIdsInTasks.add(task.inputDatasetId);
      datasetIdsInTasks.add(task.outputDatasetId);
    });

    datasets.forEach((dataset) => {
      if (!datasetIdsInTasks.has(dataset.id)) {
        const datasetNode = toDatasetNode(dataset);
        chains.push({
          id: `dataset-${dataset.id}`,
          title: dataset.name,
          datasets: [datasetNode],
          tasks: [],
          totalDurationSeconds: 0,
          totalDurationLabel: formatDuration(0),
          initialSizeBytes: 0,
          finalSizeBytes: 0,
          initialRecords: 0,
          finalRecords: 0,
        });
      }
    });

    return chains.sort(compareChains);
  }, [datasets, tasks]);

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-normal text-zinc-950">数据血缘</h2>
          <p className="mt-1 text-sm text-zinc-500">
            展示数据集中任务之间的上下游关系。连续处理任务会合并为一条完整链路。
          </p>
        </div>
        <button
          type="button"
          onClick={loadLineageData}
          disabled={isRefreshing}
          className="inline-flex h-9 items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          {isRefreshing ? "刷新中" : "刷新"}
        </button>
      </section>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center text-sm text-red-600">
          后端服务暂不可用：{error}
        </div>
      )}

      {!error && (
        <div className="space-y-6">
          {lineageChains.length === 0 && (
            <Card>
              <CardContent className="p-10 text-center text-sm text-zinc-500">
                暂无血缘数据。创建数据集和任务后，血缘关系将在此展示。
              </CardContent>
            </Card>
          )}

          {lineageChains.map((chain) => (
            <Card key={chain.id}>
              <CardHeader className="border-b border-zinc-200 pb-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <CardTitle className="text-sm font-semibold text-zinc-900">
                    {chain.title}
                  </CardTitle>
                  <div className="flex flex-wrap items-center gap-2">
                    {chain.tasks.length > 0 && (
                      <Badge variant="success" className="text-xs">
                        总耗时 {chain.totalDurationLabel}
                      </Badge>
                    )}
                    <Badge variant="secondary" className="text-xs">
                      {chain.tasks.length > 0 ? `${chain.tasks.length} 个处理任务` : "孤立数据集"}
                    </Badge>
                  </div>
                </div>
                {chain.tasks.length > 0 && (
                  <div className="mt-3 grid gap-2 text-xs text-zinc-600 sm:grid-cols-2">
                    <div className="rounded border border-zinc-200 bg-white p-2">
                      <span className="text-zinc-400">数据量 </span>
                      <span className="font-medium text-zinc-900">{formatSize(chain.initialSizeBytes)}</span>
                      <span className="mx-1 text-zinc-300">→</span>
                      <span className="font-medium text-zinc-900">{formatSize(chain.finalSizeBytes)}</span>
                      <span className="ml-1.5 font-medium text-emerald-600">留存 {formatRate(chain.initialSizeBytes, chain.finalSizeBytes)}</span>
                    </div>
                    <div className="rounded border border-zinc-200 bg-white p-2">
                      <span className="text-zinc-400">记录数 </span>
                      <span className="font-medium text-zinc-900 tabular-nums">{chain.initialRecords.toLocaleString("zh-CN")}</span>
                      <span className="mx-1 text-zinc-300">→</span>
                      <span className="font-medium text-zinc-900 tabular-nums">{chain.finalRecords.toLocaleString("zh-CN")}</span>
                      <span className="ml-1.5 font-medium text-emerald-600">留存 {formatRate(chain.initialRecords, chain.finalRecords)}</span>
                    </div>
                  </div>
                )}
              </CardHeader>
              <CardContent className="p-0">
                {chain.datasets.map((dataset, datasetIdx) => {
                  const task = chain.tasks[datasetIdx];
                  return (
                    <div key={`${chain.id}-${dataset.datasetId}-${datasetIdx}`}>
                      <div className="flex items-center gap-4 px-5 py-4">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50">
                          <Database className="h-5 w-5 text-zinc-400" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex min-w-0 flex-wrap items-center gap-2">
                            <Link
                              href={`/datasets/${dataset.datasetId}`}
                              className="truncate text-sm font-medium text-zinc-900 transition-colors hover:text-zinc-600 hover:underline"
                            >
                              {dataset.datasetName}
                            </Link>
                            <Badge variant="secondary" className="text-xs">
                              {dataset.datasetType}
                            </Badge>
                          </div>
                          <div className="mt-0.5 text-xs text-zinc-500">ID: {dataset.datasetId}</div>
                        </div>
                        <Badge variant={statusVariant(dataset.datasetStatus)}>
                          {datasetStatusLabel(dataset.datasetStatus)}
                        </Badge>
                      </div>

                      {task && (
                        <div className="border-t border-zinc-100 bg-zinc-50/60 px-5 py-3">
                          <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
                            <ArrowDown className="h-4 w-4 shrink-0 text-zinc-300" />
                            <Link
                              href={`/tasks/${task.taskId}`}
                              className="inline-flex max-w-full items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-50 hover:text-zinc-900"
                            >
                              <Play className="h-3 w-3 shrink-0 text-zinc-400" />
                              <span className="truncate">{task.taskName}</span>
                            </Link>
                            <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-zinc-500">
                              <span>{task.taskType}</span>
                              {task.durationLabel && <span>耗时 {task.durationLabel}</span>}
                              <Badge variant={statusVariant(task.taskStatus)} className="text-xs">
                                {taskStatusLabel(task.taskStatus)}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}