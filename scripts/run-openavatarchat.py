"""Project-owned OpenAvatarChat launcher with secret-safe logging.

The upstream logger adds its file sink without a level, so INFO-level handler
configuration (including API credentials) can be written even when the chosen
runtime level is WARNING. This wrapper keeps the upstream service untouched
while applying the configured level to every sink and redacting key-shaped
tokens defensively.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path
from typing import Any

from loguru import logger


REPO_ROOT = Path(__file__).resolve().parent.parent
OPENAVATAR_SRC = REPO_ROOT / "components" / "openavatarchat" / "src"
sys.path.insert(0, str(OPENAVATAR_SRC))

import demo  # noqa: E402


SECRET_PATTERN = re.compile(r"sk-[A-Za-z0-9_-]{10,}")


def redact_secrets(record: dict[str, Any]) -> bool:
    record["message"] = SECRET_PATTERN.sub(
        "[REDACTED_API_KEY]",
        str(record["message"]),
    )
    return True


def configure_safe_loggers(logger_config: Any) -> None:
    log_level = logger_config.log_level
    logger.info(f"Set log level to {log_level}")
    logger.remove()
    logger.add(
        sys.stdout,
        level=log_level,
        filter=redact_secrets,
    )
    logger.add(
        "logs/log.log",
        level=log_level,
        rotation="10 MB",
        retention=10,
        encoding="utf-8",
        enqueue=True,
        filter=redact_secrets,
    )


if __name__ == "__main__":
    demo.config_loggers = configure_safe_loggers
    demo.main()
