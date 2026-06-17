from pydantic import BaseModel, Field
from typing import Optional, Any
from datetime import datetime


# ── Dataset ────────────────────────────────────────────────

class DatasetCreate(BaseModel):
    name: str = Field(..., max_length=255)
    description: Optional[str] = ""
    source: str = Field(default="task_produced", pattern="^(export|task_produced)$")
    dataset_type: str = Field(default="table", pattern="^(table|image|text|feature|label|trainset|testset|result|other)$")
    location_path: str = Field(..., max_length=1024)
    data_size: int = 0
    size_unit: Optional[str] = "B"
    record_count: int = 0
    owner: str = Field(..., max_length=128)
    status: str = Field(default="active", pattern="^(active|deleted)$")


class DatasetUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=255)
    description: Optional[str] = None
    source: Optional[str] = Field(None, pattern="^(export|task_produced)$")
    dataset_type: Optional[str] = Field(None, pattern="^(table|image|text|feature|label|trainset|testset|result|other)$")
    location_path: Optional[str] = Field(None, max_length=1024)
    data_size: Optional[int] = None
    size_unit: Optional[str] = None
    record_count: Optional[int] = None
    owner: Optional[str] = Field(None, max_length=128)
    status: Optional[str] = Field(None, pattern="^(active|deleted)$")


class DatasetOut(BaseModel):
    id: int
    name: str
    description: Optional[str]
    source: str
    dataset_type: str
    location_path: str
    data_size: int
    size_unit: Optional[str]
    record_count: int
    owner: str
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ── DatasetTask ────────────────────────────────────────────

class DatasetTaskCreate(BaseModel):
    input_dataset_id: int
    output_dataset_id: int
    task_name: str = Field(..., max_length=255)
    task_type: str = Field(..., pattern="^(质量过滤|模型过滤|去重|清洗|特征构建|合并|导出|同步|其他)$")
    size_before: int = 0
    size_unit: Optional[str] = "B"
    size_after: int = 0
    size_after_unit: Optional[str] = "B"
    record_before: int = 0
    record_after: int = 0
    duration_seconds: float = 0
    duration_unit: Optional[str] = "seconds"
    status: str = Field(default="success", pattern="^(success|failed|running)$")
    executor: Optional[str] = ""
    code_version: Optional[str] = ""
    config: Optional[Any] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None


class DatasetTaskUpdate(BaseModel):
    input_dataset_id: Optional[int] = None
    output_dataset_id: Optional[int] = None
    task_name: Optional[str] = Field(None, max_length=255)
    task_type: Optional[str] = Field(None, pattern="^(质量过滤|模型过滤|去重|清洗|特征构建|合并|导出|同步|其他)$")
    size_before: Optional[int] = None
    size_unit: Optional[str] = None
    size_after: Optional[int] = None
    size_after_unit: Optional[str] = None
    record_before: Optional[int] = None
    record_after: Optional[int] = None
    duration_seconds: Optional[float] = None
    duration_unit: Optional[str] = None
    status: Optional[str] = Field(None, pattern="^(success|failed|running)$")
    executor: Optional[str] = Field(None, max_length=128)
    code_version: Optional[str] = Field(None, max_length=128)
    config: Optional[Any] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None


class DatasetTaskOut(BaseModel):
    id: int
    input_dataset_id: int
    output_dataset_id: int
    task_name: str
    task_type: str
    size_before: int
    size_unit: Optional[str]
    size_after: int
    size_after_unit: Optional[str]
    record_before: int
    record_after: int
    duration_seconds: float
    duration_unit: Optional[str]
    status: str
    executor: Optional[str]
    code_version: Optional[str]
    config: Optional[Any]
    start_time: Optional[datetime]
    end_time: Optional[datetime]
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Dashboard ──────────────────────────────────────────────

class DashboardOut(BaseModel):
    dataset_count: int
    task_count: int
    recent_tasks: list[DatasetTaskOut]
    active_datasets: int
