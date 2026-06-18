# Engineering Asset Registry

Engineering Asset Registry 是一个内部工程数据资产登记平台，用于管理数据集、处理任务、血缘关系、负责人和存储占用。

核心模型：

- Dataset = Asset，表示一个工程数据资产。
- Task = Processing Record，表示一次数据处理记录。
- 一个 Task 消费一个输入 Dataset，并产出一个输出 Dataset。

示例：

```text
CC-MAIN-2026-17-预处理
    -> 2026-17-精确去重
CC-MAIN-2026-17-精确去重
    -> 2026-17-质量过滤
CC-MAIN-2026-17-质量过滤
```

## 技术栈

- Frontend: Next.js, React, TypeScript, Tailwind CSS, lucide-react
- Backend: FastAPI, SQLAlchemy, Pydantic
- Database: PostgreSQL

## 目录结构

```text
.
├── backend/              # FastAPI 后端
│   ├── app/
│   │   ├── api.py        # API 路由
│   │   ├── crud.py       # 数据访问逻辑
│   │   ├── db.py         # 数据库连接和启动迁移
│   │   ├── main.py       # FastAPI 入口
│   │   ├── models.py     # SQLAlchemy 模型
│   │   └── schemas.py    # Pydantic schema
│   └── prompt/           # 前端生成/迭代提示词
├── frontend/             # Next.js 前端
│   ├── app/              # App Router 页面
│   ├── components/       # UI 和业务组件
│   └── lib/              # API 适配、类型和工具
├── scripts/              # 辅助脚本
├── logs/                 # 本地启动日志
├── schema.sql            # PostgreSQL 建表脚本
├── docker-compose.yaml   # PostgreSQL 容器配置
└── start.sh              # 本地服务管理脚本
```

## 快速启动

先确保本机 PostgreSQL 可用，默认连接信息为：

```text
host: 127.0.0.1
port: 5432
database: engineering_asset_registry
user: postgres
password: postgres
```

一键启动后端和前端：

```bash
./start.sh
```

查看状态：

```bash
./start.sh status
```

重启服务：

```bash
./start.sh restart
```

停止服务：

```bash
./start.sh stop
```

启动后访问：

- 前端页面: http://127.0.0.1:8123
- 后端 API: http://127.0.0.1:8000
- API 文档: http://127.0.0.1:8000/docs

## 手动启动

后端：

```bash
cd backend
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

前端：

```bash
cd frontend
npm install
npm run dev
```

## 数据模型

### dataset

数据资产表，主要字段：

- `name`: 数据集名称
- `description`: 数据说明
- `source`: 来源，`export` 或 `task_produced`
- `dataset_type`: 类型，如 `text`、`table`、`feature`
- `location_path`: 存储路径
- `data_size`: 数据大小，支持小数
- `size_unit`: 大小单位，如 `B`、`GB`、`TB`
- `record_count`: 记录数
- `owner`: 负责人
- `status`: 状态，`active` 或 `deleted`

### dataset_task

数据处理任务表，主要字段：

- `input_dataset_id`: 输入数据集 ID
- `output_dataset_id`: 输出数据集 ID
- `task_name`: 任务名称
- `task_type`: 任务类型
- `size_before` / `size_after`: 处理前后大小
- `size_unit` / `size_after_unit`: 处理前后大小单位
- `record_before` / `record_after`: 处理前后记录数
- `duration_seconds`: 任务耗时，单位为秒
- `status`: `success`、`failed` 或 `running`
- `executor`: 执行人
- `start_time` / `end_time`: 开始和结束时间

当前任务类型包括：

```text
质量过滤
模型过滤
模糊去重
精确去重
数据解析
数据抽取
清洗
合并
导出
同步
其他
```

## 主要页面

- `/`: 仪表盘，展示数据集数、任务数、负责人、活跃存储量和最近活动。
- `/datasets`: 数据集列表，支持状态切换、搜索、分页和按 dump 批次排序。
- `/datasets/[id]`: 数据集详情，展示基础信息、血缘和相关任务。
- `/tasks`: 任务列表，支持状态切换、搜索、分页和按 dump 批次排序。
- `/tasks/[id]`: 任务详情，展示数据流向、执行信息、数据留存率和配置。
- `/lineage`: 简单血缘视图。
- `/search`: 全局搜索。
- `/owners`: 负责人视图。
- `/storage`: 存储概览，按存储类型聚合并展示数据集分页列表。

## API

后端已提供的主要接口：

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

前端浏览器侧默认通过同源代理访问后端：

```text
/api/backend/*
```

## 常用维护命令

前端构建检查：

```bash
cd frontend
npm run build
```

后端语法检查：

```bash
python -m py_compile backend/app/models.py backend/app/schemas.py backend/app/crud.py
```

查看本地数据表：

```bash
PGPASSWORD=postgres psql -h 127.0.0.1 -U postgres -d engineering_asset_registry -c "\dt"
```

查看数据集数量：

```bash
PGPASSWORD=postgres psql -h 127.0.0.1 -U postgres -d engineering_asset_registry -c "SELECT status, count(*) FROM dataset GROUP BY status;"
```

查看任务数量：

```bash
PGPASSWORD=postgres psql -h 127.0.0.1 -U postgres -d engineering_asset_registry -c "SELECT task_type, count(*) FROM dataset_task GROUP BY task_type ORDER BY task_type;"
```

## 说明

- 存储量展示会按 `data_size + size_unit` 换算后聚合。
- 仪表盘存储量只统计 `active` 数据集。
- 已删除数据集可以保留历史大小和记录数，但存储地址可能为空。
- CC dump 相关页面排序默认按 `CC-MAIN-YYYY-WW` 批次倒序。
