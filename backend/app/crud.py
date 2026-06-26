from datetime import datetime

from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from . import models, schemas


# ── Project ═══════════════════════════════════════════════

def create_project(db: Session, data: schemas.ProjectCreate) -> models.Project:
    obj = models.Project(**data.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


def get_project(db: Session, project_id: int) -> models.Project | None:
    return db.query(models.Project).filter(models.Project.id == project_id).first()


def list_projects(db: Session) -> list[dict]:
    """返回项目列表，附带每个项目下的数据集和任务计数"""
    rows = (
        db.query(
            models.Project,
            func.count(func.distinct(models.Dataset.id)).label("dataset_count"),
            func.count(func.distinct(models.DatasetTask.id)).label("task_count"),
        )
        .outerjoin(models.Dataset, models.Dataset.project_id == models.Project.id)
        .outerjoin(models.DatasetTask, models.DatasetTask.project_id == models.Project.id)
        .group_by(models.Project.id)
        .order_by(models.Project.created_at.desc())
        .all()
    )
    result = []
    for project, dc, tc in rows:
        d = {
            "id": project.id,
            "name": project.name,
            "description": project.description,
            "owner": project.owner,
            "status": project.status,
            "dataset_count": dc,
            "task_count": tc,
            "created_at": project.created_at,
            "updated_at": project.updated_at,
        }
        result.append(d)
    return result


def update_project(db: Session, project_id: int, data: schemas.ProjectUpdate) -> models.Project | None:
    obj = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not obj:
        return None
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(obj, key, value)
    db.commit()
    db.refresh(obj)
    return obj


# ── Dataset ═══════════════════════════════════════════════

def create_dataset(db: Session, data: schemas.DatasetCreate) -> models.Dataset:
    obj = models.Dataset(**data.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


def get_dataset(db: Session, dataset_id: int) -> models.Dataset | None:
    return db.query(models.Dataset).filter(models.Dataset.id == dataset_id).first()


def list_datasets(db: Session, project_id: int | None = None) -> list[models.Dataset]:
    q = db.query(models.Dataset)
    if project_id is not None:
        q = q.filter(models.Dataset.project_id == project_id)
    return q.order_by(models.Dataset.created_at.desc()).all()


def update_dataset(db: Session, dataset_id: int, data: schemas.DatasetUpdate) -> models.Dataset | None:
    """局部更新：只更新传入的非 None 字段"""
    obj = db.query(models.Dataset).filter(models.Dataset.id == dataset_id).first()
    if not obj:
        return None
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(obj, key, value)
    db.commit()
    db.refresh(obj)
    return obj


# ── DatasetTask ═══════════════════════════════════════════

def create_task(db: Session, data: schemas.DatasetTaskCreate) -> models.DatasetTask:
    input_dataset = db.query(models.Dataset).filter(models.Dataset.id == data.input_dataset_id).first()
    if not input_dataset:
        raise ValueError(f"Input dataset with id={data.input_dataset_id} not found")
    output_dataset = db.query(models.Dataset).filter(models.Dataset.id == data.output_dataset_id).first()
    if not output_dataset:
        raise ValueError(f"Output dataset with id={data.output_dataset_id} not found")

    task_dict = data.model_dump()

    # 若前端未显式传入 size/record，则从对应数据集自动填充
    if not task_dict.get("size_before"):
        task_dict["size_before"] = input_dataset.data_size or 0
    if not task_dict.get("size_unit"):
        task_dict["size_unit"] = input_dataset.size_unit or "B"
    if not task_dict.get("size_after"):
        task_dict["size_after"] = output_dataset.data_size or 0
    if not task_dict.get("size_after_unit"):
        task_dict["size_after_unit"] = output_dataset.size_unit or "B"
    if not task_dict.get("record_before"):
        task_dict["record_before"] = input_dataset.record_count or 0
    if not task_dict.get("record_after"):
        task_dict["record_after"] = output_dataset.record_count or 0

    obj = models.DatasetTask(**task_dict)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


def get_task(db: Session, task_id: int) -> models.DatasetTask | None:
    return db.query(models.DatasetTask).filter(models.DatasetTask.id == task_id).first()


def list_tasks(
    db: Session,
    project_id: int | None = None,
    end_time_from: datetime | None = None,
    end_time_to: datetime | None = None,
    task_type: str | None = None,
) -> list[models.DatasetTask]:
    q = db.query(models.DatasetTask)
    if project_id is not None:
        q = q.filter(models.DatasetTask.project_id == project_id)
    if end_time_from is not None:
        q = q.filter(models.DatasetTask.end_time >= end_time_from)
    if end_time_to is not None:
        q = q.filter(models.DatasetTask.end_time <= end_time_to)
    if task_type is not None:
        q = q.filter(models.DatasetTask.task_type == task_type)
    return q.order_by(models.DatasetTask.created_at.desc()).all()


def update_task(db: Session, task_id: int, data: schemas.DatasetTaskUpdate) -> models.DatasetTask | None:
    """局部更新：只更新传入的非 None 字段"""
    obj = db.query(models.DatasetTask).filter(models.DatasetTask.id == task_id).first()
    if not obj:
        return None
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(obj, key, value)
    db.commit()
    db.refresh(obj)
    return obj


def list_tasks_by_dataset(db: Session, dataset_id: int, project_id: int | None = None) -> list[models.DatasetTask]:
    q = (
        db.query(models.DatasetTask)
        .filter(
            or_(
                models.DatasetTask.input_dataset_id == dataset_id,
                models.DatasetTask.output_dataset_id == dataset_id,
            )
        )
    )
    if project_id is not None:
        q = q.filter(models.DatasetTask.project_id == project_id)
    return q.order_by(models.DatasetTask.created_at.desc()).all()


def list_datasets_by_project(db: Session, project_id: int) -> list[models.Dataset]:
    return (
        db.query(models.Dataset)
        .filter(models.Dataset.project_id == project_id)
        .order_by(models.Dataset.created_at.desc())
        .all()
    )


def list_tasks_by_project(db: Session, project_id: int) -> list[models.DatasetTask]:
    return (
        db.query(models.DatasetTask)
        .filter(models.DatasetTask.project_id == project_id)
        .order_by(models.DatasetTask.created_at.desc())
        .all()
    )


# ── Dashboard ═════════════════════════════════════════════

def get_dashboard(db: Session, recent_limit: int = 10, project_id: int | None = None) -> schemas.DashboardOut:
    dataset_q = db.query(func.count(models.Dataset.id))
    task_q = db.query(func.count(models.DatasetTask.id))
    active_q = (
        db.query(func.count(models.Dataset.id))
        .filter(models.Dataset.status == "active")
    )
    recent_q = db.query(models.DatasetTask)

    if project_id is not None:
        dataset_q = dataset_q.filter(models.Dataset.project_id == project_id)
        task_q = task_q.filter(models.DatasetTask.project_id == project_id)
        active_q = active_q.filter(models.Dataset.project_id == project_id)
        recent_q = recent_q.filter(models.DatasetTask.project_id == project_id)

    dataset_count = dataset_q.scalar()
    task_count = task_q.scalar()
    active_datasets = active_q.scalar()
    recent_tasks = (
        recent_q
        .order_by(models.DatasetTask.created_at.desc())
        .limit(recent_limit)
        .all()
    )
    return schemas.DashboardOut(
        dataset_count=dataset_count,
        task_count=task_count,
        recent_tasks=recent_tasks,
        active_datasets=active_datasets,
    )


def get_dashboard_trends(db: Session, project_id: int | None = None) -> schemas.DashboardTrendsOut:
    from sqlalchemy import cast, Date as SQLDate

    # ── 数据集每日累计趋势 ──
    dataset_q = (
        db.query(
            cast(models.Dataset.created_at, SQLDate).label("date"),
            func.count(models.Dataset.id).label("daily"),
        )
    )
    if project_id is not None:
        dataset_q = dataset_q.filter(models.Dataset.project_id == project_id)
    dataset_rows = dataset_q.group_by("date").order_by("date").all()

    dataset_trends: list[schemas.TrendPoint] = []
    running = 0
    for row in dataset_rows:
        running += row.daily
        dataset_trends.append(
            schemas.TrendPoint(date=str(row.date), count=running)
        )

    # ── 任务每日累计趋势（按完成时间 end_time 统计）──
    task_q = (
        db.query(
            cast(models.DatasetTask.end_time, SQLDate).label("date"),
            func.count(models.DatasetTask.id).label("daily"),
        )
        .filter(models.DatasetTask.end_time.isnot(None))
    )
    if project_id is not None:
        task_q = task_q.filter(models.DatasetTask.project_id == project_id)
    task_rows = task_q.group_by("date").order_by("date").all()

    task_trends: list[schemas.TrendPoint] = []
    running = 0
    for row in task_rows:
        running += row.daily
        task_trends.append(
            schemas.TrendPoint(date=str(row.date), count=running)
        )

    return schemas.DashboardTrendsOut(
        dataset_trends=dataset_trends,
        task_trends=task_trends,
    )
