from __future__ import annotations

from pathlib import Path
from typing import Any

import pandas as pd

from core.utils import first_sentence, write_json


def build_test_set(df: pd.DataFrame, output_path: Path | str) -> list[dict[str, Any]]:
    """Tao bo evaluation set gom 10 cau hoi tu cleaned dataframe.

    Phu 4 loai cau hoi nghiep vu:
    1. summary (hỏi tóm tắt)
    2. authors (hỏi tác giả)
    3. date (hỏi ngày xuất bản)
    4. categories (hỏi chuyên ngành)
    """
    if len(df) < 4:
        raise ValueError(f"DataFrame must contain at least 4 rows to generate test set, got {len(df)}")

    # Deterministic selection of papers across the dataframe
    test_set: list[dict[str, Any]] = []
    total = len(df)

    # Question definitions: distribute 10 questions across 4 types
    # 3 summary, 3 authors, 2 date, 2 categories = 10 questions
    specs = [
        ("summary", 0),
        ("authors", 1 % total),
        ("date", 2 % total),
        ("categories", 3 % total),
        ("summary", 4 % total),
        ("authors", 5 % total),
        ("date", 6 % total),
        ("categories", 7 % total),
        ("summary", 8 % total),
        ("authors", 9 % total),
    ]

    for idx, (q_type, row_idx) in enumerate(specs, start=1):
        row = df.iloc[row_idx]
        paper_id = str(row["paper_id"])
        title = str(row["title"])

        if q_type == "summary":
            question = f"What is the summary of the paper '{title}'?"
            ground_truth = first_sentence(str(row["summary"]))
        elif q_type == "authors":
            question = f"Who authored the paper '{title}'?"
            ground_truth = str(row["authors_joined"])
        elif q_type == "date":
            question = f"When was the paper '{title}' published?"
            ground_truth = str(row["published"])
        elif q_type == "categories":
            question = f"What categories does the paper '{title}' belong to?"
            ground_truth = str(row["categories_joined"])
        else:
            question = f"What is the summary of the paper '{title}'?"
            ground_truth = first_sentence(str(row["summary"]))

        test_set.append(
            {
                "id": f"eval_{idx:03d}",
                "question_type": q_type,
                "question": question,
                "ground_truth": ground_truth,
                "ground_truth_doc_ids": [paper_id],
            }
        )

    result = TestSetResult(test_set)
    if output_path:
        write_json(Path(output_path), result)

    return result


class TestSetResult(list):
    """Lớp danh sách câu hỏi test hỗ trợ cả ts và ts.samples."""
    @property
    def samples(self) -> list:
        return self


def load_or_create_test_set(df: pd.DataFrame, output_path: Path | str | None = None) -> TestSetResult:
    """Tai hoac khoi tao bo evaluation test set (ho tro ca s.paths.eval_testset va s.paths.test_set_json)."""
    if output_path and Path(output_path).exists():
        from core.utils import read_json
        data = read_json(Path(output_path))
        return TestSetResult(data)
    return build_test_set(df, output_path)


