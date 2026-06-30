"""
ClickHouse 客户端 — 单次 UNION ALL 查询抽样

Step 1: OSS API list_objects 列第一层文件
Step 2: Python random.sample 选文件
Step 3: 构建单条 UNION ALL SQL，ClickHouse 并行读取 + 随机排序 + LIMIT 返回样本行
"""
import os
import random
import re
from dataclasses import dataclass, field
from datetime import datetime

import clickhouse_connect
import oss2

from .oss_storage import _parse_script_config, DEFAULT_SCRIPT_PATH

CH_HOST = os.getenv("CLICKHOUSE_HOST", "localhost")
CH_PORT = int(os.getenv("CLICKHOUSE_PORT", "8124"))
CH_USER = os.getenv("CLICKHOUSE_USER", "mcp_readonly")
CH_PASSWORD = os.getenv("CLICKHOUSE_PASSWORD", "mcp_clickhouse_readonly_2024")

OSS_ENDPOINT = os.getenv(
    "OSS_ENDPOINT",
    "http://oss-cn-hangzhou-zjy-d01-a.ops.cloud.zhejianglab.com/",
)
OSS_ACCESS_KEY_ID = os.getenv("OSS_ACCESS_KEY_ID", "")
OSS_ACCESS_KEY_SECRET = os.getenv("OSS_ACCESS_KEY_SECRET", "")

ALLOWED_EXTENSIONS = (".jsonl.gz", ".zst", ".zstd")


@dataclass
class SampleResult:
    oss_path: str
    bucket: str
    prefix: str
    sample_size: int
    total_files: int
    sample_lines: list[str] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)
    generated_at: str = ""


def _parse_oss_path(oss_path: str) -> tuple[str, str]:
    match = re.match(r"^oss://([^/]+)/(.*)$", oss_path.rstrip("/"))
    if not match:
        raise ValueError(f"Invalid OSS path: {oss_path}")
    return match.group(1), match.group(2) + "/" if match.group(2) else "/"


def _get_oss_auth():
    script_config = _parse_script_config(
        os.getenv("OSS_SIZE_CHECK_SCRIPT", DEFAULT_SCRIPT_PATH)
    )
    access_key_id = os.getenv("OSS_ACCESS_KEY_ID") or script_config.get("ACCESS_KEY_ID")
    access_key_secret = os.getenv("OSS_ACCESS_KEY_SECRET") or script_config.get("ACCESS_KEY_SECRET")
    endpoint = os.getenv("OSS_ENDPOINT") or script_config.get("ENDPOINT")
    if not access_key_id or not access_key_secret or not endpoint:
        raise RuntimeError("OSS credentials or endpoint are not configured")
    return oss2.Auth(access_key_id, access_key_secret), endpoint


def _is_allowed(key: str) -> bool:
    return key.lower().endswith(ALLOWED_EXTENSIONS)


def _list_first_level_files(bucket: oss2.Bucket, prefix: str) -> list[str]:
    files: list[str] = []
    next_marker = ""
    while True:
        result = bucket.list_objects(
            prefix=prefix, delimiter="/", marker=next_marker, max_keys=1000,
        )
        for obj in result.object_list:
            key = obj.key
            if key == prefix or key.endswith("/"):
                continue
            if _is_allowed(key):
                files.append(key)
        if not result.is_truncated:
            break
        next_marker = result.next_marker
    return files


def _get_ch_client():
    return clickhouse_connect.get_client(
        host=CH_HOST, port=CH_PORT, username=CH_USER, password=CH_PASSWORD,
        connect_timeout=10, send_receive_timeout=600, client_name="oss_tools",
    )


