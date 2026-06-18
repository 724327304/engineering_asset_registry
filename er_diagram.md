# 工程资产管理平台 — 数据库 ER 图

```mermaid
erDiagram
    dataset {
        BIGSERIAL   id              PK  "数据ID"
        VARCHAR     name            "数据名称"
        TEXT        description     "数据说明"
        VARCHAR     source          "来源：export / task_produced"
        VARCHAR     location_path   "存储位置 OSS/NAS 路径"
        BIGINT      data_size       "数据大小 bytes"
        BIGINT      record_count    "数据行数"
        VARCHAR     owner           "负责人"
        VARCHAR     status          "留存 / 已删除"
        TIMESTAMPTZ created_at      "创建时间"
        TIMESTAMPTZ updated_at      "更新时间"
    }

    dataset_task {
        BIGSERIAL   id              PK  "任务ID"
        BIGINT      dataset_id      FK  "关联 dataset.id"
        VARCHAR     task_name       "任务名称"
        VARCHAR     task_type       "质量过滤 / 模型过滤 / 模糊去重 / 精确去重 / 数据解析 / 数据抽取"
        VARCHAR     input_source    "输入来源"
        VARCHAR     output_location "输出路径"
        BIGINT      size_before     "输入数据大小 bytes"
        BIGINT      size_after      "输出数据大小 bytes"
        BIGINT      record_before   "输入行数"
        BIGINT      record_after    "输出行数"
        NUMERIC     duration_seconds "耗时 秒"
        VARCHAR     status          "success / failed"
        VARCHAR     executor        "执行人"
        VARCHAR     code_version    "Git commit"
        JSONB       config          "配置 JSON"
        TIMESTAMPTZ start_time      "开始时间"
        TIMESTAMPTZ end_time        "结束时间"
        TIMESTAMPTZ created_at      "记录创建时间"
    }

    dataset ||--o{ dataset_task : "has"
```

## 表关系说明

| 关系 | 说明 |
|------|------|
| `dataset 1 ── N dataset_task` | 一个数据资产可以关联多条任务记录（如：生成 → 清洗 → 转换） |
| `dataset_task.dataset_id` → `dataset.id` | 外键约束，删除 dataset 时级联删除关联的 task 记录 |

## 核心查询路径

```
dataset  ←─ JOIN ─→  dataset_task
  ↑                      ↑
  │                      │
  │  通过 dataset_id 关联  │
  │                      │
  └──────────────────────┘
  "某个数据是怎么来的？"
  "这个任务产出了哪些数据？"
