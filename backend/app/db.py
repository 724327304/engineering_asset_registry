import os
import logging
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker, declarative_base

logger = logging.getLogger(__name__)

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:postgres@127.0.0.1:5432/engineering_asset_registry",
)

engine_kwargs = {"echo": False}
if DATABASE_URL.startswith("sqlite"):
    engine_kwargs["connect_args"] = {"check_same_thread": False}

engine = create_engine(DATABASE_URL, **engine_kwargs)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)

Base = declarative_base()


def _run_migrations():
    """为已有表补齐新增字段（兼容旧 SQLite 数据库）"""
    inspector = inspect(engine)
    # dataset 表新增 size_unit
    dataset_cols = {c["name"] for c in inspector.get_columns("dataset")}
    if "size_unit" not in dataset_cols:
        logger.info("Migrating: adding column dataset.size_unit")
        with engine.connect() as conn:
            col_type = "VARCHAR(10)" if "postgresql" in DATABASE_URL else "VARCHAR(10)"
            conn.execute(text(f"ALTER TABLE dataset ADD COLUMN size_unit {col_type} DEFAULT 'B'"))
            conn.commit()
    # dataset_task 表新增 duration_unit
    task_cols = {c["name"] for c in inspector.get_columns("dataset_task")}
    if "duration_unit" not in task_cols:
        logger.info("Migrating: adding column dataset_task.duration_unit")
        with engine.connect() as conn:
            col_type = "VARCHAR(10)" if "postgresql" in DATABASE_URL else "VARCHAR(10)"
            conn.execute(text(f"ALTER TABLE dataset_task ADD COLUMN duration_unit {col_type} DEFAULT 'seconds'"))
            conn.commit()
    if "size_unit" not in task_cols:
        logger.info("Migrating: adding column dataset_task.size_unit")
        with engine.connect() as conn:
            col_type = "VARCHAR(10)" if "postgresql" in DATABASE_URL else "VARCHAR(10)"
            conn.execute(text(f"ALTER TABLE dataset_task ADD COLUMN size_unit {col_type} DEFAULT 'B'"))
            conn.commit()


def get_db():
    """FastAPI 依赖注入：每个请求获取一个独立 session，结束后关闭"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
