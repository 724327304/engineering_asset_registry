# Engineering Asset Registry 项目计划

## 一、项目定位

Engineering Asset Registry 是一个内部工程数据资产登记平台，用于把数据集、处理任务、血缘关系、负责人和存储占用统一管理起来。

当前系统围绕两个核心概念构建：

- Dataset = Asset，表示一个工程数据资产。
- Task = Processing Record，表示一次数据处理记录。

一个 Task 消费一个输入 Dataset，并产出一个输出 Dataset。

典型链路：

```text
CC-MAIN-2026-17-预处理
    -> 2026-17-精确去重
CC-MAIN-2026-17-精确去重
    -> 2026-17-质量过滤
CC-MAIN-2026-17-质量过滤
```

## 二、当前技术栈

```text
Frontend: Next.js + React + TypeScript + Tailwind CSS + lucide-react
Backend : FastAPI + SQLAlchemy + Pydantic
Database: PostgreSQL
```

本地默认服务：

- 前端页面: `http://127.0.0.1:8123`
- 后端 API: `http://127.0.0.1:8000`
- API 文档: `http://127.0.0.1:8000/docs`
- PostgreSQL: `127.0.0.1:5432/engineering_asset_registry`

## 三、当前项目结构

```text
.
├── backend/
│   ├── app/
│   │   ├── api.py
│   │   ├── crud.py
│   │   ├── db.py
│   │   ├── main.py
│   │   ├── models.py
│   │   └── schemas.py
│   └── prompt/
├── frontend/
│   ├── app/
│   ├── components/
│   └── lib/
├── scripts/
├── logs/
├── schema.sql
├── docker-compose.yaml
├── start.sh
└── README.md
```

## 四、当前数据模型

### 4.1 dataset

数据资产表，用于描述当前登记的数据集。

| 字段 | 说明 |
| --- | --- |
| `id` | 数据集 ID |
| `name` | 数据集名称 |
| `description` | 数据说明 |
| `source` | 来源，`export` 或 `task_produced` |
| `dataset_type` | 类型，如 `text`、`table`、`feature` |
| `location_path` | 存储路径 |
| `data_size` | 数据大小，支持小数 |
| `size_unit` | 大小单位，如 `B`、`GB`、`TB` |
| `record_count` | 记录数 |
| `owner` | 负责人 |
| `status` | `active` 或 `deleted` |
| `created_at` | 创建时间 |
| `updated_at` | 更新时间 |

### 4.2 dataset_task

数据处理任务表，用于描述数据如何从输入资产生成输出资产。

| 字段 | 说明 |
| --- | --- |
| `id` | 任务 ID |
| `input_dataset_id` | 输入数据集 ID |
| `output_dataset_id` | 输出数据集 ID |
| `task_name` | 任务名称 |
| `task_type` | 任务类型 |
| `size_before` | 处理前大小，支持小数 |
| `size_unit` | 处理前大小单位 |
| `size_after` | 处理后大小，支持小数 |
| `size_after_unit` | 处理后大小单位，应与输出数据集的 `size_unit` 保持一致 |
| `record_before` | 处理前记录数 |
| `record_after` | 处理后记录数 |
| `duration_seconds` | 耗时，单位秒 |
| `duration_unit` | 耗时单位，当前主要使用 `seconds` |
| `status` | `success`、`failed` 或 `running` |
| `executor` | 执行人 |
| `code_version` | 代码版本 |
| `config` | 运行配置 JSON |
| `start_time` | 开始时间 |
| `end_time` | 结束时间 |
| `created_at` | 创建时间 |

当前任务类型：

```text
质量过滤
模型过滤
模糊去重
精确去重
数据解析
预处理
数据抽取
清洗
合并
导出
同步
其他
```

## 五、当前已实现能力

### 5.1 后端能力

- Dataset 创建、查询、详情、更新。
- Task 创建、查询、详情、更新。
- 根据 Dataset 查询相关任务。
- Dashboard 汇总接口。
- PostgreSQL 表结构支持 GB/TB 等单位和小数大小。
- 任务大小字段 `size_before` / `size_after` 支持小数。
- 任务数据变化展示按 `size_before + size_unit`、`size_after + size_after_unit` 换算后计算留存率。

### 5.2 前端页面

- `/`: 仪表盘，展示数据集数、任务数、负责人、活跃存储量和最近活动。
- `/datasets`: 数据集列表，支持状态切换、搜索、分页和按 dump 批次排序。
- `/datasets/[id]`: 数据集详情，展示基础信息、血缘和相关任务。
- `/tasks`: 任务列表，支持状态切换、搜索、分页和按 dump 批次排序。
- `/tasks/[id]`: 任务详情，展示数据流向、执行信息、数据留存率和配置。
- `/lineage`: 简单血缘视图。
- `/search`: 全局搜索。
- `/owners`: 负责人聚合视图，正确按 `data_size + size_unit` 汇总存储量。
- `/storage`: 存储概览，按存储类型聚合，正确按单位换算容量，并支持数据集分页和排序。

### 5.3 当前数据资产链路

已登记 CC dump 的主要阶段：

- 预处理数据集，状态为 `deleted`。
- 精确去重数据集，状态为 `active`。
- 质量过滤数据集，状态为 `active`。

已创建的任务链路：

- `预处理 -> 精确去重`
- `精确去重 -> 质量过滤`

## 六、当前 API

