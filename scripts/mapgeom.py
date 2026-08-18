"""
Shared plane geometry for the map build scripts.

Two scripts turn source material into committed map data — build-europe-map.py
(Natural Earth vectors) and build-dagea-globe.py (a hand-drawn PNG) — and they
disagree about almost everything except what to do with a ring of points once
they have one. This is that part: simplify it, measure it, and find somewhere
inside it to put a label.

Nothing here knows about projections, pixels, or GeoJSON. Points are plain
(x, y) tuples in whatever space the caller is working in, and the tolerances are
in those same units.

The last section is the other thing they agree on: how a finished ring is
written down. Both scripts emit the same SVG subpath, the same flat coordinate
list, and the same unit record with a label anchor on it, so those live here too.

Stdlib only, deliberately. Adding shapely to generate two committed files would
be a dependency the repo carries forever for scripts that run once a year.
"""

import math


def seg_dist(p, a, b):
    """Distance from p to the SEGMENT ab — clamped, not the infinite line."""
    (x, y), (x1, y1), (x2, y2) = p, a, b
    dx, dy = x2 - x1, y2 - y1
    if dx == 0 and dy == 0:
        return math.hypot(x - x1, y - y1)
    t = max(0.0, min(1.0, ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy)))
    return math.hypot(x - (x1 + t * dx), y - (y1 + t * dy))


def simplify(pts, tol):
    """Douglas-Peucker over an OPEN polyline."""
    if len(pts) < 3:
        return pts
    dmax, idx = 0.0, 0
    for i in range(1, len(pts) - 1):
        d = seg_dist(pts[i], pts[0], pts[-1])
        if d > dmax:
            dmax, idx = d, i
    if dmax <= tol:
        return [pts[0], pts[-1]]
    return simplify(pts[:idx + 1], tol)[:-1] + simplify(pts[idx:], tol)


def simplify_ring(pts, tol):
    """Douglas-Peucker for a CLOSED ring.

    Running plain DP over a ring is subtly broken and it took a globe full of
    scratch marks across Africa to see it. GeoJSON rings repeat their first point
    at the end, so the DP baseline is first-to-last — a zero-length segment. Every
    vertex then measures its distance to a POINT rather than to a line, the
    recursion keeps whichever vertex is farthest from that one corner, and the
    result is long thin spikes through the middle of the shape.

    Dropping the duplicate is not enough on its own: the baseline becomes the edge
    between two ADJACENT vertices, which is tiny, so nothing simplifies. So split
    the ring at the vertex farthest from the first one and simplify the two halves
    as open polylines, which is what the baseline wants to be.
    """
    if len(pts) > 1 and pts[0] == pts[-1]:
        pts = pts[:-1]
    if len(pts) < 4:
        return pts
    x0, y0 = pts[0]
    far = max(range(1, len(pts)),
              key=lambda i: (pts[i][0] - x0) ** 2 + (pts[i][1] - y0) ** 2)
    first = simplify(pts[:far + 1], tol)
    second = simplify(pts[far:] + [pts[0]], tol)
    return first[:-1] + second[:-1]


def area(ring):
    """Shoelace, unsigned."""
    s = 0.0
    for i in range(len(ring)):
        x1, y1 = ring[i]
        x2, y2 = ring[(i + 1) % len(ring)]
        s += x1 * y2 - x2 * y1
    return abs(s) / 2.0


def inside(pt, ring):
    """Ray casting."""
    x, y = pt
    hit = False
    n = len(ring)
    for i in range(n):
        x1, y1 = ring[i]
        x2, y2 = ring[(i + 1) % n]
        if (y1 > y) != (y2 > y) and x < (x2 - x1) * (y - y1) / (y2 - y1) + x1:
            hit = not hit
    return hit


def edge_dist(pt, ring):
    n = len(ring)
    return min(seg_dist(pt, ring[i], ring[(i + 1) % n]) for i in range(n))


def pole(ring):
    """Pole of inaccessibility: the interior point farthest from the boundary,
    plus that distance. Returns (x, y, r).

    NOT the centroid, which was the first attempt and put Norway's label in the
    Norwegian Sea — the centroid of a crescent is outside the crescent, and half
    of Europe's interesting coastlines are crescents. The returned r is the radius
    of the largest circle that fits inside the shape, which lets a template decide
    whether a label FITS rather than guess from area.

    Coarse grid then local refinement. Exact enough for placing text, and cheap
    enough to run over seventy shapes without pulling in a geometry library.
    """
    xs = [p[0] for p in ring]
    ys = [p[1] for p in ring]
    min_x, max_x, min_y, max_y = min(xs), max(xs), min(ys), max(ys)

    best, br = None, -1.0
    steps = 24
    for i in range(steps + 1):
        for j in range(steps + 1):
            pt = (min_x + (max_x - min_x) * i / steps,
                  min_y + (max_y - min_y) * j / steps)
            if not inside(pt, ring):
                continue
            d = edge_dist(pt, ring)
            if d > br:
                best, br = pt, d
    if best is None:
        return (sum(xs) / len(xs), sum(ys) / len(ys), 0.0)

    span = max(max_x - min_x, max_y - min_y) / steps
    for _ in range(4):
        span /= 2.0
        cx, cy = best
        for dx in (-span, 0.0, span):
            for dy in (-span, 0.0, span):
                pt = (cx + dx, cy + dy)
                if not inside(pt, ring):
                    continue
                d = edge_dist(pt, ring)
                if d > br:
                    best, br = pt, d
    return (best[0], best[1], br)


# ── Serialising ─────────────────────────────────────────────────────────────

def svg_path(pts, close=True):
    """One `M x,y x,y … Z` subpath. A river is not closed, so it passes
    close=False."""
    return ("M" + " ".join(f"{x:.1f},{y:.1f}" for x, y in pts)
            + ("Z" if close else ""))


def flat_coords(pts, places):
    """[(lon, lat), …] -> [lon, lat, lon, lat, …], rounded for the wire.

    `places` is the caller's, because the two globes are drawn at different
    sizes and a digit that cannot reach a screen is bytes on the wire.
    """
    return [round(v, places) for pt in pts for v in pt]


def unit_record(parts, **extra):
    """The half of a serialised unit both scripts write identically.

    `parts` is [(d, area, ring), …], largest ring first. The label anchor is
    taken from that LARGEST ring alone, so France is labelled on the mainland
    rather than out in Corsica, and an archipelago is labelled on its biggest
    island rather than in the water between.

    Extras are merged AFTER the common fields, since that is where the callers'
    differing fields go; anything that has to come before them (name, parent)
    stays at the call site, which spreads this record into its own literal.
    """
    px, py, pr = pole(parts[0][2])
    return {
        "d": "".join(t[0] for t in parts),
        "cx": round(px, 1),
        "cy": round(py, 1),
        "r": round(pr, 1),
        "area": round(sum(t[1] for t in parts)),
        **extra,
    }
