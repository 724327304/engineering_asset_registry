"use client";

import { useEffect, useState, use } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Database } from "lucide-react";

import { taskStatusVariant } from "@/components/task/task-card";
import { TaskEditDialog } from "@/components/task/task-edit-dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getTask } from "@/lib/api";
import type { Task } from "@/lib/types";

type TaskDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default function TaskDetailPage({ params }: TaskDetailPageProps) {
  const { id } = use(params);
  const [task, setTask] = useState<Task | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getTask(id).then((result) => {
      if (result.error) {
        setError(result.error);
      } else {
        setTask(result.data ?? null);
      }
      setLoading(false);
    });
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-6 w-32 rounded bg-zinc-200" />
        <div className="rounded-lg border border-zinc-200 bg-white p-6">
          <div className="h-8 w-64 rounded bg-zinc-200" />
          <div className="mt-4 h-4 w-48 rounded bg-zinc-100" />
        </div>
      </div>
    );
  }

  if (error?.includes("404")) {
    notFound();
  }

  if (error) {
    return <MessageCard message={`后端服务暂不可用：${error}`} />;
  }

  if (!task) {
    notFound();
  }

  return (
    <div className="space-y-6">
      {/* Back link */}
      <div className="flex items-center justify-between">
        <Link
          href="/tasks"
          className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-700 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          返回任务列表
        </Link>
        <TaskEditDialog task={task} />
      </div>

      <section>
        <Card>
          <CardHeader className="border-b border-zinc-200 pb-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle className="text-xl">{task.name}</CardTitle>
                <p className="mt-2 text-sm text-zinc-500">
                  <Link
                    href={`/datasets/${task.outputDatasetId}`}
                    className="inline-flex items-center gap-1.5 hover:text-zinc-700 hover:underline transition-colors"
                  >
                    <Database className="h-3.5 w-3.5 shrink-0" />
                    输出：{task.outputDatasetName}
                  </Link>
                </p>
              </div>
              <Badge variant={taskStatusVariant(task.status)}>{task.statusLabel}</Badge>
            </div>
          </CardHeader>
          <CardContent className="grid gap-5 pt-5 md:grid-cols-2 xl:grid-cols-4">
            <Info label="任务名称" value={task.name} />
            <Info label="任务类型" value={task.type} />
            <Info label="执行人" value={task.executor} />
            <Info label="状态" value={task.statusLabel} />
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <DetailSection
          title="数据流向"
          items={[
            ["输入数据集", task.inputDatasetName],
            ["输出数据集", task.outputDatasetName],
          ]}
        />
        <DetailSection
          title="执行信息"
          items={[
            ["开始时间", task.startTimeLabel],
            ["结束时间", task.endTimeLabel],
            ["耗时", task.durationLabel],
          ]}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <DataChangeSection task={task} />
      </section>

      <section>
        <Card>
          <CardHeader className="border-b border-zinc-200 pb-4">
            <CardTitle className="text-sm">代码信息</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-5 pt-5 md:grid-cols-2">
            <Info label="代码版本" value={task.codeVersion || "未记录"} mono />
            <Info label="配置" value={task.configLabel} mono />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function MessageCard({ message }: { message: string }) {
  return (
    <Card>
      <CardContent className="p-10 text-center text-sm text-zinc-500">{message}</CardContent>
    </Card>
  );
}

function DetailSection({ title, items }: { title: string; items: Array<[string, string]> }) {
  return (
    <Card>
      <CardHeader className="border-b border-zinc-200 pb-4">
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-5 pt-5 md:grid-cols-2">
        {items.map(([label, value]) => (
          <Info key={label} label={label} value={value} />
        ))}
      </CardContent>
    </Card>
  );
}

function DataChangeSection({ task }: { task: Task }) {
  return (
    <Card>
      <CardHeader className="border-b border-zinc-200 pb-4">
        <CardTitle className="text-sm">数据变化</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-x-8 gap-y-4 pt-5 md:grid-cols-2">
        <InlineMetric label="处理前大小" value={task.sizeBeforeLabel} />
        <InlineMetric label="处理前记录数" value={task.recordBeforeLabel} />
        <InlineMetric label="处理后大小" value={task.sizeAfterLabel} />
        <InlineMetric label="处理后记录数" value={task.recordAfterLabel} />
        <InlineMetric label="数据留存率" value={task.sizeRetentionRateLabel} />
        <InlineMetric label="文档留存率" value={task.recordRetentionRateLabel} />
      </CardContent>
    </Card>
  );
}

function InlineMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 items-baseline gap-2 text-sm">
      <span className="shrink-0 font-medium text-zinc-500">{label}：</span>
      <span className="truncate font-medium text-zinc-950">{value}</span>
    </div>
  );
}

function Info({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <div className="text-xs font-medium text-zinc-500">{label}</div>
      <div className={mono ? "mt-1 truncate font-mono text-sm text-zinc-900" : "mt-1 truncate text-sm text-zinc-900"}>
        {value}
      </div>
    </div>
  );
}
