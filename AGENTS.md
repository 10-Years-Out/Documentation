# Agent instructions

This repository is a Mintlify documentation site for policy templates and per-bank policy copies. Pages are MDX files with YAML frontmatter. Navigation lives in `docs.json`.

Bank policy files are flat copies of their templates. They contain their own full text. Do not use snippets, imports, variables, or shared components to reuse policy language.

## Policy workflow

- Never edit a bank policy file without a corresponding template diff that justifies the change.
- When propagating a template change, read the template's git history since that bank file's `template_synced` date.
- One pull request per bank. Never batch banks into one PR.
- Always bump `template_synced` when propagating.
- If the bank's text has diverged from the template in the section being changed, stop and flag it in the PR description. Do not resolve the divergence.
- Never merge a pull request.
- Never invent or alter policy language that was not in the template diff.
- Never edit `board_approved` or `next_review`. Humans only.

## Export

`export/export.sh` produces the Word document for a client. Run from the repo root:

    ./export/export.sh hslc

It reads `docs/clients/<slug>/infosec/isp-*.mdx` in filename order, strips frontmatter, uses each `title` as Word Heading 1, starts each policy on a new page, generates a table of contents, and writes to `dist/<slug>/`. Requires `pandoc` and `python3` on PATH. `dist/` is never committed.

`export/reference/<slug>.docx` supplies the client's logo, footer, page size, margins, and Word styles. The script finds it by slug and runs without one, falling back to Pandoc's default styling.

To onboard a client, copy `export/reference/_template.docx` to `export/reference/<slug>.docx` and replace the picture in the Word page header with that client's logo. Do not change the styles.

Never edit the generated Word file. If the output is wrong, fix the MDX or the reference doc. Verify in Word rather than a preview tool — the table of contents is a field that populates on open, and table header shading renders differently elsewhere.

## Heading levels in policy files

The export maps Markdown headings to Word styles, so these are not cosmetic:

- `##` for Intent, Scope, Policy, Compliance → gray bold subhead
- `###` for subsections inside Policy → red italic subhead
- Never use `#` in the body. The policy title comes from the frontmatter.
