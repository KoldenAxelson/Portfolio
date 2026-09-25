"""Checks for the Chapter 5 workbook. Run `pytest` in this folder."""
import time
from pathlib import Path

import numpy as np
import pandas as pd
import pytest

import exercises

DATA = Path(__file__).parent / "data"

# What an error means, found from its message, so a crash fails with a reason.
MESSAGE_HINTS = [
    ("with datetimelike values", "The time column is text until pd.to_datetime converts it; .dt only works on datetimes."),
    ("Invalid frequency: H", "pandas 3 spells an hour 'h', in lower case."),
    ("but got an instance of 'RangeIndex'", "resample needs to know which column holds the times: resample('h', on='time')."),
    ("doesn't match format", "Give to_datetime the day-first format, format='%d/%m/%Y %H:%M' (%d day, %m month, %Y year, %H hour, %M minute)."),
    ("unconverted data remains", "The format has to cover the whole stamp, time included: format='%d/%m/%Y %H:%M'."),
    ("is not the name of the index", "Several keys go to groupby as one list: groupby(['endpoint', 'hour'])."),
]

# What the same error type means in any exercise.
GENERAL_HINTS = {
    KeyError: "A KeyError names a column that isn't in the table: check the spelling, and put several column names in a list, ['endpoint', 'hour'].",
}


def slip_hint(error):
    """The hint that fits this error's message, or its type, or ''."""
    message = str(error)
    for text, hint in MESSAGE_HINTS:
        if text in message:
            return hint
    general = [GENERAL_HINTS[kind] for kind in type(error).__mro__ if kind in GENERAL_HINTS]
    return (general + [""])[0]


def call(function, *args):
    """Run an exercise, turning an unwritten one, or one that raises, into a plain failure."""
    try:
        return function(*args)
    except NotImplementedError as todo:
        pytest.fail(f"Not written yet: {todo}")
    except (KeyError, IndexError, TypeError, ValueError, AttributeError, pd.errors.MergeError) as error:
        pytest.fail(f"{function.__name__} raised {type(error).__name__}: {first_line(error)} {slip_hint(error)}".rstrip())


def first_line(error):
    """The first line of an error's message, ending in one full stop."""
    text = (str(error).strip().splitlines() or [""])[0]
    for noise in (". You might want to try", ". Failed to parse with error message"):
        text = text.split(noise)[0]
    text = text.rstrip(" .:")
    return text if text.endswith("?") else f"{text}."


def expect_type(value, kind, name, hint=""):
    if not isinstance(value, kind):
        pytest.fail(f"{name} returned {type(value).__name__}, not a {kind.__name__}. {hint}".rstrip())


# ── Part 1 ───────────────────────────────────────────────────────────────

WHY = {
    "requests.merge(owners, on='endpoint')": (
        "inner is the default, and it keeps only keys found in both tables: /login's 3 requests and /search's 2. "
        "/health has no owner and nobody called /billing, so both fall off"),
    "requests.merge(owners, on='endpoint', how='left')": (
        "a left merge keeps every request, and each one finds at most one owner row, so 6 rows, with /health's team NaN"),
    "requests.merge(owners, on='endpoint', how='outer')": (
        "outer keeps every key from both tables: the 6 requests, plus one row for /billing, which nobody called"),
    "owners.merge(requests, on='endpoint', how='left')": (
        "owners is on the left now: /login's row meets 3 requests, /search's 2, and /billing, with none, keeps one row "
        "with NaN: 3 + 2 + 1"),
    "requests.merge(owners, on='endpoint', how='left', validate='many_to_one')": (
        "each endpoint appears once in owners, so the check passes and this is the plain left merge"),
    "requests.merge(shifts, on='endpoint')": (
        "/login is in shifts twice, so each of its 3 requests pairs with both people: 3 × 2, plus /search's 2 × 1"),
    "requests.merge(shifts, on='endpoint', how='left')": (
        "the 8 matched rows, plus /health, which has no shift and keeps one row with NaN"),
    "requests.merge(shifts, on='endpoint', how='left', validate='many_to_one')": (
        "/login repeats in shifts, so this isn't many-to-one, and pandas raises a MergeError instead of multiplying rows"),
    "pd.concat([requests, requests])": "concat puts the second table under the first: 6 + 6",
    "requests.groupby('endpoint').size()": "one row per group, and there are three endpoints: /health, /login and /search",
}


