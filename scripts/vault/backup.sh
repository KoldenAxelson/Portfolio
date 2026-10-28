#!/usr/bin/env bash
# backup — copy what git doesn't keep to the external drive, if it's plugged in.
# Runs after every `make seal`, and on its own as `make backup`.
#
#   private/        the gitignored source: the sealed pitch's content and data
#                   (private/brine-mining/), plus notes, plans and skills
#   static/vault/   the sealed ciphertext, so a seal can be restored as-is
#
# Copied into $BACKUP_DIR (default: the Extreme SSD's Development/Backups/
# Portfolio). Files are added and updated, never deleted from the backup, so
# removing something here doesn't remove the last good copy there. If the drive
# isn't mounted, it says so and exits cleanly: a missing drive never fails a seal.
set -euo pipefail

BACKUP_DIR=${1:-${BACKUP_DIR:-"/Volumes/Extreme SSD/Development/Backups/Portfolio"}}

# The drive's mount point is the first two path parts (/Volumes/<name>).
volume=$(echo "$BACKUP_DIR" | cut -d/ -f1-3)
if [ ! -d "$volume" ]; then
  echo "backup: skipped, $volume isn't mounted."
  exit 0
fi

mkdir -p "$BACKUP_DIR"
for dir in private static/vault; do
  [ -d "$dir" ] || continue
  mkdir -p "$BACKUP_DIR/$dir"
  cp -R "$dir/." "$BACKUP_DIR/$dir/"
done
echo "backup: private/ and static/vault/ copied to $BACKUP_DIR"
