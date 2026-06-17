# 工程资产管理平台（Engineering Asset Registry）V0.1 开发计划（轻量版）

---

# 一、项目背景

在当前工程实践中，数据在多个处理阶段（导出、清洗、转换）中不断流转，但存在以下问题：

* 数据来源记录不清晰
* 数据处理过程缺乏统一记录
* 数据变化（大小/数量）不可追踪
* 数据责任人与处理任务脱节
* 排查问题时无法快速定位“数据是怎么来的”

为解决上述问题，计划建设一个**轻量级工程资产管理平台 V0.1**，聚焦“数据本体 + 任务过程”两类核心信息。

---

# 二、项目目标

## 2.1 总体目标

在 7 天内完成一个可运行的内部系统，实现：

> **数据资产登记 + 数据生成任务记录 + 基础查询展示**

---

## 2.2 核心能力目标

系统需具备：

### ✔ 数据可登记

记录数据的基础属性与当前状态

### ✔ 任务可追踪

记录数据如何生成或被处理

### ✔ 关联可查询

数据 ↔ 任务之间可追溯

### ✔ 信息可展示

支持列表 + 详情页查看

---

# 三、系统设计（极简模型）

## 3.1 核心数据模型

系统仅包含两张核心表：

---

## （1）dataset 表（数据资产表）

用于描述“当前这个数据是什么”

### 字段设计

| 字段           | 说明                      |
| ------------ | ----------------------- |
| id           | 数据ID                    |
| name         | 数据名称                    |
| description  | 数据说明                    |
| source       | 来源（导出、任务生产） |
| location_path     | 存储位置（OSS/NAS路径）         |
| data_size   | 数据大小                    |
| record_count | 数据行数                    |
| owner        | 负责人                     |
| status       | 留存 / 已删除     |
| created_at   | 创建时间                    |
| updated_at   | 更新时间                    |

---

### 特点

* 不做版本管理
* 不做血缘图
* 只记录“当前状态”

---

## （2）dataset_task 表（任务记录表）

用于描述“数据是怎么来的”

### 字段设计

| 字段               | 说明                          |
| ---------------- | --------------------------- |
| id               | task id                     |
| dataset_id       | 关联 dataset                  |
| task_name        | 任务名称                        |
| task_type        | 质量过滤 / 模型过滤 / 去重     |
| input_source     | 输入来源                        |
| output_location  | 输出路径                        |
| size_before      | 输入数据大小                      |
| size_after       | 输出数据大小                      |
| record_before    | 输入行数                        |
| record_after     | 输出行数                        |
| duration_seconds | 耗时                          |
| status           | success / failed            |
| executor         | 执行人                         |
| code_version     | Git commit                  |
| config           | 配置（JSON）                    |
| start_time       | 开始时间                        |
| end_time         | 结束时间                        |

---

### 特点

* 记录数据变化过程
* 支持简单审计
* 不做 DAG 血缘建模

---

# 四、系统架构设计

## 4.1 技术架构

```text
前端（Next.js）
        ↓
后端（FastAPI）
        ↓
PostgreSQL
```

---

## 4.2 模块划分

### 前端模块

* Dashboard（统计页）
* Dataset列表页
* Dataset详情页
* Task列表页
* Task详情页
* 新建Dataset
* 新建Task

---

### 后端模块

* Dataset API
* Task API
* Dashboard API

---

### 数据层

* PostgreSQL（唯一数据源）

---

# 五、API设计

## 5.1 Dataset API

* GET /datasets
* GET /datasets/{id}
* POST /datasets
* PUT /datasets/{id}

---

## 5.2 Task API

* GET /tasks
* GET /tasks/{id}
* POST /tasks
* GET /datasets/{id}/tasks

---

## 5.3 Dashboard API

* GET /dashboard

返回：

* dataset count
* task count
* recent tasks
* active datasets

---

# 六、页面设计（V0.1极简版）

---

## 6.1 Dashboard 首页

展示：

* 数据集总数
* 任务总数
* 最近任务列表

---

## 6.2 Dataset 列表页

字段：

* name
* size
* owner
* status

操作：

* 查看详情
* 新建数据

---

## 6.3 Dataset 详情页（核心页面）

展示：

### 基本信息

* name
* location
* size
* record_count

---

### 任务历史（关键）

展示：

```
Task A → 生成当前数据
Task B → 清洗
Task C → 转换
```

---

## 6.4 Task 列表页

字段：

* task_name
* dataset
* status
* duration
* executor

---

## 6.5 Task 详情页

展示：

* 输入数据
* 输出数据
* size变化
* 行数变化
* code_version
* config
* 时间线

---

# 七、一周开发计划

---

## Day 1：项目初始化

* Next.js 初始化
* FastAPI 初始化
* PostgreSQL Docker部署
* 项目结构搭建

---

## Day 2：数据库设计 + 建表

* dataset表
* dataset_task表
* SQLAlchemy模型
* Alembic迁移

---

## Day 3：后端API

* Dataset CRUD
* Task CRUD
* 关联查询API
* Swagger调通

---

## Day 4：前端基础页面

* Dashboard
* Dataset列表
* Task列表

---

## Day 5：详情页

* Dataset详情（任务链展示）
* Task详情页

---

## Day 6：联调

* 前后端联通
* 数据流测试
* 基础bug修复

---

## Day 7：优化与打包

* UI优化
* 查询优化
* Docker Compose整合
* 内部可访问部署

---

# 八、MVP成功标准

系统上线后必须满足：

## ✔ 能登记数据

* dataset可创建

## ✔ 能记录任务

* dataset_task可写入

## ✔ 能查数据来源

* dataset → task可追溯

## ✔ 能看变化

* size_before vs size_after

## ✔ 能跑通完整闭环

数据生成 → 任务记录 → 数据展示

---

# 九、扩展预留（不在V0.1实现）

系统预留接口用于未来扩展：

* MCP查询接口
* Git自动同步
* GPU监控接入
* Airflow任务接入
* 数据版本系统（后续升级）

---

# 十、核心设计原则总结

## ✔ 极简模型优先

只保留：

* dataset
* dataset_task

---

## ✔ 以任务驱动数据变化

所有数据变化必须有 task 来源

---

## ✔ 不做复杂血缘

避免系统复杂化

---

## ✔ 先可用，再扩展

V0.1目标：

> “能用、能查、能解释数据来源”

---

# 十一、长期演进路径（V0.2+）

未来可逐步扩展：

* dataset_version（版本化）
* dataset_lineage（血缘图）
* dataset_artifact（多存储）
* 自动任务采集
* MCP AI查询层
* 数据影响分析

---

# 十二、总结

本版本的核心价值是：

> 用最小复杂度，实现数据 + 任务的可追溯闭环

这是整个工程治理体系的第一步，也是最关键的一步。

后续所有复杂能力（血缘、AI、自动化）都可以基于此逐步扩展。
