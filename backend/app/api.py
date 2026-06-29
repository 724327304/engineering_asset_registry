from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from .db import get_db
from . import crud, schemas
from .oss_storage import get_oss_storage_report
from . import oss_tools
from . import clickhouse_client as ch

router = APIRouter()


# ═══════════════ Project ═══════════════

@router.post(
    "/projects",
    response_model=schemas.ProjectOut,
    status_code=201,
    summary="创建项目",
    description="创建一个新的项目，用于分组管理数据集和任务。项目名称必须唯一。",
    tags=["项目"],
    response_description="创建成功的项目完整信息",
    responses={409: {"description": "项目名称已存在"}},
)
def create_project(data: schemas.ProjectCreate, db: Session = Depends(get_db)):
    from sqlalchemy.exc import IntegrityError
    try:
        return crud.create_project(db, data)
    except IntegrityError:
        raise HTTPException(status_code=409, detail="Project name already exists")


@router.get(
    "/projects",
    response_model=list[schemas.ProjectOut],
    summary="获取项目列表",
    description="返回所有项目列表，每个项目附带数据集和任务的数量统计。",
    tags=["项目"],
)
def list_projects(db: Session = Depends(get_db)):
    return crud.list_projects(db)


@router.get(
    "/projects/{project_id}",
    response_model=schemas.ProjectOut,
    summary="获取单个项目",
    description="根据项目 ID 获取该项目的完整信息，包括数据集和任务数量。",
    tags=["项目"],
    responses={404: {"description": "项目不存在"}},
)
def get_project(project_id: int, db: Session = Depends(get_db)):
    # 利用 list_projects 的聚合查询获取单项目+计数
    projects = crud.list_projects(db)
    for p in projects:
        if p["id"] == project_id:
            return p
    raise HTTPException(status_code=404, detail="Project not found")


@router.put(
    "/projects/{project_id}",
    response_model=schemas.ProjectOut,
    summary="更新项目",
    description="局部更新指定项目的信息。只需传入需要修改的字段。",
    tags=["项目"],
    responses={404: {"description": "项目不存在"}},
)
def update_project(project_id: int, data: schemas.ProjectUpdate, db: Session = Depends(get_db)):
    from sqlalchemy.exc import IntegrityError
    try:
        obj = crud.update_project(db, project_id, data)
    except IntegrityError:
        raise HTTPException(status_code=409, detail="Project name already exists")
    if not obj:
        raise HTTPException(status_code=404, detail="Project not found")
    return obj


@router.get(
    "/projects/{project_id}/datasets",
    response_model=list[schemas.DatasetOut],
    summary="获取项目下数据集",
    description="返回指定项目下的所有数据集列表。",
    tags=["项目"],
)
def list_project_datasets(project_id: int, db: Session = Depends(get_db)):
    return crud.list_datasets_by_project(db, project_id)


@router.get(
    "/projects/{project_id}/tasks",
    response_model=list[schemas.DatasetTaskOut],
    summary="获取项目下任务",
    description="返回指定项目下的所有数据处理任务列表。",
    tags=["项目"],
)
def list_project_tasks(project_id: int, db: Session = Depends(get_db)):
    return crud.list_tasks_by_project(db, project_id)


# ═══════════════ Dataset ═══════════════

@router.post(
    "/datasets",
    response_model=schemas.DatasetOut,
    status_code=201,
    summary="创建数据集",
    description="录入一个新的工程数据资产记录。需提供数据集名称、OSS 存储路径、负责人等必填字段，数据大小和记录数可选。可选指定所属项目。",
    tags=["数据集"],
    response_description="创建成功的数据集完整信息",
)
def create_dataset(data: schemas.DatasetCreate, db: Session = Depends(get_db)):
    return crud.create_dataset(db, data)


@router.get(
    "/datasets",
    response_model=list[schemas.DatasetOut],
    summary="获取数据集列表",
    description="返回所有已登记数据集的列表，按创建时间倒序排列。可选按项目筛选。",
    tags=["数据集"],
)
def list_datasets(
    project_id: Optional[int] = Query(None, description="按项目 ID 筛选数据集"),
    db: Session = Depends(get_db),
):
    return crud.list_datasets(db, project_id=project_id)


