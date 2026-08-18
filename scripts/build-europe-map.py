#!/usr/bin/env python3
"""
Generate data/europe.json — the Europe basemap the /misc/genes map draws.

WHY THIS EXISTS. The site is Node-free and does not pull geometry at build time
or at runtime. This script is run BY HAND, once, and its output is committed.
Nothing in `make build` invokes it. Re-run it only to change the projection, the
clip window, or the simplification tolerance.

    python3 scripts/build-europe-map.py

SOURCE. Natural Earth 1:50m "Admin 0 – map subunits", fetched from the official
vector repo. Natural Earth is public domain: "no permission is needed to use
Natural Earth. Crediting the authors is unnecessary." So there is no attribution
obligation baked into the page — the credit in this header is courtesy, not
licence compliance.

    https://github.com/nvkelso/natural-earth-vector
    https://www.naturalearthdata.com/about/terms-of-use/

SUBUNITS, not countries, because the United Kingdom is four of them. That single
choice is what lets the map show England at 31.5% and Scotland at 13.3% instead
of one flat UK blob, which would have thrown away the most specific data on the
page. It also splits Belgium into its three regions, which the Belgian label can
use.

PROJECTION. Lambert azimuthal equal-area centred on 55°N 15°E — the standard
choice for Europe (it is what EPSG:3035 uses) and the reason Scandinavia is not
grotesque here. Web Mercator would have inflated Norway to roughly the visual
weight of Spain, which on a map whose whole job is comparing sizes of places is
an actively wrong picture.

SIMPLIFICATION. Douglas–Peucker, hand-rolled in scripts/mapgeom.py rather than
pulled from a library, because adding shapely to generate two committed files
would be a dependency the repo carries forever for scripts that run once a year
at most. That module also holds the area and label-placement helpers, and is
shared with build-dagea-globe.py — which traces its rings out of a PNG instead
of a shapefile, and then wants precisely the same things done to them.
Tolerance is in projected units, tuned so the shipped SVG stays small enough to
inline without the coastlines going visibly polygonal.
"""

import json
import math
import sys
import urllib.request
from pathlib import Path

# Ring geometry — simplify, area, pole of inaccessibility — and the serialising
# that follows it are shared with scripts/build-dagea-globe.py, which needs
# exactly the same treatment applied to contours traced out of a PNG. See
# scripts/mapgeom.py.
sys.path.insert(0, str(Path(__file__).resolve().parent))
from mapgeom import (area, flat_coords, simplify_ring,   # noqa: E402
                     svg_path, unit_record)

SRC = ("https://raw.githubusercontent.com/nvkelso/natural-earth-vector"
       "/master/geojson/ne_50m_admin_0_map_subunits.geojson")

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "data" / "europe.json"
OUT_GLOBE = ROOT / "assets" / "geo" / "globe.json"
CACHE = Path("/tmp/ne_50m_admin_0_map_subunits.geojson")

# Coarse lon/lat prefilter — generous, only there to keep the projection from
# chewing on Kamchatka. The frame is decided later, in projected space.
LON_MIN, LON_MAX = -32.0, 62.0
LAT_MIN, LAT_MAX = 24.0, 76.0

# The frame is fitted to these and nothing else: every subunit the ancestry data
# actually points at, plus Sweden and Italy so the neighbours read as a continent.
# Everything else on the map is context and gets cut wherever the frame falls.
#
# Clipping happens in PROJECTED space, not in degrees. Clipping in degrees was the
# first attempt and it looked wrong for a reason worth writing down: a straight
# line of longitude is a curve once projected, so the eastern cut through Russia
# came out as a huge slanted wedge and the southern cut sliced North Africa on the
# diagonal. The frame has to be a rectangle in the space the rectangle is drawn in.
CORE = ["ENG", "SCT", "WLS", "NIR", "IRL", "NOR", "DNK", "FIN", "SWE", "DEU",
        "AUT", "FXX", "NLD", "BFR", "BWR", "BCR", "CHE", "ESX", "PRX", "POL",
        "UKR", "BLR", "ITX"]
MARGIN = 0.06           # fraction of the core extent left as breathing room

