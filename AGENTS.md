# Agent instructions

This repository is a Mintlify documentation site for policy templates and per-bank policy copies. Pages are MDX files with YAML frontmatter. Navigation lives in `docs.json`.

Bank policy files are flat copies of their templates. They contain their own full text. Do not use snippets, imports, variables, or shared components to reuse policy language.

## Frontmatter

A template file:

```yaml
---
title: Encryption Policy
policy_id: ISP-017
template_version: 2
changes:
  - "2 | Raised the minimum TLS version to 1.3"
  - "1 | Initial version from HSLC 5.4"
page_break: false
---
```

A client file:

```yaml
---
title: Encryption Policy
policy_id: ISP-017
template_version: 2
history:
  - "5.5 | Raised the minimum TLS version to 1.3"
page_break: false
---
```

`policy_id` is omitted on the five non-policy sections (000 through 004).

`changes` belongs only to templates and `history` only to clients. They are never mixed, and never the same list. `changes` records how a template evolved and is keyed to `template_version`. `history` records which of that client's document releases touched the policy and is keyed to the client's document version. Neither is exported to Word.

`page_break: false` means the section continues on the page above it rather than starting a new one. Default is a page break. Only 001-maintenance and 003-authority carry it.

Release dates and board approvals live in the client's `client.yml`, never in a policy file. Never edit them. Humans only.

## template_version

A plain integer answering one question: is this client's copy current with the template?

- When you change a template, increment its `template_version` and add a matching `changes` line.
- When you propagate a template change to a client file, set the client's `template_version` to match the template's and add a `history` line.
- Never edit a template without incrementing. This is the one rule that, if broken, makes every client silently claim to be current.

Matching numbers mean current. A lower number on the client file means it is behind.

## Deciding where a change belongs

When asked to change a policy, determine first whether it is client-specific or a template change. Ask if it is not obvious.

- Client-specific (a value that differs for this bank, a bank's own exception) → edit only that client's file. Do not touch the template.
- Applies to all clients (a new control, corrected language, a raised standard) → edit the template, increment `template_version`, then propagate to each client as a separate change.

Never make a template-level change directly in a client's file. That silently diverges the client from everyone else.

## Propagating a template change

1. Diff the template against its previous version.
2. Apply the equivalent edit to each client's file. Equivalent, not identical: the client file has literal values where the template has placeholders.
3. If the client's current text does not match the template's old text, stop. Do not overwrite. Report it as a divergence and leave the file alone.
4. Set the client's `template_version` to match the template's.
5. Add a `history` line to the client file, per the section below.
6. One pull request per client. Never batch clients into one PR. Never merge a pull request.
7. Never invent or alter policy language that was not in the template diff.

## Changes lines

Never edit a template without incrementing `template_version` and adding a matching `changes` line.

```yaml
changes:
  - "2 | Raised the minimum TLS version to 1.3"
```

One string: the `template_version` this change produced, a pipe, a short summary. Newest first. This is CBC-internal and never reaches a client document. Git holds the full diff; this list is the skimmable summary of how the template evolved.

## History lines

Never change a client policy file without adding a `history` line for the open release.

```yaml
history:
  - "5.5 | Raised the minimum TLS version to 1.3"
```

One string: document version, a pipe, a short summary written for a bank board. Newest first.

The version belongs to the document, not the policy. HSLC's Information Security Policy is at 5.4; each policy records which document releases touched it. Do not give individual policies their own version numbers.

When one change affects several policies, use the identical `history` string in every file. The maintenance table groups rows by exact string match, so identical summaries collapse into one row listing all affected policies. Differing summaries produce separate rows.

If the open release does not yet exist in the client's `client.yml`, say so and let a human add it. Do not create releases.

## Sections

Each client's `infosec/` folder holds five non-policy sections ahead of the 37 policies, numbered so they sort first:

| File | Section |
|---|---|
| 000-confidentiality.mdx | Confidentiality Statement |
| 001-maintenance.mdx | Policy Maintenance |
| 002-overview.mdx | Overview |
| 003-authority.mdx | General Authority Statement |
| 004-roles.mdx | Roles and Responsibilities |

`001-maintenance.mdx` holds the version history and board approval tables. Rows below 5.5 are frozen historical text carried over from the source document. Do not edit, reformat, or re-derive them.

## Export

`export/export.sh` produces the Word document for a client. Run from the repo root:

    ./export/export.sh hslc

It reads `clients/<slug>/infosec/*.mdx` in filename order, strips frontmatter, uses each `title` as Word Heading 1, starts each policy on a new page, generates a table of contents, and writes to `dist/<slug>/`. Requires `pandoc` and `python3` on PATH. `dist/` is never committed.

`export/reference/<slug>.docx` supplies the client's logo, footer, page size, margins, and Word styles. The script finds it by slug and runs without one, falling back to Pandoc's default styling.

To onboard a client, copy `export/reference/_template.docx` to `export/reference/<slug>.docx` and replace the picture in the Word page header with that client's logo. Do not change the styles.

`export/fix-docx.py` runs after Pandoc and repairs two things Pandoc gets wrong: its bullet glyphs, and banded table rows, which it writes straight into the cells because Word's conditional table formatting does not apply reliably. Do not move that logic into the reference doc's table style; it was tried and it does not hold in Word.

Never edit the generated Word file. If the output is wrong, fix the MDX or the reference doc. Verify in Word rather than a preview tool — the table of contents is a field that populates on open, and table header shading renders differently elsewhere.

## Heading levels in policy files

The export maps Markdown headings to Word styles, so these are not cosmetic:

- `##` → large gray subhead, and the only level besides the title that appears in the table of contents. Used exclusively by the named subsections of Policy Maintenance and Roles and Responsibilities (Questions, Board Approval Date, Board of Directors, IT Steering Committee, Employees). Never use it inside a policy.
- `###` for Intent, Scope, Policy, Compliance → gray subhead, excluded from the table of contents
- `####` for subsections inside Policy (General, Password Requirements, Firewall) → red italic subhead
- Never use `#` in the body. The section title comes from the frontmatter.

## Web-only content

Content that belongs on the site but not in the delivered Word document goes between markers:

```
{/* web-only:start */}
## Version History

Explanatory note that a bank board does not need to read.
{/* web-only:end */}
```

The markers are MDX comments, so they render as nothing on the site and the content between them displays normally. The export strips the markers and everything between them.

## Table column widths

Pandoc sizes Word table columns from the relative length of the separator row in the Markdown, not from the content. A table written with `|---|---|` gets equal columns; to weight them, make the dashes proportional to the width each column needs. This is why the tables in 001-maintenance have long separator rows. Do not "tidy" them back to `|---|`.