def actual_rows(expression):
    names = {"pd": pd, **exercises.example_tables()}
    try:
        return len(eval(expression, names))
    except pd.errors.MergeError:
        return "error"


@pytest.mark.parametrize("expression", list(WHY))
def test_predict_rows(expression):
    guess = exercises.PREDICTIONS.get(expression)
    if guess is None:
        pytest.fail(f'Predict {expression} in PREDICTIONS: a number of rows, like 4, or "error".')
    if isinstance(guess, str) and guess.strip().isdigit():
        pytest.fail(f'{expression}: write the number without quotes, {guess.strip()}, not {guess!r}.')
    if isinstance(guess, bool) or not (isinstance(guess, int) or guess == "error"):
        pytest.fail(f'{expression}: write a whole number of rows, like 4, or the string "error", not {guess!r}.')
    actual = actual_rows(expression)
    assert guess == actual, f"{expression}: you predicted {guess!r}, but it gives {actual!r}: {WHY[expression]}."


# ── Part 2 ───────────────────────────────────────────────────────────────

def logs_at(*stamps):
    return pd.DataFrame({"time": pd.to_datetime(list(stamps)), "endpoint": "/login", "ms": 100})


def check_per_hour(logs, expected):
    got = call(exercises.requests_per_hour, logs)
    expect_type(got, pd.Series, "requests_per_hour",
                "size() counts the rows in each bin as one Series; count() gives a count per column.")
    if not isinstance(got.index, pd.DatetimeIndex):
        pytest.fail(
            f"requests_per_hour is indexed by {list(got.index)}; expected the start of each hour, like "
            f"{expected.index[0]}. Grouping by .dt.hour gives hour numbers and skips the hours with no requests; "
            "resample('h', on='time') gives a Timestamp per hour, empty hours included."
        )
    missing = [str(t) for t in expected.index if t not in got.index]
    if missing:
        pytest.fail(
            f"requests_per_hour has no row for {', '.join(missing)}. An hour with no requests belongs in the result "
            "with 0: resample makes a bin for every hour, where groupby makes one only for the hours that appear."
        )
    extra = [str(t) for t in got.index if t not in expected.index]
    assert not extra, f"requests_per_hour has rows for {', '.join(extra)}; expected hours {[str(t) for t in expected.index]}."
    wrong = {str(t): got[t] for t in expected.index if got[t] != expected[t]}
    assert not wrong, (
        f"requests_per_hour gave {wrong}; expected {({str(t): int(expected[t]) for t in wrong})}: "
        "the number of rows whose time falls in each hour."
    )


def test_requests_per_hour():
    logs = logs_at("2026-09-01 09:02", "2026-09-01 09:40", "2026-09-01 10:05", "2026-09-01 12:30", "2026-09-01 12:31")
    hours = pd.date_range("2026-09-01 09:00", periods=4, freq="h")
    check_per_hour(logs, pd.Series([2, 1, 0, 2], index=hours))


def test_requests_per_hour_past_midnight():
    logs = logs_at("2026-09-02 22:10", "2026-09-02 23:59", "2026-09-03 01:05")
    hours = pd.date_range("2026-09-02 22:00", periods=4, freq="h")
    check_per_hour(logs, pd.Series([1, 1, 0, 1], index=hours))


COLUMNS = ["endpoint", "hour", "requests", "team"]
REPORT = pd.DataFrame(
    [
        ("/health", 9, 1, np.nan), ("/health", 10, 1, np.nan), ("/health", 12, 1, np.nan),
        ("/login", 9, 2, "identity"), ("/login", 10, 2, "identity"), ("/login", 12, 1, "identity"),
        ("/search", 9, 2, "search"), ("/search", 10, 1, "search"), ("/search", 12, 1, "search"),
        ("/upload", 10, 1, "storage"), ("/upload", 12, 1, "storage"),
    ],
    columns=COLUMNS,
)


