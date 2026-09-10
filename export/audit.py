"""Three checks that catch discipline slips a diff review would miss.

    python3 export/audit.py                 # tokens only
    python3 export/audit.py --base origin/main   # all three

Checks 1 and 2 compare against a git ref, so they need --base. Checks 3
and 4 work on the tree as it stands. Exits non-zero on any failure.
"""

import argparse
import pathlib
import re
import subprocess
import sys

REPO = pathlib.Path(__file__).resolve().parent.parent
FAILURES = []


def fail(path, message):
    FAILURES.append(f"{path}: {message}")


def frontmatter(text):
    parts = text.split('---', 2)
    return parts[1] if len(parts) >= 3 else ''


def git(*args, allow_fail=False):
    result = subprocess.run(['git', *args], cwd=REPO,
                            capture_output=True, text=True)
    if result.returncode and not allow_fail:
        sys.exit(f"git {' '.join(args)} failed: {result.stderr.strip()}")
    return result.stdout


def changed_files(base):
    out = git('diff', '--name-only', f'{base}...HEAD')
    return [line for line in out.splitlines() if line.endswith('.mdx')]


def file_at(ref, path):
    return git('show', f'{ref}:{path}', allow_fail=True)


def open_release(slug):
    """The newest release with no approval date, or None."""
    yml = REPO / 'clients' / slug / 'client.yml'
    if not yml.exists():
        return None
    for line in yml.read_text().splitlines():
        entry = re.match(r'\s*-\s*"([^"]+)"', line)
        if not entry:
            continue
        value = entry.group(1)
        if not re.match(r'\d', value):
            continue
        return None if 'approved' in value else value.split('|')[0].strip()
    return None


def check_history(base):
    """A changed client policy needs a history line for the open release."""
    for path in changed_files(base):
        parts = pathlib.Path(path).parts
        if len(parts) < 2 or parts[0] != 'clients':
            continue
        slug = parts[1]
        version = open_release(slug)
        if version is None:
            fail(path, f"no open release in clients/{slug}/client.yml")
            continue
        fm = frontmatter((REPO / path).read_text())
        if f'"{version} |' not in fm:
            fail(path, f"changed with no history line for release {version}")


def check_template_bump(base):
    """A changed template needs its template_version incremented."""
    for path in changed_files(base):
        if not path.startswith('templates/'):
            continue
        before = file_at(base, path)
        if not before:
            continue
        now = (REPO / path).read_text()

        def version(text):
            found = re.search(r'^template_version:\s*(\d+)', frontmatter(text), re.M)
            return int(found.group(1)) if found else None

        if version(before) == version(now):
            fail(path, "template changed with no template_version bump")


def check_maintenance():
    """Every client's maintenance page must match what the generator produces."""
    import importlib.util
    spec = importlib.util.spec_from_file_location(
        'build_maintenance', REPO / 'export' / 'build-maintenance.py')
    builder = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(builder)

    for yml in sorted((REPO / 'clients').glob('*/client.yml')):
        slug = yml.parent.name
        path, before, after = builder.rebuild(slug)
        if before != after:
            fail(path.relative_to(REPO),
                 f'out of date — run python3 export/build-maintenance.py {slug}')


def check_tokens():
    """No [[TOKEN]] should survive instantiation into a client file."""
    for path in sorted((REPO / 'clients').rglob('*.mdx')):
        tokens = set(re.findall(r'\[\[[A-Z_0-9]+\]\]', path.read_text()))
        if tokens:
            rel = path.relative_to(REPO)
            fail(rel, f"unreplaced placeholders: {', '.join(sorted(tokens))}")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--base', help='git ref to compare against')
    args = parser.parse_args()

    check_tokens()
    check_maintenance()
    if args.base:
        check_history(args.base)
        check_template_bump(args.base)

    if FAILURES:
        print('audit failed:\n')
        for line in FAILURES:
            print(f'  {line}')
        sys.exit(1)
    print('audit passed')


if __name__ == '__main__':
    main()
