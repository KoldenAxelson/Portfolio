#!/usr/bin/env python3
"""
Generate the Dagea map data the /misc/dagea page draws, from the hand-drawn
original in private/dagea-source.png.

WHY THIS EXISTS. Dagea is a world Konrad drew by hand: coastlines in black ink
over a tan field, with rivers, roads, settlements and place names layered on top
in green, pink and teal. This script reads the picture and keeps only the black —
the coastlines — because that is the layer that is a SHAPE. Everything else on
the drawing is annotation, and annotation belongs on a flat map where it can be
read, not smeared around the curve of a sphere.

    python3 scripts/build-dagea-globe.py [-q]   # -q drops the per-landmass table

Run BY HAND, like scripts/build-europe-map.py, and its two outputs are committed.
Nothing in `make build` invokes it. Re-run it when the drawing changes, or when
the framing or the tolerances below want adjusting. It takes about fifteen
seconds.

THE SOURCE IS NOT IN THE REPOSITORY. private/ is gitignored, so a fresh clone has
the outputs and not the drawing, and this script will stop with `missing source
artwork`. That is the same deal build-europe-map.py has with Natural Earth — the
committed JSON is the artefact, the input is fetched or kept by hand — and the
same fix applies: put the drawing back at the path below and re-run. Any 8-bit,
non-interlaced PNG of the same map will do; nothing here depends on its exact
size, only on black ink over a light field.

    data/dagea/map.json      the flat basemap — SVG paths in the drawing's own
                               composition. This is the no-JS fallback and the
                               copy that carries the region names as real text.
                               It sits in a directory beside the hand-written
                               regions.yaml because Hugo keys data files by
                               filename: data/dagea.json and data/dagea.yaml
                               would both land on site.Data.dagea and fight.
    assets/geo/dagea.json    lon/lat rings for the globe, fetched at runtime.

Same two-output split as build-europe-map.py, for the same reason: the flat map's
projection never changes so it ships already projected, and the globe's changes
every frame so it ships raw coordinates and projects in the browser.

HOW THE PICTURE BECOMES POLYGONS. Five steps, none of them clever.

  1. INK. Threshold on luminance. The tan field sits at about 172 and the pen at
     about 8, so anything under 110 is a stroke — a wide gate, which is what
     catches the antialiased edge of the pen as well as its core. The gate has to
     be wide: at 70 the coastlines were still visually closed but had pinholes
     that step 3 poured through, and half the continents came out as hollow
     outlines. That failure is silent and reads as a rendering bug three files
     away, so if this is ever retuned, watch `land fraction` in the output — the
     script refuses to write a file when it lands somewhere implausible.

  2. DESPECKLE. The coastal hatching is drawn in a brown dark enough to clear a
     gate set that wide, so drop every ink blob under MIN_INK pixels. Each
     coastline is one enormous blob and survives; the hatch marks are thousands
     of tiny ones and do not.

  3. LAND BY EXCLUSION. Flood the ocean inward from the border of the image,
     across everything that is not ink. Whatever the flood cannot reach is
     enclosed by a coastline, and is therefore land. This is why the strokes have
     to be closed and why step 1 is tuned the way it is: the drawing does not
     label its interiors, so the only definition of "inside" available is "the
     water could not get here". The ink itself counts as land, which puts the
     polygon boundary down the middle of the pen rather than along one side.

  4. OPEN. Erode, then dilate. Where a hatch mark touches a coastline it is part
     of the coastline's own blob, so step 2 cannot reach it and the traced outline
     comes out hairy — hundreds of small spikes standing off the coasts like
     stubble. Width is the only thing that distinguishes a hatch mark from a
     coastline, so width is what this filters on.

  5. TRACE. Moore-neighbour boundary following around each landmass, then
     Douglas-Peucker.

RESOLUTION. All of that runs at the full 2795 x 2160. Halving it first was
tempting — four times fewer pixels, and the simplifier throws away more detail
than the downsample ever would — but it quietly cost a landmass: the islet in the
Sea of Coin sits close enough to Feldia's south coast that at half scale their
hatching bridged, the islet joined the continent's ink blob, and it stopped
existing as a place you could click. Sixteen seconds is cheap; a missing island
is not.

REGIONS. The drawing has no political borders on it, so a region here is a set of
landmasses, claimed by rectangle in source pixel coordinates — measure a box off
the original in any image editor and it will work. Claims are tested in order and
the first match wins, so overlapping boxes are fine and are used: the Bagii Isles
box sits inside the much larger Feldia box, and is listed first.

Nothing is unclaimed on the current drawing, and the script says so if that ever
stops being true. An unclaimed landmass still draws — it just cannot be selected,
which is the right failure: a new island appears as land the moment it is drawn,
and joins a country when someone says which one.

WHERE THE WORLD SITS ON THE SPHERE. A drawing is not a projection of anything, so
this is a choice rather than a calculation, and CLIMATE is what makes the choice.
The drawing is read as plate carree — one pixel is the same number of degrees in
both directions — and then placed with two numbers:

    LAT_NORTH   the latitude of the northernmost thing drawn. Pinned high,
                because the Erika Fjords are snow and mountain tops and belong up
                where snow is plausible — 71.25N leaves about nineteen degrees of
                open water between the top of the fjords and the pole itself.

                This is the number that costs something, and it has an upper
                bound you can see. Plate carree spaces meridians evenly and a
                globe does not: a degree of longitude is about a third of its
                equatorial width at 71N, and a sixth at 80N. The northern islands
                are therefore drawn onto a strip of sphere narrower than the
                strip of paper they came from, and they read compressed
                east-west. At 71 that is a tightening. At 81.67 — which this was,
                briefly — the fjords visibly smear toward the pole. Everything
                from Feldia south is unaffected either way.

    LAT_SPAN    how much latitude the whole drawing covers. Small enough that
                Keravia, which is desert, lands near the equator instead of down
                in the roaring forties where nothing is a desert.

Those two settle everything else: longitude follows from the aspect ratio at the
same degrees-per-pixel, centred on the middle of the drawn CONTENT rather than
the middle of the canvas — the canvas has a wide empty right margin that would
otherwise shove the world west.

The consequence is a world that fills a face of its sphere without wrapping it:
about 104 degrees of longitude and 98 of latitude, hanging from the fjords at 71N
down to 26S, with the rest open sea. Scaling it up to wrap the globe would put
the fjords on the equator and the desert in the ice, and stretching it sideways
to get there would smear shapes somebody drew by hand. An empty ocean is the
cheapest of the three lies, and the only one that is not also wrong about the
weather.

Both tolerances below are in degrees, so both move when LAT_SPAN does — see the
note on them.
"""

import json
import math
import struct
import sys
import zlib
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from mapgeom import (area, flat_coords, simplify, simplify_ring,   # noqa: E402
                     svg_path, unit_record)

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "private" / "dagea-source.png"
OUT_FLAT = ROOT / "data" / "dagea" / "map.json"
OUT_GLOBE = ROOT / "assets" / "geo" / "dagea.json"

VERBOSE = "-q" not in sys.argv

