"""Report OpenAPI error-response coverage for every documented endpoint.

Builds the application's OpenAPI schema and prints, per operation, the set of
documented status codes -- highlighting any operation that still only documents
the FastAPI defaults (``200``/``422``). Intended as a quick local check that the
``/docs``, ``/redoc`` and ``/scalar`` references show errors for every endpoint.

Usage:
    uv run python scripts/check_openapi_coverage.py
"""

import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

os.environ.setdefault("FASTAPI_ENV", "local")
os.environ.setdefault("MAIL_FROM", "test@example.com")

from app import app  # noqa: E402

DEFAULT_ONLY = {"200", "422"}


def main() -> int:
    schema = app.openapi()
    paths = schema.get("paths", {})
    methods = {"get", "post", "put", "delete", "patch"}

    total = 0
    thin = []
    for path, item in sorted(paths.items()):
        for method, operation in item.items():
            if method.lower() not in methods:
                continue
            total += 1
            codes = set(operation.get("responses", {}).keys())
            error_codes = sorted(c for c in codes if not c.startswith("2"))
            if codes <= DEFAULT_ONLY:
                thin.append(f"{method.upper():6} {path}")
            print(f"{method.upper():6} {path:45} -> {sorted(codes)} (errors: {error_codes})")

    print("\n" + "=" * 70)
    print(f"Total operations: {total}")
    print(f"Operations still documenting only {sorted(DEFAULT_ONLY)}: {len(thin)}")
    for line in thin:
        print(f"  - {line}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
