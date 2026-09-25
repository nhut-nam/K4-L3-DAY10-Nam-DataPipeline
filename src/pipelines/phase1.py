from __future__ import annotations

from datetime import datetime, timezone
import json

from core.config import load_settings
from core.utils import now_utc, write_csv, write_json
from evaluation.metrics import evaluate_pipeline
from evaluation.testset import build_test_set
from ingestion.cleaning import build_clean_dataframe
from ingestion.crossref import fetch_source_records
from observability.quality import build_freshness_report, run_data_quality_checks
from observability.reporting import generate_phase1_report
from retrieval.index import LocalEmbeddingIndex


def main() -> None:
    """Xay dung baseline pipeline end-to-end cho Pha 1."""
    print("=== [PHASE 1] Khoi dong Baseline Data Pipeline ===")
    settings = load_settings()

    # 1. Ingestion raw records
    print("-> 1. Fetching / loading raw Crossref records...")
    records = fetch_source_records(settings)
    print(f"   [DONE] Loaded {len(records)} raw records.")

    # 2. Data Cleaning
    print("-> 2. Cleaning and standardizing records...")
    run_date = datetime.now(timezone.utc)
    clean_df = build_clean_dataframe(records, run_date=run_date)
    print(f"   [DONE] Sanitized DataFrame: {len(clean_df)} valid documents.")

    # 3. Save clean artifacts
    print("-> 3. Saving clean artifacts (CSV & JSON)...")
    write_csv(clean_df, settings.paths.clean_csv)
    write_json(settings.paths.clean_json, clean_df.to_dict(orient="records"))
    print(f"   [DONE] Saved clean files to {settings.paths.clean_csv.name} and {settings.paths.clean_json.name}.")

    # 4. Great Expectations & Freshness Observability
    print("-> 4. Executing Data Observability & Quality Gates (GX 1.x)...")
    quality_res = run_data_quality_checks(clean_df, settings, report_name="baseline")
    freshness_res = build_freshness_report(clean_df, settings, report_path=settings.paths.freshness_report)
    print(f"   [DONE] Quality Gate Status: {quality_res['success']} | Freshness SLA: {freshness_res['is_fresh']}")

    # 5. Build Chroma Vector Index
    print("-> 5. Generating MiniLM embeddings & indexing into ChromaDB...")
    index = LocalEmbeddingIndex.build(
        df=clean_df,
        settings=settings,
        embeddings_output_path=settings.paths.embeddings_json,
    )
    print(f"   [DONE] Indexed collection '{settings.baseline_collection_name}' in ChromaDB.")

    # 6. Build or refresh benchmark test set
    print("-> 6. Preparing benchmark test set (10 questions across 4 categories)...")
    if settings.refresh_test_set or not settings.paths.eval_testset.exists():
        test_set = build_test_set(clean_df, settings.paths.eval_testset)
        print(f"   [DONE] Generated {len(test_set)} test items at {settings.paths.eval_testset.name}.")
    else:
        print(f"   [DONE] Found existing test set at {settings.paths.eval_testset.name}.")

    # 7. Evaluate RAG retrieval & QA performance
    print("-> 7. Evaluating Baseline RAG Pipeline...")
    eval_bundle = evaluate_pipeline(
        settings=settings,
        index=index,
        test_set_path=settings.paths.eval_testset,
        metrics_output_path=settings.paths.baseline_metrics,
        answers_output_path=settings.paths.baseline_answers,
    )
    metrics = eval_bundle.summary
    print(f"   [DONE] Baseline Metrics:")
    print(f"          - Retrieval Hit Rate: {metrics['retrieval_hit_rate'] * 100:.1f}%")
    print(f"          - Mean Token F1:     {metrics['mean_token_f1'] * 100:.1f}%")
    print(f"          - Judge Accuracy:    {metrics['judge_accuracy'] * 100:.1f}%")

    # 8. Generate Phase 1 Markdown Report
    print("-> 8. Generating Phase 1 Report Markdown...")
    source_summary = {
        "timestamp": now_utc().isoformat(),
        "source_api": settings.source_api,
        "source_query": settings.source_query,
        "source_filter": settings.source_filter,
        "total_records": len(records),
        "clean_records": len(clean_df),
    }
    generate_phase1_report(
        report_path=settings.paths.baseline_report,
        source_summary=source_summary,
        metrics=metrics,
        quality=quality_res,
        freshness=freshness_res,
    )
    print(f"   [DONE] Phase 1 Report created: {settings.paths.baseline_report}")
    print("=== [PHASE 1 COMPLETED SUCCESSFULLY] ===")

