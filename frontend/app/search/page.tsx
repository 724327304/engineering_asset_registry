"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Database, ListChecks, SearchIcon, User } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getDatasets, getTasks } from "@/lib/api";
import type { Dataset, Task } from "@/lib/types";

type OwnerResult = {
  owner: string;
  datasetCount: number;
  taskCount: number;
};

export default function SearchPage() {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

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

  const q = query.toLowerCase().trim();

  const searchResults = useMemo(() => {
    if (!q) return { datasets: [], tasks: [], owners: [] as OwnerResult[] };

    const matchedDatasets = datasets.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        d.description.toLowerCase().includes(q) ||
        d.datasetType.toLowerCase().includes(q) ||
        d.source.toLowerCase().includes(q) ||
        d.locationPath.toLowerCase().includes(q) ||
        d.owner.toLowerCase().includes(q),
    );

    const matchedTasks = tasks.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.type.toLowerCase().includes(q) ||
        t.executor.toLowerCase().includes(q) ||
        t.codeVersion.toLowerCase().includes(q) ||
        t.inputDatasetName.toLowerCase().includes(q) ||
        t.outputDatasetName.toLowerCase().includes(q),
    );

    // Aggregate owners
    const ownerMap = new Map<string, OwnerResult>();
    datasets.forEach((d) => {
      if (!d.owner) return;
      if (!d.owner.toLowerCase().includes(q)) return;
      const existing = ownerMap.get(d.owner);
      if (existing) {
        existing.datasetCount += 1;
      } else {
        ownerMap.set(d.owner, { owner: d.owner, datasetCount: 1, taskCount: 0 });
      }
    });
    tasks.forEach((t) => {
      // Only match owners via tasks if they appear via executor
      if (t.executor && t.executor.toLowerCase().includes(q)) {
        const existing = ownerMap.get(t.executor);
        if (existing) {
          existing.taskCount += 1;
        } else {
          ownerMap.set(t.executor, {
            owner: t.executor,
            datasetCount: 0,
            taskCount: 1,
          });
        }
      }
    });
    const matchedOwners = Array.from(ownerMap.values());

    return { datasets: matchedDatasets, tasks: matchedTasks, owners: matchedOwners };
  }, [datasets, tasks, q]);

  const total = searchResults.datasets.length + searchResults.tasks.length + searchResults.owners.length;

  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-xl font-semibold tracking-normal text-zinc-950">全局搜索</h2>
        <p className="mt-1 text-sm text-zinc-500">跨数据集、任务和负责人搜索。</p>
      </section>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center text-sm text-red-600">
          后端服务暂不可用：{error}
        </div>
      )}

      {!error && (
        <>
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <Input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="输入关键词搜索…（如数据集名、任务名、负责人、路径、类型等）"
              className="h-10 pl-9 text-sm"
            />
          </div>

          {q === "" && (
            <Card>
              <CardContent className="p-10 text-center text-sm text-zinc-500">
                请输入关键词开始搜索。
              </CardContent>
            </Card>
          )}

          {q !== "" && (
            <div className="space-y-6">
              <p className="text-sm text-zinc-500">
                共找到 <span className="font-medium text-zinc-900">{total}</span> 条结果
              </p>

              {/* Datasets */}
              {searchResults.datasets.length > 0 && (
                <Card>
                  <CardHeader className="border-b border-zinc-200 pb-4">
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <Database className="h-4 w-4 text-zinc-400" />
                      数据集
                      <Badge variant="secondary" className="text-xs">
                        {searchResults.datasets.length}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="divide-y divide-zinc-100 p-0">
                    {searchResults.datasets.map((d) => (
                      <Link
                        key={d.id}
                        href={`/datasets/${d.id}`}
                        className="flex items-center gap-4 px-5 py-3.5 hover:bg-zinc-50 transition-colors"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium text-zinc-900">
                            {d.name}
                          </div>
                          <div className="mt-0.5 truncate text-xs text-zinc-500">
                            {d.description || d.datasetTypeLabel} · {d.owner}
                          </div>
                        </div>
                        <Badge variant={d.status === "active" ? "success" : "destructive"}>
                          {d.statusLabel}
                        </Badge>
                      </Link>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Tasks */}
              {searchResults.tasks.length > 0 && (
                <Card>
                  <CardHeader className="border-b border-zinc-200 pb-4">
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <ListChecks className="h-4 w-4 text-zinc-400" />
                      任务
                      <Badge variant="secondary" className="text-xs">
                        {searchResults.tasks.length}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="divide-y divide-zinc-100 p-0">
                    {searchResults.tasks.map((t) => (
                      <Link
                        key={t.id}
                        href={`/tasks/${t.id}`}
                        className="flex items-center gap-4 px-5 py-3.5 hover:bg-zinc-50 transition-colors"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium text-zinc-900">
                            {t.name}
                          </div>
                          <div className="mt-0.5 truncate text-xs text-zinc-500">
                            {t.inputDatasetName} → {t.outputDatasetName} · {t.type}
                          </div>
                        </div>
                        <Badge
                          variant={
                            t.status === "success"
                              ? "success"
                              : t.status === "running"
                                ? "warning"
                                : "destructive"
                          }
                        >
                          {t.statusLabel}
                        </Badge>
                      </Link>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Owners */}
              {searchResults.owners.length > 0 && (
                <Card>
                  <CardHeader className="border-b border-zinc-200 pb-4">
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <User className="h-4 w-4 text-zinc-400" />
                      负责人
                      <Badge variant="secondary" className="text-xs">
                        {searchResults.owners.length}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="divide-y divide-zinc-100 p-0">
                    {searchResults.owners.map((o) => (
                      <div
                        key={o.owner}
                        className="flex items-center gap-4 px-5 py-3.5"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium text-zinc-900">
                            {o.owner}
                          </div>
                          <div className="mt-0.5 text-xs text-zinc-500">
                            {o.datasetCount > 0 && `${o.datasetCount} 个数据集`}
                            {o.datasetCount > 0 && o.taskCount > 0 && " · "}
                            {o.taskCount > 0 && `${o.taskCount} 个任务`}
                          </div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {total === 0 && (
                <Card>
                  <CardContent className="p-10 text-center text-sm text-zinc-500">
                    未找到匹配的结果。
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}