# ── Reading the picture ─────────────────────────────────────────────────────
INK_MAX_LUM = 110       # below this is a pen stroke; see step 1 above
MIN_INK = 320           # ink blobs smaller than this (px) are hatching
MIN_LAND = 240          # land smaller than this (px) is noise, not an island
OPEN_RADIUS = 4         # structuring element for step 4, in px
BORDER_WIDTH = 7        # how thick an authored border is rasterised, in px
EXTEND_STEP = 6         # how far a border end steps as it runs on, in px
EXTEND_LIMIT = 520      # how far it may run before giving up, in px
MIN_SUBREGION = 400     # a piece smaller than this is coastline noise, not land
MOUTH_INSET = 2.0       # how far inside the coast a river stops, in px

# ── Roughness ───────────────────────────────────────────────────────────────
# An authored polyline is a handful of points and reads like one: borders arrive
# as straight runs between corners, and nothing on a real map does that. Rivers
# meander because water takes the easy way and then undercuts it; mountain
# chains kink because they are made of collided plates; even political borders
# that "follow the mountains" inherit the mountains' wobble.
#
# So every authored line gets recursive midpoint displacement before it is used
# for anything — see roughen() for how that works and why endpoints never move.
#
# The noise is a hash of (feature id, level, index), not a random number
# generator. The output of this script is committed, so a re-run has to produce
# the same file or every rebuild is a diff — and a seeded global generator would
# still drift the moment features are added or reordered.
ROUGH_BORDER = 0.085    # sideways push as a fraction of segment length
ROUGH_RIVER = 0.115     # water wanders more than politics
ROUGH_LEVELS = 5        # each level doubles the point count

# ── The flat map ────────────────────────────────────────────────────────────
FLAT_WIDTH = 1000.0     # viewBox width; height follows the source aspect
FLAT_TOL = 0.8          # Douglas-Peucker, in viewBox units
FLAT_MIN_AREA = 1.0     # drop rings smaller than this, in viewBox units squared

# ── The globe ───────────────────────────────────────────────────────────────
LAT_NORTH = 71.25       # latitude of the northernmost drawn point — see above
LAT_SPAN = 97.5         # degrees of latitude the drawn content covers
# In DEGREES, so both scale with LAT_SPAN — a tolerance left behind when the world
# shrinks keeps the same absolute error against shapes that got smaller, which is
# a much larger fraction of an islet in the Bagii Atoll. Keep GLOBE_TOL
# proportional to LAT_SPAN and GLOBE_MIN_AREA proportional to its square.
GLOBE_TOL = 0.12        # degrees; about 0.3 of a pixel on a 460px globe
GLOBE_MIN_AREA = 0.028  # square degrees

# ── Regions ─────────────────────────────────────────────────────────────────
# Claim boxes are (x0, y0, x1, y1) in SOURCE pixels. First match wins, so the
# order below is load-bearing: the island groups are listed before the two
# continents whose boxes swallow them.
#
# These are landmasses, not countries: a claim box assigns whole landmasses to a
# region and never anything finer. Feldia's box takes the whole northern
# continent, which the drawing labels Feldia in the west and the Wastes in the
# east; the Spine — the RNG entry in BORDERS below — is what cuts that one shape
# into the duchies and the Wastes named in SUBREGIONS. The names and the prose
# behind all of them live in data/dagea/regions.yaml, not here.
REGIONS = [
    ("BGI", "Bagii Isles",     (100, 1130,  780, 1400)),
    ("JRK", "Jrakvia",         (380, 1440,  800, 2160)),
    ("BGA", "Bagii Atoll",    (1700, 1500, 2400, 2160)),
    ("ERK", "Erka Fjords",     (280,    0, 1800,  540)),
    ("KRT", "Kretavia",        (780, 1300, 1830, 2160)),
    ("FEL", "Feldia",          (300,  380, 2500, 1520)),
]


# ── Internal geography ──────────────────────────────────────────────────────
# Everything above this line is READ OFF THE DRAWING. Everything below it is
# AUTHORED — the borders, rivers and lakes that the drawing either only suggests
# or does not have at all, written here as polylines and polygons in source pixel
# coordinates so they live in the same space as the claim boxes and can be
# measured off the original in any image editor.
#
# That split is the honest one. The coastlines are Konrad's hand; the duchy
# borders are not, and pretending otherwise by baking them into the PNG would
# lose the distinction the moment anyone asked "did you draw this or did the
# script?". The answer is in which table it appears in.
#
# BORDERS subdivide a landmass. Each is a polyline plus a rule for what to do
# with its ENDS — both / start / end / none, defined at the BORDERS table below.
#
# SUBREGIONS name the areas the borders cut, each by a seed point that must land
# inside it. Fragments the borders leave over — the ragged Sea of Coin shore
# makes several — are given to whichever seed is nearest, so an inlet does not
# have to be traced to be assigned.
#
# RIVERS are drawn, not filled: polylines that stay polylines all the way to the
# browser. LAKES are closed polygons, and are water — rivers are cut against them
# exactly as they are cut against the sea.
#
# There is no table of mountain ranges. The Spine appears once, as a border, and
# that is deliberate: see NO MOUNTAIN RANGES ARE SHIPPED below the tables.
# ── Hydrology first ─────────────────────────────────────────────────────────
# Rivers are authored BEFORE borders, because several borders are rivers. Real
# political boundaries follow water far more often than they follow anything
# else — water is visible, it is agreed on, and it was there before the
# argument. Straight lines between round numbers of degrees are a New World
# habit and they look like one.
#
# Each river runs SOURCE FIRST. The last point is the mouth, and every river has
# to end somewhere real: at the sea, in a lake, or on another river. The script
# checks that and complains, because a river that stops in a field is the single
# most obvious way for a fantasy map to look like nobody thought about it.
RIVERS = [
    # The trunk. Rises on the Spine, crosses Feldia west then turns south to the
    # Sea of Coin, and is a duchy border for its entire length.
    ("KRN", "The Korn", [(1872, 786), (1706, 826), (1596, 856), (1486, 884),
                         (1392, 908), (1316, 934), (1268, 972), (1234, 1032),
                         (1210, 1092), (1180, 1150), (1160, 1204)]),
    # Off the Spine, joins the Korn where the Korn turns south.
    ("MRW", "The March Water", [(1878, 962), (1730, 1004), (1620, 1032),
                                (1510, 1052), (1408, 1042), (1330, 1010),
                                (1268, 972)]),
    ("KRO", "The Kron", [(906, 596), (868, 672), (826, 754), (784, 836),
                         (740, 918), (700, 992), (656, 1052)]),
    ("WLD", "The Waldwater", [(1052, 950), (1046, 840), (1042, 740), (1036, 640),
                              (1032, 492)]),
    ("SLT", "The Silt", [(1230, 900), (1258, 812), (1288, 726), (1310, 648),
                         (1318, 596)]),
    ("STW", "The Steinwater", [(1826, 556), (1770, 496), (1712, 452), (1672, 414)]),
    # Drains the Waldsee into the Kron, which is why the lake has an outlet.
    ("WSR", "The Waldsee Race", [(916, 800), (868, 822), (820, 838), (784, 836)]),
    # Kretavia. Both empty into the Sea of Coin off the Sahalim coast.
    ("GRW", "The Green Water", [(1168, 1566), (1156, 1450), (1148, 1340)]),
    ("SLW", "The Slow Water", [(1330, 1600), (1300, 1500), (1286, 1396)]),
]

