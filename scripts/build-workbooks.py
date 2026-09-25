#!/usr/bin/env python3
"""Zip the Python for ML workbook packets into static/downloads/.

    python3 scripts/build-workbooks.py            # every chNN packet
    python3 scripts/build-workbooks.py _template  # just the named ones

For each packet it writes python-for-ml-chNN.zip (the exercises) and
python-for-ml-chNN-solutions.zip, each unpacking to a folder of the same name,
plus python-for-ml-all.zip and python-for-ml-all-solutions.zip holding every
packet. The course requirements.txt goes into every packet, so it is written
once. Symlinks (a solution folder's tests and data) are stored as the files they
point at, so each zip runs on its own.

Timestamps are fixed, so rebuilding unchanged sources gives identical zips.
Stdlib only; run by `make workbooks`, locally and in the deploy workflow.
"""
import os
import re
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
COURSE = ROOT / 'workbooks' / 'python-for-ml'
SOLUTIONS = COURSE / 'solutions'
SKIPPED = {'__pycache__', '.pytest_cache', '.DS_Store'}
FIXED_TIME = (2026, 1, 1, 0, 0, 0)


def downloads_dir():
    """static/ + the `downloads:` path the shortcodes link to (data/python/course.yaml)."""
    config = (ROOT / 'data' / 'python' / 'course.yaml').read_text()
    served = re.search(r'^downloads:\s*"?/?([^"\s]+)"?', config, re.M).group(1)
    return ROOT / 'static' / served


def packet_files(folder):
    # os.walk with followlinks, not rglob: a solution folder's `data` is a
    # symlink to a directory, and rglob doesn't descend into those.
    for root, dirs, files in os.walk(folder, followlinks=True):
        dirs[:] = sorted(d for d in dirs if d not in SKIPPED)
        for name in sorted(files):
            if name not in SKIPPED:
                yield Path(root) / name


def add_file(archive, arcname, data):
    info = zipfile.ZipInfo(arcname, FIXED_TIME)
    info.compress_type = zipfile.ZIP_DEFLATED
    info.external_attr = 0o644 << 16
    archive.writestr(info, data)


def add_packet(archive, folder, prefix):
    for path in packet_files(folder):
        add_file(archive, f'{prefix}/{path.relative_to(folder).as_posix()}', path.read_bytes())
    add_file(archive, f'{prefix}/requirements.txt', (COURSE / 'requirements.txt').read_bytes())


def write_zip(target, packets):
    """packets: (source folder, folder name inside the zip) pairs."""
    with zipfile.ZipFile(target, 'w') as archive:
        for folder, prefix in packets:
            add_packet(archive, folder, prefix)
    print(f'  {target.relative_to(ROOT)}')


def main(names):
    chapters = names or sorted(p.name for p in COURSE.glob('ch[0-9][0-9]') if p.is_dir())
    if not chapters:
        print('build-workbooks: no chNN packets yet')
        return 0
    missing = [n for n in chapters if not (COURSE / n).is_dir() or not (SOLUTIONS / n).is_dir()]
    if missing:
        print(f'build-workbooks: no exercise or solution folder for {", ".join(missing)}', file=sys.stderr)
        return 1

    out = downloads_dir()
    out.mkdir(parents=True, exist_ok=True)
    everything, every_solution = [], []
    for name in chapters:
        stem = f'python-for-ml-{name}'
        exercise = (COURSE / name, stem)
        solution = (SOLUTIONS / name, f'{stem}-solutions')
        write_zip(out / f'{stem}.zip', [exercise])
        write_zip(out / f'{stem}-solutions.zip', [solution])
        everything.append((exercise[0], f'python-for-ml/{name}'))
        every_solution.append((solution[0], f'python-for-ml-solutions/{name}'))
    write_zip(out / 'python-for-ml-all.zip', everything)
    write_zip(out / 'python-for-ml-all-solutions.zip', every_solution)
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
