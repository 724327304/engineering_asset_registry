import ast
import json
import os
from datetime import datetime
from typing import Any


DEFAULT_SCRIPT_PATH = "/root/dataprocess/dclm/scripts/oss_size_check.py"
DEFAULT_BUCKET_CONFIGS = [
    {"name": "train1", "limit_tb": 460.0},
    {"name": "si002558te8h", "limit_tb": 495.3},
    {"name": "si0011174ydu", "limit_tb": 300.0},
]


def _parse_script_config(path: str) -> dict[str, Any]:
    if not os.path.exists(path):
        return {}

    with open(path, "r", encoding="utf-8") as file:
        tree = ast.parse(file.read(), filename=path)

    config: dict[str, Any] = {}
    wanted = {"ACCESS_KEY_ID", "ACCESS_KEY_SECRET", "ENDPOINT", "BUCKET_CONFIGS"}

    for node in tree.body:
        if not isinstance(node, ast.Assign):
            continue
        for target in node.targets:
            if isinstance(target, ast.Name) and target.id in wanted:
                config[target.id] = ast.literal_eval(node.value)

    return config


def _load_bucket_configs(script_config: dict[str, Any]) -> list[dict[str, Any]]:
    raw = os.getenv("OSS_BUCKET_CONFIGS")
    if raw:
        try:
            parsed = json.loads(raw)
            if isinstance(parsed, list):
                return parsed
        except json.JSONDecodeError:
            pass

    script_buckets = script_config.get("BUCKET_CONFIGS")
    if isinstance(script_buckets, list):
        return script_buckets

    return DEFAULT_BUCKET_CONFIGS


def _format_bucket_result(bucket_name: str, limit_tb: float, error: str | None = None, **values: Any) -> dict[str, Any]:
    limit_bytes = int(limit_tb * (1024 ** 4))
    used_bytes = int(values.get("used_bytes", 0))
    remaining_bytes = max(0, limit_bytes - used_bytes)
    usage_percent = (used_bytes / limit_bytes * 100) if limit_bytes > 0 else 0

    return {
        "name": bucket_name,
        "limit_tb": limit_tb,
        "limit_bytes": limit_bytes,
        "used_bytes": used_bytes,
        "remaining_bytes": remaining_bytes,
        "usage_percent": usage_percent,
        "object_count": int(values.get("object_count", 0)),
        "multipart_uploads": int(values.get("multipart_uploads", 0)),
        "error": error,
    }


def get_oss_storage_report() -> dict[str, Any]:
    script_config = _parse_script_config(os.getenv("OSS_SIZE_CHECK_SCRIPT", DEFAULT_SCRIPT_PATH))

    access_key_id = os.getenv("OSS_ACCESS_KEY_ID") or script_config.get("ACCESS_KEY_ID")
    access_key_secret = os.getenv("OSS_ACCESS_KEY_SECRET") or script_config.get("ACCESS_KEY_SECRET")
    endpoint = os.getenv("OSS_ENDPOINT") or script_config.get("ENDPOINT")
    bucket_configs = _load_bucket_configs(script_config)

    generated_at = datetime.now().isoformat()

    if not access_key_id or not access_key_secret or not endpoint:
        buckets = [
            _format_bucket_result(
                str(config.get("name", "")),
                float(config.get("limit_tb", 0)),
                error="OSS credentials or endpoint are not configured",
            )
            for config in bucket_configs
        ]
        return {
            "generated_at": generated_at,
            "endpoint": endpoint or "",
            "configured": False,
            "total_limit_bytes": sum(bucket["limit_bytes"] for bucket in buckets),
            "total_used_bytes": 0,
            "total_remaining_bytes": sum(bucket["remaining_bytes"] for bucket in buckets),
            "buckets": buckets,
        }

    try:
        import oss2
    except ImportError as exc:
        buckets = [
            _format_bucket_result(
                str(config.get("name", "")),
                float(config.get("limit_tb", 0)),
                error="Python dependency oss2 is not installed",
            )
            for config in bucket_configs
        ]
        return {
            "generated_at": generated_at,
            "endpoint": endpoint,
            "configured": False,
            "total_limit_bytes": sum(bucket["limit_bytes"] for bucket in buckets),
            "total_used_bytes": 0,
            "total_remaining_bytes": sum(bucket["remaining_bytes"] for bucket in buckets),
            "buckets": buckets,
        }

    auth = oss2.Auth(access_key_id, access_key_secret)
    buckets: list[dict[str, Any]] = []

    for config in bucket_configs:
        bucket_name = str(config.get("name", ""))
        limit_tb = float(config.get("limit_tb", 0))

        try:
            bucket = oss2.Bucket(auth, endpoint, bucket_name)
            stat = bucket.get_bucket_stat()
            multipart_uploads = getattr(
                stat,
                "multi_part_upload_count",
                getattr(stat, "multipart_upload_count", 0),
            )
            buckets.append(
                _format_bucket_result(
                    bucket_name,
                    limit_tb,
                    used_bytes=getattr(stat, "storage_size_in_bytes", 0),
                    object_count=getattr(stat, "object_count", 0),
                    multipart_uploads=multipart_uploads,
                )
            )
        except Exception as exc:
            buckets.append(_format_bucket_result(bucket_name, limit_tb, error=str(exc)))

    total_limit_bytes = sum(bucket["limit_bytes"] for bucket in buckets)
    total_used_bytes = sum(bucket["used_bytes"] for bucket in buckets if not bucket["error"])

    return {
        "generated_at": generated_at,
        "endpoint": endpoint,
        "configured": True,
        "total_limit_bytes": total_limit_bytes,
        "total_used_bytes": total_used_bytes,
        "total_remaining_bytes": max(0, total_limit_bytes - total_used_bytes),
        "buckets": buckets,
    }
