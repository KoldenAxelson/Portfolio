#!/usr/bin/env python3
"""Builds the data behind {{< ml/embedding-table >}} and {{< ml/nearest-rows >}}
from GPT-2's released weights.

Writes three files, all from GPT-2 small's token table (wte, 50,257 x 768):

  data/ml/embedding-table.json            a handful of real rows, in full
  static/img/ml/embedding-table/tower.png  the tower's face: an even sample of
                                           rows and columns, one grey level per
                                           number (the shader colours it)
  data/ml/nearest-rows.json               for a few tokens, the rows closest to
                                           theirs by cosine similarity, plus the
                                           average for two random rows

Needs numpy, tiktoken and Pillow, and network access to huggingface.co. Only the
token table is downloaded (about 154 MB, by HTTP range request), into a temp
folder that is deleted afterwards.

    python3 scripts/ml/build-embedding-table.py
"""

import base64
import json
import struct
import tempfile
import urllib.request
from pathlib import Path

import numpy as np
import tiktoken
from PIL import Image

REPO = Path(__file__).resolve().parents[2]
WEIGHTS_URL = "https://huggingface.co/openai-community/gpt2/resolve/main/model.safetensors"

# The sentence from the article, then the rows its later sections talk about.
SENTENCE = "The cat sat on the mat."
EXTRA_TOKENS = ["cat", " Cat", " Monday", " Tuesday", " SolidGoldMagikarp"]

# Row values are stored as int16 counts of VALUE_STEP: four decimals, and
# GPT-2's largest entry (about 1.79) still fits.
VALUE_STEP = 1e-4
HEAD_LENGTH = 5

# Nearest rows: compared over all 768 numbers, against every row in the table.
# Scores keep six decimals so the page's two-decimal labels round only once.
NEIGHBOUR_QUERIES = [" Monday", " seven", " cat", " red", " Paris", " king"]
NEIGHBOUR_COUNT = 8
BASELINE_PAIRS = 20000
BASELINE_SEED = 2026

# The tower face. Grey 128 is zero; COLOUR_CLIP and beyond are the darkest and
# lightest greys. About 96% of the table sits inside +-0.3.
TOWER_ROWS = 768
TOWER_COLUMNS = 128
COLOUR_CLIP = 0.3


def fetch_range(start: int, end_inclusive: int) -> bytes:
    request = urllib.request.Request(WEIGHTS_URL, headers={"Range": f"bytes={start}-{end_inclusive}"})
    with urllib.request.urlopen(request) as response:
        return response.read()


def load_token_table() -> np.ndarray:
    header_size = struct.unpack("<Q", fetch_range(0, 7))[0]
    header = json.loads(fetch_range(8, 8 + header_size - 1))
    begin, end = header["wte.weight"]["data_offsets"]
    data_start = 8 + header_size
    with tempfile.TemporaryDirectory() as scratch:
        path = Path(scratch) / "wte.bin"
        path.write_bytes(fetch_range(data_start + begin, data_start + end - 1))
        return np.fromfile(path, dtype="<f4").reshape(header["wte.weight"]["shape"]).copy()


def encode_row(values: np.ndarray) -> str:
    counts = np.round(values / VALUE_STEP).astype("<i2")
    return base64.b64encode(counts.tobytes()).decode("ascii")


def build_rows(table: np.ndarray) -> list[dict]:
    encoding = tiktoken.get_encoding("gpt2")
    rows = []
    sentence_ids = encoding.encode(SENTENCE)
    extra_ids = [encoding.encode(text) for text in EXTRA_TOKENS]
    for text, ids in zip(EXTRA_TOKENS, extra_ids):
        assert len(ids) == 1, f"{text!r} is more than one token: {ids}"
    for group, ids in [("sentence", sentence_ids), ("extra", [ids[0] for ids in extra_ids])]:
        for token_id in ids:
            values = table[token_id]
            rows.append({
                "group": group,
                "token": encoding.decode([token_id]),
                "id": token_id,
                "head": [round(float(v), 3) for v in values[:HEAD_LENGTH]],
                "values": encode_row(values),
            })
    return rows


def build_tower(table: np.ndarray) -> Image.Image:
    row_picks = np.linspace(0, table.shape[0] - 1, TOWER_ROWS).round().astype(int)
    column_picks = np.linspace(0, table.shape[1] - 1, TOWER_COLUMNS).round().astype(int)
    sample = table[np.ix_(row_picks, column_picks)]
    grey = np.clip(sample / COLOUR_CLIP, -1, 1) * 127.5 + 127.5
    return Image.fromarray(grey.round().astype(np.uint8), mode="L")


def build_neighbours(table: np.ndarray) -> dict:
    encoding = tiktoken.get_encoding("gpt2")
    unit_rows = table / np.linalg.norm(table, axis=1, keepdims=True)
    queries = []
    for text in NEIGHBOUR_QUERIES:
        ids = encoding.encode(text)
        assert len(ids) == 1, f"{text!r} is more than one token: {ids}"
        similarity = unit_rows @ unit_rows[ids[0]]
        nearest = [int(i) for i in np.argsort(-similarity) if i != ids[0]][:NEIGHBOUR_COUNT]
        queries.append({
            "token": text,
            "id": ids[0],
            "nearest": [{"token": encoding.decode([i]), "id": i, "similarity": round(float(similarity[i]), 6)} for i in nearest],
        })
    rng = np.random.default_rng(BASELINE_SEED)
    first, second = rng.integers(0, table.shape[0], (2, BASELINE_PAIRS))
    distinct = first != second
    baseline = float(np.mean(np.sum(unit_rows[first[distinct]] * unit_rows[second[distinct]], axis=1)))
    return {
        "_source": "Cosine similarity between rows of GPT-2 small's token table (wte). Built by scripts/ml/build-embedding-table.py; don't edit by hand.",
        "randomPairs": int(distinct.sum()),
        "randomAverage": round(baseline, 6),
        "queries": queries,
    }


def main() -> None:
    table = load_token_table()
    rows_total, width = table.shape
    data = {
        "_source": "GPT-2 small token table (wte), openai-community/gpt2 on Hugging Face. Built by scripts/ml/build-embedding-table.py; don't edit by hand.",
        "rows": rows_total,
        "width": width,
        "valueStep": VALUE_STEP,
        "colourClip": COLOUR_CLIP,
        "towerRows": TOWER_ROWS,
        "towerColumns": TOWER_COLUMNS,
        "sentence": SENTENCE,
        "tokens": build_rows(table),
    }
    data_path = REPO / "data/ml/embedding-table.json"
    data_path.write_text(json.dumps(data, indent=1, ensure_ascii=False) + "\n")

    tower_path = REPO / "static/img/ml/embedding-table/tower.png"
    tower_path.parent.mkdir(parents=True, exist_ok=True)
    build_tower(table).save(tower_path, optimize=True)

    neighbours_path = REPO / "data/ml/nearest-rows.json"
    neighbours_path.write_text(json.dumps(build_neighbours(table), indent=1, ensure_ascii=False) + "\n")
    print(f"wrote {data_path.relative_to(REPO)}, {tower_path.relative_to(REPO)} and {neighbours_path.relative_to(REPO)}")


if __name__ == "__main__":
    main()
