#!/usr/bin/env python3
"""Merge Chromium lesson PDFs, add course metadata/bookmarks, and verify output."""

from __future__ import annotations

import json
import hashlib
import os
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

from pypdf import PdfReader, PdfWriter


def fail(message: str) -> None:
    raise RuntimeError(message)


def count_top_level_outline_items(items: list[object]) -> int:
    return sum(1 for item in items if not isinstance(item, list))


def top_level_outline_items(items: list[object]) -> list[object]:
    return [item for item in items if not isinstance(item, list)]


def validate_page_geometry(reader: PdfReader, label: str) -> None:
    for page_number, page in enumerate(reader.pages, start=1):
        width = float(page.mediabox.width)
        height = float(page.mediabox.height)
        if abs(width - 1200) > 0.01 or abs(height - 750) > 0.01:
            fail(
                f"{label} page {page_number} has unexpected size: "
                f"{width} x {height} pt"
            )


def validate_bookmarks(
    reader: PdfReader, bookmarks: list[dict[str, object]], label: str
) -> None:
    items = top_level_outline_items(reader.outline)
    if len(items) != len(bookmarks):
        fail(
            f"{label} bookmark count mismatch: expected {len(bookmarks)}, "
            f"found {len(items)}"
        )
    for item, expected in zip(items, bookmarks, strict=True):
        expected_title = (
            f"第{int(expected['lesson']):02d}讲 {expected['title']}"
        )
        if getattr(item, "title", None) != expected_title:
            fail(
                f"{label} bookmark title mismatch: expected {expected_title}, "
                f"found {getattr(item, 'title', None)}"
            )
        actual_page = reader.get_destination_page_number(item)
        if actual_page != int(expected["page"]):
            fail(
                f"{label} bookmark page mismatch for lesson {expected['lesson']}: "
                f"expected {expected['page']}, found {actual_page}"
            )


def main() -> None:
    if len(sys.argv) != 4:
        fail("Usage: finalize_pdf.py MANIFEST.json OUTPUT.pdf PYMUPDF_PYTHON")

    manifest_path = Path(sys.argv[1]).resolve()
    output_path = Path(sys.argv[2]).resolve()
    pymupdf_python = Path(sys.argv[3]).resolve()
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    parts = manifest.get("parts", [])
    bookmarks = manifest.get("bookmarks", [])
    metadata = manifest.get("metadata", {})
    title = metadata.get("title", "经济数学：完整课程教学 Slides（2026）")
    subject = metadata.get(
        "subject", "重庆交通大学商科本科一年级基础课 · 64学时 · 32讲"
    )
    if not parts:
        fail("PDF manifest contains no parts")
    if not bookmarks:
        fail("PDF manifest contains no bookmarks")

    writer = PdfWriter()
    page_offset = 0
    total_pages = 0
    for part in parts:
        part_path = Path(part["path"]).resolve()
        reader = PdfReader(part_path)
        actual_pages = len(reader.pages)
        expected_pages = int(part["expectedPages"])
        if actual_pages != expected_pages:
            fail(
                f"Part {part['label']} page count mismatch: "
                f"expected {expected_pages}, found {actual_pages}"
            )
        writer.append(reader, import_outline=False)
        page_offset += actual_pages
        total_pages += actual_pages

    for bookmark in bookmarks:
        page_number = int(bookmark["page"])
        if page_number < 0 or page_number >= total_pages:
            fail(
                f"Bookmark for lesson {bookmark['lesson']} points outside PDF: "
                f"{page_number} / {total_pages}"
            )
        writer.add_outline_item(
            f"第{int(bookmark['lesson']):02d}讲 {bookmark['title']}",
            page_number=page_number,
        )

    now = datetime.now(timezone.utc).astimezone()
    pdf_date = now.strftime("D:%Y%m%d%H%M%S%z")
    writer.add_metadata(
        {
            "/Title": title,
            "/Author": "edu-sys 经济数学课程",
            "/Subject": subject,
            "/Keywords": "经济数学, 微积分, 商科, 重庆交通大学, 教学课件",
            "/Creator": "edu-sys Economic Mathematics PDF Exporter",
            "/Producer": "Chromium PDF engine and pypdf",
            "/CreationDate": pdf_date,
            "/ModDate": pdf_date,
        }
    )

    output_path.parent.mkdir(parents=True, exist_ok=True)
    staged_path = output_path.with_suffix(output_path.suffix + ".uncompressed.tmp")
    compressed_path = output_path.with_suffix(output_path.suffix + ".compressed.tmp")
    staged_path.unlink(missing_ok=True)
    compressed_path.unlink(missing_ok=True)
    with staged_path.open("wb") as stream:
        writer.write(stream)

    reopened = PdfReader(staged_path)
    if len(reopened.pages) != total_pages:
        fail(
            f"Final page count mismatch: expected {total_pages}, "
            f"found {len(reopened.pages)}"
        )
    validate_page_geometry(reopened, "Final PDF")
    validate_bookmarks(reopened, bookmarks, "Final PDF")
    outline_count = count_top_level_outline_items(reopened.outline)
    if reopened.metadata.title != title or reopened.metadata.subject != subject:
        fail("Final PDF scope metadata is missing or incorrect")

    text_hashes = [
        hashlib.sha256((page.extract_text() or "").encode("utf-8")).digest()
        for page in reopened.pages
    ]
    compressor = Path(__file__).with_name("compress_pdf.py")
    subprocess.run(
        [str(pymupdf_python), str(compressor), str(staged_path), str(compressed_path)],
        check=True,
    )

    compressed = PdfReader(compressed_path)
    if len(compressed.pages) != total_pages:
        fail(
            f"Compressed page count mismatch: expected {total_pages}, "
            f"found {len(compressed.pages)}"
        )
    validate_page_geometry(compressed, "Compressed PDF")
    validate_bookmarks(compressed, bookmarks, "Compressed PDF")
    if compressed.metadata.title != title or compressed.metadata.subject != subject:
        fail("Compressed PDF scope metadata is missing or incorrect")
    compressed_text_hashes = [
        hashlib.sha256((page.extract_text() or "").encode("utf-8")).digest()
        for page in compressed.pages
    ]
    if compressed_text_hashes != text_hashes:
        fail("Compressed PDF text changed")

    raw_size = staged_path.stat().st_size
    compressed_size = compressed_path.stat().st_size
    staged_path.unlink(missing_ok=True)

    os.replace(compressed_path, output_path)
    print(
        json.dumps(
            {
                "pages": total_pages,
                "bookmarks": outline_count,
                "rawBytes": raw_size,
                "compressedBytes": compressed_size,
                "output": str(output_path),
            },
            ensure_ascii=False,
        )
    )


if __name__ == "__main__":
    main()
