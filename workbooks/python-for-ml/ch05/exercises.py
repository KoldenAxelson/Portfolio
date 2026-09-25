"""Chapter 5 workbook: Reshape and Combine.

Three parts. Replace every `None` prediction and every
`raise NotImplementedError`, and fix the two functions marked FIX, then run
`pytest`.
"""
from pathlib import Path

import pandas as pd

# ── Part 1: predict the rows ─────────────────────────────────────────────
# Three small tables (build them with example_tables() to check your guesses
# afterwards):
#
#   requests: 6 rows, one per request: /login 3 times, /search twice, /health once
#   owners:   3 rows, one team per endpoint: /login, /search, /billing
#   shifts:   4 rows, who is on call: /login twice (two people), /search, /upload
#
# requests → owners is many-to-one: many requests, one owner row per endpoint.
# requests → shifts is many-to-many, because /login repeats on both sides.
# For each line, write how many rows its result has, as an int, or the string
# "error" if pandas raises. Work it out first, then check with
# `pytest -k predict_rows`.

PREDICTIONS = {
    "requests.merge(owners, on='endpoint')": None,
    "requests.merge(owners, on='endpoint', how='left')": None,
    "requests.merge(owners, on='endpoint', how='outer')": None,
    "owners.merge(requests, on='endpoint', how='left')": None,
    "requests.merge(owners, on='endpoint', how='left', validate='many_to_one')": None,
    "requests.merge(shifts, on='endpoint')": None,
    "requests.merge(shifts, on='endpoint', how='left')": None,
    "requests.merge(shifts, on='endpoint', how='left', validate='many_to_one')": None,
    "pd.concat([requests, requests])": None,
    "requests.groupby('endpoint').size()": None,
}


def example_tables() -> dict[str, pd.DataFrame]:
    """The three tables Part 1 is about, to check your predictions with."""
    return {
        "requests": pd.DataFrame({
            "endpoint": ["/login", "/search", "/login", "/health", "/login", "/search"],
            "ms": [110, 320, 95, 4, 130, 350],
        }),
        "owners": pd.DataFrame({"endpoint": ["/login", "/search", "/billing"], "team": ["identity", "search", "payments"]}),
        "shifts": pd.DataFrame({"endpoint": ["/login", "/login", "/search", "/upload"], "person": ["ana", "ben", "cai", "dee"]}),
    }


# ── Part 2: requests per endpoint per hour ───────────────────────────────

def requests_per_hour(logs: pd.DataFrame) -> pd.Series:
    """How many requests arrived in each hour: a Series indexed by the start
    of each hour (a Timestamp such as 2026-09-01 09:00), with one entry for
    every hour from the first request's to the last one's, including hours
    with no requests (count 0).

    `logs` has a datetime column `time` (already converted) and one row per
    request."""
    raise NotImplementedError("requests_per_hour: bin the rows by hour and count each bin")


def hourly_report(requests_path: Path, owners_path: Path) -> pd.DataFrame:
    """Load data/requests.csv and data/owners.csv (passed in as paths) and
    count the requests to each endpoint in each hour of the day, with the
    team that owns the endpoint:

    - columns endpoint, hour, requests and team, in that order;
    - one row per endpoint and hour that had at least one request, sorted by
      endpoint, then hour, and numbered 0, 1, 2… (a fresh index);
    - hour is the hour of the day as a whole number (9 for 09:00–09:59);
      every request in the file is on the same day;
    - every endpoint that had a request stays, even with no owner (its team
      is missing, NaN), and an owner with no requests adds no rows.

    Hints: the time column is text until you convert it. Group by two keys,
    count, then bring the keys back as columns (reset_index(), or
    as_index=False) before the merge.
    """
    raise NotImplementedError("hourly_report: to_datetime, .dt.hour, groupby + agg, then merge")


# ── Part 3: fix the bugs ─────────────────────────────────────────────────

def parse_times(stamps: pd.Series) -> pd.Series:
    """FIX: the export writes times day first, 'DD/MM/YYYY HH:MM', so
    '01/09/2026 09:05' is 1 September. Return them as datetimes. This version
    reads them month first, as 9 January, and on these stamps it says
    nothing."""
    return pd.to_datetime(stamps)


def response_seconds(logs: pd.DataFrame) -> pd.Series:
    """FIX: correct, but slow. Each request's ms in seconds (ms / 1000), one
    value per row. It calls a Python function once per row; rewrite it as one
    vectorized expression. The test times it against the quickest loop,
    logs['ms'].apply(...), and wants it at least 10× faster."""
    return logs.apply(lambda row: row["ms"] / 1000, axis=1)
