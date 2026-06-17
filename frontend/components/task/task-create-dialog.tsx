"use client";

import { useState, useEffect } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createTask, getDatasets } from "@/lib/api";
import type { Task, Dataset } from "@/lib/types";

type TaskCreateDialogProps = {
  onCreated?: (task: Task) => void;
};

export function TaskCreateDialog({ onCreated }: TaskCreateDialogProps = {}) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [datasets, setDatasets] = useState<Dataset[]>([]);

  const [form, setForm] = useState({
    input_dataset_id: "",
    output_dataset_id: "",
    task_name: "",
    task_type: "质量过滤",
    size_before: "",
    size_unit: "B",
    size_after: "",
    size_after_unit: "B",
    record_before: "",
    record_after: "",
    duration_seconds: "",
    duration_unit: "seconds",
    status: "success",
    executor: "",
    code_version: "",
    config: "",
    start_time: "",
    end_time: "",
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

  // 根据选择的输入/输出数据集自动填充 size* / record* / size_unit
  useEffect(() => {
    if (!open) return;
    const inputId = Number(form.input_dataset_id);
    const outputId = Number(form.output_dataset_id);

    const inputDs = datasets.find((d) => d.id === inputId);
    const outputDs = datasets.find((d) => d.id === outputId);

    if (inputDs && inputDs.dataSize) {
      setForm((prev) => ({ ...prev, size_before: String(inputDs.dataSize), size_unit: inputDs.sizeUnit || "B", record_before: String(inputDs.recordCount) }));
    }
    if (outputDs && outputDs.dataSize) {
      setForm((prev) => ({ ...prev, size_after: String(outputDs.dataSize), size_after_unit: outputDs.sizeUnit || "B", record_after: String(outputDs.recordCount) }));
    }
  }, [form.input_dataset_id, form.output_dataset_id, datasets, open]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleChange(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const payload = {
      input_dataset_id: Number(form.input_dataset_id),
      output_dataset_id: Number(form.output_dataset_id),
      task_name: form.task_name,
      task_type: form.task_type,
      size_before: form.size_before ? Number(form.size_before) : 0,
      size_unit: form.size_unit || "B",
      size_after_unit: form.size_after_unit || "B",
      size_after: form.size_after ? Number(form.size_after) : 0,
      record_before: form.record_before ? Number(form.record_before) : 0,
      record_after: form.record_after ? Number(form.record_after) : 0,
      duration_seconds: form.duration_seconds ? Number(form.duration_seconds) : 0,
      duration_unit: form.duration_unit,
      status: form.status,
      executor: form.executor || undefined,
      code_version: form.code_version || undefined,
      config: form.config || undefined,
      start_time: form.start_time || undefined,
      end_time: form.end_time || undefined,
    };

    const result = await createTask(payload);

    if (result.error) {
      setError(result.error);
      setSubmitting(false);
      return;
    }

    setOpen(false);
    setForm({
      input_dataset_id: "",
      output_dataset_id: "",
      task_name: "",
      task_type: "质量过滤",
      size_before: "",
      size_unit: "B",
      size_after: "",
      size_after_unit: "B",
      record_before: "",
      record_after: "",
      duration_seconds: "",
      duration_unit: "seconds",
      status: "success",
      executor: "",
      code_version: "",
      config: "",
      start_time: "",
      end_time: "",
    });
    setSubmitting(false);
    if (onCreated && result.data) {
      onCreated(result.data);
    }
  }

  function handleClose() {
    setOpen(false);
    setError(null);
  }

  const selectClass =
    "flex h-9 w-full rounded-md border border-zinc-200 bg-white px-3 py-1 text-sm text-zinc-950 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300";

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" aria-hidden="true" />
        新建任务
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* backdrop */}
          <div className="absolute inset-0 bg-black/40" onClick={handleClose} />

          {/* dialog */}
          <div className="relative z-10 w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-lg border border-zinc-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
              <h3 className="text-base font-semibold text-zinc-950">新建任务</h3>
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
                    placeholder="例：质量过滤 v2"
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
                     <option value="hours">时</option>
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
                    placeholder="例：zhanghong"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-zinc-700">代码版本</label>
                  <Input
                    value={form.code_version}
                    onChange={(e) => handleChange("code_version", e.target.value)}
                    placeholder="例：v1.2.0"
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
                  placeholder={'例：{"threshold": 0.8}'}
                  className="flex w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-950 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300 resize-y"
                />
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-zinc-100 pt-4">
                <Button type="button" variant="outline" onClick={handleClose}>
                  取消
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? "创建中..." : "创建"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
