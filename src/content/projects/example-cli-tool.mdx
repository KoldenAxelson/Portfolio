---
title: 'pgwatch — Postgres slow-query CLI'
tier: 1
summary: 'A terminal tool that streams pg_stat_statements into a live table and lets you pin queries to a hotlist. Open source, ~600 stars.'
tags: ['cli', 'postgres', 'developer-tools']
stack: ['Rust', 'Postgres', 'crossterm']
role: 'Sole author'
year: '2023'
status: 'shipped'
featured: true
links:
  repo: 'https://github.com/example/pgwatch'
metric:
  icon: star
  label: '612 @GitHub'
  href: 'https://github.com/example/pgwatch'
thoughts:
  - "Wrote this on a long weekend because I was tired of copy-pasting the same query into psql. Still use it daily."
  - "A Crunchy Data engineer starred it and I haven't shut up about it since."
---

## Why

`pg_stat_statements` is gold but the query interface for it is awful. Every team I've worked on
ended up with a one-off SQL snippet pinned in someone's wiki. I wanted the `htop` of Postgres.

## Design

A single binary, no daemon. Connects via `DATABASE_URL`, polls `pg_stat_statements` on a
configurable interval, diffs the snapshot, and renders top-N by configurable cost metric.
Pinned queries persist across runs in `~/.pgwatch.toml`.

## What it taught me

The hardest part wasn't the query layer or the terminal rendering — it was the diffing
strategy across snapshots when `pg_stat_statements` resets behind your back. The
[diff module](https://github.com/example/pgwatch/blob/main/src/diff.rs) handles four
distinct reset scenarios.
