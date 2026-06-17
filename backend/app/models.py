from datetime import datetime

from sqlalchemy import Column, BigInteger, Integer, String, Text, DateTime, Numeric, ForeignKey, JSON
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from .db import Base

ID_TYPE = BigInteger().with_variant(Integer, "sqlite")
JSON_TYPE = JSON().with_variant(JSONB, "postgresql")


class Dataset(Base):
    """数据资产表 — 与 schema.sql 中 dataset 表完全对应"""

    __tablename__ = "dataset"

    id            = Column(ID_TYPE, primary_key=True, autoincrement=True, index=True)
    name          = Column(String(255), nullable=False)
    description   = Column(Text, default="")
    source        = Column(String(50), nullable=False, default="task_produced")
    dataset_type  = Column(String(50), nullable=False, default="table")
    location_path = Column(String(1024), nullable=False)
    data_size     = Column(BigInteger, default=0)
    size_unit     = Column(String(10), default="B")
    record_count  = Column(BigInteger, default=0)
    owner         = Column(String(128), nullable=False)
    status        = Column(String(20), nullable=False, default="active")
    created_at    = Column(DateTime, default=datetime.now)
    updated_at    = Column(DateTime, default=datetime.now, onupdate=datetime.now)

    input_tasks = relationship(
        "DatasetTask",
        foreign_keys="DatasetTask.input_dataset_id",
        back_populates="input_dataset",
        passive_deletes=True,
    )
    output_tasks = relationship(
        "DatasetTask",
        foreign_keys="DatasetTask.output_dataset_id",
        back_populates="output_dataset",
        passive_deletes=True,
    )


class DatasetTask(Base):
    """任务记录表 — 与 schema.sql 中 dataset_task 表完全对应"""

    __tablename__ = "dataset_task"

    id               = Column(ID_TYPE, primary_key=True, autoincrement=True, index=True)
    input_dataset_id = Column(ID_TYPE, ForeignKey("dataset.id", ondelete="CASCADE"), nullable=False)
    output_dataset_id = Column(ID_TYPE, ForeignKey("dataset.id", ondelete="CASCADE"), nullable=False)
    task_name        = Column(String(255), nullable=False)
    task_type        = Column(String(50), nullable=False)
    size_before      = Column(BigInteger, default=0)
    size_unit        = Column(String(10), default="B")
    size_after       = Column(BigInteger, default=0)
    size_after_unit  = Column(String(10), default="B")
    record_before    = Column(BigInteger, default=0)
    record_after     = Column(BigInteger, default=0)
    duration_seconds = Column(Numeric(12, 2), default=0)
    duration_unit    = Column(String(10), default="seconds")
    status           = Column(String(20), nullable=False, default="success")
    executor         = Column(String(128), default="")
    code_version     = Column(String(128), default="")
    config           = Column(JSON_TYPE, default=dict)
    start_time       = Column(DateTime(timezone=True))
    end_time         = Column(DateTime(timezone=True))
    created_at       = Column(DateTime, default=datetime.now)

    input_dataset = relationship(
        "Dataset",
        foreign_keys=[input_dataset_id],
        back_populates="input_tasks",
    )
    output_dataset = relationship(
        "Dataset",
        foreign_keys=[output_dataset_id],
        back_populates="output_tasks",
    )
