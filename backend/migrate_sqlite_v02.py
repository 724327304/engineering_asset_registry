from __future__ import annotations

import shutil
import sqlite3
from datetime import datetime
from pathlib import Path


DB_PATH = Path(__file__).with_name("asset_registry.db")


def columns(conn: sqlite3.Connection, table: str) -> set[str]:
    return {row[1] for row in conn.execute(f"PRAGMA table_info({table})")}


def table_exists(conn: sqlite3.Connection, table: str) -> bool:
    row = conn.execute(
        "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?",
        (table,),
    ).fetchone()
    return row is not None


def main() -> None:
    if not DB_PATH.exists():
        raise SystemExit(f"Database not found: {DB_PATH}")

    backup_path = DB_PATH.with_suffix(
        f".db.bak-v02-{datetime.now().strftime('%Y%m%d%H%M%S')}"
    )
    shutil.copy2(DB_PATH, backup_path)
    print(f"Backup created: {backup_path}")

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row

    try:
        conn.execute("PRAGMA foreign_keys = OFF")
        conn.execute("BEGIN")

        dataset_cols = columns(conn, "dataset") if table_exists(conn, "dataset") else set()
        task_cols = columns(conn, "dataset_task") if table_exists(conn, "dataset_task") else set()

        if dataset_cols and not {"dataset_type"}.issubset(dataset_cols):
            conn.execute("ALTER TABLE dataset RENAME TO dataset_old")

        if task_cols and not {"input_dataset_id", "output_dataset_id"}.issubset(task_cols):
            conn.execute("ALTER TABLE dataset_task RENAME TO dataset_task_old")

        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS dataset (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name VARCHAR(255) NOT NULL,
                description TEXT DEFAULT '',
                source VARCHAR(50) NOT NULL DEFAULT 'task_produced',
                dataset_type VARCHAR(50) NOT NULL DEFAULT 'table',
                location_path VARCHAR(1024) NOT NULL,
                data_size BIGINT DEFAULT 0,
                record_count BIGINT DEFAULT 0,
                owner VARCHAR(128) NOT NULL,
                status VARCHAR(20) NOT NULL DEFAULT 'active',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
            """
        )

        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS dataset_task (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                input_dataset_id INTEGER NOT NULL,
                output_dataset_id INTEGER NOT NULL,
                task_name VARCHAR(255) NOT NULL,
                task_type VARCHAR(50) NOT NULL,
                size_before BIGINT DEFAULT 0,
                size_after BIGINT DEFAULT 0,
                record_before BIGINT DEFAULT 0,
                record_after BIGINT DEFAULT 0,
                duration_seconds NUMERIC(12, 2) DEFAULT 0,
                status VARCHAR(20) NOT NULL DEFAULT 'success',
                executor VARCHAR(128) DEFAULT '',
                code_version VARCHAR(128) DEFAULT '',
                config JSON DEFAULT '{}',
                start_time DATETIME,
                end_time DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(input_dataset_id) REFERENCES dataset(id) ON DELETE CASCADE,
                FOREIGN KEY(output_dataset_id) REFERENCES dataset(id) ON DELETE CASCADE
            )
            """
        )

        if table_exists(conn, "dataset_old"):
            conn.execute(
                """
                INSERT INTO dataset (
                    id, name, description, source, dataset_type, location_path,
                    data_size, record_count, owner, status, created_at, updated_at
                )
                SELECT
                    id,
                    name,
                    COALESCE(description, ''),
                    CASE WHEN source IN ('export', 'task_produced') THEN source ELSE 'task_produced' END,
                    'table',
                    location_path,
                    COALESCE(data_size, 0),
                    COALESCE(record_count, 0),
                    owner,
                    CASE
                        WHEN status IN ('active', '留存') THEN 'active'
                        WHEN status IN ('deleted', '已删除') THEN 'deleted'
                        ELSE 'active'
                    END,
                    created_at,
                    updated_at
                FROM dataset_old
                """
            )
            conn.execute("DROP TABLE dataset_old")

        if table_exists(conn, "dataset_task_old"):
            conn.execute(
                """
                INSERT INTO dataset_task (
                    id, input_dataset_id, output_dataset_id, task_name, task_type,
                    size_before, size_after, record_before, record_after,
                    duration_seconds, status, executor, code_version, config,
                    start_time, end_time, created_at
                )
                SELECT
                    id,
                    dataset_id,
                    dataset_id,
                    task_name,
                    CASE
                        WHEN task_type = '去重'
                            THEN '模糊去重'
                        WHEN task_type IN ('质量过滤', '模型过滤', '模糊去重', '精确去重', '清洗', '合并', '导出', '同步', '其他')
                            THEN task_type
                        ELSE '其他'
                    END,
                    CAST(COALESCE(size_before, 0) AS INTEGER),
                    CAST(COALESCE(size_after, 0) AS INTEGER),
                    COALESCE(record_before, 0),
                    COALESCE(record_after, 0),
                    COALESCE(duration_seconds, 0),
                    CASE
                        WHEN status IN ('success', 'failed', 'running') THEN status
                        ELSE 'success'
                    END,
                    COALESCE(executor, ''),
                    COALESCE(code_version, ''),
                    COALESCE(config, '{}'),
                    start_time,
                    end_time,
                    created_at
                FROM dataset_task_old
                WHERE dataset_id IN (SELECT id FROM dataset)
                """
            )
            conn.execute("DROP TABLE dataset_task_old")

        conn.execute("CREATE INDEX IF NOT EXISTS idx_dataset_name ON dataset(name)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_dataset_owner ON dataset(owner)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_dataset_source ON dataset(source)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_dataset_status ON dataset(status)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_dataset_type ON dataset(dataset_type)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_task_input_dataset ON dataset_task(input_dataset_id)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_task_output_dataset ON dataset_task(output_dataset_id)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_task_status ON dataset_task(status)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_task_type ON dataset_task(task_type)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_task_executor ON dataset_task(executor)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_task_start_time ON dataset_task(start_time)")

        conn.commit()
        conn.execute("PRAGMA foreign_keys = ON")

        dataset_count = conn.execute("SELECT COUNT(*) FROM dataset").fetchone()[0]
        task_count = conn.execute("SELECT COUNT(*) FROM dataset_task").fetchone()[0]
        print(f"Migration complete: {dataset_count} datasets, {task_count} tasks")
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


if __name__ == "__main__":
    main()
