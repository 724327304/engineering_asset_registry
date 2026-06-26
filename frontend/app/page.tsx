import { Boxes, Database, HardDrive, Users } from "lucide-react";

import { OssStorageOverview } from "@/components/dashboard/oss-storage-overview";
import { TrendsSection } from "@/components/dashboard/trends-section";
import { StatCard } from "@/components/dashboard/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDashboard } from "@/lib/api";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ project_id?: string }>;
}) {
  const params = await searchParams;
  const projectId = params.project_id ? Number(params.project_id) : undefined;
  const dashboardResult = await getDashboard(projectId);

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

      <TrendsSection projectId={projectId} />

      <OssStorageOverview />
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