# Projection centre.
LON0, LAT0 = 15.0, 55.0

WIDTH = 1000.0          # viewBox width; height is derived from the data
TOLERANCE = 0.55        # Douglas–Peucker, in output units
MIN_AREA = 1.2          # drop rings smaller than this (µ-states, rocks)

# Subunits that are politically European but geographically elsewhere, or so far
# offshore they only add empty ocean. Dropping them tightens the frame.
DROP = {"NSV", "NJM", "FRO", "ISL", "ALD", "GRL", "ATF", "SGS", "FLK", "SHN"}

# ── The globe ──────────────────────────────────────────────────────────────
# A second output, and a different KIND of output. The flat map ships paths that
# are already projected, because its projection never changes. The globe changes
# projection every frame, so it has to ship raw lon/lat and project in the
# browser. Same source, same simplifier, different stage to stop at.
GLOBE_TOL = 0.35        # degrees; ~39 km, against ~32 km per pixel on a 400px globe
GLOBE_MIN_AREA = 0.25   # square degrees
GLOBE_DROP = {"ATA"}    # Antarctica wraps the pole and breaks limb clipping
GLOBE_PLACES = 1        # decimals kept on the wire; see build_globe


def fetch():
    if not CACHE.exists():
        print(f"fetching {SRC}")
        urllib.request.urlretrieve(SRC, CACHE)
    return json.loads(CACHE.read_text())


def clip(ring, box):
    """Sutherland–Hodgman against an axis-aligned rectangle (x0, y0, x1, y1)."""
    x0, y0, x1, y1 = box

    def inside(p, edge):
        x, y = p
        return {"w": x >= x0, "e": x <= x1, "s": y >= y0, "n": y <= y1}[edge]

    def intersect(p, q, edge):
        (ax, ay), (bx, by) = p, q
        if edge in ("w", "e"):
            xe = x0 if edge == "w" else x1
            t = (xe - ax) / (bx - ax)
            return (xe, ay + t * (by - ay))
        ye = y0 if edge == "s" else y1
        t = (ye - ay) / (by - ay)
        return (ax + t * (bx - ax), ye)

    out = ring
    for edge in ("w", "e", "s", "n"):
        if not out:
            return []
        buf, prev = [], out[-1]
        for cur in out:
            ci, pi = inside(cur, edge), inside(prev, edge)
            if ci:
                if not pi:
                    buf.append(intersect(prev, cur, edge))
                buf.append(cur)
            elif pi:
                buf.append(intersect(prev, cur, edge))
            prev = cur
        out = buf
    return out


def project(lon, lat):
    """Lambert azimuthal equal-area. Returns unscaled x/y, y already flipped so
    north is up in SVG's downward-y space."""
    l0, p0 = math.radians(LON0), math.radians(LAT0)
    l, p = math.radians(lon), math.radians(lat)
    d = 1 + math.sin(p0) * math.sin(p) + math.cos(p0) * math.cos(p) * math.cos(l - l0)
    if d <= 0:
        return None
    k = math.sqrt(2.0 / d)
    x = k * math.cos(p) * math.sin(l - l0)
    y = k * (math.cos(p0) * math.sin(p) - math.sin(p0) * math.cos(p) * math.cos(l - l0))
    return x, -y


def rings_of(geom):
    t, c = geom["type"], geom["coordinates"]
    if t == "Polygon":
        return list(c)
    if t == "MultiPolygon":
        return [r for poly in c for r in poly]
    return []


