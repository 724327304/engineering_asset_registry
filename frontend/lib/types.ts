export type DatasetCreateInput = {
  name: string;
  description?: string;
  source?: string;
  dataset_type?: string;
  location_path: string;
  data_size?: number;
  size_unit?: string;
  record_count?: number;
  owner: string;
  status?: string;
};

export type DatasetUpdateInput = {
  name?: string;
  description?: string;
  source?: string;
  dataset_type?: string;
  location_path?: string;
  data_size?: number;
  size_unit?: string;
  record_count?: number;
  owner?: string;
  status?: string;
};

export type DatasetStatus = "active" | "deleted";
export type TaskStatus = "success" | "failed" | "running";

export type Dataset = {
  id: number;
  name: string;
  description: string;
  source: string;
  sourceLabel: string;
  datasetType: string;
  datasetTypeLabel: string;
  locationPath: string;
  dataSize: number;
  sizeUnit: string;
  sizeLabel: string;
  sizeDisplayLabel: string;
  recordCount: number;
  recordCountLabel: string;
  owner: string;
  status: DatasetStatus | string;
  statusLabel: string;
  createdAt: string;
  updatedAt: string;
  updatedAtLabel: string;
};

export type TaskCreateInput = {
  input_dataset_id: number;
  output_dataset_id: number;
  task_name: string;
  task_type: string;
  size_before?: number;
  size_unit?: string;
  size_after?: number;
  size_after_unit?: string;
  record_before?: number;
  record_after?: number;
  duration_seconds?: number;
  duration_unit?: string;
  status?: string;
  executor?: string;
  code_version?: string;
  config?: unknown;
  start_time?: string;
  end_time?: string;
};

export type TaskUpdateInput = {
  input_dataset_id?: number;
  output_dataset_id?: number;
  task_name?: string;
  task_type?: string;
  size_before?: number;
  size_unit?: string;
  size_after?: number;
  size_after_unit?: string;
  record_before?: number;
  record_after?: number;
  duration_seconds?: number;
  duration_unit?: string;
  status?: string;
  executor?: string;
  code_version?: string;
  config?: unknown;
  start_time?: string;
  end_time?: string;
};

export type Task = {
  id: number;
  inputDatasetId: number;
  outputDatasetId: number;
  inputDatasetName: string;
  outputDatasetName: string;
  name: string;
  type: string;
  sizeBefore: number;
  sizeUnit: string;
  sizeAfter: number;
  sizeAfterUnit: string;
  sizeBeforeLabel: string;
  sizeAfterLabel: string;
  sizeBeforeDisplayLabel: string;
  sizeAfterDisplayLabel: string;
  recordBefore: number;
  recordAfter: number;
  recordBeforeLabel: string;
  recordAfterLabel: string;
  sizeRetentionRateLabel: string;
  recordRetentionRateLabel: string;
  durationSeconds: number;
  durationUnit: string;
  durationLabel: string;
  status: TaskStatus | string;
  statusLabel: string;
  executor: string;
  codeVersion: string;
  config: unknown;
  configLabel: string;
  startTime: string | null;
  endTime: string | null;
  createdAt: string;
  startTimeLabel: string;
  endTimeLabel: string;
  createdAtLabel: string;
};

export type TrendPoint = {
  date: string;
  count: number;
};

export type Dashboard = {
  datasetCount: number;
  taskCount: number;
  activeDatasets: number;
  recentTasks: Task[];
  storageBytes: number;
  storageLabel: string;
  ownerCount: number;
  datasetTrends?: TrendPoint[];
  taskTrends?: TrendPoint[];
};
