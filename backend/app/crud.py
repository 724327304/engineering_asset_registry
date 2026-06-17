from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from . import models, schemas


# ── Dataset ═══════════════════════════════════════════════

def create_dataset(db: Session, data: schemas.DatasetCreate) -> models.Dataset:
    obj = models.Dataset(**data.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


def get_dataset(db: Session, dataset_id: int) -> models.Dataset | None:
    return db.query(models.Dataset).filter(models.Dataset.id == dataset_id).first()


def list_datasets(db: Session) -> list[models.Dataset]:
    return db.query(models.Dataset).order_by(models.Dataset.created_at.desc()).all()


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


def list_tasks(db: Session) -> list[models.DatasetTask]:
    return db.query(models.DatasetTask).order_by(models.DatasetTask.created_at.desc()).all()


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


def list_tasks_by_dataset(db: Session, dataset_id: int) -> list[models.DatasetTask]:
    return (
        db.query(models.DatasetTask)
        .filter(
            or_(
                models.DatasetTask.input_dataset_id == dataset_id,
                models.DatasetTask.output_dataset_id == dataset_id,
            )
        )
        .order_by(models.DatasetTask.created_at.desc())
        .all()
    )


# ── Dashboard ═════════════════════════════════════════════

def get_dashboard(db: Session, recent_limit: int = 10) -> schemas.DashboardOut:
    dataset_count = db.query(func.count(models.Dataset.id)).scalar()
    task_count = db.query(func.count(models.DatasetTask.id)).scalar()
    active_datasets = (
        db.query(func.count(models.Dataset.id))
        .filter(models.Dataset.status == "active")
        .scalar()
    )
    recent_tasks = (
        db.query(models.DatasetTask)
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
