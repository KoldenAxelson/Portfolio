"""Chapter 5 workbook: Reshape and Combine. Solutions."""
from pathlib import Path

import pandas as pd

# ── Part 1: predict the rows ─────────────────────────────────────────────

PREDICTIONS = {
    "requests.merge(owners, on='endpoint')": 5,
    "requests.merge(owners, on='endpoint', how='left')": 6,
    "requests.merge(owners, on='endpoint', how='outer')": 7,
    "owners.merge(requests, on='endpoint', how='left')": 6,
    "requests.merge(owners, on='endpoint', how='left', validate='many_to_one')": 6,
    "requests.merge(shifts, on='endpoint')": 8,
    "requests.merge(shifts, on='endpoint', how='left')": 9,
    "requests.merge(shifts, on='endpoint', how='left', validate='many_to_one')": "error",
    "pd.concat([requests, requests])": 12,
    "requests.groupby('endpoint').size()": 3,
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
    """Requests in each hour, every hour from the first to the last, empty
    hours counted 0. groupby on the hour would skip the empty ones; resample
    makes a bin for each."""
    return logs.resample("h", on="time").size()


def hourly_report(requests_path: Path, owners_path: Path) -> pd.DataFrame:
    """Requests per endpoint per hour of the day, with each endpoint's team.
    A left merge keeps the endpoints nobody owns."""
    logs = pd.read_csv(requests_path)
    owners = pd.read_csv(owners_path)
    logs["hour"] = pd.to_datetime(logs["time"]).dt.hour
    counts = logs.groupby(["endpoint", "hour"]).agg(requests=("ms", "size")).reset_index()
    return counts.merge(owners, on="endpoint", how="left")


# ── Part 3: fix the bugs ─────────────────────────────────────────────────

def parse_times(stamps: pd.Series) -> pd.Series:
    """Day-first stamps as datetimes.

    Without a format, to_datetime read '01/09/2026' month first, and it only
    notices the mistake when a day is over 12. The format says which number
    is which."""
    return pd.to_datetime(stamps, format="%d/%m/%Y %H:%M")


def response_seconds(logs: pd.DataFrame) -> pd.Series:
    """Each request's ms in seconds.

    apply(axis=1) called a Python function once per row; dividing the whole
    column is one vectorized step."""
    return logs["ms"] / 1000
