# Documentation project instructions

## About this project

- This is a Mintlify test for CBC implementation standards and client deliverables.
- The Extreme 5320-48P-8XE switch standard is the reference implementation.
- Pages are MDX files with YAML frontmatter.
- Configuration lives in `docs.json`.
- Client and switch values are edited once in the global `variables` section of `docs.json`. The switch profile and client overview present those values for readers.
- Reusable definitions and small document controls live in `snippets/`.
- Use the Mintlify skill for components, settings, and current platform behavior.
- Consult current Mintlify documentation before you add or change platform features.

## Content model

- Define switch values once in `docs.json`. Use Mintlify references such as `{{switch-management-address}}` in content. Variable names can contain letters, numbers, and hyphens; do not use dots.
- Give each installed device a stable logical role. Update the asset fields under that role when hardware is replaced.
- Import shared values from task pages. Do not copy client-variable values into several pages.
- Keep each implementation standard in the traditional CBC order: Purpose, Definitions, Procedure, Work Instruction, validation, and revision log.
- Make conditional paths explicit. Do not leave author notes that tell a reader to remove a section.
- Use sample data from the reserved documentation ranges for demos.
- Build client deliverables and working instructions from the same global variables.
- A configuration record must identify the installed asset, exact approved settings, final backup, validation evidence, and revision source.

## Terminology

- Use "system name" for the configured switch name.
- Use "management address" for the switch management IP address.
- Use "standalone XDR" only for direct switch-to-collector monitoring without NAC.
- Use "NAC-managed" for switches onboarded through XIQ-SE or the applicable NAC platform.
- Use "client variables" for the shared set of client-specific values.

## Style

- Use active voice and second person.
- Keep sentences concise and headings in sentence case.
- Put prerequisites before procedures.
- Use direct commands for steps.
- Use code formatting for commands, file names, paths, and object names.
- Use callouts only for safety, unresolved conditions, and required verification.
- Prefer a continuous document over dashboards, tours, cards, diagrams, or interactive demos.

## Content boundaries

- Never put passwords, one-time codes, private keys, or live client data in this repository.
- Do not invent a client address, hostname, VLAN, license, firewall rule, or monitoring design.
- Keep public demo data separate from client implementation copies.
- Treat the source Word template as evidence. Correct unclear or unsafe guidance instead of copying it without review.

## Validation

- Run `mint validate` and `mint broken-links` after content or navigation changes.
- Preview each changed page in light and dark mode when the visual design changes.
- Print-preview each deliverable page and confirm that tables, code, headings, page breaks, and sign-off fields fit on Letter paper.
- Confirm that command baselines resolve to the approved client variables.
