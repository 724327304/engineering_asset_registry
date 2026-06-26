"use client";

import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, HardDrive, RefreshCw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getOssStorage, type OssBucketUsage, type OssStorage } from "@/lib/api";

const OSS_BUCKET_COLORS = ["#2563eb", "#059669", "#d97706", "#7c3aed", "#dc2626"];

export function OssStorageOverview() {
  const [ossStorage, setOssStorage] = useState<OssStorage | null>(null);
  const [ossError, setOssError] = useState<string | null>(null);
  const [refreshingOss, setRefreshingOss] = useState(false);

  async function refreshOssStorage() {
    setRefreshingOss(true);
    setOssError(null);
    const result = await getOssStorage();
    if (result.error) {
      setOssError(result.error);
    } else {
      setOssStorage(result.data ?? null);
    }
    setRefreshingOss(false);
  }

  useEffect(() => {
    refreshOssStorage();
  }, []);

  return (
    <Card>
      <CardHeader className="border-b border-zinc-200 pb-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <CardTitle className="text-sm">OSS 存储总览</CardTitle>
            <div className="mt-1 text-xs text-zinc-500">
              {ossStorage
                ? `最近同步：${ossStorage.generatedAtLabel}`
                : "尚未同步 OSS 存储信息"}
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={refreshOssStorage}
            disabled={refreshingOss}
          >
            <RefreshCw
              className={refreshingOss ? "h-4 w-4 animate-spin" : "h-4 w-4"}
              aria-hidden="true"
            />
            {refreshingOss ? "同步中" : "刷新"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {ossError && (
          <div className="border-b border-rose-100 bg-rose-50 px-5 py-3 text-sm text-rose-700">
            OSS 存储读取失败：{ossError}
          </div>
        )}
        {!ossStorage && !ossError && (
          <div className="p-10 text-center text-sm text-zinc-500">
            正在同步 OSS 存储信息...
          </div>
        )}
        {ossStorage && (
          <>
            <div className="grid gap-4 border-b border-zinc-100 p-5 md:grid-cols-3">
              <StorageMetric label="OSS 总上限" value={ossStorage.totalLimitLabel} />
              <StorageMetric label="OSS 已用" value={ossStorage.totalUsedLabel} tone="strong" />
              <StorageMetric label="OSS 剩余" value={ossStorage.totalRemainingLabel} />
            </div>
            <OssBucketPieCharts buckets={ossStorage.buckets} />
          </>
        )}
      </CardContent>
    </Card>
  );
}

function OssBucketPieCharts({ buckets }: { buckets: OssBucketUsage[] }) {
  return (
    <div className="grid gap-4 border-b border-zinc-100 p-5 md:grid-cols-3">
      {buckets.map((bucket, index) => (
        <OssBucketPieCard
          key={bucket.name}
          bucket={bucket}
          color={OSS_BUCKET_COLORS[index % OSS_BUCKET_COLORS.length]}
        />
      ))}
    </div>
  );
}

function OssBucketPieCard({ bucket, color }: { bucket: OssBucketUsage; color: string }) {
  const rawPercent = bucket.limitBytes > 0 ? bucket.usedBytes / bucket.limitBytes : 0;
  const usedPercent = Math.min(1, Math.max(0, rawPercent));
  const usageLabel = bucket.error ? "--" : `${bucket.usagePercent.toFixed(2)}%`;

  return (
    <div className="rounded-md border border-zinc-200 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-medium text-zinc-900">{bucket.name}</div>
          <div className="mt-1 text-xs text-zinc-500">已用 / 上限</div>
        </div>
        {bucket.error ? (
          <Badge variant="destructive">获取失败</Badge>
        ) : (
          <Badge variant="secondary">{usageLabel}</Badge>
        )}
      </div>
      <div className="mt-4 flex items-center justify-center">
        <svg
          viewBox="0 0 120 120"
          role="img"
          aria-label={`${bucket.name} 存储占用情况`}
          className="h-36 w-36"
        >
          <circle cx="60" cy="60" r="48" fill="#f4f4f5" />
          {!bucket.error && usedPercent >= 0.9999 && (
            <circle cx="60" cy="60" r="48" fill={color} />
          )}
          {!bucket.error && usedPercent > 0 && usedPercent < 0.9999 && (
            <path d={createPieSlicePath(60, 60, 48, 0, usedPercent)} fill={color} />
          )}
          <circle cx="60" cy="60" r="25" fill="white" />
          <text
            x="60"
            y="57"
            textAnchor="middle"
            className="fill-zinc-500 text-[9px] font-medium"
          >
            占用率
          </text>
          <text
            x="60"
            y="72"
            textAnchor="middle"
            className="fill-zinc-950 text-[12px] font-semibold"
          >
            {usageLabel}
          </text>
        </svg>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
        <div>
          <div className="text-zinc-500">已用</div>
          <div className="mt-0.5 font-medium text-zinc-900">{bucket.usedLabel}</div>
        </div>
        <div>
          <div className="text-zinc-500">剩余</div>
          <div className="mt-0.5 font-medium text-zinc-900">{bucket.remainingLabel}</div>
        </div>
        <div>
          <div className="text-zinc-500">上限</div>
          <div className="mt-0.5 font-medium text-zinc-900">{bucket.limitLabel}</div>
        </div>
        <div>
          <div className="text-zinc-500">对象</div>
          <div className="mt-0.5 font-medium text-zinc-900">{bucket.objectCountLabel}</div>
        </div>
      </div>
      {bucket.error && (
        <div className="mt-3 text-xs text-rose-600">{bucket.error}</div>
      )}
    </div>
  );
}

function createPieSlicePath(
  centerX: number,
  centerY: number,
  radius: number,
  startPercent: number,
  endPercent: number,
) {
  const start = polarToCartesian(centerX, centerY, radius, startPercent * 360);
  const end = polarToCartesian(centerX, centerY, radius, endPercent * 360);
  const largeArcFlag = endPercent - startPercent > 0.5 ? 1 : 0;
  return [
    `M ${centerX} ${centerY}`,
    `L ${start.x} ${start.y}`,
    `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`,
    "Z",
  ].join(" ");
}

function polarToCartesian(centerX: number, centerY: number, radius: number, angleDegrees: number) {
  const angleRadians = (angleDegrees - 90) * (Math.PI / 180);
  return {
    x: centerX + radius * Math.cos(angleRadians),
    y: centerY + radius * Math.sin(angleRadians),
  };
}

function StorageMetric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "strong";
}) {
  return (
    <div>
      <div className="text-xs font-medium text-zinc-500">{label}</div>
      <div className={tone === "strong" ? "mt-1 text-lg font-semibold text-zinc-950" : "mt-1 text-lg font-semibold text-zinc-800"}>
        {value}
      </div>
    </div>
  );
}