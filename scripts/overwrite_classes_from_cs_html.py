#!/usr/bin/env python3
"""
Overwrite public.classes using required CS curriculum HTML.

This parses `CS classes.html`, extracts real course codes + titles + credits,
then replaces *all* rows in `public.classes` with only those courses.

It intentionally ignores elective placeholders (e.g. "CS Electives") and rows
without a valid course code.

Run from project root:

  pip install -r scripts/requirements.txt

  # 1) Preview only — prints a table for review (default; no DB access)
  python scripts/overwrite_classes_from_cs_html.py

  # 2) After review, publish to Supabase (requires service role key)
  export SUPABASE_URL=https://your-project.supabase.co
  export SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
  python scripts/overwrite_classes_from_cs_html.py --publish

  Optionally override HTML path:
  export CS_CLASSES_HTML="path/to/file.html"

Inputs:
  - CS classes.html (in project root by default)
"""

from __future__ import annotations

import argparse
import html
import os
import re
import sys
from pathlib import Path

# Script lives in <project_root>/scripts/ so parent resolves to project root
PROJECT_ROOT = Path(__file__).resolve().parent.parent
os.chdir(PROJECT_ROOT)

# Load .env if present (no dependency on python-dotenv)
_env_file = PROJECT_ROOT / ".env"
if _env_file.exists():
    for _line in _env_file.read_text().splitlines():
        _line = _line.strip()
        if _line and not _line.startswith("#") and "=" in _line:
            _k, _, _v = _line.partition("=")
            os.environ.setdefault(_k.strip(), _v.strip())

HTML_PATH = Path(os.environ.get("CS_CLASSES_HTML", "CS classes.html"))


def assign_coop_metadata(courses: list[dict]) -> None:
    """
    Rows whose course_id starts with COOP are co-op work-term catalog entries.
    Sequences 1..n are assigned in course_id sort order (not digits inside the code —
    e.g. COOP2011 vs COOP4012).
    """
    coop = [c for c in courses if c["course_code"].upper().startswith("COOP")]
    coop.sort(key=lambda c: c["course_code"])
    coop_ids = {c["course_code"] for c in coop}
    for i, c in enumerate(coop, start=1):
        c["class_kind"] = "coop"
        c["coop_sequence"] = i
    for c in courses:
        if c["course_code"] not in coop_ids:
            c["class_kind"] = "study"
            c["coop_sequence"] = None


def extract_courses_from_html(html_path: Path) -> list[dict]:
    if not html_path.exists():
        print(f"HTML file not found: {html_path}", file=sys.stderr)
        sys.exit(1)

    with open(html_path, encoding="utf-8") as f:
        content = f.read()

    courses: list[dict] = []

    # Parse per-table so we can detect "option" tables (e.g. science options)
    table_pattern = r'(<table[^>]*id="(?P<table_id>table_\d+)"[^>]*>.*?</table>)'
    table_blocks = re.findall(table_pattern, content, re.DOTALL)

    for table_html, table_id in table_blocks:
        # Caption/group title often contains "Select one of ..."
        caption_match = re.search(r'<h3 class="group-title">(.*?)</h3>', table_html, re.DOTALL)
        caption_text = re.sub(r"<[^>]+>", "", caption_match.group(1)).strip() if caption_match else ""
        is_option_table = bool(re.search(r"\bSelect one\b", caption_text, re.IGNORECASE))
        option_group = f"OPT_{table_id}"

        tbody_matches = re.findall(r'<tbody class="sort">(.*?)</tbody>', table_html, re.DOTALL)
        for tbody in tbody_matches:
            tr_matches = re.findall(r"<tr>(.*?)</tr>", tbody, re.DOTALL)
            for tr in tr_matches:
                td_matches = re.findall(r"<td[^>]*>(.*?)</td>", tr, re.DOTALL)
                if len(td_matches) < 3:
                    continue

                td0_clean = re.sub(r"<[^>]+>", "", td_matches[0])
                td1_clean = re.sub(r"<[^>]+>", "", td_matches[1])
                row_text = f"{td0_clean}\n{td1_clean}"

                # Credits are in third td; take first numeric value (ranges -> first number)
                credits_match = re.search(r"(\d+(?:\.\d+)?)", td_matches[2])
                if not credits_match:
                    continue
                credits = float(credits_match.group(1))

                # 1) Preferred: course code in first td
                first_code_match = re.search(r"\b([A-Z]{2,5}\d{4}[A-Z]?)\b", td0_clean)
                if first_code_match:
                    course_code = re.sub(r"\s+", "", first_code_match.group(1)).upper()
                    if credits == 0 and not course_code.startswith("COOP"):
                        # Skip 0-credit "process" rows unless explicitly requested (e.g. COOP)
                        continue

                    title_clean = td1_clean.strip()
                    title_clean = re.sub(r"\s*\([^)]+\)\s*", "", title_clean).strip()
                    title = title_clean if title_clean and len(title_clean) > 3 else course_code
                    title = html.unescape(title)

                    subj_match = re.match(r"^([A-Z]+)", course_code)
                    subject = subj_match.group(1) if subj_match else "UNK"

                    courses.append(
                        {
                            "course_code": course_code,
                            "title": title,
                            "credits": credits,
                            "subject": subject,
                            "is_option": bool(is_option_table),
                            "option_group": option_group if is_option_table else None,
                        }
                    )
                    continue

                # 2) Option rows: no code in first td, but codes appear in description like "(PHYS2001)"
                option_codes = re.findall(r"\(([A-Z]{2,5}\d{4}[A-Z]?)\)", row_text)
                if not option_codes:
                    continue

                for oc in option_codes:
                    course_code = re.sub(r"\s+", "", oc).upper()
                    subj_match = re.match(r"^([A-Z]+)", course_code)
                    subject = subj_match.group(1) if subj_match else "UNK"
                    courses.append(
                        {
                            "course_code": course_code,
                            "title": course_code,
                            # Some instruction rows show 0 credits; keep as-is so the course exists in catalog.
                            "credits": credits,
                            "subject": subject,
                            "is_option": True,
                            "option_group": option_group,
                        }
                    )

    # Deduplicate by course_code, keeping first
    out_by_code: dict[str, dict] = {}
    for c in courses:
        code = c["course_code"]
        if code not in out_by_code:
            out_by_code[code] = c
            continue
        existing = out_by_code[code]
        # Prefer a non-option (explicit course row) over an option-only entry
        if existing.get("is_option") and not c.get("is_option"):
            out_by_code[code] = c
        # If both are option entries, keep the first but ensure option group is present
        elif existing.get("is_option") and c.get("is_option") and not existing.get("option_group"):
            existing["option_group"] = c.get("option_group")

    out = list(out_by_code.values())
    assign_coop_metadata(out)
    return out


