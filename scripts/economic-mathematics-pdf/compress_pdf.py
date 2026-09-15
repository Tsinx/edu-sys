#!/usr/bin/env python3
"""Losslessly rewrite a PDF with PyMuPDF garbage collection and deflate only."""

from __future__ import annotations

import sys
from pathlib import Path

import fitz


def main() -> None:
    if len(sys.argv) != 3:
        raise RuntimeError("Usage: compress_pdf.py INPUT.pdf OUTPUT.pdf")
    source = Path(sys.argv[1]).resolve()
    destination = Path(sys.argv[2]).resolve()
    with fitz.open(source) as document:
        document.save(
            destination,
            garbage=4,
            deflate=True,
            clean=False,
        )


if __name__ == "__main__":
    main()
