from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .db import get_db
from . import crud, schemas
from .oss_storage import get_oss_storage_report

router = APIRouter()


# ═══════════════ Dataset ═══════════════

@router.post(
    "/datasets",
    response_model=schemas.DatasetOut,
    status_code=201,
    summary="创建数据集",
    description="录入一个新的工程数据资产记录。需提供数据集名称、OSS 存储路径、负责人等必填字段，数据大小和记录数可选。",
    tags=["数据集"],
    response_description="创建成功的数据集完整信息",
)
def create_dataset(data: schemas.DatasetCreate, db: Session = Depends(get_db)):
    return crud.create_dataset(db, data)


@router.get(
    "/datasets",
    response_model=list[schemas.DatasetOut],
    summary="获取数据集列表",
    description="返回所有已登记数据集的列表，按创建时间倒序排列。",
    tags=["数据集"],
)
def list_datasets(db: Session = Depends(get_db)):
    return crud.list_datasets(db)


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
    description="创建一条数据处理任务记录。需关联输入数据集和输出数据集，指定任务名称和任务类型。若未传入 size/record 信息，系统会自动从对应数据集填充。",
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
    description="返回所有已登记的数据处理任务列表，按创建时间倒序排列。",
    tags=["任务"],
)
def list_tasks(db: Session = Depends(get_db)):
    return crud.list_tasks(db)


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
    description="根据数据集 ID 查询所有与该数据集相关联的数据处理任务（包括作为输入和输出数据集）。",
    tags=["任务"],
)
def list_tasks_by_dataset(dataset_id: int, db: Session = Depends(get_db)):
    return crud.list_tasks_by_dataset(db, dataset_id)


# ═══════════════ Dashboard ═══════════════

@router.get(
    "/dashboard",
    response_model=schemas.DashboardOut,
    summary="获取仪表盘概览",
    description="返回仪表盘核心指标：数据集总数、任务总数、活跃数据集数，以及最近 10 条任务记录。",
    tags=["仪表盘"],
)
def dashboard(db: Session = Depends(get_db)):
    return crud.get_dashboard(db)


@router.get(
    "/dashboard/trends",
    response_model=schemas.DashboardTrendsOut,
    summary="获取趋势数据",
    description="返回数据集和任务的每日累计变化趋势。数据集按 created_at 日期累计，任务按 end_time 日期累计。",
    tags=["仪表盘"],
)
def dashboard_trends(db: Session = Depends(get_db)):
    return crud.get_dashboard_trends(db)


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
