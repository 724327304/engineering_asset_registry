"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Search,
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Play,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { TaskCreateDialog } from "@/components/task/task-create-dialog";
import { Input } from "@/components/ui/input";
import { getTasks } from "@/lib/api";
import type { Task } from "@/lib/types";

type TabKey = "success" | "running" | "failed";
type SortDirection = "asc" | "desc";

const TABS: { key: TabKey; label: string }[] = [
  { key: "success", label: "成功" },
  { key: "running", label: "运行中" },
  { key: "failed", label: "失败" },
];

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

function taskStatusVariant(status: Task["status"]) {
  if (status === "success") return "success";
  if (status === "running") return "warning";
  if (status === "failed") return "destructive";
  return "secondary";
}

function getDumpBatch(task: Task) {
  const batch =
    task.name.match(/^(20\d{2})-(\d{2})/) ??
    task.inputDatasetName.match(/CC-MAIN-(20\d{2})-(\d{2})/) ??
    task.outputDatasetName.match(/CC-MAIN-(20\d{2})-(\d{2})/);

  if (!batch) return null;
  return {
    year: Number(batch[1]),
    week: Number(batch[2]),
  };
}

function compareByDumpBatch(a: Task, b: Task) {
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

export default function TaskListPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("success");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [nameSortDirection, setNameSortDirection] = useState<SortDirection>("desc");

  useEffect(() => {
    getTasks().then((result) => {
      if (result.error) {
        setError(result.error);
      } else {
        setTasks(result.data ?? []);
      }
    });
  }, []);

  // Filter → sort → paginate
  const filtered = useMemo(() => {
    const list = tasks
      .filter((d) => d.status === activeTab)
      .filter((d) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
          d.name.toLowerCase().includes(q) ||
          d.type.toLowerCase().includes(q) ||
          d.executor.toLowerCase().includes(q) ||
          d.inputDatasetName.toLowerCase().includes(q) ||
          d.outputDatasetName.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        const result = compareByDumpBatch(a, b);
        return nameSortDirection === "asc" ? result : -result;
      });
    return list;
  }, [tasks, activeTab, searchQuery, nameSortDirection]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);

  const paged = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-normal text-zinc-950">
            任务列表
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            查看数据处理任务的执行情况和结果。
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative w-80">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <Input
              className="pl-9"
              placeholder="搜索任务..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <TaskCreateDialog
            onCreated={(task) =>
              setTasks((prev) => [task, ...prev])
            }
          />
        </div>
      </section>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg bg-zinc-100 p-1 w-fit">
        {TABS.map((tab) => {
          const count = tasks.filter((d) => d.status === tab.key).length;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => {
                setActiveTab(tab.key);
                setPage(1);
              }}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? "bg-white text-zinc-950 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-700"
              }`}
            >
              {tab.label}
              <span
                className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-xs ${
                  activeTab === tab.key
                    ? "bg-zinc-900 text-white"
                    : "bg-zinc-200 text-zinc-600"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center text-sm text-red-600">
          后端服务暂不可用：{error}
        </div>
      )}

      {/* Table */}
      {!error && (
        <>
          <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                  <th className="px-4 py-3 w-10">#</th>
                  <th className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => {
                        setNameSortDirection((current) =>
                          current === "desc" ? "asc" : "desc",
                        );
                        setPage(1);
                      }}
                      className="inline-flex items-center gap-1.5 font-medium text-zinc-600 transition-colors hover:text-zinc-950"
                    >
                      名称
                      {nameSortDirection === "desc" ? (
                        <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
                      ) : (
                        <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
                      )}
                    </button>
                  </th>
                  <th className="px-4 py-3 hidden md:table-cell">类型</th>
                  <th className="px-4 py-3 hidden lg:table-cell">输入数据集</th>
                  <th className="px-4 py-3 hidden lg:table-cell">输出数据集</th>
                  <th className="px-4 py-3 hidden lg:table-cell">前数据量</th>
                  <th className="px-4 py-3 hidden lg:table-cell">后数据量</th>
                  <th className="px-4 py-3 hidden xl:table-cell">前记录数</th>
                  <th className="px-4 py-3 hidden xl:table-cell">后记录数</th>
                  <th className="px-4 py-3">耗时</th>
                  <th className="px-4 py-3">状态</th>
                  <th className="px-4 py-3 hidden sm:table-cell">执行人</th>
                  <th className="px-4 py-3 w-20 text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {paged.length === 0 ? (
                  <tr>
                    <td
                      colSpan={13}
                      className="px-4 py-12 text-center text-zinc-500"
                    >
                      {searchQuery.trim()
                        ? "未找到匹配的任务"
                        : `暂无${TABS.find((t) => t.key === activeTab)?.label ?? ""}状态的任务记录`}
                    </td>
                  </tr>
                ) : (
                  paged.map((task, idx) => (
                    <tr
                      key={task.id}
                      className="transition-colors hover:bg-zinc-50"
                    >
                      <td className="px-4 py-3 text-zinc-400 text-xs">
                        {(currentPage - 1) * pageSize + idx + 1}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/tasks/${task.id}`}
                          className="inline-flex items-center gap-1.5 font-medium text-zinc-900 hover:text-zinc-600 transition-colors"
                        >
                          <Play className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
                          <span className="truncate max-w-[200px]">
                            {task.name}
                          </span>
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-zinc-600 hidden md:table-cell">
                        {task.type}
                      </td>
                      <td className="px-4 py-3 text-zinc-600 hidden lg:table-cell">
                        <Link
                          href={`/datasets/${task.inputDatasetId}`}
                          className="hover:text-zinc-900 hover:underline"
                        >
                          {task.inputDatasetName}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-zinc-600 hidden lg:table-cell">
                        <Link
                          href={`/datasets/${task.outputDatasetId}`}
                          className="hover:text-zinc-900 hover:underline"
                        >
                          {task.outputDatasetName}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-zinc-600 hidden lg:table-cell">
                        {task.sizeBeforeLabel}
                      </td>
                      <td className="px-4 py-3 text-zinc-600 hidden lg:table-cell">
                        {task.sizeAfterLabel}
                      </td>
                      <td className="px-4 py-3 text-zinc-600 hidden xl:table-cell">
                        {task.recordBeforeLabel}
                      </td>
                      <td className="px-4 py-3 text-zinc-600 hidden xl:table-cell">
                        {task.recordAfterLabel}
                      </td>
                      <td className="px-4 py-3 text-zinc-600">
                        {task.durationLabel}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={taskStatusVariant(task.status)}>
                          {task.statusLabel}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-zinc-600 hidden sm:table-cell">
                        {task.executor || "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/tasks/${task.id}`}
                          className={cn(
                            "inline-flex items-center justify-center rounded-md text-xs font-medium transition-colors",
                            "h-7 px-2.5",
                            "border border-zinc-200 bg-white text-zinc-700",
                            "hover:bg-zinc-50 hover:text-zinc-900 hover:border-zinc-300",
                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-1",
                          )}
                        >
                          详情
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {filtered.length > 0 && (
            <div className="flex items-center justify-between gap-4 text-sm">
              {/* Page size selector */}
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
                  条，共 {filtered.length} 条
                </span>
              </div>

              {/* Page nav */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(1)}
                  disabled={currentPage === 1}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  aria-label="首页"
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

                {/* Page numbers */}
                <div className="flex items-center gap-1 mx-1">
                  {generatePageNumbers(currentPage, totalPages).map((p, i) =>
                    p === "..." ? (
                      <span
                        key={`dots-${i}`}
                        className="inline-flex h-8 w-8 items-center justify-center text-zinc-400"
                      >
                        …
                      </span>
                    ) : (
                      <button
                        key={p}
                        onClick={() => setPage(p as number)}
                        className={`inline-flex h-8 w-8 items-center justify-center rounded-md text-sm transition-colors ${
                          currentPage === p
                            ? "bg-zinc-900 text-white font-medium"
                            : "text-zinc-600 hover:bg-zinc-100"
                        }`}
                      >
                        {p}
                      </button>
                    )
                  )}
                </div>

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
                  aria-label="末页"
                >
                  <ChevronsRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/** Generate page number list with ellipsis. */
function generatePageNumbers(current: number, total: number): (number | "...")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const pages: (number | "...")[] = [];

  // Always show first
  pages.push(1);

  if (current > 3) {
    pages.push("...");
  }

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  if (current < total - 2) {
    pages.push("...");
  }

  pages.push(total);
  return pages;
}
