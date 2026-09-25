from __future__ import annotations

from datetime import datetime, timezone

import pandas as pd

from core.config import load_settings
from core.utils import read_json, write_csv, write_json
from evaluation.metrics import evaluate_pipeline
from ingestion.cleaning import build_clean_dataframe
from ingestion.corruption import corrupt_clean_dataframe
from ingestion.crossref import fetch_source_records, load_raw_records
from observability.quality import build_freshness_report, run_data_quality_checks
from observability.reporting import generate_corruption_report
from retrieval.index import LocalEmbeddingIndex


def main() -> None:
    """Xay dung luong Corruption -> Evaluation -> Idempotent Repair -> 3-State Comparison."""
    print("=== [PHASE 2] Khoi dong Data Corruption & Self-Healing Repair Flow ===")
    settings = load_settings()

    # 1. Ensure baseline data and clean dataset exist
    if not settings.paths.clean_csv.exists() or not settings.paths.clean_json.exists():
        print("-> Clean dataset not found. Generating clean dataset from raw...")
        raw_records = fetch_source_records(settings)
        clean_df = build_clean_dataframe(raw_records, run_date=datetime.now(timezone.utc))
        write_csv(clean_df, settings.paths.clean_csv)
        write_json(settings.paths.clean_json, clean_df.to_dict(orient="records"))
    else:
        try:
            clean_df = pd.read_json(settings.paths.clean_json)
        except Exception:
            clean_df = pd.read_csv(settings.paths.clean_csv)

    if not settings.paths.baseline_metrics.exists():
        print("-> Baseline metrics not found. Running baseline index and evaluation first...")
        baseline_index = LocalEmbeddingIndex.build(
            df=clean_df,
            settings=settings,
            embeddings_output_path=settings.paths.embeddings_json,
        )
        evaluate_pipeline(
            settings=settings,
            index=baseline_index,
            test_set_path=settings.paths.eval_testset,
            metrics_output_path=settings.paths.baseline_metrics,
            answers_output_path=settings.paths.baseline_answers,
        )

    baseline_metrics = read_json(settings.paths.baseline_metrics)
    print(f"   [DONE] Loaded Baseline Metrics (Hit Rate: {baseline_metrics['retrieval_hit_rate']*100:.1f}%, F1: {baseline_metrics['mean_token_f1']*100:.1f}%)")

    # 2. Inject 6 Synthetic Data Corruptions
    print("\n-> 2. Injecting 6 Synthetic Data Corruptions (Drop, Blank, Noise, Truncate, Stale, Dups)...")
    corrupted_df = corrupt_clean_dataframe(clean_df, output_log_path=settings.paths.corruption_log)
    write_csv(corrupted_df, settings.paths.corrupted_clean_csv)
    write_json(settings.paths.corrupted_clean_json, corrupted_df.to_dict(orient="records"))
    print(f"   [DONE] Corrupted DataFrame created with {len(corrupted_df)} records.")
    print(f"   [DONE] Corruption log recorded at {settings.paths.corruption_log.name}")

    # 3. Quality Gate Check on Corrupted Data
    print("\n-> 3. Running Data Quality Gate (GX 1.x & Freshness) on Corrupted Data...")
    corrupted_quality = run_data_quality_checks(corrupted_df, settings, report_name="corrupted")
    corrupted_freshness = build_freshness_report(corrupted_df, settings, report_path=None)
    print(f"   [ALERT] Corrupted Gate Success: {corrupted_quality['success']} (GX: {corrupted_quality['gx_success']}, Fresh: {corrupted_freshness['is_fresh']})")
    print(f"   [ALERT] Detected violations: {corrupted_quality.get('failed_expectations', [])}")

    # 4. Evaluate Corrupted Data on RAG
    print("\n-> 4. Indexing Corrupted Data into ChromaDB & Measuring Performance Degradation...")
    corrupted_index = LocalEmbeddingIndex.build(
        df=corrupted_df,
        settings=settings,
        embeddings_output_path=settings.paths.corrupted_embeddings_json,
    )
    corrupted_bundle = evaluate_pipeline(
        settings=settings,
        index=corrupted_index,
        test_set_path=settings.paths.eval_testset,
        metrics_output_path=settings.paths.corrupted_metrics,
        answers_output_path=settings.paths.corrupted_answers,
    )
    corrupted_metrics = corrupted_bundle.summary
    print(f"   [DONE] Corrupted Performance: Hit Rate: {corrupted_metrics['retrieval_hit_rate']*100:.1f}%, F1: {corrupted_metrics['mean_token_f1']*100:.1f}%")

    # 5. Idempotent Repair from Raw Lineage Archive
    print("\n-> 5. Initiating Idempotent Repair from raw lineage archive...")
    raw_records = load_raw_records(settings.paths.raw_records_json)
    repaired_df = build_clean_dataframe(raw_records, run_date=datetime.now(timezone.utc))
    write_csv(repaired_df, settings.paths.repaired_clean_csv)
    write_json(settings.paths.repaired_clean_json, repaired_df.to_dict(orient="records"))
    print(f"   [DONE] Data successfully repaired and restored: {len(repaired_df)} records.")

    # 6. Quality Gate on Repaired Data
    print("\n-> 6. Validating Quality Gate on Repaired Data...")
    repaired_quality = run_data_quality_checks(repaired_df, settings, report_name="repaired")
    repaired_freshness = build_freshness_report(repaired_df, settings, report_path=None)
    print(f"   [DONE] Repaired Gate Success: {repaired_quality['success']} (GX: {repaired_quality['gx_success']}, Fresh: {repaired_freshness['is_fresh']})")

    # 7. Evaluate Repaired Data on RAG
    print("\n-> 7. Rebuilding Chroma Index and Evaluating Repaired Pipeline...")
    repaired_index = LocalEmbeddingIndex.build(
        df=repaired_df,
        settings=settings,
        embeddings_output_path=settings.paths.repaired_embeddings_json,
    )
    repaired_bundle = evaluate_pipeline(
        settings=settings,
        index=repaired_index,
        test_set_path=settings.paths.eval_testset,
        metrics_output_path=settings.paths.repaired_metrics,
        answers_output_path=settings.paths.repaired_answers,
    )
    repaired_metrics = repaired_bundle.summary
    print(f"   [DONE] Repaired Performance: Hit Rate: {repaired_metrics['retrieval_hit_rate']*100:.1f}%, F1: {repaired_metrics['mean_token_f1']*100:.1f}%")

    # 8. Generate 3-State Markdown Comparison Report
    print("\n-> 8. Generating 3-State Comparison Report...")
    generate_corruption_report(
        report_path=settings.paths.comparison_report,
        baseline_metrics=baseline_metrics,
        corrupted_metrics=corrupted_metrics,
        repaired_metrics=repaired_metrics,
        corrupted_quality=corrupted_quality,
        repaired_quality=repaired_quality,
        corrupted_freshness=corrupted_freshness,
        repaired_freshness=repaired_freshness,
    )
    print(f"   [DONE] Comparison report created at: {settings.paths.comparison_report}")

    # 9. Print 3-State Comparison Table
    print("\n" + "=" * 78)
    print(f"{'METRIC / INDICATOR':<26} | {'BASELINE':<14} | {'CORRUPTED':<14} | {'REPAIRED':<14}")
    print("-" * 78)
    print(f"{'Retrieval Hit Rate':<26} | {baseline_metrics['retrieval_hit_rate']*100:>13.1f}% | {corrupted_metrics['retrieval_hit_rate']*100:>13.1f}% | {repaired_metrics['retrieval_hit_rate']*100:>13.1f}%")
    print(f"{'Mean Token F1':<26} | {baseline_metrics['mean_token_f1']*100:>13.1f}% | {corrupted_metrics['mean_token_f1']*100:>13.1f}% | {repaired_metrics['mean_token_f1']*100:>13.1f}%")
    print(f"{'LLM Judge Accuracy':<26} | {baseline_metrics['judge_accuracy']*100:>13.1f}% | {corrupted_metrics['judge_accuracy']*100:>13.1f}% | {repaired_metrics['judge_accuracy']*100:>13.1f}%")
    print(f"{'Judge Score (1-5)':<26} | {baseline_metrics['mean_judge_score']:>14.2f} | {corrupted_metrics['mean_judge_score']:>14.2f} | {repaired_metrics['mean_judge_score']:>14.2f}")
    c_status = "FAILED" if not corrupted_quality["success"] else "PASSED"
    r_status = "PASSED" if repaired_quality["success"] else "FAILED"
    print(f"{'Quality Gate (GX 1.x)':<26} | {'PASSED':>14} | {c_status:>14} | {r_status:>14}")
    print("=" * 78)
    print("=== [PHASE 2 COMPLETED SUCCESSFULLY] ===\n")