MISSING_COLUMN_HINTS = {
    "hour": "Make hour a column of its own, logs['hour'] = ….dt.hour, group by ['endpoint', 'hour'], and bring both "
            "keys back as columns with reset_index() before the merge (a merge on endpoint drops an index level called hour).",
    "requests": "Name the count: agg(requests=('ms', 'size')), or size().reset_index(name='requests').",
}


def report_differences(got, expected, owners):
    if set(["endpoint", "hour"]) & set(got.index.names):
        return [f"endpoint and hour are in the index ({list(got.index.names)}); bring them back as columns with "
                "reset_index(), or group with as_index=False."]
    notes = []
    missing_columns = [c for c in COLUMNS if c not in got.columns]
    if missing_columns:
        return [f"Columns {missing_columns} are missing; expected {COLUMNS}, in that order."] + [
            MISSING_COLUMN_HINTS[c] for c in missing_columns if c in MISSING_COLUMN_HINTS]
    if list(got.columns) != COLUMNS:
        notes.append(f"The columns are {list(got.columns)}; expected {COLUMNS}, in that order.")
    if pd.api.types.is_datetime64_any_dtype(got["hour"]):
        return notes + ["hour holds timestamps; it should be the hour of the day as a whole number, 9 for 09:00–09:59: .dt.hour."]
    got_pairs = list(zip(got["endpoint"], got["hour"]))
    expected_pairs = list(zip(expected["endpoint"], expected["hour"]))
    lost = sorted({e for e, h in expected_pairs if (e, h) not in got_pairs})
    for endpoint in lost:
        if endpoint in set(owners):
            notes.append(f"Rows for {endpoint} are missing, though it had requests.")
            continue
        notes.append(
            f"Rows for {endpoint} are missing: nobody owns it, but its requests still count, so it keeps its rows with "
            "team NaN. An inner merge, a dropna, or grouping by team (groupby leaves out missing keys) loses them; "
            "merge with how='left'."
        )
    extra = sorted({e for e, h in got_pairs if e not in set(expected["endpoint"])})
    for endpoint in extra:
        notes.append(f"There are rows for {endpoint}, which nobody called: an outer merge keeps it; use how='left'.")
    if notes:
        return notes
    if set(got_pairs) != set(expected_pairs):
        return [f"The (endpoint, hour) rows are {sorted(set(got_pairs))}; expected {expected_pairs}."]
    if got_pairs != expected_pairs:
        notes.append(f"The rows are in the order {got_pairs}; sort by endpoint, then hour (groupby's keys come sorted).")
    if not got.index.equals(pd.RangeIndex(len(got))):
        notes.append(f"The index is {list(got.index)}; number the rows 0, 1, 2… (reset_index(drop=True)).")
    for column in ["hour", "requests"]:
        if not pd.api.types.is_integer_dtype(got[column]):
            notes.append(f"{column} has dtype {got[column].dtype}; expected whole numbers (an int dtype).")
    return notes


def check_report(requests_path, owners_path, expected):
    got = call(exercises.hourly_report, requests_path, owners_path)
    expect_type(got, pd.DataFrame, "hourly_report")
    owners = pd.read_csv(owners_path)["endpoint"]
    notes = report_differences(got, expected, owners)
    if not notes:
        paired = got.set_index(["endpoint", "hour"])
        for endpoint, hour, requests, team in expected.itertuples(index=False):
            if paired.loc[(endpoint, hour), "requests"] != requests:
                notes.append(f"requests for {endpoint} at {hour}:00 is {paired.loc[(endpoint, hour), 'requests']}; expected {requests}.")
            got_team = paired.loc[(endpoint, hour), "team"]
            if not (pd.isna(got_team) and pd.isna(team)) and got_team != team:
                notes.append(f"team for {endpoint} is {got_team!r}; expected {team!r}" + (" (nobody owns it)" if pd.isna(team) else "") + ".")
    if notes:
        pytest.fail("hourly_report doesn't match the expected table yet:\n- " + "\n- ".join(notes[:6]))
    try:
        pd.testing.assert_frame_equal(got.astype({"hour": "int64", "requests": "int64"}), expected,
                                      check_dtype=False)
    except AssertionError as difference:
        pytest.fail(f"hourly_report is close, but pandas still finds a difference: {difference}")


