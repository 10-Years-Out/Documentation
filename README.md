# CBC Client Documentation

This repository tests a streamlined web and print format for CBC implementation standards. The content follows the familiar document order: Purpose, Definitions, Procedure, Work Instruction, validation, and revision log.

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

- `docs.json` contains the client and switch values in its global `variables` section.
- `client/switch-profiles.mdx` presents those values as a switch inventory.
- `client/overview.mdx` presents the same values as a client record.
- Standards and audit records use plain references such as `{{switch-management-address}}`.
- `switch/5320-configuration.mdx` contains the complete implementation standard.
- `deliverables/switch-configuration-record.mdx` contains the printable client and audit record.

See [Mintlify documentation](https://mintlify.com/docs) for platform and component reference.
