"""
OSS 工具箱 — 文件列表统计 & 内容随机抽样
复用 oss_storage.py 的 OSS 认证配置

规则：
1. 只统计目标目录第一层文件，不递归子目录
2. 仅支持 .jsonl.gz / .zst / .zstd 格式
3. 抽样从文件内容中随机抽取行（JSON Lines 格式），文件数不足全量返回
"""
import gzip as _gzip_mod
import os
import random
import re
from dataclasses import dataclass, field
from datetime import datetime

import oss2

from .oss_storage import _parse_script_config, DEFAULT_SCRIPT_PATH

CHUNK_SIZE = 4 * 1024 * 1024  # 4MB

ALLOWED_EXTENSIONS = (".jsonl.gz", ".zst", ".zstd")


@dataclass
class OssListFilesResult:
    oss_path: str
    bucket: str
    prefix: str
    total_files: int
    top_files: list[str]
    generated_at: str


@dataclass
class OssSampleResult:
    oss_path: str
    bucket: str
    prefix: str
    sample_size: int
    total_files: int
    sample_lines: list[str] = field(default_factory=list)  # 抽中的行内容
    errors: list[str] = field(default_factory=list)
    generated_at: str = ""


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


def _parse_oss_path(oss_path: str) -> tuple[str, str]:
    match = re.match(r"^oss://([^/]+)/(.*)$", oss_path.rstrip("/"))
    if not match:
        raise ValueError(f"Invalid OSS path: {oss_path}")
    bucket_name = match.group(1)
    prefix = match.group(2)
    if prefix and not prefix.endswith("/"):
        prefix += "/"
    return bucket_name, prefix


def _is_allowed(key: str) -> bool:
    return key.lower().endswith(ALLOWED_EXTENSIONS)


def _list_first_level_files(bucket: oss2.Bucket, prefix: str) -> list[str]:
    """列出 OSS 目录第一层文件（不递归子目录），仅返回允许扩展名的文件"""
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


def list_oss_files(oss_path: str) -> OssListFilesResult:
    """统计 OSS 目录第一层的文件数量，返回总数和前 10 条文件名"""
    auth, endpoint = _get_oss_auth()
    bucket_name, prefix = _parse_oss_path(oss_path)
    bucket = oss2.Bucket(auth, endpoint, bucket_name)
    files = _list_first_level_files(bucket, prefix)
    display_files = [f.removeprefix(prefix) for f in files[:10]]
    return OssListFilesResult(
        oss_path=oss_path, bucket=bucket_name, prefix=prefix,
        total_files=len(files), top_files=display_files,
        generated_at=datetime.now().isoformat(),
    )


def _read_lines_from_oss(bucket: oss2.Bucket, file_key: str) -> list[str]:
    """从 OSS 压缩文件读取所有行，返回 list[str]"""
    resp = bucket.get_object(file_key)
    if file_key.endswith((".zst", ".zstd")):
        import zstandard as zstd
        reader = zstd.ZstdDecompressor().stream_reader(resp)
    elif file_key.endswith(".gz"):
        reader = _gzip_mod.GzipFile(fileobj=resp)
    else:
        reader = resp

    lines: list[str] = []
    buf = b""
    while True:
        chunk = reader.read(CHUNK_SIZE)
        if not chunk:
            break
        buf += chunk
        parts = buf.split(b"\n")
        buf = parts[-1]  # 最后一个不完整行保留
        for part in parts[:-1]:
            line = part.decode("utf-8", errors="replace").strip()
            if line:
                lines.append(line)
    if buf:
        line = buf.decode("utf-8", errors="replace").strip()
        if line:
            lines.append(line)
    return lines


# ═══════════════════════════════════════════════════
# 内容抽样
# ═══════════════════════════════════════════════════

def sample_oss_files(oss_path: str, sample_size: int = 100) -> OssSampleResult:
    """
    从 OSS 目录第一层 .jsonl.gz / .zst / .zstd 文件中，
    随机抽取 sample_size 行内容。

    策略：
    1. 列出第一层文件
    2. 随机选文件（文件数不足则全选）
    3. 读取选中文件的所有行
    4. 从这些行中随机抽取 sample_size 行

    若总行数不足 sample_size，返回全部行。
    """
    if sample_size not in (100, 1000, 10000):
        raise ValueError(f"sample_size must be 100, 1000, or 10000")

    auth, endpoint = _get_oss_auth()
    bucket_name, prefix = _parse_oss_path(oss_path)
    bucket = oss2.Bucket(auth, endpoint, bucket_name)

    all_files = _list_first_level_files(bucket, prefix)
    total_files = len(all_files)

    if total_files == 0:
        return OssSampleResult(
            oss_path=oss_path, bucket=bucket_name, prefix=prefix,
            sample_size=sample_size, total_files=0, sample_lines=[],
            errors=["提示：当前目录第一层级下无符合条件的文件，请检查输入目录是否是文件所在目录。（仅支持 .jsonl.gz / .zst / .zstd）"],
            generated_at=datetime.now().isoformat(),
        )

    # 文件数不足或超过 100 个 -> 全选文件（避免太多文件 HTTP 开销）
    max_files_to_read = min(total_files, max(sample_size, 100))
    selected_files = random.sample(all_files, max_files_to_read) if max_files_to_read < total_files else all_files

    # 收集所有行
    all_lines: list[str] = []
    errors: list[str] = []

    for key in selected_files:
        try:
            lines = _read_lines_from_oss(bucket, key)
            all_lines.extend(lines)
        except Exception as exc:
            errors.append(f"{key}: {exc}")

    # 随机抽取 sample_size 行
    if len(all_lines) <= sample_size:
        sampled_lines = all_lines
    else:
        sampled_lines = random.sample(all_lines, sample_size)

    return OssSampleResult(
        oss_path=oss_path, bucket=bucket_name, prefix=prefix,
        sample_size=len(sampled_lines),
        total_files=total_files,
        sample_lines=sampled_lines,
        errors=errors,
        generated_at=datetime.now().isoformat(),
    )