# Lakes are authored as closed polygons and are WATER: rivers are cut against
# them exactly as they are cut against the sea, so a river can end at a lake
# shore and another can leave it. Both of these sit on a river for that reason —
# a lake with no inflow and no outlet is a puddle that has been on the map for
# ten thousand years.
LAKES = [
    ("KMR", "Kornmere", [(1276, 918), (1300, 900), (1332, 898), (1358, 910),
                         (1368, 934), (1354, 958), (1326, 968), (1296, 958),
                         (1278, 940)]),
    ("WLS", "Waldsee", [(910, 766), (934, 752), (962, 758), (974, 780),
                        (964, 804), (938, 814), (916, 798)]),
]

# ── Borders ─────────────────────────────────────────────────────────────────
# (id, landmass, which ends run on to the coast, segments)
#
# A segment is ("pts", [...]) for literal geometry or ("river", id, t0, t1) for a
# stretch of a river, where t runs 0 at the source to 1 at the mouth — see
# resolve_border() for why a border that follows a river IS that river.
#
# Ends: "both" / "start" / "end" run that end on to the coast; "none" stops it
# where it is, for a junction with another border. An end left running at a
# junction carries straight on through the duchy on the far side, quietly
# merging two regions that were supposed to be separate.
BORDERS = [
    # The Spine. The one straight-ish border on the map, and the one that has
    # earned it: it is a mountain wall, and mountain walls do not meander.
    ("RNG", "FEL", "both", [("pts", [(1878, 396), (1870, 520), (1854, 680),
                                     (1846, 850), (1858, 1010), (1888, 1150),
                                     (1928, 1290), (1958, 1425)])]),
    # Kronstadt from Waldheim: down to the Kron's spring, then the Kron to the sea.
    ("K1", "FEL", "both", [("pts", [(922, 512), (912, 552), (906, 596)]),
                           ("river", "KRO", 0.0, 1.0)]),
    # Waldheim from Kornfeld: the Waldwater from its mouth up to its spring, then
    # on over the divide to meet the Seehaven line.
    ("W1", "FEL", "start", [("river", "WLD", 1.0, 0.0),
                            ("pts", [(1046, 980), (1000, 1004)])]),
    # Seehaven's landward edge, from the Kron's mouth to the Korn.
    ("S1", "FEL", "none", [("pts", [(656, 1052), (766, 1008), (886, 996),
                                    (1000, 1004), (1092, 1058), (1180, 1150)])]),
    # Kornfeld from Kirchberg, off the north bay down to the Korn.
    ("KB1", "FEL", "start", [("pts", [(1402, 596), (1416, 684), (1424, 772),
                                      (1418, 850), (1392, 908)])]),
    # Kirchberg from Steinmark: the Steinwater, then the divide south to the Korn.
    ("KS1", "FEL", "start", [("river", "STW", 1.0, 0.0),
                             ("pts", [(1800, 640), (1780, 720), (1750, 780),
                                      (1706, 826)])]),
    # The Korn is the border for its whole length: Kirchberg and Kornfeld to the
    # north of it, Grenzmark and then Eisenmark to the south.
    ("GR1", "FEL", "none", [("river", "KRN", 0.0, 0.6)]),
    ("S2",  "FEL", "end",  [("river", "KRN", 0.6, 1.0)]),
    # Grenzmark from Eisenmark. This one is NOT a river, and it is the exception
    # that proves the rule: Eisenmark's business is the mountain, so its border
    # runs down the Spine's western foot rather than along any water. The March
    # Water crosses it and carries on into Grenzmark, which is what rivers do to
    # borders that were drawn for other reasons.
    ("EM1", "FEL", "end", [("pts", [(1596, 856), (1618, 940), (1634, 1030),
                                    (1650, 1108), (1666, 1176)])]),

    # Kretavia is not divided by politics but by rainfall — the habitable part is
    # an upside-down L, the Mediterranean north turning down the mountainous
    # west, and everything the L does not enclose is desert.
    ("SAH1", "KRT", "both", [("pts", [(835, 1530), (1000, 1553), (1180, 1566),
                                      (1360, 1548), (1520, 1500), (1640, 1442)])]),
    ("OWD1", "KRT", "end",  [("pts", [(1005, 1553), (1024, 1700), (1036, 1860),
                                      (1032, 1990)])]),
    ("SND1", "KRT", "both", [("pts", [(1150, 2050), (1246, 1930), (1342, 1836),
                                      (1452, 1762), (1572, 1706)])]),
]

# code, name, parent region, seed point
SUBREGIONS = [
    ("KRO", "Kronstadt",  "FEL", (600, 900)),
    ("WAL", "Waldheim",   "FEL", (900, 700)),
    ("SEE", "Seehaven",   "FEL", (980, 1120)),
    ("KOR", "Kornfeld",   "FEL", (1200, 760)),
    ("KIR", "Kirchberg",  "FEL", (1560, 700)),
    ("STE", "Steinmark",  "FEL", (1800, 500)),
    ("GRE", "Grenzmark",  "FEL", (1470, 1000)),
    ("EIS", "Eisenmark",  "FEL", (1770, 1010)),
    ("WAS", "The Wastes", "FEL", (2100, 980)),

    # Kretavia. None of these four names is in the vault — it gives Kretavia no
    # internal divisions at all — except the Old Wood, which is a region there
    # already and turns out to be exactly this strip: the forested mountain coast
    # that Jrakvia broke off from and drifted west of.
    ("SAH", "Sahalim",           "KRT", (1250, 1430)),
    ("OWD", "The Old Wood",      "KRT", (930, 1750)),
    ("KHR", "The Kharsa",        "KRT", (1200, 1760)),
    ("SND", "The Sundered Sand", "KRT", (1400, 1930)),
]

SUBREGION_NAMES = {code: name for code, name, _parent, _seed in SUBREGIONS}

# NO MOUNTAIN RANGES ARE SHIPPED. There are two in the world — the Spine, which
# walls the Wastes off from Feldia and carries on underwater to surface as the
# Bagii Atoll, and the Old Wood Range down Kretavia's west coast. Both were drawn
# for a while and both were wrong on the page: a mountain chain rendered as a
# thick line reads like a road, and a border with a chain drawn along it stops
# looking like a border and starts looking like a wall someone built.
#
# They survive as the REASON for two borders rather than as geometry: RNG is the
# Spine and OWD1 is the Old Wood Range's eastern foot. If they are ever wanted as
# relief — hachures, shading, anything that reads as terrain rather than as a
# route — they come back as their own layer, not as strokes.


# ── Authored geometry ───────────────────────────────────────────────────────

def _noise(a, b, c):
    """Deterministic value in [-1, 1] from three integers. A hash, not a random
    number generator, so the committed output is reproducible."""
    x = (a * 2654435761 + b * 40503 + c * 2246822519) & 0xFFFFFFFF
    x ^= x >> 13
    x = (x * 1274126177) & 0xFFFFFFFF
    x ^= x >> 16
    return (x & 0xFFFFFF) / 0x7FFFFF - 1.0


def _key(name):
    h = 2166136261
    for ch in name:
        h = ((h ^ ord(ch)) * 16777619) & 0xFFFFFFFF
    return h


