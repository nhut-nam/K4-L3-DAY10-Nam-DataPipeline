from __future__ import annotations

from datetime import datetime, timedelta
from pathlib import Path
from typing import Any

import pandas as pd

from core.utils import write_json
from ingestion.cleaning import format_embedding_text


def corrupt_clean_dataframe(df: pd.DataFrame, output_log_path: Path | str | None = None) -> pd.DataFrame:
    """Simulate 6 dang data corruption thuc te:
    1. Drop latest records: Bo 20% ban ghi moi nhat.
    2. Blank summary: Xoa trang phan tom tat.
    3. Inject noise: Chen chuoi ky tu rac vao tom tat.
    4. Truncate title: Cat ngan tieu de xuong duoi 8 ky tu.
    5. Stale date: Lui ngay xuat ban ve 365 ngay truoc.
    6. Duplicate rows: Nhan doi mot so dong.
    7. Rebuild `text_for_embedding`.
    8. Ghi corruption log vao output_log_path.
    """
    corrupted = df.copy()
    initial_rows = len(corrupted)
    log_entries: list[dict[str, Any]] = []

    # 1. Drop latest records (20% newest)
    # df is already sorted by published descending
    drop_count = max(1, int(len(corrupted) * 0.20))
    dropped_ids = list(corrupted.iloc[:drop_count]["paper_id"])
    corrupted = corrupted.iloc[drop_count:].copy().reset_index(drop=True)
    log_entries.append({
        "type": "drop_latest_records",
        "description": f"Dropped {drop_count} newest records (20%)",
        "affected_ids": dropped_ids,
    })

    if len(corrupted) < 5:
        # If too few, just return
        return corrupted

    # 2. Blank summary on row 0
    blank_id = corrupted.at[0, "paper_id"]
    corrupted.at[0, "summary"] = ""
    corrupted.at[0, "summary_chars"] = 0
    log_entries.append({
        "type": "blank_summary",
        "description": "Cleared summary to empty string",
        "affected_ids": [blank_id],
    })

    # 3. Inject noise into summary on row 1
    noise_id = corrupted.at[1, "paper_id"]
    original_sum = corrupted.at[1, "summary"]
    corrupted.at[1, "summary"] = f"### [GARBAGE_NOISE_$$$] ### {original_sum} ### [CORRUPTED_TOKEN_DATA_LEAK] ###"
    corrupted.at[1, "summary_chars"] = len(corrupted.at[1, "summary"])
    log_entries.append({
        "type": "inject_noise",
        "description": "Injected synthetic noise and corrupted tokens into summary",
        "affected_ids": [noise_id],
    })

    # 4. Truncate title to < 8 chars on row 2
    trunc_id = corrupted.at[2, "paper_id"]
    corrupted.at[2, "title"] = "AI"
    log_entries.append({
        "type": "truncate_title",
        "description": "Truncated title to < 8 chars ('AI')",
        "affected_ids": [trunc_id],
    })

    # 5. Stale date: push published date 365 days into past for row 3 and row 4
    stale_ids = []
    for r_idx in [3, min(4, len(corrupted) - 1)]:
        sid = corrupted.at[r_idx, "paper_id"]
        stale_ids.append(sid)
        old_pub = corrupted.at[r_idx, "published"]
        try:
            old_dt = datetime.strptime(str(old_pub)[:10], "%Y-%m-%d")
            new_dt = old_dt - timedelta(days=365)
            corrupted.at[r_idx, "published"] = new_dt.strftime("%Y-%m-%d")
        except Exception:
            corrupted.at[r_idx, "published"] = "2024-01-01"
        corrupted.at[r_idx, "age_days"] = int(corrupted.at[r_idx, "age_days"]) + 365

    log_entries.append({
        "type": "stale_date",
        "description": "Shifted publication date back by 365 days to simulate stale records",
        "affected_ids": stale_ids,
    })

    # 6. Duplicate rows: duplicate 2 rows
    dup_rows = corrupted.iloc[:2].copy()
    corrupted = pd.concat([corrupted, dup_rows], ignore_index=True)
    log_entries.append({
        "type": "duplicate_rows",
        "description": "Duplicated 2 rows to introduce duplicate paper_ids",
        "count": 2,
    })

    # 7. Rebuild text_for_embedding for all rows
    corrupted["text_for_embedding"] = corrupted.apply(
        lambda r: format_embedding_text(
            title=str(r["title"]),
            authors=str(r["authors_joined"]),
            published=str(r["published"]),
            categories=str(r["categories_joined"]),
            summary=str(r["summary"]),
        ),
        axis=1,
    )

    # 8. Write log
    if output_log_path:
        log_payload = {
            "initial_rows": initial_rows,
            "corrupted_rows": len(corrupted),
            "corruptions": log_entries,
        }
        write_json(Path(output_log_path), log_payload)

    return corrupted

