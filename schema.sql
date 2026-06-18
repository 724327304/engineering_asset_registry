-- ============================================================================
-- Engineering Asset Registry V0.2
-- PostgreSQL Schema
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. dataset
-- 数据资产表
-- ============================================================================

CREATE TABLE IF NOT EXISTS dataset (
    id                BIGSERIAL PRIMARY KEY,

    name              VARCHAR(255) NOT NULL,
    description       TEXT DEFAULT '',

    source            VARCHAR(50) NOT NULL DEFAULT 'task_produced',

    dataset_type      VARCHAR(50) NOT NULL DEFAULT 'table',

    location_path     VARCHAR(1024) NOT NULL,

    data_size         NUMERIC(12,2) DEFAULT 0,
    size_unit         VARCHAR(10) NOT NULL DEFAULT 'B',
    record_count      BIGINT DEFAULT 0,

    owner             VARCHAR(128) NOT NULL,

    status            VARCHAR(20) NOT NULL DEFAULT 'active',

    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT chk_dataset_source
        CHECK (
            source IN (
                'export',
                'task_produced'
            )
        ),

    CONSTRAINT chk_dataset_type
        CHECK (
            dataset_type IN (
                'table',
                'image',
                'text',
                'feature',
                'label',
                'trainset',
                'testset',
                'result',
                'other'
            )
        ),

    CONSTRAINT chk_dataset_status
        CHECK (
            status IN (
                'active',
                'deleted'
            )
        ),

    CONSTRAINT chk_dataset_size
        CHECK (data_size >= 0),

    CONSTRAINT chk_dataset_record_count
        CHECK (record_count >= 0)
);

COMMENT ON TABLE dataset IS
'数据资产表';

COMMENT ON COLUMN dataset.id IS
'数据集ID';

COMMENT ON COLUMN dataset.name IS
'数据集名称';

COMMENT ON COLUMN dataset.description IS
'数据说明';

COMMENT ON COLUMN dataset.source IS
'来源：export / task_produced';

COMMENT ON COLUMN dataset.dataset_type IS
'数据集类型';

COMMENT ON COLUMN dataset.location_path IS
'存储路径';

COMMENT ON COLUMN dataset.data_size IS
'当前数据大小（配合 size_unit 使用，可保留小数）';

COMMENT ON COLUMN dataset.size_unit IS
'数据大小单位：B/KB/MB/GB/TB';

COMMENT ON COLUMN dataset.record_count IS
'当前记录数';

COMMENT ON COLUMN dataset.owner IS
'负责人';

COMMENT ON COLUMN dataset.status IS
'状态';

COMMENT ON COLUMN dataset.created_at IS
'创建时间';

COMMENT ON COLUMN dataset.updated_at IS
'更新时间';

CREATE INDEX idx_dataset_name
ON dataset(name);

CREATE INDEX idx_dataset_owner
ON dataset(owner);

CREATE INDEX idx_dataset_source
ON dataset(source);

CREATE INDEX idx_dataset_status
ON dataset(status);

CREATE INDEX idx_dataset_type
ON dataset(dataset_type);

-- ============================================================================
-- 2. dataset_task
-- 数据处理任务表
-- ============================================================================

