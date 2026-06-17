"""
批量导入 CC-MAIN dump 数据集记录
通过 POST /datasets API 导入所有 31 条数据集
"""
import json
import urllib.request
import urllib.error

API_BASE = "http://127.0.0.1:8000"

datasets = [
    {"name": "CC-MAIN-2026-17-精确去重", "source": "task_produced", "dataset_type": "text", "data_size": 878.67, "size_unit": "GB", "record_count": 518082134, "owner": "zhanghong", "location_path": "oss://si0011174ydu/Web/Preparation/2023-2026-dump-dedup/2026-17-dups-data/"},
    {"name": "CC-MAIN-2026-12-精确去重", "source": "task_produced", "dataset_type": "text", "data_size": 776.78, "size_unit": "GB", "record_count": 459161408, "owner": "zhanghong", "location_path": "oss://si0011174ydu/Web/Preparation/2023-2026-dump-dedup/2026-12-dups-data/"},
    {"name": "CC-MAIN-2026-08-精确去重", "source": "task_produced", "dataset_type": "text", "data_size": 795.86, "size_unit": "GB", "record_count": 475588759, "owner": "zhanghong", "location_path": "oss://si0011174ydu/Web/Preparation/2023-2026-dump-dedup/2026-08-dups-data/"},
    {"name": "CC-MAIN-2026-04-精确去重", "source": "task_produced", "dataset_type": "text", "data_size": 889.32, "size_unit": "GB", "record_count": 534320313, "owner": "zhanghong", "location_path": "oss://si0011174ydu/Web/Preparation/2023-2026-dump-dedup/2026-04-dups-data/"},
    {"name": "CC-MAIN-2025-51-精确去重", "source": "task_produced", "dataset_type": "text", "data_size": 779.18, "size_unit": "GB", "record_count": 471047348, "owner": "zhanghong", "location_path": "oss://si0011174ydu/Web/Preparation/2023-2026-dump-dedup/2025-51-dups-data/"},
    {"name": "CC-MAIN-2025-47-精确去重", "source": "task_produced", "dataset_type": "text", "data_size": 827.30, "size_unit": "GB", "record_count": 504523993, "owner": "zhanghong", "location_path": "oss://si0011174ydu/Web/Preparation/2023-2026-dump-dedup/2025-47-dups-data/"},
    {"name": "CC-MAIN-2025-43-精确去重", "source": "task_produced", "dataset_type": "text", "data_size": 996.26, "size_unit": "GB", "record_count": 638561400, "owner": "zhanghong", "location_path": "oss://si0011174ydu/Web/Preparation/2023-2026-dump-dedup/2025-43-dups-data/"},
    {"name": "CC-MAIN-2025-38-精确去重", "source": "task_produced", "dataset_type": "text", "data_size": 885.22, "size_unit": "GB", "record_count": 565624144, "owner": "zhanghong", "location_path": "oss://si0011174ydu/Web/Preparation/2023-2026-dump-dedup/2025-38-dups-data/"},
    {"name": "CC-MAIN-2025-33-精确去重", "source": "task_produced", "dataset_type": "text", "data_size": 910.25, "size_unit": "GB", "record_count": 584305769, "owner": "zhanghong", "location_path": "oss://si0011174ydu/Web/Preparation/2023-2026-dump-dedup/2025-33-dups-data/"},
    {"name": "CC-MAIN-2025-30-精确去重", "source": "task_produced", "dataset_type": "text", "data_size": 902.16, "size_unit": "GB", "record_count": 581429984, "owner": "zhanghong", "location_path": "oss://si0011174ydu/Web/Preparation/2023-2026-dump-dedup/2025-30-dups-data/"},
    {"name": "CC-MAIN-2025-26-精确去重", "source": "task_produced", "dataset_type": "text", "data_size": 880.83, "size_unit": "GB", "record_count": 552677997, "owner": "zhanghong", "location_path": "oss://si0011174ydu/Web/Preparation/2023-2026-dump-dedup/2025-26-dups-data/"},
    {"name": "CC-MAIN-2025-21-精确去重", "source": "task_produced", "dataset_type": "text", "data_size": 975.32, "size_unit": "GB", "record_count": 627710417, "owner": "zhanghong", "location_path": "oss://si0011174ydu/Web/Preparation/2023-2026-dump-dedup/2025-21-dups-data/"},
    {"name": "CC-MAIN-2025-18-精确去重", "source": "task_produced", "dataset_type": "text", "data_size": 1073.65, "size_unit": "GB", "record_count": 688861848, "owner": "zhanghong", "location_path": "oss://si0011174ydu/Web/Preparation/2023-2026-dump-dedup/2025-18-dups-data/"},
    {"name": "CC-MAIN-2025-13-精确去重", "source": "task_produced", "dataset_type": "text", "data_size": 1057.87, "size_unit": "GB", "record_count": 682495912, "owner": "zhanghong", "location_path": "oss://si0011174ydu/Web/Preparation/2023-2026-dump-dedup/2025-13-dups-data/"},
    {"name": "CC-MAIN-2025-08-精确去重", "source": "task_produced", "dataset_type": "text", "data_size": 1004.33, "size_unit": "GB", "record_count": 656111722, "owner": "zhanghong", "location_path": "oss://si0011174ydu/Web/Preparation/2023-2026-dump-dedup/2025-08-dups-data/"},
    {"name": "CC-MAIN-2025-05-精确去重", "source": "task_produced", "dataset_type": "text", "data_size": 1149.04, "size_unit": "GB", "record_count": 754597338, "owner": "zhanghong", "location_path": "oss://si0011174ydu/Web/Preparation/2023-2026-dump-dedup/2025-05-dups-data/"},
    {"name": "CC-MAIN-2024-51-精确去重", "source": "task_produced", "dataset_type": "text", "data_size": 969.19, "size_unit": "GB", "record_count": 634439399, "owner": "zhanghong", "location_path": "oss://si0011174ydu/Web/Preparation/2023-2026-dump-dedup/2024-51-dups-data/"},
    {"name": "CC-MAIN-2024-46-精确去重", "source": "task_produced", "dataset_type": "text", "data_size": 998.62, "size_unit": "GB", "record_count": 655435030, "owner": "zhanghong", "location_path": "oss://si0011174ydu/Web/Preparation/2023-2026-dump-dedup/2024-46-dups-data/"},
    {"name": "CC-MAIN-2024-42-精确去重", "source": "task_produced", "dataset_type": "text", "data_size": 922.36, "size_unit": "GB", "record_count": 600877116, "owner": "zhanghong", "location_path": "oss://si0011174ydu/Web/Preparation/2023-2026-dump-dedup/2024-42-dups-data/"},
    {"name": "CC-MAIN-2024-38-精确去重", "source": "task_produced", "dataset_type": "text", "data_size": 1043.59, "size_unit": "GB", "record_count": 684491108, "owner": "zhanghong", "location_path": "oss://si0011174ydu/Web/Preparation/2023-2026-dump-dedup/2024-38-dups-data/"},
    {"name": "CC-MAIN-2024-33-精确去重", "source": "task_produced", "dataset_type": "text", "data_size": 853.73, "size_unit": "GB", "record_count": 554411180, "owner": "zhanghong", "location_path": "oss://si0011174ydu/Web/Preparation/2023-2026-dump-dedup/2024-33-dups-data/"},
    {"name": "CC-MAIN-2024-30-精确去重", "source": "task_produced", "dataset_type": "text", "data_size": 948.26, "size_unit": "GB", "record_count": 617944516, "owner": "zhanghong", "location_path": "oss://si0011174ydu/Web/Preparation/2023-2026-dump-dedup/2024-30-dups-data/"},
    {"name": "CC-MAIN-2024-26-精确去重", "source": "task_produced", "dataset_type": "text", "data_size": 1042.09, "size_unit": "GB", "record_count": 679120450, "owner": "zhanghong", "location_path": "oss://si0011174ydu/Web/Preparation/2023-2026-dump-dedup/2024-26-dups-data/"},
    {"name": "CC-MAIN-2024-22-精确去重", "source": "task_produced", "dataset_type": "text", "data_size": 1041.19, "size_unit": "GB", "record_count": 672809981, "owner": "zhanghong", "location_path": "oss://si0011174ydu/Web/Preparation/2023-2026-dump-dedup/2024-22-dups-data/"},
    {"name": "CC-MAIN-2024-18-精确去重", "source": "task_produced", "dataset_type": "text", "data_size": 1081.24, "size_unit": "GB", "record_count": 697009500, "owner": "zhanghong", "location_path": "oss://si0011174ydu/Web/Preparation/2023-2026-dump-dedup/2024-18-dups-data/"},
    {"name": "CC-MAIN-2024-10-精确去重", "source": "task_produced", "dataset_type": "text", "data_size": 1194.12, "size_unit": "GB", "record_count": 776004588, "owner": "zhanghong", "location_path": "oss://si0011174ydu/Web/Preparation/2023-2026-dump-dedup/2024-10-dups-data/"},
    {"name": "CC-MAIN-2023-50-精确去重", "source": "task_produced", "dataset_type": "text", "data_size": 1278.04, "size_unit": "GB", "record_count": 826502628, "owner": "zhanghong", "location_path": "oss://si0011174ydu/Web/Preparation/2023-2026-dump-dedup/2023-50-dups-data/"},
    {"name": "CC-MAIN-2023-40-精确去重", "source": "task_produced", "dataset_type": "text", "data_size": 1312.52, "size_unit": "GB", "record_count": 851825962, "owner": "zhanghong", "location_path": "oss://si0011174ydu/Web/Preparation/2023-2026-dump-dedup/2023-40-dups-data/"},
    {"name": "CC-MAIN-2023-23-精确去重", "source": "task_produced", "dataset_type": "text", "data_size": 1249.75, "size_unit": "GB", "record_count": 779439354, "owner": "zhanghong", "location_path": "oss://si0011174ydu/Web/Preparation/2023-2026-dump-dedup/2023-23-dups-data/"},
    {"name": "CC-MAIN-2023-14-精确去重", "source": "task_produced", "dataset_type": "text", "data_size": 1227.85, "size_unit": "GB", "record_count": 785429797, "owner": "zhanghong", "location_path": "oss://si0011174ydu/Web/Preparation/2023-2026-dump-dedup/2023-14-dups-data/"},
    {"name": "CC-MAIN-2023-06-精确去重", "source": "task_produced", "dataset_type": "text", "data_size": 1286.94, "size_unit": "GB", "record_count": 815576816, "owner": "zhanghong", "location_path": "oss://si0011174ydu/Web/Preparation/2023-2026-dump-dedup/2023-06-dups-data/"},
]


def post_dataset(ds: dict) -> bool:
    """通过 POST /datasets 创建一条数据集记录"""
    payload = {
        "name": ds["name"],
        "source": ds["source"],
        "dataset_type": ds["dataset_type"],
        "location_path": ds["location_path"],
        "data_size": ds["data_size"],
        "size_unit": ds["size_unit"],
        "record_count": ds["record_count"],
        "owner": ds["owner"],
        "status": "active",
    }
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        f"{API_BASE}/datasets",
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req) as resp:
            resp.read()
            return resp.status == 200
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        print(f"  [ERROR] HTTP {e.code}: {body}")
        return False
    except Exception as e:
        print(f"  [ERROR] {e}")
        return False


if __name__ == "__main__":
    success = 0
    fail = 0
    for i, ds in enumerate(datasets, 1):
        print(f"[{i:2d}/31] 导入 {ds['name']} ... ", end="", flush=True)
        if post_dataset(ds):
            print("OK")
            success += 1
        else:
            print("FAIL")
            fail += 1
    print(f"\n完成: 成功 {success} 条, 失败 {fail} 条")