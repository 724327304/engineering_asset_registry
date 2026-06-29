"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Pencil, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateTask, getDatasets } from "@/lib/api";
import { fromDurationSeconds, toDurationSeconds } from "@/lib/duration";
import type { Task, Dataset } from "@/lib/types";

type TaskEditDialogProps = {
  task: Task;
};

export function TaskEditDialog({ task }: TaskEditDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [datasets, setDatasets] = useState<Dataset[]>([]);

  const [form, setForm] = useState({
    input_dataset_id: String(task.inputDatasetId),
    output_dataset_id: String(task.outputDatasetId),
    task_name: task.name,
    task_type: task.type,
    size_before: String(task.sizeBefore),
    size_unit: task.sizeUnit || "B",
    size_after: String(task.sizeAfter),
    size_after_unit: task.sizeAfterUnit || "B",
    record_before: String(task.recordBefore),
    record_after: String(task.recordAfter),
    duration_seconds: String(fromDurationSeconds(task.durationSeconds, task.durationUnit || "seconds")),
    duration_unit: task.durationUnit || "seconds",
    status: task.status,
    executor: task.executor,
    code_version: task.codeVersion,
    config: typeof task.config === "string" ? task.config : JSON.stringify(task.config ?? "", null, 2),
    start_time: task.startTime ?? "",
    end_time: task.endTime ?? "",
  });

  useEffect(() => {
    if (open) {
      getDatasets().then((result) => {
        if (result.data) {
          setDatasets(result.data);
        }
      });
    }
  }, [open]);

  function handleChange(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    // 仅发送与初始值不同的字段（部分更新）
    const changed: Record<string, unknown> = {};
    if (Number(form.input_dataset_id) !== task.inputDatasetId) changed.input_dataset_id = Number(form.input_dataset_id);
    if (Number(form.output_dataset_id) !== task.outputDatasetId) changed.output_dataset_id = Number(form.output_dataset_id);
    if (form.task_name !== task.name) changed.task_name = form.task_name;
    if (form.task_type !== task.type) changed.task_type = form.task_type;
    if (Number(form.size_before) !== task.sizeBefore) changed.size_before = Number(form.size_before) || 0;
    if (form.size_unit !== (task.sizeUnit || "B")) changed.size_unit = form.size_unit;
    if (Number(form.size_after) !== task.sizeAfter) changed.size_after = Number(form.size_after) || 0;
    if (form.size_after_unit !== (task.sizeAfterUnit || "B")) changed.size_after_unit = form.size_after_unit;
    if (Number(form.record_before) !== task.recordBefore) changed.record_before = Number(form.record_before) || 0;
    if (Number(form.record_after) !== task.recordAfter) changed.record_after = Number(form.record_after) || 0;
    const durationSeconds = form.duration_seconds
      ? toDurationSeconds(Number(form.duration_seconds), form.duration_unit)
      : 0;
    if (durationSeconds !== task.durationSeconds || task.durationUnit !== "seconds") {
      changed.duration_seconds = durationSeconds;
      changed.duration_unit = "seconds";
    }
    if (form.status !== task.status) changed.status = form.status;
    if (form.executor !== task.executor) changed.executor = form.executor;
    if (form.code_version !== task.codeVersion) changed.code_version = form.code_version;
    const newConfig = form.config || undefined;
    const oldConfig = typeof task.config === "string" ? task.config : JSON.stringify(task.config ?? "");
    if (newConfig !== oldConfig) changed.config = newConfig;
    if (form.start_time !== (task.startTime ?? "")) changed.start_time = form.start_time || undefined;
    if (form.end_time !== (task.endTime ?? "")) changed.end_time = form.end_time || undefined;

    const result = await updateTask(task.id, changed);

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

  const selectClass =
    "flex h-9 w-full rounded-md border border-zinc-200 bg-white px-3 py-1 text-sm text-zinc-950 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300";

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
          <div className="relative z-10 w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-lg border border-zinc-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
              <h3 className="text-base font-semibold text-zinc-950">编辑任务</h3>
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

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-zinc-700">
                    输入数据集 <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    value={form.input_dataset_id}
                    onChange={(e) => handleChange("input_dataset_id", e.target.value)}
                    className={selectClass}
                  >
                    <option value="">-- 请选择输入数据集 --</option>
                    {datasets.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.id} - {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-zinc-700">
                    输出数据集 <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    value={form.output_dataset_id}
                    onChange={(e) => handleChange("output_dataset_id", e.target.value)}
                    className={selectClass}
                  >
                    <option value="">-- 请选择输出数据集 --</option>
                    {datasets.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.id} - {d.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 任务名称 + 任务类型 */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-zinc-700">
                    任务名称 <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    required
                    value={form.task_name}
                    onChange={(e) => handleChange("task_name", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-zinc-700">
                    任务类型 <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    value={form.task_type}
                    onChange={(e) => handleChange("task_type", e.target.value)}
                    className={selectClass}
                  >
                    <option value="质量过滤">质量过滤</option>
                    <option value="模型过滤">模型过滤</option>
                    <option value="模糊去重">模糊去重</option>
                    <option value="精确去重">精确去重</option>
                    <option value="数据解析">数据解析</option>
                    <option value="预处理">预处理</option>
                    <option value="数据抽取">数据抽取</option>
                    <option value="清洗">清洗</option>
                    <option value="合并">合并</option>
                    <option value="导出">导出</option>
                    <option value="同步">同步</option>
                    <option value="其他">其他</option>
                  </select>
                </div>
              </div>

              {/* 执行前后数据量 + 单位 */}
              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-zinc-700">处理前大小</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.size_before}
                    onChange={(e) => handleChange("size_before", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-zinc-700">处理前单位</label>
                  <select
                    value={form.size_unit}
                    onChange={(e) => handleChange("size_unit", e.target.value)}
                    className={selectClass}
                  >
                    <option value="B">B</option>
                    <option value="KB">KB</option>
                    <option value="MB">MB</option>
                    <option value="GB">GB</option>
                    <option value="TB">TB</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-zinc-700">处理后大小</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.size_after}
                    onChange={(e) => handleChange("size_after", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-zinc-700">处理后单位</label>
                  <select
                    value={form.size_after_unit}
                    onChange={(e) => handleChange("size_after_unit", e.target.value)}
                    className={selectClass}
                  >
                    <option value="B">B</option>
                    <option value="KB">KB</option>
                    <option value="MB">MB</option>
                    <option value="GB">GB</option>
                    <option value="TB">TB</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-zinc-700">前记录数</label>
                  <Input
                    type="number"
                    value={form.record_before}
                    onChange={(e) => handleChange("record_before", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-zinc-700">后记录数</label>
                  <Input
                    type="number"
                    value={form.record_after}
                    onChange={(e) => handleChange("record_after", e.target.value)}
                  />
                </div>
              </div>

               <div className="grid grid-cols-3 gap-4">
                 <div className="space-y-1.5">
                   <label className="text-sm font-medium text-zinc-700">耗时</label>
                   <Input
                     type="number"
                     step="0.1"
                     value={form.duration_seconds}
                     onChange={(e) => handleChange("duration_seconds", e.target.value)}
                   />
                 </div>
                 <div className="space-y-1.5">
                   <label className="text-sm font-medium text-zinc-700">时间单位</label>
                   <select
                     value={form.duration_unit}
                     onChange={(e) => handleChange("duration_unit", e.target.value)}
                     className={selectClass}
                   >
                     <option value="seconds">秒</option>
                     <option value="minutes">分</option>
                     <option value="hours">小时</option>
                     <option value="days">天</option>
                   </select>
                 </div>
                 <div className="space-y-1.5">
                   <label className="text-sm font-medium text-zinc-700">
                     执行状态 <span className="text-rose-500">*</span>
                   </label>
                   <select
                     required
                     value={form.status}
                     onChange={(e) => handleChange("status", e.target.value)}
                     className={selectClass}
                   >
                     <option value="success">成功</option>
                     <option value="failed">失败</option>
                     <option value="running">运行中</option>
                   </select>
                 </div>
               </div>

              {/* 执行人 + 版本 */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-zinc-700">执行人</label>
                  <Input
                    value={form.executor}
                    onChange={(e) => handleChange("executor", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-zinc-700">代码版本</label>
                  <Input
                    value={form.code_version}
                    onChange={(e) => handleChange("code_version", e.target.value)}
                  />
                </div>
              </div>

              {/* 开始/结束时间 */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-zinc-700">开始时间</label>
                  <Input
                    type="datetime-local"
                    value={form.start_time}
                    onChange={(e) => handleChange("start_time", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-zinc-700">结束时间</label>
                  <Input
                    type="datetime-local"
                    value={form.end_time}
                    onChange={(e) => handleChange("end_time", e.target.value)}
                  />
                </div>
              </div>

              {/* 配置 */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-zinc-700">配置（JSON 或文本）</label>
                <textarea
                  rows={3}
                  value={form.config}
                  onChange={(e) => handleChange("config", e.target.value)}
                  className="flex w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-950 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300 resize-y"
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
