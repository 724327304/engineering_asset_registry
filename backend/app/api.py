from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .db import get_db
from . import crud, schemas
from .oss_storage import get_oss_storage_report

router = APIRouter()


# ═══════════════ Dataset ═══════════════

@router.post("/datasets", response_model=schemas.DatasetOut, status_code=201)
def create_dataset(data: schemas.DatasetCreate, db: Session = Depends(get_db)):
    return crud.create_dataset(db, data)


@router.get("/datasets", response_model=list[schemas.DatasetOut])
def list_datasets(db: Session = Depends(get_db)):
    return crud.list_datasets(db)


@router.get("/datasets/{dataset_id}", response_model=schemas.DatasetOut)
def get_dataset(dataset_id: int, db: Session = Depends(get_db)):
    obj = crud.get_dataset(db, dataset_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Dataset not found")
    return obj


@router.put("/datasets/{dataset_id}", response_model=schemas.DatasetOut)
def update_dataset(dataset_id: int, data: schemas.DatasetUpdate, db: Session = Depends(get_db)):
    obj = crud.update_dataset(db, dataset_id, data)
    if not obj:
        raise HTTPException(status_code=404, detail="Dataset not found")
    return obj


# ═══════════════ DatasetTask ═══════════════

@router.post("/tasks", response_model=schemas.DatasetTaskOut, status_code=201)
def create_task(data: schemas.DatasetTaskCreate, db: Session = Depends(get_db)):
    try:
        return crud.create_task(db, data)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))


@router.get("/tasks", response_model=list[schemas.DatasetTaskOut])
def list_tasks(db: Session = Depends(get_db)):
    return crud.list_tasks(db)


@router.get("/tasks/{task_id}", response_model=schemas.DatasetTaskOut)
def get_task(task_id: int, db: Session = Depends(get_db)):
    obj = crud.get_task(db, task_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Task not found")
    return obj


@router.put("/tasks/{task_id}", response_model=schemas.DatasetTaskOut)
def update_task(task_id: int, data: schemas.DatasetTaskUpdate, db: Session = Depends(get_db)):
    obj = crud.update_task(db, task_id, data)
    if not obj:
        raise HTTPException(status_code=404, detail="Task not found")
    return obj


@router.get("/datasets/{dataset_id}/tasks", response_model=list[schemas.DatasetTaskOut])
def list_tasks_by_dataset(dataset_id: int, db: Session = Depends(get_db)):
    return crud.list_tasks_by_dataset(db, dataset_id)


# ═══════════════ Dashboard ═══════════════

@router.get("/dashboard", response_model=schemas.DashboardOut)
def dashboard(db: Session = Depends(get_db)):
    return crud.get_dashboard(db)


# ═══════════════ Storage ═══════════════

@router.get("/storage/oss", response_model=schemas.OssStorageOut)
def oss_storage():
    return get_oss_storage_report()