```text
GET  /dashboard

GET  /datasets
POST /datasets
GET  /datasets/{dataset_id}
PUT  /datasets/{dataset_id}
GET  /datasets/{dataset_id}/tasks

GET  /tasks
POST /tasks
GET  /tasks/{task_id}
PUT  /tasks/{task_id}
```

目前 Owners、Storage、Search、Lineage 主要由前端基于 `/datasets` 和 `/tasks` 派生展示。

## 七、当前设计原则

### 7.1 两表核心模型

系统继续保持轻量，核心事实仍由 `dataset` 和 `dataset_task` 两张表承载。

### 7.2 任务驱动血缘

血缘关系不单独建复杂 DAG 表，优先通过：

```text
dataset_task.input_dataset_id
dataset_task.output_dataset_id
```

推导数据链路。

### 7.3 存储量必须按单位换算

涉及存储聚合时，必须使用：

```text
data_size + size_unit
```

换算为 bytes 后再汇总。

任务数据变化和留存率计算必须使用：

```text
size_before + size_unit
size_after + size_after_unit
```

换算为 bytes 后再计算比例，避免 GB、TB、B 等单位混用导致展示错误。

### 7.4 活跃口径和历史口径分开

- 仪表盘存储量只统计 `active` 数据集。
- 存储概览可同时展示总量、活跃量、已删除量。
- 已删除数据集可以保留历史大小和记录数，但存储地址可能为空。

### 7.5 CC dump 排序

CC dump 页面默认按 `CC-MAIN-YYYY-WW` 批次倒序排列，并支持点击名称切换正序/倒序。

## 八、下一阶段 TODO

### 8.4 镜像版本（配置版本）管理

目标：记录任务执行时使用的镜像版本、代码版本和配置版本，便于复现任务结果和排查差异。

建议范围：

- 在任务创建或任务完成时记录镜像版本。
- 将配置版本纳入任务元信息，可复用 `code_version` 或扩展 `config`。
- 前端任务详情页展示镜像版本、配置版本和关键运行参数。
- 支持按版本筛选任务，便于对比不同版本产出的数据集。

待明确事项：

- 镜像版本来源：任务平台注入、手动录入，还是从运行日志解析。
- 配置版本是否需要独立表管理。
- 是否需要保存完整配置快照，还是只保存配置版本号。

### 8.5 任务结束时自动创建任务记录

目标：任务运行结束后自动写入 `dataset_task` 记录，减少人工录入并保证任务元数据及时沉淀。

建议范围：

- 提供任务完成回调接口或采集入口。
- 自动关联输入数据集和输出数据集。
- 自动记录任务类型、状态、开始/结束时间、耗时、处理前后大小和记录数。
- 任务失败时也创建记录，并保存失败状态和错误摘要。

待明确事项：

- 自动创建记录由任务平台主动回调，还是后端定时扫描任务结果。
- 输入/输出数据集如何通过路径、名称或任务 ID 匹配。
- 自动创建的数据是否允许人工修正。

### 8.6 维护接口文档

### 8.7 数据去重
数据概览放到导航页
数据集按阶段（3月6月）筛选 
数据集样本抽取
数据集本身的描述和任务的描述

### 8.8 数据血缘指标增强（规划）

目标：在不改变两表核心模型的前提下，让数据血缘页更直观反映单个 dump 从原始数据到最终处理结果的完整流程变化，并统计各处理阶段的数据指标。

建议范围：

- 链路级摘要：在单条 dump 链路顶部展示总耗时、起始数据量、最终数据量、总文档留存率和总数据留存率。
- 任务级变化：在每个任务节点展示处理前后文档数、数据大小、文档留存率、数据留存率和耗时。
- 数据集节点指标：在每个数据集节点展示数据大小、文档数、状态和必要的存储位置摘要。
- 视觉编码：用 badge 或颜色区分不同任务类型、任务状态和留存率区间，突出变化最大的处理步骤。
- 终点对比：重点展示 `原始数据 -> 最终质量过滤数据` 的总体变化，便于评估完整 pipeline 的产出效率。
- 视图模式：保留当前紧凑链路视图，后续可增加展开态展示详细指标，避免 dump 数量增多后页面过重。
- 筛选能力：后续可支持按年份、dump 批次、任务类型、异常链路或缺失步骤筛选。

暂不实施：

- 暂不新增复杂 DAG 表或后端血缘接口。
- 暂不增加自动定时刷新，优先保留手动刷新或按需刷新。
- 暂不在血缘页堆叠过多存储路径细节，避免影响流程阅读。


## 九、后续演进方向

- 后端分页、筛选、排序能力。
- 数据集抽样存储与展示。
- OSS 对象扫描与缓存。
- 任务执行日志和失败原因记录。
- 更完整的数据血缘图，包括链路级摘要、任务级指标变化、总留存率和异常链路筛选。
- 数据版本化。
- 数据质量指标。
- Airflow / 调度系统任务采集。
- MCP / AI 查询接口。

## 十、验收标准

当前版本应持续满足：

- 能登记数据集。
- 能记录任务。
- 能通过任务追踪数据来源和去向。
- 能查看数据大小、记录数和留存率。
- 能按负责人、存储类型、状态进行基础浏览。
- 能正确按单位换算存储量。
- 能通过 CC dump 批次排序快速定位数据。
- 能在数据血缘页按连续链路理解单个 dump 的完整处理流程，并为后续指标增强预留清晰规划。

下一阶段 TODO 完成后，应额外满足：

- 能在数据集详情中查看样本。
- 能查询 OSS prefix 下真实对象和目录信息。
- 能在数据集列表进行多条件筛选并导出结果。
