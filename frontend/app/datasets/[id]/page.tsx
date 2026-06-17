import { notFound } from "next/navigation";

import { DatasetEditDialog } from "@/components/dataset/dataset-edit-dialog";
import { taskStatusVariant } from "@/components/task/task-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDataset, getTasksForDataset } from "@/lib/api";
import type { Dataset } from "@/lib/types";

function datasetStatusVariant(status: Dataset["status"]) {
  if (status === "active") return "success";
  if (status === "deleted") return "destructive";
  return "secondary";
}

type DatasetDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function DatasetDetailPage({ params }: DatasetDetailPageProps) {
  const { id } = await params;
  const [datasetResult, historyResult] = await Promise.all([
    getDataset(id),
    getTasksForDataset(id),
  ]);

  if (datasetResult.error?.includes("404")) {
    notFound();
  }

  if (datasetResult.error) {
    return <MessageCard message={`后端服务暂不可用：${datasetResult.error}`} />;
  }

  const dataset = datasetResult.data;
  if (!dataset) {
    notFound();
  }
  const history = historyResult.data ?? [];

  return (
    <div className="space-y-6">
      <section>
        <Card>
          <CardHeader className="border-b border-zinc-200 pb-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle className="text-xl">{dataset.name}</CardTitle>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-600">{dataset.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={datasetStatusVariant(dataset.status)}>{dataset.statusLabel}</Badge>
                  <DatasetEditDialog dataset={dataset} />
                </div>
              </div>
          </CardHeader>
          <CardContent className="grid gap-5 pt-5 md:grid-cols-2 xl:grid-cols-3">
            <Info label="来源" value={dataset.sourceLabel} />
            <Info label="类型" value={dataset.datasetTypeLabel} />
            <Info label="位置" value={dataset.locationPath} mono />
            <Info label="大小" value={dataset.sizeLabel} />
            <Info label="记录数" value={dataset.recordCountLabel} />
            <Info label="负责人" value={dataset.owner} />
            <Info label="更新时间" value={dataset.updatedAtLabel} />
          </CardContent>
        </Card>
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-base font-semibold text-zinc-950">任务历史</h2>
          <p className="mt-1 text-sm text-zinc-500">按最近执行时间排序的数据处理记录。</p>
        </div>
        <div className="space-y-3">
          {historyResult.error ? <MessageCard message={`任务历史读取失败：${historyResult.error}`} /> : null}
          {!historyResult.error && history.length === 0 ? <MessageCard message="暂无任务历史" /> : null}
          {history.map((task) => (
            <Card key={task.id}>
              <CardContent className="grid grid-cols-[1.4fr_0.7fr_1fr_1fr_1fr_0.7fr_auto] items-center gap-5 p-4">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-zinc-950">{task.name}</div>
                  <div className="mt-1 text-xs text-zinc-500">{task.startTimeLabel}</div>
                </div>
                <div>
                  <div className="text-xs text-zinc-500">类型</div>
                  <div className="text-sm text-zinc-900">{task.type}</div>
                </div>
                <div className="min-w-0">
                  <div className="text-xs text-zinc-500">输入</div>
                  <div className="truncate text-sm text-zinc-900">{task.inputDatasetName}</div>
                </div>
                <div className="min-w-0">
                  <div className="text-xs text-zinc-500">输出</div>
                  <div className="truncate text-sm text-zinc-900">{task.outputDatasetName}</div>
                </div>
                <div className="min-w-0">
                  <div className="text-xs text-zinc-500">执行人</div>
                  <div className="truncate text-sm text-zinc-900">{task.executor}</div>
                </div>
                <div>
                  <div className="text-xs text-zinc-500">耗时</div>
                  <div className="text-sm text-zinc-900">{task.durationLabel}</div>
                </div>
                <Badge variant={taskStatusVariant(task.status)}>{task.statusLabel}</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
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
