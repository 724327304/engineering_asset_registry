from pydantic import BaseModel, Field
from typing import Optional, Any
from datetime import datetime


# ── Project ────────────────────────────────────────────────

class ProjectCreate(BaseModel):
    """创建项目的请求体"""
    name: str = Field(..., max_length=255, description="项目名称（唯一），最长 255 字符")
    description: Optional[str] = Field("", description="项目描述，可选")
    owner: str = Field(..., max_length=128, description="项目负责人账号或姓名")
    status: str = Field(default="active", pattern="^(active|archived)$",
                        description="项目状态：active-活跃，archived-已归档")


class ProjectUpdate(BaseModel):
    """更新项目的请求体（所有字段可选）"""
    name: Optional[str] = Field(None, max_length=255, description="项目名称（唯一）")
    description: Optional[str] = Field(None, description="项目描述")
    owner: Optional[str] = Field(None, max_length=128, description="项目负责人")
    status: Optional[str] = Field(None, pattern="^(active|archived)$",
                                  description="项目状态：active/archived")


class ProjectOut(BaseModel):
    """项目完整信息（响应体）"""
    id: int = Field(..., description="项目唯一标识 ID")
    name: str = Field(..., description="项目名称")
    description: Optional[str] = Field(None, description="项目描述")
    owner: str = Field(..., description="项目负责人")
    status: str = Field(..., description="项目状态")
    dataset_count: Optional[int] = Field(None, description="该项目下的数据集数量")
    task_count: Optional[int] = Field(None, description="该项目下的任务数量")
    created_at: datetime = Field(..., description="创建时间（ISO 8601）")
    updated_at: datetime = Field(..., description="最后更新时间（ISO 8601）")

    model_config = {"from_attributes": True}


# ── Dataset ────────────────────────────────────────────────

class DatasetCreate(BaseModel):
    """创建数据集的请求体"""
    name: str = Field(..., max_length=255, description="数据集名称，最长 255 字符，例如：质量过滤-去重结果-v1")
    description: Optional[str] = Field("", description="数据集的补充说明，可选")
    source: str = Field(default="task_produced", pattern="^(export|task_produced)$",
                        description="数据来源：export-外部导出，task_produced-任务产出")
    dataset_type: str = Field(default="table", pattern="^(table|image|text|feature|label|trainset|testset|result|other)$",
                              description="数据类型：table/image/text/feature/label/trainset/testset/result/other")
    location_path: str = Field(..., max_length=1024,
                               description="OSS 存储路径，例如：oss://bucket/path/to/data/")
    data_size: float = Field(0.0, description="数据大小（数值），默认为 0")
    size_unit: Optional[str] = Field("B", description="数据大小单位，如 B/KB/MB/GB/TB，默认 B")
    record_count: int = Field(0, description="记录/文件/行数，默认 0")
    owner: str = Field(..., max_length=128, description="负责人账号或姓名")
    project_id: Optional[int] = Field(None, description="所属项目 ID（可选）")
    status: str = Field(default="active", pattern="^(active|deleted)$",
                        description="状态：active-活跃，deleted-已删除")


class DatasetUpdate(BaseModel):
    """更新数据集的请求体（所有字段可选，只传需要修改的字段）"""
    name: Optional[str] = Field(None, max_length=255, description="数据集名称，最长 255 字符")
    description: Optional[str] = Field(None, description="数据集的补充说明")
    source: Optional[str] = Field(None, pattern="^(export|task_produced)$",
                                  description="数据来源：export-外部导出，task_produced-任务产出")
    dataset_type: Optional[str] = Field(None, pattern="^(table|image|text|feature|label|trainset|testset|result|other)$",
                                        description="数据类型：table/image/text/feature/label/trainset/testset/result/other")
    location_path: Optional[str] = Field(None, max_length=1024, description="OSS 存储路径")
    data_size: Optional[float] = Field(None, description="数据大小（数值）")
    size_unit: Optional[str] = Field(None, description="数据大小单位，如 B/KB/MB/GB/TB")
    record_count: Optional[int] = Field(None, description="记录/文件/行数")
    owner: Optional[str] = Field(None, max_length=128, description="负责人账号或姓名")
    project_id: Optional[int] = Field(None, description="所属项目 ID（可选）")
    status: Optional[str] = Field(None, pattern="^(active|deleted)$",
                                  description="状态：active-活跃，deleted-已删除")


class DatasetOut(BaseModel):
    """数据集完整信息（响应体）"""
    id: int = Field(..., description="数据集唯一标识 ID")
    name: str = Field(..., description="数据集名称")
    description: Optional[str] = Field(None, description="数据集补充说明")
    source: str = Field(..., description="数据来源：export/task_produced")
    dataset_type: str = Field(..., description="数据类型")
    location_path: str = Field(..., description="OSS 存储路径")
    data_size: float = Field(..., description="数据大小（数值）")
    size_unit: Optional[str] = Field(None, description="数据大小单位")
    record_count: int = Field(..., description="记录/文件/行数")
    owner: str = Field(..., description="负责人")
    project_id: Optional[int] = Field(None, description="所属项目 ID")
    status: str = Field(..., description="状态")
    created_at: datetime = Field(..., description="创建时间（ISO 8601）")
    updated_at: datetime = Field(..., description="最后更新时间（ISO 8601）")

    model_config = {"from_attributes": True}


