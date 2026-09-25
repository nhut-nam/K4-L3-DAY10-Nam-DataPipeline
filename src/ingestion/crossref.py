from __future__ import annotations

from dataclasses import dataclass
import html
import json
from pathlib import Path
import re
from typing import Any
import urllib.error
import urllib.request

from core.config import Settings
from core.utils import ensure_parent, normalize_whitespace, read_json, write_json


@dataclass(frozen=True)
class PaperRecord:
    paper_id: str
    title: str
    summary: str
    authors: list[str]
    categories: list[str]
    primary_category: str
    published: str
    updated: str
    abs_url: str
    pdf_url: str
    comment: str


def _clean_text(text: str) -> str:
    if not text:
        return ""
    # Strip HTML / XML tags such as <jats:p>
    stripped = re.sub(r"<[^>]+>", " ", text)
    unescaped = html.unescape(stripped)
    return normalize_whitespace(unescaped)


def parse_crossref_payload(payload: dict) -> list[PaperRecord]:
    """Parse Crossref payload thanh list PaperRecord.

    1. Duyet `payload["message"]["items"]`.
    2. Lay DOI, title, abstract, authors, subject, dates, URLs.
    3. Chuan hoa text va bo record khong hop le.
    4. Tra ve list `PaperRecord`.
    """
    message = payload.get("message", payload)
    items = message.get("items", []) if isinstance(message, dict) else []
    if not items and isinstance(payload, list):
        items = payload

    records: list[PaperRecord] = []
    for item in items:
        if not isinstance(item, dict):
            continue

        doi = item.get("DOI", "").strip()
        if not doi:
            continue

        title_raw = item.get("title", "")
        if isinstance(title_raw, list):
            title = _clean_text(title_raw[0] if title_raw else "")
        else:
            title = _clean_text(str(title_raw))

        if not title:
            continue

        abstract_raw = item.get("abstract", "")
        summary = _clean_text(str(abstract_raw))

        authors: list[str] = []
        for author in item.get("author", []):
            if isinstance(author, dict):
                given = author.get("given", "").strip()
                family = author.get("family", "").strip()
                full_name = f"{given} {family}".strip() if (given or family) else author.get("name", "").strip()
                if full_name:
                    authors.append(full_name)

        subjects = item.get("subject", [])
        categories = [normalize_whitespace(str(s)) for s in subjects if s]
        primary_category = categories[0] if categories else "General"

        pub_parts = item.get("published", {}).get("date-parts", [[]])[0]
        if len(pub_parts) >= 3:
            published = f"{pub_parts[0]:04d}-{pub_parts[1]:02d}-{pub_parts[2]:02d}"
        elif len(pub_parts) == 2:
            published = f"{pub_parts[0]:04d}-{pub_parts[1]:02d}-01"
        elif len(pub_parts) == 1:
            published = f"{pub_parts[0]:04d}-01-01"
        else:
            dt = item.get("created", {}).get("date-time", "")
            published = dt[:10] if len(dt) >= 10 else "2026-01-01"

        updated = published

        url = item.get("URL", f"https://doi.org/{doi}")

        records.append(
            PaperRecord(
                paper_id=doi,
                title=title,
                summary=summary,
                authors=authors,
                categories=categories,
                primary_category=primary_category,
                published=published,
                updated=updated,
                abs_url=url,
                pdf_url=url,
                comment=f"Crossref record {doi}",
            )
        )

    return records


def fetch_source_records(settings: Settings) -> list[PaperRecord]:
    """Goi source API, luu raw response, parse thanh records.
    Co che fallback tu dong doc snapshot local khi offline hoac API loi.
    """
    raw_response_path = settings.paths.raw_api_response
    raw_records_path = settings.paths.raw_records_json

    payload: dict[str, Any] | None = None

    if settings.refresh_source or not raw_response_path.exists():
        try:
            import urllib.parse
            query_params = urllib.parse.urlencode({
                "query": settings.source_query,
                "filter": settings.source_filter,
                "rows": settings.max_results,
            })
            url = f"https://api.crossref.org/works?{query_params}"
            req = urllib.request.Request(
                url,
                headers={"User-Agent": "DataPipelineLab/1.0 (mailto:student@vinuni.edu.vn)"},
            )
            with urllib.request.urlopen(req, timeout=10) as resp:
                if resp.status == 200:
                    payload = json.loads(resp.read().decode("utf-8"))
                    write_json(raw_response_path, payload)
        except Exception:
            # Fallback to local snapshot if available
            payload = None

    if payload is None:
        if raw_response_path.exists():
            payload = read_json(raw_response_path)
        else:
            raise FileNotFoundError(f"Cannot fetch from API and raw snapshot does not exist at {raw_response_path}")

    records = parse_crossref_payload(payload)

    # Save records list as JSON
    records_dict = [
        {
            "paper_id": r.paper_id,
            "title": r.title,
            "summary": r.summary,
            "authors": r.authors,
            "categories": r.categories,
            "primary_category": r.primary_category,
            "published": r.published,
            "updated": r.updated,
            "abs_url": r.abs_url,
            "pdf_url": r.pdf_url,
            "comment": r.comment,
        }
        for r in records
    ]
    write_json(raw_records_path, records_dict)

    return records


def load_raw_records(path: Path) -> list[PaperRecord]:
    """Doc JSON snapshot va map thanh `PaperRecord`."""
    data = read_json(path)
    return [
        PaperRecord(
            paper_id=item["paper_id"],
            title=item["title"],
            summary=item["summary"],
            authors=item.get("authors", []),
            categories=item.get("categories", []),
            primary_category=item.get("primary_category", "General"),
            published=item["published"],
            updated=item.get("updated", item["published"]),
            abs_url=item.get("abs_url", ""),
            pdf_url=item.get("pdf_url", ""),
            comment=item.get("comment", ""),
        )
        for item in data
    ]