@router.get(
    "/datasets/{dataset_id}",
    response_model=schemas.DatasetOut,
    summary="获取单个数据集",
    description="根据数据集 ID 获取该数据集的完整信息，包括名称、路径、大小、记录数、责任人等。",
    tags=["数据集"],
    responses={404: {"description": "数据集不存在"}},
)
def get_dataset(dataset_id: int, db: Session = Depends(get_db)):
    obj = crud.get_dataset(db, dataset_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Dataset not found")
    return obj


@router.put(
    "/datasets/{dataset_id}",
    response_model=schemas.DatasetOut,
    summary="更新数据集",
    description="局部更新指定数据集的信息。只需传入需要修改的字段，未传入的字段保持不变。",
    tags=["数据集"],
    responses={404: {"description": "数据集不存在"}},
)
def update_dataset(dataset_id: int, data: schemas.DatasetUpdate, db: Session = Depends(get_db)):
    obj = crud.update_dataset(db, dataset_id, data)
    if not obj:
        raise HTTPException(status_code=404, detail="Dataset not found")
    return obj


# ═══════════════ DatasetTask ═══════════════

@router.post(
    "/tasks",
    response_model=schemas.DatasetTaskOut,
    status_code=201,
    summary="创建数据处理任务",
    description="创建一条数据处理任务记录。需关联输入数据集和输出数据集，指定任务名称和任务类型。若未传入 size/record 信息，系统会自动从对应数据集填充。可选指定所属项目。",
    tags=["任务"],
    responses={422: {"description": "输入或输出数据集不存在"}},
    response_description="创建成功的任务完整信息",
)
def create_task(data: schemas.DatasetTaskCreate, db: Session = Depends(get_db)):
    try:
        return crud.create_task(db, data)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))


@router.get(
    "/tasks",
    response_model=list[schemas.DatasetTaskOut],
    summary="获取任务列表",
    description="返回所有已登记的数据处理任务列表，按创建时间倒序排列。可选按项目筛选、时间范围、任务类型进行过滤。",
    tags=["任务"],
)
def list_tasks(
    project_id: Optional[int] = Query(None, description="按项目 ID 筛选任务"),
    start_time: Optional[datetime] = Query(None, description="任务结束时间下限（ISO 8601）"),
    end_time: Optional[datetime] = Query(None, description="任务结束时间上限（ISO 8601）"),
    task_type: Optional[str] = Query(None, description="任务类型（可选值：质量过滤/模型过滤/模糊去重/精确去重/数据解析/预处理/数据抽取/清洗/合并/导出/同步/其他）"),
    db: Session = Depends(get_db),
):
    return crud.list_tasks(
        db,
        project_id=project_id,
        end_time_from=start_time,
        end_time_to=end_time,
        task_type=task_type,
    )