def roughen(pts, name, amount):
    """Recursive midpoint displacement, perpendicular to the local heading.

    Split each segment, push the new midpoint sideways by a fraction of that
    segment's OWN length, repeat. Proportional-to-length is what makes it fractal
    rather than fuzzy: long runs get big lazy bends and the short runs inside them
    get small ones, which is the shape real coastlines and rivers have.

    Endpoints never move — a border end is either on a coast or on another border,
    and both stop being true if it wanders.
    """
    out = [(float(x), float(y)) for x, y in pts]
    seed = _key(name)
    for lvl in range(ROUGH_LEVELS):
        nxt = [out[0]]
        for i in range(len(out) - 1):
            (x1, y1), (x2, y2) = out[i], out[i + 1]
            dx, dy = x2 - x1, y2 - y1
            length = math.hypot(dx, dy)
            mx, my = (x1 + x2) / 2.0, (y1 + y2) / 2.0
            if length > 1e-6:
                push = _noise(seed, lvl, i) * amount * length
                mx -= dy / length * push
                my += dx / length * push
            nxt.append((mx, my))
            nxt.append((x2, y2))
        out = nxt
    return out


def fill_polygon(bits, w, h, pts):
    """Scanline-fill a closed polygon into a 0/1 bytearray."""
    ys = [p[1] for p in pts]
    for y in range(max(0, int(min(ys))), min(h, int(max(ys)) + 1)):
        xs = []
        n = len(pts)
        for i in range(n):
            x1, y1 = pts[i]
            x2, y2 = pts[(i + 1) % n]
            if (y1 <= y < y2) or (y2 <= y < y1):
                xs.append(x1 + (y - y1) * (x2 - x1) / (y2 - y1))
        xs.sort()
        row = y * w
        for k in range(0, len(xs) - 1, 2):
            for x in range(max(0, int(xs[k])), min(w - 1, int(xs[k + 1])) + 1):
                bits[row + x] = 1


def clip_to_land(pts, wet, w, h):
    """Split a polyline into the runs of it that are over land.

    `wet` has the lakes cut out of it as well as the sea, so a river ends at a
    lake shore the same way it ends at a coast.
    """
    def dry(pt):
        x, y = int(round(pt[0])), int(round(pt[1]))
        return 0 <= x < w and 0 <= y < h and wet[y * w + x] == 1

    def cross(a, b):
        """Where the segment leaves or joins the land.

        Returns the DRY side of the final bracket, not its midpoint. A midpoint
        is a parameter nothing ever evaluated, so it can round to a pixel in the
        water — which puts the last vertex of a river a pixel out to sea, in the
        committed file, where it is nobody's obvious fault.
        """
        a_dry = dry(a)
        lo, hi = 0.0, 1.0
        for _ in range(14):
            m = (lo + hi) / 2
            pm = (a[0] + (b[0] - a[0]) * m, a[1] + (b[1] - a[1]) * m)
            if dry(pm) == a_dry:
                lo = m
            else:
                hi = m
        t = lo if a_dry else hi
        px, py = a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t

        # Then step back into the land by MOUTH_INSET. The traced coastline runs
        # down the MIDDLE of the pen stroke, so a river stopping exactly on it
        # looks like it overshoots into the drawn coast; and these coordinates are
        # scaled and rounded on the way into the JSON, which can move a point
        # sitting exactly on the boundary into the water.
        dx, dy = b[0] - a[0], b[1] - a[1]
        n = math.hypot(dx, dy)
        if n > 1e-6:
            step = MOUTH_INSET if a_dry else -MOUTH_INSET
            px -= dx / n * step
            py -= dy / n * step
        return (px, py)

    runs, cur = [], []
    for i in range(len(pts) - 1):
        a, b = pts[i], pts[i + 1]
        da, db = dry(a), dry(b)
        if da:
            cur.append(a)
        if da != db:
            cur.append(cross(a, b))
            if not da:
                continue                             # joining the land: keep going
            if len(cur) > 1:
                runs.append(cur)
            cur = []
    if dry(pts[-1]):
        cur.append(pts[-1])
    if len(cur) > 1:
        runs.append(cur)
    return [r for r in runs if len(r) > 1]


def draw_polyline(bits, w, h, pts, width):
    """Stamp a thick polyline into a 0/1 bytearray. Bresenham with a square brush
    — this is a barrier for a flood fill, so the only property that matters is
    that it has no holes in it."""
    r = width // 2
    def dot(x, y):
        for yy in range(max(0, y - r), min(h, y + r + 1)):
            row = yy * w
            for xx in range(max(0, x - r), min(w, x + r + 1)):
                bits[row + xx] = 1
    for i in range(len(pts) - 1):
        x0, y0 = int(round(pts[i][0])), int(round(pts[i][1]))
        x1, y1 = int(round(pts[i + 1][0])), int(round(pts[i + 1][1]))
        dx, dy = abs(x1 - x0), -abs(y1 - y0)
        sx, sy = (1 if x0 < x1 else -1), (1 if y0 < y1 else -1)
        err = dx + dy
        while True:
            dot(x0, y0)
            if x0 == x1 and y0 == y1:
                break
            e2 = 2 * err
            if e2 >= dy:
                err += dy
                x0 += sx
            if e2 <= dx:
                err += dx
                y0 += sy


