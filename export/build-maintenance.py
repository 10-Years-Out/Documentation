"""Rebuild a client's policy maintenance tables from the repo.

    python3 export/build-maintenance.py hslc

Reads every `history` line in the client's policy frontmatter, groups them
by release, joins to the releases list in client.yml for dates, and rewrites
the two tables in 001-maintenance.mdx.

Rows for releases that have history lines are regenerated every run. Rows for
any version client.yml has never heard of are preserved exactly as they are,
which is how the frozen record carried over from the source document survives.

Within a release, one row per distinct change. The version, revised-by and
date print on the first row only, so the release reads as one block.

Pass --check to report whether the file is current without writing to it.
"""

import pathlib
import re
import sys

REPO = pathlib.Path(__file__).resolve().parent.parent
MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
          'August', 'September', 'October', 'November', 'December']


def frontmatter(text):
    parts = text.split('---', 2)
    return parts[1] if len(parts) >= 3 else ''


def read_releases(slug):
    """[(version, 'September 2026', 'ITSC', '4/13/2026' or None)] newest first."""
    yml = (REPO / 'clients' / slug / 'client.yml').read_text()
    releases = []
    for line in yml.splitlines():
        entry = re.match(r'\s*-\s*"([^"]+)"', line)
        if not entry or not re.match(r'\d', entry.group(1)):
            continue
        fields = [f.strip() for f in entry.group(1).split('|')]
        version = fields[0]
        revised = ''
        if len(fields) > 1 and re.match(r'\d{4}-\d{2}$', fields[1]):
            year, month = fields[1].split('-')
            revised = f'{MONTHS[int(month) - 1]} {year}'
        by = fields[2] if len(fields) > 2 else ''
        approved = None
        for field in fields[3:]:
            date = re.match(r'approved\s+(\d{4})-(\d{2})-(\d{2})', field)
            if date:
                y, m, d = date.groups()
                approved = f'{int(m)}/{int(d)}/{y}'
        releases.append((version, revised, by, approved))
    return releases


def read_history(slug):
    """{version: {summary: [labels]}} in file order, identical summaries merged."""
    grouped = {}
    for path in sorted((REPO / 'clients' / slug / 'infosec').glob('*.mdx')):
        fm = frontmatter(path.read_text())
        title = re.search(r'^title:\s*(.+)$', fm, re.M)
        policy_id = re.search(r'^policy_id:\s*(.+)$', fm, re.M)
        title = title.group(1).strip().strip('"') if title else path.stem
        label = f'{policy_id.group(1).strip()} {title}' if policy_id else title

        for line in re.findall(r'^\s*-\s*"([^"]+)"', fm, re.M):
            if '|' not in line:
                continue
            version, summary = (part.strip() for part in line.split('|', 1))
            if not re.match(r'\d', version):
                continue
            grouped.setdefault(version, {}).setdefault(summary, []).append(label)
    return grouped


def build_history_rows(releases, history):
    rows = []
    for version, revised, by, _ in releases:
        changes = history.get(version)
        if not changes:
            continue
        for i, (summary, labels) in enumerate(changes.items()):
            first = i == 0
            rows.append('| {} | {} | {} | {} | {} |'.format(
                version if first else '', summary, ', '.join(labels),
                by if first else '', revised if first else ''))
    return rows


def build_approval_rows(releases):
    return ['| {} | {} |'.format(v, approved)
            for v, _, _, approved in releases if approved]


def replace_table(text, after, generated, owned):
    """Swap the rows of the table following `after` (None for the first table).

    Rows belonging to a version in `owned` are dropped and replaced by
    `generated`; everything else keeps its place below.
    """
    start = 0 if after is None else text.index(after) + len(after)
    table = re.search(r'^\|.*\n^\|[-| ]+\|\s*$\n((?:^\|.*\n?)*)',
                      text[start:], re.M)
    if not table:
        sys.exit(f'no table found after {after!r}')

    body_start = start + table.start(1)
    body_end = start + table.end(1)

    kept, current = [], None
    for row in text[body_start:body_end].splitlines():
        cells = [c.strip() for c in row.strip().strip('|').split('|')]
        if not cells:
            continue
        # a blank version cell continues the release above it
        if cells[0]:
            current = cells[0]
        if current not in owned:
            kept.append(row)

    body = '\n'.join(generated + kept) + '\n'
    return text[:body_start] + body + text[body_end:]


def rebuild(slug):
    """Return (path, current text, rebuilt text)."""
    path = REPO / 'clients' / slug / 'infosec' / '001-maintenance.mdx'
    before = path.read_text()

    releases = read_releases(slug)
    history = read_history(slug)

    # a release is regenerated once it has rows to generate; the approval
    # table is owned outright, since client.yml is the authority for it
    with_history = {v for v, _, _, _ in releases if history.get(v)}
    with_approval = {v for v, _, _, _ in releases}

    after = replace_table(before, None, build_history_rows(releases, history),
                          with_history)
    after = replace_table(after, '## Board Approval Date',
                          build_approval_rows(releases), with_approval)
    return path, before, after


def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    check = '--check' in sys.argv
    if len(args) != 1:
        sys.exit('usage: python3 export/build-maintenance.py [--check] <client-slug>')

    path, before, after = rebuild(args[0])
    relative = path.relative_to(REPO)

    if check:
        if before != after:
            sys.exit(f'{relative} is out of date — run '
                     f'python3 export/build-maintenance.py {args[0]}')
        print(f'{relative} is current')
        return

    path.write_text(after)
    print(f'rebuilt {relative}')


if __name__ == '__main__':
    main()
