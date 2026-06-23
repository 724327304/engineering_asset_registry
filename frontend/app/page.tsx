import { Boxes, Database, HardDrive, Users } from "lucide-react";

import { TrendsSection } from "@/components/dashboard/trends-section";
import { StatCard } from "@/components/dashboard/stat-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDashboard } from "@/lib/api";
import type { Task } from "@/lib/types";

function statusVariant(status: Task["status"]) {
  if (status === "success") return "success";
  if (status === "running") return "warning";
  return "destructive";
}

export default async function DashboardPage() {
  const dashboardResult = await getDashboard();

  if (dashboardResult.error) {
    return <BackendUnavailable error={dashboardResult.error} />;
  }

  const dashboard = dashboardResult.data;
  if (!dashboard) {
    return <BackendUnavailable error="未收到仪表盘数据" />;
  }

  return (
    <div className="space-y-7">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="数据集"
          value={String(dashboard.datasetCount)}
          detail="已登记的工程数据资产"
          icon={Database}
        />
        <StatCard
          title="任务"
          value={String(dashboard.taskCount)}
          detail="已记录的数据处理任务"
          icon={Boxes}
        />
        <StatCard
          title="负责人"
          value={String(dashboard.ownerCount)}
          detail="当前承担资产责任的团队"
          icon={Users}
        />
        <StatCard
          title="存储量"
          value={dashboard.storageLabel}
          detail={`${dashboard.activeDatasets} 个活跃数据集`}
          icon={HardDrive}
        />
      </section>

      <TrendsSection />

      <section>
        <Card>
          <CardHeader className="border-b border-zinc-200 pb-4">
            <CardTitle className="text-sm">最近活动</CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-zinc-100 p-0">
            {dashboard.recentTasks.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-zinc-500">暂无任务记录</div>
            ) : null}
            {dashboard.recentTasks.map((task) => (
              <div
                key={task.id}
                className="grid grid-cols-[1.6fr_1fr_0.8fr_0.7fr_auto] items-center gap-5 px-5 py-4"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-zinc-950">{task.name}</div>
                  <div className="mt-1 text-xs text-zinc-500">{task.startTimeLabel}</div>
                </div>
                <div className="min-w-0 truncate text-sm text-zinc-700">{task.outputDatasetName}</div>
                <div className="text-sm text-zinc-700">{task.type}</div>
                <div className="text-sm text-zinc-700">{task.durationLabel}</div>
                <Badge variant={statusVariant(task.status)}>{task.statusLabel}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function BackendUnavailable({ error }: { error: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">后端服务暂不可用</CardTitle>
      </CardHeader>
      <CardContent className="text-sm leading-6 text-zinc-600">
        前端浏览器请求会先进入同源代理 <span className="font-mono text-zinc-900">/api/backend</span>，
        再由 Next 服务端转发到后端。当前错误：{error}
      </CardContent>
    </Card>
  );
}