def extend_ends(pts, mask, w, h, which):
    """Run an end of a border on along its own last heading until it leaves the
    landmass. This is what lets a border be a suggestion: sketch the middle of it,
    and the coast decides where it stops."""
    pts = list(pts)
    ends = []
    if which in ("both", "start"):
        ends.append(0)
    if which in ("both", "end"):
        ends.append(-1)
    for end in ends:
        x1, y1 = pts[end]
        x2, y2 = pts[1 if end == 0 else -2]
        dx, dy = x1 - x2, y1 - y2
        n = math.hypot(dx, dy)
        if not n:
            continue
        dx, dy = dx / n * EXTEND_STEP, dy / n * EXTEND_STEP
        x, y, out = x1, y1, None
        for _ in range(EXTEND_LIMIT // EXTEND_STEP):
            x, y = x + dx, y + dy
            xi, yi = int(round(x)), int(round(y))
            if not (0 <= xi < w and 0 <= yi < h):
                break
            out = (xi, yi)
            if not mask[yi * w + xi]:
                break
        if out:
            if end == 0:
                pts.insert(0, out)
            else:
                pts.append(out)
    return pts


def check_drainage(rivers, river_paths, wet, lake_mask, w, h):
    """Every river has to end somewhere: the sea, a lake, or another river.

    A river that simply stops in a field is the most obvious tell that nobody
    thought about the map, and it is invisible until someone zooms in on exactly
    that spot — so it is checked rather than eyeballed.
    """
    # One mask per river, EXCLUDING itself. The first version drew every river
    # into one mask and then asked whether the mouth touched it — which it always
    # did, because a river's mouth is on the river. Every river "emptied into
    # another river" and the check proved nothing.
    def others_of(exclude):
        m = bytearray(w * h)
        for rid, path in river_paths.items():
            if rid != exclude:
                draw_polyline(m, w, h, path, 3)
        return m

    def mouth_at(mx, my, others):
        """What the river's last point touches, or None."""
        for r in range(1, 10):
            for dy in range(-r, r + 1):
                for dx in range(-r, r + 1):
                    x, y = mx + dx, my + dy
                    if not (0 <= x < w and 0 <= y < h):
                        continue
                    i = y * w + x
                    if lake_mask[i]:
                        return "a lake"
                    if not wet[i]:
                        return "the sea"
                    if others[i]:
                        return "another river"
        return None

    for rid, name, runs in rivers:
        mx, my = (int(round(v)) for v in runs[-1][-1])
        found = mouth_at(mx, my, others_of(rid))
        if not found:
            raise SystemExit(
                f"river {name} ends at ({mx},{my}) without reaching the sea, a "
                "lake or another river — give it a mouth"
            )
        print(f"    {name} empties into {found}")


def resolve_border(segments, river_paths):
    """Build a border polyline out of its segments.

    A segment is either literal points or a slice of a river, and the second is
    the whole reason this exists: real borders follow water. Taking the slice from
    the river's ALREADY-ROUGHENED path — not from its smooth original — is what
    makes the border and the river the same line on screen rather than two lines
    that agree in principle and disagree by a few pixels everywhere.
    """
    out = []
    for seg in segments:
        if seg[0] == "pts":
            pts = list(seg[1])
        else:
            _, rid, t0, t1 = seg
            path = river_paths[rid]
            a = int(round(t0 * (len(path) - 1)))
            b = int(round(t1 * (len(path) - 1)))
            pts = path[a:b + 1] if a <= b else list(reversed(path[b:a + 1]))
        if out and pts and out[-1] == pts[0]:
            pts = pts[1:]
        out.extend(pts)
    return out


def subdivide(parent_bits, w, h, seeds, parent, river_paths):
    """Cut a landmass with BORDERS and hand each piece to a seed."""
    barrier = bytearray(w * h)
    for bid, region, which, segments in BORDERS:
        if region != parent:
            continue
        line = resolve_border(segments, river_paths)
        # A border of literal points is roughened here; one that follows a river
        # is already exactly as rough as the river it is. Ends run out to the
        # coast on the SMOOTH line first, because the last segment is what points
        # at the coast, and roughening leaves both ends where they were.
        if any(seg[0] == "river" for seg in segments):
            line = extend_ends(line, parent_bits, w, h, which)
        else:
            line = roughen(extend_ends(line, parent_bits, w, h, which), bid,
                           ROUGH_BORDER)
        draw_polyline(barrier, w, h, line, BORDER_WIDTH)

    inner = bytearray(1 if parent_bits[i] and not barrier[i] else 0
                      for i in range(w * h))
    labels, sizes = label(inner, w, h)

    owner = {}
    for code, _name, _parent, (sx, sy) in seeds:
        c = labels[sy * w + sx]
        if c == 0:
            raise SystemExit(f"subregion seed for {code} at ({sx},{sy}) "
                             "landed on a border — move it")
        if c in owner:
            raise SystemExit(f"subregion seeds for {code} and {owner[c]} landed "
                             "in the same piece — a border between them is open")
        owner[c] = code

    centres = {}
    for i, c in enumerate(labels):
        if c:
            x, y = i % w, i // w
            a = centres.setdefault(c, [0, 0, 0])
            a[0] += x
            a[1] += y
            a[2] += 1
    for c in range(1, len(sizes)):
        if c in owner or sizes[c] < MIN_SUBREGION:
            continue
        ax, ay, cnt = centres[c]
        cx, cy = ax / cnt, ay / cnt
        owner[c] = min(seeds, key=lambda s: (s[3][0] - cx) ** 2
                       + (s[3][1] - cy) ** 2)[0]

    # ── Close the seam ──────────────────────────────────────────────────────
    # The barrier is a rasterised line several pixels wide, so the pieces it
    # leaves behind do not touch: between two duchies sits a corridor belonging
    # to neither. Left there it shows through as a slot of whatever is underneath
    # and — worse — every duchy's coastline ends up a few pixels inside its
    # parent's, so the two simplify to DIFFERENT vertices and a selected region
    # stops lining up with the continent it is part of.
    #
    # So the corridor is given away. A breadth-first flood outward from every
    # labelled pixel hands each corridor pixel to whichever duchy reached it
    # first, which is the nearest one. The duchies then tile their parent exactly,
    # and every duchy's outer edge is the parent's own coastline, pixel for pixel.
    frontier = [i for i, c in enumerate(labels) if c in owner]
    head = 0
    while head < len(frontier):
        i = frontier[head]
        head += 1
        x, y = i % w, i // w
        here = labels[i]
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if not (0 <= nx < w and 0 <= ny < h):
                continue
            j = ny * w + nx
            if parent_bits[j] and not labels[j]:
                labels[j] = here
                frontier.append(j)
    return labels, owner


# ── PNG ─────────────────────────────────────────────────────────────────────
# Stdlib only, so this decodes the file itself rather than reaching for Pillow.
# It is sixty lines because PNG is a simple format once you accept that every
# scanline is delta-coded against the one above it.

def unfilter(line, prev, ftype, channels):
    """Undo one scanline's filter, in place, and return it.

    a = left, b = above, c = above-left.
    """
    stride = len(line)
    if ftype == 1:
        for i in range(channels, stride):
            line[i] = (line[i] + line[i - channels]) & 0xFF
    elif ftype == 2:
        for i in range(stride):
            line[i] = (line[i] + prev[i]) & 0xFF
    elif ftype == 3:
        for i in range(stride):
            a = line[i - channels] if i >= channels else 0
            line[i] = (line[i] + ((a + prev[i]) >> 1)) & 0xFF
    elif ftype == 4:
        for i in range(stride):
            a = line[i - channels] if i >= channels else 0
            c = prev[i - channels] if i >= channels else 0
            b = prev[i]
            p = a + b - c
            pa, pb, pc = abs(p - a), abs(p - b), abs(p - c)
            pred = a if (pa <= pb and pa <= pc) else (b if pb <= pc else c)
            line[i] = (line[i] + pred) & 0xFF
    return line


def row_luma(line, w, channels, colour, palette):
    """One unfiltered scanline -> its w bytes of luminance."""
    if colour == 3:
        return bytes((palette[j] * 299 + palette[j + 1] * 587
                      + palette[j + 2] * 114) // 1000
                     for j in (line[x] * 3 for x in range(w)))
    if channels >= 3:
        return bytes((line[j] * 299 + line[j + 1] * 587
                      + line[j + 2] * 114) // 1000
                     for j in (x * channels for x in range(w)))
    return bytes(line[x * channels] for x in range(w))


def read_png_luma(path):
    """Return (width, height, bytearray of luminance). 8-bit, non-interlaced."""
    raw = path.read_bytes()
    if raw[:8] != b"\x89PNG\r\n\x1a\n":
        raise SystemExit(f"{path} is not a PNG")

    idat = bytearray()
    pos, ihdr, palette = 8, None, None
    while pos < len(raw):
        (length,) = struct.unpack(">I", raw[pos:pos + 4])
        kind = raw[pos + 4:pos + 8]
        body = raw[pos + 8:pos + 8 + length]
        pos += 12 + length                      # 4 len + 4 type + body + 4 crc
        if kind == b"IHDR":
            ihdr = struct.unpack(">IIBBBBB", body)
        elif kind == b"PLTE":
            palette = body
        elif kind == b"IDAT":
            idat += body
        elif kind == b"IEND":
            break

    if ihdr is None:
        raise SystemExit("PNG has no IHDR")
    w, h, depth, colour, compression, filt, interlace = ihdr
    if depth != 8 or interlace != 0 or compression != 0 or filt != 0:
        raise SystemExit(
            f"unsupported PNG: depth={depth} interlace={interlace} "
            f"compression={compression} filter={filt} — "
            "re-export as 8-bit, non-interlaced"
        )
    channels = {0: 1, 2: 3, 3: 1, 4: 2, 6: 4}.get(colour)
    if channels is None:
        raise SystemExit(f"unsupported PNG colour type {colour}")

    data = zlib.decompress(bytes(idat))
    stride = w * channels
    out = bytearray(w * h)
    prev = bytearray(stride)
    src = 0

    for y in range(h):
        ftype = data[src]
        src += 1
        line = bytearray(data[src:src + stride])
        src += stride
        if ftype > 4:
            raise SystemExit(f"bad PNG filter {ftype} on row {y}")
        line = unfilter(line, prev, ftype, channels)
        row = y * w
        out[row:row + w] = row_luma(line, w, channels, colour, palette)
        prev = line

    return w, h, out


# ── Raster to regions ───────────────────────────────────────────────────────

def label(bits, w, h):
    """Eight-connected components over a 0/1 bytearray. Returns (labels, sizes),
    where labels is 0 for background and 1..n for components."""
    labels = [0] * (w * h)
    sizes = [0]
    nxt = 0
    steps = ((1, 0), (-1, 0), (0, 1), (0, -1),
             (1, 1), (1, -1), (-1, 1), (-1, -1))

    for start in range(w * h):
        if not bits[start] or labels[start]:
            continue
        nxt += 1
        labels[start] = nxt
        stack = [start]
        count = 0
        while stack:
            i = stack.pop()
            count += 1
            x, y = i % w, i // w
            for dx, dy in steps:
                nx, ny = x + dx, y + dy
                if not (0 <= nx < w and 0 <= ny < h):
                    continue
                j = ny * w + nx
                if bits[j] and not labels[j]:
                    labels[j] = nxt
                    stack.append(j)
        sizes.append(count)
    return labels, sizes


def flood_ocean(ink, w, h):
    """Everything reachable from the border of the image without crossing ink.

    Scanline fill: each pop swallows a whole horizontal run and pushes seeds only
    for the rows above and below, which keeps the stack in the thousands rather
    than the millions a per-pixel fill would put there.
    """
    sea = bytearray(w * h)
    stack = []
    for x in range(w):
        stack.append((x, 0))
        stack.append((x, h - 1))
    for y in range(h):
        stack.append((0, y))
        stack.append((w - 1, y))

    while stack:
        x, y = stack.pop()
        row = y * w
        if ink[row + x] or sea[row + x]:
            continue
        x0 = x
        while x0 > 0 and not ink[row + x0 - 1] and not sea[row + x0 - 1]:
            x0 -= 1
        x1 = x
        while x1 < w - 1 and not ink[row + x1 + 1] and not sea[row + x1 + 1]:
            x1 += 1
        for i in range(row + x0, row + x1 + 1):
            sea[i] = 1
        for ny in (y - 1, y + 1):
            if not (0 <= ny < h):
                continue
            nrow = ny * w
            span = False
            for nx in range(x0, x1 + 1):
                clear = not ink[nrow + nx] and not sea[nrow + nx]
                if clear and not span:
                    stack.append((nx, ny))
                    span = True
                elif not clear:
                    span = False
    return sea


def _window(bits, w, h, r, need_all):
    """One separable pass of erosion (need_all) or dilation, via prefix sums.

    Separable because the structuring element is a square, and a square is the
    horizontal window composed with the vertical one. Prefix sums because the
    test for a window is a sum: all of it is set when the sum equals the span,
    any of it is set when the sum is above zero. Two linear passes instead of one
    accumulate per pixel per offset, which over six million pixels is the
    difference between seconds and minutes.

    Off-image counts as background, so the border erodes. Nothing on this drawing
    touches the border.
    """
    span = 2 * r + 1
    tmp = bytearray(w * h)
    for y in range(h):
        row = y * w
        ps = [0] * (w + 1)
        acc = 0
        for x in range(w):
            acc += bits[row + x]
            ps[x + 1] = acc
        for x in range(r, w - r):
            total = ps[x + r + 1] - ps[x - r]
            if (total == span) if need_all else (total > 0):
                tmp[row + x] = 1
    out = bytearray(w * h)
    for x in range(w):
        ps = [0] * (h + 1)
        acc = 0
        for y in range(h):
            acc += tmp[y * w + x]
            ps[y + 1] = acc
        for y in range(r, h - r):
            total = ps[y + r + 1] - ps[y - r]
            if (total == span) if need_all else (total > 0):
                out[y * w + x] = 1
    return out


def open_binary(bits, w, h, r):
    """Erode then dilate — drop anything thinner than the structuring element and
    put back what survived, at roughly its original size. Step 4 above."""
    return _window(_window(bits, w, h, r, True), w, h, r, False)


# Clockwise from north-west. Moore-neighbour tracing walks this ring.
NEIGHBOURS = ((-1, -1), (0, -1), (1, -1), (1, 0),
              (1, 1), (0, 1), (-1, 1), (-1, 0))


def trace(labels, w, h, code, start):
    """Moore-neighbour boundary following.

    `start` must be the first pixel of the component in raster order, which makes
    the pixel to its left guaranteed background and gives the walk somewhere legal
    to begin backtracking from.

    TERMINATION is on the walk's STATE — the pair (pixel, backtrack) — repeating,
    not on the start pixel being revisited. The walk is a deterministic function
    of that pair, so the first repeat is exactly one lap. Stopping on the start
    pixel alone is the textbook version and it is wrong twice over: a one-pixel
    isthmus is visited twice on the way round, and Jacob's refinement of it (same
    pixel, same entry direction) does not trip until the SECOND lap. That second
    lap is quiet and nasty — the ring still closes, but the shoelace area comes
    out at exactly double and every even-odd point-in-polygon test flips to False,
    so the shapes draw correctly and nothing can be clicked or labelled.
    """
    sx, sy = start
    px, py = sx, sy
    bx, by = sx - 1, sy
    contour = [(sx, sy)]
    first_state = None
    limit = 8 * w * h

    for _ in range(limit):
        d = NEIGHBOURS.index((bx - px, by - py))
        step = None
        for k in range(1, 9):
            i = (d + k) % 8
            nx, ny = px + NEIGHBOURS[i][0], py + NEIGHBOURS[i][1]
            if 0 <= nx < w and 0 <= ny < h and labels[ny * w + nx] == code:
                step = (nx, ny, i)
                break
        if step is None:
            break                                    # a single isolated pixel
        nx, ny, i = step
        bx, by = px + NEIGHBOURS[(i - 1) % 8][0], py + NEIGHBOURS[(i - 1) % 8][1]
        px, py = nx, ny
        state = (px, py, bx, by)
        if first_state is None:
            first_state = state
        elif state == first_state:
            break
        contour.append((px, py))
    return contour


def claim(cx, cy):
    """Which region owns a landmass, by the centroid of its outline."""
    for code, _name, (x0, y0, x1, y1) in REGIONS:
        if x0 <= cx <= x1 and y0 <= cy <= y1:
            return code
    return None


def name_of(code):
    for c, name, _box in REGIONS:
        if c == code:
            return name
    return "Uncharted"


def by_code(items):
    """Code -> rings, in the order they were produced. `items` is a list of
    (code, ring) pairs; a landmass no claim box caught has code None."""
    out = {}
    for code, ring in items:
        out.setdefault(code, []).append(ring)
    return out


def group(shapes):
    """Region code -> rings, in REGIONS order, with the unclaimed bucket last."""
    bins = by_code(shapes)
    out = {code: bins[code] for code, _name, _box in REGIONS if code in bins}
    if None in bins:
        out["UNC"] = bins[None]
    return out


# ── Serialising ─────────────────────────────────────────────────────────────
# svg_path, flat_coords and unit_record are shared with build-europe-map.py and
# live in scripts/mapgeom.py. GLOBE_PLACES is this script's half of flat_coords'
# rounding — see write_globe.
GLOBE_PLACES = 2


def main():
    if not SRC.exists():
        raise SystemExit(f"missing source artwork: {SRC}")

    print(f"reading {SRC.relative_to(ROOT)}")
    w, h, luma = read_png_luma(SRC)
    print(f"  {w} x {h}")

    raw_ink = bytearray(1 if v < INK_MAX_LUM else 0 for v in luma)
    ilab, isz = label(raw_ink, w, h)
    ink = bytearray(1 if c and isz[c] >= MIN_INK else 0 for c in ilab)
    kept = sum(1 for s in isz[1:] if s >= MIN_INK)
    print(f"  ink: {len(isz) - 1} blobs, {kept} kept as coastline")

    land = bytearray(1 - v for v in flood_ocean(ink, w, h))
    frac = sum(land) / len(land)
    print(f"  land fraction {frac:.3f}")
    if not 0.15 < frac < 0.60:
        raise SystemExit(
            "land fraction is implausible — the ocean flood either leaked "
            "through a gap in a coastline or was walled out of an interior. "
            "Retune INK_MAX_LUM / MIN_INK."
        )

    land = open_binary(land, w, h, OPEN_RADIUS)
    llab, lsz = label(land, w, h)
    print(f"  land: {len(lsz) - 1} components")

    # First pixel of each component in raster order, which is where tracing
    # starts and why the pixel to its left is safe to back-track from.
    firsts = {}
    for i, c in enumerate(llab):
        if c and c not in firsts:
            firsts[c] = (i % w, i // w)

    shapes = []                                   # (region code or None, ring)
    rows = []
    component_region = {}
    unclaimed = 0
    for c in range(1, len(lsz)):
        if lsz[c] < MIN_LAND:
            continue
        ring = trace(llab, w, h, c, firsts[c])
        if len(ring) < 8:
            continue
        cx = sum(p[0] for p in ring) / len(ring)
        cy = sum(p[1] for p in ring) / len(ring)
        region = claim(cx, cy)
        if region is None:
            unclaimed += 1
            print(f"  ! landmass at ({cx:.0f}, {cy:.0f}) is in no claim box")
        shapes.append((region, [(float(x), float(y)) for x, y in ring]))
        rows.append((region or "--", lsz[c], cx, cy, len(ring)))
        component_region[c] = region
    print(f"  traced {len(shapes)} landmasses"
          + (f", {unclaimed} unclaimed" if unclaimed else ""))
    if VERBOSE:
        for region, pixels, cx, cy, n in sorted(rows, key=lambda r: (r[0], -r[1])):
            print(f"    {region}  {pixels:8d}px  at ({cx:6.0f},{cy:6.0f})  "
                  f"{n:5d} vertices")

    # ── Water ───────────────────────────────────────────────────────────────
    # Lakes are cut out of a second mask. `land` keeps them (a duchy containing a
    # lake is still one duchy, and the lake is drawn on top); `wet` does not, so
    # rivers are clipped against lakes exactly as they are against the sea.
    wet = bytearray(land)
    lake_mask = bytearray(w * h)
    for _lid, name, pts in LAKES:
        fill_polygon(lake_mask, w, h, pts)
        cx = sum(p[0] for p in pts) / len(pts)
        cy = sum(p[1] for p in pts) / len(pts)
        if not land[int(cy) * w + int(cx)]:
            raise SystemExit(f"lake {name} is not on land — check its coordinates")
    for i in range(w * h):
        if lake_mask[i]:
            wet[i] = 0

    # Rivers are roughened HERE, before anything is subdivided, because the
    # borders that follow them need the roughened path and not the sketch.
    river_paths = {rid: roughen(pts, rid, ROUGH_RIVER) for rid, _n, pts in RIVERS}

    # Subdivide every parent that has authored borders across it.
    subshapes = []                                # (subregion code, ring)
    sub_meta = {}                                 # code -> (name, parent code)
    parents = sorted({p for _c, _n, p, _s in SUBREGIONS})
    for parent in parents:
        seeds = [s for s in SUBREGIONS if s[2] == parent]
        parent_bits = bytearray(1 if c and component_region.get(c) == parent else 0
                                for c in llab)
        if not any(parent_bits):
            raise SystemExit(f"no landmass claimed by {parent} to subdivide")
        sub_labels, owner = subdivide(parent_bits, w, h, seeds, parent,
                                      river_paths)
        piece_firsts = {}
        for i, c in enumerate(sub_labels):
            if c in owner and c not in piece_firsts:
                piece_firsts[c] = (i % w, i // w)
        tally = {}
        for c, code in sorted(owner.items()):
            ring = trace(sub_labels, w, h, c, piece_firsts[c])
            if len(ring) < 8:
                continue
            subshapes.append((code, [(float(x), float(y)) for x, y in ring]))
            sub_meta.setdefault(code, (SUBREGION_NAMES[code], parent))
            tally[code] = tally.get(code, 0) + 1
        print(f"  {parent}: {len(owner)} pieces -> "
              f"{len(tally)} subregions {sorted(tally)}")

    # ── Everywhere else gets numbered ───────────────────────────────────────
    # A region with no authored borders is an archipelago, and an archipelago's
    # parts are islands. They are worth selecting — an island is the most
    # obviously clickable thing on a map — but naming forty of them is a decision
    # about the world that nobody has made yet. So they are numbered, largest
    # first, and the numbering is stable because area is.
    for code, _name, _box in REGIONS:
        if code in parents:
            continue
        rings = [r for reg, r in shapes if reg == code]
        if len(rings) < 2:
            continue
        order = sorted(range(len(rings)), key=lambda i: -area(rings[i]))
        for n, i in enumerate(order, start=1):
            sc = f"{code}{n}"
            sub_meta[sc] = (f"{name_of(code)} {n}", code)
            subshapes.append((sc, rings[i]))
        print(f"  {code}: {len(rings)} islands numbered by size")

    # ── Rivers, cut to water and checked for a mouth ─────────────────────────
    rivers = []
    for rid, name, _pts in RIVERS:
        runs = clip_to_land(river_paths[rid], wet, w, h)
        if not runs:
            raise SystemExit(f"river {name} is entirely under water")
        rivers.append((rid, name, runs))
    check_drainage(rivers, river_paths, wet, lake_mask, w, h)
    print(f"  water: {len(rivers)} rivers, {len(LAKES)} lakes, "
          f"{sum(len(r) for _i, _n, rs in rivers for r in rs)} river points on land")

    write_flat(shapes, subshapes, sub_meta, rivers, w, h)
    write_globe(shapes, subshapes, sub_meta, rivers)


def write_flat(shapes, subshapes, sub_meta, rivers, w0, h0):
    """The static SVG basemap: the drawing, redrawn as vectors, in the drawing's
    own composition — the full canvas, so the empty eastern sea the artist left
    is still there."""
    scale = FLAT_WIDTH / w0
    height = h0 * scale
    out = {}

    def flat_parts(rings):
        """A unit's rings as [(d, area, ring), ...], largest first."""
        parts = []
        for ring in rings:
            sm = simplify_ring([(x * scale, y * scale) for x, y in ring], FLAT_TOL)
            if len(sm) < 3:
                continue
            a = area(sm)
            if a < FLAT_MIN_AREA:
                continue
            parts.append((svg_path(sm), a, sm))
        parts.sort(key=lambda t: -t[1])
        return parts

    for code, rings in group(shapes).items():
        parts = flat_parts(rings)
        if not parts:
            continue
        out[code] = {"name": name_of(code),
                     **unit_record(parts, islands=len(parts))}

    sub = {}
    for code, rings in by_code(subshapes).items():
        parts = flat_parts(rings)
        if not parts:
            continue
        sub[code] = {"name": sub_meta[code][0],
                     "parent": sub_meta[code][1],
                     **unit_record(parts, pieces=len(parts))}

    def flat_line(runs):
        """One `d` per river, with a subpath per run that is over land — a river
        that crosses an inlet is one river with a gap, not two rivers."""
        subpaths = []
        for run in runs:
            sm = simplify([(x * scale, y * scale) for x, y in run], FLAT_TOL)
            if len(sm) > 1:
                subpaths.append(svg_path(sm, close=False))
        return "".join(subpaths)

    lines = {"rivers": [{"id": i, "name": n, "d": flat_line(r)} for i, n, r in rivers]}

    lakes = {}
    for lid, name, pts in LAKES:
        sm = [(x * scale, y * scale) for x, y in pts]
        lakes[lid] = {"name": name, "d": svg_path(sm)}

    payload = {
        "_meta": {
            "source": "private/dagea-source.png — hand drawn; black ink layer only",
            "generated_by": "scripts/build-dagea-globe.py",
            "note": "Committed output. Nothing in `make build` regenerates this. "
                    "`units` are traced from the drawing; `subunits` and `lines` "
                    "are authored in the script — see its Internal geography table.",
        },
        "viewBox": f"0 0 {FLAT_WIDTH:.0f} {height:.0f}",
        "units": out,
        "subunits": sub,
        "lakes": lakes,
        "lines": lines,
    }
    OUT_FLAT.parent.mkdir(parents=True, exist_ok=True)
    OUT_FLAT.write_text(json.dumps(payload, separators=(",", ":")))
    kb = OUT_FLAT.stat().st_size / 1024
    print(f"wrote {OUT_FLAT.relative_to(ROOT)} — {len(out)} regions, "
          f"{len(sub)} subregions, {kb:.0f} KB, viewBox {payload['viewBox']}")


def write_globe(shapes, subshapes, sub_meta, rivers):
    """lon/lat rings. Framed on the drawn CONTENT, not the canvas — see the
    header. Coordinates are rounded to two decimals: 0.01 degrees is about a
    kilometre and a 460-pixel globe resolves nothing close to that, so the extra
    digits were bytes on the wire that could never reach a screen."""
    xs = [x for _reg, ring in shapes for x, _ in ring]
    ys = [y for _reg, ring in shapes for _, y in ring]
    cx = (min(xs) + max(xs)) / 2                  # longitude is centred...
    top = min(ys)                                 # ...latitude hangs off the top
    k = LAT_SPAN / (max(ys) - min(ys))            # degrees per source pixel
    lon_span = (max(xs) - min(xs)) * k

    def to_ll(x, y):
        return ((x - cx) * k, LAT_NORTH - (y - top) * k)

    def ll_rings(rings):
        """A unit's rings, projected and flattened for the wire."""
        flat_rings = []
        for ring in rings:
            sm = simplify_ring([to_ll(x, y) for x, y in ring], GLOBE_TOL)
            if len(sm) < 3 or area(sm) < GLOBE_MIN_AREA:
                continue
            flat_rings.append(flat_coords(sm, GLOBE_PLACES))
        return flat_rings

    out = {}
    for code, rings in group(shapes).items():
        flat_rings = ll_rings(rings)
        if flat_rings:
            out[code] = {"name": name_of(code), "rings": flat_rings}

    sub = {}
    for code, rings in by_code(subshapes).items():
        flat_rings = ll_rings(rings)
        if flat_rings:
            sub[code] = {"name": sub_meta[code][0], "parent": sub_meta[code][1],
                         "rings": flat_rings}

    def ll_runs(runs):
        parts = []
        for run in runs:
            sm = simplify([to_ll(x, y) for x, y in run], GLOBE_TOL)
            if len(sm) < 2:
                continue
            parts.append(flat_coords(sm, GLOBE_PLACES))
        return parts

    lines = {"rivers": [{"id": i, "name": n, "parts": ll_runs(r)} for i, n, r in rivers]}

    lakes = {}
    for lid, name, pts in LAKES:
        flat = flat_coords([to_ll(x, y) for x, y in pts], GLOBE_PLACES)
        lakes[lid] = {"name": name, "kind": "lake", "rings": [flat]}

    payload = {
        "subunits": sub,
        "lakes": lakes,
        "lines": lines,
        "_meta": {
            "source": "private/dagea-source.png — hand drawn; black ink layer only",
            "generated_by": "scripts/build-dagea-globe.py",
            "note": "lon/lat degrees, flat [lon,lat,lon,lat,...] per ring. "
                    "`units` are traced; `subunits` and `lines` are authored.",
            "framing": (f"plate carree; the charted world spans {lon_span:.0f} "
                        f"degrees of longitude, centred on 0, and runs from "
                        f"{LAT_NORTH:.0f}N down to {LAT_NORTH - LAT_SPAN:.0f}N. "
                        "The rest of the sphere is uncharted sea."),
        },
        "units": out,
    }
    OUT_GLOBE.parent.mkdir(parents=True, exist_ok=True)
    OUT_GLOBE.write_text(json.dumps(payload, separators=(",", ":")))
    kb = OUT_GLOBE.stat().st_size / 1024
    verts = sum(len(r) // 2 for u in out.values() for r in u["rings"])
    print(f"wrote {OUT_GLOBE.relative_to(ROOT)} — {len(out)} regions, "
          f"{len(sub)} subregions, {len(rivers)} rivers, {len(lakes)} lakes, "
          f"{verts} vertices, {kb:.0f} KB")
    print(f"  charted: {lon_span:.0f} degrees of longitude, "
          f"latitude {LAT_NORTH:.0f}N to {LAT_NORTH - LAT_SPAN:.0f}N")


if __name__ == "__main__":
    main()
