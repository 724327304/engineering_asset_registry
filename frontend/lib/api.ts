import type {
  Dashboard,
  Dataset,
  DatasetCreateInput,
  DatasetUpdateInput,
  Task,
  TaskCreateInput,
  TaskUpdateInput,
} from "@/lib/types";

function getApiBaseUrl() {
  if (typeof window === "undefined") {
    return (
      process.env.EAR_INTERNAL_API_BASE_URL ??
      process.env.EAR_API_BASE_URL ??
      "http://127.0.0.1:8000"
    );
  }

  return process.env.NEXT_PUBLIC_EAR_API_BASE_URL ?? "/api/backend";
}

type BackendDataset = {
  id: number;
  name: string;
  description: string | null;
  source: string;
  dataset_type: string;
  location_path: string;
  data_size: number;
  size_unit: string | null;
  record_count: number;
  owner: string;
  status: string;
  created_at: string;
  updated_at: string;
};

type BackendTask = {
  id: number;
  input_dataset_id: number;
  output_dataset_id: number;
  task_name: string;
  task_type: string;
  size_before: number;
  size_unit: string | null;
  size_after: number;
  size_after_unit: string | null;
  record_before: number;
  record_after: number;
  duration_seconds: number;
  duration_unit: string | null;
  status: string;
  executor: string | null;
  code_version: string | null;
  config: unknown;
  start_time: string | null;
  end_time: string | null;
  created_at: string;
};

type BackendDashboard = {
  dataset_count: number;
  task_count: number;
  recent_tasks: BackendTask[];
  active_datasets: number;
};

export type ApiResult<T> =
  | { data: T; error: null }
  | { data: null; error: string };

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...options,
    headers: {
      Accept: "application/json",
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`${response.status} ${response.statusText}${body ? ` - ${body}` : ""}`);
  }

  return response.json() as Promise<T>;
}

async function safeRequest<T>(path: string, options?: RequestInit): Promise<ApiResult<T>> {
  try {
    return { data: await request<T>(path, options), error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : "后端服务暂不可用",
    };
  }
}