def print_preview_table(courses: list[dict]) -> None:
    """Print a review table to stdout."""
    if not courses:
        print("(No courses extracted.)")
        return

    headers = [
        "course_id",
        "title",
        "credits",
        "subject",
        "class_kind",
        "coop_seq",
        "is_option",
        "option_group",
    ]
    rows = [
        [
            c["course_code"],
            (c["title"][:48] + "…") if len(c["title"]) > 49 else c["title"],
            c["credits"],
            c["subject"],
            c.get("class_kind", "study"),
            c.get("coop_sequence") if c.get("class_kind") == "coop" else "",
            "yes" if c.get("is_option") else "",
            (c.get("option_group") or "")[:24],
        ]
        for c in sorted(courses, key=lambda x: x["course_code"])
    ]

    try:
        from tabulate import tabulate

        print(tabulate(rows, headers=headers, tablefmt="github"))
    except ImportError:
        # Fallback: fixed columns
        col_w = [12, 42, 7, 8, 10, 8, 8, 26]
        def pad(i: int, s: str) -> str:
            return (s or "")[: col_w[i]].ljust(col_w[i])

        line = " ".join(h.ljust(col_w[i]) for i, h in enumerate(headers))
        print(line)
        print("-" * len(line))
        for row in rows:
            print(" ".join(pad(i, str(v)) for i, v in enumerate(row)))


def publish_to_supabase(courses: list[dict]) -> None:
    url = os.environ.get("SUPABASE_URL", "").strip()
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "").strip()
    if not url or not key:
        print("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.", file=sys.stderr)
        sys.exit(1)

    # Guard: anon/publishable keys cannot bypass RLS — writes will be blocked.
    if key.startswith("sb_publishable_") or (key.startswith("eyJ") and '"role":"anon"' in key):
        print(
            "\n[ERROR] SUPABASE_SERVICE_ROLE_KEY looks like the anon/publishable key.\n"
            "  This script needs the SERVICE ROLE key to bypass RLS.\n"
            "  Go to: Supabase Dashboard → Project Settings → API\n"
            "  Copy the key labelled 'service_role' (starts with sb_secret_...)\n"
            "  and set it as SUPABASE_SERVICE_ROLE_KEY in your .env file.\n",
            file=sys.stderr,
        )
        sys.exit(1)

    try:
        from supabase import create_client
    except ImportError:
        print("Install deps: pip install -r scripts/requirements.txt", file=sys.stderr)
        sys.exit(1)

    client = create_client(url, key)

    # Delete all existing classes (re-seed from scratch)
    client.table("classes").delete().gt("universal_class_id", 0).execute()

    rows = []
    for i, c in enumerate(courses, start=1):
        ck = c.get("class_kind", "study")
        csq = c.get("coop_sequence")
        row = {
            "universal_class_id": i,
            "subject": c["subject"],
            "course_id": c["course_code"],
            "title": c["title"],
            "credits": c["credits"],
            "is_option": bool(c.get("is_option", False)),
            "option_group": c.get("option_group"),
            "class_kind": ck,
            "coop_sequence": csq if ck == "coop" else None,
        }
        rows.append(row)

    batch_size = 500
    for i in range(0, len(rows), batch_size):
        client.table("classes").insert(rows[i : i + batch_size]).execute()

    print(f"\nInserted {len(rows)} rows into public.classes", file=sys.stderr)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Extract CS courses from HTML; preview table or publish to Supabase."
    )
    parser.add_argument(
        "--publish",
        action="store_true",
        help="Write to Supabase (requires SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY). "
        "Without this flag, only prints the preview table.",
    )
    args = parser.parse_args()

    courses = extract_courses_from_html(HTML_PATH)
    print(f"Extracted {len(courses)} unique courses from {HTML_PATH}\n", file=sys.stderr)
    print_preview_table(courses)

    if not args.publish:
        print(
            "\nPreview only — no database changes. "
            "Review the table above, then run:\n  python scripts/overwrite_classes_from_cs_html.py --publish",
            file=sys.stderr,
        )
        return

    publish_to_supabase(courses)


if __name__ == "__main__":
    main()