CREATE TABLE IF NOT EXISTS dataset_task (
    id                    BIGSERIAL PRIMARY KEY,

    input_dataset_id      BIGINT NOT NULL,

    output_dataset_id     BIGINT NOT NULL,

    task_name             VARCHAR(255) NOT NULL,

    task_type             VARCHAR(50) NOT NULL,

    size_before           NUMERIC(12,2) DEFAULT 0,
    size_unit             VARCHAR(10) NOT NULL DEFAULT 'B',

    size_after            NUMERIC(12,2) DEFAULT 0,

    record_before         BIGINT DEFAULT 0,

    record_after          BIGINT DEFAULT 0,

    duration_seconds      NUMERIC(12,2) DEFAULT 0,
    duration_unit         VARCHAR(10) NOT NULL DEFAULT 'seconds',

    status                VARCHAR(20) NOT NULL DEFAULT 'success',

    executor              VARCHAR(128) DEFAULT '',

    code_version          VARCHAR(128) DEFAULT '',

    config                JSONB DEFAULT '{}'::jsonb,

    start_time            TIMESTAMPTZ,

    end_time              TIMESTAMPTZ,

    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT fk_task_input_dataset
        FOREIGN KEY (input_dataset_id)
        REFERENCES dataset(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_task_output_dataset
        FOREIGN KEY (output_dataset_id)
        REFERENCES dataset(id)
        ON DELETE CASCADE,

    CONSTRAINT chk_task_type
        CHECK (
            task_type IN (
                '质量过滤',
                '模型过滤',
                '模糊去重',
                '精确去重',
                '数据解析',
                '数据抽取',
                '清洗',
                '合并',
                '导出',
                '同步',
                '其他'
            )
        ),

    CONSTRAINT chk_task_status
        CHECK (
            status IN (
                'success',
                'failed',
                'running'
            )
        ),

    CONSTRAINT chk_size_before
        CHECK (size_before >= 0),

    CONSTRAINT chk_size_after
        CHECK (size_after >= 0),

    CONSTRAINT chk_record_before
        CHECK (record_before >= 0),

    CONSTRAINT chk_record_after
        CHECK (record_after >= 0),

    CONSTRAINT chk_duration
        CHECK (duration_seconds >= 0),

    CONSTRAINT chk_task_time_order
        CHECK (
            start_time IS NULL
            OR end_time IS NULL
            OR start_time <= end_time
        )
);

COMMENT ON TABLE dataset_task IS
'数据处理任务表';

COMMENT ON COLUMN dataset_task.input_dataset_id IS
'输入数据集';

COMMENT ON COLUMN dataset_task.output_dataset_id IS
'输出数据集';

COMMENT ON COLUMN dataset_task.task_name IS
'任务名称';

COMMENT ON COLUMN dataset_task.task_type IS
'任务类型';

COMMENT ON COLUMN dataset_task.size_before IS
'处理前大小';

COMMENT ON COLUMN dataset_task.size_unit IS
'数据大小单位：B/KB/MB/GB/TB';

COMMENT ON COLUMN dataset_task.size_after IS
'处理后大小';

COMMENT ON COLUMN dataset_task.record_before IS
'处理前记录数';

COMMENT ON COLUMN dataset_task.record_after IS
'处理后记录数';

COMMENT ON COLUMN dataset_task.duration_seconds IS
'任务耗时（秒）';

COMMENT ON COLUMN dataset_task.duration_unit IS
'耗时单位：seconds/minutes/hours/days';

COMMENT ON COLUMN dataset_task.status IS
'任务状态';

COMMENT ON COLUMN dataset_task.executor IS
'执行人';

COMMENT ON COLUMN dataset_task.code_version IS
'代码版本';

COMMENT ON COLUMN dataset_task.config IS
'运行配置';

COMMENT ON COLUMN dataset_task.start_time IS
'开始时间';

COMMENT ON COLUMN dataset_task.end_time IS
'结束时间';

CREATE INDEX idx_task_input_dataset
ON dataset_task(input_dataset_id);

CREATE INDEX idx_task_output_dataset
ON dataset_task(output_dataset_id);

CREATE INDEX idx_task_status
ON dataset_task(status);

CREATE INDEX idx_task_type
ON dataset_task(task_type);

CREATE INDEX idx_task_executor
ON dataset_task(executor);

CREATE INDEX idx_task_start_time
ON dataset_task(start_time);

-- ============================================================================
-- 3. dataset.updated_at 自动更新时间
-- ============================================================================

CREATE OR REPLACE FUNCTION update_dataset_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_dataset_updated_at
ON dataset;

CREATE TRIGGER trg_dataset_updated_at
BEFORE UPDATE
ON dataset
FOR EACH ROW
EXECUTE FUNCTION update_dataset_updated_at();

-- ============================================================================
-- 4. 示例数据
-- ============================================================================

-- 原始数据

INSERT INTO dataset (
    name,
    description,
    source,
    dataset_type,
    location_path,
    data_size,
    record_count,
    owner
)
VALUES (
    'domain_dataset_v1',
    '原始域名数据',
    'export',
    'table',
    'oss://bucket/domain/v1.parquet',
    1073741824,
    1000000,
    '张三'
);

-- 去重后数据

INSERT INTO dataset (
    name,
    description,
    source,
    dataset_type,
    location_path,
    data_size,
    record_count,
    owner
)
VALUES (
    'domain_dataset_v2',
    '去重后域名数据',
    'task_produced',
    'table',
    'oss://bucket/domain/v2.parquet',
    536870912,
    500000,
    '张三'
);

INSERT INTO dataset_task (
    input_dataset_id,
    output_dataset_id,
    task_name,
    task_type,
    size_before,
    size_after,
    record_before,
    record_after,
    duration_seconds,
    status,
    executor,
    code_version,
    config,
    start_time,
    end_time
)
VALUES (
    1,
    2,
    '域名去重任务',
    '模糊去重',
    1073741824,
    536870912,
    1000000,
    500000,
    120.5,
    'success',
    '张三',
    'abc1234',
    '{"method":"minhash","threshold":0.8}',
    now() - interval '2 hours',
    now()
);

COMMIT;
