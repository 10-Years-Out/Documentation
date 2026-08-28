# CBC Documentation Lab

This repository is a Mintlify prototype for CBC implementation standards. The demo uses the Extreme 5320-48P-8XE switch standard to show task-based navigation, reusable definitions, conditional procedures, interactive configuration, command reference pages, diagrams, images, and revision history.

All client names and addresses in the demo are examples. Do not add passwords or live client data.

## Run the demo

```bash
npx mint dev
```

Open `http://localhost:3000`.

## Validate changes

```bash
npx mint validate
npx mint broken-links
```

## Content model

- `snippets/switch-profile.mdx` is the sample client source of truth. `client/overview.mdx` presents the same profile as an inventory page for people.
- `snippets/config-builder.jsx` provides the interactive command builder.
- `switch/` contains the technician workflow.
- `deliverables/` contains print-ready client and auditor records generated from the same definitions.
- `reference/` contains definitions, commands, and revisions.

See [Mintlify documentation](https://mintlify.com/docs) for platform and component reference.
