import Link from "next/link";
import { ArrowUpRight, Timer } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { Task } from "@/lib/types";

export function taskStatusVariant(status: Task["status"]) {
  if (status === "success") return "success";
  if (status === "running") return "warning";
  return "destructive";
}

export function TaskCard({ task }: { task: Task }) {
  return (
    <Link href={`/tasks/${task.id}`} className="block">
      <Card className="transition-colors hover:border-zinc-300 hover:bg-zinc-50">
        <CardContent className="grid grid-cols-[1.6fr_1.2fr_0.8fr_1fr_0.8fr_auto] items-center gap-5 p-4">
          <div className="min-w-0">
            <div className="truncate text-sm font-medium text-zinc-950">{task.name}</div>
            <div className="mt-1 text-xs text-zinc-500">{task.startTimeLabel}</div>
          </div>
          <div className="min-w-0">
            <div className="text-xs text-zinc-500">输出数据集</div>
            <div className="truncate text-sm text-zinc-900">{task.outputDatasetName}</div>
          </div>
          <div>
            <div className="text-xs text-zinc-500">类型</div>
            <div className="text-sm text-zinc-900">{task.type}</div>
          </div>
          <div className="min-w-0">
            <div className="text-xs text-zinc-500">执行人</div>
            <div className="truncate text-sm text-zinc-900">{task.executor}</div>
          </div>
          <div className="flex items-center gap-1.5 text-sm text-zinc-700">
            <Timer className="h-4 w-4 text-zinc-400" aria-hidden="true" />
            {task.durationLabel}
          </div>
          <div className="flex items-center gap-3">
            <Badge variant={taskStatusVariant(task.status)}>{task.statusLabel}</Badge>
            <ArrowUpRight className="h-4 w-4 text-zinc-400" aria-hidden="true" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