def main():
    data = fetch()

    # Pass 1: project everything inside the coarse window, keeping full rings.
    raw = {}
    for feat in data["features"]:
        p = feat["properties"]
        code = p.get("SU_A3")
        if not code or code in DROP:
            continue
        kept = []
        for ring in rings_of(feat["geometry"]):
            pts = [(pt[0], pt[1]) for pt in ring]
            if not any(LON_MIN <= x <= LON_MAX and LAT_MIN <= y <= LAT_MAX for x, y in pts):
                continue
            projected = [q for q in (project(x, y) for x, y in pts) if q]
            if len(projected) < 3:
                continue
            kept.append(projected)
        if not kept:
            continue
        raw[code] = {"name": p.get("SUBUNIT") or p.get("ADMIN"), "rings": kept}

    missing = [c for c in CORE if c not in raw]
    if missing:
        raise SystemExit(f"core subunits missing from source: {missing}")

    # Pass 2: the frame is the extent of CORE plus a margin, in projected units.
    core_x = [x for c in CORE for r in raw[c]["rings"] for x, _ in r]
    core_y = [y for c in CORE for r in raw[c]["rings"] for _, y in r]
    x0, x1 = min(core_x), max(core_x)
    y0, y1 = min(core_y), max(core_y)
    mx, my = (x1 - x0) * MARGIN, (y1 - y0) * MARGIN
    box = (x0 - mx, y0 - my, x1 + mx, y1 + my)

    scale = WIDTH / (box[2] - box[0])
    height = (box[3] - box[1]) * scale

    # Pass 3: clip to the frame, scale into the viewBox, simplify, serialise.
    out = {}
    for code, rec in sorted(raw.items()):
        parts = []
        for ring in rec["rings"]:
            cl = clip(ring, box)
            if len(cl) < 3:
                continue
            sc = [((x - box[0]) * scale, (y - box[1]) * scale) for x, y in cl]
            sm = simplify_ring(sc, TOLERANCE)
            if len(sm) < 3:
                continue
            a = area(sm)
            if a < MIN_AREA:
                continue
            parts.append((svg_path(sm), a, sm))
        if not parts:
            continue
        parts.sort(key=lambda t: -t[1])              # largest ring first
        out[code] = {"name": rec["name"], **unit_record(parts)}

    payload = {
        "_meta": {
            "source": "Natural Earth 1:50m Admin 0 map subunits (public domain)",
            "url": "https://github.com/nvkelso/natural-earth-vector",
            "projection": f"Lambert azimuthal equal-area, centred {LAT0}N {LON0}E",
            "generated_by": "scripts/build-europe-map.py",
            "note": "Committed output. Nothing in `make build` regenerates this.",
        },
        "viewBox": f"0 0 {WIDTH:.0f} {height:.0f}",
        "units": out,
    }
    OUT.write_text(json.dumps(payload, separators=(",", ":")))
    kb = OUT.stat().st_size / 1024
    print(f"wrote {OUT} — {len(out)} subunits, {kb:.0f} KB, viewBox {payload['viewBox']}")

    build_globe(data)


def build_globe(data):
    """Second pass over the same source, stopping at lon/lat.

    Coordinates are rounded to one decimal — 0.1 degrees is about 11 km, and a
    400-pixel globe resolves about 32 km per pixel, so the extra digits were
    bytes on the wire that could never reach a screen. That rounding is most of
    why this file is small enough to fetch.
    """
    out = {}
    for feat in data["features"]:
        p = feat["properties"]
        code = p.get("SU_A3")
        if not code or code in DROP or code in GLOBE_DROP:
            continue
        rings = []
        for ring in rings_of(feat["geometry"]):
            pts = [(pt[0], pt[1]) for pt in ring]
            sm = simplify_ring(pts, GLOBE_TOL)
            if len(sm) < 3 or area(sm) < GLOBE_MIN_AREA:
                continue
            rings.append(flat_coords(sm, GLOBE_PLACES))
        if not rings:
            continue
        out[code] = {"name": p.get("SUBUNIT") or p.get("ADMIN"), "rings": rings}

    payload = {
        "_meta": {
            "source": "Natural Earth 1:50m Admin 0 map subunits (public domain)",
            "generated_by": "scripts/build-europe-map.py",
            "note": "lon/lat degrees, flat [lon,lat,lon,lat,...] per ring.",
        },
        "units": out,
    }
    OUT_GLOBE.parent.mkdir(parents=True, exist_ok=True)
    OUT_GLOBE.write_text(json.dumps(payload, separators=(",", ":")))
    pts = sum(len(r) // 2 for u in out.values() for r in u["rings"])
    kb = OUT_GLOBE.stat().st_size / 1024
    print(f"wrote {OUT_GLOBE} — {len(out)} subunits, {pts} points, {kb:.0f} KB")


if __name__ == "__main__":
    main()
