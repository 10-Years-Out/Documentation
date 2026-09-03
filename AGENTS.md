# Agent instructions

This repository is a Mintlify documentation site for policy templates and per-bank policy copies. Pages are MDX files with YAML frontmatter. Navigation lives in `docs.json`.

Bank policy files are flat copies of their templates. They contain their own full text. Do not use snippets, imports, variables, or shared components to reuse policy language.

## Generated files

These files are produced by `node scripts/generate-catalog.mjs`. Do not edit them by hand.

- `templates/overview.mdx`
- `banks/<bank>/overview.mdx`
- The Board approved / Next review table at the top of each policy page
- The Templates and Banks groups in `docs.json`

After you add, rename, or remove a policy file, or after a human updates `board_approved` or `next_review` in frontmatter, run:

```bash
node scripts/generate-catalog.mjs
```

The generator reads frontmatter and bank copies. It does not create bank policy copies, and it does not change policy body text. Adding a template is enough for the catalog and sidebar; a bank only appears as an adopter after it has a matching file.

Check mode, used in CI:

```bash
node scripts/generate-catalog.mjs --check
```

## Policy workflow

- Never edit a bank policy file without a corresponding template diff that justifies the change.
- When propagating a template change, read the template's git history since that bank file's `template_synced` date.
- One pull request per bank. Never batch banks into one PR.
- Always bump `template_synced` when propagating.
- If the bank's text has diverged from the template in the section being changed, stop and flag it in the PR description. Do not resolve the divergence.
- Never merge a pull request.
- Never invent or alter policy language that was not in the template diff.
- Never edit `board_approved` or `next_review`. Humans only.
- The catalog generator may rewrite overview files, `docs.json` navigation, and the generated date table. It must not change `board_approved` or `next_review` in YAML.