def test_hourly_report():
    check_report(DATA / "requests.csv", DATA / "owners.csv", REPORT)


def test_hourly_report_other_files(tmp_path):
    requests = tmp_path / "requests.csv"
    owners = tmp_path / "owners.csv"
    requests.write_text(
        "time,endpoint,ms\n2026-09-02 08:10,/search,300\n2026-09-02 08:20,/api,50\n"
        "2026-09-02 08:50,/search,280\n2026-09-02 13:05,/api,60\n"
    )
    owners.write_text("endpoint,team\n/api,platform\n")
    expected = pd.DataFrame(
        [("/api", 8, 1, "platform"), ("/api", 13, 1, "platform"), ("/search", 8, 2, np.nan)], columns=COLUMNS,
    )
    check_report(requests, owners, expected)


# ── Part 3 ───────────────────────────────────────────────────────────────

def check_parsed(stamps, expected):
    got = call(exercises.parse_times, stamps)
    expect_type(got, pd.Series, "parse_times")
    if not pd.api.types.is_datetime64_any_dtype(got):
        pytest.fail(f"parse_times returned dtype {got.dtype}; expected datetimes, from pd.to_datetime.")
    wrong = [(stamp, value) for stamp, value, want in zip(stamps, got, expected) if value != want]
    if wrong:
        stamp, value = wrong[0]
        pytest.fail(
            f"parse_times read {stamp!r} as {value}; expected {expected[list(stamps).index(stamp)]}. "
            "The export writes the day first, DD/MM/YYYY: read it with format='%d/%m/%Y %H:%M' (or dayfirst=True). "
            "Without a format, to_datetime reads it month first, and says nothing while every day is 12 or less."
        )


def test_parse_times():
    stamps = pd.Series(["01/09/2026 09:05", "02/09/2026 10:15", "03/09/2026 23:40"])
    check_parsed(stamps, pd.to_datetime(["2026-09-01 09:05", "2026-09-02 10:15", "2026-09-03 23:40"]))


def test_parse_times_day_over_12():
    stamps = pd.Series(["12/09/2026 08:00", "13/09/2026 09:30"])
    check_parsed(stamps, pd.to_datetime(["2026-09-12 08:00", "2026-09-13 09:30"]))


def reference_seconds(logs):
    """The quickest loop: apply on the one column, a Python call per value."""
    return logs["ms"].apply(lambda ms: ms / 1000)


def fastest_seconds(function, logs, repeats):
    best = float("inf")
    for _ in range(repeats):
        start = time.perf_counter()
        function(logs)
        best = min(best, time.perf_counter() - start)
    return best


def test_response_seconds():
    rng = np.random.default_rng(0)
    logs = pd.DataFrame({"endpoint": "/login", "ms": rng.integers(1, 3000, size=100_000)})
    got = call(exercises.response_seconds, logs)
    expect_type(got, pd.Series, "response_seconds")
    assert len(got) == len(logs), f"response_seconds gave {len(got)} values; expected one per row, {len(logs)}."
    assert np.allclose(got.to_numpy(dtype=float), logs["ms"].to_numpy() / 1000), (
        f"response_seconds starts {got.head(3).tolist()}; expected {(logs['ms'].head(3) / 1000).tolist()}: ms / 1000."
    )
    looped = fastest_seconds(reference_seconds, logs, repeats=3)
    yours = fastest_seconds(exercises.response_seconds, logs, repeats=3)
    assert yours * 10 <= looped, (
        f"response_seconds took {yours * 1000:.1f} ms against {looped * 1000:.1f} ms for logs['ms'].apply(…); it needs "
        "to be at least 10× faster. apply, on rows or on one column, calls a Python function once per value; divide "
        "the whole column instead, logs['ms'] / 1000."
    )
