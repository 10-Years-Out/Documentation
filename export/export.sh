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

# Pandoc writes its own bullet glyphs. Swap them for Word's standard
# filled circle / hollow circle / square so lists match the original.
python3 - "$DOC" << 'PY'
import re, shutil, sys, zipfile, tempfile

path = sys.argv[1]
levels = [('\uf0b7', 'Symbol'), ('o', 'Courier New'), ('\uf0a7', 'Wingdings')]

with zipfile.ZipFile(path) as z:
    items = {n: z.read(n) for n in z.namelist()}

xml = items['word/numbering.xml'].decode('utf-8')
block = re.search(r'<w:abstractNum w:abstractNumId="991".*?</w:abstractNum>', xml, re.S)
if block:
    new = block.group(0)
    for i, (char, font) in enumerate(levels):
        new = re.sub(
            r'(<w:lvl w:ilvl="%d">.*?<w:numFmt w:val="bullet" ?/>)<w:lvlText w:val="[^"]*" ?/>' % i,
            r'\1<w:lvlText w:val="%s"/><w:rPr><w:rFonts w:ascii="%s" w:hAnsi="%s" w:hint="default"/></w:rPr>' % (char, font, font),
            new, count=1, flags=re.S)
    xml = xml.replace(block.group(0), new)
    items['word/numbering.xml'] = xml.encode('utf-8')

    tmp = tempfile.mktemp(suffix='.docx')
    with zipfile.ZipFile(tmp, 'w', zipfile.ZIP_DEFLATED) as z:
        for n, data in items.items():
            z.writestr(n, data)
    shutil.move(tmp, path)
PY

rm -f "$TMP"
echo "wrote $DOC"
