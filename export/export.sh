#!/usr/bin/env bash
set -euo pipefail

# usage: ./export/export.sh hslc
# run from the repo root

CLIENT="${1:?usage: ./export/export.sh <client-slug>}"

SRC="clients/$CLIENT/infosec"
REF="export/reference/$CLIENT.docx"
OUT="dist/$CLIENT"
TMP="$OUT/combined.md"
DOC="$OUT/$CLIENT-information-security-policy.docx"

[ -d "$SRC" ] || { echo "no such client: $SRC"; exit 1; }

mkdir -p "$OUT"
: > "$TMP"

for f in "$SRC"/*.mdx; do
  # section title comes from the frontmatter, not the body
  title=$(awk -F': ' '/^title:/{print $2; exit}' "$f" | sed 's/^"//;s/"$//')

  # sections with `page_break: false` continue on the page above them.
  # everything else starts a new page. the first break also gives the
  # table of contents a page to itself.
  if ! grep -q '^page_break: *false' "$f"; then
    printf '\n```{=openxml}\n<w:p><w:r><w:br w:type="page"/></w:r></w:p>\n```\n\n' >> "$TMP"
  fi

  printf '# %s\n\n' "$title" >> "$TMP"

  # body: everything after the closing --- of the frontmatter, minus any
  # block marked web-only, which belongs on the site but not in the
  # delivered document
  awk '
    BEGIN { n = 0; skip = 0 }
    /^---[[:space:]]*$/ { n++; next }
    n < 2 { next }
    /web-only:start/ { skip = 1; next }
    /web-only:end/   { skip = 0; next }
    !skip
  ' "$f" >> "$TMP"
  printf '\n' >> "$TMP"
done

# reference doc is optional so this still runs before you've built one
REF_ARG=()
[ -f "$REF" ] && REF_ARG=(--reference-doc="$REF")

pandoc "$TMP" \
  --from=markdown+raw_attribute+pipe_tables \
  "${REF_ARG[@]}" \
  --toc --toc-depth=2 \
  -o "$DOC"

# Two things Pandoc gets wrong for this document, repaired in the packed file:
#   1. its own bullet glyphs, swapped for Word's filled circle / hollow
#      circle / square
#   2. banded table rows, written straight into the cells rather than left to
#      Word's conditional table formatting, which does not reliably apply
python3 export/fix-docx.py "$DOC"

rm -f "$TMP"
echo "wrote $DOC"