export async function createDataset(input: DatasetCreateInput): Promise<ApiResult<Dataset>> {
  const result = await safeRequest<BackendDataset>("/datasets", {
    method: "POST",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (result.error || !result.data) {
    return { data: null, error: result.error ?? "数据集创建失败" };
  }

  return {
    data: toDataset(result.data),
    error: null,
  };
}

export async function updateDataset(
  id: string | number,
  input: DatasetUpdateInput,
): Promise<ApiResult<Dataset>> {
  const result = await safeRequest<BackendDataset>(`/datasets/${id}`, {
    method: "PUT",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (result.error || !result.data) {
    return { data: null, error: result.error ?? "数据集更新失败" };
  }

  return {
    data: toDataset(result.data),
    error: null,
  };
}

export async function getDatasets(): Promise<ApiResult<Dataset[]>> {
  const result = await safeRequest<BackendDataset[]>("/datasets");
  if (result.error || !result.data) return { data: null, error: result.error ?? "数据集读取失败" };

  return {
    data: result.data.map(toDataset),
    error: null,
  };
}

export async function getDataset(id: string): Promise<ApiResult<Dataset>> {
  const result = await safeRequest<BackendDataset>(`/datasets/${id}`);
  if (result.error || !result.data) return { data: null, error: result.error ?? "数据集读取失败" };

  return {
    data: toDataset(result.data),
    error: null,
  };
}

export async function getTasks(): Promise<ApiResult<Task[]>> {
  const [tasksResult, datasetsResult] = await Promise.all([
    safeRequest<BackendTask[]>("/tasks"),
    safeRequest<BackendDataset[]>("/datasets"),
  ]);

  if (tasksResult.error || !tasksResult.data) {
    return { data: null, error: tasksResult.error ?? "任务读取失败" };
  }

  const datasetNames = new Map(
    (datasetsResult.data ?? []).map((dataset) => [dataset.id, dataset.name]),
  );

  return {
    data: tasksResult.data.map((task) => toTask(task, datasetNames)),
    error: null,
  };
}

export async function getTask(id: string): Promise<ApiResult<Task>> {
  const taskResult = await safeRequest<BackendTask>(`/tasks/${id}`);
  if (taskResult.error || !taskResult.data) {
    return { data: null, error: taskResult.error ?? "任务读取失败" };
  }

  const datasetsResult = await safeRequest<BackendDataset[]>("/datasets");
  const datasetNames = new Map(
    (datasetsResult.data ?? []).map((dataset) => [dataset.id, dataset.name]),
  );

  return {
    data: toTask(taskResult.data, datasetNames),
    error: null,
  };
}

export async function getTasksForDataset(datasetId: string): Promise<ApiResult<Task[]>> {
  const [tasksResult, datasetsResult] = await Promise.all([
    safeRequest<BackendTask[]>(`/datasets/${datasetId}/tasks`),
    safeRequest<BackendDataset[]>("/datasets"),
  ]);

  if (tasksResult.error || !tasksResult.data) {
    return { data: null, error: tasksResult.error ?? "任务历史读取失败" };
  }

  const datasetNames = new Map(
    (datasetsResult.data ?? []).map((dataset) => [dataset.id, dataset.name]),
  );

  return {
    data: tasksResult.data.map((task) => toTask(task, datasetNames)),
    error: null,
  };
}

export async function createTask(input: TaskCreateInput): Promise<ApiResult<Task>> {
  const result = await safeRequest<BackendTask>("/tasks", {
    method: "POST",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (result.error || !result.data) {
    return { data: null, error: result.error ?? "任务创建失败" };
  }

  return {
    data: toTask(result.data),
    error: null,
  };
}

export async function updateTask(
  id: string | number,
  input: TaskUpdateInput,
): Promise<ApiResult<Task>> {
  const result = await safeRequest<BackendTask>(`/tasks/${id}`, {
    method: "PUT",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (result.error || !result.data) {
    return { data: null, error: result.error ?? "任务更新失败" };
  }

  return {
    data: toTask(result.data),
    error: null,
  };
}

export async function getDashboard(): Promise<ApiResult<Dashboard>> {
  const [dashboardResult, datasetsResult] = await Promise.all([
    safeRequest<BackendDashboard>("/dashboard"),
    safeRequest<BackendDataset[]>("/datasets"),
  ]);

  if (dashboardResult.error || !dashboardResult.data) {
    return { data: null, error: dashboardResult.error ?? "仪表盘读取失败" };
  }

  const datasets = datasetsResult.data ?? [];
  const datasetNames = new Map(datasets.map((dataset) => [dataset.id, dataset.name]));
  const activeDatasets = datasets.filter((dataset) => dataset.status === "active");
  const storageBytes = activeDatasets.reduce(
    (sum, dataset) => sum + toBytes(Number(dataset.data_size ?? 0), dataset.size_unit ?? "B"),
    0,
  );
  const ownerCount = new Set(datasets.map((dataset) => dataset.owner).filter(Boolean)).size;

  return {
    data: {
      datasetCount: dashboardResult.data.dataset_count,
      taskCount: dashboardResult.data.task_count,
      activeDatasets: dashboardResult.data.active_datasets,
      recentTasks: dashboardResult.data.recent_tasks.map((task) =>
        toTask(task, datasetNames),
      ),
      storageBytes,
      storageLabel: formatBytes(storageBytes),
      ownerCount,
    },
    error: null,
  };
}

function toDataset(dataset: BackendDataset): Dataset {
  return {
    id: dataset.id,
    name: dataset.name,
    description: dataset.description ?? "",
    source: dataset.source,
    sourceLabel: formatSource(dataset.source),
    datasetType: dataset.dataset_type,
    datasetTypeLabel: formatDatasetType(dataset.dataset_type),
    locationPath: dataset.location_path,
    dataSize: Number(dataset.data_size ?? 0),
    sizeUnit: dataset.size_unit ?? "B",
    sizeLabel: formatSize(Number(dataset.data_size ?? 0), dataset.size_unit ?? "B"),
    recordCount: Number(dataset.record_count ?? 0),
    recordCountLabel: formatNumber(Number(dataset.record_count ?? 0)),
    owner: dataset.owner,
    status: dataset.status,
    statusLabel: formatDatasetStatus(dataset.status),
    createdAt: dataset.created_at,
    updatedAt: dataset.updated_at,
    updatedAtLabel: formatDateTime(dataset.updated_at),
  };
}

function toTask(task: BackendTask, datasetNames?: Map<number, string>): Task {
  const durationSeconds = Number(task.duration_seconds ?? 0);
  const sizeBefore = Number(task.size_before ?? 0);
  const sizeAfter = Number(task.size_after ?? 0);
  const recordBefore = Number(task.record_before ?? 0);
  const recordAfter = Number(task.record_after ?? 0);
  const inputDatasetName = datasetNames?.get(task.input_dataset_id) ?? `数据集 #${task.input_dataset_id}`;
  const outputDatasetName = datasetNames?.get(task.output_dataset_id) ?? `数据集 #${task.output_dataset_id}`;

  return {
    id: task.id,
    inputDatasetId: task.input_dataset_id,
    outputDatasetId: task.output_dataset_id,
    inputDatasetName,
    outputDatasetName,
    name: task.task_name,
    type: task.task_type,
    sizeBefore,
    sizeUnit: task.size_unit ?? "B",
    sizeAfter,
    sizeAfterUnit: task.size_after_unit ?? "B",
    sizeBeforeLabel: formatSize(sizeBefore, task.size_unit ?? "B"),
    sizeAfterLabel: formatSize(sizeAfter, task.size_after_unit ?? "B"),
    recordBefore,
    recordAfter,
    recordBeforeLabel: formatNumber(recordBefore),
    recordAfterLabel: formatNumber(recordAfter),
    sizeRetentionRateLabel: formatRetentionRate(sizeBefore, sizeAfter),
    recordRetentionRateLabel: formatRetentionRate(recordBefore, recordAfter),
    durationSeconds,
    durationUnit: task.duration_unit ?? "seconds",
    durationLabel: formatDuration(durationSeconds),
    status: task.status,
    statusLabel: formatTaskStatus(task.status),
    executor: task.executor ?? "",
    codeVersion: task.code_version ?? "",
    config: task.config,
    configLabel: formatConfig(task.config),
    startTime: task.start_time,
    endTime: task.end_time,
    createdAt: task.created_at,
    startTimeLabel: formatDateTime(task.start_time),
    endTimeLabel: formatDateTime(task.end_time),
    createdAtLabel: formatDateTime(task.created_at),
  };
}

function formatSource(source: string) {
  const labels: Record<string, string> = {
    export: "外部导出",
    task_produced: "任务产出",
  };
  return labels[source] ?? source;
}

function formatDatasetType(type: string) {
  const labels: Record<string, string> = {
    table: "表格",
    image: "图片",
    text: "文本",
    feature: "特征",
    label: "标签",
    trainset: "训练集",
    testset: "测试集",
    result: "结果",
    other: "其他",
  };
  return labels[type] ?? type;
}

function formatDatasetStatus(status: string) {
  const labels: Record<string, string> = {
    active: "活跃",
    deleted: "已删除",
  };
  return labels[status] ?? status;
}

function formatTaskStatus(status: string) {
  const labels: Record<string, string> = {
    success: "成功",
    failed: "失败",
    running: "运行中",
  };
  return labels[status] ?? status;
}

function formatConfig(config: unknown) {
  if (config === null || config === undefined || config === "") return "未配置";
  if (typeof config === "string") return config;
  return JSON.stringify(config, null, 2);
}

function formatDateTime(value: string | null) {
  if (!value) return "未记录";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatDuration(seconds: number) {
  if (!seconds) return "0 秒";

  const SECONDS_PER_MINUTE = 60;
  const SECONDS_PER_HOUR = 3600;
  const SECONDS_PER_DAY = 86400;

  if (seconds < SECONDS_PER_MINUTE) return `${Math.round(seconds)} 秒`;
  if (seconds < SECONDS_PER_HOUR) {
    const minutes = Math.floor(seconds / SECONDS_PER_MINUTE);
    const secs = Math.round(seconds % SECONDS_PER_MINUTE);
    return secs > 0 ? `${minutes} 分 ${secs} 秒` : `${minutes} 分`;
  }
  if (seconds < SECONDS_PER_DAY) {
    const hours = Math.floor(seconds / SECONDS_PER_HOUR);
    const mins = Math.round((seconds % SECONDS_PER_HOUR) / SECONDS_PER_MINUTE);
    return mins > 0 ? `${hours} 小时 ${mins} 分` : `${hours} 小时`;
  }
  const days = Math.floor(seconds / SECONDS_PER_DAY);
  const hours = Math.round((seconds % SECONDS_PER_DAY) / SECONDS_PER_HOUR);
  return hours > 0 ? `${days} 天 ${hours} 小时` : `${days} 天`;
}

function formatSize(value: number, unit: string) {
  if (!value) return `0 ${unit}`;
  const formatted = new Intl.NumberFormat("zh-CN", {
    maximumFractionDigits: 2,
  }).format(value);
  return `${formatted} ${unit}`;
}

function formatBytes(bytes: number) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value >= 10 ? value.toFixed(0) : value.toFixed(1)} ${units[unitIndex]}`;
}

function toBytes(value: number, unit: string): number {
  const multipliers: Record<string, number> = {
    B: 1,
    KB: 1024,
    MB: 1024 * 1024,
    GB: 1024 * 1024 * 1024,
    TB: 1024 * 1024 * 1024 * 1024,
  };
  return value * (multipliers[unit] ?? 1);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("zh-CN", {
    notation: value >= 100000 ? "compact" : "standard",
    maximumFractionDigits: 1,
  }).format(value);
}

function formatRetentionRate(before: number, after: number) {
  if (!before) return after ? "无法计算" : "0.00%";
  const percent = (after / before) * 100;
  return `${percent.toFixed(2)}%`;
}