# ── DatasetTask ────────────────────────────────────────────

class DatasetTaskCreate(BaseModel):
    """创建数据处理任务的请求体"""
    input_dataset_id: int = Field(..., description="输入数据集 ID（该任务待处理的数据）")
    output_dataset_id: int = Field(..., description="输出数据集 ID（该任务产出的数据）")
    task_name: str = Field(..., max_length=255, description="任务名称，最长 255 字符")
    task_type: str = Field(...,
                           pattern="^(质量过滤|模型过滤|模糊去重|精确去重|数据解析|数据抽取|清洗|合并|导出|同步|其他)$",
                           description="任务类型：质量过滤/模型过滤/模糊去重/精确去重/数据解析/数据抽取/清洗/合并/导出/同步/其他")
    size_before: float = Field(0.0, description="处理前数据大小（数值），默认 0")
    size_unit: Optional[str] = Field("B", description="处理前数据大小单位，默认 B")
    size_after: float = Field(0.0, description="处理后数据大小（数值），默认 0")
    size_after_unit: Optional[str] = Field("B", description="处理后数据大小单位，默认 B")
    record_before: int = Field(0, description="处理前记录数，默认 0")
    record_after: int = Field(0, description="处理后记录数，默认 0")
    duration_seconds: float = Field(0, description="任务执行耗时（秒），默认 0")
    duration_unit: Optional[str] = Field("seconds", description="耗时单位，默认 seconds")
    status: str = Field(default="success", pattern="^(success|failed|running)$",
                        description="任务状态：success-成功，failed-失败，running-运行中")
    executor: Optional[str] = Field("", description="执行人/执行系统")
    code_version: Optional[str] = Field("", description="代码版本号")
    config: Optional[Any] = Field(None, description="任务配置参数（JSON 对象）")
    project_id: Optional[int] = Field(None, description="所属项目 ID（可选）")
    start_time: Optional[datetime] = Field(None, description="任务开始时间（ISO 8601）")
    end_time: Optional[datetime] = Field(None, description="任务结束时间（ISO 8601）")


class DatasetTaskUpdate(BaseModel):
    """更新任务的请求体（所有字段可选）"""
    input_dataset_id: Optional[int] = Field(None, description="输入数据集 ID")
    output_dataset_id: Optional[int] = Field(None, description="输出数据集 ID")
    task_name: Optional[str] = Field(None, max_length=255, description="任务名称")
    task_type: Optional[str] = Field(None,
                                     pattern="^(质量过滤|模型过滤|模糊去重|精确去重|数据解析|数据抽取|清洗|合并|导出|同步|其他)$",
                                     description="任务类型")
    size_before: Optional[float] = Field(None, description="处理前数据大小")
    size_unit: Optional[str] = Field(None, description="处理前数据大小单位")
    size_after: Optional[float] = Field(None, description="处理后数据大小")
    size_after_unit: Optional[str] = Field(None, description="处理后数据大小单位")
    record_before: Optional[int] = Field(None, description="处理前记录数")
    record_after: Optional[int] = Field(None, description="处理后记录数")
    duration_seconds: Optional[float] = Field(None, description="任务执行耗时（秒）")
    duration_unit: Optional[str] = Field(None, description="耗时单位")
    status: Optional[str] = Field(None, pattern="^(success|failed|running)$",
                                  description="任务状态：success/failed/running")
    executor: Optional[str] = Field(None, max_length=128, description="执行人/执行系统")
    code_version: Optional[str] = Field(None, max_length=128, description="代码版本号")
    config: Optional[Any] = Field(None, description="任务配置参数（JSON 对象）")
    project_id: Optional[int] = Field(None, description="所属项目 ID（可选）")
    start_time: Optional[datetime] = Field(None, description="任务开始时间（ISO 8601）")
    end_time: Optional[datetime] = Field(None, description="任务结束时间（ISO 8601）")


