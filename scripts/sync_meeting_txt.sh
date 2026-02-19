#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

DEFAULT_FILES=(
  "docs/project-management/meeting/20260121_meeting.md"
  "docs/project-management/meeting/20260126_meeting.md"
  "docs/project-management/meeting/20260202_meeting.md"
  "docs/project-management/meeting/20260206_meeting.md"
)

if (($# > 0)); then
  input_files=("$@")
else
  input_files=("${DEFAULT_FILES[@]}")
fi

for src in "${input_files[@]}"; do
  if [[ "$src" != /* ]]; then
    src="$ROOT_DIR/$src"
  fi

  if [[ ! -f "$src" ]]; then
    echo "Missing file: $src" >&2
    exit 1
  fi

  if [[ "${src##*.}" != "md" ]]; then
    echo "Input must be a .md file: $src" >&2
    exit 1
  fi

  dst="${src%.md}.txt"

  awk '
    function trim(s,   t) {
      t = s
      sub(/^[ \t]+/, "", t)
      sub(/[ \t]+$/, "", t)
      return t
    }

    function parse_row(row, cells,   line, tmp, n, i) {
      line = row
      sub(/^\|/, "", line)
      sub(/\|$/, "", line)
      n = split(line, tmp, /\|/)
      for (i = 1; i <= n; i++) {
        cells[i] = trim(tmp[i])
      }
      return n
    }

    function is_separator_row(row,   probe) {
      probe = row
      gsub(/[|:\- \t]/, "", probe)
      return (probe == "" && row ~ /-/)
    }

    function emit(line) {
      sub(/[ \t]+$/, "", line)

      if (line == "") {
        if (!prev_blank) {
          print ""
          prev_blank = 1
        }
        return
      }

      print line
      prev_blank = 0
    }

    function strip_bold(line,   rebuilt) {
      while (match(line, /\*\*[^*]+\*\*/)) {
        rebuilt = substr(line, 1, RSTART - 1)
        rebuilt = rebuilt substr(line, RSTART + 2, RLENGTH - 4)
        rebuilt = rebuilt substr(line, RSTART + RLENGTH)
        line = rebuilt
      }
      return line
    }

    function flush_table(   headers, cells, header_count, i, j, n, out, label) {
      if (!in_table) {
        return
      }

      if (table_count >= 2 && is_separator_row(table_rows[2])) {
        header_count = parse_row(table_rows[1], headers)
        for (i = 3; i <= table_count; i++) {
          n = parse_row(table_rows[i], cells)
          out = ""
          for (j = 1; j <= n; j++) {
            label = (j <= header_count && headers[j] != "") ? headers[j] : "col" j
            out = (out == "") ? label ": " cells[j] : out " | " label ": " cells[j]
          }
          emit(out)
        }
      } else {
        for (i = 1; i <= table_count; i++) {
          n = parse_row(table_rows[i], cells)
          out = ""
          for (j = 1; j <= n; j++) {
            out = (out == "") ? cells[j] : out " | " cells[j]
          }
          emit(out)
        }
      }

      for (i = 1; i <= table_count; i++) {
        delete table_rows[i]
      }
      table_count = 0
      in_table = 0
    }

    BEGIN {
      prev_blank = 1
      in_table = 0
      table_count = 0
    }

    {
      line = $0
      sub(/\r$/, "", line)

      if (line ~ /^\|.*\|[ \t]*$/) {
        in_table = 1
        table_rows[++table_count] = line
        next
      }

      flush_table()

      if (line ~ /^# /) {
        sub(/^# /, "", line)
      } else if (line ~ /^## /) {
        sub(/^## /, "", line)
        line = "[" line "]"
      } else if (line ~ /^#{3,6}[ \t]+/) {
        sub(/^#{3,6}[ \t]+/, "", line)
      }

      sub(/^>[ \t]?/, "", line)

      line = strip_bold(line)
      gsub(/`/, "", line)

      emit(line)
    }

    END {
      flush_table()
    }
  ' "$src" > "$dst"

  echo "Synced: ${dst#$ROOT_DIR/}"
done