@router.get(
    "/tasks/{task_id}",
    response_model=schemas.DatasetTaskOut,
    summary="获取单个任务",
    description="根据任务 ID 获取该任务的完整信息，包括输入/输出数据集、处理前后大小和记录数、耗时、执行人等。",
    tags=["任务"],
    responses={404: {"description": "任务不存在"}},
)
def get_task(task_id: int, db: Session = Depends(get_db)):
    obj = crud.get_task(db, task_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Task not found")
    return obj


@router.put(
    "/tasks/{task_id}",
    response_model=schemas.DatasetTaskOut,
    summary="更新任务",
    description="局部更新指定任务的信息。只需传入需要修改的字段，未传入的字段保持不变。",
    tags=["任务"],
    responses={404: {"description": "任务不存在"}},
)
def update_task(task_id: int, data: schemas.DatasetTaskUpdate, db: Session = Depends(get_db)):
    obj = crud.update_task(db, task_id, data)
    if not obj:
        raise HTTPException(status_code=404, detail="Task not found")
    return obj


@router.get(
    "/datasets/{dataset_id}/tasks",
    response_model=list[schemas.DatasetTaskOut],
    summary="获取数据集关联任务",
    description="根据数据集 ID 查询所有与该数据集相关联的数据处理任务（包括作为输入和输出数据集）。可选按项目筛选。",
    tags=["任务"],
)
def list_tasks_by_dataset(
    dataset_id: int,
    project_id: Optional[int] = Query(None, description="按项目 ID 筛选任务"),
    db: Session = Depends(get_db),
):
    return crud.list_tasks_by_dataset(db, dataset_id, project_id=project_id)


# ═══════════════ Dashboard ═══════════════

@router.get(
    "/dashboard",
    response_model=schemas.DashboardOut,
    summary="获取仪表盘概览",
    description="返回仪表盘核心指标：数据集总数、任务总数、活跃数据集数，以及最近 10 条任务记录。可选按项目筛选。",
    tags=["仪表盘"],
)
def dashboard(
    project_id: Optional[int] = Query(None, description="按项目 ID 筛选仪表盘数据"),
    db: Session = Depends(get_db),
):
    return crud.get_dashboard(db, project_id=project_id)


@router.get(
    "/dashboard/trends",
    response_model=schemas.DashboardTrendsOut,
    summary="获取趋势数据",
    description="返回数据集和任务的每日累计变化趋势。数据集按 created_at 日期累计，任务按 end_time 日期累计。可选按项目筛选。",
    tags=["仪表盘"],
)
def dashboard_trends(
    project_id: Optional[int] = Query(None, description="按项目 ID 筛选趋势数据"),
    db: Session = Depends(get_db),
):
    return crud.get_dashboard_trends(db, project_id=project_id)


# ═══════════════ Storage ═══════════════

@router.get(
    "/storage/oss",
    response_model=schemas.OssStorageOut,
    summary="获取 OSS 存储空间报告",
    description="查询 OSS 存储空间的实时用量信息，包括各 bucket 的总容量、已用容量、剩余容量、使用百分比、对象数等。",
    tags=["存储"],
)
def oss_storage():
    return get_oss_storage_report()


# ═══════════════ OSS Tools ═══════════════

@router.post(
    "/tools/oss/list-files",
    response_model=schemas.OssListFilesOut,
    summary="OSS 文件列表统计",
    description="统计 OSS 指定目录下的文件数量，并返回前 10 条文件名。",
    tags=["工具箱"],
    responses={400: {"description": "OSS 路径格式错误"}, 500: {"description": "OSS 连接或认证错误"}},
)
def oss_list_files(data: schemas.OssToolsRequest):
    try:
        result = oss_tools.list_oss_files(data.oss_path)
        return schemas.OssListFilesOut(
            oss_path=result.oss_path,
            bucket=result.bucket,
            prefix=result.prefix,
            total_files=result.total_files,
            top_files=result.top_files,
            generated_at=result.generated_at,
        )
    except (ValueError, RuntimeError) as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.post(
    "/tools/oss/sample-files",
    response_model=schemas.OssSampleOut,
    summary="OSS 文件内容随机抽样",
    description="通过 ClickHouse s3() 直接对 OSS 目录第一层的 .jsonl.gz/.zst/.zstd 压缩文件内容进行随机抽样。抽样数量可选 100/1000/10000。",
    tags=["工具箱"],
    responses={400: {"description": "参数错误或抽样数量不合法"}, 500: {"description": "ClickHouse 连接或 s3() 查询失败"}},
)
def oss_sample_files(data: schemas.OssToolsRequest):
    sample_size = data.sample_size or 100
    try:
        result = ch.sample_files_via_clickhouse(data.oss_path, sample_size)
        return schemas.OssSampleOut(
            oss_path=result.oss_path,
            bucket=result.bucket,
            prefix=result.prefix,
            sample_size=result.sample_size,
            total_files=result.total_files,
            sample_lines=result.sample_lines,
            errors=result.errors,
            generated_at=result.generated_at,
        )
    except (ValueError, RuntimeError) as exc:
        raise HTTPException(status_code=400, detail=str(exc))
