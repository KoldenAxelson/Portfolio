---
title: 'How Does rsync Only Send What Changed?'
description: "rsync updates a file across a slow link without ever having both copies in one place. Short fingerprints of blocks and a checksum that slides along one byte at a time, plus the trees of hashes other systems use to compare whole collections."
pubDate: 2026-11-03
tags: ['computing', 'networking', 'explainer']
glossary: "ml"
# In review: builds at its URL but stays off every list, feed and sitemap,
# and is noindexed. Listed at /misc/drafts/. Publish by deleting these lines.
review: true
reviewOrder: 14
build:
  list: never
# Audit note from the writing session: the rsync figures are from Tridgell &
# Mackerras's 1996 report (Sections 2-4 and the kernel table in Section 6),
# the Merkle-tree comparison from the Dynamo paper (Section 4.7), Merkle's tree
# from his 1979 thesis (Chapter V, Section 4), the multiplication count and
# short block sums from Tridgell's 1999 thesis (3.2.5, 4.1), and the bsdiff
# figures from Percival's paper (Sections 1-3).
#
# Demos (both 2D, made-up text and files, real arithmetic): the key visual,
# {{< ml/rolling-checksum >}}, closes "A checksum that rolls";
# {{< ml/merkle-compare >}} closes "Comparing whole collections" (real SHA-256,
# computed in the template too). With JS off the rolling demo shows the first
# edit's instructions, found by plain text comparison.
thoughts:
  - "rsync's trick is the one I'd least have guessed: send fingerprints of the old file, not the new one."
  - "A checksum that updates in a few steps as it slides along is one of my favourite small ideas."
---

You've changed one paragraph of a big file on your laptop, and a server across a slow link has yesterday's copy. Sending the whole file again would work, but nearly all of it is already there.

The usual way to find what changed, a diff, needs both files on the same machine. Here they're on opposite ends of the slow link, and moving either one across is exactly what you're trying to avoid. Andrew Tridgell and Paul Mackerras's [rsync](https://www.andrew.cmu.edu/course/15-749/READINGS/required/cas/tridgell96.pdf) never brings them together. The server describes its old copy in a few bytes per block, and your laptop does the searching.

## Fingerprints of the old copy

The machine with the old copy splits it into blocks of a fixed size, say 700 bytes. For each block it works out two {{< term "checksum" >}}checksums{{< /term >}}: a quick 4-byte one and, in the 1996 design, a strong 16-byte one, MD4. That's 20 bytes per block, which it sends over.

The machine with the new copy then looks through its file for any stretch that matches one of those blocks. Wherever it finds one, it doesn't need to send those bytes. It sends "use your block 12" instead, plus the new bytes in between that matched nothing.

## The trouble with one extra byte

The catch is where to look. Insert a single byte near the start of the file and every later block boundary shifts by one. Compare the new file in blocks starting at 0, 700, 1,400 and so on, and almost nothing lines up anymore.

So rsync checks the new copy at every byte position, not just every 700th, until something matches, then jumps to the end of the matched block. A 24 MB file with nothing in common has about 24 million positions, and working out a {{< term "checksum" >}}checksum{{< /term >}} of 700 bytes from scratch at each one would be slow.

## A checksum that rolls

rsync's quick checksum is built so that moving the window along by one byte is cheap. It has two parts: a, the sum of the bytes in the window, and b, a weighted sum in which the first byte counts 700 times, the next 699, and so on down to the last, which counts once. Both are kept below 65,536.

Slide the window one byte to the right and a just loses the byte that left and gains the byte that came in. b loses the leaving byte, which counted 700 times, and every byte that stays moves one place nearer the front, so it counts once more. Together with the new byte's single count, that adds exactly the new a. That's a few additions and subtractions and one multiplication whatever the block size, which makes it a {{< term "rolling-checksum" >}}rolling checksum{{< /term >}}.

{{< ml/rolling-checksum >}}

## Checking the hits

A 4-byte checksum will sometimes match by accident, so a hit is only a candidate. rsync first looks up a 16-bit hash of it in a table, then compares the full 32 bits, and only then computes the strong MD4 checksum to confirm.

The report's test used two 24 MB archives of Linux kernel source, versions 1.99.10 and 2.0.0, with 500-byte blocks. The machine with the new copy sent about 1.3 MB, around 5% of the file, and received about 1 MB of fingerprints. It found 46,989 matching blocks, and only 64 times did the full 32 {{< term "bit" >}}bits{{< /term >}} agree when MD4 didn't.

## Comparing whole collections

For a whole folder, rsync itself sends a list of every file's name, size and modification time, and [skips the files](https://download.samba.org/pub/rsync/rsync.1) whose size and time already match. For a database of a billion keys, even that list is a lot to send.

A {{< term "merkle-tree" >}}Merkle tree{{< /term >}} shrinks the comparison. Each leaf is a {{< term "hash-function" >}}hash{{< /term >}} of one item, and each parent is a hash of its children.

Amazon's Dynamo database used them to compare copies of its data, as [its 2007 paper](https://www.allthingsdistributed.com/files/amazon-dynamo-sosp2007.pdf) describes. If two trees' roots match, the copies are the same and nothing needs to move. If not, compare the children, and keep going down only the branches that differ.

{{< ml/merkle-compare >}}

## When you have both files

Software updates are the opposite case. The publisher has both the old and new versions, so it can do the expensive comparison once and ship a small patch to everyone.

Compiled programs make that hard: change one line of source and addresses shift all through the file. Colin Percival pointed out that, with the usual patch tools, a one-line source change in a 500 kB program could become a 50 kB patch. His bsdiff matches regions loosely and stores the byte-by-byte differences, which are [mostly zero and compress well](https://www.daemonology.net/papers/bsdiff.pdf). On 97 updated FreeBSD programs, 36.4 MB in total, its patches came to 621,277 bytes.

## So how does rsync only send what changed?

It never compares the two files directly. The old copy describes itself in short fingerprints, one per block, and the new copy does the searching, at every byte position, which a {{< term "rolling-checksum" >}}rolling checksum{{< /term >}} makes cheap. Matches go back as "use your block", so of that big file, only your changed paragraph and the odd scrap of block around it cross the slow link.

## References & further reading

The papers in the order they appear.

{{< ml/references >}}
