"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateDataset } from "@/lib/api";
import { DATA_SIZE_LIMIT_HINT, getDataSizeError } from "@/lib/dataset-validation";
import type { Dataset } from "@/lib/types";

type DatasetEditDialogProps = {
  dataset: Dataset;
};

export function DatasetEditDialog({ dataset }: DatasetEditDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: dataset.name,
    description: dataset.description,
    source: dataset.source,
    dataset_type: dataset.datasetType,
    location_path: dataset.locationPath,
    data_size: String(dataset.dataSize),
    size_unit: dataset.sizeUnit ?? "B",
    record_count: dataset.recordCount,
    owner: dataset.owner,
    status: dataset.status,
  });

  function handleChange(field: string, value: string | number) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const dataSizeError = getDataSizeError(form.data_size);
    if (dataSizeError) {
      setError(dataSizeError);
      setSubmitting(false);
      return;
    }

    // 仅发送与初始值不同的字段（部分更新）
    const changed: Record<string, string | number> = {};
    if (form.name !== dataset.name) changed.name = form.name;
    if (form.description !== dataset.description) changed.description = form.description;
    if (form.source !== dataset.source) changed.source = form.source;
    if (form.dataset_type !== dataset.datasetType) changed.dataset_type = form.dataset_type;
    if (form.location_path !== dataset.locationPath) changed.location_path = form.location_path;
    const dataSize = Number(form.data_size || 0);
    if (dataSize !== dataset.dataSize) changed.data_size = dataSize;
    if (form.size_unit !== (dataset.sizeUnit ?? "B")) changed.size_unit = form.size_unit;
    if (form.record_count !== dataset.recordCount) changed.record_count = form.record_count;
    if (form.owner !== dataset.owner) changed.owner = form.owner;
    if (form.status !== dataset.status) changed.status = form.status;

    const result = await updateDataset(dataset.id, changed);

    if (result.error) {
      setError(result.error);
      setSubmitting(false);
      return;
    }

    setOpen(false);
    setSubmitting(false);
    router.refresh();
  }

  function handleClose() {
    setOpen(false);
    setError(null);
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
        编辑
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* backdrop */}
          <div className="absolute inset-0 bg-black/40" onClick={handleClose} />

          {/* dialog */}
          <div className="relative z-10 w-full max-w-lg rounded-lg border border-zinc-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
              <h3 className="text-base font-semibold text-zinc-950">编辑数据集</h3>
              <button
                type="button"
                className="rounded-md p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
                onClick={handleClose}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 px-5 py-4">
              {error && (
                <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  {error}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-zinc-700">
                  名称 <span className="text-rose-500">*</span>
                </label>
                <Input
                  required
                  value={form.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-zinc-700">描述</label>
                <Input
                  value={form.description}
                  onChange={(e) => handleChange("description", e.target.value)}
                  placeholder="数据集描述（可选）"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-zinc-700">来源</label>
                  <select
                    value={form.source}
                    onChange={(e) => handleChange("source", e.target.value)}
                    className="flex h-9 w-full rounded-md border border-zinc-200 bg-white px-3 py-1 text-sm text-zinc-950 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300"
                  >
                    <option value="task_produced">任务产出</option>
                    <option value="export">外部导出</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-zinc-700">
                    状态 <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={form.status}
                    onChange={(e) => handleChange("status", e.target.value)}
                    className="flex h-9 w-full rounded-md border border-zinc-200 bg-white px-3 py-1 text-sm text-zinc-950 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300"
                  >
                    <option value="active">活跃</option>
                    <option value="deleted">已删除</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-zinc-700">数据类型</label>
                <select
                  value={form.dataset_type}
                  onChange={(e) => handleChange("dataset_type", e.target.value)}
                  className="flex h-9 w-full rounded-md border border-zinc-200 bg-white px-3 py-1 text-sm text-zinc-950 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300"
                >
                  <option value="table">表格</option>
                  <option value="image">图片</option>
                  <option value="text">文本</option>
                  <option value="feature">特征</option>
                  <option value="label">标签</option>
                  <option value="trainset">训练集</option>
                  <option value="testset">测试集</option>
                  <option value="result">结果</option>
                  <option value="other">其他</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-zinc-700">数据大小</label>
                  <Input
                    type="number"
                    min="0"
                    max="9999999999.99"
                    step="0.01"
                    value={form.data_size}
                    onChange={(e) => handleChange("data_size", e.target.value)}
                  />
                  <p className="text-xs text-zinc-500">{DATA_SIZE_LIMIT_HINT}</p>
                  {getDataSizeError(form.data_size) && (
                    <p className="text-xs text-rose-600">{getDataSizeError(form.data_size)}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-zinc-700">单位</label>
                  <select
                    value={form.size_unit}
                    onChange={(e) => handleChange("size_unit", e.target.value)}
                    className="flex h-9 w-full rounded-md border border-zinc-200 bg-white px-3 py-1 text-sm text-zinc-950 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300"
                  >
                    <option value="B">B</option>
                    <option value="KB">KB</option>
                    <option value="MB">MB</option>
                    <option value="GB">GB</option>
                    <option value="TB">TB</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-zinc-700">记录数</label>
                <Input
                  type="number"
                  value={form.record_count}
                  onChange={(e) => handleChange("record_count", Number(e.target.value))}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-zinc-700">
                  负责人 <span className="text-rose-500">*</span>
                </label>
                <Input
                  required
                  value={form.owner}
                  onChange={(e) => handleChange("owner", e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-zinc-700">
                  存储位置 <span className="text-rose-500">*</span>
                </label>
                <Input
                  required
                  value={form.location_path}
                  onChange={(e) => handleChange("location_path", e.target.value)}
                />
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-zinc-100 pt-4">
                <Button type="button" variant="outline" onClick={handleClose}>
                  取消
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? "保存中..." : "保存"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
