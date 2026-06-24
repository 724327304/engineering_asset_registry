# 工程资产登记系统 API 文档 v0.1

> 基础地址：`http://127.0.0.1:8000`  
> 所有时间字段均为 **ISO 8601** 格式（如 `2025-01-15T10:30:00`）  
> `POST`/`PUT` 请求需设置 `Content-Type: application/json`

---

## 目录

1. [数据集](#数据集)
   - [GET /datasets](#get-datasets) — 获取数据集列表
   - [POST /datasets](#post-datasets) — 创建数据集
   - [GET /datasets/{dataset_id}](#get-datasetsdataset_id) — 获取单个数据集
   - [PUT /datasets/{dataset_id}](#put-datasetsdataset_id) — 更新数据集
2. [任务](#任务)
   - [GET /tasks](#get-tasks) — 获取任务列表
   - [POST /tasks](#post-tasks) — 创建数据处理任务
   - [GET /tasks/{task_id}](#get-taskstask_id) — 获取单个任务
   - [PUT /tasks/{task_id}](#put-taskstask_id) — 更新任务
   - [GET /datasets/{dataset_id}/tasks](#get-datasetsdataset_idtasks) — 获取数据集关联任务
3. [仪表盘](#仪表盘)
   - [GET /dashboard](#get-dashboard) — 获取仪表盘概览
   - [GET /dashboard/trends](#get-dashboardtrends) — 获取趋势数据
4. [存储](#存储)
   - [GET /storage/oss](#get-storageoss) — 获取 OSS 存储空间报告
5. [附录：数据模型](#附录数据模型)

---

## 数据集

### GET /datasets

获取数据集列表

> 返回所有已登记数据集的列表，按创建时间倒序排列。

**请求参数：** 无

**响应：`200 OK`**

```json
[
  {
    "id": 1,
    "name": "质量过滤-去重结果-v1",
    "description": "第一版质量过滤和去重后的数据集",
    "source": "task_produced",
    "dataset_type": "table",
    "location_path": "oss://my-bucket/data/cleaned/v1/",
    "data_size": 1024.5,
    "size_unit": "MB",
    "record_count": 500000,
    "owner": "zhangsan",
    "status": "active",
    "created_at": "2025-06-15T10:30:00",
    "updated_at": "2025-06-20T14:00:00"
  }
]
```

响应体为 [DatasetOut](#datasetout) 数组。

---

### POST /datasets

创建数据集

> 录入一个新的工程数据资产记录。需提供数据集名称、OSS 存储路径、负责人等必填字段，数据大小和记录数可选。

**请求体：** `application/json`

| 字段名 | 类型 | 必填 | 说明 |
|--------|------|:----:|------|
| name | string | Y | 数据集名称，最长 255 字符，例如：质量过滤-去重结果-v1 |
| location_path | string | Y | OSS 存储路径，例如：`oss://bucket/path/to/data/` |
| owner | string | Y | 负责人账号或姓名 |
| description | string | N | 数据集的补充说明，可选 |
| source | string | N | 数据来源，默认 `task_produced`。可选值：`export`（外部导出）、`task_produced`（任务产出） |
| dataset_type | string | N | 数据类型，默认 `table`。可选值：`table`/`image`/`text`/`feature`/`label`/`trainset`/`testset`/`result`/`other` |
| data_size | number | N | 数据大小（数值），默认为 0 |
| size_unit | string | N | 数据大小单位，默认 `B`。如 `B`/`KB`/`MB`/`GB`/`TB` |
| record_count | integer | N | 记录/文件/行数，默认 0 |
| status | string | N | 状态，默认 `active`。可选值：`active`（活跃）、`deleted`（已删除） |

**请求示例：**

```json
{
  "name": "质量过滤-去重结果-v1",
  "description": "第一版质量过滤和去重后的数据集",
  "location_path": "oss://my-bucket/data/cleaned/v1/",
  "data_size": 1024.5,
  "size_unit": "MB",
  "record_count": 500000,
  "owner": "zhangsan"
}
```

**响应：`201 Created`** — 返回创建成功的数据集完整信息，格式见 [DatasetOut](#datasetout)。

**错误：`422 Validation Error`** — 请求体字段校验失败。

---

### GET /datasets/{dataset_id}

获取单个数据集

> 根据数据集 ID 获取该数据集的完整信息，包括名称、路径、大小、记录数、责任人等。

**路径参数：**

| 参数名 | 类型 | 说明 |
|--------|------|------|
| dataset_id | integer | 数据集唯一标识 ID |

**响应：`200 OK`** — 返回格式见 [DatasetOut](#datasetout)。

**错误：**
- `404` — 数据集不存在
- `422` — 路径参数校验失败

---

### PUT /datasets/{dataset_id}

更新数据集

> 局部更新指定数据集的信息。只需传入需要修改的字段，未传入的字段保持不变。

**路径参数：**

| 参数名 | 类型 | 说明 |
|--------|------|------|
| dataset_id | integer | 数据集唯一标识 ID |

**请求体：** `application/json`

| 字段名 | 类型 | 必填 | 说明 |
|--------|------|:----:|------|
| name | string | N | 数据集名称，最长 255 字符 |
| description | string | N | 数据集的补充说明 |
| source | string | N | 数据来源：`export`（外部导出）、`task_produced`（任务产出） |
| dataset_type | string | N | 数据类型：`table`/`image`/`text`/`feature`/`label`/`trainset`/`testset`/`result`/`other` |
| location_path | string | N | OSS 存储路径 |
| data_size | number | N | 数据大小（数值） |
| size_unit | string | N | 数据大小单位，如 `B`/`KB`/`MB`/`GB`/`TB` |
| record_count | integer | N | 记录/文件/行数 |
| owner | string | N | 负责人账号或姓名 |
| status | string | N | 状态：`active`（活跃）、`deleted`（已删除） |

**响应：`200 OK`** — 返回更新后的数据集完整信息，格式见 [DatasetOut](#datasetout)。

**错误：**
- `404` — 数据集不存在
- `422` — 校验失败

---

## 任务

### GET /tasks

获取任务列表

> 返回所有已登记的数据处理任务列表，按创建时间倒序排列。

**请求参数：** 无

**响应：`200 OK`** — 返回 [DatasetTaskOut](#datasettaskout) 数组。

---

### POST /tasks

创建数据处理任务

> 创建一条数据处理任务记录。需关联输入数据集和输出数据集，指定任务名称和任务类型。若未传入 size/record 信息，系统会自动从对应数据集填充。

**请求体：** `application/json`

| 字段名 | 类型 | 必填 | 说明 |
|--------|------|:----:|------|
| input_dataset_id | integer | Y | 输入数据集 ID（该任务待处理的数据） |
| output_dataset_id | integer | Y | 输出数据集 ID（该任务产出的数据） |
| task_name | string | Y | 任务名称，最长 255 字符 |
| task_type | string | Y | 任务类型。可选值：`质量过滤`/`模型过滤`/`模糊去重`/`精确去重`/`数据解析`/`数据抽取`/`清洗`/`合并`/`导出`/`同步`/`其他` |
| size_before | number | N | 处理前数据大小（数值），默认 0 |
| size_unit | string | N | 处理前数据大小单位，默认 `B` |
| size_after | number | N | 处理后数据大小（数值），默认 0 |
| size_after_unit | string | N | 处理后数据大小单位，默认 `B` |
| record_before | integer | N | 处理前记录数，默认 0 |
| record_after | integer | N | 处理后记录数，默认 0 |
| duration_seconds | number | N | 任务执行耗时（秒），默认 0 |
| duration_unit | string | N | 耗时单位，默认 `seconds` |
| status | string | N | 任务状态，默认 `success`。可选值：`success`（成功）、`failed`（失败）、`running`（运行中） |
| executor | string | N | 执行人/执行系统 |
| code_version | string | N | 代码版本号 |
| config | object | N | 任务配置参数（JSON 对象） |
| start_time | string | N | 任务开始时间（ISO 8601） |
| end_time | string | N | 任务结束时间（ISO 8601） |

**响应：`201 Created`** — 返回创建成功的任务完整信息，格式见 [DatasetTaskOut](#datasettaskout)。

**错误：**
- `422` — 输入或输出数据集不存在

---

### GET /tasks/{task_id}

获取单个任务

> 根据任务 ID 获取该任务的完整信息，包括输入/输出数据集、处理前后大小和记录数、耗时、执行人等。

**路径参数：**

| 参数名 | 类型 | 说明 |
|--------|------|------|
| task_id | integer | 任务唯一标识 ID |

**响应：`200 OK`** — 返回格式见 [DatasetTaskOut](#datasettaskout)。

**错误：**
- `404` — 任务不存在
- `422` — 校验失败

---

### PUT /tasks/{task_id}

更新任务

> 局部更新指定任务的信息。只需传入需要修改的字段，未传入的字段保持不变。

**路径参数：**

| 参数名 | 类型 | 说明 |
|--------|------|------|
| task_id | integer | 任务唯一标识 ID |

**请求体：** `application/json` — 所有字段均为可选，只传需要修改的字段即可。

| 字段名 | 类型 | 必填 | 说明 |
|--------|------|:----:|------|
| input_dataset_id | integer | N | 输入数据集 ID |
| output_dataset_id | integer | N | 输出数据集 ID |
| task_name | string | N | 任务名称 |
| task_type | string | N | 任务类型 |
| size_before | number | N | 处理前数据大小 |
| size_unit | string | N | 处理前数据大小单位 |
| size_after | number | N | 处理后数据大小 |
| size_after_unit | string | N | 处理后数据大小单位 |
| record_before | integer | N | 处理前记录数 |
| record_after | integer | N | 处理后记录数 |
| duration_seconds | number | N | 任务执行耗时（秒） |
| duration_unit | string | N | 耗时单位 |
| status | string | N | 任务状态：`success`/`failed`/`running` |
| executor | string | N | 执行人/执行系统 |
| code_version | string | N | 代码版本号 |
| config | object | N | 任务配置参数（JSON 对象） |
| start_time | string | N | 任务开始时间（ISO 8601） |
| end_time | string | N | 任务结束时间（ISO 8601） |

**响应：`200 OK`** — 返回更新后的任务完整信息，格式见 [DatasetTaskOut](#datasettaskout)。

**错误：**
- `404` — 任务不存在
- `422` — 校验失败

---

### GET /datasets/{dataset_id}/tasks

获取数据集关联任务

> 根据数据集 ID 查询所有与该数据集相关联的数据处理任务（包括作为输入和输出数据集）。

**路径参数：**

| 参数名 | 类型 | 说明 |
|--------|------|------|
| dataset_id | integer | 数据集唯一标识 ID |

**响应：`200 OK`** — 返回 [DatasetTaskOut](#datasettaskout) 数组。

**错误：`422`** — 路径参数校验失败。

---

## 仪表盘

### GET /dashboard

获取仪表盘概览

> 返回仪表盘核心指标：数据集总数、任务总数、活跃数据集数，以及最近 10 条任务记录。

**请求参数：** 无

**响应：`200 OK`**

| 字段名 | 类型 | 说明 |
|--------|------|------|
| dataset_count | integer | 数据集总数 |
| task_count | integer | 任务总数 |
| active_datasets | integer | 活跃数据集数（状态为 `active` 的数据集） |
| recent_tasks | array[[DatasetTaskOut](#datasettaskout)] | 最近 10 条任务记录 |

**响应示例：**

```json
{
  "dataset_count": 42,
  "task_count": 156,
  "active_datasets": 38,
  "recent_tasks": [...]
}
```

---

### GET /dashboard/trends

获取趋势数据

> 返回数据集和任务的每日累计变化趋势。数据集按 `created_at` 日期累计，任务按 `end_time` 日期累计。

**请求参数：** 无

**响应：`200 OK`**

| 字段名 | 类型 | 说明 |
|--------|------|------|
| dataset_trends | array[[TrendPoint](#trendpoint)] | 数据集每日累计变化趋势 |
| task_trends | array[[TrendPoint](#trendpoint)] | 任务每日累计变化趋势 |

**响应示例：**

```json
{
  "dataset_trends": [
    {"date": "2025-01-01", "count": 5},
    {"date": "2025-01-02", "count": 8},
    {"date": "2025-01-03", "count": 12}
  ],
  "task_trends": [
    {"date": "2025-01-01", "count": 3},
    {"date": "2025-01-02", "count": 7},
    {"date": "2025-01-03", "count": 10}
  ]
}
```

---

## 存储

### GET /storage/oss

获取 OSS 存储空间报告

> 查询 OSS 存储空间的实时用量信息，包括各 bucket 的总容量、已用容量、剩余容量、使用百分比、对象数等。

**请求参数：** 无

**响应：`200 OK`**

| 字段名 | 类型 | 说明 |
|--------|------|------|
| generated_at | string | 报告生成时间（ISO 8601） |
| endpoint | string | OSS 端点地址 |
| configured | boolean | OSS 是否已配置（`false` 表示缺少环境变量） |
| total_limit_bytes | integer | 所有 bucket 总容量限制（字节） |
| total_used_bytes | integer | 所有 bucket 已用总容量（字节） |
| total_remaining_bytes | integer | 所有 bucket 剩余总容量（字节） |
| buckets | array[[OssBucketUsageOut](#ossbucketusageout)] | 各 bucket 用量明细 |

**bucket 单项字段：**

| 字段名 | 类型 | 说明 |
|--------|------|------|
| name | string | Bucket 名称 |
| limit_tb | number | 总容量限制（TB） |
| limit_bytes | integer | 总容量限制（字节） |
| used_bytes | integer | 已用容量（字节） |
| remaining_bytes | integer | 剩余容量（字节） |
| usage_percent | number | 使用百分比（0–100） |
| object_count | integer | 存储对象数 |
| multipart_uploads | integer | 分片上传数 |
| error | string/null | 查询该 bucket 时的错误信息，正常时为 `null` |

---

## 附录：数据模型

### DatasetOut

数据集完整信息（响应模型）

| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | integer | 数据集唯一标识 ID |
| name | string | 数据集名称 |
| description | string | 数据集补充说明 |
| source | string | 数据来源：`export`/`task_produced` |
| dataset_type | string | 数据类型 |
| location_path | string | OSS 存储路径 |
| data_size | number | 数据大小（数值） |
| size_unit | string | 数据大小单位 |
| record_count | integer | 记录/文件/行数 |
| owner | string | 负责人 |
| status | string | 状态 |
| created_at | string | 创建时间（ISO 8601） |
| updated_at | string | 最后更新时间（ISO 8601） |

---

### DatasetCreate

创建数据集请求体

| 字段名 | 类型 | 必填 | 说明 |
|--------|------|:----:|------|
| name | string | Y | 数据集名称，最长 255 字符 |
| location_path | string | Y | OSS 存储路径 |
| owner | string | Y | 负责人账号或姓名 |
| description | string | N | 补充说明 |
| source | string | N | 数据来源，默认 `task_produced` |
| dataset_type | string | N | 数据类型，默认 `table` |
| data_size | number | N | 数据大小（数值），默认 0 |
| size_unit | string | N | 数据大小单位，默认 `B` |
| record_count | integer | N | 记录数，默认 0 |
| status | string | N | 状态，默认 `active` |

---

### DatasetUpdate

更新数据集请求体（所有字段可选）

| 字段名 | 类型 | 必填 | 说明 |
|--------|------|:----:|------|
| name | string | N | 数据集名称，最长 255 字符 |
| description | string | N | 补充说明 |
| source | string | N | 数据来源 |
| dataset_type | string | N | 数据类型 |
| location_path | string | N | OSS 存储路径 |
| data_size | number | N | 数据大小（数值） |
| size_unit | string | N | 数据大小单位 |
| record_count | integer | N | 记录数 |
| owner | string | N | 负责人 |
| status | string | N | 状态 |

---

### DatasetTaskOut

任务完整信息（响应模型）

| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | integer | 任务唯一标识 ID |
| input_dataset_id | integer | 输入数据集 ID |
| output_dataset_id | integer | 输出数据集 ID |
| task_name | string | 任务名称 |
| task_type | string | 任务类型 |
| size_before | number | 处理前数据大小 |
| size_unit | string | 处理前数据大小单位 |
| size_after | number | 处理后数据大小 |
| size_after_unit | string | 处理后数据大小单位 |
| record_before | integer | 处理前记录数 |
| record_after | integer | 处理后记录数 |
| duration_seconds | number | 任务执行耗时（秒） |
| duration_unit | string | 耗时单位 |
| status | string | 任务状态：`success`/`failed`/`running` |
| executor | string | 执行人 |
| code_version | string | 代码版本号 |
| config | object | 任务配置参数（JSON 对象） |
| start_time | string | 任务开始时间（ISO 8601） |
| end_time | string | 任务结束时间（ISO 8601） |
| created_at | string | 记录创建时间（ISO 8601） |

---

### DatasetTaskCreate

创建任务请求体

| 字段名 | 类型 | 必填 | 说明 |
|--------|------|:----:|------|
| input_dataset_id | integer | Y | 输入数据集 ID |
| output_dataset_id | integer | Y | 输出数据集 ID |
| task_name | string | Y | 任务名称，最长 255 字符 |
| task_type | string | Y | 任务类型 |
| size_before | number | N | 处理前数据大小，默认 0 |
| size_unit | string | N | 处理前数据大小单位，默认 `B` |
| size_after | number | N | 处理后数据大小，默认 0 |
| size_after_unit | string | N | 处理后数据大小单位，默认 `B` |
| record_before | integer | N | 处理前记录数，默认 0 |
| record_after | integer | N | 处理后记录数，默认 0 |
| duration_seconds | number | N | 任务执行耗时（秒），默认 0 |
| duration_unit | string | N | 耗时单位，默认 `seconds` |
| status | string | N | 任务状态，默认 `success` |
| executor | string | N | 执行人/执行系统 |
| code_version | string | N | 代码版本号 |
| config | object | N | 任务配置参数（JSON 对象） |
| start_time | string | N | 任务开始时间（ISO 8601） |
| end_time | string | N | 任务结束时间（ISO 8601） |

---

### DatasetTaskUpdate

更新任务请求体（所有字段可选）

| 字段名 | 类型 | 必填 | 说明 |
|--------|------|:----:|------|
| input_dataset_id | integer | N | 输入数据集 ID |
| output_dataset_id | integer | N | 输出数据集 ID |
| task_name | string | N | 任务名称 |
| task_type | string | N | 任务类型 |
| size_before | number | N | 处理前数据大小 |
| size_unit | string | N | 处理前数据大小单位 |
| size_after | number | N | 处理后数据大小 |
| size_after_unit | string | N | 处理后数据大小单位 |
| record_before | integer | N | 处理前记录数 |
| record_after | integer | N | 处理后记录数 |
| duration_seconds | number | N | 任务执行耗时（秒） |
| duration_unit | string | N | 耗时单位 |
| status | string | N | 任务状态 |
| executor | string | N | 执行人/执行系统 |
| code_version | string | N | 代码版本号 |
| config | object | N | 任务配置参数（JSON 对象） |
| start_time | string | N | 任务开始时间（ISO 8601） |
| end_time | string | N | 任务结束时间（ISO 8601） |

---

### DashboardOut

仪表盘概览响应

| 字段名 | 类型 | 说明 |
|--------|------|------|
| dataset_count | integer | 数据集总数 |
| task_count | integer | 任务总数 |
| active_datasets | integer | 活跃数据集数（状态为 `active` 的数据集） |
| recent_tasks | array[[DatasetTaskOut](#datasettaskout)] | 最近 10 条任务记录 |

---

### DashboardTrendsOut

趋势数据响应

| 字段名 | 类型 | 说明 |
|--------|------|------|
| dataset_trends | array[[TrendPoint](#trendpoint)] | 数据集每日累计变化趋势 |
| task_trends | array[[TrendPoint](#trendpoint)] | 任务每日累计变化趋势 |

---

### TrendPoint

趋势数据点

| 字段名 | 类型 | 说明 |
|--------|------|------|
| date | string | 日期，格式 `YYYY-MM-DD` |
| count | integer | 截至该日期的累计数量 |

---

### OssStorageOut

OSS 存储报告响应

| 字段名 | 类型 | 说明 |
|--------|------|------|
| generated_at | string | 报告生成时间（ISO 8601） |
| endpoint | string | OSS 端点地址 |
| configured | boolean | OSS 是否已配置 |
| total_limit_bytes | integer | 所有 bucket 总容量限制（字节） |
| total_used_bytes | integer | 所有 bucket 已用总容量（字节） |
| total_remaining_bytes | integer | 所有 bucket 剩余总容量（字节） |
| buckets | array[[OssBucketUsageOut](#ossbucketusageout)] | 各 bucket 用量明细 |

---

### OssBucketUsageOut

单个 Bucket 用量

| 字段名 | 类型 | 说明 |
|--------|------|------|
| name | string | Bucket 名称 |
| limit_tb | number | 总容量限制（TB） |
| limit_bytes | integer | 总容量限制（字节） |
| used_bytes | integer | 已用容量（字节） |
| remaining_bytes | integer | 剩余容量（字节） |
| usage_percent | number | 使用百分比（0–100） |
| object_count | integer | 存储对象数 |
| multipart_uploads | integer | 分片上传数 |
| error | string/null | 查询该 bucket 时的错误信息，正常时为 null |

---

> 📄 本文档由 OpenAPI 规范自动生成，基础地址：`http://127.0.0.1:8000`  
> 🔍 交互式文档：`http://127.0.0.1:8000/docs` (Swagger UI) | `http://127.0.0.1:8000/redoc` (ReDoc)