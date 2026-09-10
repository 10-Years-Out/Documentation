"""Repair the two things Pandoc gets wrong for these documents.

1. Bullet glyphs. Pandoc hardcodes its own and ignores the reference doc,
   so swap in Word's filled circle / hollow circle / square.
2. Banded table rows. Word's conditional table formatting does not apply
   reliably here, so write the shading straight into the cells.

Called by export.sh. Takes the path to the generated .docx.
"""

import re
import shutil
import sys
import tempfile
import zipfile

BAND = '<w:shd w:val="clear" w:color="auto" w:fill="C0C0C0"/>'
LEVELS = [('\uf0b7', 'Symbol'), ('o', 'Courier New'), ('\uf0a7', 'Wingdings')]


def fix_bullets(xml):
    block = re.search(r'<w:abstractNum w:abstractNumId="991".*?</w:abstractNum>',
                      xml, re.S)
    if not block:
        return xml
    new = block.group(0)
    for i, (char, font) in enumerate(LEVELS):
        new = re.sub(
            r'(<w:lvl w:ilvl="%d">.*?<w:numFmt w:val="bullet" ?/>)'
            r'<w:lvlText w:val="[^"]*" ?/>' % i,
            r'\1<w:lvlText w:val="%s"/><w:rPr><w:rFonts w:ascii="%s" '
            r'w:hAnsi="%s" w:hint="default"/></w:rPr>' % (char, font, font),
            new, count=1, flags=re.S)
    return xml.replace(block.group(0), new)


def shade_row(tr):
    """Add the band fill to every cell in one row."""
    tr = re.sub(r'<w:tcPr\s*/>', '<w:tcPr>' + BAND + '</w:tcPr>', tr)

    def add(m):
        inner = m.group(1)
        return '<w:tcPr>' + inner + BAND + '</w:tcPr>' if BAND not in inner else m.group(0)

    return re.sub(r'<w:tcPr>(.*?)</w:tcPr>', add, tr, flags=re.S)


def band_table(m):
    """Shade the 1st, 3rd, 5th body row, matching the source document."""
    tbl = m.group(0)
    rows = list(re.finditer(r'<w:tr\b.*?</w:tr>', tbl, re.S))
    out, last = [], 0
    for i, r in enumerate(rows):
        out.append(tbl[last:r.start()])
        out.append(shade_row(r.group(0)) if i % 2 == 1 else r.group(0))
        last = r.end()
    out.append(tbl[last:])
    return ''.join(out)


def main(path):
    with zipfile.ZipFile(path) as z:
        items = {n: z.read(n) for n in z.namelist()}

    items['word/numbering.xml'] = fix_bullets(
        items['word/numbering.xml'].decode('utf-8')).encode('utf-8')

    doc = items['word/document.xml'].decode('utf-8')
    doc = re.sub(r'<w:tbl>.*?</w:tbl>', band_table, doc, flags=re.S)
    items['word/document.xml'] = doc.encode('utf-8')

    tmp = tempfile.mktemp(suffix='.docx')
    with zipfile.ZipFile(tmp, 'w', zipfile.ZIP_DEFLATED) as z:
        for name, data in items.items():
            z.writestr(name, data)
    shutil.move(tmp, path)


if __name__ == '__main__':
    main(sys.argv[1])
