from __future__ import annotations

from pathlib import Path
from typing import Any

import pandas as pd

from core.config import Settings
from core.utils import ensure_parent, safe_slug, write_json


def build_freshness_report(df: pd.DataFrame, settings: Settings, report_path: Path | str | None = None) -> dict[str, Any]:
    """Tong hop freshness report theo Freshness SLA.
    Canh bao is_fresh = False neu ty le bai bao co age_days > 180 vuot qua 25%.
    """
    total_rows = len(df)
    if total_rows == 0:
        stale_rows = 0
        stale_rate = 0.0
        latest_published = ""
        oldest_published = ""
        is_fresh = False
    else:
        threshold = settings.freshness_threshold_days
        stale_rows = int((df["age_days"] > threshold).sum())
        stale_rate = round(stale_rows / total_rows, 4)
        is_fresh = bool(stale_rate <= 0.25)
        latest_published = str(df["published"].max())
        oldest_published = str(df["published"].min())

    payload = {
        "total_rows": total_rows,
        "stale_rows": stale_rows,
        "stale_rate": stale_rate,
        "freshness_threshold_days": settings.freshness_threshold_days,
        "is_fresh": is_fresh,
        "latest_published": latest_published,
        "oldest_published": oldest_published,
    }

    if report_path:
        write_json(Path(report_path), payload)

    return payload


def run_data_quality_checks(df: pd.DataFrame, settings: Settings, report_name: str) -> dict[str, Any]:
    """Chay data quality checks theo Great Expectations 1.x Ephemeral mode ket hop Freshness SLA.

    4 Expectations bat buoc:
    1. ExpectTableRowCountToBeBetween (5 den 5000)
    2. ExpectColumnValuesToNotBeNull (paper_id, title, text_for_embedding)
    3. ExpectColumnValuesToBeUnique (paper_id)
    4. ExpectColumnValueLengthsToBeBetween (summary >= 30, title >= 8)
    """
    failed_expectations: list[str] = []
    checks_details: list[dict[str, Any]] = []

    # 1. Freshness check
    freshness = build_freshness_report(df, settings, report_path=None)
    if not freshness["is_fresh"]:
        failed_expectations.append(f"FreshnessSLA: stale_rate={freshness['stale_rate']} > 0.25")

    # 2. Great Expectations 1.x validation
    gx_success = True
    try:
        import great_expectations as gx
        import great_expectations.expectations as gxe

        context = gx.get_context(mode="ephemeral")
        source_name = f"pandas_source_{safe_slug(report_name)}"
        asset_name = f"pandas_asset_{safe_slug(report_name)}"
        batch_name = f"pandas_batch_{safe_slug(report_name)}"

        data_source = context.data_sources.add_pandas(name=source_name)
        data_asset = data_source.add_dataframe_asset(name=asset_name)
        batch_def = data_asset.add_batch_definition_whole_dataframe(batch_name)
        batch = batch_def.get_batch(batch_parameters={"dataframe": df})

        expectations = [
            gxe.ExpectTableRowCountToBeBetween(min_value=5, max_value=5000),
            gxe.ExpectColumnValuesToNotBeNull(column="paper_id"),
            gxe.ExpectColumnValuesToNotBeNull(column="title"),
            gxe.ExpectColumnValuesToNotBeNull(column="text_for_embedding"),
            gxe.ExpectColumnValuesToBeUnique(column="paper_id"),
            gxe.ExpectColumnValueLengthsToBeBetween(column="summary", min_value=30),
            gxe.ExpectColumnValueLengthsToBeBetween(column="title", min_value=8),
        ]

        for exp in expectations:
            res = batch.validate(exp)
            success = bool(res.success)
            exp_name = exp.__class__.__name__
            col = getattr(exp, "column", None)
            display_name = f"{exp_name}(column={col})" if col else exp_name
            checks_details.append({
                "expectation": display_name,
                "success": success,
            })
            if not success:
                gx_success = False
                failed_expectations.append(display_name)

    except Exception as exc:
        # Fallback pandas-based validations if GX encounters issues
        checks = [
            ("ExpectTableRowCountToBeBetween", bool(5 <= len(df) <= 5000)),
            ("ExpectColumnValuesToNotBeNull(paper_id)", bool(df["paper_id"].notna().all() and (df["paper_id"].astype(str).str.strip() != "").all())),
            ("ExpectColumnValuesToNotBeNull(title)", bool(df["title"].notna().all() and (df["title"].astype(str).str.strip() != "").all())),
            ("ExpectColumnValuesToNotBeNull(text_for_embedding)", bool(df["text_for_embedding"].notna().all() and (df["text_for_embedding"].astype(str).str.strip() != "").all())),
            ("ExpectColumnValuesToBeUnique(paper_id)", bool(df["paper_id"].is_unique)),
            ("ExpectColumnValueLengthsToBeBetween(summary>=30)", bool((df["summary"].astype(str).str.len() >= 30).all())),
            ("ExpectColumnValueLengthsToBeBetween(title>=8)", bool((df["title"].astype(str).str.len() >= 8).all())),
        ]
        for name, passed in checks:
            checks_details.append({"expectation": name, "success": passed})
            if not passed:
                gx_success = False
                failed_expectations.append(name)

    overall_success = bool(gx_success and freshness["is_fresh"])

    report_payload = {
        "report_name": report_name,
        "success": overall_success,
        "gx_success": gx_success,
        "total_rows": len(df),
        "failed_expectations": failed_expectations,
        "checks": checks_details,
        "freshness": freshness,
    }

    # Save quality report artifact
    if report_name == "baseline":
        out_path = settings.paths.baseline_quality_report
    elif report_name == "corrupted":
        out_path = settings.paths.corrupted_quality_report
    else:
        out_path = settings.paths.quality_dir / f"{safe_slug(report_name)}_quality_report.json"

    write_json(out_path, report_payload)
    return report_payload

