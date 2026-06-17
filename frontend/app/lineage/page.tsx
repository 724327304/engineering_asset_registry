"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowDown, Database, Play } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDatasets, getTasks } from "@/lib/api";
import type { Dataset, Task } from "@/lib/types";

type LineageNode = {
  datasetId: number;
  datasetName: string;
  datasetType: string;
  datasetStatus: string;
  taskId: number;
  taskName: string;
  taskType: string;
  taskStatus: string;
};

export default function LineagePage() {
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

  // Build lineage chains: each task connects input → output
  const lineageChains = useMemo(() => {
    const chains: LineageNode[][] = [];
    const datasetMap = new Map(datasets.map((d) => [d.id, d]));
    const visited = new Set<string>();

    // For each task, create a node
    tasks.forEach((task) => {
      const inputDataset = datasetMap.get(task.inputDatasetId);
      const outputDataset = datasetMap.get(task.outputDatasetId);
      if (!inputDataset || !outputDataset) return;

      const key = `${task.inputDatasetId}-${task.id}-${task.outputDatasetId}`;
      if (visited.has(key)) return;
      visited.add(key);

      chains.push([
        {
          datasetId: inputDataset.id,
          datasetName: inputDataset.name,
          datasetType: inputDataset.datasetTypeLabel,
          datasetStatus: inputDataset.status,
          taskId: task.id,
          taskName: task.name,
          taskType: task.type,
          taskStatus: task.status,
        },
        {
          datasetId: outputDataset.id,
          datasetName: outputDataset.name,
          datasetType: outputDataset.datasetTypeLabel,
          datasetStatus: outputDataset.status,
          taskId: 0, // sentinel — this node is a dataset, not a task
          taskName: "",
          taskType: "",
          taskStatus: "",
        },
      ]);
    });

    // Also show datasets with no tasks
    const datasetIdsInTasks = new Set<number>();
    tasks.forEach((t) => {
      datasetIdsInTasks.add(t.inputDatasetId);
      datasetIdsInTasks.add(t.outputDatasetId);
    });
    datasets.forEach((d) => {
      if (!datasetIdsInTasks.has(d.id)) {
        chains.push([
          {
            datasetId: d.id,
            datasetName: d.name,
            datasetType: d.datasetTypeLabel,
            datasetStatus: d.status,
            taskId: 0,
            taskName: "",
            taskType: "",
            taskStatus: "",
          },
        ]);
      }
    });

    return chains;
  }, [datasets, tasks]);

  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-xl font-semibold tracking-normal text-zinc-950">数据血缘</h2>
        <p className="mt-1 text-sm text-zinc-500">
          展示数据集中任务之间的上下游关系。每个箭头代表一次数据处理操作。
        </p>
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

          {lineageChains.map((chain, chainIdx) => (
            <Card key={chainIdx}>
              <CardHeader className="border-b border-zinc-200 pb-4">
                <CardTitle className="text-sm text-zinc-500">
                  {chain.length > 1 ? "血缘链路" : "孤立数据集"}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {chain.map((node, nodeIdx) => (
                  <div key={nodeIdx}>
                    {/* Dataset card */}
                    <div className="flex items-center gap-4 px-5 py-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50">
                        <Database className="h-5 w-5 text-zinc-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/datasets/${node.datasetId}`}
                            className="truncate text-sm font-medium text-zinc-900 hover:text-zinc-600 hover:underline transition-colors"
                          >
                            {node.datasetName}
                          </Link>
                          <Badge variant="secondary" className="text-xs">
                            {node.datasetType}
                          </Badge>
                        </div>
                        <div className="mt-0.5 text-xs text-zinc-500">
                          ID: {node.datasetId}
                        </div>
                      </div>
                      {node.taskStatus && (
                        <Badge
                          variant={
                            node.datasetStatus === "active" ? "success" : "destructive"
                          }
                        >
                          {node.datasetStatus === "active" ? "活跃" : "已删除"}
                        </Badge>
                      )}
                    </div>

                    {/* Task arrow between nodes */}
                    {node.taskId > 0 && (
                      <div className="flex flex-col items-center border-t border-zinc-100 bg-zinc-50/50 px-5 py-3">
                        <ArrowDown className="h-4 w-4 text-zinc-300" />
                        <Link
                          href={`/tasks/${node.taskId}`}
                          className="mt-1.5 inline-flex items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900 transition-colors"
                        >
                          <Play className="h-3 w-3 text-zinc-400" />
                          {node.taskName}
                        </Link>
                        <div className="mt-1 flex items-center gap-2 text-xs text-zinc-500">
                          <span>{node.taskType}</span>
                          <Badge
                            variant={
                              node.taskStatus === "success"
                                ? "success"
                                : node.taskStatus === "running"
                                  ? "warning"
                                  : "destructive"
                            }
                            className="text-xs"
                          >
                            {node.taskStatus === "success"
                              ? "成功"
                              : node.taskStatus === "running"
                                ? "运行中"
                                : "失败"}
                          </Badge>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}