class DatasetTaskOut(BaseModel):
    """数据处理任务完整信息（响应体）"""
    id: int = Field(..., description="任务唯一标识 ID")
    input_dataset_id: int = Field(..., description="输入数据集 ID")
    output_dataset_id: int = Field(..., description="输出数据集 ID")
    task_name: str = Field(..., description="任务名称")
    task_type: str = Field(..., description="任务类型")
    size_before: float = Field(..., description="处理前数据大小")
    size_unit: Optional[str] = Field(None, description="处理前数据大小单位")
    size_after: float = Field(..., description="处理后数据大小")
    size_after_unit: Optional[str] = Field(None, description="处理后数据大小单位")
    record_before: int = Field(..., description="处理前记录数")
    record_after: int = Field(..., description="处理后记录数")
    duration_seconds: float = Field(..., description="任务执行耗时（秒）")
    duration_unit: Optional[str] = Field(None, description="耗时单位")
    status: str = Field(..., description="任务状态：success/failed/running")
    executor: Optional[str] = Field(None, description="执行人")
    code_version: Optional[str] = Field(None, description="代码版本号")
    config: Optional[Any] = Field(None, description="任务配置参数（JSON 对象）")
    project_id: Optional[int] = Field(None, description="所属项目 ID")
    start_time: Optional[datetime] = Field(None, description="任务开始时间（ISO 8601）")
    end_time: Optional[datetime] = Field(None, description="任务结束时间（ISO 8601）")
    created_at: datetime = Field(..., description="记录创建时间（ISO 8601）")

    model_config = {"from_attributes": True}


# ── Dashboard ──────────────────────────────────────────────

class DashboardOut(BaseModel):
    """仪表盘概览数据（响应体）"""
    dataset_count: int = Field(..., description="数据集总数")
    task_count: int = Field(..., description="任务总数")
    recent_tasks: list[DatasetTaskOut] = Field(..., description="最近 10 条任务记录")
    active_datasets: int = Field(..., description="活跃数据集数（状态为 active 的数据集）")


class TrendPoint(BaseModel):
    """趋势数据点"""
    date: str = Field(..., description="日期，格式 YYYY-MM-DD")
    count: int = Field(..., description="截至该日期的累计数量")


class DashboardTrendsOut(BaseModel):
    """趋势数据（响应体）"""
    dataset_trends: list[TrendPoint] = Field(..., description="数据集每日累计变化趋势")
    task_trends: list[TrendPoint] = Field(..., description="任务每日累计变化趋势")


# ── OSS Storage ────────────────────────────────────────────

class OssBucketUsageOut(BaseModel):
    """OSS Bucket 用量信息（响应体）"""
    name: str = Field(..., description="Bucket 名称")
    limit_tb: float = Field(..., description="总容量限制（TB）")
    limit_bytes: int = Field(..., description="总容量限制（字节）")
    used_bytes: int = Field(..., description="已用容量（字节）")
    remaining_bytes: int = Field(..., description="剩余容量（字节）")
    usage_percent: float = Field(..., description="使用百分比（0-100）")
    object_count: int = Field(..., description="存储对象数")
    multipart_uploads: int = Field(..., description="分片上传数")
    error: Optional[str] = Field(None, description="查询该 bucket 时的错误信息，正常时为 null")


class OssStorageOut(BaseModel):
    """OSS 存储空间报告（响应体）"""
    generated_at: str = Field(..., description="报告生成时间（ISO 8601）")
    endpoint: str = Field(..., description="OSS 端点地址")
    configured: bool = Field(..., description="OSS 是否已配置（false 表示缺少环境变量）")
    total_limit_bytes: int = Field(..., description="所有 bucket 总容量限制（字节）")
    total_used_bytes: int = Field(..., description="所有 bucket 已用总容量（字节）")
    total_remaining_bytes: int = Field(..., description="所有 bucket 剩余总容量（字节）")
    buckets: list[OssBucketUsageOut] = Field(..., description="各 bucket 用量明细")


# ── OSS Tools ─────────────────────────────────────────────

class OssToolsRequest(BaseModel):
    """OSS 工具箱请求体"""
    oss_path: str = Field(..., description="OSS 目录路径，格式：oss://bucket-name/prefix/")
    sample_size: Optional[int] = Field(None, description="抽样数量（100/1000/10000），仅抽样接口使用")


class OssListFilesOut(BaseModel):
    """OSS 文件列表响应"""
    oss_path: str = Field(..., description="请求的 OSS 路径")
    bucket: str = Field(..., description="Bucket 名称")
    prefix: str = Field(..., description="目录前缀")
    total_files: int = Field(..., description="目录下文件总数")
    top_files: list[str] = Field(..., description="前 10 条文件名称")
    generated_at: str = Field(..., description="查询时间（ISO 8601）")


class OssSampleOut(BaseModel):
    """OSS 随机抽样响应（返回内容行）"""
    oss_path: str = Field(..., description="请求的 OSS 路径")
    bucket: str = Field(..., description="Bucket 名称")
    prefix: str = Field(..., description="目录前缀")
    sample_size: int = Field(..., description="实际抽样行数")
    total_files: int = Field(..., description="目录下符合条件文件总数")
    sample_lines: list[str] = Field(..., description="抽中的行内容列表")
    errors: list[str] = Field(..., description="抽样过程中的错误信息列表")
    generated_at: str = Field(..., description="查询时间（ISO 8601）")