def sample_files_via_clickhouse(
    oss_path: str,
    sample_size: int = 100,
) -> SampleResult:
    """
    单次 UNION ALL 查询抽样：

    Step 1: OSS API 列第一层文件（秒级）
    Step 2: Python 随机选文件
    Step 3: 构建 UNION ALL SQL 单次查询，ClickHouse 并行读取 +
            ORDER BY rand() + LIMIT 返回样本行

    性能：1 次 HTTP → 5-15s（仅传输 N 行内容）
    """
    if sample_size not in (100, 1000, 10000):
        raise ValueError(f"sample_size must be 100, 1000, or 10000")

    bucket, prefix = _parse_oss_path(oss_path)
    endpoint = OSS_ENDPOINT.rstrip("/")

    # Step 1: OSS API 列文件
    try:
        auth, oss_endpoint = _get_oss_auth()
        bucket_obj = oss2.Bucket(auth, oss_endpoint, bucket)
        all_files = _list_first_level_files(bucket_obj, prefix)
    except Exception as exc:
        return SampleResult(
            oss_path=oss_path, bucket=bucket, prefix=prefix,
            sample_size=sample_size, total_files=0,
            errors=[f"OSS list failed: {exc}"],
            generated_at=datetime.now().isoformat(),
        )

    total_files = len(all_files)
    if total_files == 0:
        return SampleResult(
            oss_path=oss_path, bucket=bucket, prefix=prefix,
            sample_size=sample_size, total_files=0,
            errors=["提示：当前目录第一层级下无符合条件的文件，请检查输入目录是否是文件所在目录。（仅支持 .jsonl.gz / .zst / .zstd）"],
            generated_at=datetime.now().isoformat(),
        )

    # Step 2: 随机选文件（上限 100 个文件，避免读取太多压缩文件超时）
    max_files = min(total_files, 100)
    selected = random.sample(all_files, max_files) if max_files < total_files else all_files

    # ClickHouse 连接
    try:
        client = _get_ch_client()
    except Exception as exc:
        return SampleResult(
            oss_path=oss_path, bucket=bucket, prefix=prefix,
            sample_size=sample_size, total_files=total_files,
            errors=[f"ClickHouse connection failed: {exc}"],
            generated_at=datetime.now().isoformat(),
        )

    # Step 3: 分批抽样，避免单次查询触发 ClickHouse max_result_rows=10000。
    # 每批先在文件内随机取候选行，再由 ClickHouse 在候选池中随机裁到本批目标行数。
    max_query_sample_rows = 5000
    safe_candidate_rows = 8000
    remaining = sample_size
    batch_idx = 0
    all_lines: list[str] = []

    try:
        while remaining > 0:
            target_rows = min(remaining, max_query_sample_rows)
            candidate_budget = min(safe_candidate_rows, max(target_rows, target_rows * 2))
            per_file = max(1, (candidate_budget + max_files - 1) // max_files)
            sub_queries = []
            for file_key in selected:
                sub_queries.append(
                    f"SELECT * FROM ("
                    f"SELECT * FROM s3('{endpoint}/{bucket}/{file_key}', "
                    f"'{OSS_ACCESS_KEY_ID}', "
                    f"'{OSS_ACCESS_KEY_SECRET}', "
                    f"'LineAsString') "
                    f"ORDER BY rand() LIMIT {per_file}"
                    f")"
                )

            union_sql = "\n  UNION ALL\n  ".join(sub_queries)
            sample_sql = f"SELECT * FROM ({union_sql}) ORDER BY rand() LIMIT {target_rows}"
            result = client.query(sample_sql, settings={"max_execution_time": 600})
            batch_lines = [str(row[0]) for row in result.result_rows]
            all_lines.extend(batch_lines)

            if not batch_lines:
                break
            remaining = sample_size - len(all_lines)
            batch_idx += 1
    except Exception as exc:
        return SampleResult(
            oss_path=oss_path, bucket=bucket, prefix=prefix,
            sample_size=sample_size, total_files=total_files,
            errors=[f"ClickHouse query failed: {exc}"],
            generated_at=datetime.now().isoformat(),
        )

    # 防御性处理：分批查询总量正常不超过 sample_size，这里兼容异常超额的情况。
    if len(all_lines) <= sample_size:
        sampled = all_lines
    else:
        sampled = random.sample(all_lines, sample_size)

    return SampleResult(
        oss_path=oss_path, bucket=bucket, prefix=prefix,
        sample_size=len(sampled),
        total_files=total_files,
        sample_lines=sampled,
        errors=[],
        generated_at=datetime.now().isoformat(),
    )
