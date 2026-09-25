from __future__ import annotations

from datetime import datetime, timezone
import html
import re

import pandas as pd

from core.utils import compact_join, normalize_whitespace
from ingestion.crossref import PaperRecord


def _clean_str(text: str) -> str:
    if not text:
        return ""
    stripped = re.sub(r"<[^>]+>", " ", text)
    unescaped = html.unescape(stripped)
    return normalize_whitespace(unescaped)


def format_embedding_text(title: str, authors: str, published: str, categories: str, summary: str) -> str:
    return (
        f"Title: {title}\n"
        f"Authors: {authors}\n"
        f"Published: {published}\n"
        f"Categories: {categories}\n"
        f"Summary: {summary}"
    )


def build_clean_dataframe(records: list[PaperRecord], run_date: datetime) -> pd.DataFrame:
    """Clean raw records thanh dataframe san sang de embed.

    1. Normalize title, summary, authors, categories.
    2. Parse published/updated date.
    3. Tinh age_days.
    4. Tao cot helper:
       - authors_joined
       - categories_joined
       - summary_chars
       - text_for_embedding
    5. Drop duplicates va filter row xau.
    6. Sort dataframe va return.
    """
    run_d = run_date.date() if isinstance(run_date, datetime) else run_date

    rows: list[dict] = []
    for r in records:
        paper_id = r.paper_id.strip() if r.paper_id else ""
        title = _clean_str(r.title)
        summary = _clean_str(r.summary)

        if not paper_id or not title:
            continue

        authors = [_clean_str(a) for a in r.authors if _clean_str(a)]
        categories = [_clean_str(c) for c in r.categories if _clean_str(c)]
        primary_category = _clean_str(r.primary_category) or (categories[0] if categories else "General")

        authors_joined = compact_join(authors, sep=", ")
        categories_joined = compact_join(categories, sep=", ")

        published = r.published.strip() if r.published else "2026-01-01"
        try:
            pub_date = datetime.strptime(published[:10], "%Y-%m-%d").date()
        except Exception:
            pub_date = run_d

        age_days = max(0, (run_d - pub_date).days)
        summary_chars = len(summary)

        text_for_embedding = format_embedding_text(
            title=title,
            authors=authors_joined,
            published=published,
            categories=categories_joined,
            summary=summary,
        )

        rows.append(
            {
                "paper_id": paper_id,
                "title": title,
                "summary": summary,
                "authors": authors,
                "authors_joined": authors_joined,
                "categories": categories,
                "categories_joined": categories_joined,
                "primary_category": primary_category,
                "published": published,
                "updated": r.updated.strip() if r.updated else published,
                "abs_url": r.abs_url.strip() if r.abs_url else "",
                "pdf_url": r.pdf_url.strip() if r.pdf_url else "",
                "comment": r.comment.strip() if r.comment else "",
                "age_days": age_days,
                "summary_chars": summary_chars,
                "text_for_embedding": text_for_embedding,
            }
        )

    df = pd.DataFrame(rows)
    if df.empty:
        return df

    # Drop duplicate paper_id
    df = df.drop_duplicates(subset=["paper_id"], keep="first")

    # Filter out empty summary rows if any, but ensure valid summary length
    df = df[df["summary"].str.len() > 0]

    # Sort deterministically
    df = df.sort_values(by=["published", "paper_id"], ascending=[False, True]).reset_index(drop=True)
    return df

