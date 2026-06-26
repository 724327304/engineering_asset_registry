"use client";

import { useEffect, useState } from "react";
import { TrendChart } from "@/components/trend-chart";
import { getDashboardTrends } from "@/lib/api";
import type { TrendPoint } from "@/lib/types";

export function TrendsSection({ projectId }: { projectId?: number }) {
  const [datasetTrends, setDatasetTrends] = useState<TrendPoint[]>([]);
  const [taskTrends, setTaskTrends] = useState<TrendPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function fetch() {
      setLoading(true);
      const result = await getDashboardTrends(projectId);
      if (cancelled) return;
      if (result.data) {
        setDatasetTrends(result.data.datasetTrends);
        setTaskTrends(result.data.taskTrends);
      }
      setLoading(false);
    }
    fetch();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  return (
    <section className="grid gap-4 md:grid-cols-2">
      <TrendChart
        title="数据集变化趋势"
        data={datasetTrends}
        color="#6366f1"
        loading={loading}
      />
      <TrendChart
        title="任务变化趋势"
        data={taskTrends}
        color="#f59e0b"
        loading={loading}
      />
    </section>
  );
}