import Link from "next/link";
import { ArrowUpRight, Database } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Dataset } from "@/lib/types";

function datasetStatusVariant(status: Dataset["status"]) {
  if (status === "active") return "success";
  if (status === "deleted") return "destructive";
  return "secondary";
}

export function DatasetCard({ dataset }: { dataset: Dataset }) {
  return (
    <Link href={`/datasets/${dataset.id}`} className="block">
      <Card className="h-full transition-colors hover:border-zinc-300 hover:bg-zinc-50">
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <Database className="h-4 w-4 shrink-0 text-zinc-400" aria-hidden="true" />
              <CardTitle className="truncate text-sm">{dataset.name}</CardTitle>
            </div>
            <ArrowUpRight className="h-4 w-4 shrink-0 text-zinc-400" aria-hidden="true" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <Meta label="来源" value={dataset.sourceLabel} />
            <Meta label="类型" value={dataset.datasetTypeLabel} />
            <Meta label="大小" value={dataset.sizeLabel} />
            <Meta label="记录数" value={dataset.recordCountLabel} />
            <Meta label="负责人" value={dataset.owner} />
          </div>
          <div>
            <div className="mb-1 text-xs text-zinc-500">位置</div>
            <div className="truncate font-mono text-xs text-zinc-700">{dataset.locationPath}</div>
          </div>
          <div className="flex items-center justify-between">
            <Badge variant={datasetStatusVariant(dataset.status)}>{dataset.statusLabel}</Badge>
            <span className="text-xs text-zinc-500">{dataset.updatedAtLabel}</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <div className="text-xs text-zinc-500">{label}</div>
      <div className="truncate text-zinc-900">{value}</div>
    </div>
  );
}
